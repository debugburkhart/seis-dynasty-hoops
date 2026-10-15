// Dynasty values (commish office → My GM: Dynasty and Managers tabs, later the Trade
// finder). One 0-100 score per player and rookie pick for what he's worth over the next
// 3 seasons, this one counting most. Live Sleeper data in the browser.

import { get, pickLedger, loadTradedPicks } from './commish.js';
import { draftGrades, projectedOrder } from './draft.js';
import { standingsBefore } from './hype.js';

// The owner chose 50% this season, 30% next, 20% the one after.
export const SEASON_WEIGHTS = [0.5, 0.3, 0.2];
// Other timelines, for the Trade finder: how a win-now team and a building team see value.
export const VIEWS = { std: SEASON_WEIGHTS, now: [0.7, 0.2, 0.1], later: [0.2, 0.3, 0.5] };

// How a player's fantasy points per game change from one season to the next, by his
// age at the start of the first one. Fitted on every NBA player with 30+ games in
// back-to-back seasons, 2015-16 to 2025-26 (3,017 pairs, this league's scoring,
// weighted by games, centered so the average player stays flat), then smoothed.
// Checked on 2019-2023: predicts the next season (and the one after) a little better
// than assuming no change (3.56 vs 3.70 points per game off; 2 years: 4.73 vs 4.93).
export const AGE_CURVE = { 19: 1.17, 20: 1.14, 21: 1.13, 22: 1.09, 23: 1.04, 24: 1.02, 25: 1.01, 26: 0.98, 27: 0.96, 28: 0.95, 29: 0.94, 30: 0.92, 31: 0.90, 32: 0.88, 33: 0.86, 34: 0.85 };
export const ageMult = age => AGE_CURVE[Math.min(34, Math.max(19, age ?? 26))];
// A player listed Out counts half for this season (Sleeper doesn't say for how long).
const OUT_THIS_SEASON = 0.5;
// Picks: what a rookie at that draft spot usually produces (the Draft Grades curve, with its
// spread, so a pick keeps its chance of becoming a star), for the share of rookie picks who
// become real players (20+ games in a season), valued like a 20-year-old; 10% off for each
// year until the draft.
const PICK_AGE = 20;
const PICK_YEARLY_DISCOUNT = 0.9;
// The score: 0 = a player you could pick up off waivers (the 5th-best free agent),
// 100 = the league's most valuable player. Each player's value carries an uncertainty
// (about what the age curve misses over 2 years: 4 points per game, 6 for players 22 and
// under), so a young player just under waiver level keeps some value for his upside.
const REPLACEMENT_RANK = 5;
const UNCERTAINTY = 4;
const UNCERTAINTY_YOUNG = 6;
const phi = z => 0.3989423 * Math.exp(-z * z / 2);
function Phi(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const p = phi(z) * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}
// Average of max(0, X) when X is a bell curve with middle m and spread s.
const abovePart = (m, s) => (s > 0 ? m * Phi(m / s) + s * phi(m / s) : Math.max(0, m));

