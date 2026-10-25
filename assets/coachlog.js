// Lock-in coach track record (owner, Oct 2026: "track every win % ... over each week. I want to be
// able to look at past weeks as they accumulate"). The nightly job runs the coach for all 8 teams
// as of that morning (before the day's games) and saves its odds to data/coach-log.json; the
// Lock-in coach page compares them with the real results in league.json. No DOM or Node APIs:
// runs in the job and in a browser (for testing).
//
// data/coach-log.json { version, at, seasons: { season: { weeks: { week: { days: { date: {
//   at, r (1 = rebuilt later, not saved that morning),
//   t: { owner: [win chance, beat-median chance, projected median, expected final, opponent's expected final] },
//   c: { owner: [[pid, name, score, game date, [later games' scores], counted score at the last run]] } (lock calls)
// } } } } } } }

import { get, loadWeek } from './commish.js';
import { gameCoach, loadBoxes, loadSlate } from './gm.js';
import { weekPairs } from './hype.js';

export const COACH_LOG_VERSION = 1;
const r1 = n => (n == null ? null : Math.round(n * 10) / 10);
const r3 = n => (n == null ? null : Math.round(n * 1000) / 1000);
const ctToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date());

// The week as it stood the morning of `date`, before that day's games: box scores and finished
// games before that day only, and Sleeper's counted scores rolled back. A lock on an earlier
// game is known by then only if his next game was before that day (a lock has to happen before
// the next game tips); otherwise his latest game before that day is what counted.
export function rewind(ctx, boxes, slate, date) {
  const boxesAt = {};
  for (const [pid, list] of Object.entries(boxes)) {
    const before = list.filter(b => b.date < date);
    if (before.length) boxesAt[pid] = before;
  }
  const slateAt = {};
  for (const [team, list] of Object.entries(slate)) slateAt[team] = list.map(g => ({ ...g, status: g.date < date ? 'complete' : 'pre_game' }));
  const games = {};
  for (const [team, list] of Object.entries(ctx.games)) games[team] = list.map(g => ({ ...g, done: g.date < date }));
  const matchups = (ctx.matchups ?? []).map(m => {
    const pp = {};
    for (const pid of new Set([...Object.keys(m.players_points ?? {}), ...(m.starters ?? [])])) {
      if (!pid || pid === '0') continue;
      const list = boxes[pid] ?? [];
      const c = m.players_points?.[pid];
      const latest = list.at(-1);
      const lockedOn = c != null && latest && Math.abs(latest.pts - c) >= 0.05 ? list.slice(0, -1).find(b => Math.abs(b.pts - c) < 0.05) : null;
      const next = lockedOn ? list.find(b => b.date > lockedOn.date) : null;
      const counted = lockedOn && next && next.date < date ? lockedOn.pts : boxesAt[pid]?.at(-1)?.pts;
      if (counted != null) pp[pid] = counted;
    }
    const points = r1((m.starters ?? []).reduce((t, pid) => t + (pp[pid] ?? 0), 0));
    return { ...m, players_points: pp, points, custom_points: null };
  });
  return {
    ctx: { ...ctx, today: date, games, matchups, live: Object.keys(boxesAt).length > 0 },
    boxes: boxesAt,
    slate: slateAt,
  };
}

// Pairs for a week: the saved schedule/results, else Sleeper's matchup ids.
export function pairsFor(DATA, season, week, matchups) {
  const pairs = weekPairs(DATA, season, week);
  if (pairs.length) return pairs;
  const owner = Object.fromEntries((DATA.seasons.find(s => s.season === season)?.teams ?? []).map(t => [t.rosterId, t.owner]));
  const by = {};
  for (const m of matchups ?? []) if (m.matchup_id) (by[m.matchup_id] ??= []).push(owner[m.roster_id]);
  return Object.values(by).filter(x => x.length === 2 && x.every(Boolean)).map(([a, b]) => ({ a, b }));
}

