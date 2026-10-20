// Assistant GM (Commissioner's office, "My GM" tabs): the Lock-in coach and the
// Daily briefing. Live Sleeper data in the browser, on top of commish.js's loadWeek.

import { get, teamRoster } from './commish.js';

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
// Simulated SCORES use the measured average game instead: 1.082 x the projection (same test,
// 4,965 games). LOCK_CAL stays the setting for lock decisions (it made the best calls); using
// it for scores ran projected team totals about 6% low vs the Scouting report.
export const SCORE_CAL = 1.082;
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
  const mu = perGame * LOCK_CAL;
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
    if (!/^\d+$/.test(g.player_id) || !g.stats || !(g.stats.gp || g.stats.sp)) continue;
    (out[g.player_id] ??= []).push({ date: g.date, pts: r1(fantasy(g.stats, scoring)) });
  }
  for (const list of Object.values(out)) list.sort((a, b) => (a.date < b.date ? -1 : 1));
  return out;
}

// NBA schedule this week by team, with opponent and status: { BOS: [{ date, opp, home, status }] }
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
  return out;
}

// ---------- Lock-in coach ----------

// One starter's lock call. Sleeper's public data doesn't say whether a game was locked:
// players_points is the score that counts right now (his locked game, or else his
// latest game). If that differs from his latest game, he must be locked on an earlier
// one. Otherwise the manager can mark "I locked him" (saved in this browser).
function coachCall(p, ctx, boxes, slate, live, risk, marked) {
  const today = ctx.today;
  const sched = (slate[p.team] ?? []).map(g => {
    const box = (boxes[p.pid] ?? []).find(b => b.date === g.date);
    const done = g.status === 'complete' || g.date < today;
    const playing = !done && g.date === today && (g.status === 'in_progress' || Boolean(box));
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
  // Locked? Inferred from Sleeper's counted score, or marked by the manager.
  const earlier = played.slice(0, -1).find(g => counted != null && Math.abs(g.pts - counted) < 0.05);
  if (latest && counted != null && Math.abs(latest.pts - counted) >= 0.05 && earlier) {
    return { ...base, call: 'locked', score: earlier.pts, text: `Locked at ${earlier.pts} (from ${dayName(earlier.date)}).`, inferred: true };
  }
  if (marked != null && played.length) {
    return { ...base, call: 'locked', score: counted ?? marked, text: `Locked at ${counted ?? marked} (you marked it).`, marked: true };
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
export function lockCoach(DATA, ctx, boxes, slate, owner, risk = 'balanced', marks = {}) {
  const team = teamRoster(DATA, ctx, owner);
  if (!team) return null;
  const live = (ctx.matchups ?? []).find(m => m.roster_id === team.rosterId);
  const rows = team.starters.map(p => (p.empty ? p : { ...p, ...coachCall(p, ctx, boxes, slate, live, risk, marks[p.pid]) }));
  for (const r of rows) r.state = simState(r);
  return { team, rows, calls: rows.filter(r => r.call === 'lock') };
}

// ---------- Playing out the rest of the week ----------

// A starter's situation for display: a score that's settled ({ fixed }), or games still to
// come ({ cur, k, mu, sd }: cur = the unlocked score counting now, k = games left).
// One game for the simulator: draws around the average game (SCORE_CAL); lock bars and
// player values use the decision setting (LOCK_CAL), like the coach's own calls.
const gameDist = pg => ({
  mu: pg * SCORE_CAL, sd: Math.max(1, pg * SCORE_CAL * LOCK_SPREAD),
  barMu: pg * LOCK_CAL, barSd: Math.max(1, pg * LOCK_CAL * LOCK_SPREAD),
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
export function simTeam(plan, runs = 3000, seed = 7, { noBench = false } = {}) {
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
  const inL = new Uint8Array(nP), lk = new Uint8Array(nP), cur = new Float64Array(nP);
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
        let g = p.mu + p.sd * z[i * MAX_GAMES + Math.min(j, MAX_GAMES - 1)];
        if (g < 0) g = 0;
        if (d === 0 && p.floor != null && g < p.floor) g = p.floor;
        cur[i] = g;
        if (g >= bars[i][d]) lk[i] = 1;
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
  let h2h = 0, med = 0;
  const avg = Object.fromEntries(owners.map(o => [o, totals[o].reduce((a, b) => a + b, 0) / runs]));
  const row = new Float64Array(owners.length);
  for (let i = 0; i < runs; i++) {
    if (opp && totals[me][i] > totals[opp][i]) h2h++;
    if (medianOn) {
      owners.forEach((o, k) => { row[k] = totals[o][i]; });
      row.sort();
      const mid = row.length / 2;
      const median = row.length % 2 ? row[Math.floor(mid)] : (row[mid - 1] + row[mid]) / 2;
      if (totals[me][i] > median) med++;
    }
  }
  return { h2h: opp ? h2h / runs : null, median: medianOn ? med / runs : null, avg };
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
      || (g.date === today && !['complete', 'in_progress'].includes(g.status) && !(boxes[b.pid] ?? []).some(x => x.date === today))));
    if (!pg || !sched.length) continue;
    pieces.push(makePiece({ pid: b.pid, name: b.name, elig: b.elig, pg, games: sched.map(g => di(g.date)), row: { ...b, call: 'plan', sched: slate[b.team] ?? [] } }));
  }
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

// Lock calls for every team, and for yours the week played out many times. "Play to win"
// (mode 'win'): for each unlocked score, the week is played out both ways (lock it now in the
// best slot / keep playing) and the coach picks whichever gives the better chance of beating
// the opponent plus the chance of beating the median. Every team is planned the same way:
// best fit of the whole roster into the 9 slots, slot-aware lock bars, bench players moved in
// when they're worth more (the owner: assume opponents play smart too). Your odds assume you
// follow the coach; asSet = your lineup exactly as set (no moves).
export function gameCoach(DATA, ctx, boxes, slate, me, pairs, { mode = 'win', marks = {}, medianOn = false, runs = 2000 } = {}) {
  const risk = mode === 'win' ? 'balanced' : mode;
  const pair = pairs.find(p => p.a === me || p.b === me);
  const opp = pair ? (pair.a === me ? pair.b : pair.a) : null;
  const all = {};
  for (const r of ctx.rosters ?? []) {
    const c = lockCoach(DATA, ctx, boxes, slate, r.owner_id, risk, r.owner_id === me ? marks : {});
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
  const totals = Object.fromEntries(owners.map(o => [o, simTeam(plans[o], runs, seedOf(o))]));
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