// Prospect grade (players 24 and under): his chance, 3 seasons from now, of being a weekly
// starter here (a top-72 player in points per game, 20+ games) and a star (top 24).
// x = his points per game carried 3 seasons forward on the age curve, divided by last
// season's starter line. Fitted (logistic) on 1,777 NBA players aged 24 and under with
// 20+ games, 2012-2022 (out of the NBA 3 years later = not a starter). Trained on
// 2012-2018 and checked on 2019-2022: predicted ~21% -> 15% became starters, ~59% -> 67%,
// ~83% -> 86%; star ~40% -> 50%, ~58% -> 65%. Rotation player (top 120, about bench level
// here), same way: ~31% -> 30%, ~70% -> 70%, ~90% -> 90%.
export const PROSPECT_MAX_AGE = 24;
const STARTER_FIT = [-5.639, 4.653, -0.003]; // intercept, x, (age - 21)
const STAR_FIT = [-8.642, 5.399, 0.139];
const ROTATION_FIT = [-4.468, 4.41, 0.027];
const GRADES = [ // [grade, test(starter, star, rotation)]: first match wins
  ['A+', (st, sr) => sr >= 0.5], ['A', (st, sr) => sr >= 0.3 || st >= 0.85], ['A-', st => st >= 0.7],
  ['B+', st => st >= 0.55], ['B', st => st >= 0.4], ['B-', st => st >= 0.25],
  ['C+', (st, sr, ro) => st >= 0.15 || ro >= 0.6], ['C', (st, sr, ro) => ro >= 0.4], ['C-', (st, sr, ro) => ro >= 0.25],
  ['D', (st, sr, ro) => ro >= 0.12], ['F', () => true],
];
// Veterans (25+), same three chances (Roster by dynasty score shows them for everyone):
// fitted the same way on 2,453 NBA player-seasons aged 25+ with 20+ games, 2013-2022
// (Sleeper has no 2012 stats), plus a late-career term max(0, age - 33) (lightly
// regularized), without which players 36+ came out about 2x too high. On 2019-2022 held
// out it beat the young-player fit on all three (log loss rotation .238 vs .263, starter
// .151 vs .180, star .077 vs .085); by age group (25-28 ... 36+) predicted vs real stays
// within ~1-2 points. Constants refitted on all of 2013-2022: [intercept, x, age - 21, max(0, age - 33)].
const VET_ROTATION_FIT = [-7.135, 7.311, 0.062, -0.29];
const VET_STARTER_FIT = [-11.799, 9.538, 0.261, -0.398];
const VET_STAR_FIT = [-15.307, 10.004, 0.374, -0.215];
const vetChance = (w, x, age) => 1 / (1 + Math.exp(-(w[0] + w[1] * x + w[2] * (age - 21) + w[3] * Math.max(0, age - 33))));
const logistic = (w, x, age) => 1 / (1 + Math.exp(-(w[0] + w[1] * x + w[2] * (age - 21))));

const r1 = n => Math.round(n * 10) / 10;
const fantasy = (stats, scoring) => Object.entries(scoring).reduce((sum, [k, v]) => sum + (Number(stats?.[k]) || 0) * v, 0);
const ageOn = (birth, season) => (birth ? Math.floor((new Date(`${season}-10-15`) - new Date(birth)) / (365.25 * 864e5)) : null);

// This season's projection, smoothed (owner, Oct 2026): Sleeper refreshes season projections
// every morning, and one refresh once moved Rui Hachimura from waiver level to 21 overnight.
// Each day the value moves PROJ_SMOOTH of the way to the new projection (about half in
// 2.5 days, 90% in 8). The nightly job saves the smoothed values (data/dynasty-proj.json,
// { states: [{ date, pg: { pid: perGame } }] }, the last 3 nights); pages take the newest
// saved night BEFORE today and step once, so the page and the nightly agree on the same day.
// OFF since Oct 14 2026 (owner): Rui's jump was a real role change, so smoothing only delays real
// news. 1 = use Sleeper's projection as is; the nightly still saves the states, so setting it back
// to 0.25 turns smoothing on again.
export const PROJ_SMOOTH = 1;
export const chicagoDate = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(d);
export function smoothProjections(raw, states, today) {
  const prev = (states ?? []).filter(s => s.date < today).sort((a, b) => (a.date < b.date ? -1 : 1)).at(-1);
  if (!prev) return { ...raw };
  const days = Math.max(1, Math.round((new Date(`${today}T12:00:00Z`) - new Date(`${prev.date}T12:00:00Z`)) / 864e5));
  const a = 1 - (1 - PROJ_SMOOTH) ** days;
  return Object.fromEntries(Object.entries(raw).map(([pid, x]) => {
    const old = prev.pg[pid];
    return [pid, old == null ? x : old + a * (x - old)];
  }));
}

// Everything the model needs, fetched once (Sleeper responses are cached 2 minutes).
// projStates: the saved smoothing states (see above); without them, raw projections.
export async function loadDynasty(DATA, { projStates = null } = {}) {
  const cur = DATA.seasons.at(-1);
  const season = cur.season;
  const prev = n => String(Number(season) - n);
  const [league, rosters, proj, last, prev2, prev3, traded] = await Promise.all([
    get(`/v1/league/${cur.leagueId}`, {}),
    get(`/v1/league/${cur.leagueId}/rosters`, []),
    get(`/projections/nba/${season}?season_type=regular`, []),
    get(`/v1/stats/nba/regular/${prev(1)}`, {}),
    get(`/v1/stats/nba/regular/${prev(2)}`, {}),
    get(`/v1/stats/nba/regular/${prev(3)}`, {}),
    loadTradedPicks(DATA),
  ]);
  // Birth dates: saved nightly (DATA.birth); before the first nightly run with them,
  // Sleeper's full player list (2.5 MB) instead.
  let birth = DATA.birth;
  if (!birth || !Object.keys(birth).length) {
    const all = await get('/v1/players/nba', {});
    birth = Object.fromEntries(Object.entries(all ?? {}).filter(([, p]) => p?.birth_date).map(([pid, p]) => [pid, p.birth_date]));
  }
  return { season, league, rosters, proj, last, prior: [last, prev2, prev3], traded, birth, projStates };
}

