// Run by the GitHub Action every night: node scripts/update.mjs
// Writes data/league.json (everything the site reads) and a small dated
// standings snapshot in data/snapshots/ so day-to-day movement is kept.

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { FREEZE_SEED, LEAGUE_ID } from '../assets/config.js';
import { buildLeagueData } from '../assets/build-data.js';
import { recordHistory } from '../assets/records.js';
import { frontOffice } from '../assets/frontoffice.js';
import { extractSeason, guardSeason, sameSeason, verifySeason } from '../assets/freeze.js';

// ---------- Frozen seasons ----------
// Completed seasons load from data/frozen/ instead of Sleeper (see assets/freeze.js).
await mkdir('data/frozen', { recursive: true });
const frozen = {};
for (const f of await readdir('data/frozen')) {
  if (!f.endsWith('.json')) continue;
  const b = JSON.parse(await readFile(`data/frozen/${f}`, 'utf8'));
  frozen[b.season] = b;
}
const readJson = async path => { try { return JSON.parse(await readFile(path, 'utf8')); } catch { return null; } };

// Seed: completed seasons not frozen yet are taken from a known-good saved copy
// of the league data in this repo's history (FREEZE_SEED in assets/config.js),
// but only if that copy passes every check for the season.
if (FREEZE_SEED && process.env.GITHUB_REPOSITORY) {
  const url = `https://raw.githubusercontent.com/${process.env.GITHUB_REPOSITORY}/${FREEZE_SEED}/data/league.json`;
  const seed = await fetch(url).then(r => (r.ok ? r.json() : null)).catch(() => null);
  for (const s of seed?.seasons.filter(x => x.status === 'complete' && !frozen[x.season]) ?? []) {
    const b = extractSeason(seed, s.season);
    const check = verifySeason(b);
    if (!check.ok) { console.log(`Not freezing ${s.season} from ${FREEZE_SEED}: ${check.problems.slice(0, 3).join('; ')}`); continue; }
    frozen[s.season] = b;
    await writeFile(`data/frozen/${s.season}.json`, JSON.stringify(b));
    console.log(`Froze ${s.season} from saved copy ${FREEZE_SEED}.`);
  }
}
const previous = await readJson('data/league.json'); // last night's data, for the two-night rule

// All-Stars (they need every box score up to the break) and each season's rookies
// are worked out once, then carried forward from last night's data.
const pulled = await buildLeagueData(LEAGUE_ID, undefined, {
  frozen, allStars: previous?.allStars ?? {}, rookies: previous?.rookies ?? {}, rookiesScoring: previous?.rookiesScoring ?? {},
  rookiePool: previous?.rookiePool ?? {}, preseason: previous?.preseason ?? {},
});

// Week guard: finished weeks of the season in progress that come back from
// Sleeper stale or half-loaded keep last night's version (see assets/freeze.js).
const guard = guardSeason(pulled, previous, (await readJson('data/week-guard.json')) ?? {});
const data = guard.data;
for (const line of guard.log) console.log(line);
await writeFile('data/week-guard.json', JSON.stringify(guard.state, null, 1));

// A newly completed season is frozen once it passes every check and matches
// last night's pull exactly, so one glitchy night of Sleeper data can't be locked in.
for (const s of data.seasons.filter(x => x.status === 'complete' && !frozen[x.season])) {
  const b = extractSeason(data, s.season);
  const check = verifySeason(b);
  if (check.ok && previous && sameSeason(b, extractSeason(previous, s.season))) {
    await writeFile(`data/frozen/${s.season}.json`, JSON.stringify(b));
    console.log(`Froze ${s.season}: it passed every check and matched last night's data.`);
  } else {
    console.log(`${s.season} is complete but not frozen yet (${check.ok ? 'waiting for two matching nights' : check.problems.slice(0, 3).join('; ')}).`);
  }
}
console.log(`Frozen seasons: ${Object.keys(frozen).sort().join(', ') || 'none'}.`);

// Replaying every week to find record changes takes a couple of seconds,
// so it's done here once a night instead of in every visitor's browser.
data.recordEvents = recordHistory(data);

