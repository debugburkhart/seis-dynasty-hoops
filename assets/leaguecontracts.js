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

export { ROOKIE_SEASONS, CUT_SHARE, FREE_CUT, LEAGUE_ROOKIE_YEARS, MAX_YEARS, NBA_TIERS, NO_DEAL_TIER, ROOKIE_TIER, FOUR_YEAR_PER_SUMMER, POOL };

export const START_SEASON = 2027; // first season of the day-one contracts (2027-28)
export const GRID_SEASONS = 4; // the outlook grid: START_SEASON + 3
// Roster limit (owner, Nov 8 2026): 23 = Sleeper's 9 starters + 14 bench; IR counts (same choice as the Depth Chart's
// ROSTER_LIMIT), taxi doesn't (its own limit, TAXI_MAX 15 = commish.js TAXI_SIZE).
// CAP + FLOOR + FREE-AGENCY AUCTION (owner, Nov 8 2026: "increase salary cap to a clean $500 ... public bidding ... contract
// price only, once the price is won the team decides how long ... actively winning a bid counts against your cap"): the cap
// is FIXED at CAP 500 (no longer average payroll + 10%); FLOOR 300 checked at the season start (the gap becomes dead money
// next season). Free agency = a public slow auction on price per season: opening bid >= OPEN_SHARE of his tier price, raises
// of BID_STEP+, each player closes BID_HOURS after his last bid, leading bids hold cap room + a roster spot.
export const CAP = 500;
export const FLOOR = 300;
export const OPEN_SHARE = 0.5;
export const BID_STEP = 1;
export const BID_HOURS = 24;
export const openingBid = tierPrice => Math.max(1, Math.ceil((tierPrice || 1) * OPEN_SHARE));
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
export const ordinal = n => (n == null ? '?' : `${n}${[11, 12, 13].includes(n % 100) ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`);
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