// Values for every player with a projection or on a roster, every future rookie pick,
// and each team's outlook.
// opts.fullInjured: count players listed Out at full value (the commish's toggle).
export function dynastyValues(DATA, f, { fullInjured = false } = {}) {
  const scoring = f.league?.scoring_settings ?? {};
  const season = f.season;
  const ownerOf = {};
  const where = {};
  for (const r of f.rosters ?? []) {
    for (const pid of r.players ?? []) { ownerOf[pid] = r.owner_id; where[pid] = 'active'; }
    for (const pid of r.reserve ?? []) where[pid] = 'ir';
    for (const pid of r.taxi ?? []) where[pid] = 'taxi';
  }
  const info = {};
  const projPg = {};
  for (const x of f.proj ?? []) {
    if (!/^\d+$/.test(x.player_id)) continue;
    if (x.player) info[x.player_id] = { ...x.player, team: x.team ?? x.player.team };
    const fp = fantasy(x.stats, scoring) / (x.stats?.gp || 1);
    if (!f.projPg && fp > 0) projPg[x.player_id] = fp;
  }
  // Past weeks (backfill): per-game projections and who was out are given directly.
  if (f.projPg) Object.assign(projPg, f.projPg);
  // Today: smoothed against the saved nights (rawProj kept for the nightly save + the notes).
  const rawProj = { ...projPg };
  if (!f.projPg && f.projStates) Object.assign(projPg, smoothProjections(rawProj, f.projStates, f.today ?? chicagoDate()));
  const lastPg = pid => {
    const x = f.last?.[pid];
    return x?.gp >= 10 ? fantasy(x, scoring) / x.gp : null;
  };

  // Last season's starter line: the 72nd-best points per game (20+ games; team rows skipped).
  const starterLine = Object.entries(f.last ?? {}).filter(([pid, x]) => /^\d+$/.test(pid) && x?.gp >= 20)
    .map(([, x]) => fantasy(x, scoring) / x.gp).sort((a, b) => b - a)[71] || 27;

  const players = {};
  for (const pid of new Set([...Object.keys(projPg), ...Object.keys(ownerOf)])) {
    const i = info[pid];
    const base = projPg[pid] ?? lastPg(pid) ?? 0;
    const age = ageOn(f.birth?.[pid], season);
    const out = f.outSet ? f.outSet.has(pid) : /^out$/i.test(i?.injury_status ?? '');
    const v1 = base * (out && !fullInjured ? OUT_THIS_SEASON : 1);
    const v2 = base * ageMult(age);
    const v3 = v2 * ageMult(age == null ? null : age + 1);
    // NBA seasons played before this one (last 3), for the taxi clock.
    const nbaSeasons = f.prior.filter(p => (p?.[pid]?.gp ?? 0) > 0).length;
    players[pid] = {
      pid,
      name: i ? `${i.first_name} ${i.last_name}` : DATA.players?.[pid]?.n ?? `Player ${pid}`,
      pos: i?.position ?? DATA.players?.[pid]?.pos ?? '',
      fpos: i?.fantasy_positions ?? [], // every position Sleeper lets him fill (Dynasty roster filter)
      team: i?.team ?? DATA.players?.[pid]?.t ?? '',
      injury: i?.injury_status ?? null,
      age, out, nbaSeasons, outCut: out && !fullInjured,
      owner: ownerOf[pid] ?? null,
      where: where[pid] ?? null,
      source: projPg[pid] ? 'projection' : lastPg(pid) != null ? 'last season' : 'none',
      // Sleeper's projection today vs the smoothed one used (only when they differ by 0.5+).
      projRaw: rawProj[pid] != null && projPg[pid] != null && Math.abs(rawProj[pid] - projPg[pid]) >= 0.5 ? r1(rawProj[pid]) : null,
      projUsed: projPg[pid] != null ? r1(projPg[pid]) : null,
      v: [r1(v1), r1(v2), r1(v3)],
      raw: SEASON_WEIGHTS[0] * v1 + SEASON_WEIGHTS[1] * v2 + SEASON_WEIGHTS[2] * v3,
    };
    if (age != null && age <= PROSPECT_MAX_AGE && base > 0) {
      const in3 = base * ageMult(age) * ageMult(age + 1) * ageMult(age + 2);
      const x = in3 / starterLine;
      const starter = logistic(STARTER_FIT, x, age);
      const star = logistic(STAR_FIT, x, age);
      const rotation = logistic(ROTATION_FIT, x, age);
      players[pid].prospect = { starter, star, rotation, in3: r1(in3), grade: GRADES.find(([, test]) => test(starter, star, rotation))[0] };
      players[pid].chances = players[pid].prospect;
    } else if (age != null && base > 0) {
      const x = base * ageMult(age) * ageMult(age + 1) * ageMult(age + 2) / starterLine;
      // Fitted separately, so keep them in order: star <= starter <= rotation.
      const rotation = vetChance(VET_ROTATION_FIT, x, age);
      const starter = Math.min(rotation, vetChance(VET_STARTER_FIT, x, age));
      players[pid].chances = { rotation, starter, star: Math.min(starter, vetChance(VET_STAR_FIT, x, age)) };
    }
  }

  // Rookie picks.
  const grades = draftGrades(DATA);
  const curve = grades.curves.rookie;
  const rookies = grades.picks.filter(p => p.kind === 'rookie' && (p.value != null || p.limited));
  const hitRate = rookies.length ? rookies.filter(p => p.value != null).length / rookies.length : 0.6;
  const teams = DATA.seasons.at(-1).teams.length || 8;
  const ledger = pickLedger(DATA, f.traded);
  const nextDraft = ledger.seasons[0];
  const order = nextDraft ? projectedOrder(DATA, nextDraft, standingsBefore) : null;
  const slotOf = Object.fromEntries((order?.weeks ? order.rows : []).map(r => [r.owner, r.slot]));
  // 0-100 scale: waiver level to the top player.
  const free = Object.values(players).filter(p => !p.owner && p.team).sort((a, b) => b.raw - a.raw);
  const floor = free[REPLACEMENT_RANK - 1]?.raw ?? 0;
  const spread = p => (p.age != null && p.age <= 22 ? UNCERTAINTY_YOUNG : UNCERTAINTY);
  for (const p of Object.values(players)) p.worth = abovePart(p.raw - floor, spread(p));
  // 100 = the most valuable player at full health, so one star listed Out doesn't move everyone.
  const healthy = p => (p.outCut ? abovePart(SEASON_WEIGHTS[0] * p.v[0] * 2 + SEASON_WEIGHTS[1] * p.v[1] + SEASON_WEIGHTS[2] * p.v[2] - floor, spread(p)) : p.worth);
  const top = Math.max(...Object.values(players).map(healthy), 1);
  const score = worth => Math.max(0, Math.min(100, Math.round(100 * worth / top)));
  for (const p of Object.values(players)) p.score = score(p.worth);
  // The same value on other timelines (Trade finder): win-now teams and building teams weigh
  // the three seasons differently. Same 0-100 units, not capped.
  const viewOf = (v, s) => Object.fromEntries(Object.entries(VIEWS).map(([id, w]) =>
    [id, 100 * abovePart(w[0] * v[0] + w[1] * v[1] + w[2] * v[2] - floor, s) / top]));
  for (const p of Object.values(players)) p.view = viewOf(p.v, spread(p));

  // A pick at overall spot `no`: his 3-season value is k x his points per game.
  const kOf = w => w[0] + w[1] * ageMult(PICK_AGE) + w[2] * ageMult(PICK_AGE) * ageMult(PICK_AGE + 1);
  const pickWorth = (no, w = SEASON_WEIGHTS) => (curve ? hitRate * abovePart(kOf(w) * curve.expect(no) - floor, kOf(w) * curve.sd) : 0);
  const picks = ledger.picks.map(p => {
    const away = Math.max(1, Number(p.season) - Number(season));
    const slot = p.season === nextDraft ? slotOf[p.orig] ?? null : null;
    // Known slot: that pick. Unknown: the average pick of the round.
    const spots = (slot ? [slot] : Array.from({ length: teams }, (_, i) => i + 1)).map(s => (p.round - 1) * teams + s);
    const avgWorth = w => spots.reduce((a, no) => a + pickWorth(no, w), 0) / spots.length * PICK_YEARLY_DISCOUNT ** away;
    const worth = avgWorth(SEASON_WEIGHTS);
    const v3 = curve ? hitRate * spots.reduce((a, no) => a + curve.expect(no), 0) / spots.length * ageMult(PICK_AGE) * ageMult(PICK_AGE + 1) : 0;
    return {
      ...p, slot, worth, score: score(worth), v3: r1(v3),
      view: Object.fromEntries(Object.entries(VIEWS).map(([id, w]) => [id, 100 * avgWorth(w) / top])),
      label: `${p.season} ${['1st', '2nd', '3rd'][p.round - 1] ?? `${p.round}th`}${slot ? ` (No. ${slot}, projected)` : ''}`,
    };
  });

  const outlook = teamOutlook(players, picks, f.rosters, season);
  return { players, picks, outlook, floor: r1(floor), top: r1(top), hitRate, nextDraft, orderKnown: Boolean(order?.weeks), starterLine: r1(starterLine), projPg, projRaw: rawProj };
}

