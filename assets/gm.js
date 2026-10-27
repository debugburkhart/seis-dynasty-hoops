// Assistant GM (Commissioner's office, "My GM" tabs): the Lock-in coach and the
// Daily briefing. Live Sleeper data in the browser, on top of commish.js's loadWeek.

import { get, teamRoster } from './commish.js';
import { exhibitionRow } from './config.js';

const r1 = n => Math.round(n * 10) / 10;
const fantasy = (stats, scoring) => Object.entries(scoring).reduce((sum, [k, v]) => sum + (Number(stats?.[k]) || 0) * v, 0);

// ---------- Lock-in math ----------

// One game's score is treated as a bell curve around his projected game. Tested on
// every 2025-26 start in this league (1,600 starter-weeks): Sleeper's per-game
// projection (leaving out games it projects at 0, i.e. games he'll likely miss)
// x 1.04 for the middle, and a spread of 30% of that. The coach locked 65,300 points
// league-wide where managers really locked 62,200 (always taking the last game:
// 53,100; perfect hindsight: 68,300). bigdaddyburk: 8,700 vs 8,400.
export const LOCK_CAL = 1.04;
export const LOCK_SPREAD = 0.3;
// Simulated SCORES (recalibrated Oct 2026): your players' games draw around 0.975 x the
// projection, the average game of every active-roster player in 2024-25 (8,693 games; 2025-26:
// 0.981). The old 1.082 came from managers' final lineups, which carry hindsight. Other teams'
// games draw around 1.0 x: that made the simulated opponents match their real final scores in
// 2024-25 (managers' own moves and news). LOCK_CAL stays 1.04 for lock bars: 0.975 bars did
// worse on the 2025-26 test season.
export const SCORE_CAL = 0.975;
export const OPP_CAL = 1.0;
// Settings the backtests tune (see CLAUDE.md for how they were fitted).
export const TUNE = { score: SCORE_CAL, lock: LOCK_CAL, opp: OPP_CAL };
// Risk setting: moves every lock bar by a quarter of the spread. Balanced = the most
// points on average (same test: Safe 64,800, Bold 64,900).
export const RISK = { safe: -0.25, balanced: 0, bold: 0.25 };
// Injury tags that mean he won't play his next games.
const OUT = /^(out|ir|suspension|inactive)$/i;

const phi = z => 0.3989423 * Math.exp(-z * z / 2);
function Phi(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const p = phi(z) * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}
// Expected value of the better of one game and a sure t.
const expectedMax = (mu, sd, t) => {
  const z = (t - mu) / sd;
  return t * Phi(z) + mu * (1 - Phi(z)) + sd * phi(z);
};

// Lock bars: bars[k] = what waiting is worth with k games left. Lock a score at or
// above bars[k] (shifted by the risk setting). With 1 game left it's his average
// game; every extra game raises the bar, since waiting gets another chance.
export function lockBars(perGame, n, risk = 'balanced') {
  const mu = perGame * TUNE.lock;
  const sd = Math.max(1, mu * LOCK_SPREAD);
  const value = [null, mu];
  for (let k = 2; k <= n; k++) value[k] = expectedMax(mu, sd, value[k - 1]);
  return value.map(v => (v == null ? null : r1(v + (RISK[risk] ?? 0) * sd)));
}

// ---------- This week's games ----------

// Per-game box scores for one week: pid -> [{ date, pts }] (played games only, oldest first).
export async function loadBoxes(season, week, scoring) {
  const rows = await get(`/stats/nba/${season}/${week}?season_type=regular`, []);
  const out = {};
  for (const g of rows ?? []) {
    if (!/^\d+$/.test(g.player_id) || !g.stats || !(g.stats.gp || g.stats.sp) || exhibitionRow(g)) continue; // no All-Star Game
    (out[g.player_id] ??= []).push({ date: g.date, pts: r1(fantasy(g.stats, scoring)) });
  }
  for (const list of Object.values(out)) list.sort((a, b) => (a.date < b.date ? -1 : 1));
  return out;
}

