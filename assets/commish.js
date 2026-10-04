// Commissioner's office: a passcode-gated section with a matchup scouting report
// and a league health report. The site is public files, so the passcode only
// keeps the section out of casual view; only its SHA-256 fingerprint is stored here.

export const PASSCODE_SHA256 = '86477df6cc9ac53fe05aa7a71b6d5ac9f1063f23b76142bc2393ec40d8f85884';
export const COMMISH = '1035475215997906944'; // bigdaddyburk (Parma John Wall): the default team to scout

export async function checkPasscode(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('') === PASSCODE_SHA256;
}

const r1 = n => Math.round(n * 10) / 10;

// This league uses Sleeper's lock-in scoring: each starter counts ONE game a week
// (the one his manager locks, or his last game). More games mean more chances to
// lock a big night. From 1,300 starts in 2024-25, locked points vs that week's
// average game: 1 game 1.00, 2 games 1.11, 3 games 1.23, 4+ games about 1.25.
const LOCK_FACTOR = [0, 1, 1.11, 1.23, 1.25];
// Sleeper's projections run about 8% under what starters actually lock here. With this,
// backtests on real 2024 and 2025 lineups miss a team's score by about 27 points on
// average and pick the winner 72% of the time.
const CALIBRATION = 1.08;
export const lockFactor = games => LOCK_FACTOR[Math.min(games, LOCK_FACTOR.length - 1)] * CALIBRATION;
const mean = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const fantasy = (stats, scoring) => Object.entries(scoring).reduce((sum, [k, v]) => sum + (Number(stats?.[k]) || 0) * v, 0);
const ctToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date());

// ---------- Live data from Sleeper (fetched in the browser, cached 2 minutes) ----------

const API = 'https://api.sleeper.com';
const CACHE = {};
async function get(path, fallback) {
  const hit = CACHE[path];
  if (hit && Date.now() - hit.at < 120_000) return hit.data;
  try {
    const res = await fetch(`${API}${path}${path.includes('?') ? '&' : '?'}t=${Date.now()}`);
    if (!res.ok) return fallback;
    const data = await res.json();
    CACHE[path] = { at: Date.now(), data };
    return data;
  } catch {
    return fallback;
  }
}

// Everything the scouting report and lineup check need for one week.
export async function loadWeek(DATA, season, week) {
  const s = DATA.seasons.find(x => x.season === season);
  const id = s.leagueId;
  const [league, rosters, schedule, proj, statsNow, statsLast, matchups] = await Promise.all([
    get(`/v1/league/${id}`, {}),
    get(`/v1/league/${id}/rosters`, []),
    get(`/schedule/nba/regular/${season}`, []),
    get(`/projections/nba/${season}/${week}?season_type=regular`, []),
    get(`/v1/stats/nba/regular/${season}`, {}),
    get(`/v1/stats/nba/regular/${Number(season) - 1}`, {}),
    get(`/v1/league/${id}/matchups/${week}`, []),
  ]);
  const scoring = league.scoring_settings ?? {};
  const today = ctToday();

  // NBA games this week by team: [{ date, done }]
  const games = {};
  for (const g of schedule ?? []) {
    if (g.week !== week) continue;
    for (const t of [g.home?.team, g.away?.team]) if (t) (games[t] ??= []).push({ date: g.date, done: g.status === 'complete' || g.date < today });
  }
  // Projections: per player, the week's projected fantasy points (all games and games left),
  // plus Sleeper's current player info (team, position, injury) from the same feed.
  const projBy = {};
  const info = {};
  for (const x of proj ?? []) {
    const p = (projBy[x.player_id] ??= { total: 0, games: 0 });
    p.total += fantasy(x.stats, scoring);
    p.games++;
    if (x.player) info[x.player_id] = { ...x.player, team: x.team ?? x.player.team };
  }
  for (const p of Object.values(projBy)) p.perGame = p.games ? p.total / p.games : 0;
  const perGame = stats => {
    const out = {};
    for (const [pid, x] of Object.entries(stats ?? {})) if (x?.gp) out[pid] = { fpg: fantasy(x, scoring) / x.gp, gp: x.gp };
    return out;
  };
  return {
    season, week, today, league, rosters, matchups, scoring,
    slots: (league.roster_positions ?? []).filter(p => p !== 'BN'),
    games, projBy, info, now: perGame(statsNow), last: perGame(statsLast),
    live: (matchups ?? []).some(m => m.points > 0),
  };
}