// One morning: every team's odds and lock calls (Balanced, the page's default; the odds are the
// same in every mode).
export function snapshotDay(DATA, week, date, today, medianOn) {
  const at = rewind(week.ctx, week.boxes, week.slate, date);
  const day = { at: new Date().toISOString(), r: date < today ? 1 : 0, t: {}, c: {} };
  for (const r of week.ctx.rosters ?? []) {
    const me = r.owner_id;
    if (!me) continue;
    const coach = gameCoach(DATA, at.ctx, at.boxes, at.slate, me, week.pairs, { mode: 'balanced', medianOn });
    if (!coach) continue;
    const n = coach.now;
    day.t[me] = [r3(n.h2h), r3(n.median), r1(n.medianScore), r1(n.avg[me]), coach.opp ? r1(n.avg[coach.opp]) : null];
    const calls = coach.rows.filter(x => x.call === 'lock' && x.score != null);
    if (calls.length) day.c[me] = calls.map(x => [x.pid, x.name, x.score, x.sched.filter(g => g.done && g.pts != null).at(-1)?.date ?? null, [], null]);
  }
  return day;
}

// Fills in what happened after each lock call (his later games this week) and the score Sleeper
// counts for him now (= the call was followed when it equals the call's score at the week's end).
function refreshCalls(days, week) {
  const counted = {};
  for (const m of week.ctx.matchups ?? []) {
    const owner = week.ctx.rosters.find(r => r.roster_id === m.roster_id)?.owner_id;
    if (owner) counted[owner] = m.players_points ?? {};
  }
  for (const d of Object.values(days)) {
    for (const [owner, calls] of Object.entries(d.c ?? {})) {
      for (const c of calls) {
        c[4] = (week.boxes[c[0]] ?? []).filter(b => c[3] && b.date > c[3]).map(b => b.pts);
        c[5] = counted[owner]?.[c[0]] ?? null;
      }
    }
  }
}

// The nightly run: saves this morning's snapshot for the week under way (and any morning of it
// that's missing, rebuilt: marked r = 1), and updates the lock calls of this week and last week.
export async function updateCoachLog(DATA, prev, { today = ctToday(), log = () => {} } = {}) {
  const cur = DATA.seasons.at(-1);
  const out = prev?.version === COACH_LOG_VERSION ? prev : { version: COACH_LOG_VERSION, seasons: {} };
  if (cur.status === 'complete') return out;
  const state = await get('/v1/state/nba', null);
  if (!state || state.league_season !== cur.season || !['regular', 'post'].includes(state.season_type)) {
    log('Coach log: no regular-season week under way.');
    return out;
  }
  const now = Math.max(state.week || 0, state.leg || 0);
  const S = (out.seasons[cur.season] ??= { weeks: {} });
  for (const wk of [now - 1, now]) {
    if (wk < 1 || (wk < now && !S.weeks[wk])) continue;
    const ctx = await loadWeek(DATA, cur.season, wk);
    const [boxes, slate] = await Promise.all([loadBoxes(cur.season, wk, ctx.scoring), loadSlate(cur.season, wk)]);
    if (!ctx.rosters?.length || !Object.keys(slate).length) continue;
    const week = { ctx, boxes, slate, pairs: pairsFor(DATA, cur.season, wk, ctx.matchups) };
    const medianOn = Boolean(cur.medianGame) && (!cur.playoffStart || wk < cur.playoffStart);
    const W = (S.weeks[wk] ??= { days: {} });
    const dates = [...new Set(Object.values(slate).flat().map(g => g.date))].sort().filter(d => d <= today);
    let added = 0;
    for (const d of dates) {
      if (W.days[d]) continue;
      W.days[d] = snapshotDay(DATA, week, d, today, medianOn);
      added++;
    }
    refreshCalls(W.days, week);
    log(`Coach log: week ${wk}, ${added} new morning${added === 1 ? '' : 's'} (${Object.keys(W.days).length} saved).`);
  }
  out.at = new Date().toISOString();
  return out;
}
