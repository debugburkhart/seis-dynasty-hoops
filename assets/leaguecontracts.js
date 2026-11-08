// League contracts (Contracts test feature, owner Nov 7 2026): the "Salary system v2" + "years pool" proposals turned
// into a working model. No DOM: the page is assets/contracts-ui.js. Rules and numbers come from the two reports
// (report-salary-nba.js: tiers, cap, dead money; report-yearspool.js: the 50-year pool and the 4-season limit).
//
// Owner's answers (Nov 7 2026): day-one contracts are signed for START_SEASON (2027-28, "next season"), so every price
// is the tier of his real 2027-28 salary, LOCKED for the whole league deal; any team can be set up or planned; it is a
// sandbox for now (synced settings: gm-ct-deals = contracts by player, gm-ct-plan-{owner}, gm-ct-guess), built so the
// contract list can later be published as the league's real one; "Suggest lengths" = age + FP/G (never dynasty score).

import { CAP_CUSHION, CAP_ROUND, CUT_SHARE, FREE_CUT, LEAGUE_ROOKIE_YEARS, MAX_YEARS, NBA_TIERS, NO_DEAL_TIER, ROOKIE_SEASONS, ROOKIE_TIER, nbaTier } from './report-salary-nba.js';
import { FOUR_YEAR_PER_SUMMER, POOL } from './report-yearspool.js';

export { CUT_SHARE, FREE_CUT, LEAGUE_ROOKIE_YEARS, MAX_YEARS, NBA_TIERS, NO_DEAL_TIER, ROOKIE_TIER, FOUR_YEAR_PER_SUMMER, POOL };

export const START_SEASON = 2027; // first season of the day-one contracts (2027-28)
export const GRID_SEASONS = 4; // the outlook grid: START_SEASON + 3
// Roster limit (owner, Nov 8 2026): 23 = Sleeper's 9 starters + 14 bench; IR counts (same choice as the Depth Chart's
// ROSTER_LIMIT), taxi doesn't (its own limit, TAXI_MAX 15 = commish.js TAXI_SIZE).
export const ROSTER_MAX = 23;
export const TAXI_MAX = 15;
// Suggest lengths (owner chose "Age + FP/G"): wanted length by age, only for players worth a long deal.
export const SUGGEST_AGE = [[24, 4], [27, 3], [30, 2]]; // age <= 24 -> 4 seasons, <= 27 -> 3, <= 30 -> 2, older -> 1
export const SUGGEST_MIN_FPG = 15; // under 15 FP/G this season = 1 season whatever his age
// Rest-of-season waiver adds DON'T use pool years (owner, Nov 8 2026: they expire at season end, and the 23-man roster
// limit already caps pickups), so Suggest keeps no years spare. Raise this to hold some back anyway.
export const SUGGEST_SPARE = 0;
// Prices a team can guess for a player whose next real deal isn't signed yet (all tier prices, high to low).
export const PRICE_STEPS = [...new Set([...NBA_TIERS.map(t => t.price), ROOKIE_TIER.price])].sort((a, b) => b - a);

export const span = s => `${s}-${String((Number(s) + 1) % 100).padStart(2, '0')}`;
export const half = x => Math.round(x * 2) / 2;
const tierByPrice = p => NBA_TIERS.find(t => t.price === p) ?? ROOKIE_TIER;
// Tier cutoffs grow with the NBA cap (owner, Nov 7 2026): NBA_TIERS are 2026-27 dollars; a later season's cutoffs are
// those x (1 + CAP_GROWTH) per season, so a normal max deal in 2029 isn't read as a supermax. 7% a year is a typical
// recent NBA cap rise (the CBA caps it at 10%); change it here when the real caps are announced.
export const TIER_BASE = 2026;
export const CAP_GROWTH = 0.07;
export const tierScale = s => (1 + CAP_GROWTH) ** (Number(s) - TIER_BASE);
export const tierFor = (salary, s) => NBA_TIERS.find(t => salary >= t.min * tierScale(s));