// One team's roster for the week: starters in lineup order, then bench, IR and taxi.
export function teamRoster(DATA, ctx, owner) {
  const roster = (ctx.rosters ?? []).find(r => r.owner_id === owner);
  if (!roster) return null;
  const live = (ctx.matchups ?? []).find(m => m.roster_id === roster.roster_id);
  const player = pid => {
    const i = ctx.info[pid];
    const team = i?.team ?? DATA.players?.[pid]?.t ?? '';
    const g = ctx.games[team] ?? [];
    const pr = ctx.projBy[pid];
    const games = g.length;
    const left = g.filter(x => !x.done).length;
    const livePts = live?.players_points?.[pid] ?? null;
    const perGame = pr?.perGame ?? 0;
    // Projected locked points: one game, boosted by how many chances he gets. Once the
    // week is under way, his current points count if no games are left, or if they
    // beat what the remaining games are expected to give.
    const proj = r1(perGame * lockFactor(games));
    const projNow = !ctx.live ? proj : left ? r1(Math.max(livePts ?? 0, perGame * lockFactor(left))) : r1(livePts ?? 0);
    return {
      pid,
      name: i ? `${i.first_name} ${i.last_name}` : DATA.players?.[pid]?.n ?? `Player ${pid}`,
      pos: i?.position ?? DATA.players?.[pid]?.pos ?? '',
      team,
      injury: i?.injury_status ?? null,
      games, left, proj, projNow, perGame: r1(perGame),
      fpg: ctx.now[pid] ? r1(ctx.now[pid].fpg) : null,
      fpgLast: ctx.last[pid] ? r1(ctx.last[pid].fpg) : null,
      livePts,
    };
  };
  const starters = (roster.starters ?? []).map((pid, i) => ({ slot: ctx.slots[i] ?? 'UTIL', empty: !pid || pid === '0', ...(pid && pid !== '0' ? player(pid) : {}) }));
  const startIds = new Set(roster.starters ?? []);
  const reserve = new Set(roster.reserve ?? []);
  const taxi = new Set(roster.taxi ?? []);
  const others = (roster.players ?? []).filter(pid => !startIds.has(pid)).map(player);
  const byProj = (a, b) => b.proj - a.proj || (b.fpg ?? b.fpgLast ?? 0) - (a.fpg ?? a.fpgLast ?? 0);
  return {
    owner, rosterId: roster.roster_id,
    starters,
    bench: others.filter(p => !reserve.has(p.pid) && !taxi.has(p.pid)).sort(byProj),
    ir: others.filter(p => reserve.has(p.pid)).sort(byProj),
    taxi: others.filter(p => taxi.has(p.pid)).sort(byProj),
    projStarters: r1(starters.reduce((sum, p) => sum + (p.projNow || 0), 0)),
    liveScore: live ? r1(live.custom_points ?? live.points ?? 0) : null,
  };
}

// ---------- Award races ----------

// Every player's total fantasy points so far in a season (all games, that season's
// league scoring), with Sleeper's player info, plus that season's rookies (no NBA
// games in the 10 seasons before, the same rule as the Awards page).
export async function seasonTotals(DATA, season) {
  const s = DATA.seasons.find(x => x.season === season);
  const [league, list, ...prior] = await Promise.all([
    get(`/v1/league/${s.leagueId}`, {}),
    get(`/stats/nba/${season}?season_type=regular`, []),
    ...Array.from({ length: 10 }, (_, k) => get(`/v1/stats/nba/regular/${Number(season) - 1 - k}`, {})),
  ]);
  const scoring = league.scoring_settings ?? {};
  const rows = (list ?? [])
    .filter(x => /^\d+$/.test(x.player_id) && x.stats)
    .map(x => ({
      pid: x.player_id,
      fp: r1(fantasy(x.stats, scoring)),
      gp: x.stats.gp ?? 0,
      name: x.player ? `${x.player.first_name} ${x.player.last_name}` : DATA.players?.[x.player_id]?.n ?? `Player ${x.player_id}`,
      pos: x.player?.position ?? DATA.players?.[x.player_id]?.pos ?? '',
    }))
    .filter(r => r.fp > 0)
    .sort((a, b) => b.fp - a.fp);
  const rookies = rows.filter(r => !prior.some(p => (p?.[r.pid]?.gp ?? 0) > 0));
  return { rows, rookies };
}

// ---------- Team form ----------

// A team's regular-season scores in a season (head-to-head games), oldest first.
function scoresIn(DATA, season, owner) {
  return DATA.games.filter(g => g.s === season && g.t === 'R' && (g.a === owner || g.b === owner))
    .sort((x, y) => x.w - y.w).map(g => (g.a === owner ? g.ap : g.bp));
}

