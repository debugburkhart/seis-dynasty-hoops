// Lock records (owner, Nov 1 2026). Which game each starter's week counted.
//   1. The commish's PICK on the Dev Dashboard (Firestore locks/{season}_{week}_{pid}, src 'you') = WORD OF LAW: the
//      nightly solver, the coach and the locked points use it; nothing read from Sleeper ever changes it; only he does
//      (or "Clear my pick"). k = 'lock' (+ d = that game's date), 'last' (not locked: his last game in the lineup that
//      week counts) or 'zero' (benched before his last game: 0).
//   2. weekfix.js solves everyone else from the official team score, using only games he played IN THE LINEUP (the
//      game-day watcher's lineup records, data/lgs.json: a game played from the bench never counts). Several answers =
//      "Needs you" on the dashboard.
//   3. FEED HINTS: what Sleeper's matchups feed said, read many times (data/locks.json, written by the watcher). Kept for
//      good (never removed or flipped), shown on the dashboard, but NEVER treated as a lock (see below).
// Why hints aren't locks (owner checked in the app, Nov 1 2026, week 2): Sleeper serves several copies of the feed that
// disagree. Earlier-game readings were real locks for Pritchard (Mon 36), Porter Jr. (Tue 43), Adebayo, but FALSE for
// Bane (Wed 28 once, he started Fri and isn't locked) and Peyton Watson (Mon 36, his best game, on 8 of 24 reads, not
// locked); Podziemski's "Mon 32" was his Fri 37 played from the bench. Copies often show a player's best game, which is
// usually the locked one, but not always. Rules (owner): a lock must be set before his next game tips; a locked player
// stays in his slot; unlocked = his last game of the week only; benched before that last game = 0.
// No DOM / Node APIs (runs in the watcher, the nightly job and the browser).

const PROJECT = 'dynasty-hof';
const API_KEY = 'AIzaSyBc3-Ejlfxj_9ul7K-2CqZxWi_QMqBJLE0'; // same public web key as sync.js / court.js
export const LOCKS_VERSION = 2; // 2 = feed hints (1 = sightings saved as locks, never published)

const r1 = n => Math.round((Number(n) || 0) * 10) / 10;
const NBA = new Set(['ATL', 'BOS', 'BKN', 'CHA', 'CHI', 'CLE', 'DAL', 'DEN', 'DET', 'GSW', 'HOU', 'IND', 'LAC', 'LAL', 'MEM', 'MIA', 'MIL', 'MIN', 'NOP', 'NYK', 'OKC', 'ORL', 'PHI', 'PHX', 'POR', 'SAC', 'SAS', 'TOR', 'UTA', 'WAS']);
const fantasy = (stats, scoring) => Object.entries(scoring).reduce((sum, [k, v]) => sum + (Number(stats?.[k]) || 0) * v, 0);
export const chicagoDate = t => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date(t));

// One week's box scores: { games: pid -> [{ date, p, done, team, opp }] (games he played, oldest first; done = the
// schedule calls it complete), sched: team -> [{ date, done }], names: pid -> name }. All-Star rows skipped (they never
// count). null when Sleeper doesn't answer.
export async function weekBoxes(season, week, scoring, fetchImpl = globalThis.fetch.bind(globalThis)) {
  const load = url => fetchImpl(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`).then(r => (r.ok ? r.json() : null)).catch(() => null);
  const [rows, slate] = await Promise.all([
    load(`https://api.sleeper.com/stats/nba/${season}/${week}?season_type=regular`),
    load(`https://api.sleeper.com/schedule/nba/regular/${season}`),
  ]);
  if (!Array.isArray(rows) || !Array.isArray(slate)) return null;
  const complete = new Set(slate.filter(g => g.status === 'complete').map(g => g.game_id));
  const out = {};
  const names = {};
  for (const g of rows) {
    if (g.player) names[g.player_id] ??= `${g.player.first_name ?? ''} ${g.player.last_name ?? ''}`.trim();
    if (!/^\d+$/.test(g.player_id) || !g.stats || !(g.stats.gp || g.stats.sp) || !NBA.has(g.team) || !NBA.has(g.opponent)) continue;
    (out[g.player_id] ??= []).push({ date: g.date, p: r1(fantasy(g.stats, scoring)), done: complete.has(g.game_id), team: g.team, opp: g.opponent });
  }
  for (const list of Object.values(out)) list.sort((a, b) => (a.date < b.date ? -1 : 1));
  // Week's schedule per NBA team (dates + done), for "games left".
  const sched = {};
  for (const g of slate) {
    if (Number(g.week) !== Number(week)) continue;
    for (const side of [g.home, g.away]) if (side?.team) (sched[side.team] ??= []).push({ date: g.date, done: g.status === 'complete' });
  }
  for (const list of Object.values(sched)) list.sort((a, b) => (a.date < b.date ? -1 : 1));
  return { games: out, sched, names };
}