// Last season of his real NBA deal on file (options included: they're still part of the deal), or null.
export const nbaEnd = c => (c?.seasons?.length && !c.waived?.length ? Math.max(...c.seasons.map(x => Number(x.season))) : null);

// His league price if a league contract started in `season`: tier of his real salary that season.
// { price, tier, known, salary, why }. known = false when his real deal for that season isn't signed yet: the price is
// then an estimate = the team's guess (guesses[pid]) or the tier of his last real salary (never the rookie tier, since
// the next deal after a rookie deal is a real one). exp = Sleeper years_exp today; cur = this season.
export function priceFor(c, season, exp, cur, guess = null) {
  const expAt = exp == null ? null : exp + (season - cur);
  if (c?.seasons?.some(x => Number(x.season) === season)) {
    const { tier: t0, rc } = nbaTier(c, season, expAt);
    const salary = rc?.now?.salary ?? 0;
    // Rookie / no-deal tiers stay; a real salary is read against THAT season's grown cutoffs.
    const tier = NBA_TIERS.includes(t0) ? tierFor(salary, season) : t0;
    return { price: tier.price, tier, known: true, salary };
  }
  // Still in his first 4 NBA seasons: the rookie tier ($1) whatever his deal (no deal on file is $1 as well).
  if (expAt != null && expAt < ROOKIE_SEASONS) return { price: ROOKIE_TIER.price, tier: ROOKIE_TIER, known: true, salary: 0 };
  if (!c?.seasons?.length) {
    if (guess != null) return { price: guess, tier: tierByPrice(guess), known: false, salary: 0, guessed: true, why: 'your guess' };
    return { price: NO_DEAL_TIER.price, tier: NO_DEAL_TIER, known: true, salary: 0 };
  }
  const last = [...c.seasons].sort((a, b) => b.season - a.season)[0];
  const est = tierFor(last.salary, last.season); // his tier in that season's money
  if (guess != null) return { price: guess, tier: tierByPrice(guess), known: false, salary: 0, guessed: true, why: 'your guess' };
  return { price: est.price, tier: est, known: false, salary: 0, why: `estimate: his last real salary (${span(last.season)}) is ${est.label}` };
}

// Taxi + rookie deal (owner, Nov 8 2026: "a rookie could be part of the team for 6 years: 3 on taxi and 3 on rookie deal").
// Taxi: until he has more than TAXI_YEARS - 1 NBA seasons (Sleeper's own setting, = commish.js TAXI_SEASONS), so his first 3
// NBA seasons. Any taxi rookie (or rookie draft pick) then signs the $1 league rookie deal for LEAGUE_ROOKIE_YEARS seasons, the clock
// starting the season he is CALLED UP (not his draft season).
export const TAXI_YEARS = 3;
export const taxiOk = (exp, s, cur) => exp == null || exp + (Number(s) - cur) < TAXI_YEARS;