// Form for both teams on the same basis: this season once both have played, else last season.
export function matchupForm(DATA, season, A, B) {
  let basis = season;
  if (!scoresIn(DATA, season, A).length || !scoresIn(DATA, season, B).length) {
    basis = String(Number(season) - 1);
  }
  const medianRate = o => {
    const own = (DATA.medianGames ?? []).filter(m => m.s === basis && m.o === o);
    if (own.length) return own.filter(m => m.res === 'W').length / own.length;
    // Seasons before the league-median game: compare with each week's median score.
    const weeks = {};
    for (const g of DATA.games) if (g.s === basis && g.t === 'R') (weeks[g.w] ??= []).push([g.a, g.ap], [g.b, g.bp]);
    let w = 0;
    let n = 0;
    for (const list of Object.values(weeks)) {
      const mine = list.find(([x]) => x === o);
      if (!mine) continue;
      const ps = list.map(x => x[1]).sort((a, b) => a - b);
      const mid = ps.length / 2;
      const median = ps.length % 2 ? ps[Math.floor(mid)] : (ps[mid - 1] + ps[mid]) / 2;
      n++;
      if (mine[1] > median) w++;
    }
    return n ? w / n : null;
  };
  const side = o => {
    const s = scoresIn(DATA, basis, o);
    return {
      n: s.length, ppg: r1(mean(s)), last3: r1(mean(s.slice(-3))),
      high: s.length ? Math.max(...s) : 0, low: s.length ? Math.min(...s) : 0, scores: s,
      medianRate: medianRate(o),
    };
  };
  const a = side(A);
  const b = side(B);
  // How often A's weekly score beats B's, over every pair of their weeks.
  let wins = 0;
  for (const x of a.scores) for (const y of b.scores) wins += x > y ? 1 : x === y ? 0.5 : 0;
  const odds = a.scores.length && b.scores.length ? wins / (a.scores.length * b.scores.length) : null;
  return { basis, a, b, odds };
}

// ---------- Health report ----------

// Each current manager's last move (commissioner moves aside) and moves this season.
export function activity(DATA) {
  const cur = DATA.seasons.at(-1);
  return cur.teams.map(t => {
    const mine = (DATA.transactions ?? []).filter(x => x.type !== 'commissioner' && x.owners.includes(t.owner));
    const last = mine.reduce((m, x) => Math.max(m, x.ts ?? 0), 0);
    return {
      owner: t.owner,
      last: last || null,
      days: last ? Math.floor((Date.now() - last) / 86_400_000) : null,
      season: mine.filter(x => x.s === cur.season).length,
    };
  }).sort((a, b) => (b.days ?? 1e9) - (a.days ?? 1e9));
}

// Trades worth a second look, this season and last: very lopsided by the Value
// Desk, or a pair of managers trading with each other a lot in one season.
export const LOPSIDED = 750;
export const REPEAT_TRADES = 4;
export function tradeFlags(DATA, fo) {
  const recent = new Set(DATA.seasons.slice(-2).map(s => s.season));
  const trades = fo.trades.filter(t => recent.has(t.s));
  const lopsided = trades
    .map(t => ({ t, best: [...t.sides].sort((a, b) => b.net - a.net)[0] }))
    .filter(x => x.best && x.best.net >= LOPSIDED)
    .sort((a, b) => b.best.net - a.best.net);
  const pairs = {};
  for (const t of trades) {
    const os = [...new Set(t.owners)].sort();
    for (let i = 0; i < os.length; i++) for (let j = i + 1; j < os.length; j++) {
      const k = `${t.s}|${os[i]}|${os[j]}`;
      (pairs[k] ??= { s: t.s, a: os[i], b: os[j], n: 0 }).n++;
    }
  }
  return { lopsided, repeats: Object.values(pairs).filter(p => p.n >= REPEAT_TRADES).sort((a, b) => b.n - a.n) };
}

// Lineup problems this week: empty starting spots, starters listed Out/IR/suspended,
// and starters with no games (left) this week.
const OUT = new Set(['Out', 'IR', 'Suspension', 'Inactive']);
export function lineupIssues(DATA, ctx) {
  return (ctx.rosters ?? []).map(r => {
    const team = teamRoster(DATA, ctx, r.owner_id);
    const issues = [];
    for (const p of team?.starters ?? []) {
      if (p.empty) issues.push(`Empty ${p.slot} spot`);
      else if (OUT.has(p.injury)) issues.push(`${p.name} (${p.slot}) is listed ${p.injury}`);
      else if (!p.games) issues.push(`${p.name} (${p.slot}) has no games this week`);
      else if (ctx.live && !p.left) issues.push(`${p.name} (${p.slot}) has no games left this week`);
    }
    return { owner: r.owner_id, issues };
  });
}
