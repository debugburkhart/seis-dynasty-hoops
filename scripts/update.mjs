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

// Finished weeks' scores (assets/weekfix.js): Sleeper's official standings saved after every week
// (data/official-weeks.json) and live lineup snapshots (data/live-weeks.json), both updated by the build.
const weekFix = {
  official: (await readJson('data/official-weeks.json')) ?? { seasons: {} },
  live: (await readJson('data/live-weeks.json')) ?? { seasons: {} },
  notes: [],
};

// All-Stars (they need every box score up to the break) and each season's rookies
// are worked out once, then carried forward from last night's data.
const pulled = await buildLeagueData(LEAGUE_ID, undefined, {
  weekFix,
  frozen, allStars: previous?.allStars ?? {}, rookies: previous?.rookies ?? {}, rookiesScoring: previous?.rookiesScoring ?? {},
  // scripts/preseason-fix.json: hand-restored editions (Oct 21 2026: the 2026 one was rebuilt from Sleeper's
  // broken in-season feed; this is the copy saved Oct 20, 5:56 PM CT, before tip-off). It wins over last night's.
  rookiePool: previous?.rookiePool ?? {}, preseason: { ...(previous?.preseason ?? {}), ...((await readJson('scripts/preseason-fix.json')) ?? {}) },
});
weekFix.official.at = weekFix.live.at = new Date().toISOString();
await writeFile('data/official-weeks.json', JSON.stringify(weekFix.official));
await writeFile('data/live-weeks.json', JSON.stringify(weekFix.live));
for (const [s, S] of Object.entries(weekFix.official.seasons)) {
  for (const [w, teams] of Object.entries(S.weeks ?? {})) {
    const hows = Object.values(teams).map(r => r.how).filter(Boolean);
    if (hows.length) console.log(`${s} week ${w} from the official standings: ${hows.filter(h => h === 'unique').length} lineups with one answer, ${hows.filter(h => h === 'tie').length} unsure, ${hows.filter(h => h === 'nofit').length} not adding up.`);
  }
}

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

// Pages from other sites (Draft Scout, NBA contracts) are read once a week, labeled as this site's
// bot (sites that turn bots away aren't used), one request at a time. Node's fetch first, then curl
// (some sites answer it when they turn Node away).
const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', weekday: 'short' }).format(new Date());
const UA = 'Mozilla/5.0 (compatible; SeisDynastyHoops/1.0; +https://github.com/debugburkhart/seis-dynasty-hoops)';
const pause = ms => new Promise(r => setTimeout(r, ms));
const { execFile } = await import('node:child_process');
const curl = url => new Promise((resolve, reject) => execFile('curl', ['-sSL', '--compressed', '--max-time', '60', '-A', UA, '-H', 'Accept: text/html,text/csv,*/*;q=0.8', '-H', 'Accept-Language: en-US,en;q=0.9', '-w', '\n%{http_code}', url],
  { maxBuffer: 64 << 20 }, (err, out) => {
    if (err) return reject(new Error(err.message.split('\n')[0]));
    const i = out.lastIndexOf('\n');
    const code = Number(out.slice(i + 1));
    return code >= 200 && code < 300 ? resolve(out.slice(0, i)) : reject(new Error(`HTTP ${code} (curl)`));
  }));