// League rookie deals: { pid: { ds (season his rookie path started), callUp (season he was called up off taxi, or null =
// still on taxi), left (rookie-deal seasons left at `start`; null while on taxi), drafted, tradedTaxi } }.
// Owner's rules (Nov 8 2026):
//   - "any taxi rookie": every rookie draft pick, and every player picked up (waiver / free agent) who then goes onto a taxi
//     squad, gets the $1 rookie deal for LEAGUE_ROOKIE_YEARS seasons from the season he is called up.
//   - DROPS RESET IT: a player picked up straight onto an active roster is a normal waiver add (rest-of-season at his tier),
//     even if he was a draft pick or on a taxi squad before; he only gets the rookie path back by going onto a taxi squad.
//   - TRADES KEEP IT: a taxi player traded is never "called up" by the trade. Sleeper drops him on the new team's active
//     roster until that team moves him to taxi, so in the season in progress a player who left a taxi squad in a trade
//     (taxi log 'out' event at the trade) and hasn't been activated from the new team's taxi since counts as STILL ON
//     TAXI (tradedTaxi: exempt, no call-up), so it doesn't lower his trade value.
//   - SENT BACK DOWN (trade deadline): a player back on a taxi squad counts as if he had always been there (call-ups before
//     it are wiped; his rookie deal starts fresh at the next call-up). Taxi time still ends after his 3rd NBA season.
// history = { season: rosters } (past = as the season ended, current = live); txs = DATA.transactions; taxiLog =
// data/taxi-log.json (events since Oct 2026: on / up / out per owner); cur = the season in progress.
export function rookiePicks(DATA, history = {}, start = START_SEASON, { taxiLog = null, cur = null } = {}) {
  const out = {};
  const seasons = Object.keys(history).map(Number).sort((a, b) => a - b);
  const onTaxi = (s, pid) => (history[s] ?? []).some(r => (r.taxi ?? []).includes(pid));
  const offTaxi = (s, pid) => (history[s] ?? []).some(r => (r.players ?? []).includes(pid) && !(r.taxi ?? []).includes(pid));
  const events = taxiLog?.events ?? [];
  const logSince = taxiLog?.since ? Date.parse(taxiLog.since) : Infinity;
  // Moves per player, oldest first.
  const moves = {};
  for (const t of DATA.transactions ?? []) {
    for (const pid of new Set([...Object.keys(t.adds ?? {}), ...Object.keys(t.drops ?? {})])) (moves[pid] ??= []).push(t);
  }
  for (const list of Object.values(moves)) list.sort((a, b) => a.ts - b.ts);
  const drafted = {};
  for (const d of DATA.drafts ?? []) if (d.kind !== 'startup') for (const p of d.picks ?? []) if (p.pid) drafted[p.pid] ??= Number(d.s);
  const candidates = new Set([...Object.keys(drafted), ...seasons.flatMap(s => (history[s] ?? []).flatMap(r => r.taxi ?? [])), ...events.filter(e => e.move === 'on').map(e => e.pid)]);

  for (const pid of candidates) {
    const mv = moves[pid] ?? [];
    // The latest PICKUP (waiver / free agent add) restarts everything; trades and commissioner fixes don't.
    const pickup = [...mv].reverse().find(t => (t.type === 'waiver' || t.type === 'free_agent') && t.adds?.[pid]);
    let ds;
    if (pickup) {
      const ps = Number(pickup.s);
      // Back on the rookie path only once he is on a taxi squad after that pickup.
      const seenSeason = seasons.find(s => s >= ps && onTaxi(s, pid));
      const seenLog = events.some(e => e.pid === pid && e.move === 'on' && Date.parse(e.at) >= pickup.ts);
      if (seenSeason == null && !seenLog) continue; // normal waiver add
      ds = seenSeason ?? cur ?? ps;
      if (seenLog && cur != null) ds = Math.min(ds, cur);
      ds = Math.max(ds, ps);
    } else if (drafted[pid] != null) {
      ds = drafted[pid];
    } else {
      ds = seasons.find(s => onTaxi(s, pid)) ?? cur; // on a taxi squad with no pickup on file (e.g. before our history)
      if (ds == null) continue;
    }
    // Traded off a taxi squad and not activated since (season in progress only).
    let tradedTaxi = false;
    const lastTrade = [...mv].reverse().find(t => t.type === 'trade' && t.adds?.[pid]);
    if (cur != null && lastTrade && Number(lastTrade.s) === cur && (!pickup || lastTrade.ts > pickup.ts) && offTaxi(cur, pid)) {
      const to = lastTrade.adds[pid];
      const from = lastTrade.drops?.[pid];
      const leftTaxi = lastTrade.ts >= logSince
        ? events.some(e => e.pid === pid && e.move === 'out' && e.owner === from && Math.abs(Date.parse(e.at) - lastTrade.ts) < 3 * 864e5)
        : onTaxi(cur - 1, pid) && !offTaxi(cur - 1, pid);
      const upSince = events.some(e => e.pid === pid && e.move === 'up' && e.owner === to && Date.parse(e.at) > lastTrade.ts);
      tradedTaxi = leftTaxi && !upSince;
    }
    // SENT BACK TO TAXI (owner, Nov 8 2026: at the trade deadline a called-up player can go back to taxi "as if he had always
    // been on the taxi"): any season he finished on a taxi squad wipes earlier call-ups, so the call-up is the first season
    // off taxi AFTER the last season on it (the season in progress counts as taxi for a traded taxi player).
    const taxiSeasons = seasons.filter(s => s >= ds && (onTaxi(s, pid) || (tradedTaxi && s === cur)));
    const lastTaxi = taxiSeasons.length ? Math.max(...taxiSeasons) : -Infinity;
    const callUp = seasons.find(s => s >= ds && s > lastTaxi && offTaxi(s, pid)) ?? null;
    out[pid] = { ds, callUp, left: callUp == null ? null : LEAGUE_ROOKIE_YEARS - (start - callUp), drafted: drafted[pid] != null, tradedTaxi };
  }
  return out;
}