// Taxi clock for one player: the league lets a player stay on taxi through his 3rd NBA season.
// Seasons he can stay on taxi after this one: 0 = this is his last, below 0 = past the limit.
export const taxiLeft = (p, limit = 3) => limit - 1 - p.nbaSeasons;

// ---------- Score history ----------

// One night's entry for data/dynasty-history.json: players on a roster or with a score above
// 0; a player listed Out is saved as [discounted score, full-value score].
export function historyDay(cut, full) {
  const day = {};
  for (const p of Object.values(cut.players)) {
    if (!p.owner && !(p.score > 0)) continue;
    day[p.pid] = p.out ? [p.score, full.players[p.pid]?.score ?? p.score] : p.score;
  }
  return day;
}

// Rebuild a finished season's scores week by week (regular season), dated the last day of each
// week. Sleeper doesn't keep old season-long projections, so "this season" is that week's
// per-game projection (games it projects above 0). A player with none that week (almost always
// hurt) keeps his last known number and is treated like a player listed Out. Rosters come from
// that week's lineups (they list every rostered player). Returns { date: day }.
// SMOOTH: how much each new week moves the running projection (the rest is the weeks before).
export const BACKFILL_SMOOTH = 0.3;
// onWeek(date, cut, full, rosters): optional, called with each rebuilt week (team snapshots).
export async function backfillSeason(DATA, season, smooth = BACKFILL_SMOOTH, onWeek = null) {
  const s = DATA.seasons.find(x => x.season === season);
  if (!s) return {};
  const prev = n => String(Number(season) - n);
  const [league, rosters, schedule, last, prev2, prev3] = await Promise.all([
    get(`/v1/league/${s.leagueId}`, {}),
    get(`/v1/league/${s.leagueId}/rosters`, []),
    get(`/schedule/nba/regular/${season}`, []),
    get(`/v1/stats/nba/regular/${prev(1)}`, {}),
    get(`/v1/stats/nba/regular/${prev(2)}`, {}),
    get(`/v1/stats/nba/regular/${prev(3)}`, {}),
  ]);
  let birth = DATA.birth;
  if (!birth || !Object.keys(birth).length) {
    const all = await get('/v1/players/nba', {});
    birth = Object.fromEntries(Object.entries(all ?? {}).filter(([, p]) => p?.birth_date).map(([pid, p]) => [pid, p.birth_date]));
  }
  const scoring = league.scoring_settings ?? {};
  const ownerOf = Object.fromEntries((rosters ?? []).map(r => [r.roster_id, r.owner_id]));
  const endOf = {};
  for (const g of schedule ?? []) if (!endOf[g.week] || g.date > endOf[g.week]) endOf[g.week] = g.date;
  const lastRegular = (s.playoffStart ?? 22) - 1;
  const known = {};
  const out = {};
  for (let w = 1; w <= lastRegular; w++) {
    const [proj, matchups] = await Promise.all([
      get(`/projections/nba/${season}/${w}?season_type=regular`, []),
      get(`/v1/league/${s.leagueId}/matchups/${w}`, []),
    ]);
    if (!endOf[w] || !(matchups ?? []).length) continue;
    const sum = {};
    for (const x of proj ?? []) {
      if (!/^\d+$/.test(x.player_id)) continue;
      const fp = fantasy(x.stats, scoring);
      if (fp <= 0) continue;
      const a = (sum[x.player_id] ??= { t: 0, n: 0 });
      a.t += fp; a.n++;
    }
    const projPg = {};
    // Running blend of the weekly per-game projections, like a season-long projection.
    for (const [pid, a] of Object.entries(sum)) { const x = a.t / a.n; projPg[pid] = known[pid] = known[pid] == null ? x : known[pid] + smooth * (x - known[pid]); }
    const weekRosters = (matchups ?? []).map(m => ({ owner_id: ownerOf[m.roster_id], players: m.players ?? [] })).filter(r => r.owner_id);
    const outSet = new Set();
    for (const r of weekRosters) for (const pid of r.players) if (projPg[pid] == null && known[pid] != null) { projPg[pid] = known[pid]; outSet.add(pid); }
    const f = { season, league, rosters: weekRosters, proj: proj ?? [], projPg, outSet, last, prior: [last, prev2, prev3], traded: [], birth };
    const cut = dynastyValues(DATA, f), full = dynastyValues(DATA, f, { fullInjured: true });
    out[endOf[w]] = historyDay(cut, full);
    onWeek?.(endOf[w], cut, full, weekRosters);
  }
  return out;
}