// Tip-off times (owner, Oct 2026: for streaming). Sleeper's schedule has dates only, so the time comes
// from ESPN's public scoreboard (one request per date, CORS open; the official NBA feed refuses
// browsers), cached in this browser for 6 hours. { 'YYYY-MM-DD': { BOS: '2026-10-22T23:00Z' } };
// a failed day just has no times.
const ESPN_TEAM = { GS: 'GSW', NO: 'NOP', NY: 'NYK', SA: 'SAS', UTAH: 'UTA', WSH: 'WAS' };
async function tipoffsFor(dates) {
  const out = {};
  await Promise.all(dates.map(async date => {
    const key = `gm-tips-${date}`;
    try {
      const hit = JSON.parse(localStorage.getItem(key) ?? 'null');
      if (hit && Date.now() - hit.at < 6 * 3600e3) { out[date] = hit.t; return; }
    } catch { /* no cache */ }
    try {
      const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${date.replace(/-/g, '')}`);
      if (!res.ok) return;
      const t = {};
      for (const ev of (await res.json())?.events ?? []) {
        for (const c of ev.competitions?.[0]?.competitors ?? []) {
          const ab = c.team?.abbreviation;
          if (ab && ev.date) t[ESPN_TEAM[ab] ?? ab] = ev.date;
        }
      }
      out[date] = t;
      try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), t })); } catch { /* full or blocked */ }
    } catch { /* offline: no times */ }
  }));
  return out;
}
// "6:30 PM" Central for a game with a known tip-off, else ''.
export const tipTime = g => (g?.tip ? new Date(g.tip).toLocaleTimeString('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit' }) : '');

// NBA schedule this week by team, with opponent, status and tip-off: { BOS: [{ date, opp, home, status, tip }] }
export async function loadSlate(season, week) {
  const schedule = await get(`/schedule/nba/regular/${season}`, []);
  const out = {};
  for (const g of schedule ?? []) {
    if (g.week !== week) continue;
    const h = g.home?.team;
    const a = g.away?.team;
    if (h) (out[h] ??= []).push({ date: g.date, opp: a, home: true, status: g.status });
    if (a) (out[a] ??= []).push({ date: g.date, opp: h, home: false, status: g.status });
  }
  for (const list of Object.values(out)) list.sort((x, y) => (x.date < y.date ? -1 : 1));
  if (typeof localStorage !== 'undefined') {
    const tips = await tipoffsFor([...new Set(Object.values(out).flat().map(g => g.date))]);
    for (const [team, list] of Object.entries(out)) for (const g of list) g.tip = tips[g.date]?.[team] ?? null;
  }
  return out;
}

// Locked points per team for a live week (Home, Hype page, Wager tracker): { roster_id: pts }.
// Sleeper's matchup score counts every starter's latest game, locked or not. A starter is
// locked here by the coach's rule (counted score = an earlier game than his latest), when
// he's done for the week (no games left: that score is final), or marked "I locked him".
export async function lockedPoints(season, week, leagueId, rows) {
  const [league, stats, slate] = await Promise.all([
    get(`/v1/league/${leagueId}`, {}),
    get(`/stats/nba/${season}/${week}?season_type=regular`, []),
    loadSlate(season, week),
  ]);
  const scoring = league?.scoring_settings ?? {};
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date());
  const team = {};
  const boxes = {};
  for (const g of stats ?? []) {
    if (!/^\d+$/.test(g.player_id) || exhibitionRow(g)) continue; // no All-Star Game
    team[g.player_id] ??= g.team ?? g.player?.team;
    if (g.stats && (g.stats.gp || g.stats.sp)) (boxes[g.player_id] ??= []).push({ date: g.date, pts: r1(fantasy(g.stats, scoring)) });
  }
  for (const list of Object.values(boxes)) list.sort((a, b) => (a.date < b.date ? -1 : 1));
  let marks = {};
  try { marks = JSON.parse(localStorage.getItem(`gm-locks-${season}-${week}`) ?? '{}') ?? {}; } catch { /* none */ }
  const out = {};
  for (const m of rows ?? []) {
    let sum = 0;
    for (const pid of m.starters ?? []) {
      if (!pid || pid === '0') continue;
      const counted = m.players_points?.[pid];
      if (counted == null) continue;
      const played = boxes[pid] ?? [];
      const latest = played.at(-1);
      const left = (slate[team[pid]] ?? []).some(g => g.status !== 'complete' && g.date >= today);
      const earlier = latest && latest.date < today && Math.abs(latest.pts - counted) >= 0.05 && played.slice(0, -1).some(b => Math.abs(b.pts - counted) < 0.05);
      // A mark on a given game counts that game's score (the manager says it was locked then).
      const mk = marks[pid];
      const markedGame = mk && typeof mk === 'object' && !mk.none ? played.find(b => b.date === mk.date) : null;
      if (markedGame) sum += markedGame.pts;
      else if (mk && typeof mk === 'object' && mk.none) { if (!left) sum += counted; } // marked "not locked"
      else if (earlier || !left || (mk != null && played.length)) sum += counted;
    }
    out[m.roster_id] = r1(sum);
  }
  return out;
}

// ---------- Lock-in coach ----------

// One starter's lock call. Sleeper's public data doesn't say whether a game was locked:
// players_points is the score that counts right now (his locked game, or else his
// latest game). If that differs from his latest game, he must be locked on an earlier
// one. Otherwise the manager can mark "I locked him" (saved in this browser).
function coachCall(p, ctx, boxes, slate, live, risk, marked, whatif) {
  const today = ctx.today;
  const sched = (slate[p.team] ?? []).map(g => {
    const box = (boxes[p.pid] ?? []).find(b => b.date === g.date);
    const done = g.status === 'complete' || g.date < today;
    const playing = !done && g.date === today && (['in_progress', 'in_game'].includes(g.status) || Boolean(box));
    return { ...g, pts: box?.pts ?? null, done, playing };
  });
  const played = sched.filter(g => g.done && g.pts != null);
  const latest = played.at(-1);
  const upcoming = sched.filter(g => !g.done && !g.playing);
  const playingNow = sched.find(g => g.playing);
  const perGame = p.perPlay || p.perGame || p.fpg || p.fpgLast || 0;
  const day = date => (date === today ? 'tonight' : dayName(date));
  const counted = live?.players_points?.[p.pid] ?? null;
  const out = OUT.test(p.injury ?? '');
  const base = { sched, perGame, counted, out };

  if (!sched.length) return { ...base, call: 'none', text: 'No games this week. A bench player with games would score more.' };
  // { none: true } = the manager says he is NOT locked: skip the marks and Sleeper's reading.
  const notLocked = Boolean(marked && typeof marked === 'object' && marked.none);
  if (notLocked) { base.notLocked = true; marked = null; }
  // Marked by the manager (this device): { date } = locked on that game (any game he played, so
  // a missed or earlier lock can be fixed), or an old-style number = the score counting now.
  // A mark beats Sleeper's own reading: the manager knows which game he locked.
  if (marked != null && played.length) {
    const g = typeof marked === 'object' ? played.find(x => x.date === marked.date) : null;
    const score = g ? g.pts : counted ?? marked;
    return { ...base, call: 'locked', score, lockDate: g?.date ?? null,
      text: `Locked at ${score}${g ? ` (${dayName(g.date)}'s game)` : ''}, marked on this device. Tap another game above if it was a different one.`, marked: true };
  }
  // Locked? Inferred from Sleeper's counted score: it still counts an earlier game after a later one.
  // Not from a game played today: right after a game Sleeper's counted score can lag the box score
  // (Oct 22 2026: Holmgren read as locked on Tuesday's 30 after Thursday's 39 went final; Sleeper
  // counted 39 by morning). Same-day locks: the manager can mark them.
  const earlier = played.slice(0, -1).find(g => counted != null && Math.abs(g.pts - counted) < 0.05);
  if (!notLocked && latest && latest.date < today && counted != null && Math.abs(latest.pts - counted) >= 0.05 && earlier) {
    return { ...base, call: 'locked', score: earlier.pts, lockDate: earlier.date, text: `Locked at ${earlier.pts} (from ${dayName(earlier.date)}).`, inferred: true };
  }
  // What-if lock (coach's page only): counts in the coach's math, never in the live scores
  // on Home or the Hype page. Only valid until his next game (a new game would replace it).
  if (whatif && latest && whatif.date === latest.date) {
    return { ...base, call: 'locked', score: latest.pts, whatIf: true, whatIfSlot: whatif.slot ?? null,
      text: `What-if lock at ${latest.pts}: the coach plans as if he's locked, but you haven't locked him in Sleeper. Undo it any time.` };
  }
  if (playingNow) {
    const bars = lockBars(perGame, upcoming.length, risk);
    const bar = upcoming.length ? bars[upcoming.length] : null;
    return { ...base, call: 'live', bar, score: playingNow.pts,
      text: upcoming.length ? `Playing now${playingNow.pts != null ? `: ${playingNow.pts} so far` : ''}. Lock it if he finishes at ${bar}+.` : `Playing his last game of the week now${playingNow.pts != null ? `: ${playingNow.pts} so far` : ''}. It counts either way.` };
  }
  if (!latest) {
    if (!upcoming.length) return { ...base, call: 'final', score: 0, text: 'Didn’t play this week.' };
    if (upcoming.length === 1) return { ...base, call: 'plan', text: `One game (${day(upcoming[0].date)}): it counts no matter what.` };
    const bars = lockBars(perGame, upcoming.length - 1, risk);
    return { ...base, call: 'plan', bar: bars[upcoming.length - 1], bars,
      text: `${upcoming.length} games. Lock his first one (${day(upcoming[0].date)}) if he scores ${bars[upcoming.length - 1]}+.` };
  }
  const x = latest.pts;
  if (!upcoming.length) return { ...base, call: 'final', score: x, text: `Done for the week: his last game (${x}) counts.` };
  if (out) return { ...base, call: 'lock', score: x, text: `Listed ${p.injury}: lock the ${x} so a missed game can’t cost you.` };
  const bars = lockBars(perGame, upcoming.length, risk);
  const bar = bars[upcoming.length];
  const left = `${upcoming.length} game${upcoming.length === 1 ? '' : 's'} left`;
  if (x >= bar) return { ...base, call: 'lock', score: x, bar, text: `${x} beats the ${bar} bar with ${left}. Lock it before ${day(upcoming[0].date)}.` };
  return { ...base, call: 'wait', score: x, bar, text: `${x} is under the ${bar} bar with ${left}. Next: ${day(upcoming[0].date)}.` };
}

const dayName = date => new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' });

// Every starter's lock call for one team, in lineup order.
export function lockCoach(DATA, ctx, boxes, slate, owner, risk = 'balanced', marks = {}, whatifs = {}) {
  const team = teamRoster(DATA, ctx, owner);
  if (!team) return null;
  const live = (ctx.matchups ?? []).find(m => m.roster_id === team.rosterId);
  const rows = team.starters.map(p => (p.empty ? p : { ...p, ...coachCall(p, ctx, boxes, slate, live, risk, marks[p.pid], whatifs[p.pid]) }));
  for (const r of rows) r.state = simState(r);
  return { team, rows, calls: rows.filter(r => r.call === 'lock') };
}

// ---------- Playing out the rest of the week ----------

// A starter's situation for display: a score that's settled ({ fixed }), or games still to
// come ({ cur, k, mu, sd }: cur = the unlocked score counting now, k = games left).
// One game for the simulator: draws around the average game (SCORE_CAL); lock bars and
// player values use the decision setting (LOCK_CAL), like the coach's own calls.
const gameDist = pg => ({
  mu: pg * TUNE.score, sd: Math.max(1, pg * TUNE.score * LOCK_SPREAD),
  barMu: pg * TUNE.lock, barSd: Math.max(1, pg * TUNE.lock * LOCK_SPREAD),
});
export function simState(r) {
  if (r.empty || r.call === 'none') return { fixed: 0 };
  if (r.call === 'locked' || r.call === 'final' || r.out) return { fixed: r.score ?? 0 };
  const up = r.sched.filter(g => !g.done && !g.playing).length;
  const s = gameDist(r.perGame || 0);
  if (r.call === 'live') return { ...s, cur: null, k: up + 1, floor: r.score ?? 0 };
  return { ...s, cur: r.score ?? null, k: up };
}

// ---------- Slot planner: the whole roster against the 9 lineup slots ----------

const SLOT_FITS = { PG: ['PG'], SG: ['SG'], G: ['PG', 'SG'], SF: ['SF'], PF: ['PF'], F: ['SF', 'PF'], C: ['C'] };
export const fits = (slot, positions) => !SLOT_FITS[slot] || (positions ?? []).some(p => SLOT_FITS[slot].includes(p));
// Injury tags that keep a player out of an assumed lineup (other teams; yours: OUT).
const SITS = /^(out|ir|suspension|inactive|doubtful)$/i;
// How picky a slot is (lock a player in the pickiest slot that still works): UTIL last.
const SLOT_RANK = { C: 0, PG: 0, SG: 0, SF: 0, PF: 0, G: 1, F: 1 };

// Best use of the open slots (the Hungarian method; 9 slots, ~20 players, so it's quick):
// the most total value with each player in at most one slot he fits. val(c, s) = player c's
// value in slot s, or null when he doesn't fit. Returns the total and each player's slot (-1 = bench).
let BUF = null;
export function bestFit(nS, nC, val) {
  const n = nS, m = nC + nS, size = (n + 1) * (m + 1);
  if (!BUF || BUF.cost.length < size || BUF.v.length < m + 1) {
    const cap = Math.max(size, 64 * 64), w = Math.max(m + 1, 64);
    BUF = { cost: new Float64Array(cap), u: new Float64Array(w), v: new Float64Array(w), p: new Int32Array(w), way: new Int32Array(w), minv: new Float64Array(w), used: new Uint8Array(w), ok: new Uint8Array(cap) };
  }
  const { cost, u, v, p, way, minv, used, ok } = BUF;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      const x = j < nC ? val(j, i) : null;
      cost[i * m + j] = x == null ? 0 : -x;
      ok[i * m + j] = x == null ? 0 : 1;
    }
  }
  u.fill(0, 0, n + 1); v.fill(0, 0, m + 1); p.fill(0, 0, m + 1); way.fill(0, 0, m + 1);
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    minv.fill(Infinity, 0, m + 1);
    used.fill(0, 0, m + 1);
    do {
      used[j0] = 1;
      const i0 = p[j0];
      let delta = Infinity, j1 = 0;
      for (let j = 1; j <= m; j++) {
        if (used[j]) continue;
        const c = cost[(i0 - 1) * m + j - 1] - u[i0] - v[j];
        if (c < minv[j]) { minv[j] = c; way[j] = j0; }
        if (minv[j] < delta) { delta = minv[j]; j1 = j; }
      }
      for (let j = 0; j <= m; j++) {
        if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta;
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
  }
  const slotOf = new Int32Array(nC).fill(-1);
  let total = 0;
  for (let j = 1; j <= nC; j++) {
    const i = p[j] - 1;
    if (i >= 0 && ok[i * m + j - 1]) { slotOf[j - 1] = i; total -= cost[i * m + j - 1]; }
  }
  return { total, slotOf };
}

// What a player's games are worth to wait on: W[k] = his value with k games left when he
// follows his own lock bars (W[1] = his average game; every extra game adds a chance).
function worthTable(mu, sd, n) {
  const w = [0, mu];
  for (let k = 2; k <= n; k++) w[k] = expectedMax(mu, sd, w[k - 1]);
  return w;
}
// One player for the planner. games = day numbers (0 = today) of the games he can still
// play for you (a game in progress included, floor = his points so far); fixed = a score
// that can't change any more (no games left, or listed out) but can still move between
// slots; cur = an unlocked score he holds now (replaced by his next game, lost if benched);
// start = his lineup slot (-1 = bench).
export function makePiece(o) {
  const piece = { start: -1, fixed: null, cur: null, floor: null, ...o, ...gameDist(o.pg || 0), games: o.games ?? [] };
  piece.W = worthTable(piece.barMu, piece.barSd, piece.games.length + 1);
  return piece;
}
const gamesAfter = (q, d) => { let n = 0; for (const x of q.games) if (x > d) n++; return n; };
// What he's worth from here on: a settled score, or the better of his score now and playing on.
export const valueNow = q => (q.fixed != null ? q.fixed : Math.max(q.floor ?? q.cur ?? 0, q.W[q.games.length] ?? 0));

// A team's plan: slots (names, in lineup order), open (false = a locked player holds it),
// base = locked points, pieces = every player who can still add something, days = dates.
// Works out who'd play if the lineup were set now for the rest of the week (now), each
// player's slot-aware lock bars for every game day (T), and which unlocked scores the coach
// would lock right away (nowLock). Same inputs for every team, and for the backtest.
export function makePlan({ slots, open, base = 0, pieces, days, risk = 'balanced' }) {
  const plan = { slots, open: [...open], base, pieces, days, risk };
  plan.openIdx = slots.map((s, i) => i).filter(i => plan.open[i]);
  plan.now = fitWith(plan, plan.openIdx, pieces.map(q => (q.skip ? null : valueNow(q))));
  plan.T = pieces.map((p, pi) => {
    const t = {};
    if (p.skip || p.fixed != null) return t;
    for (const d of new Set(p.games)) if (gamesAfter(p, d)) t[d] = lockBar(plan, pi, d).bar;
    return t;
  });
  plan.nowLock = pieces.map((p, pi) => !p.skip && p.fixed == null && p.cur != null && p.games.length > 0 && p.cur >= lockBar(plan, pi, -1).bar);
  return plan;
}
function fitWith(plan, openIdx, vals) {
  const { pieces, slots } = plan;
  // A hair of preference for where a player already is, so ties don’t shuffle the lineup.
  return bestFit(openIdx.length, pieces.length, (c, s) => (vals[c] == null || !fits(slots[openIdx[s]], pieces[c].elig) ? null : vals[c] + (openIdx[s] === pieces[c].start ? 0.001 : 0)));
}
// The lock bar for player pi after his game on day d (d = -1: right now, with the scores
// everyone holds). Locking takes a slot for good, so: lock if his score + the best use of
// the other slots beats keeping the slot open (for his own games left or anyone else who
// fits it and still plays). With nobody to compete for the slot it's his own bar; better
// players with games left raise it, and it drops again as they run out of games.
// Also returns the slot to lock him in (the one that leaves the most room for the rest).
export function lockBar(plan, pi, d) {
  const { pieces, slots, openIdx } = plan;
  const p = pieces[pi];
  const own = p.W[gamesAfter(p, d)] ?? 0;
  // Everyone else's value at that point: what they hold now (d = -1), or for players the plan
  // has in the lineup their value from now (on average it doesn't change), and for the rest
  // only their games after day d (a bench player's earlier games are gone by then).
  const vals = pieces.map((q, qi) => (q.skip ? null : qi === pi ? own
    : d < 0 || q.fixed != null || plan.now?.slotOf[qi] >= 0 ? valueNow(q) : q.W[gamesAfter(q, d)] ?? 0));
  const keep = fitWith(plan, openIdx, vals);
  const others = vals.map((v, qi) => (qi === pi ? null : v));
  const without = fitWith(plan, openIdx, others);
  // How many other players with something left could use each slot (fewer = lock him there).
  const demand = s => pieces.reduce((n, q, qi) => n + (qi !== pi && others[qi] > 0 && fits(slots[s], q.elig) ? 1 : 0), 0);
  // Ties on value: the slot fewest others could use, then the pickier slot, then where he is.
  const key = s => [demand(s), SLOT_RANK[slots[s]] ?? 2, s === p.start ? 0 : 1];
  const lower = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i]; return false; };
  let best = null;
  for (const s of openIdx) {
    if (!fits(slots[s], p.elig)) continue;
    const rest = fitWith(plan, openIdx.filter(i => i !== s), others);
    if (!best || rest.total > best.rest.total + 0.05 || (rest.total > best.rest.total - 0.05 && lower(key(s), best.key))) best = { slot: s, rest, key: key(s) };
  }
  if (!best) return { bar: Infinity, own, slot: -1 };
  const shift = (RISK[plan.risk] ?? 0) * p.barSd;
  // Who loses out if he takes the slot: in the lineup without him, not with him locked.
  const restIdx = openIdx.filter(i => i !== best.slot);
  const bumped = pieces.map((q, qi) => qi).filter(qi => without.slotOf[qi] >= 0 && best.rest.slotOf[qi] < 0 && vals[qi] > 0)
    .sort((a, b) => vals[b] - vals[a]);
  const slotIn = qi => (best.rest.slotOf[qi] >= 0 ? restIdx[best.rest.slotOf[qi]] : -1);
  const holder = p.start >= 0 && best.slot !== p.start
    ? pieces.findIndex((q, qi) => slotIn(qi) === p.start && (q.start < 0 || (q.fixed == null && q.games.length))) : -1;
  // The player now in the lock slot, if he has to move (and where to).
  const mover = best.slot !== p.start ? pieces.findIndex(q => q.start === best.slot) : -1;
  const moveTo = mover >= 0 ? slotIn(mover) : -1;
  return { bar: keep.total - best.rest.total + shift, own: own + shift, slot: best.slot, bumped, holder, mover, moveTo, vals };
}

// Small seeded random number generator, so "lock" and "wait" are compared on the same weeks.
function seeded(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const MAX_GAMES = 7;

// One team's final score in `runs` simulated weeks. Day by day: before the day's games, each
// bench player who plays today (best first) moves in for the weakest unlocked starter he can
// replace (slots re-sorted as needed; locked players stay) when he's worth more; a benched
// starter's score is gone. After each game a starter locks when his score beats his
// slot-aware bar. A player's luck depends only on the run and his place in the list, so two
// versions of a team see the same games. noBench = the lineup as set (no moves).
export function simTeam(plan, runs = 3000, seed = 7, { noBench = false, skill = 1, scale = 1 } = {}) {
  const P = plan.pieces, nP = P.length, D = plan.days.length;
  const { slots, openIdx } = plan;
  const nO = openIdx.length;
  const gameOn = P.map(p => { const a = new Int8Array(D + 1).fill(-1); p.games.forEach((d, j) => { if (d >= 0 && d < D) a[d] = j; }); return a; });
  const fromDay = P.map(p => Array.from({ length: D + 1 }, (_, d) => p.games.filter(x => x >= d).length));
  const bars = P.map((p, i) => Float64Array.from({ length: D + 1 }, (_, d) => plan.T[i][d] ?? Infinity));
  // Which open slots each player fits, as bits; "can this group all have a slot?" is a tiny matching.
  const mask = P.map(p => openIdx.reduce((m, s, k) => m | (fits(slots[s], p.elig) ? 1 << k : 0), 0));
  const owner = new Int32Array(nO);
  let seen = 0;
  const aug = pi => {
    let m = mask[pi] & ~seen;
    while (m) {
      const bit = m & -m;
      m ^= bit;
      seen |= bit;
      const k = 31 - Math.clz32(bit);
      if (owner[k] < 0 || aug(owner[k])) { owner[k] = pi; return true; }
    }
    return false;
  };
  const members = new Int32Array(nP);
  // Everyone in the lineup, with `out` swapped for `inn`, still fits the open slots?
  const fitsAll = (out, inn) => {
    let n = 0;
    for (let i = 0; i < nP; i++) if ((inL[i] && i !== out) || i === inn) members[n++] = i;
    if (n > nO) return false;
    owner.fill(-1);
    for (let a = 0; a < n; a++) { seen = 0; if (!aug(members[a])) return false; }
    return true;
  };
  const totals = new Float64Array(runs);
  const z = new Float64Array(nP * MAX_GAMES + 1);
  const inL = new Uint8Array(nP), lk = new Uint8Array(nP), cur = new Float64Array(nP), sloppy = new Uint8Array(nP);
  const val = new Float64Array(nP);
  const ins = [];
  const order = [];
  for (let run = 0; run < runs; run++) {
    const rand = seeded(seed * 100003 + run * 7919);
    for (let i = 0; i < nP * MAX_GAMES; i += 2) {
      const r = Math.sqrt(-2 * Math.log(1 - rand())), a = 2 * Math.PI * rand();
      z[i] = r * Math.cos(a);
      z[i + 1] = r * Math.sin(a);
    }
    for (let i = 0; i < nP; i++) {
      const p = P[i];
      inL[i] = !p.skip && p.start >= 0 ? 1 : 0;
      lk[i] = plan.nowLock[i] ? 1 : 0;
      // skill < 1 (other managers): this share of his starters follow the bars, the rest never lock (last game counts).
      sloppy[i] = skill < 1 && rand() > skill ? 1 : 0;
      if (sloppy[i]) lk[i] = 0;
      cur[i] = p.fixed ?? p.cur ?? NaN;
    }
    for (let d = 0; d < D; d++) {
      // Lineup moves: bench players who play today, best first, for the weakest starter they can replace.
      if (!noBench) {
        ins.length = 0;
        order.length = 0;
        let nIn = 0, minIn = Infinity;
        for (let i = 0; i < nP; i++) {
          const p = P[i];
          if (p.skip) continue;
          const n = fromDay[i][d];
          if (inL[i]) {
            nIn++;
            if (lk[i]) continue;
            val[i] = p.fixed != null ? p.fixed : Number.isNaN(cur[i]) || gameOn[i][d] >= 0 ? p.W[n] ?? 0 : Math.max(cur[i], p.W[n] ?? 0);
            order.push(i);
            if (val[i] < minIn) minIn = val[i];
          } else if (gameOn[i][d] >= 0 && p.fixed == null) {
            val[i] = p.W[n] ?? 0;
            ins.push(i);
          }
        }
        if (ins.length && (nIn < nO || ins.some(b => val[b] > minIn))) {
          ins.sort((a, b) => val[b] - val[a]);
          order.sort((a, b) => val[a] - val[b]);
          for (const b of ins) {
            if (nIn < nO && fitsAll(-1, b)) { inL[b] = 1; nIn++; continue; }
            for (let k = 0; k < order.length; k++) {
              const o = order[k];
              if (val[o] >= val[b]) break;
              if (!inL[o] || !fitsAll(o, b)) continue;
              inL[o] = 0;
              cur[o] = NaN;
              inL[b] = 1;
              order[k] = b;
              order.sort((x, y) => val[x] - val[y]);
              break;
            }
          }
        }
      }
      // The day's games.
      for (let i = 0; i < nP; i++) {
        const j = gameOn[i][d];
        if (j < 0 || !inL[i] || lk[i] || P[i].fixed != null) continue;
        const p = P[i];
        let g = (p.mu + p.sd * z[i * MAX_GAMES + Math.min(j, MAX_GAMES - 1)]) * scale;
        if (g < 0) g = 0;
        if (d === 0 && p.floor != null && g < p.floor) g = p.floor;
        cur[i] = g;
        if (!sloppy[i] && g >= bars[i][d]) lk[i] = 1;
      }
    }
    let sum = plan.base;
    for (let i = 0; i < nP; i++) if (inL[i] && !Number.isNaN(cur[i])) sum += cur[i];
    totals[run] = sum;
  }
  return totals;
}

// Chances to beat the opponent and the league median (when it counts), from every team's
// simulated scores (the same runs line up across teams), plus the average final scores.
export function oddsOf(totals, me, opp, medianOn) {
  const owners = Object.keys(totals);
  const runs = totals[me].length;
  let h2h = 0, med = 0, medSum = 0;
  const avg = Object.fromEntries(owners.map(o => [o, totals[o].reduce((a, b) => a + b, 0) / runs]));
  const row = new Float64Array(owners.length);
  for (let i = 0; i < runs; i++) {
    if (opp && totals[me][i] > totals[opp][i]) h2h++;
    if (medianOn) {
      owners.forEach((o, k) => { row[k] = totals[o][i]; });
      row.sort();
      const mid = row.length / 2;
      const median = row.length % 2 ? row[Math.floor(mid)] : (row[mid - 1] + row[mid]) / 2;
      medSum += median;
      if (totals[me][i] > median) med++;
    }
  }
  // medianScore = the projected league median: average over the runs of (4th + 5th of 8) / 2.
  return { h2h: opp ? h2h / runs : null, median: medianOn ? med / runs : null, medianScore: medianOn ? medSum / runs : null, avg };
}
const winsOf = w => (w.h2h ?? 0) + (w.median ?? 0);

// A version of a team's plan: player pi locked at his score in slot `slot`, or playing on.
export function planWith(plan, pi, { lockSlot = null, playOn = false }) {
  const pieces = plan.pieces.map((p, i) => (i !== pi ? p : playOn ? { ...p, cur: null } : { ...p, skip: true }));
  const open = plan.open.map((o, i) => (lockSlot != null && i === lockSlot ? false : o));
  const base = plan.base + (lockSlot != null ? plan.pieces[pi].cur ?? 0 : 0);
  return makePlan({ slots: plan.slots, open, base, pieces, days: plan.days, risk: plan.risk });
}

// The week's days from today on, and a team's planner pieces from the Lock-in coach rows
// and the bench. A bench player only earns games that haven't started when he moves in.
const weekDays = (slate, today) => [...new Set(Object.values(slate).flat().map(g => g.date).filter(d => d >= today))].sort();
export function teamPlan(c, slate, today, boxes = {}, sits = OUT, risk = 'balanced') {
  const days = weekDays(slate, today);
  const di = date => days.indexOf(date);
  const slots = c.rows.map(r => r.slot);
  const open = c.rows.map(r => r.empty || r.call !== 'locked');
  let base = 0;
  const pieces = [];
  c.rows.forEach((r, i) => {
    if (r.empty) return;
    if (r.call === 'locked') { base += r.score ?? 0; return; }
    const o = { pid: r.pid, name: r.name, elig: r.elig, pg: r.perGame || 0, start: i, row: r };
    if (r.call === 'none') o.fixed = 0;
    else if (r.call === 'final') o.fixed = r.score ?? 0;
    else if (sits.test(r.injury ?? '') && r.call !== 'live') o.fixed = r.score ?? 0;
    else {
      // Games Sleeper projects at 0 (he'll likely miss them) don't count as chances.
      const miss = new Set(r.missDates ?? []);
      o.games = r.sched.filter(g => g.playing || (!g.done && !miss.has(g.date))).map(g => di(g.date)).filter(x => x >= 0);
      if (r.call === 'live') o.floor = r.score ?? 0;
      if (['lock', 'wait'].includes(r.call)) o.cur = r.score ?? null;
      if (!o.games.length) { o.fixed = o.cur ?? 0; o.sitsOut = true; }
    }
    pieces.push(makePiece(o));
  });
  for (const b of c.team.bench) {
    if (sits.test(b.injury ?? '')) continue;
    const pg = b.perPlay || b.perGame || b.fpg || b.fpgLast || 0;
    const miss = new Set(b.missDates ?? []);
    const sched = (slate[b.team] ?? []).filter(g => !miss.has(g.date) && (g.date > today
      || (g.date === today && !['complete', 'in_progress', 'in_game'].includes(g.status) && !(boxes[b.pid] ?? []).some(x => x.date === today))));
    if (!pg || !sched.length) continue;
    pieces.push(makePiece({ pid: b.pid, name: b.name, elig: b.elig, pg, games: sched.map(g => di(g.date)), row: { ...b, call: 'plan', sched: slate[b.team] ?? [] } }));
  }
  // A what-if lock in the slot the coach suggested (not where he sits now): that slot closes and
  // the player sitting there now takes his old one.
  c.rows.forEach((r, i) => {
    const j = r.whatIf ? r.whatIfSlot : null;
    if (j == null || j === i || !open[j] || c.rows[j]?.call === 'locked' || !fits(slots[j], r.elig)) return;
    open[j] = false;
    open[i] = true;
    const q = pieces.find(x => x.start === j);
    if (q) q.start = i;
  });
  return makePlan({ slots, open, base, pieces, days, risk });
}

// The lineup the plan would play from now on, in the old bestLineup shape (per slot: the
// player, his state, fromBench, sitting), for "Their best lineup" and the Scouting report.
function lineupOf(c, plan) {
  const lineup = c.rows.map(r => (!r.empty && r.call === 'locked' ? { ...r, state: r.state } : null));
  plan.pieces.forEach((p, pi) => {
    const s = plan.now.slotOf[pi];
    if (s < 0) return;
    const i = plan.openIdx[s];
    const r = p.row;
    const state = p.fixed != null ? { fixed: p.fixed } : p.start >= 0 ? r.state : { ...gameDist(p.pg), cur: null, k: p.games.length };
    lineup[i] = { ...r, slot: c.rows[i].slot, state, fromBench: p.start < 0, sitting: p.start >= 0 && p.fixed != null && r.call !== 'final' && r.call !== 'none' };
  });
  const out = lineup.map((p, i) => p ?? { slot: c.rows[i].slot, empty: true, state: { fixed: 0 } });
  const inLineup = new Set(out.filter(p => !p.empty).map(p => p.pid));
  return { lineup: out, states: out.map(p => p.state), benched: c.rows.filter(r => !r.empty && !inLineup.has(r.pid)) };
}
// Another team's best lineup from now on (the owner: assume opponents play their best healthy
// players, not just today's lineup): locked players stay, anyone Out/Doubtful keeps only what
// he has, healthy bench players with games left take any slot they fit.
export function bestLineup(c, slate, today, boxes = {}) {
  return lineupOf(c, teamPlan(c, slate, today, boxes, SITS));
}

// ---------- The coach's calls ----------

const pct = x => `${Math.round(x * 100)}%`;
const gamesWord = n => `${n} game${n === 1 ? '' : 's'}`;
// Plain words for why a bar is where it is: who else wants the slot.
function rivalNote(plan, b, name) {
  if (b.bar - b.own < 1 || !b.bumped?.length) return '';
  const q = plan.pieces[b.bumped[0]];
  const who = q.start < 0 ? `${q.name} (bench, ${gamesWord(q.games.length)} left, worth about ${r1(valueNow(q))})`
    : `${q.name} (${q.row?.slot ?? ''}, worth about ${r1(valueNow(q))})`;
  return ` That’s higher than ${name ? `${name}’s` : 'his'} own ${r1(b.own)} bar: locking him uses a spot that ${who} would otherwise get.`;
}
// Points calls from the plan for one team's lineup rows (every team: opponents' cards too).
function applyPlan(c, plan, today) {
  const day = date => (date === today ? 'tonight' : dayName(date));
  plan.pieces.forEach((p, pi) => {
    const r = p.row;
    if (p.start < 0 || !r) return;
    if (p.sitsOut && ['lock', 'wait'].includes(r.call) && p.cur != null) {
      const b = lockBar(plan, pi, -1);
      r.call = 'lock';
      r.lockSlot = plan.slots[b.slot >= 0 ? b.slot : p.start];
      r.text = `Sleeper projects him to sit the rest of the week. Lock his ${p.cur} in ${r.lockSlot} so a surprise game can’t replace it.`;
      return;
    }
    if (p.sitsOut && r.call === 'plan') {
      r.text = 'Sleeper projects him to miss his games this week: start someone who plays.';
      return;
    }
    if (['lock', 'wait'].includes(r.call) && p.cur != null && p.games.length) {
      const b = lockBar(plan, pi, -1);
      const x = p.cur;
      const slot = plan.slots[b.slot];
      const next = r.sched.find(g => !g.done && !g.playing);
      const left = `${gamesWord(p.games.length)} left`;
      r.bar = r1(b.bar);
      r.ownBar = r1(b.own);
      r.lockSlot = slot;
      r.lockSlotIdx = b.slot;
      r.lockPlan = b;
      const hold = b.holder >= 0 ? plan.pieces[b.holder].name : '';
      const mover = b.mover >= 0 ? plan.pieces[b.mover] : null;
      const shift = mover ? `; ${mover.name} moves ${b.moveTo >= 0 ? `to ${plan.slots[b.moveTo]}` : 'to the bench'}` : '';
      r.slotText = `${slot}${b.slot !== p.start ? ` (move him there from ${r.slot} first${shift})` : ''}${hold ? `, keep ${r.slot} open for ${hold}` : ''}`;
      if (x >= b.bar) {
        r.call = 'lock';
        r.text = `Lock his ${x} in ${r.slotText}. It beats the ${r.bar} bar for this spot with ${left}.${rivalNote(plan, b)} Lock it before ${next ? day(next.date) : 'his next game'}.`;
      } else {
        r.call = 'wait';
        r.text = `${x} is under the ${r.bar} bar for this spot with ${left}.${rivalNote(plan, b)} Next: ${next ? day(next.date) : '–'}.`;
      }
      return;
    }
    if (r.call === 'live' && gamesAfter(p, 0)) {
      const b = lockBar(plan, pi, 0);
      r.bar = r1(b.bar);
      r.lockSlot = plan.slots[b.slot];
      r.text = `Playing now${r.score != null ? `: ${r.score} so far` : ''}. Lock it in ${r.lockSlot} if he finishes at ${r.bar}+.${rivalNote(plan, b)}`;
      return;
    }
    if (r.call === 'plan' && p.games.length > 1 && !r.sched.some(g => g.done && g.pts != null)) {
      const first = p.games[0];
      const b = lockBar(plan, pi, first);
      r.bar = r1(b.bar);
      r.lockSlot = plan.slots[b.slot];
      r.text = `${gamesWord(p.games.length)}. Lock his first one (${day(plan.days[first])}) in ${r.lockSlot} if he scores ${r.bar}+.${rivalNote(plan, b)}`;
    }
  });
  c.calls = c.rows.filter(r => r.call === 'lock');
}

// Lineup moves the plan makes: bench players to start (and who sits for them), plus starters
// who should change slots. A bench player has to be 3+ points better to be worth the move.
function lineupMoves(plan, c, today) {
  const P = plan.pieces;
  const vals = P.map(q => (q.skip ? null : valueNow(q) - (q.start < 0 ? 3 : 0)));
  const fit = bestFit(plan.openIdx.length, P.length, (ci, s) => {
    const q = P[ci];
    if (vals[ci] == null || !fits(plan.slots[plan.openIdx[s]], q.elig)) return null;
    return vals[ci] + (plan.openIdx[s] === q.start ? 0.01 : 0);
  });
  const slotOf = pi => (fit.slotOf[pi] >= 0 ? plan.openIdx[fit.slotOf[pi]] : -1);
  const outs = P.map((q, i) => i).filter(i => P[i].start >= 0 && slotOf(i) < 0);
  const empties = c.rows.map((r, i) => i).filter(i => c.rows[i].empty && plan.open[i]);
  const ins = P.map((q, i) => i).filter(i => P[i].start < 0 && slotOf(i) >= 0).sort((a, b) => valueNow(P[b]) - valueNow(P[a]));
  const day = date => (date === today ? 'tonight' : dayName(date));
  const swaps = ins.map(bi => {
    const b = P[bi];
    const s = slotOf(bi);
    let oi = outs.find(i => P[i].start === s) ?? outs.sort((x, y) => valueNow(P[x]) - valueNow(P[y]))[0];
    let r;
    if (oi != null) { outs.splice(outs.indexOf(oi), 1); r = P[oi].row; } else { const e = empties.shift(); r = { slot: c.rows[e ?? s].slot, name: 'an empty spot', empty: true }; }
    const o = oi != null ? P[oi] : null;
    const first = plan.days[b.games[0]];
    const worth = valueNow(b), keep = o ? valueNow(o) : 0;
    // The starter he replaces may get a game or more in first: then he can still lock a big one.
    let first2 = '';
    if (o && o.fixed == null && o.games.length && o.games[0] < b.games[0] && gamesAfter(o, o.games[0])) {
      const bar = plan.T[oi][o.games[0]];
      if (bar != null && Number.isFinite(bar)) first2 = `${o.name} plays ${day(plan.days[o.games[0]])} first: lock him only at ${r1(bar)}+, else bench him for ${b.name} before ${day(first)}.`;
    }
    return { b: b.row, r, slot: plan.slots[s], games: b.games, day: first, when: day(first), worth: r1(worth), keep: r1(keep), gain: r1(worth - keep), first: first2 };
  });
  const moves = P.map((q, i) => ({ q, s: slotOf(i) })).filter(({ q, s }) => q.start >= 0 && s >= 0 && s !== q.start)
    .map(({ q, s }) => ({ name: q.name, from: q.row.slot, to: plan.slots[s] }));
  return { swaps, moves };
}

// ---------- Starting pipeline: one day's lineup by tip-off time ----------

// An NBA game takes about 2h15m: a player whose game tips this long after another's can still
// replace him once that game is over (owner, Oct 2026: stream later games in for low scores).
export const GAME_LEN = 2.25 * 3600e3;
// What a run of games is worth when he follows his lock bars game by game. Same as the W table,
// but each game has its own projection (Sleeper's daily projections differ by opponent).
function seqWorth(mus) {
  let v = 0;
  for (let i = mus.length - 1; i >= 0; i--) {
    const mu = mus[i] * TUNE.lock;
    v = i === mus.length - 1 ? mu : expectedMax(mu, Math.max(1, mu * LOCK_SPREAD), v);
  }
  return v;
}
// One day's plan (date = today or later this week) for a team's open slots, from the slot planner's
// pieces. Before the day's first tip: the best lineup for that day (a bench player 3+ better moves
// in). Then for each starter who plays early: the score under which he should be benched for a
// player whose game starts after his is over (the best fit of the open slots with his score vs
// without him), the lock bar above which he locks, and the chain that follows. A player whose
// game has started can't come in, and one benched after his game loses his score.
export function startingPipeline(c, slate, date, today, boxes = {}) {
  const plan = c.plan;
  const dd = plan.days.indexOf(date);
  if (dd < 0) return null;
  const P = plan.pieces, { slots, openIdx } = plan;
  const nO = openIdx.length;
  const muOf = (q, d) => { const x = q.row?.dayProj?.[plan.days[d]]; return x > 0 ? x : q.pg; };
  const live = s => ['in_game', 'in_progress'].includes(s);
  const info = P.map((q, qi) => {
    const g = (slate[q.row?.team] ?? []).find(x => x.date === date) ?? null;
    const tip = g?.tip ? Date.parse(g.tip) : null;
    const later = q.games.filter(x => x > dd).map(x => muOf(q, x));
    const rest = q.fixed != null ? q.fixed : seqWorth(later);
    const o = { qi, q, g, tip, rest, mu: q.games.includes(dd) ? muOf(q, dd) : null, held: q.start >= 0 ? q.cur : null };
    if (q.skip || q.fixed != null) o.kind = 'fixed';
    else if (date === today && g && q.start >= 0 && (live(g.status) || (q.floor != null && q.games.includes(dd)))) o.kind = 'live';
    else if (date === today && g && q.start >= 0 && !q.games.includes(dd) && (g.status === 'complete' || (boxes[q.pid] ?? []).some(b => b.date === date))) o.kind = 'done';
    else if (q.games.includes(dd)) o.kind = 'up';
    else o.kind = 'off';
    o.tonight = o.kind === 'up' || o.kind === 'live' ? seqWorth([o.mu, ...later]) : rest;
    // His next game after that day (a player who comes in on a later day must be in before it).
    const nd = q.games.find(x => x > dd);
    if (nd != null) {
      const ng = (slate[q.row?.team] ?? []).find(x => x.date === plan.days[nd]);
      o.next = { date: plan.days[nd], tip: ng?.tip ? Date.parse(ng.tip) : null };
    }
    return o;
  });
  // Best fit of the open slots for the given values (null = can't play), a hair of preference for `pref` slots.
  const fit = (vals, pref) => {
    const f = bestFit(nO, P.length, (ci, s) => (vals[ci] == null || !fits(slots[openIdx[s]], P[ci].elig) ? null : vals[ci] + (openIdx[s] === pref[ci] ? 0.001 : 0)));
    return P.map((q, ci) => (f.slotOf[ci] >= 0 ? openIdx[f.slotOf[ci]] : -1));
  };
  // What a player in the lineup is worth: a held score he could lock, or his games from that day on.
  const kept = o => (o.kind === 'fixed' ? o.q.fixed : o.kind === 'done' ? Math.max(o.held ?? 0, o.rest)
    : o.kind === 'live' ? Math.max(o.q.floor ?? 0, o.tonight) : Math.max(o.held ?? 0, o.tonight));
  // The day's main lineup: who should hold each slot by the end of the day (a bench player needs
  // +3 to take a playing starter's spot; one with no game that day comes in later, see optionFor).
  const start = P.map(q => q.start);
  const main = fit(info.map(o => (o.q.skip ? null : o.q.start >= 0 ? kept(o) : o.kind === 'up' ? o.tonight - 3 : null)), start);
  // When a main player first needs his slot: his tip that day, or (no game that day and no score to
  // lose) his next game. Until then an earlier player can use it for free: he plays first, and stays
  // only if his score beats what the main player is worth (the opener).
  const needs = o => (o.kind === 'up' ? o.tip : o.q.start >= 0 && o.kind === 'off' && o.held == null ? o.next?.tip ?? null : null);
  const slot0 = [...main];
  const waiting = {}; // slot -> the main player an opener keeps it warm for
  const openers = info.filter(o => main[o.qi] < 0 && o.kind === 'up' && o.tip != null).sort((x, y) => y.tonight - x.tonight);
  for (const o of openers) {
    const ok = openIdx.filter(s => {
      if (waiting[s] || !fits(slots[s], o.q.elig)) return false;
      const h = info.find(x => slot0[x.qi] === s);
      const t = h ? needs(h) : null;
      return h && t != null && o.tip + GAME_LEN <= t;
    });
    if (!ok.length) continue;
    // His own slot if it works, else the one needed latest (most time to decide).
    const s = ok.includes(o.q.start) ? o.q.start : ok.sort((x, y) => needs(info.find(h => slot0[h.qi] === y)) - needs(info.find(h => slot0[h.qi] === x)))[0];
    const h = info.find(x => slot0[x.qi] === s);
    waiting[s] = h;
    slot0[h.qi] = -1;
    slot0[o.qi] = s;
  }
  // Moves before the day's first tip: bench players in, starters out (waiting = back in later).
  const ins = info.filter(o => o.q.start < 0 && slot0[o.qi] >= 0);
  const outs = info.filter(o => o.q.start >= 0 && slot0[o.qi] < 0);
  const isWaiting = o => Object.values(waiting).includes(o);
  const moves = ins.map(o => ({ o, slot: slots[slot0[o.qi]], out: outs.find(x => x.q.start === slot0[o.qi]) ?? null }));
  for (const m of moves) if (!m.out && outs.length) m.out = outs.sort((x, y) => kept(x) - kept(y))[0];
  for (const m of moves) if (m.out) outs.splice(outs.indexOf(m.out), 1);
  moves.push(...outs.map(o => ({ o: null, slot: slots[o.q.start], out: o })));
  for (const m of moves) m.later = Boolean(m.out && isWaiting(m.out));
  const shifts = info.filter(o => o.q.start >= 0 && slot0[o.qi] >= 0 && slot0[o.qi] !== o.q.start).map(o => ({ o, from: slots[o.q.start], to: slots[slot0[o.qi]] }));

  // Can b take a's slot at time t (that day; null = a later day)? Players in the lineup whose game
  // hasn't started by then (or who don't play that day) can change slots to make room; the rest
  // stay put. Returns the new lineup and who shifts, or null.
  const swapIn = (a, b, L, t) => {
    const moving = info.filter(o => o.qi !== a.qi && L[o.qi] >= 0 && (t == null || o.kind === 'off' || o.kind === 'fixed' || (o.kind === 'up' && o.tip != null && o.tip >= t)));
    const free = [L[a.qi], ...moving.map(o => L[o.qi])];
    const who = [b, ...moving];
    const f = bestFit(free.length, who.length, (ci, s) => (fits(slots[free[s]], who[ci].q.elig) ? 1 + (free[s] === L[who[ci].qi] ? 0.001 : 0) : null));
    if ([...f.slotOf].some(s => s < 0)) return null;
    const after = [...L];
    after[a.qi] = -1;
    who.forEach((o, ci) => { after[o.qi] = free[f.slotOf[ci]]; });
    return { after, shift: moving.filter(o => after[o.qi] !== L[o.qi]).map(o => ({ o, from: slots[L[o.qi]], to: slots[after[o.qi]] })) };
  };
  // The streaming call for player a in lineup L (piece -> slot): the score under which he should
  // make way, for whom (b: the player he keeps the slot warm for, else the best bench player whose
  // game starts after his is over), in which slot, by when, and who shifts slots to make room.
  const spare = o => o.kind === 'up' && slot0[o.qi] < 0 && !isWaiting(o);
  const optionFor = (a, L, warm, taken = new Set()) => {
    if (a.kind === 'fixed' || a.kind === 'off' || (a.tip == null && a.kind !== 'done')) return null;
    // Who can still come in once his game is over (already over: anyone whose game hasn't started).
    const ready = a.kind === 'done' ? 0 : a.tip + GAME_LEN;
    const tonight = o => o.kind === 'up' && (a.kind === 'done' || (o.tip != null && o.tip >= ready));
    const cands = (warm ? [warm] : info.filter(o => spare(o) && tonight(o) && !taken.has(o.qi)))
      .map(b => ({ b, v: tonight(b) ? b.tonight : b.rest, t: tonight(b) ? b.tip : null }))
      .filter(c => c.v > a.rest).sort((x, y) => y.v - x.v);
    for (const { b, v, t } of cands) {
      const s = swapIn(a, b, L, t);
      if (!s) continue;
      // Keep him when his score (or his games after that day) beats what b is worth: the line is b's value.
      return { x: r1(v), b, slot: slots[s.after[b.qi]], slotIdx: s.after[b.qi], by: t ?? b.next?.tip ?? null, byDate: t != null ? date : b.next?.date ?? null, shift: s.shift, after: s.after };
    }
    return { x: 0 };
  };
  const lockOf = a => {
    if (!a.q.games.some(x => x > dd)) return null; // his last game of the week counts if he stays in
    const pi = a.qi;
    const t = a.kind === 'up' ? plan.T[pi]?.[dd] : a.q.row?.bar;
    return t != null && Number.isFinite(t) ? r1(t) : null;
  };
  const rows = slots.map((slot, i) => {
    // Closed: locked there, or a what-if lock moved into it (teamPlan).
    if (!plan.open[i]) return { slot, locked: c.rows.find(r => r.whatIf && r.whatIfSlot === i) ?? c.rows[i] };
    const a = info.find(o => slot0[o.qi] === i);
    if (!a) return { slot, empty: true };
    // An opener is judged against the player he keeps the slot warm for, anyone else against
    // tonight's spare bench players.
    const opt = optionFor(a, slot0, waiting[i]);
    const row = { slot, a, lock: lockOf(a), opt, waiting: waiting[i] ?? null };
    // The player who comes in may get his own streaming call later that night.
    if (opt?.b) {
      const next = optionFor(opt.b, opt.after, null, new Set([opt.b.qi]));
      if (next?.b) row.next = { ...next, lock: lockOf(opt.b) };
    }
    // Played already (today): where his score falls.
    const x = a.kind === 'done' ? a.held : null;
    if (x != null && opt) row.verdict = opt.b && x < opt.x ? 'swap' : row.lock != null && x >= row.lock ? 'lock' : 'keep';
    return row;
  });
  // Tip-off groups for the day: every piece with a game that day, earliest first.
  const tips = {};
  for (const o of info) if (o.g && (o.kind !== 'off' || o.q.start >= 0)) (tips[o.tip ?? 'none'] ??= []).push(o);
  const order = Object.keys(tips).sort((x, y) => (x === 'none' ? 1 : y === 'none' ? -1 : Number(x) - Number(y)));
  const bench = info.filter(o => slot0[o.qi] < 0 && o.kind === 'up' && !rows.some(r => r.opt?.b === o || r.next?.b === o));
  return { date, rows, moves, shifts, bench, tips: order.map(t => ({ tip: t === 'none' ? null : Number(t), players: tips[t] })), noTimes: order.length > 0 && order.every(t => t === 'none') };
}

// Lock calls for every team, and for yours the week played out many times. "Play to win"
// (mode 'win'): for each unlocked score, the week is played out both ways (lock it now in the
// best slot / keep playing) and the coach picks whichever gives the better chance of beating
// the opponent plus the chance of beating the median. Every team is planned the same way:
// best fit of the whole roster into the 9 slots, slot-aware lock bars, bench players moved in
// when they're worth more (the owner: assume opponents play smart too). Your odds assume you
// follow the coach; asSet = your lineup exactly as set (no moves).
export function gameCoach(DATA, ctx, boxes, slate, me, pairs, { mode = 'win', marks = {}, whatifs = {}, medianOn = false, runs = 2000 } = {}) {
  const risk = mode === 'win' ? 'balanced' : mode;
  const pair = pairs.find(p => p.a === me || p.b === me);
  const opp = pair ? (pair.a === me ? pair.b : pair.a) : null;
  const all = {};
  // Marks are saved per player, so a lock marked while viewing any team counts for that team everywhere.
  for (const r of ctx.rosters ?? []) {
    const c = lockCoach(DATA, ctx, boxes, slate, r.owner_id, risk, marks, whatifs);
    if (c) all[r.owner_id] = c;
  }
  const mine = all[me];
  if (!mine) return null;
  const plans = {};
  for (const [o, c] of Object.entries(all)) {
    plans[o] = teamPlan(c, slate, ctx.today, boxes, o === me ? OUT : SITS, o === me ? risk : 'balanced');
    applyPlan(c, plans[o], ctx.today);
  }
  const owners = Object.keys(all);
  const seedOf = o => 11 + owners.indexOf(o);
  // Other teams score like real managers did (OPP_CAL); yours follows the coach (SCORE_CAL).
  const totals = Object.fromEntries(owners.map(o => [o, simTeam(plans[o], runs, seedOf(o), o === me ? {} : { scale: TUNE.opp / TUNE.score })]));
  const now = oddsOf(totals, me, opp, medianOn);
  const setPlan = makePlan({ ...plans[me], pieces: plans[me].pieces.map(p => (p.start < 0 ? { ...p, skip: true } : p)) });
  const asSet = oddsOf({ ...totals, [me]: simTeam(setPlan, runs, seedOf(me)) }, me, opp, medianOn);
  const tryPlan = plan => oddsOf({ ...totals, [me]: simTeam(plan, runs, seedOf(me)) }, me, opp, medianOn);

  if (mode === 'win' && (opp || medianOn)) {
    const chance = w => [opp ? `${pct(w.h2h)} to win` : '', medianOn ? `${pct(w.median)} to beat the median` : ''].filter(Boolean).join(', ');
    plans[me].pieces.forEach((p, pi) => {
      const r = p.row;
      if (p.start < 0 || !['lock', 'wait'].includes(r.call) || r.out || p.cur == null || p.fixed != null) return;
      const lock = tryPlan(planWith(plans[me], pi, { lockSlot: r.lockSlotIdx }));
      const wait = tryPlan(planWith(plans[me], pi, { playOn: true }));
      const diff = winsOf(lock) - winsOf(wait);
      r.win = { lock, wait };
      const pointsCall = r.call;
      // Too close to call on wins: keep the points call.
      if (Math.abs(diff) >= 0.01) r.call = diff > 0 ? 'lock' : 'wait';
      const why = r.call === pointsCall ? '' : r.call === 'lock' ? ' You’re in good shape, so protect the lead.' : ' You need a bigger night to catch up.';
      const next = r.sched.find(g => !g.done && !g.playing);
      const day = next ? (next.date === ctx.today ? 'tonight' : dayName(next.date)) : '';
      const note = rivalNote(plans[me], r.lockPlan);
      r.text = r.call === 'lock'
        ? `Lock the ${p.cur} in ${r.slotText}. Locked: ${chance(lock)}. Keep playing: ${chance(wait)}.${why}${note} Lock it before ${day}.`
        : `Keep playing (${p.cur} so far; the bar for this spot is ${r.bar}). Keep playing: ${chance(wait)}. Locked: ${chance(lock)}.${why}${note} Next: ${day}.`;
    });
    mine.calls = mine.rows.filter(r => r.call === 'lock');
    for (const r of mine.rows) if (r.call === 'plan' && r.bar) r.text += ' That’s the points bar; after the game the coach makes the final call with the matchup in mind.';
  }

  const { swaps, moves } = lineupMoves(plans[me], mine, ctx.today);
  return { ...mine, opp, oppCoach: opp ? all[opp] : null, oppBest: opp ? lineupOf(all[opp], plans[opp]) : null, now, asSet, swaps, moves, medianOn, plan: plans[me] };
}

// Every team's week played out the same way (Weekly Props lines, assets/props.js): each roster
// planned like an opponent (best healthy lineup, Balanced bars, bench moves) and scored at
// OPP_CAL, which matched real finals. { totals: { owner: Float64Array }, plans: { owner } }.
export function weekTotals(DATA, ctx, boxes, slate, runs = 4000) {
  const totals = {}, plans = {};
  (ctx.rosters ?? []).map(r => r.owner_id).filter(Boolean).forEach((o, i) => {
    const c = lockCoach(DATA, ctx, boxes, slate, o, 'balanced');
    if (!c) return;
    plans[o] = teamPlan(c, slate, ctx.today, boxes, SITS, 'balanced');
    applyPlan(c, plans[o], ctx.today);
    totals[o] = simTeam(plans[o], runs, 11 + i, { scale: TUNE.opp / TUNE.score });
  });
  return { totals, plans };
}

// One planned player's locked score over many weeks: his games drawn like simTeam's (OPP_CAL),
// locked at the plan's slot-aware bars, else his last game counts. Sorted, for a median line.
export function lockedDraws(plan, pi, runs = 4000, seed = 5) {
  const p = plan.pieces[pi];
  const mu = p.pg * TUNE.opp, sd = Math.max(1, mu * LOCK_SPREAD);
  const rand = seeded(seed);
  const out = new Float64Array(runs);
  for (let run = 0; run < runs; run++) {
    let x = 0;
    for (let j = 0; j < p.games.length; j++) {
      const z = Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
      x = Math.max(0, mu + sd * z);
      if (j < p.games.length - 1 && x >= (plan.T[pi][p.games[j]] ?? Infinity)) break;
    }
    out[run] = x;
  }
  return out.sort();
}

// ---------- Daily briefing ----------

// Injury news on a roster since the last visit. `seen` is the saved { pid: status }
// from last time ({} on a first visit). Returns the changes and the new snapshot.
export function injuryNews(team, seen) {
  const all = [...team.starters.filter(p => !p.empty), ...team.bench, ...team.ir, ...team.taxi];
  const now = Object.fromEntries(all.map(p => [p.pid, p.injury ?? '']));
  const first = !Object.keys(seen ?? {}).length;
  const news = all.filter(p => (first ? p.injury : (seen[p.pid] ?? '') !== (p.injury ?? '')))
    .map(p => ({ ...p, was: seen?.[p.pid] ?? '', starter: team.starters.some(s => s.pid === p.pid) }));
  return { first, news, now };
}
