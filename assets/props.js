// Weekly Props (owner, Oct 2026): 10 props a week, lines set by the site from the same week
// simulation as the Lock-in coach (gm.js weekTotals: every team planned like an opponent), picked
// by the 8 managers (Google sign-in, Firestore: see app.js renderProps + firestore.rules). One point
// per correct pick, a push counts nothing, bragging rights only. Picks lock at the week's first
// tip-off; until then lines are redone every night and each pick keeps the line it was made at.
// No DOM or Node APIs: runs in the nightly job (update.mjs) and in the browser (grading).
//
// The 10: a spread on every game (4), the combined score of the top 2 hype games (2), one star's
// locked points in each of those games (2), top-scoring team, highest-scoring game.
//
// data/props.json { version, at, seasons: { season: { weeks: { week: {
//   week, firstDate, lockAt (ISO), built (first build), at (last build), builds,
//   props: [{ id, kind, ... , m (the site's pick at the last build) }], replaced: [{ id, why }]
// } } } } }
// Kinds: spread { a, b, fav, line, p (chance fav covers) } · total { a, b, line, p (over) } ·
// player { pid, name, owner, nba, games, line, p (over) } · top { odds: { owner: p } } ·
// game { odds: [{ a, b, p }] }. Pick options: spread = an owner id, total/player = 'over'|'under',
// top = an owner id, game = 'a-b' (the game's owner ids).

import { get, loadWeek } from './commish.js';
import { loadSlate, lockedDraws, weekTotals } from './gm.js';
import { pairsFor, rewind } from './coachlog.js';
import { hypeSlate } from './hype.js';

export const PROPS_VERSION = 1;
export const PROPS_PER_WEEK = 10;
const RUNS = 4000;
const r1 = n => Math.round(n * 10) / 10;
const r3 = n => Math.round(n * 1000) / 1000;
const half = x => Math.floor(x) + 0.5; // lines end in .5
const median = sorted => sorted[Math.floor(sorted.length / 2)];
const ctToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date());
const ESPN_TEAM = { GS: 'GSW', NO: 'NOP', NY: 'NYK', SA: 'SAS', UTAH: 'UTA', WSH: 'WAS' };
export const gameKey = (a, b) => `${a}-${b}`;

