// League Games Started (LGS) watcher (owner, Oct 28 2026). Run by .github/workflows/lgs.yml on game days.
//
// LGS = a player was in one of the 10 starting slots (PG, SG, G, SF, PF, F, C, UTIL, UTIL ...) of a fantasy team
// when his NBA game tipped off. One per player per NBA game, whatever the slot. Sleeper keeps no lineup history and
// managers can move players during their games, so this script watches: it stays running for hours, reads that
// day's tip-off times from ESPN, and around every tip takes lineup snapshots (Sleeper matchups) right before the
// game goes live and right after (every minute until ESPN says it started), then every 10 minutes during it.
//
// Verdict per player per game (closed when the game is final):
//   last snapshot before tip AND first snapshot once live both say "starter" -> 1 (an LGS)
//   both say "bench" -> 0
//   they disagree (moved in or out around tip-off) -> 'u' (unsure; not counted)
//   no pre-tip snapshot (the job started after tip): the first live snapshot decides, flagged late
// A locked player can't be moved, so his later games that week count through the same rule.
//
// data/lgs.json { version, at, since, seasons: { s: { games: { key: { d, w, tip, a, h } },
//   p: { pid: { key: [v, owner, flags] } }, open: { key: { pid: { o, pre, inn, late } } } } } }
// v = 1 | 0 | 'u'; flags: 'l' = decided from a late first look, 'r' = on taxi / IR (can't start). Pages count v === 1 per player (owner = the team
// that started him; Team list counts that team's only).
//
// Saves (git commit + push, retried with a rebase) after each finished game and at least every 20 minutes, so
// the owner can upload changes while it runs: it only ever writes data/lgs.json and data/nightly.json.
//
// ON TIME, NOT ON GITHUB'S SCHEDULE (owner, Oct 28 2026: the "2 AM" nightly update started 6:00-8:40 AM every day:
// GitHub runs scheduled jobs hours late). Runs started with workflow_dispatch start within about a minute, so:
//  - lgs.yml has several morning schedule tries; the first one that starts watches the whole game day, waiting
//    for the tips. Before GitHub's 6-hour limit it starts its own replacement (dispatch lgs.yml) and stops; the
//    replacement picks up from data/lgs.json (open games kept).
//  - After the last game it waits until 2:00 AM Central and starts the nightly update (dispatch update.yml), then
//    writes data/nightly.json { day, at }. update.yml's late 2 AM schedule skips itself when that day is done.
//  - A run that starts after 2 AM first checks that the last night's update ran (GitHub API) and starts it if not.
// Needs GITHUB_TOKEN with actions: write (lgs.yml); GitHub lets workflow_dispatch from it start new runs.
import { readFile, writeFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';

const FILE = 'data/lgs.json';
const NIGHTLY = 'data/nightly.json';
const START = Date.now();
const BUDGET = Number(process.env.LGS_MINUTES || 340) * 60_000; // stay under GitHub's 6-hour job limit
const TICK = 60_000;
const IDLE = 5 * 60_000; // nothing within 20 minutes: look every 5
const LIVE_EVERY = 10 * 60_000;
const SAVE_EVERY = 20 * 60_000;
const REPO = process.env.GITHUB_REPOSITORY || 'debugburkhart/seis-dynasty-hoops';
const ESPN = { GS: 'GSW', NO: 'NOP', NY: 'NYK', SA: 'SAS', UTAH: 'UTA', WSH: 'WAS' };
const NBA = new Set(['ATL', 'BOS', 'BKN', 'CHA', 'CHI', 'CLE', 'DAL', 'DEN', 'DET', 'GSW', 'HOU', 'IND', 'LAC', 'LAL', 'MEM',
  'MIA', 'MIL', 'MIN', 'NOP', 'NYK', 'OKC', 'ORL', 'PHI', 'PHX', 'POR', 'SAC', 'SAS', 'TOR', 'UTA', 'WAS']);

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function getJson(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`, { headers: { 'User-Agent': 'SeisDynastyHoops (league site)' } });
      if (res.ok) return await res.json();
    } catch { /* retry */ }
    await sleep(3000);
  }
  return null;
}
// The NBA "game day" in Chicago: games after midnight still belong to the evening before (5 AM cut-off).
const ctDate = t => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date(t));
const gameDay = (t = Date.now()) => ctDate(t - 5 * 3600_000);
const dayBefore = d => { const x = new Date(`${d}T12:00:00Z`); x.setUTCDate(x.getUTCDate() - 1); return x.toISOString().slice(0, 10); };
// The newest game day whose nightly update is due (its 2:00 AM Central has passed).
const dueDay = (t = Date.now()) => dayBefore(ctDate(t - 2 * 3600_000));
const ctHour = t => Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', hourCycle: 'h23' }).format(new Date(t)));
// 2:00 AM Central on the morning after game day d (07:00 UTC in daylight time, 08:00 in standard time).
function twoAm(d) {
  const x = new Date(`${d}T12:00:00Z`); x.setUTCDate(x.getUTCDate() + 1);
  const next = x.toISOString().slice(0, 10);
  for (const h of [7, 8]) { const t = Date.parse(`${next}T0${h}:00:00Z`); if (ctHour(t) === 2) return t; }
  return Date.parse(`${next}T07:00:00Z`);
}

async function loadFile() {
  try { const j = JSON.parse(await readFile(FILE, 'utf8')); if (j?.version === 1) return j; } catch { /* new file */ }
  return { version: 1, at: null, since: gameDay(), seasons: {} };
}
function save(db) {
  db.at = new Date().toISOString();
  return writeFile(FILE, JSON.stringify(db));
}
function push(msg) {
  try {
    execSync('git config user.name "github-actions[bot]" && git config user.email "41898282+github-actions[bot]@users.noreply.github.com"');
    execSync(`git add ${FILE} ${NIGHTLY} 2>/dev/null || git add ${FILE}`);
    try { execSync('git diff --cached --quiet'); return; } catch { /* something to commit */ }
    execSync(`git commit -m "${msg}"`);
    for (let i = 0; i < 4; i++) {
      try { execSync('git push', { stdio: 'pipe' }); log('saved'); return; } catch {
        // An upload or the nightly update landed meanwhile: put this commit on top (only data/lgs.json changes here).
        try { execSync('git pull --rebase --autostash -X theirs origin main', { stdio: 'pipe' }); } catch { execSync('git rebase --abort || true'); }
      }
    }
    log('push failed (will retry at the next save)');
  } catch (e) { log('save skipped:', e.message); }
}

// Start a workflow now (workflow_dispatch). file = 'update.yml' (nightly update) or 'lgs.yml' (this watcher).
async function dispatch(file) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) { log(`no token: can't start ${file}`); return false; }
  const res = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/${file}/dispatches`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'SeisDynastyHoops' },
    body: JSON.stringify({ ref: 'main' }),
  }).catch(() => null);
  log(`start ${file}: ${res?.status ?? 'failed'}`);
  return res?.status === 204;
}
// Did the nightly update already run for game day d (any update.yml run created after that 2 AM)?
async function nightlyRan(d) {
  const r = await getJson(`https://api.github.com/repos/${REPO}/actions/workflows/update.yml/runs?per_page=10`);
  return (r?.workflow_runs ?? []).some(x => Date.parse(x.created_at) >= twoAm(d) - 60_000 && x.event !== 'push');
}
// data/nightly.json { day (last game day whose 2 AM update started), at, sunday (Sunday whose 8 PM + 11 PM
// snapshot runs started) }: update.yml's late schedules read it and skip what already ran on time.
async function readNightly() { try { return JSON.parse(await readFile(NIGHTLY, 'utf8')) ?? {}; } catch { return {}; } }
async function writeNightly(patch) { await writeFile(NIGHTLY, JSON.stringify({ ...(await readNightly()), ...patch, at: new Date().toISOString() })); }
// Start the nightly update for game day d unless it already ran; then remember it.
async function ensureNightly(d) {
  const last = (await readNightly()).day ?? null;
  if (last && last >= d) return;
  if (await nightlyRan(d)) log(`nightly update for ${d} already ran`);
  else if (!(await dispatch('update.yml'))) return;
  await writeNightly({ day: d });
  push(`Nightly update started for ${d}`);
}
// Sunday evening (owner, Oct 26 2026): the update also runs at 8 PM and 11 PM Central to snapshot the live week's
// lineups before Sleeper closes it (assets/weekfix.js). Started from here so they're on time. Returns true when both ran.
async function sundaySnaps(db, day) {
  if (new Date(`${day}T12:00:00Z`).getUTCDay() !== 0) return true;
  const done = ((db.sunday ??= {})[day] ??= []);
  const now = Date.now();
  if (ctDate(now) !== day) return true; // past midnight: the 11 PM one is over
  for (const h of [20, 23]) {
    if (ctHour(now) >= h && !done.includes(h) && (await dispatch('update.yml'))) { done.push(h); await save(db); push(`Sunday ${h === 20 ? '8' : '11'} PM snapshot started`); }
  }
  if (done.length === 2 && (await readNightly()).sunday !== day) { await writeNightly({ sunday: day }); push(`Sunday snapshots done ${day}`); }
  return done.length === 2;
}

async function todaysGames(day) {
  const sb = await getJson(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${day.replaceAll('-', '')}`);
  return (sb?.events ?? []).map(ev => {
    const c = ev.competitions?.[0];
    const team = side => { const a = c?.competitors?.find(x => x.homeAway === side)?.team?.abbreviation; return ESPN[a] ?? a; };
    return { key: `${day}|${team('away')}@${team('home')}`, a: team('away'), h: team('home'), tip: Date.parse(ev.date), state: c?.status?.type?.state ?? ev.status?.type?.state };
  }).filter(g => NBA.has(g.a) && NBA.has(g.h)); // drops the All-Star Game and other exhibitions
}

async function main() {
  // Last night's update: start it now if it's due and hasn't run (a morning run after a broken chain).
  await ensureNightly(dueDay());
  const league = JSON.parse(await readFile('data/league.json', 'utf8'));
  const leagueId = league.seasons.at(-1).leagueId;
  const state = await getJson('https://api.sleeper.app/v1/state/nba');
  if (!state || state.season_type !== 'regular') { log('Not the NBA regular season; nothing to watch.'); return; }
  const season = String(state.season);
  const day = gameDay();
  let games = await todaysGames(day);
  if (!games.length) { log(`No NBA games on ${day}.`); return; }

  const [players, rosters] = await Promise.all([getJson('https://api.sleeper.app/v1/players/nba'), getJson(`https://api.sleeper.app/v1/league/${leagueId}/rosters`)]);
  const ownerOf = Object.fromEntries((rosters ?? []).map(r => [r.roster_id, r.owner_id]));
  // Taxi + IR per roster (the matchups feed doesn't say): those players can't start, so they're flagged.
  const reserved = Object.fromEntries((rosters ?? []).map(r => [r.roster_id, new Set([...(r.taxi ?? []), ...(r.reserve ?? [])])]));
  const db = await loadFile();
  const S = (db.seasons[season] ??= { games: {}, p: {}, open: {} });
  const week = Number(state.week) || 1;
  const seen = {}; // key -> { inAt (ms we first saw it live), before (already live when this run started), lastSnap }
  for (const g of games) if (g.state === 'in') seen[g.key] = { before: true };
  let lastSave = Date.now();

  // One lineup snapshot: every fantasy-rostered player on a team that plays in one of `watch`.
  async function snapshot(watch) {
    const rows = await getJson(`https://api.sleeper.app/v1/league/${leagueId}/matchups/${week}`);
    if (!Array.isArray(rows)) return log('matchups unavailable');
    const now = Date.now();
    for (const g of watch) {
      const o = (S.open[g.key] ??= {});
      S.games[g.key] ??= { d: day, w: week, tip: new Date(g.tip).toISOString(), a: g.a, h: g.h };
      for (const r of rows) {
        const starters = new Set((r.starters ?? []).filter(x => x && x !== '0'));
        for (const pid of r.players ?? []) {
          const t = players?.[pid]?.team;
          if (t !== g.a && t !== g.h) continue;
          const rec = (o[pid] ??= { o: ownerOf[r.roster_id] ?? null });
          const isStarter = starters.has(pid);
          // Taxi / IR players can't start: marked so pages leave them out of "games seen".
          if (reserved[r.roster_id]?.has(pid)) rec.res = 1; else delete rec.res;
          if (g.state === 'pre') { rec.pre = isStarter ? 1 : 0; rec.o = ownerOf[r.roster_id] ?? rec.o; }
          else if (g.state === 'in' && rec.inn == null) {
            rec.inn = isStarter ? 1 : 0;
            const s = seen[g.key] ?? {};
            // No pre-tip look and we didn't see the game go live within 3 minutes: a late first look.
            if (rec.pre == null && (s.before || !(s.inAt && now - s.inAt <= 3 * 60_000))) rec.late = 1;
            if (isStarter) rec.o = ownerOf[r.roster_id] ?? rec.o;
          }
        }
      }
      (seen[g.key] ??= {}).lastSnap = now;
    }
  }
  // Final verdicts for a game that's over.
  function close(key) {
    for (const [pid, rec] of Object.entries(S.open[key] ?? {})) {
      let v;
      if (rec.pre != null && rec.inn != null) v = rec.pre === rec.inn ? rec.inn : 'u';
      else if (rec.inn != null) v = rec.inn;
      else v = 'u';
      const flags = `${rec.late ? 'l' : ''}${rec.res ? 'r' : ''}`; // l = late first look, r = taxi/IR
      (S.p[pid] ??= {})[key] = flags ? [v, rec.o, flags] : [v, rec.o];
    }
    delete S.open[key];
  }

  log(`Watching ${games.length} games on ${day} (week ${week}).`);
  let done = false; // every game final
  while (Date.now() - START < BUDGET) {
    await sundaySnaps(db, day);
    if (done) {
      // After the last game: wait for 2:00 AM Central, start the nightly update, stop for the day.
      if (Date.now() >= twoAm(day)) { await ensureNightly(day); return; }
      await sleep(Math.min(IDLE, Math.max(10_000, twoAm(day) - Date.now())));
      continue;
    }
    const fresh = await todaysGames(day);
    if (fresh.length) games = fresh; // ESPN hiccup: keep the last good list
    else { await sleep(TICK); continue; }
    const now = Date.now();
    for (const g of games) if (g.state === 'in') (seen[g.key] ??= {}).inAt ??= now;
    const watch = games.filter(g => {
      const s = seen[g.key] ?? {};
      if (g.state === 'pre') return g.tip - now <= 4 * 60_000; // last minutes before tip, every minute until it goes live
      if (g.state === 'in') return !S.open[g.key] || Object.values(S.open[g.key]).some(r => r.inn == null) || now - (s.lastSnap ?? 0) >= LIVE_EVERY;
      return false;
    });
    if (watch.length) await snapshot(watch);
    let finished = false;
    for (const g of games) if (g.state === 'post' && S.open[g.key]) { close(g.key); finished = true; log(`final: ${g.key}`); }
    if (finished || Date.now() - lastSave >= SAVE_EVERY) { await save(db); push(`League games started ${day}`); lastSave = Date.now(); }
    const left = games.filter(g => g.state !== 'post');
    if (!left.length) { log('All games final; waiting for 2 AM to start the nightly update.'); await save(db); push(`League games started ${day}`); done = true; continue; }
    // Nothing tipping within 20 minutes and nothing live: look every 5 minutes instead of every minute.
    const soon = left.some(g => g.state === 'in' || g.tip - Date.now() <= 20 * 60_000);
    await sleep(soon ? TICK : IDLE);
  }
  // Out of time (GitHub's 6-hour limit): save, start a replacement that picks up from the saved file, stop.
  await save(db);
  push(`League games started ${day}`);
  log('Time limit: starting the next watcher.');
  await dispatch('lgs.yml');
}

main().catch(e => { console.error(e); process.exitCode = 1; });