// Every team's day-one contracts. deals = { pid: { len 1-4, o (team that signed it), t } }: CONTRACTS BELONG TO THE PLAYER
// (owner, Nov 7 2026), so a player traded in Sleeper keeps his length and price on his new team (row.signer, row.traded); info = { pid: { name, age, fpg, team, pos } };
// guesses = { pid: price }. Returns { teams, cap, avg, start }. NO SALARY FLOOR (owner dropped it, Nov 8 2026: low payroll here means young / rebuilding, and with no real money a floor would need an invented penalty).
export function buildLeague({ rosters, all, file, info, deals = {}, guesses = {}, rookies = {}, txs = [], cur, start = START_SEASON }) {
  const seasons = Array.from({ length: GRID_SEASONS }, (_, i) => start + i);
  // REST-OF-SEASON EXCEPTION (owner, Nov 8 2026): players picked up off waivers / free agency THIS season (cur) are on
  // rest-of-season deals, which use no pool years. { pid: { ts, type, bid } } = his latest waiver / free-agent add, if it
  // was this season (a later trade keeps it: contracts travel).
  const pickups = {};
  for (const t of txs) {
    if (t.type !== 'waiver' && t.type !== 'free_agent') continue;
    for (const pid of Object.keys(t.adds ?? {})) if (!pickups[pid] || pickups[pid].ts < t.ts) pickups[pid] = { ts: t.ts, type: t.type, bid: t.bid ?? null, s: Number(t.s) };
  }
  for (const pid of Object.keys(pickups)) if (pickups[pid].s !== cur) delete pickups[pid];
  const teams = (rosters ?? []).filter(r => r.owner_id).map(r => {
    const taxi = new Set(r.taxi ?? []);
    const ir = new Set(r.reserve ?? []);
    const rows = (r.players ?? []).map(pid => {
      const p = all?.[pid] ?? {};
      const c = file?.players?.[pid] ?? null;
      const exp = p.years_exp ?? null;
      // A taxi player just traded sits on the active roster until his new team moves him: still taxi (rookiePicks tradedTaxi).
      const tradedTaxi = !taxi.has(pid) && !!rookies[pid]?.tradedTaxi;
      const slot = taxi.has(pid) || tradedTaxi ? 'taxi' : ir.has(pid) ? 'ir' : 'active';
      const pick = rookies[pid] ?? null; // a taxi rookie or rookie draft pick: gets the league rookie deal
      const kind = slot === 'taxi' ? 'taxi' : pick?.left > 0 ? 'rookie' : 'deal';
      const pr = kind === 'rookie' ? { price: ROOKIE_TIER.price, tier: ROOKIE_TIER, known: true, salary: 0, why: 'league rookie deal' } : priceFor(c, start, exp, cur, guesses[pid] ?? null);
      const L = kind === 'taxi' ? 0 : kind === 'rookie' ? pick.left : Math.min(MAX_YEARS, Math.max(1, Number(deals[pid]?.len) || 1));
      // Eligible pickups default to the rest-of-season deal (0 pool years) until the team gives him a real length.
      const rosOk = kind === 'deal' && !!pickups[pid];
      const ros = rosOk && (deals[pid]?.len == null || deals[pid].ros === true);
      const set = kind === 'deal' && (deals[pid]?.len != null || ros);
      const signer = set ? deals[pid]?.o ?? r.owner_id : r.owner_id;
      const end = nbaEnd(c);
      const grid = seasons.map(s => {
        if (kind === 'taxi') {
          // Taxi until his 3rd NBA season is done; then a pick is called up onto his $1 rookie deal (3 seasons: projected,
          // not counted in money or the pool until the planner calls him up), anyone else at his tier.
          if (taxiOk(exp, s, cur)) return { k: 'taxi', s, last: !taxiOk(exp, s + 1, cur) };
          const up = Math.max(start, cur + TAXI_YEARS - (exp ?? 0));
          if (pick && s < up + LEAGUE_ROOKIE_YEARS) return { k: 'proj', s, price: ROOKIE_TIER.price, first: s === up };
          const re = priceFor(c, s, exp, cur, guesses[pid] ?? null);
          return { k: 'fa', s, price: re.price, est: !re.known, tier: re.tier, why: re.why, callup: !pick && s === up };
        }
        if (s < start + L) return { k: kind, s, price: pr.price, est: !pr.known, tier: pr.tier };
        const re = priceFor(c, s, exp, cur, guesses[pid] ?? null);
        return { k: 'fa', s, price: re.price, est: !re.known, tier: re.tier, why: re.why };
      });
      return {
        pid, name: info?.[pid]?.name ?? ([p.first_name, p.last_name].filter(Boolean).join(' ') || pid), team: p.team ?? '', pos: p.position ?? '',
        age: info?.[pid]?.age ?? p.age ?? null, fpg: info?.[pid]?.fpg ?? null, exp, c, slot, kind, len: (ros ? 1 : L), len0: (ros ? 1 : L), set, signer, ros, rosOk, pickup: pickups[pid] ?? null, pick: !!pick, tradedTaxi, callUp: pick?.callUp ?? null, taxiLast: exp == null ? null : cur + TAXI_YEARS - 1 - exp, traded: signer !== r.owner_id,
        price: kind === 'taxi' ? 0 : pr.price, known: pr.known, tier: pr.tier, why: pr.why, guessable: !pr.known,
        real: c?.seasons?.find(x => Number(x.season) === cur)?.salary ?? 0, nbaEnd: end, grid,
      };
    }).sort((a, b) => (a.kind === 'taxi') - (b.kind === 'taxi') || b.price - a.price || (b.fpg ?? 0) - (a.fpg ?? 0));
    return teamTotals({ owner: r.owner_id, rows, seasons });
  });
  const avg = teams.length ? teams.reduce((t, x) => t + x.payroll, 0) / teams.length : 0;
  const cap = Math.round((avg * (1 + CAP_CUSHION)) / CAP_ROUND) * CAP_ROUND;
  return { teams, cap, avg, start, seasons };
}