// The first tip-off on a date (ESPN's public scoreboard, as on the Lock-in coach). Without it,
// 11 AM Central that day (early, so a pick can't sneak in after a game starts).
async function firstTip(date) {
  try {
    const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${date.replace(/-/g, '')}`);
    if (res.ok) {
      const times = ((await res.json())?.events ?? []).map(e => e.date).filter(Boolean).map(d => new Date(d).getTime()).filter(Number.isFinite);
      if (times.length) return new Date(Math.min(...times)).toISOString();
    }
  } catch { /* fall back */ }
  return new Date(`${date}T16:00:00Z`).toISOString();
}

// The week props are open for: the first regular-season week whose first game is today or later.
export function openWeek(schedule, today, lastRegular) {
  const first = {};
  for (const g of schedule ?? []) if (g.week && g.date && (!first[g.week] || g.date < first[g.week])) first[g.week] = g.date;
  const weeks = Object.keys(first).map(Number).filter(w => w <= lastRegular && first[w] >= today).sort((a, b) => a - b);
  return weeks.length ? { week: weeks[0], firstDate: first[weeks[0]] } : null;
}

// One week's props from the simulation. keep = last night's props (same subjects, new numbers).
export function buildWeekProps(DATA, season, week, sim, pairs, keep = null) {
  const { totals, plans } = sim;
  const owners = Object.keys(totals);
  if (pairs.length < 4 || owners.length < 8) return null;
  const n = totals[owners[0]].length;
  const diffs = (a, b) => Float64Array.from({ length: n }, (_, i) => totals[a][i] - totals[b][i]).sort();
  const sums = (a, b) => Float64Array.from({ length: n }, (_, i) => totals[a][i] + totals[b][i]).sort();
  const share = (arr, f) => arr.reduce((t, x) => t + (f(x) ? 1 : 0), 0) / arr.length;

  // Hype order: the Main event first (same as the Hype page), for the totals and player props.
  let order = pairs;
  try {
    const slate = hypeSlate(DATA, season, week, pairs);
    order = slate.games.map(g => pairs.find(p => p.a === g.a && p.b === g.b)).filter(Boolean);
  } catch { /* schedule order */ }

  const spread = ({ a, b }) => {
    const d = diffs(a, b);
    const m = median(d);
    const fav = m >= 0 ? a : b;
    const dog = fav === a ? b : a;
    const fd = fav === a ? d : d.map(x => -x).sort();
    const line = half(Math.abs(m));
    const p = share(fd, x => x > line);
    return { id: `s:${a}:${b}`, kind: 'spread', a, b, fav, line, p: r3(p), m: p >= 0.5 ? fav : dog };
  };
  const total = ({ a, b }) => {
    const s = sums(a, b);
    const line = half(median(s));
    const p = share(s, x => x > line);
    return { id: `t:${a}:${b}`, kind: 'total', a, b, line, p: r3(p), m: p >= 0.5 ? 'over' : 'under' };
  };
  // The star of a game: the planned starter with the highest median locked score.
  const playerFor = (pair, pid = null) => {
    let best = null;
    for (const o of [pair.a, pair.b]) {
      const plan = plans[o];
      plan.pieces.forEach((q, pi) => {
        if (pid ? q.pid !== pid : plan.now.slotOf[pi] < 0 || q.fixed != null || !q.games.length) return;
        const draws = lockedDraws(plan, pi, RUNS, 5 + pi);
        const med = median(draws);
        if (!best || med > best.med) best = { o, q, draws, med };
      });
    }
    if (!best || !best.q.games.length || best.med <= 0) return null;
    const line = half(best.med);
    const p = share(best.draws, x => x > line);
    return { id: `p:${best.q.pid}`, kind: 'player', pid: best.q.pid, name: best.q.name, owner: best.o, nba: best.q.row?.team ?? '', games: best.q.games.length, line, p: r3(p), m: p >= 0.5 ? 'over' : 'under' };
  };
  const top = () => {
    const wins = Object.fromEntries(owners.map(o => [o, 0]));
    for (let i = 0; i < n; i++) {
      let w = owners[0];
      for (const o of owners) if (totals[o][i] > totals[w][i]) w = o;
      wins[w]++;
    }
    const odds = Object.fromEntries(owners.map(o => [o, r3(wins[o] / n)]));
    return { id: 'top', kind: 'top', odds, m: owners.reduce((x, o) => (odds[o] > odds[x] ? o : x), owners[0]) };
  };
  const game = () => {
    const wins = pairs.map(() => 0);
    for (let i = 0; i < n; i++) {
      let w = 0;
      pairs.forEach((p, k) => { if (totals[p.a][i] + totals[p.b][i] > totals[pairs[w].a][i] + totals[pairs[w].b][i]) w = k; });
      wins[w]++;
    }
    const odds = pairs.map((p, k) => ({ a: p.a, b: p.b, p: r3(wins[k] / n) }));
    const m = odds.reduce((x, g) => (g.p > x.p ? g : x), odds[0]);
    return { id: 'game', kind: 'game', odds, m: gameKey(m.a, m.b) };
  };

  // Same subjects as last night (picks are saved by id); a player prop is replaced only when
  // he has no games he's expected to play any more (ruled out, or benched for the week).
  const replaced = [...(keep?.replaced ?? [])];
  const keepIds = keep?.props?.map(p => p.id) ?? [];
  let totalPairs = keepIds.filter(id => id.startsWith('t:')).map(id => pairs.find(p => `t:${p.a}:${p.b}` === id)).filter(Boolean);
  if (totalPairs.length < 2) totalPairs = order.slice(0, 2);
  const players = [];
  for (const pair of totalPairs) {
    const old = keep?.props?.find(p => p.kind === 'player' && (p.owner === pair.a || p.owner === pair.b));
    let p = old ? playerFor(pair, old.pid) : null;
    if (old && !p) replaced.push({ id: old.id, why: `${old.name} isn’t expected to play this week` });
    p ??= playerFor(pair);
    if (p && !players.some(x => x.pid === p.pid)) players.push(p);
  }
  const props = [...pairs.map(spread), ...totalPairs.map(total), ...players, top(), game()];
  return { week, props, replaced };
}

// The nightly run: builds (or rebuilds) the open week's props. A week is never changed once
// its first game has tipped (lockAt).
export async function updateProps(DATA, prev, { today = ctToday(), log = () => {} } = {}) {
  const out = prev?.version === PROPS_VERSION ? prev : { version: PROPS_VERSION, seasons: {} };
  const cur = DATA.seasons.at(-1);
  if (cur.status === 'complete') return out;
  const lastRegular = (cur.playoffStart ?? 99) - 1;
  const schedule = await get(`/schedule/nba/regular/${cur.season}`, []);
  const open = openWeek(schedule, today, lastRegular);
  if (!open) { log('Props: no regular-season week left to open.'); return out; }
  const S = (out.seasons[cur.season] ??= { weeks: {} });
  const old = S.weeks[open.week];
  if (old && Date.now() >= Date.parse(old.lockAt)) { log(`Props: week ${open.week} is locked; kept.`); return out; }
  const ctx = await loadWeek(DATA, cur.season, open.week);
  const slate = await loadSlate(cur.season, open.week);
  if (!ctx.rosters?.length || !Object.keys(slate).length) { log(`Props: week ${open.week} has no rosters or games yet.`); return out; }
  // The week as it stands before its first game (same rewind as the coach log).
  const at = rewind(ctx, {}, slate, open.firstDate);
  const pairs = pairsFor(DATA, cur.season, open.week, ctx.matchups).filter(p => !p.t || p.t === 'R');
  const built = buildWeekProps(DATA, cur.season, open.week, weekTotals(DATA, at.ctx, at.boxes, at.slate, RUNS), pairs, old);
  if (!built) { log(`Props: week ${open.week} needs 4 games and 8 teams.`); return out; }
  const lockAt = await firstTip(open.firstDate);
  if (Date.now() >= Date.parse(lockAt)) { log(`Props: week ${open.week} already tipped off; not opened.`); return out; }
  const now = new Date().toISOString();
  S.weeks[open.week] = {
    week: open.week, firstDate: open.firstDate, lockAt,
    built: old?.built ?? now, at: now, builds: (old?.builds ?? 0) + 1, props: built.props, replaced: built.replaced,
  };
  out.at = now;
  log(`Props: week ${open.week}, ${built.props.length} props (build ${S.weeks[open.week].builds}), lock ${S.weeks[open.week].lockAt}.`);
  return out;
}

// ---------- Results ----------

// What happened in a finished week: team scores (regular-season games) and locked points.
export function weekResults(DATA, season, week) {
  const games = DATA.games.filter(g => g.s === season && g.w === week && g.t === 'R');
  if (!games.length) return null;
  const score = {};
  for (const g of games) { score[g.a] = g.ap; score[g.b] = g.bp; }
  const locked = {};
  for (const x of DATA.playerWeeks ?? []) if (x.s === season && x.w === week) locked[x.pid] = (locked[x.pid] ?? 0) + x.p;
  return { score, games, locked };
}

// A prop's outcome: { win: [options that won], push, void, text }; null before the week is final.
export function settle(prop, res) {
  if (!res) return null;
  const sc = res.score;
  if (prop.kind === 'spread') {
    const dog = prop.fav === prop.a ? prop.b : prop.a;
    const margin = r1(sc[prop.fav] - sc[dog]);
    return { margin, value: margin, line: prop.line, judge: line => (margin > line ? [prop.fav] : margin < line ? [dog] : []) };
  }
  if (prop.kind === 'total') {
    const t = r1(sc[prop.a] + sc[prop.b]);
    return { value: t, judge: line => (t > line ? ['over'] : t < line ? ['under'] : []) };
  }
  if (prop.kind === 'player') {
    const p = res.locked[prop.pid];
    if (p == null) return { void: true, judge: () => [] };
    return { value: r1(p), judge: line => (p > line ? ['over'] : p < line ? ['under'] : []) };
  }
  if (prop.kind === 'top') {
    const hi = Math.max(...Object.values(sc));
    const win = Object.keys(sc).filter(o => sc[o] === hi);
    return { value: hi, win, judge: () => win };
  }
  if (prop.kind === 'game') {
    const t = prop.odds.map(g => ({ k: gameKey(g.a, g.b), v: r1(sc[g.a] + sc[g.b]) }));
    const hi = Math.max(...t.map(x => x.v));
    const win = t.filter(x => x.v === hi).map(x => x.k);
    return { value: hi, win, judge: () => win };
  }
  return null;
}

// One pick ({ o: option, l: line it was made at }) -> 'win' | 'loss' | 'push' | 'void' | null.
export function gradePick(prop, outcome, pick) {
  if (!outcome || !pick?.o) return null;
  if (outcome.void) return 'void';
  const win = outcome.judge(pick.l ?? prop.line);
  if (!win.length) return 'push';
  return win.includes(pick.o) ? 'win' : 'loss';
}

// Season leaderboard. entries = { week: { owner: { picks, t } } } (only picks made before the
// lock); the site's own picks play as 'model'. Rows: { who, w, l, p, weeks (weekly wins), byWeek }.
export function leaderboard(DATA, season, file, entries) {
  const weeks = file?.seasons?.[season]?.weeks ?? {};
  const rows = {};
  const row = who => (rows[who] ??= { who, w: 0, l: 0, p: 0, weeks: 0, byWeek: {} });
  for (const [wk, W] of Object.entries(weeks)) {
    const res = weekResults(DATA, season, Number(wk));
    if (!res) continue;
    const outcomes = Object.fromEntries(W.props.map(p => [p.id, settle(p, res)]));
    const players = { ...(entries[wk] ?? {}), model: { picks: Object.fromEntries(W.props.map(p => [p.id, { o: p.m, l: p.line }])) } };
    const scores = {};
    for (const [who, e] of Object.entries(players)) {
      let w = 0, l = 0, p = 0;
      for (const prop of W.props) {
        const g = gradePick(prop, outcomes[prop.id], e.picks?.[prop.id]);
        if (g === 'win') w++; else if (g === 'loss') l++; else if (g === 'push') p++;
      }
      if (!w && !l && !p) continue;
      const r = row(who);
      r.w += w; r.l += l; r.p += p;
      r.byWeek[wk] = w;
      scores[who] = w;
    }
    // Weekly winner(s): most correct among the managers (the site doesn't win weeks).
    const best = Math.max(0, ...Object.entries(scores).filter(([o]) => o !== 'model').map(([, v]) => v));
    if (best > 0) for (const [o, v] of Object.entries(scores)) if (o !== 'model' && v === best) row(o).weeks++;
  }
  return Object.values(rows).sort((x, y) => y.w - x.w || x.l - y.l || y.weeks - x.weeks);
}
