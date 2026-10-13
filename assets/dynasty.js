// Dynasty values (commish office → My GM: Dynasty and Managers tabs, later the Trade
// finder). One 0-100 score per player and rookie pick for what he's worth over the next
// 3 seasons, this one counting most. Live Sleeper data in the browser.

import { get, pickLedger, loadTradedPicks } from './commish.js';
import { draftGrades, projectedOrder } from './draft.js';
import { standingsBefore } from './hype.js';

// The owner chose 50% this season, 30% next, 20% the one after.
export const SEASON_WEIGHTS = [0.5, 0.3, 0.2];

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
const logistic = (w, x, age) => 1 / (1 + Math.exp(-(w[0] + w[1] * x + w[2] * (age - 21))));

const r1 = n => Math.round(n * 10) / 10;
const fantasy = (stats, scoring) => Object.entries(scoring).reduce((sum, [k, v]) => sum + (Number(stats?.[k]) || 0) * v, 0);
const ageOn = (birth, season) => (birth ? Math.floor((new Date(`${season}-10-15`) - new Date(birth)) / (365.25 * 864e5)) : null);

// Everything the model needs, fetched once (Sleeper responses are cached 2 minutes).
export async function loadDynasty(DATA) {
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
  return { season, league, rosters, proj, last, prior: [last, prev2, prev3], traded, birth };
}

// Values for every player with a projection or on a roster, every future rookie pick,
// and each team's outlook.
export function dynastyValues(DATA, f) {
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
    if (fp > 0) projPg[x.player_id] = fp;
  }
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
    const out = /^out$/i.test(i?.injury_status ?? '');
    const v1 = base * (out ? OUT_THIS_SEASON : 1);
    const v2 = base * ageMult(age);
    const v3 = v2 * ageMult(age == null ? null : age + 1);
    // NBA seasons played before this one (last 3), for the taxi clock.
    const nbaSeasons = f.prior.filter(p => (p?.[pid]?.gp ?? 0) > 0).length;
    players[pid] = {
      pid,
      name: i ? `${i.first_name} ${i.last_name}` : DATA.players?.[pid]?.n ?? `Player ${pid}`,
      pos: i?.position ?? DATA.players?.[pid]?.pos ?? '',
      team: i?.team ?? DATA.players?.[pid]?.t ?? '',
      injury: i?.injury_status ?? null,
      age, out, nbaSeasons,
      owner: ownerOf[pid] ?? null,
      where: where[pid] ?? null,
      source: projPg[pid] ? 'projection' : lastPg(pid) != null ? 'last season' : 'none',
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
  const top = Math.max(...Object.values(players).map(p => p.worth), 1);
  const score = worth => Math.max(0, Math.min(100, Math.round(100 * worth / top)));
  for (const p of Object.values(players)) p.score = score(p.worth);

  // A pick at overall spot `no`: his 3-season value is k x his points per game.
  const k = SEASON_WEIGHTS[0] + SEASON_WEIGHTS[1] * ageMult(PICK_AGE) + SEASON_WEIGHTS[2] * ageMult(PICK_AGE) * ageMult(PICK_AGE + 1);
  const pickWorth = no => (curve ? hitRate * abovePart(k * curve.expect(no) - floor, k * curve.sd) : 0);
  const picks = ledger.picks.map(p => {
    const away = Math.max(1, Number(p.season) - Number(season));
    const slot = p.season === nextDraft ? slotOf[p.orig] ?? null : null;
    // Known slot: that pick. Unknown: the average pick of the round.
    const spots = (slot ? [slot] : Array.from({ length: teams }, (_, i) => i + 1)).map(s => (p.round - 1) * teams + s);
    const worth = spots.reduce((a, no) => a + pickWorth(no), 0) / spots.length * PICK_YEARLY_DISCOUNT ** away;
    const v3 = curve ? hitRate * spots.reduce((a, no) => a + curve.expect(no), 0) / spots.length * ageMult(PICK_AGE) * ageMult(PICK_AGE + 1) : 0;
    return { ...p, slot, worth, score: score(worth), v3: r1(v3), label: `${p.season} ${['1st', '2nd', '3rd'][p.round - 1] ?? `${p.round}th`}${slot ? ` (No. ${slot}, projected)` : ''}` };
  });

  // Team outlook: "now" = the best 9 this season (taxi can't play), "in 2 years" = the best
  // 9 two seasons from now from everyone on the roster plus the next two drafts' picks.
  const outlook = {};
  for (const r of f.rosters ?? []) {
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
  return { players, picks, outlook, floor: r1(floor), top: r1(top), hitRate, nextDraft, orderKnown: Boolean(order?.weeks), starterLine: r1(starterLine) };
}

// Taxi clock for one player: the league lets a player stay on taxi through his 3rd NBA season.
// Seasons he can stay on taxi after this one: 0 = this is his last, below 0 = past the limit.
export const taxiLeft = (p, limit = 3) => limit - 1 - p.nbaSeasons;