function teamTotals(t) {
  const signed = t.rows.filter(r => r.kind !== 'taxi');
  t.payroll = signed.reduce((s, r) => s + r.price, 0);
  t.pool = signed.reduce((s, r) => s + (r.ros ? 0 : r.len), 0); // rest-of-season deals use no pool years
  t.ros = signed.filter(r => r.ros).length;
  // The 4-season limit counts deals THIS team signed (one traded in doesn't use its limit).
  t.fours = signed.filter(r => r.kind === 'deal' && r.len === 4 && r.signer === t.owner).length;
  t.unset = signed.filter(r => r.kind === 'deal' && !r.set).length;
  t.est = signed.filter(r => !r.known).length;
  // Committed money per grid season (players still under contract that season).
  t.bySeason = t.seasons.map((s, i) => signed.reduce((sum, r) => sum + (r.grid[i].k !== 'fa' ? r.grid[i].price : 0), 0));
  t.underBySeason = t.seasons.map((s, i) => signed.filter(r => r.grid[i].k !== 'fa').length);
  t.counted = signed.length;
  t.taxi = t.rows.length - signed.length;
  return t;
}

// Can this length be given? Returns '' or the reason it can't. lenNow = the player's current length.
export function lengthBlock(team, row, want) {
  if (row.kind !== 'deal') return 'Fixed (rookie deal or taxi)';
  const pool = team.pool - (row.ros ? 0 : row.len) + want;
  if (pool > POOL) return `That would use ${pool} of ${POOL} contract-years.`;
  if (want === 4 && !(row.len === 4 && row.signer === team.owner) && team.fours >= FOUR_YEAR_PER_SUMMER) return `Only ${FOUR_YEAR_PER_SUMMER} four-season deals a summer.`;
  return '';
}