await mkdir('data/snapshots', { recursive: true });
await writeFile('data/league.json', JSON.stringify(data));

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date());
const current = data.seasons.at(-1);
const standings = [...current.teams]
  .sort((x, y) => y.w - x.w || y.pf - x.pf)
  .map((t, i) => ({ rank: i + 1, owner: t.owner, team: t.team, w: t.w, l: t.l, t: t.t, pf: t.pf }));
await writeFile(`data/snapshots/${today}.json`, JSON.stringify({ date: today, season: current.season, standings }, null, 1));

// Dynasty score history (commish → My GM → Dynasty: tap a player for his chart). One entry
// per night: { days: { date: { pid: score, or [score, fullValueScore] when he's listed Out } } }.
// Players on a roster or with a score above 0. A problem here never stops the nightly update.
try {
  const { loadDynasty, dynastyValues, historyDay, historyExtra, backfillSeason } = await import('../assets/dynasty.js');
  const { teamSnapshot } = await import('../assets/tradefinder.js');
  // Smoothed this-season projections (dynasty.js PROJ_SMOOTH): last 3 nights kept.
  const projFile = (await readJson('data/dynasty-proj.json')) ?? { states: [] };
  const feeds = await loadDynasty(data, { projStates: projFile.states });
  feeds.today = today;
  const cut = dynastyValues(data, feeds);
  const full = dynastyValues(data, feeds, { fullInjured: true });
  const pg = Object.fromEntries(Object.entries(cut.projPg).map(([pid, x]) => [pid, Math.round(x * 100) / 100]));
  projFile.states = [...projFile.states.filter(s => s.date < today), { date: today, pg }].slice(-3);
  await writeFile('data/dynasty-proj.json', JSON.stringify(projFile));
  // Projection log (owner asked, Oct 2026: how often does Sleeper/Rotowire really change its
  // season projections?). Every run compares Sleeper's raw per-game projections with the last
  // run's: { last: { at, pg }, runs: [{ at, stamp, total, changed, added, removed, avg, movers }] }.
  // stamp = Sleeper's newest updated_at (its batch time). Shown in Commish → Health report.
  try {
    const log = (await readJson('data/projection-log.json')) ?? { last: null, runs: [] };
    const now = cut.projRaw;
    const stamp = Math.max(0, ...(feeds.proj ?? []).map(x => Number(x.updated_at) || 0)) || null;
    const run = { at: new Date().toISOString(), stamp, total: Object.keys(now).length };
    if (log.last) {
      const before = log.last.pg;
      const moves = Object.keys(now).filter(pid => before[pid] != null && Math.abs(now[pid] - before[pid]) >= 0.05)
        .map(pid => ({ pid, from: before[pid], to: Math.round(now[pid] * 100) / 100 }));
      run.changed = moves.length;
      run.added = Object.keys(now).filter(pid => before[pid] == null).length;
      run.removed = Object.keys(before).filter(pid => now[pid] == null).length;
      run.avg = moves.length ? Math.round(100 * moves.reduce((a, m) => a + Math.abs(m.to - m.from), 0) / moves.length) / 100 : 0;
      run.movers = moves.sort((a, b) => Math.abs(b.to - b.from) - Math.abs(a.to - a.from)).slice(0, 10)
        .map(m => [m.pid, cut.players[m.pid]?.name ?? m.pid, m.from, m.to]);
    }
    log.runs = [...log.runs, run].slice(-500);
    log.last = { at: run.at, pg: Object.fromEntries(Object.entries(now).map(([pid, x]) => [pid, Math.round(x * 100) / 100])) };
    await writeFile('data/projection-log.json', JSON.stringify(log));
    console.log(`Projection log: ${run.changed ?? 'first run'} of ${run.total} projections changed.`);
  } catch (e) {
    console.log(`Projection log skipped: ${e.message}`);
  }
  const day = historyDay(cut, full);
  const hist = (await readJson('data/dynasty-history.json')) ?? { days: {} };
  hist.days[today] = day;
  // Chart explanations: each player's projection + the league anchors, same dates as days.
  hist.proj ??= {};
  hist.league ??= {};
  const extra = historyExtra(cut, day);
  hist.proj[today] = extra.proj;
  hist.league[today] = extra.league;
  // Team tracker: each team's strength now / in 2 yrs, total value, age and position strength,
  // with Out players discounted (c) and at full value (f). { teams: { date: { owner: { c, f } } } }
  const snap = (c, f, rosters) => {
    const a = teamSnapshot(c, rosters), b = teamSnapshot(f, rosters);
    return Object.fromEntries(Object.keys(a).map(o => [o, { c: a[o], f: b[o] }]));
  };
  hist.teams ??= {};
  hist.teams[today] = snap(cut, full, feeds.rosters);
  hist.teamsBackfilled ??= [];
  // Once: last season rebuilt week by week (the owner asked, Oct 2026), so charts start there.
  hist.backfilled ??= [];
  const lastSeason = String(Number(current.season) - 1);
  const needPlayers = !hist.backfilled.includes(lastSeason);
  const needTeams = !hist.teamsBackfilled.includes(lastSeason);
  // Projections + league anchors for last season's weeks (added Oct 2026: rebuilt once more).
  hist.projBackfilled ??= [];
  const needProj = !hist.projBackfilled.includes(lastSeason);
  if ((needPlayers || needTeams || needProj) && data.seasons.some(s => s.season === lastSeason)) {
    const teamWeeks = {};
    const extras = {};
    const weeks = await backfillSeason(data, lastSeason, undefined, (date, c, f, rosters) => {
      teamWeeks[date] = snap(c, f, rosters);
      extras[date] = historyExtra(c, historyDay(c, f));
    });
    if (needPlayers) Object.assign(hist.days, weeks);
    if (needTeams) Object.assign(hist.teams, teamWeeks);
    for (const [date, x] of Object.entries(extras)) { hist.proj[date] = x.proj; hist.league[date] = x.league; }
    if (Object.keys(weeks).length >= 10) { // else try again tomorrow
      if (needPlayers) hist.backfilled.push(lastSeason);
      if (needTeams) hist.teamsBackfilled.push(lastSeason);
      if (needProj) hist.projBackfilled.push(lastSeason);
    }
    console.log(`Dynasty history: rebuilt ${lastSeason}, ${Object.keys(weeks).length} weeks${needPlayers ? '' : ' (teams only)'}.`);
  }
  await writeFile('data/dynasty-history.json', JSON.stringify(hist));
  console.log(`Dynasty history: saved ${Object.keys(day).length} players for ${today} (${Object.keys(hist.days).length} days).`);
} catch (e) {
  console.log(`Dynasty history skipped tonight: ${e.message}`);
}