// ROOKIE DEAL LENGTH, SERVICE TIME, RE-SIGN LIMIT (owner, Nov 8 2026):
// - The $1 league rookie deal starts when he's CALLED UP (nothing on the books while on taxi) and ends with his NBA rookie
//   years (his first ROOKIE_SEASONS 4 NBA seasons): after that he costs his real-salary tier. So a player called up after 3
//   taxi seasons gets 1 cheap season.
// - SERVICE (revised the same day, owner: "based on their rookie year so numbers divisible by 8 would effectively be at 0 ...
//   every player accrues service time regardless of league team rostering"): service = his NBA seasons (Sleeper years_exp,
//   rookie year = season 1), in CYCLES of SERVICE_MAX 8: after his 8th, 16th, 24th ... NBA season he goes to free agency
//   (no re-sign; old team bids FAAB), and a league contract can't run past the end of his current cycle. On rosters or not,
//   taxi or not, every NBA season counts. (Superseded: the first version counted league seasons from 2023, see below.)
//   OLD: a player may be under league contract for SERVICE_MAX 8 seasons, counted LEAGUE-WIDE (every team, retroactive
//   from 2023: every league season he finished on an active roster or IR; taxi seasons don't count). In his 8th season he can
//   be traded as a "loaner"; after it he goes to free agency (can't be re-signed; old team bids FAAB like everyone). A summer
//   free-agency signing starts his clock over at 0.
// - RE-SIGN LIMIT: at most RESIGN_MAX 6 re-signings a summer per team; players coming off the league rookie deal don't count.
export const SERVICE_MAX = 8;
// TWO CONTRACTS, THEN FREE AGENCY (owner, Nov 8 2026; REPLACES the 8-season clock): a player may be on CONTRACTS_MAX 2 contracts in
// a row; when the 2nd ends he goes to free agency (no re-sign; any team, his old one too, can bid) and his next signing is
// contract 1 again. Contracts = day-one deals, re-signings, free-agency signings and the $1 rookie deal (taxi and in-season
// pickups are not contracts). OPTION B (retroactive): a player on league rosters (active / IR) EVERY season since the 2023
// startup (serviceMap = 4 in 2026-27) has used one already, so his day-one deal is contract 2 of 2. A rookie: rookie deal
// (call-up -> 4th NBA season) + 1 more = at most 8 years from his draft, taxi included. SERVICE_MAX is no longer used.
export const CONTRACTS_MAX = 2;
// His Nth NBA season in season s (exp = Sleeper years_exp in season cur), and the seasons he has done in the current
// 8-season cycle before season s (0 = a fresh cycle: his 8th / 16th ... season just ended, or a rookie).
export const nbaYear = (exp, s, cur) => (exp == null ? null : exp + (Number(s) - cur) + 1);
export const cycleDone = (exp, s, cur) => (exp == null ? 0 : (exp + (Number(s) - cur)) % SERVICE_MAX);
export const RESIGN_MAX = 6;
export const rookieThrough = (exp, cur) => (exp == null ? null : cur - exp + ROOKIE_SEASONS - 1); // last NBA rookie season
export const rookieLen = (exp, cur, from) => (exp == null ? LEAGUE_ROOKIE_YEARS : Math.max(1, rookieThrough(exp, cur) - from + 1));
// { pid: league seasons of service so far } from the roster history (season-end rosters, the season in progress = live);
// skip = players who don't count in the season in progress (traded off a taxi squad, still taxi).
// SERVICE CLOCK, FINAL VERSION (owner, Nov 8 2026: "everyone's FA eligibility start from the 2023 startup draft ... if a player
// hits FA (not rostered by a team at the end of the season or not re-signed by a team) his 8 year clock resets and any team
// can bid on him"; replaces the NBA-seasons cycle): { pid: league seasons in a row he has finished on an active roster or IR
// (any team) since 2023 or since he was last a free agent }. Walks the season-end rosters oldest first: active / IR = +1,
// taxi = no change (no contract), on no roster at a season's end = back to 0. The season in progress counts as live.
// skip = players who count as taxi in the season in progress (traded off a taxi squad).
export function serviceMap(history = {}, cur = null, skip = new Set()) {
  const out = {};
  const seasons = Object.keys(history).map(Number).sort((a, b) => a - b);
  const seen = new Set();
  for (const s of seasons) for (const r of history[s] ?? []) for (const pid of r.players ?? []) seen.add(pid);
  for (const pid of seen) {
    let run = 0;
    for (const s of seasons) {
      const r = (history[s] ?? []).find(x => (x.players ?? []).includes(pid));
      if (!r) { run = 0; continue; } // a free agent at that season's end: the clock starts over
      if ((r.taxi ?? []).includes(pid) || (s === cur && skip.has(pid))) continue;
      run += 1;
    }
    out[pid] = run;
  }
  return out;
}

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
export function rookiePicks(DATA, history = {}, start = START_SEASON, { taxiLog = null, cur = null, all = null } = {}) {
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
    // The rookie deal runs from his call-up to the end of his NBA rookie years (first 4 NBA seasons).
    const exp = all?.[pid]?.years_exp ?? null;
    const left = callUp == null ? null : exp == null || cur == null ? LEAGUE_ROOKIE_YEARS - (start - callUp) : rookieThrough(exp, cur) - start + 1;
    out[pid] = { ds, callUp, left, drafted: drafted[pid] != null, tradedTaxi };
  }
  return out;
}