// "Suggest lengths" (owner: age + FP/G). Best players first (FP/G, young first on ties), each gets his age's length if
// he scores SUGGEST_MIN_FPG+; at most FOUR_YEAR_PER_SUMMER four-season deals (the rest drop to 3); never past the pool
// (one season is kept for everyone after him). Returns { pid: len } for the team's deal players.
export function suggestLengths(team) {
  // Contracts traded in from another team are kept as they are (counted as fixed years).
  const deals = team.rows.filter(r => r.kind === 'deal' && !r.traded);
  const fixed = team.rows.filter(r => r.kind === 'rookie' || (r.kind === 'deal' && r.traded)).reduce((s, r) => s + r.len, 0);
  // Rest-of-season pickups cost nothing at 1 season (they stay on the exception); a real deal for one costs his full length.
  let left = POOL - fixed - deals.filter(r => !r.rosOk).length - SUGGEST_SPARE; // spare years after 1 season each, minus SUGGEST_SPARE kept free
  let fours = 0;
  const out = Object.fromEntries(deals.map(r => [r.pid, 1]));
  const order = [...deals].sort((a, b) => (b.fpg ?? 0) - (a.fpg ?? 0) || (a.age ?? 99) - (b.age ?? 99));
  for (const r of order) {
    if ((r.fpg ?? 0) < SUGGEST_MIN_FPG || r.age == null) continue;
    let want = SUGGEST_AGE.find(([a]) => r.age <= a)?.[1] ?? 1;
    if (want === 4 && fours >= FOUR_YEAR_PER_SUMMER) want = 3;
    const base = r.rosOk ? 0 : 1;
    want = Math.min(want, base + Math.max(0, left));
    if (want <= 1) continue;
    out[r.pid] = want;
    left -= want - base;
    if (want === 4) fours++;
  }
  return out;
}