console.log(`Saved ${data.seasons.length} seasons, ${data.games.length} games, snapshot ${today}.`);

// ---------- Scoring check ----------
// Sleeper's official standings (wins, points for, points against) are compared
// with the weekly matchup scores. A gap means a weekly score in the API is wrong.
// Because a wrong score also shows up in the opponent's points against, the two
// gaps together point to the few games to look up in the Sleeper app.

const name = id => data.owners[id]?.name ?? id;
const r1 = n => Math.round(n * 10) / 10;
const problems = [];

for (const s of data.seasons) {
  const reg = data.games.filter(g => g.s === s.season && g.t === 'R');
  const gap = {};
  for (const t of s.teams) {
    const mine = reg.filter(g => g.a === t.owner || g.b === t.owner);
    const side = g => (g.a === t.owner ? 'a' : 'b');
    // Sleeper's official wins include league-median wins in seasons that have them.
    const medianWins = (data.medianGames ?? []).filter(m => m.s === s.season && m.o === t.owner && m.res === 'W').length;
    const wins = mine.filter(g => g.win === side(g)).length + medianWins;
    const pf = mine.reduce((x, g) => x + (side(g) === 'a' ? g.ap : g.bp), 0);
    const pa = mine.reduce((x, g) => x + (side(g) === 'a' ? g.bp : g.ap), 0);
    gap[t.owner] = { wins: t.w - wins, pf: r1(t.pf - pf), pa: r1(t.pa - pa) };
  }
  for (const t of s.teams) {
    const g0 = gap[t.owner];
    if (!g0.wins && Math.abs(g0.pf) < 0.5) continue;
    const lines = [`${s.season} ${name(t.owner)}: official ${t.w} wins / ${t.pf} pts, but weekly scores give ${t.w - g0.wins} wins / ${r1(t.pf - g0.pf)} pts (off by ${g0.pf > 0 ? '+' : ''}${g0.pf}).`];
    const suspects = reg.filter(g => {
      const opp = g.a === t.owner ? g.b : g.b === t.owner ? g.a : null;
      return opp && Math.abs(gap[opp].pa) >= 0.5;
    });
    const list = suspects.length ? suspects : reg.filter(g => g.a === t.owner || g.b === t.owner);
    lines.push(`   Check ${name(t.owner)}'s score in ${suspects.length ? 'these games' : 'every game this season'}:`);
    for (const g of list) lines.push(`     Week ${g.w}: ${name(g.a)} ${g.ap} - ${g.bp} ${name(g.b)}`);
    problems.push(lines.join('\n'));
  }
}