// Every team's day-one contracts. deals = { pid: { len 1-4, o (team that signed it), t } }: CONTRACTS BELONG TO THE PLAYER
// (owner, Nov 7 2026), so a player traded in Sleeper keeps his length and price on his new team (row.signer, row.traded); info = { pid: { name, age, fpg, team, pos } };
// guesses = { pid: price }. Returns { teams, cap, avg, start }. NO SALARY FLOOR (owner dropped it, Nov 8 2026: low payroll here means young / rebuilding, and with no real money a floor would need an invented penalty).
export function buildLeague({ rosters, all, file, info, deals = {}, guesses = {}, rookies = {}, txs = [], service = {}, cur, start = START_SEASON }) {
  const seasons = Array.from({ length: GRID_SEASONS }, (_, i) => start + i);
  // No rest-of-season deals on day one (owner, Nov 8 2026: day one is in the offseason, so every player gets a real 1-4
  // season length). In-season waiver / free-agent pickups are exempt from the cap AND the years pool (Waiver wire tab).
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
      // Service: seasons under league contract so far (league-wide); a deal can't run past his 8th.
      const svc = service[pid] ?? 0; // league seasons in a row on rosters (serviceMap), as of day one
      // Contract number of his day-one deal: 2 when he has been on rosters every season since the startup (option B).
      const cn = slot === 'taxi' ? 0 : !(pick?.left > 0) && svc >= cur - 2023 + 1 ? 2 : 1;
      const L = kind === 'taxi' ? 0 : kind === 'rookie' ? pick.left : Math.min(MAX_YEARS, Math.max(1, Number(deals[pid]?.len) || 1));
      const rosOk = false;
      const ros = false;
      const set = kind === 'deal' && (deals[pid]?.len != null || ros);
      const signer = set ? deals[pid]?.o ?? r.owner_id : r.owner_id;
      const end = nbaEnd(c);
      const grid = seasons.map(s => {
        if (kind === 'taxi') {
          // Taxi until his 3rd NBA season is done; then a pick is called up onto his $1 rookie deal (3 seasons: projected,
          // not counted in money or the pool until the planner calls him up), anyone else at his tier.
          if (taxiOk(exp, s, cur)) return { k: 'taxi', s, last: !taxiOk(exp, s + 1, cur) };
          const up = Math.max(start, cur + TAXI_YEARS - (exp ?? 0));
          if (pick && s <= (rookieThrough(exp, cur) ?? up + LEAGUE_ROOKIE_YEARS - 1)) return { k: 'proj', s, price: ROOKIE_TIER.price, first: s === up };
          const re = priceFor(c, s, exp, cur, guesses[pid] ?? null);
          return { k: 'fa', s, price: re.price, est: !re.known, tier: re.tier, why: re.why, callup: !pick && s === up };
        }
        if (s < start + L) return { k: kind, s, price: pr.price, est: !pr.known, tier: pr.tier };
        const re = priceFor(c, s, exp, cur, guesses[pid] ?? null);
        // svc: the season after his 8th / 16th ... NBA season = free agency (no re-sign).
        return { k: 'fa', s, price: re.price, est: !re.known, tier: re.tier, why: re.why, svc: cn >= CONTRACTS_MAX && s === start + L, svcFirst: cn >= CONTRACTS_MAX && s === start + L };
      });
      return {
        pid, name: info?.[pid]?.name ?? ([p.first_name, p.last_name].filter(Boolean).join(' ') || pid), team: p.team ?? '', pos: p.position ?? '',
        age: info?.[pid]?.age ?? p.age ?? null, fpg: info?.[pid]?.fpg ?? null, exp, c, slot, kind, len: (ros ? 1 : L), len0: (ros ? 1 : L), svc, cn, cur, svcEnd: cn >= CONTRACTS_MAX ? start + L - 1 : null, set, signer, ros, rosOk, pick: !!pick, tradedTaxi, callUp: pick?.callUp ?? null, taxiLast: exp == null ? null : cur + TAXI_YEARS - 1 - exp, traded: signer !== r.owner_id,
        price: kind === 'taxi' ? 0 : pr.price, known: pr.known, tier: pr.tier, why: pr.why, guessable: !pr.known,
        real: c?.seasons?.find(x => Number(x.season) === cur)?.salary ?? 0, nbaEnd: end, grid,
      };
    }).sort((a, b) => (a.kind === 'taxi') - (b.kind === 'taxi') || b.price - a.price || (b.fpg ?? 0) - (a.fpg ?? 0));
    return teamTotals({ owner: r.owner_id, rows, seasons });
  });
  const avg = teams.length ? teams.reduce((t, x) => t + x.payroll, 0) / teams.length : 0;
  return { teams, cap: CAP, floor: FLOOR, avg, start, seasons };
}