// Offseason planner: the summer before `summer` (= START_SEASON + 1 by default). plan = { re: { pid: 0 release | 1-4 },
// cut: [pid], up: [pid] (taxi call-ups), adds: [{ id, pid?, name, price, len, rookie }] }. priceAt(row, season) = his
// price if signed for that season. Returns every list + totals + warnings.
// dead = dead money still owed from cuts in earlier summers [{ name, amt, left (seasons from this one) }]; mkRow(add) builds a
// roster row for an added player (so later summers can price / re-sign him). Also returns `next` = the roster rows going
// into season `summer` (input for the next summer) and `deadNext`.
export function planSummer(team, plan, { cap, summer, priceAt, cur, dead = [], mkRow = (a, s) => a }) {
  const seasons = Array.from({ length: GRID_SEASONS }, (_, i) => summer + i);
  const cut = new Set(plan.cut ?? []);
  const up = new Set(plan.up ?? []);
  const carried = [], expiring = [], taxi = [];
  for (const r of team.rows) {
    if (r.kind === 'taxi') {
      // Every taxi rookie comes up on the $1 rookie deal (3 seasons); r.pick is always true for taxi rows now (kept for safety).
      // forced = his taxi time is over this summer: call him up or he is released.
      const upPrice = r.pick ? ROOKIE_TIER.price : priceAt(r, summer).price;
      taxi.push({ ...r, up: up.has(r.pid), upLen: r.pick ? LEAGUE_ROOKIE_YEARS : 1, upPrice, forced: cur != null && !taxiOk(r.exp, summer, cur) });
      continue;
    }
    if (r.len >= 2) {
      const left = r.len - 1;
      const free = r.price <= FREE_CUT;
      carried.push({ ...r, left, cut: cut.has(r.pid), dead: free ? 0 : half(CUT_SHARE * r.price), free });
    } else {
      const np = priceAt(r, summer);
      expiring.push({ ...r, next: np, choice: plan.re?.[r.pid] });
    }
  }
  const adds = (plan.adds ?? []).map(a => ({ ...a, len: a.rookie ? LEAGUE_ROOKIE_YEARS : Math.min(MAX_YEARS, Math.max(1, Number(a.len) || 1)), price: a.rookie ? ROOKIE_TIER.price : Number(a.price) || 1 }));
  // Money per season of the planner's 4-season view.
  const money = seasons.map((s, i) => {
    let m = 0;
    for (const r of carried) if (i < r.left) m += r.cut ? r.dead : r.price;
    for (const r of expiring) if (r.choice > 0 && i < r.choice) m += r.next.price;
    for (const r of taxi) if (r.up && i < r.upLen) m += r.upPrice;
    for (const a of adds) if (i < a.len) m += a.price;
    for (const d of dead) if (i < d.left) m += d.amt;
    return half(m);
  });
  const pool = carried.reduce((s, r) => s + r.left, 0) // a cut player's years stay used until next summer
    + expiring.reduce((s, r) => s + (r.choice > 0 ? r.choice : 0), 0)
    + taxi.reduce((s, r) => s + (r.up ? r.upLen : 0), 0)
    + adds.reduce((s, a) => s + a.len, 0);
  const fours = expiring.filter(r => r.choice === 4).length + adds.filter(a => !a.rookie && a.len === 4).length;
  const roster = carried.filter(r => !r.cut).length + expiring.filter(r => r.choice > 0).length + taxi.filter(r => r.up).length + adds.length;
  const undecided = expiring.filter(r => r.choice == null).length;
  const forcedOut = taxi.filter(r => r.forced && !r.up);
  const warn = [];
  if (money[0] > cap) warn.push(`Over the ${'$'}${cap} cap by ${'$'}${money[0] - cap} in ${span(summer)}.`);
  if (pool > POOL) warn.push(`${pool} contract-years out: ${pool - POOL} over the ${POOL}-year pool.`);
  if (fours > FOUR_YEAR_PER_SUMMER) warn.push(`${fours} new four-season deals: only ${FOUR_YEAR_PER_SUMMER} a summer.`);
  if (roster > ROSTER_MAX) warn.push(`${roster} players signed (active + IR): ${roster - ROSTER_MAX} over the ${ROSTER_MAX}-man roster limit.`);
  const taxiLeft = taxi.filter(r => !r.up && !r.forced).length;
  if (taxiLeft > TAXI_MAX) warn.push(`${taxiLeft} on taxi: ${taxiLeft - TAXI_MAX} over the ${TAXI_MAX}-player taxi limit.`);
  if (forcedOut.length) warn.push(`${forcedOut.map(r => r.name).join(', ')} ${forcedOut.length === 1 ? 'has' : 'have'} finished ${forcedOut.length === 1 ? 'his' : 'their'} 3rd NBA season, so taxi time is up for ${span(summer)}: call ${forcedOut.length === 1 ? "him up or he’s" : "them up or they’re"} released.`);
  if (undecided) warn.push(`${undecided} expiring player${undecided === 1 ? '' : 's'} not decided yet (released on the deadline if not re-signed).`);
  // The roster going into season `summer` (contracts as of that season), for the next summer's plan.
  const next = [
    ...carried.filter(r => !r.cut).map(r => ({ ...r, len: r.left })),
    ...expiring.filter(r => r.choice > 0).map(r => ({ ...r, signedIn: summer, signLen: r.choice, kind: 'deal', len: r.choice, price: r.next.price, tier: r.next.tier, known: r.next.known, why: r.next.why, ros: false, set: true, signer: team.owner, traded: false })),
    ...taxi.filter(r => r.up).map(r => ({ ...r, calledUpIn: summer, signLen: r.upLen, kind: r.pick ? 'rookie' : 'deal', slot: 'active', len: r.upLen, price: r.upPrice, tradedTaxi: false })),
    ...taxi.filter(r => !r.up && !r.forced),
    ...adds.map(a => ({ ...mkRow(a, summer), signedIn: summer, signLen: a.len })),
  ];
  const deadNext = [
    ...dead.filter(d => d.left > 1).map(d => ({ ...d, left: d.left - 1 })),
    ...carried.filter(r => r.cut && r.dead && r.left > 1).map(r => ({ name: r.name, amt: r.dead, left: r.left - 1 })),
  ];
  return { summer, seasons, carried, expiring, taxi, adds, money, pool, fours, roster, undecided, warn, next, deadNext, deadIn: dead, dead: carried.filter(r => r.cut).reduce((s, r) => s + r.dead * r.left, 0) };
}

