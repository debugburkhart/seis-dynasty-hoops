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

// A starter's situation for the simulator: a score that's settled ({ fixed }), or games
// still to come ({ cur, k, mu, sd }: cur = the unlocked score counting now, k = games left).
// A game in progress counts as a game to come that can't finish under what he has so far.
export function simState(r) {
  if (r.empty || r.call === 'none') return { fixed: 0 };
  if (r.call === 'locked' || r.call === 'final' || r.out) return { fixed: r.score ?? 0 };
  const up = r.sched.filter(g => !g.done && !g.playing).length;
  const mu = (r.perGame || 0) * LOCK_CAL;
  const s = { mu, sd: Math.max(1, mu * LOCK_SPREAD) };
  if (r.call === 'live') return { ...s, cur: null, k: up + 1, floor: r.score ?? 0 };
  return { ...s, cur: r.score ?? null, k: up };
}

// Points-mode lock bars (Balanced) for a state, cached on it: what waiting is worth with k left.
function barsOf(s) {
  if (!s.bars) {
    s.bars = [null, s.mu];
    for (let k = 2; k <= (s.k || 0); k++) s.bars[k] = expectedMax(s.mu, s.sd, s.bars[k - 1]);
  }
  return s.bars;
}
const MAX_GAMES = 6;
// One starter's final score in one simulated week. z = his random draws (MAX_GAMES of them,
// so every version of a team uses the same luck). Unsettled players follow the Balanced bars.
function playOut(s, z) {
  if (s.fixed != null) return s.fixed;
  const bars = barsOf(s);
  if (s.cur != null && (!s.k || s.cur >= bars[s.k])) return s.cur;
  for (let j = 0; j < s.k; j++) {
    let g = Math.max(0, s.mu + s.sd * z[j]);
    if (j === 0 && s.floor) g = Math.max(g, s.floor);
    const left = s.k - 1 - j;
    if (!left || g >= bars[left]) return g;
  }
  return s.cur ?? 0;
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
// Chance that `me` beats `opp` and beats the league median (when it counts), with every
// team's starters given as sim states: { owner: [state] }. Also the average final scores.
export function winChance(teams, me, opp, medianOn, runs = 3000, seed = 7) {
  const rand = seeded(seed);
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
  const owners = Object.keys(teams);
  let h2h = 0;
  let med = 0;
  const avg = Object.fromEntries(owners.map(o => [o, 0]));
  const z = new Array(MAX_GAMES);
  for (let i = 0; i < runs; i++) {
    const tot = {};
    for (const o of owners) {
      let sum = 0;
      for (const s of teams[o]) {
        // Settled scores need no luck (on `me`, draw anyway: versions of his team must line up).
        if (s.fixed != null && o !== me) { sum += s.fixed; continue; }
        for (let j = 0; j < MAX_GAMES; j++) z[j] = gauss();
        sum += playOut(s, z);
      }
      tot[o] = sum;
      avg[o] += sum / runs;
    }
    if (opp && tot[me] > tot[opp]) h2h++;
    if (medianOn) {
      const sorted = owners.map(o => tot[o]).sort((a, b) => a - b);
      const mid = sorted.length / 2;
      const median = sorted.length % 2 ? sorted[Math.floor(mid)] : (sorted[mid - 1] + sorted[mid]) / 2;
      if (tot[me] > median) med++;
    }
  }
  return { h2h: opp ? h2h / runs : null, median: medianOn ? med / runs : null, avg };
}
const winsOf = w => (w.h2h ?? 0) + (w.median ?? 0);

// ---------- Play to win: the coach with the opponent (and the median) in mind ----------

const SLOT_FITS = { PG: ['PG'], SG: ['SG'], G: ['PG', 'SG'], SF: ['SF'], PF: ['PF'], F: ['SF', 'PF'], C: ['C'] };
const fits = (slot, positions) => !SLOT_FITS[slot] || (positions ?? []).some(p => SLOT_FITS[slot].includes(p));

// Lock calls that go after wins instead of points: for each unlocked score, the week is
// played out both ways (lock it now / keep playing) and the coach picks whichever gives
// the better chance of beating the opponent plus the chance of beating the median.
// Also: bench players worth starting (a bench player only earns games after he's moved
// in; a locked starter can't be moved; a benched starter's score is lost).
export function gameCoach(DATA, ctx, boxes, slate, me, pairs, { mode = 'win', marks = {}, medianOn = false } = {}) {
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
  const teams = Object.fromEntries(Object.entries(all).map(([o, c]) => [o, c.rows.map(r => r.state)]));
  const now = winChance(teams, me, opp, medianOn);
  const swapTeam = (i, state) => ({ ...teams, [me]: teams[me].map((s, j) => (j === i ? state : s)) });

  // Win-mode lock calls.
  if (mode === 'win' && (opp || medianOn)) {
    mine.rows.forEach((r, i) => {
      if (r.empty || !['lock', 'wait'].includes(r.call) || r.out) return;
      const s = r.state;
      const lock = winChance(swapTeam(i, { fixed: s.cur }), me, opp, medianOn);
      const wait = winChance(swapTeam(i, { ...s, cur: null, bars: null }), me, opp, medianOn);
      const diff = winsOf(lock) - winsOf(wait);
      r.win = { lock, wait };
      const pointsCall = r.call;
      // Too close to call on wins: keep the points call.
      if (Math.abs(diff) >= 0.01) r.call = diff > 0 ? 'lock' : 'wait';
      const pct = x => `${Math.round(x * 100)}%`;
      const chance = w => [opp ? `${pct(w.h2h)} to win` : '', medianOn ? `${pct(w.median)} to beat the median` : ''].filter(Boolean).join(', ');
      const why = r.call === pointsCall ? '' : r.call === 'lock' ? ' You’re in good shape, so protect the lead.' : ' You need a bigger night to catch up.';
      const next = r.sched.find(g => !g.done && !g.playing);
      const day = next ? (next.date === ctx.today ? 'tonight' : dayName(next.date)) : '';
      r.text = r.call === 'lock'
        ? `Lock the ${s.cur}. Locked: ${chance(lock)}. Keep playing: ${chance(wait)}.${why} Lock it before ${day}.`
        : `Keep playing (${s.cur} so far). Keep playing: ${chance(wait)}. Locked: ${chance(lock)}.${why} Next: ${day}.`;
    });
    mine.calls = mine.rows.filter(r => r.call === 'lock');
    for (const r of mine.rows) if (r.call === 'plan' && r.bar) r.text += ' That’s the points bar; after the game the coach makes the final call with the matchup in mind.';
  }

  // Bench players worth starting: future games only, swapped for an unlocked starter
  // whose spot he fits. Worth = what his games are worth with the Balanced bars.
  const swaps = [];
  const benchOk = mine.team.bench.filter(b => !OUT.test(b.injury ?? ''));
  const today = ctx.today;
  for (const b of benchOk) {
    const games = (slate[b.team] ?? []).filter(g => g.status !== 'complete' && g.date > today || (g.date === today && g.status === 'pre_game'));
    if (!games.length) continue;
    const perGame = b.perPlay || b.perGame || b.fpg || b.fpgLast || 0;
    if (!perGame) continue;
    const state = { mu: perGame * LOCK_CAL, sd: Math.max(1, perGame * LOCK_CAL * LOCK_SPREAD), cur: null, k: games.length };
    const worth = barsOf(state)[games.length];
    mine.rows.forEach((r, i) => {
      if (r.empty || ['locked', 'live'].includes(r.call) || !fits(r.slot, b.elig)) return;
      const s = r.state;
      const keep = s.fixed != null ? s.fixed : Math.max(s.cur ?? 0, barsOf(s)[s.k] ?? 0);
      if (worth - keep >= 3) swaps.push({ b, r, i, state, games, worth: r1(worth), keep: r1(keep), gain: r1(worth - keep) });
    });
  }
  // Best swaps first, each bench player and each starter used once.
  const used = new Set();
  const picked = [];
  for (const s of swaps.sort((x, y) => y.gain - x.gain)) {
    if (used.has(s.b.pid) || used.has(s.r.pid ?? `slot${s.i}`)) continue;
    used.add(s.b.pid);
    used.add(s.r.pid ?? `slot${s.i}`);
    s.after = winChance(swapTeam(s.i, s.state), me, opp, medianOn);
    picked.push(s);
    if (picked.length === 3) break;
  }
  return { ...mine, opp, oppCoach: opp ? all[opp] : null, now, swaps: picked, medianOn };
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