function teamTotals(t) {
  const signed = t.rows.filter(r => r.kind !== 'taxi');
  t.payroll = signed.reduce((s, r) => s + r.price, 0);
  t.pool = signed.reduce((s, r) => s + r.len, 0);
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
  const pool = team.pool - row.len + want;
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
  let left = POOL - fixed - deals.length - SUGGEST_SPARE; // spare years after 1 season each, minus SUGGEST_SPARE kept free
  let fours = 0;
  const out = Object.fromEntries(deals.map(r => [r.pid, 1]));
  const order = [...deals].sort((a, b) => (b.fpg ?? 0) - (a.fpg ?? 0) || (a.age ?? 99) - (b.age ?? 99));
  for (const r of order) {
    if ((r.fpg ?? 0) < SUGGEST_MIN_FPG || r.age == null) continue;
    let want = SUGGEST_AGE.find(([a]) => r.age <= a)?.[1] ?? 1;
    if (want === 4 && fours >= FOUR_YEAR_PER_SUMMER) want = 3;
    const base = 1;
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
// banned = { pid: last season of the old deal } for players THIS team cut earlier: it can't sign them again until that
// season is over (owner, Nov 8 2026; other teams can sign them any time, the dead money stays with the cutting team).
export function planSummer(team, plan, { cap, floor = null, summer, priceAt, cur, dead = [], mkRow = (a, s) => a, banned = {} }) {
  const seasons = Array.from({ length: GRID_SEASONS }, (_, i) => summer + i);
  const cut = new Set(plan.cut ?? []);
  const up = new Set(plan.up ?? []);
  const carried = [], expiring = [], taxi = [];
  for (const r of team.rows) {
    if (r.kind === 'taxi') {
      // Every taxi rookie comes up on the $1 rookie deal (3 seasons); r.pick is always true for taxi rows now (kept for safety).
      // forced = his taxi time is over this summer: call him up or he is released.
      const upPrice = r.pick ? ROOKIE_TIER.price : priceAt(r, summer).price;
      taxi.push({ ...r, up: up.has(r.pid), upLen: r.pick ? (cur != null ? rookieLen(r.exp, cur, summer) : LEAGUE_ROOKIE_YEARS) : 1, upPrice, forced: cur != null && !taxiOk(r.exp, summer, cur) });
      continue;
    }
    if (r.len >= 2) {
      const left = r.len - 1;
      const free = r.price <= FREE_CUT;
      carried.push({ ...r, left, cut: cut.has(r.pid), dead: free ? 0 : half(CUT_SHARE * r.price), free });
    } else {
      // Re-signing a player signed in free agency (a market price) costs the HIGHER of his current price and his tier (owner,
      // Nov 8 2026): an auction overpay never gets cheaper by re-signing. Tier-priced deals re-sign at the tier as before.
      const tierNext = priceAt(r, summer); // his plain tier (what a free agent costs other teams)
      let np = tierNext;
      if (r.market && r.price > np.price) np = { ...np, price: r.price, known: true, kept: true, why: 'his free-agency price: re-signing never lowers it' };
      // Service after the season just played; 8 = free agency, no re-sign. Re-sign length can't pass his 8th season.
      // NBA seasons done by this summer; a multiple of 8 (his 8th / 16th ... season just ended) = free agency.
      // League seasons in a row after the season just played; 8 = free agency.
      // Two contracts, then free agency: a player finishing contract 2 can't be re-signed.
      const cn = r.cn ?? 1;
      const svcNow = cn;
      const done = cn;
      const svcOut = cn >= CONTRACTS_MAX;
      const maxLen = MAX_YEARS;
      const want = plan.re?.[r.pid];
      expiring.push({ ...r, next: np, tierNext, svcNow, svcDone: done, svcOut, maxLen, choice: svcOut ? 0 : want > 0 ? Math.min(want, maxLen) : want });
    }
  }
  const adds = (plan.adds ?? []).map(a => ({ ...a, len: a.rookie ? ROOKIE_SEASONS : Math.min(MAX_YEARS, Math.max(1, Number(a.len) || 1)), price: a.rookie ? ROOKIE_TIER.price : Number(a.price) || 1 }));
  // Cuts this summer join the ban list right away (cut and sign back the same summer = not allowed either).
  const banNow = { ...banned };
  for (const r of carried) if (r.cut) banNow[r.pid] = summer + r.left - 1;
  for (const a of adds) if (a.pid && banNow[a.pid] >= summer) a.banned = banNow[a.pid];
  const addsOk = adds.filter(a => !a.banned);
  // Money per season of the planner's 4-season view.
  const money = seasons.map((s, i) => {
    let m = 0;
    for (const r of carried) if (i < r.left) m += r.cut ? r.dead : r.price;
    for (const r of expiring) if (r.choice > 0 && i < r.choice) m += r.next.price;
    for (const r of taxi) if (r.up && i < r.upLen) m += r.upPrice;
    for (const a of addsOk) if (i < a.len) m += a.price;
    for (const d of dead) if (i < d.left) m += d.amt;
    return half(m);
  });
  const pool = carried.reduce((s, r) => s + r.left, 0) // a cut player's years stay used until next summer
    + expiring.reduce((s, r) => s + (r.choice > 0 ? r.choice : 0), 0)
    + taxi.reduce((s, r) => s + (r.up ? r.upLen : 0), 0)
    + addsOk.reduce((s, a) => s + a.len, 0);
  const fours = expiring.filter(r => r.choice === 4).length + addsOk.filter(a => !a.rookie && a.len === 4).length;
  const roster = carried.filter(r => !r.cut).length + expiring.filter(r => r.choice > 0).length + taxi.filter(r => r.up).length + addsOk.length;
  const undecided = expiring.filter(r => r.choice == null).length;
  // Re-signings this summer (players coming off the league rookie deal don't count).
  const resigns = expiring.filter(r => r.choice > 0 && r.kind !== 'rookie').length;
  const svcOut = expiring.filter(r => r.svcOut);
  const forcedOut = taxi.filter(r => r.forced && !r.up);
  const warn = [];
  if (money[0] > cap) warn.push(`Over the ${'$'}${cap} cap by ${'$'}${money[0] - cap} in ${span(summer)}.`);
  if (floor != null && money[0] < floor) warn.push(`Under the ${'$'}${floor} floor by ${'$'}${floor - money[0]} in ${span(summer)} (checked at the season start; the gap becomes dead money the season after).`);
  if (pool > POOL) warn.push(`${pool} contract-years out: ${pool - POOL} over the ${POOL}-year pool.`);
  if (fours > FOUR_YEAR_PER_SUMMER) warn.push(`${fours} new four-season deals: only ${FOUR_YEAR_PER_SUMMER} a summer.`);
  if (resigns > RESIGN_MAX) warn.push(`${resigns} re-signings: only ${RESIGN_MAX} a summer (players coming off a rookie deal don't count).`);
  if (roster > ROSTER_MAX) warn.push(`${roster} players signed (active + IR): ${roster - ROSTER_MAX} over the ${ROSTER_MAX}-man roster limit.`);
  const taxiLeft = taxi.filter(r => !r.up && !r.forced).length;
  if (taxiLeft > TAXI_MAX) warn.push(`${taxiLeft} on taxi: ${taxiLeft - TAXI_MAX} over the ${TAXI_MAX}-player taxi limit.`);
  if (forcedOut.length) warn.push(`${forcedOut.map(r => r.name).join(', ')} ${forcedOut.length === 1 ? 'has' : 'have'} finished ${forcedOut.length === 1 ? 'his' : 'their'} 3rd NBA season, so taxi time is up for ${span(summer)}: call ${forcedOut.length === 1 ? "him up or he’s" : "them up or they’re"} released.`);
  for (const a of adds.filter(x => x.banned)) warn.push(`${a.name}: you cut him, so he can't come back until after ${span(a.banned)} (his old deal's last season). Not counted.`);
  if (undecided) warn.push(`${undecided} expiring player${undecided === 1 ? '' : 's'} not decided yet (released on the deadline if not re-signed).`);
  // The roster going into season `summer` (contracts as of that season), for the next summer's plan.
  const next = [
    ...carried.filter(r => !r.cut).map(r => ({ ...r, len: r.left, svc: (r.svc ?? 0) + 1 })),
    ...expiring.filter(r => r.choice > 0).map(r => ({ ...r, cn: (r.cn ?? 1) + 1, signedIn: summer, signLen: r.choice, kind: 'deal', len: r.choice, price: r.next.price, tier: r.next.tier, known: r.next.known, why: r.next.why, ros: false, set: true, signer: team.owner, traded: false })),
    ...taxi.filter(r => r.up).map(r => ({ ...r, cn: 1, calledUpIn: summer, signLen: r.upLen, kind: r.pick ? 'rookie' : 'deal', slot: 'active', len: r.upLen, price: r.upPrice, tradedTaxi: false })),
    ...taxi.filter(r => !r.up && !r.forced),
    ...addsOk.map(a => ({ ...mkRow(a, summer), signedIn: summer, signLen: a.len, cn: 1, market: !a.rookie })), // a free-agency signing = contract 1 again
  ];
  const deadNext = [
    ...dead.filter(d => d.left > 1).map(d => ({ ...d, left: d.left - 1 })),
    ...carried.filter(r => r.cut && r.dead && r.left > 1).map(r => ({ name: r.name, amt: r.dead, left: r.left - 1 })),
  ];
  // Bans still running next summer.
  const bannedNext = Object.fromEntries(Object.entries(banNow).filter(([, until]) => until >= summer + 1));
  return { summer, banned: banNow, bannedNext, seasons, carried, expiring, taxi, adds, money, pool, fours, roster, undecided, resigns, svcOut, warn, next, deadNext, deadIn: dead, dead: carried.filter(r => r.cut).reduce((s, r) => s + r.dead * r.left, 0) };
}

// Every summer from the first after day one through `upTo`, each built on the summers before it (plans = { year: plan };
// an expiring player not re-signed in an earlier summer was released). Returns [P per summer].
export function rollPlans(team, plans, { cap, floor = null, cur, start = START_SEASON, upTo, priceAt, mkRow }) {
  const out = [];
  let rows = team.rows;
  let dead = [];
  let banned = {};
  for (let summer = start + 1; summer <= upTo; summer++) {
    const P = planSummer({ ...team, rows }, plans[summer] ?? {}, { cap, floor, summer, priceAt, cur, dead, mkRow, banned });
    out.push(P);
    rows = P.next;
    dead = P.deadNext;
    banned = P.bannedNext;
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