// Every summer from the first after day one through `upTo`, each built on the summers before it (plans = { year: plan };
// an expiring player not re-signed in an earlier summer was released). Returns [P per summer].
export function rollPlans(team, plans, { cap, cur, start = START_SEASON, upTo, priceAt, mkRow }) {
  const out = [];
  let rows = team.rows;
  let dead = [];
  for (let summer = start + 1; summer <= upTo; summer++) {
    const P = planSummer({ ...team, rows }, plans[summer] ?? {}, { cap, summer, priceAt, cur, dead, mkRow });
    out.push(P);
    rows = P.next;
    dead = P.deadNext;
  }
  return out;
}

// Trade block (owner, Nov 7 2026: "a trade block feature that includes teams who can afford the contract"). For one
// player (row of team `from`), every other team's verdict on taking his contract (price + seasons left move with him;
// trades are not new signings, so the 4-season limit doesn't apply): { owner, room, years, fits, needMoney, needYears,
// back } where back = the cheapest single player of theirs that would cover the gap AND keep `from` under the cap and
// inside the pool after taking him back (null = no single player does). Taxi players are exempt: anyone can take them.
export function whoCanAfford(L, from, row) {
  const seller = L.teams.find(t => t.owner === from);
  const price = row.kind === 'taxi' ? 0 : row.price;
  const years = row.kind === 'taxi' ? 0 : row.len;
  return L.teams.filter(t => t.owner !== from).map(t => {
    const room = L.cap - t.payroll;
    const free = POOL - t.pool;
    const needMoney = Math.max(0, price - room);
    const needYears = Math.max(0, years - free);
    // A roster spot (or a taxi spot for a taxi player) is needed too; sending a player back frees one.
    const needSpot = row.kind === 'taxi' ? t.taxi >= TAXI_MAX : t.counted >= ROSTER_MAX;
    const fits = !needMoney && !needYears && !needSpot;
    let back = null;
    if ((needMoney || needYears) && seller) {
      back = t.rows.filter(p => p.kind !== 'taxi' && p.price >= needMoney && p.len >= needYears
          && seller.payroll - price + p.price <= L.cap && seller.pool - years + p.len <= POOL)
        .sort((a, b) => a.price - b.price || a.len - b.len)[0] ?? null;
    }
    return { owner: t.owner, room, years: free, fits, needMoney, needYears, needSpot, roster: t.counted, taxi: t.taxi, back };
  }).sort((a, b) => b.fits - a.fits || a.needMoney - b.needMoney || b.room - a.room);
}