// Dates a player was on `owner`'s BENCH when his game tipped (data/lgs.json, the game-day watcher: v 0 = bench).
// week = only that fantasy week's games. Those games never count for that team. Games the watcher didn't see (or 'u' = moved around tip-off) aren't listed.
export function benchDates(lgs, season, pid, owner, week) {
  const out = new Set();
  const S = lgs?.seasons?.[season];
  for (const [key, rec] of Object.entries(S?.p?.[pid] ?? {})) {
    if (week != null && Number(S.games?.[key]?.w) !== Number(week)) continue;
    if (rec?.[0] === 0 && rec[1] === owner) out.add(key.slice(0, 10));
  }
  return out;
}
// His games that count for `owner` (bench games left out).
export const lineupGames = (list, lgs, season, pid, owner, week) => {
  const bench = benchDates(lgs, season, pid, owner, week);
  return (list ?? []).filter(g => !bench.has(g.date));
};

// FEED HINTS. data/locks.json { version: 2, at, seasons: { s: { w: { pid: { o, v: { points: [reads, firstAt, lastAt] } } } } } }
// = every value the matchups feed showed for each starter, tallied over every read. Only ever added to.
export function recordHints(file, season, week, rows, ownerOf, at) {
  const W = ((file.seasons ??= {})[season] ??= {})[week] ??= {};
  for (const m of rows ?? []) {
    const o = ownerOf[m.roster_id];
    (m.starters ?? []).forEach((pid, i) => {
      if (!pid || pid === '0' || !o) return;
      const v = String(r1(m.starters_points?.[i] ?? m.players_points?.[pid] ?? 0));
      const x = (W[pid] ??= { o, v: {} });
      x.o = o;
      const t = (x.v[v] ??= [0, at, at]);
      t[0]++;
      t[2] = at;
    });
  }
}
// One week's hints: pid -> { o, v: { points: [reads, firstAt, lastAt] } }.
export const hintsFor = (file, season, week) => file?.seasons?.[season]?.[week] ?? {};

// The commish's picks (Firestore locks, public read): [{ id, s, w, pid, o, k, d, p, src, t }]. Throws on a server error
// (403 = the rules aren't published yet).
export async function loadLockDocs(fetchImpl = globalThis.fetch.bind(globalThis)) {
  const out = [];
  let page = '';
  for (let i = 0; i < 30; i++) {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/locks?pageSize=300&key=${API_KEY}${page ? `&pageToken=${encodeURIComponent(page)}` : ''}`;
    const res = await fetchImpl(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(res.status === 403 ? 'the lock rules aren’t published yet' : `server said ${res.status}`);
    const body = await res.json();
    for (const d of body.documents ?? []) {
      const f = d.fields ?? {};
      const s = k => f[k]?.stringValue ?? '';
      const n = k => Number(f[k]?.doubleValue ?? f[k]?.integerValue ?? NaN);
      out.push({ id: d.name.split('/').pop(), s: s('s'), w: n('w'), pid: s('pid'), o: s('o'), k: s('k'), d: s('d'), p: n('p'), src: s('src'), t: Date.parse(f.t?.timestampValue ?? '') || 0 });
    }
    if (!body.nextPageToken) break;
    page = body.nextPageToken;
  }
  return out;
}
export const lockDocId = (season, week, pid) => `${season}_${week}_${pid}`;

// One week's picks: pid -> { k, d, p, o, at }. Only the commish's own picks (src 'you').
export function lawFor(season, week, { docs = [] } = {}) {
  const out = {};
  for (const x of docs) {
    if (x.s === String(season) && x.w === Number(week) && x.src === 'you') out[x.pid] = { k: x.k, d: x.d, p: x.p, o: x.o, src: 'you', at: x.t };
  }
  return out;
}

// The points a pick gives. list = his games IN THE LINEUP that week (lineupGames); falls back to the saved points.
export function lawPoints(entry, list) {
  if (!entry) return null;
  if (entry.k === 'zero') return 0;
  const played = (list ?? []).filter(g => g.done !== false);
  if (entry.k === 'last') return played.length ? played.at(-1).p : 0;
  const g = played.find(x => x.date === entry.d);
  return g ? g.p : Number.isFinite(entry.p) ? entry.p : null;
}

// Lock-in coach marks (gm.js) from a week's picks: lock -> { date }, not locked -> { none }, benched -> { none, zero }.
export function lawMarks(law) {
  return Object.fromEntries(Object.entries(law ?? {}).map(([pid, x]) => [pid, x.k === 'lock' ? { date: x.d, law: x.src } : { none: true, ...(x.k === 'zero' ? { zero: true } : {}), law: x.src }]));
}