const getText = async url => {
  if (/sleeper/.test(url)) {
    const res = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(60000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  }
  await pause(1500);
  let first;
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html,text/csv,*/*;q=0.8', 'accept-language': 'en-US,en;q=0.9' }, signal: AbortSignal.timeout(60000) });
    if (res.ok) return await res.text();
    first = `HTTP ${res.status}`;
  } catch (e) { first = e.message; }
  try { return await curl(url); } catch (e) { throw new Error(`${first}; ${e.message}`); }
};
const getJson = async url => JSON.parse(await getText(url));
let sleeperPlayersCache;
const getSleeperPlayers = async () => (sleeperPlayersCache ??= await getJson('https://api.sleeper.app/v1/players/nba').catch(() => null));

// Draft Scout (commish → My GM → Draft Scout, assets/scout.js): the next 3 NBA draft classes graded
// for this league. Once a week (owner, Oct 2026): the Sunday run, or any run when the file is missing
// or was built by older code. Writes data/draft-scout.json + data/scout-pool.json (comps). Runs before
// the dynasty values below, which use each class's strength for rookie picks. Never stops the update.
let scout = await readJson('data/draft-scout.json');
try {
  const { SCOUT_VERSION, runScout } = await import('../assets/scout.js');
  // One retry on Monday when Sunday's build couldn't read a source (other than Torvik, which has a
  // stand-in), so a one-night outage doesn't cost a week.
  const retry = weekday === 'Mon' && scout?.built !== today && (scout?.sources ?? []).some(s => !s.ok && !s.optional);
  // Once per Sunday: the Sunday-evening runs (live lineup snapshots) don't rebuild it again.
  if ((weekday === 'Sun' && scout?.built !== today) || retry || scout?.version !== SCOUT_VERSION) {
    const league = await getJson(`https://api.sleeper.app/v1/league/${current.leagueId}`);
    const sleeperPlayers = await getSleeperPlayers();
    const { scout: built, pool } = await runScout({
      getText, getJson, scoring: league.scoring_settings ?? {}, sleeperPlayers, prev: scout, pool: await readJson('data/scout-pool.json'),
      seed: await readJson('scripts/scout-seed.json'), seedPool: await readJson('scripts/scout-pool.json'),
    });
    scout = built;
    await writeFile('data/draft-scout.json', JSON.stringify(scout));
    await writeFile('data/scout-pool.json', JSON.stringify(pool));
    const bad = scout.sources.filter(s => !s.ok).map(s => s.name);
    console.log(`Draft Scout: ${Object.entries(scout.classes).map(([y, c]) => `${y} ${c.prospects.length} prospects`).join(', ')}${bad.length ? `; failed: ${bad.join(', ')}` : ''}.`);
  } else {
    console.log(`Draft Scout: built weekly (Sundays); kept the ${scout.built} build.`);
  }
} catch (e) {
  console.log(`Draft Scout skipped: ${e.message}`);
}

// NBA contracts (commish → My GM → Dynasty, assets/contracts.js): Basketball-Reference's contracts
// page, read once a week like Draft Scout (Sundays, a Monday retry when Sunday's read failed, or any
// run when the file is missing or built by older code). A failed read keeps the last good copy (or
// scripts/contracts-seed.json, read from a home PC). Information only. Never stops the update.
try {
  const { CONTRACTS_VERSION, runContracts } = await import('../assets/contracts.js');
  const prev = await readJson('data/contracts.json');
  const retry = weekday === 'Mon' && prev?.at !== today && prev?.source && !prev.source.ok;
  if ((weekday === 'Sun' && prev?.at !== today) || retry || prev?.version !== CONTRACTS_VERSION) {
    const sleeperPlayers = await getSleeperPlayers();
    if (!sleeperPlayers) throw new Error('Sleeper player list unavailable');
    const rosters = await getJson(`https://api.sleeper.app/v1/league/${current.leagueId}/rosters`).catch(() => []);
    const rostered = [...new Set(rosters.flatMap(r => [...(r.players ?? []), ...(r.taxi ?? []), ...(r.reserve ?? [])]))];
    const built = await runContracts({ getText, sleeperPlayers, prev, seed: await readJson('scripts/contracts-seed.json'), today, rostered });
    await writeFile('data/contracts.json', JSON.stringify(built));
    console.log(`Contracts: ${Object.keys(built.players).length} players from ${built.source.ok ? 'Basketball-Reference' : `the ${built.source.fallback} copy of ${built.source.read} (read failed: ${built.source.error})`}; ${built.unmatched.length} unmatched, ${built.missing.length} rostered without a contract row.`);
  } else {
    console.log(`Contracts: read weekly (Sundays); kept the ${prev.at} copy.`);
  }
} catch (e) {
  console.log(`Contracts skipped: ${e.message}`);
}

// Dynasty score history (commish → My GM → Dynasty: tap a player for his chart). One entry
// per night: { days: { date: { pid: score, or [score, fullValueScore] when he's listed Out } } }.
// Players on a roster or with a score above 0. A problem here never stops the nightly update.
try {
  const { loadDynasty, dynastyValues, historyDay, historyExtra, backfillSeason, prospectRanking, prospectFor, rebuildSeasonDays, seasonFeedOk, preseasonOf } = await import('../assets/dynasty.js');
  const { teamSnapshot } = await import('../assets/tradefinder.js');
  // Smoothed this-season projections (dynasty.js PROJ_SMOOTH): last 3 nights kept.
  const projFile = (await readJson('data/dynasty-proj.json')) ?? { states: [] };
  const feeds = await loadDynasty(data, { projStates: projFile.states, preseason: projFile.preseason, scout });
  feeds.today = today;
  // This season's games of 10+ minutes (dynasty.js seasonActuals: loadDynasty builds them fresh
  // when none are passed in), saved for the pages.
  if (feeds.week && feeds.actual) projFile.actual = { season: feeds.season, at: today, games: feeds.actual };
  const cut = dynastyValues(data, feeds);
  const full = dynastyValues(data, feeds, { fullInjured: true });
  const pg = Object.fromEntries(Object.entries(cut.projPg).map(([pid, x]) => [pid, Math.round(x * 100) / 100]));
  // Frozen preseason projections (dynasty.js seasonFeedOk): refreshed while Sleeper's season feed is
  // still real projections; once games start (the feed turns into last box scores) it stays fixed.
  // First run after the switch without one: the oldest saved night (all preseason then).
  if (seasonFeedOk(feeds.proj)) projFile.preseason = { season: feeds.season, at: today, pg };
  else if (projFile.preseason?.season !== feeds.season) projFile.preseason = { season: feeds.season, at: [...projFile.states].sort((a, b) => (a.date < b.date ? -1 : 1))[0]?.date ?? today, pg: preseasonOf(feeds) };
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
  // Top 100 prospects' order per night (Prospects tab arrows), last 21 nights kept.
  hist.prospectRanks ??= {};
  hist.prospectRanks[today] = prospectRanking(cut).map(p => p.pid);
  for (const d of Object.keys(hist.prospectRanks).sort().slice(0, -21)) delete hist.prospectRanks[d];
  // Prospect grades (Dynasty tab "Prospect grade changes"): { pid: [[date, grade], ...] }, a new
  // entry only when a saved player's grade differs from his last one.
  hist.grades ??= {};
  // Once (owner, Oct 2026): rebuild the grades of the nights before tracking began from the saved
  // projections (hist.proj, this season), so changes since then show too.
  if (!hist.gradesBackfilled) {
    const start = `${Number(today.slice(0, 4)) - (Number(today.slice(5, 7)) >= 8 ? 0 : 1)}-08-01`;
    const rebuilt = {};
    for (const date of Object.keys(hist.proj).filter(d => d >= start && d < today).sort()) {
      for (const [pid, pg] of Object.entries(hist.proj[date])) {
        const p = cut.players[pid];
        if (!p?.prospect || !(pg > 0)) continue; // graded today = still 24 or under
        // Saved projections are rounded to 0.1, which can tip a player sitting on a grade line;
        // a night that grades the same as today's rounded projection counts as today's grade.
        const now = p.projUsed > 0 ? prospectFor(Math.round(p.projUsed * 10) / 10, p.age, cut.line).grade : null;
        const raw = prospectFor(pg, p.age, cut.line).grade;
        const g = raw === now ? p.prospect.grade : raw;
        const list = (rebuilt[pid] ??= []);
        if (list.at(-1)?.[1] !== g) list.push([date, g]);
      }
    }
    for (const [pid, list] of Object.entries(hist.grades)) for (const e of list) if (!rebuilt[pid]?.some(x => x[0] === e[0])) (rebuilt[pid] ??= []).push(e);
    for (const list of Object.values(rebuilt)) {
      list.sort((a, b) => (a[0] < b[0] ? -1 : 1));
      for (let i = list.length - 1; i > 0; i--) if (list[i][1] === list[i - 1][1]) list.splice(i, 1);
    }
    hist.grades = rebuilt;
    hist.gradesBackfilled = true;
  }
  // Every graded player (24 and under, on a roster or with an NBA team), free agents included.
  for (const p of Object.values(cut.players)) {
    const g = p.prospect?.grade;
    if (!g || !(p.team || p.owner)) continue;
    const list = (hist.grades[p.pid] ??= []);
    if (list.at(-1)?.[1] !== g) list.push([today, g]);
  }
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
  // Once (owner, Oct 2026): the waiver line changed to the full-health 158th-177th best players
  // (FLOOR_BAND in dynasty.js), so every saved score is redone with it: this season's nights via
  // rebuildSeasonDays (rosters rolled back, that night's projections + Out flags) and last season's
  // weeks by running its rebuild again (the flags below).
  if (!hist.floorV2) {
    hist.proj ??= {};
    hist.league ??= {};
    const rebuilt = rebuildSeasonDays(data, feeds, hist, today, (date, c, f, rosters) => {
      hist.teams[date] = snap(c, f, rosters);
      const x = historyExtra(c, historyDay(c, f));
      hist.proj[date] = x.proj;
      hist.league[date] = x.league;
    });
    Object.assign(hist.days, rebuilt);
    for (const k of ['backfilled', 'teamsBackfilled', 'projBackfilled']) hist[k] = (hist[k] ?? []).filter(s => s !== lastSeason);
    hist.floorV2 = true;
    console.log(`Dynasty history: rebuilt ${Object.keys(rebuilt).length} nights of ${current.season} with the new waiver line; ${lastSeason} is rebuilt next.`);
  }
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

// Taxi log (owner, Oct 2026, after the Adem Bona inquiry: Sleeper keeps no record of taxi moves).
// Every run compares each team's taxi squad with the last run's and logs who moved on or off:
// data/taxi-log.json { since, at, last: { owner: [pid] }, events: [{ at, owner, pid, name, move }] },
// move = 'on' (put on taxi), 'up' (activated, still on the roster) or 'out' (left the roster while on
// taxi: dropped or traded). Shown in Commish → Health report. A problem here never stops the update.
try {
  const lid = data.seasons.at(-1).leagueId;
  const rosters = await fetch(`https://api.sleeper.app/v1/league/${lid}/rosters?t=${Date.now()}`).then(r => (r.ok ? r.json() : null));
  if (!Array.isArray(rosters) || !rosters.length) throw new Error('no rosters from Sleeper');
  const log = (await readJson('data/taxi-log.json')) ?? { since: null, last: null, events: [] };
  const now = Object.fromEntries(rosters.filter(r => r.owner_id).map(r => [r.owner_id, [...(r.taxi ?? [])]]));
  const onRoster = Object.fromEntries(rosters.filter(r => r.owner_id).map(r => [r.owner_id, new Set([...(r.players ?? []), ...(r.taxi ?? []), ...(r.reserve ?? [])])]));
  const at = new Date().toISOString();
  const pname = pid => data.players?.[pid]?.n ?? `Player ${pid}`;
  if (log.last) {
    for (const [owner, list] of Object.entries(now)) {
      const before = new Set(log.last[owner] ?? []);
      for (const pid of list) if (!before.has(pid)) log.events.push({ at, owner, pid, name: pname(pid), move: 'on' });
      for (const pid of before) if (!list.includes(pid)) log.events.push({ at, owner, pid, name: pname(pid), move: onRoster[owner]?.has(pid) ? 'up' : 'out' });
    }
  } else log.since = at;
  log.at = at;
  log.last = now;
  log.events = log.events.slice(-1000);
  await writeFile('data/taxi-log.json', JSON.stringify(log));
  console.log(`Taxi log: ${Object.values(now).reduce((a, l) => a + l.length, 0)} taxi players, ${log.events.length} moves logged.`);
} catch (e) {
  console.log(`Taxi log skipped: ${e.message}`);
}

// Coach track record (owner, Oct 2026): the Lock-in coach's odds for every team each morning,
// before that day's games (missing mornings of the week are rebuilt), plus how its lock calls
// turned out -> data/coach-log.json (assets/coachlog.js). Shown on the Lock-in coach page.
// A problem here never stops the update.
try {
  const { updateCoachLog } = await import('../assets/coachlog.js');
  const coachLog = await updateCoachLog(data, await readJson('data/coach-log.json'), { log: m => console.log(m) });
  await writeFile('data/coach-log.json', JSON.stringify(coachLog));
} catch (e) {
  console.log(`Coach log skipped: ${e.message}`);
}

// Season stat tables (2K breakdown, commish Test features, Oct 2026): every NBA player's season
// totals added up from per-game box scores, for every league season -> data/season-stats.json
// (assets/breakdown.js). Finished seasons are built once; the season in progress adds its newly
// finished weeks (the page adds the current week live). Never stops the update.
try {
  const { updateSeasonStats } = await import('../assets/breakdown.js');
  const stats = await updateSeasonStats(data, await readJson('data/season-stats.json'), { log: m => console.log(m) });
  await writeFile('data/season-stats.json', JSON.stringify(stats));
} catch (e) {
  console.log(`Season stats skipped: ${e.message}`);
}

// Trade talk auto tag (2K breakdown, owner Oct 26 2026): every rostered / NBA player's Sleeper news checked for
// trade-talk wording -> data/trade-talk.json (assets/breakdown.js). Never stops the update.
try {
  const { updateTradeTalk } = await import('../assets/breakdown.js');
  const talk = await updateTradeTalk(data, { log: m => console.log(m) });
  await writeFile('data/trade-talk.json', JSON.stringify(talk));
} catch (e) {
  console.log(`Trade talk skipped: ${e.message}`);
}

// Weekly Props (owner, Oct 2026): the 10 props for the next week that hasn't tipped off, lines from
// the same week simulation as the coach, redone every night until the first game; a locked week is
// never changed -> data/props.json (assets/props.js). Picks live in Firestore. Never stops the update.
try {
  const { updateProps } = await import('../assets/props.js');
  const props = await updateProps(data, await readJson('data/props.json'), { today, log: m => console.log(m) });
  await writeFile('data/props.json', JSON.stringify(props));
} catch (e) {
  console.log(`Props skipped: ${e.message}`);
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
if (weekFix.notes.length) {
  sections.push(`Finished weeks the site couldn't settle for sure from Sleeper's official standings:\n\n${weekFix.notes.join('\n\n')}\n\nIn the Sleeper app, open that week's matchup and read the players' points. Add them under "players" in assets/corrections.js (the team score is already right).`);
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