// Team outlook: "now" = the best 9 this season (taxi can't play), "in 2 years" = the best 9 two
// seasons from now from everyone on the roster plus the next two drafts' picks; ranks, the
// win-now / build-later lean and a label. Shared by the Dynasty tab and the trade evaluator.
export function teamOutlook(players, picks, rosters, season) {
  const outlook = {};
  for (const r of rosters ?? []) {
    const mine = [...new Set([...(r.players ?? []), ...(r.taxi ?? []), ...(r.reserve ?? [])])].map(pid => players[pid]).filter(Boolean);
    const now = mine.filter(p => p.where !== 'taxi').map(p => p.v[0]).sort((a, b) => b - a).slice(0, 9).reduce((a, b) => a + b, 0);
    const myPicks = picks.filter(p => p.owner === r.owner_id && Number(p.season) <= Number(season) + 2);
    const later = [...mine.map(p => p.v[2]), ...myPicks.map(p => p.v3)].sort((a, b) => b - a).slice(0, 9).reduce((a, b) => a + b, 0);
    const weightedAge = mine.filter(p => p.age != null && p.score > 0);
    outlook[r.owner_id] = {
      owner: r.owner_id,
      now: r1(now), later: r1(later),
      total: mine.reduce((a, p) => a + p.score, 0) + myPicks.reduce((a, p) => a + p.score, 0),
      age: weightedAge.length ? r1(weightedAge.reduce((a, p) => a + p.age * p.score, 0) / weightedAge.reduce((a, p) => a + p.score, 0)) : null,
      taxi: (r.taxi ?? []).length,
      size: mine.length,
    };
  }
  const list = Object.values(outlook);
  const rank = key => [...list].sort((a, b) => b[key] - a[key]).forEach((t, i) => { t[`${key}Rank`] = i + 1; });
  rank('now'); rank('later'); rank('total');
  const avg = key => list.reduce((a, t) => a + t[key], 0) / (list.length || 1);
  const [avgNow, avgLater] = [avg('now'), avg('later')];
  for (const t of list) {
    // Meter: -1 = all-in on now, +1 = built for later.
    t.lean = Math.max(-1, Math.min(1, (t.later / avgLater - t.now / avgNow) * 5));
    t.label = t.nowRank <= 3 && t.laterRank <= 3 ? 'Contender' : t.nowRank <= 3 ? 'Win now' : t.laterRank <= t.nowRank - 2 ? 'Rising' : t.laterRank >= t.nowRank + 2 ? 'Fading' : t.nowRank >= 6 ? 'Rebuilding' : 'Middle of the pack';
  }
  return outlook;
}