// ---------- Player check ----------
// Every team's locked player points should add up to its score in that game.
// A gap means a player's weekly points in the API are wrong (or a player-level
// correction is still needed after a team-score correction).

const playerProblems = [];
const lockedSum = {};
for (const x of data.playerWeeks) lockedSum[`${x.s}|${x.w}|${x.o}`] = (lockedSum[`${x.s}|${x.w}|${x.o}`] ?? 0) + x.p;
for (const g of data.games) {
  for (const [o, score] of [[g.a, g.ap], [g.b, g.bp]]) {
    const sum = r1(lockedSum[`${g.s}|${g.w}|${o}`] ?? 0);
    if (Math.abs(sum - score) < 0.05) continue;
    const starters = data.playerWeeks
      .filter(x => x.s === g.s && x.w === g.w && x.o === o)
      .sort((a, b) => b.p - a.p)
      .map(x => `${data.players[x.pid]?.n ?? x.pid} ${x.p}`);
    playerProblems.push(
      `${g.s} Week ${g.w} ${name(o)}: team score ${score}, but starters' locked points add up to ${sum} (off by ${r1(score - sum) > 0 ? '+' : ''}${r1(score - sum)}).\n` +
      `   Starters per the API: ${starters.join(', ') || 'none'}`,
    );
  }
}

const sections = [];
if (guard.alerts.length) {
  sections.push(`Weeks Sleeper changed that the site held back, then accepted:\n\n${guard.alerts.join('\n\n')}`);
}
if (problems.length) {
  sections.push(`Sleeper's weekly scores don't match its official standings:\n\n${problems.join('\n\n')}\n\nLook these up in the Sleeper app and add the right team scores to assets/corrections.js.`);
}
if (playerProblems.length) {
  sections.push(`Player points don't add up to the team score in these games:\n\n${playerProblems.join('\n\n')}\n\nIn the Sleeper app, find the starters whose points differ and add them under "players" in assets/corrections.js.`);
}
// Draft picks recorded as a duplicate Sleeper player entry that nobody fixed:
// the pick would count as 0 points forever.
const duplicates = frontOffice(data).unusedDuplicates;
if (duplicates.length) {
  sections.push(`Draft picks recorded as a duplicate Sleeper player entry (these never score):\n\n${duplicates
    .map(p => `${p.s} draft, pick ${p.no} by ${name(p.o)}: "${data.players[p.pid]?.n}"`).join('\n')}\n\nAdd the player actually drafted to DRAFT_CORRECTIONS in assets/corrections.js.`);
}
if (data.warnings?.length) {
  sections.push(`Problems with assets/corrections.js:\n\n${data.warnings.join('\n')}`);
}

if (sections.length) {
  const msg = sections.join('\n\n----------\n\n');
  console.log(`::warning::${msg.replace(/\n/g, '%0A')}`);
  await writeFile('data/scoring-check.txt', msg);
} else {
  console.log('Scoring check passed: every weekly score matches Sleeper\'s official standings, and every lineup adds up to its team score.');
  await writeFile('data/scoring-check.txt', '');
}
