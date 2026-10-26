// 2K-style team breakdown (Test features in the commish office, owner Oct 2026): a player list
// (one fantasy team's roster, the waiver wire, or every rostered player in the league) with NBA bio
// info and box-score stats from Sleeper, plus fantasy points under that season's league scoring.
// No DOM here; app.js draws it (renderBreakdown). The nightly job (scripts/update.mjs) saves the
// season stat tables (updateSeasonStats -> data/season-stats.json).

import { get } from './commish.js';
import { ALL_STARS_FROM } from './config.js';
import { ALL_STAR_POSITIONS } from './corrections.js';
import { allFantasy, allStars, championshipMvp, mvpRace, playerOfTheYear, rookieClass } from './awards.js';
import { draftOfYear } from './draft.js';

export const fantasy = (stats, scoring) => Object.entries(scoring).reduce((sum, [k, v]) => sum + (Number(stats?.[k]) || 0) * v, 0);
// Minutes: `min`, or seconds played / 60 (older rows have only `sp`).
export const minutes = s => (s?.min != null ? Number(s.min) : (Number(s?.sp) || 0) / 60);
// Sleeper drops zero fields; a game counts when he got on the floor.
const played = s => !!(s && (s.gp || s.sp || s.min));
const n = (s, k) => Number(s?.[k]) || 0;

const NBA_TEAMS = {
  ATL: 'Atlanta Hawks', BOS: 'Boston Celtics', BKN: 'Brooklyn Nets', CHA: 'Charlotte Hornets', CHI: 'Chicago Bulls',
  CLE: 'Cleveland Cavaliers', DAL: 'Dallas Mavericks', DEN: 'Denver Nuggets', DET: 'Detroit Pistons', GSW: 'Golden State Warriors',
  HOU: 'Houston Rockets', IND: 'Indiana Pacers', LAC: 'LA Clippers', LAL: 'Los Angeles Lakers', MEM: 'Memphis Grizzlies',
  MIA: 'Miami Heat', MIL: 'Milwaukee Bucks', MIN: 'Minnesota Timberwolves', NOP: 'New Orleans Pelicans', NYK: 'New York Knicks',
  OKC: 'Oklahoma City Thunder', ORL: 'Orlando Magic', PHI: 'Philadelphia 76ers', PHX: 'Phoenix Suns', POR: 'Portland Trail Blazers',
  SAC: 'Sacramento Kings', SAS: 'San Antonio Spurs', TOR: 'Toronto Raptors', UTA: 'Utah Jazz', WAS: 'Washington Wizards',
};
export const nbaTeamName = t => NBA_TEAMS[t] ?? t ?? '';
// ESPN's team logo files use their own short codes for a few teams.
const ESPN_CODE = { GSW: 'gs', NOP: 'no', NYK: 'ny', SAS: 'sa', UTA: 'utah', WAS: 'wsh' };
export const teamLogo = t => (t && NBA_TEAMS[t] ? `https://a.espncdn.com/i/teamlogos/nba/500/${ESPN_CODE[t] ?? t.toLowerCase()}.png` : null);

// ---------- Draft info for the player card (owner, Oct 25 2026) ----------

// Real NBA draft: assets/nba-draft.json, a static file built once from Basketball-Reference's draft
// pages 2003-2026 matched to Sleeper ids (players: { pid: [year, round, overall pick, BRef team] },
// undrafted: pids checked and not drafted). Rebuild after each June draft (see CLAUDE.md).
let NBA_DRAFT;
export async function loadNbaDraft() {
  if (NBA_DRAFT !== undefined) return NBA_DRAFT;
  try {
    const res = await fetch(`assets/nba-draft.json?t=${Date.now()}`, { cache: 'no-store' });
    NBA_DRAFT = res.ok ? await res.json() : null;
  } catch { NBA_DRAFT = null; }
  return NBA_DRAFT;
}
// Basketball-Reference team codes, incl. old names (CHA = Bobcats until 2014, Hornets after).
const BREF_TEAMS = {
  BRK: 'Brooklyn Nets', NJN: 'New Jersey Nets', CHO: 'Charlotte Hornets', CHH: 'Charlotte Hornets', PHO: 'Phoenix Suns',
  SEA: 'Seattle SuperSonics', NOH: 'New Orleans Hornets', NOK: 'New Orleans/Oklahoma City Hornets', VAN: 'Vancouver Grizzlies',
};
const draftTeam = (t, y) => (t === 'CHA' && y <= 2014 ? 'Charlotte Bobcats' : BREF_TEAMS[t] ?? NBA_TEAMS[t] ?? t);
// "2022 · Round 1, No. 1 by the Orlando Magic" | "Undrafted" | null (not checked: signed after the file was built).
export function nbaDraftText(pid) {
  const d = NBA_DRAFT?.players?.[pid];
  if (d) { const [y, r, p, t] = d; return `${y} · Round ${r}, No. ${p}${t ? ` by the ${draftTeam(t, y)}` : ''}`; }
  return NBA_DRAFT?.undrafted?.includes(pid) ? 'Undrafted' : null;
}
// The league's own drafts (DATA.drafts: 2023 startup, rookie drafts after): { s, kind, round, inRound, no, owner } or null.
export function leagueDraftOf(DATA, pid) {
  for (const d of DATA.drafts ?? []) {
    const p = d.picks.find(x => x.pid === pid);
    if (!p) continue;
    const perRound = DATA.seasons.find(s => s.season === d.s)?.teams?.length || d.picks.filter(x => x.round === 1).length || 8;
    return { s: d.s, kind: d.kind, round: p.round, inRound: p.no - (p.round - 1) * perRound, no: p.no, owner: p.o };
  }
  return null;
}

// Box-score line from one game's stats: totals + derived numbers.
export function statLine(s, scoring) {
  const line = {
    gp: played(s) ? 1 : 0, min: minutes(s),
    pts: n(s, 'pts'), reb: n(s, 'reb'), oreb: n(s, 'oreb'), dreb: n(s, 'dreb'), ast: n(s, 'ast'),
    stl: n(s, 'stl'), blk: n(s, 'blk'), to: n(s, 'to'), pf: n(s, 'pf'),
    fgm: n(s, 'fgm'), fga: n(s, 'fga'), tpm: n(s, 'tpm'), tpa: n(s, 'tpa'), ftm: n(s, 'ftm'), fta: n(s, 'fta'),
    pm: n(s, 'plus_minus'), dd: n(s, 'dd'), td: n(s, 'td'), tf: n(s, 'tf'),
    fp: fantasy(s, scoring),
  };
  return withPercents(line);
}
function withPercents(line) {
  line.fgp = line.fga ? line.fgm / line.fga : null;
  line.tpp = line.tpa ? line.tpm / line.tpa : null;
  line.ftp = line.fta ? line.ftm / line.fta : null;
  // True shooting %: points per shooting chance (a free-throw trip ~ 0.44 of one).
  line.ts = line.fga || line.fta ? line.pts / (2 * (line.fga + 0.44 * line.fta)) : null;
  line.efg = line.fga ? (line.fgm + 0.5 * line.tpm) / line.fga : null;
  return line;
}
// Season totals added up from a game log. Sleeper's season-total feeds are not used for stats:
// they run a day behind, have no plus/minus, and carry bonus flags (40/50 points, 15 assists,
// 20 rebounds) a player never earned (Banchero 2025-26: 2,568 FP vs 2,560 from his games).
const SUMS = ['gp', 'min', 'pts', 'reb', 'oreb', 'dreb', 'ast', 'stl', 'blk', 'to', 'pf', 'fgm', 'fga', 'tpm', 'tpa', 'ftm', 'fta', 'pm', 'dd', 'td', 'tf', 'fp'];
export function totalOf(games) {
  const line = Object.fromEntries(SUMS.map(k => [k, 0]));
  for (const g of games) if (!g.dnp) for (const k of SUMS) line[k] += g.line[k];
  return withPercents(line);
}
// Per-game averages of a totals line (shooting % and games stay as they are).
const PER_GAME = ['min', 'pts', 'reb', 'oreb', 'dreb', 'ast', 'stl', 'blk', 'to', 'pf', 'fgm', 'fga', 'tpm', 'tpa', 'ftm', 'fta', 'pm', 'fp'];
export function averages(line) {
  const out = { ...line };
  for (const k of PER_GAME) out[k] = line[k] == null ? null : line.gp ? line[k] / line.gp : 0;
  return out;
}

// ---------- Season stat tables (every NBA player, added up from per-game box scores) ----------

// Raw stats kept per player: games, minutes, the box score and every field any league season
// scores (bonuses are per game, so added up they are right, unlike the season-total feeds).
export const STAT_KEYS = ['gp', 'min', 'pts', 'reb', 'oreb', 'dreb', 'ast', 'stl', 'blk', 'to', 'pf', 'fgm', 'fga', 'tpm', 'tpa', 'ftm', 'fta',
  'plus_minus', 'dd', 'td', 'tf', 'ff', 'bonus_pt_40p', 'bonus_pt_50p', 'bonus_ast_15p', 'bonus_reb_20p'];
export const STATS_VERSION = 1;
const API = 'https://api.sleeper.com';
// One week of box scores; a failed read throws (a missing week must never be saved as zeros).
async function weekRows(season, week) {
  const res = await fetch(`${API}/stats/nba/${season}/${week}?season_type=regular&t=${Date.now()}`);
  if (!res.ok) throw new Error(`Sleeper box scores ${season} week ${week}: HTTP ${res.status}`);
  return (await res.json()) ?? [];
}
const r2 = x => Math.round(x * 100) / 100;
function addRows(table, rows) {
  for (const g of rows) {
    if (!/^\d+$/.test(g.player_id) || !played(g.stats)) continue;
    const a = (table.players[g.player_id] ??= STAT_KEYS.map(() => 0));
    STAT_KEYS.forEach((k, i) => { a[i] = r2(a[i] + (k === 'gp' ? 1 : k === 'min' ? minutes(g.stats) : n(g.stats, k))); });
    if (g.date && (!table.through || g.date > table.through)) table.through = g.date;
  }
}
const copyTable = t => ({ ...t, players: Object.fromEntries(Object.entries(t.players).map(([pid, a]) => [pid, [...a]])) });
// Add weeks from..to (to = null: until the first empty week after games, at most 30) to a table.
async function sumWeeks(season, base, from, to) {
  const table = base ? copyTable(base) : { keys: STAT_KEYS, weeks: 0, through: null, players: {} };
  for (let w = from; w <= (to ?? 30); w++) {
    const rows = await weekRows(season, w);
    if (to == null && !rows.length && table.through) break;
    addRows(table, rows);
    if (rows.length || to != null) table.weeks = w;
  }
  return table;
}
// Weeks of a season that are fully played, from Sleeper's NBA state: { weeks (null = all), complete }.
function doneWeeks(state, season) {
  if (Number(season) < Number(state?.season)) return { weeks: null, complete: true };
  if (state?.season !== season) return { weeks: 0, complete: false };
  if (state.season_type === 'regular') return { weeks: Math.max(0, (Number(state.week) || 1) - 1), complete: false };
  return state.season_type === 'pre' ? { weeks: 0, complete: false } : { weeks: null, complete: true };
}

// Nightly (scripts/update.mjs): data/season-stats.json { version, at, seasons: { season: { keys, weeks,
// through, complete, players: { pid: [STAT_KEYS values] } } } } for every league season. Finished
// seasons are built once and kept; the season in progress adds its newly finished weeks.
export async function updateSeasonStats(DATA, prev, { log = () => {} } = {}) {
  const state = await (await fetch(`${API}/v1/state/nba?t=${Date.now()}`)).json();
  const old = prev?.version === STATS_VERSION ? prev.seasons ?? {} : {};
  const out = { version: STATS_VERSION, at: new Date().toISOString(), seasons: {} };
  for (const { season } of DATA.seasons) {
    const was = old[season];
    const { weeks, complete } = doneWeeks(state, season);
    if (was?.complete) { out.seasons[season] = was; continue; }
    if (!complete && weeks === 0) continue;
    const keep = was && (weeks == null || was.weeks <= weeks) ? was : null;
    if (keep && weeks != null && keep.weeks === weeks) { out.seasons[season] = { ...keep, complete }; continue; }
    const t = await sumWeeks(season, keep, (keep?.weeks ?? 0) + 1, weeks);
    out.seasons[season] = { ...t, complete };
    log(`Season stats ${season}: weeks 1-${t.weeks} (${Object.keys(t.players).length} players, through ${t.through})${complete ? ', final' : ''}.`);
  }
  return out;
}

// Browser: the saved table + this week's games so far (weeks after the saved ones), so the page is
// live. No saved file yet (before the first nightly run): built here from every week (slower).
let SAVED;
const TABLES = {};
export async function seasonTable(season) {
  const hit = TABLES[season];
  if (hit && (hit.complete || Date.now() - hit.at < 120_000)) return hit.table;
  if (SAVED === undefined) {
    try {
      const res = await fetch(`data/season-stats.json?t=${Date.now()}`, { cache: 'no-store' });
      SAVED = res.ok ? await res.json() : null;
    } catch { SAVED = null; }
    if (SAVED && SAVED.version !== STATS_VERSION) SAVED = null;
  }
  const saved = SAVED?.seasons?.[season];
  let table = saved;
  let complete = !!saved?.complete;
  if (!complete) {
    const state = await get('/v1/state/nba', {});
    const live = state?.season === season && state.season_type === 'regular';
    const usable = saved?.keys?.join() === STAT_KEYS.join() ? saved : null;
    table = await sumWeeks(season, usable, (usable?.weeks ?? 0) + 1, live ? Number(state.week) || 1 : null);
    complete = !live && Number(season) < Number(state?.season ?? season);
  }
  TABLES[season] = { at: Date.now(), complete, table };
  return table;
}
// A player's season line from a table row.
export function lineFromTable(row, keys, scoring) {
  const s = Object.fromEntries(keys.map((k, i) => [k, row?.[i] ?? 0]));
  return withPercents({
    gp: s.gp, min: s.min, pts: s.pts, reb: s.reb, oreb: s.oreb, dreb: s.dreb, ast: s.ast, stl: s.stl, blk: s.blk, to: s.to, pf: s.pf,
    fgm: s.fgm, fga: s.fga, tpm: s.tpm, tpa: s.tpa, ftm: s.ftm, fta: s.fta, pm: s.plus_minus, dd: s.dd, td: s.td, tf: s.tf,
    fp: fantasy(s, scoring),
  });
}

const ageOn = (birth, today = new Date()) => {
  if (!birth) return null;
  const b = new Date(`${birth}T12:00:00`);
  let a = today.getFullYear() - b.getFullYear();
  if (today.getMonth() < b.getMonth() || (today.getMonth() === b.getMonth() && today.getDate() < b.getDate())) a--;
  return a;
};
const heightText = h => { const i = Number(h); return i > 0 ? `${Math.floor(i / 12)}'${i % 12}"` : ''; };
const NBA_POS = new Set(['PG', 'SG', 'G', 'SF', 'PF', 'F', 'C']);

// League scoring for a season (each season's own: 2023-24 counted points at 0.5).
async function scoringFor(DATA, season) {
  const s = DATA.seasons.find(x => x.season === season);
  return s ? (await get(`/v1/league/${s.leagueId}`, {}))?.scoring_settings ?? {} : {};
}

// ---------- Awards + rings on the player card (owner, Oct 25 2026) ----------

// Every award a player got on the season banners, with the same functions and rules as the Awards page and
// the Record Book's Awards category (completed seasons with a champion). fo = frontOffice(DATA, 'all').
// { pid: [{ s, label, kind: 'indiv' | 'team', o (fantasy team the banner names) }] }.
export function playerAwards(DATA, fo) {
  const out = {};
  const add = (pid, s, label, kind, o) => { if (pid) (out[pid] ??= []).push({ s, label, kind, o: o ?? null }); };
  for (const season of DATA.seasons.filter(x => x.status === 'complete' && x.champion)) {
    const s = season.season;
    const poy = playerOfTheYear(DATA, s)[0];
    if (poy) add(poy.pid, s, 'Player of the Year', 'indiv', poy.team);
    const mvp = mvpRace(DATA, fo, s, 1)[0];
    if (mvp) add(mvp.pid, s, 'League MVP', 'indiv', mvp.o);
    const rookies = rookieClass(DATA, fo, s);
    if (rookies.roy) add(rookies.roy.pid, s, 'Rookie of the Year', 'indiv', rookies.roy.o);
    const cmvp = championshipMvp(DATA, s);
    if (cmvp) add(cmvp.pid, s, 'Championship MVP', 'indiv', season.champion);
    const stars = allStars(DATA, fo, s, ALL_STAR_POSITIONS, ALL_STARS_FROM);
    for (const x of stars?.awarded ? Object.values(stars.teams).flat() : []) add(x.pid, s, 'All-Star', 'team', x.o);
    for (const x of allFantasy(DATA, fo, s)) add(x.pid, s, 'All-Fantasy', 'team', x.o);
    for (const x of rookies.team ?? []) add(x.pid, s, 'All-Rookie', 'team', x.o);
    const steal = draftOfYear(DATA, s)?.steal;
    if (steal) add(steal.pid, s, 'Steal of the Draft', 'indiv', steal.o);
  }
  return out;
}

// Championship rings: everyone on the champion's roster in championship week, taxi squad excluded (IR
// counts). Sleeper keeps each finished season's final rosters (its league is closed after the final, and
// the final week's lineup lists exactly that roster), so roster players minus taxi. { pid: [{ s, o }] }.
export async function championshipRings(DATA) {
  const out = {};
  await Promise.all(DATA.seasons.filter(x => x.status === 'complete' && x.champion).map(async season => {
    const r = ((await get(`/v1/league/${season.leagueId}/rosters`, [])) ?? []).find(x => x.owner_id === season.champion);
    const taxi = new Set(r?.taxi ?? []);
    for (const pid of r?.players ?? []) if (!taxi.has(pid)) (out[pid] ??= []).push({ s: season.season, o: season.champion });
  }));
  return out;
}

// Roster % across all Sleeper leagues (owner, Oct 25 2026): Sleeper's research feed for this season's
// current week, { pid: { owned, started } } (percent of leagues; a few hundred players).
export async function rosterShares(season) {
  const state = await get('/v1/state/nba', {});
  const week = state?.season === season && state.season_type === 'regular' ? Math.max(1, Number(state.week) || 1) : 1;
  return get(`/players/nba/research/regular/${season}/${week}`, {});
}

// Adds up season lines (each already scored with its own season's league scoring).
function sumLines(lines) {
  const line = Object.fromEntries(SUMS.map(k => [k, 0]));
  for (const l of lines) for (const k of SUMS) line[k] += l[k] ?? 0;
  return withPercents(line);
}
const wkKey = (s, w) => Number(s) * 100 + Number(w);
// Which fantasy team had a player in week k: the latest stint (frontoffice.js) that started on or
// before k and hadn't ended before it, the same rule Front Office uses for locked points.
export const ownerAtWeek = (stints, k) => stints.filter(s => s.start <= k && (s.end == null || s.end >= k)).sort((a, b) => a.start - b.start).at(-1)?.o ?? null;

// Locked points (starters' points that counted, every game type, same as the Player Index) by player:
// { pid: { pts, starts } }. season 'career' = every season; owner = only that team's (null = any team).
export function lockedTotals(DATA, { season = 'career', owner = null } = {}) {
  const out = {};
  for (const x of DATA.playerWeeks ?? []) {
    if (season !== 'career' && x.s !== season) continue;
    if (owner && x.o !== owner) continue;
    const r = (out[x.pid] ??= { pts: 0, starts: 0 });
    r.pts = Math.round((r.pts + x.p) * 10) / 10;
    r.starts++;
  }
  return out;
}

// The page's player list. list: 'team' (owner's roster), 'fa' (waiver wire: active players with an NBA
// team on no roster) or 'league' (every rostered player); rosters are today's. season = a season, or
// 'career' (team and league lists, owner Oct 25 2026): League = every league season added up; Team =
// only games from weeks he was on that team (needs stints = frontOffice(DATA).stints; his game logs).
// { list, owner, statSeason, players: [{ pid, owner, slot, bio..., tot, avg }], top, through }.
export async function loadBreakdown(DATA, { list = 'team', owner, season: statSeason, stints = [] }) {
  const cur = DATA.seasons.at(-1);
  const career = statSeason === 'career';
  const seasons = career ? DATA.seasons.map(s => s.season) : [statSeason];
  const [league, rosters, all, tables, scorings] = await Promise.all([
    get(`/v1/league/${cur.leagueId}`, {}),
    get(`/v1/league/${cur.leagueId}/rosters`, []),
    get('/v1/players/nba', {}),
    // Team career works from game logs, so it needs only this season's table (for the ring).
    Promise.all((career && list === 'team' ? [cur.season] : seasons).map(seasonTable)),
    Promise.all(seasons.map(s => scoringFor(DATA, s))),
  ]);
  const research = await rosterShares(cur.season);
  // Nicknames managers gave players in Sleeper (roster metadata p_nick_{pid}); a team keeps them after
  // the player leaves. { pid: { owner: nickname } }.
  const nicks = {};
  for (const r of rosters ?? []) {
    for (const [k, v] of Object.entries(r.metadata ?? {})) {
      const m = /^p_nick_(\d+)$/.exec(k);
      if (m && String(v ?? '').trim()) (nicks[m[1]] ??= {})[r.owner_id] = String(v).trim();
    }
  }
  const scoringOf = Object.fromEntries(seasons.map((s, i) => [s, scorings[i]]));
  const slots = (league.roster_positions ?? []).filter(p => p !== 'BN');
  // Where every rostered player is: { pid: { owner, slot, order } }.
  const where = {};
  for (const r of rosters ?? []) {
    const reserve = new Set(r.reserve ?? []);
    const taxi = new Set(r.taxi ?? []);
    (r.starters ?? []).forEach((pid, i) => { if (pid && pid !== '0') where[pid] = { owner: r.owner_id, slot: slots[i] ?? 'UTIL', order: i }; });
    for (const pid of r.players ?? []) where[pid] ??= { owner: r.owner_id, slot: reserve.has(pid) ? 'IR' : taxi.has(pid) ? 'TX' : 'BN', order: -1 };
  }
  let ids;
  if (list === 'team') {
    if (!(rosters ?? []).some(r => r.owner_id === owner)) return null;
    ids = Object.keys(where).filter(pid => where[pid].owner === owner);
  } else if (list === 'league') {
    ids = Object.keys(where);
  } else {
    ids = Object.keys(all ?? {}).filter(pid => /^\d+$/.test(pid) && !where[pid] && all[pid]?.team && all[pid].active !== false && NBA_POS.has(all[pid].position));
  }

  // Season lines per player.
  const totals = {};
  if (career && list === 'team') {
    // Only his games in weeks this team had him, from each season's game log he spent time here.
    const byPid = {};
    for (const st of stints) if (ids.includes(st.pid)) (byPid[st.pid] ??= []).push(st);
    await Promise.all(ids.map(async pid => {
      const mine = (byPid[pid] ?? []).filter(st => st.o === owner);
      const touched = seasons.filter(s => mine.some(st => st.start <= wkKey(s, 99) && (st.end == null || st.end >= wkKey(s, 0))));
      const kept = (await Promise.all(touched.map(s => gameLog(DATA, pid, s).then(games => games.filter(g => ownerAtWeek(byPid[pid], wkKey(s, g.week)) === owner)))))
        .flat();
      totals[pid] = totalOf(kept);
    }));
  } else {
    for (const pid of ids) totals[pid] = sumLines(seasons.map((s, i) => lineFromTable(tables[career ? i : 0].players[pid], tables[career ? i : 0].keys, scoringOf[s])));
  }

  const players = ids.map(pid => {
    const p = all?.[pid] ?? {};
    const at = where[pid];
    const tot = totals[pid];
    return {
      pid, owner: at?.owner ?? null, slot: at?.slot ?? 'FA', order: at?.order ?? -1,
      first: p.first_name ?? '', last: p.last_name ?? '',
      name: p.full_name ?? (`${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || DATA.players?.[pid]?.n || `Player ${pid}`),
      team: p.team ?? DATA.players?.[pid]?.t ?? '',
      pos: p.fantasy_positions?.length ? p.fantasy_positions : [p.position ?? DATA.players?.[pid]?.pos].filter(Boolean),
      mainPos: p.position ?? DATA.players?.[pid]?.pos ?? '',
      number: p.number ?? null,
      height: heightText(p.height), weight: p.weight ? `${p.weight} lbs` : '',
      birth: p.birth_date ?? DATA.birth?.[pid] ?? null,
      age: ageOn(p.birth_date ?? DATA.birth?.[pid]) ?? p.age ?? null,
      exp: p.years_exp ?? null,
      college: p.college ?? '', country: p.birth_country ?? '',
      injury: p.injury_status ?? null, injuryPart: p.injury_body_part ?? '', injuryNote: p.injury_notes ?? '',
      // Roster % / start % across all Sleeper leagues this week (null = not in Sleeper's list).
      owned: research?.[pid]?.owned ?? null, started: research?.[pid]?.started ?? null,
      // His current team's nickname for him, then other teams' (older owners).
      nick: (at && nicks[pid]?.[at.owner]) || null,
      nickOthers: Object.entries(nicks[pid] ?? {}).filter(([o]) => o !== at?.owner).map(([o, n]) => ({ owner: o, n })),
      tot, avg: averages(tot),
    };
  });
  // The NBA's best FP/G (players with a quarter of the most games played) in the latest season
  // shown: the top of the card's ring.
  const table = tables.at(-1);
  const sc = scoringOf[career ? cur.season : statSeason] ?? scorings.at(-1);
  const rows = Object.values(table.players).map(r => lineFromTable(r, table.keys, sc));
  const most = Math.max(0, ...rows.map(l => l.gp));
  const top = Math.max(0, ...rows.filter(l => l.gp >= most / 4 && l.gp).map(l => l.fp / l.gp));
  return { list, owner, statSeason, players, top, through: table.through };
}

// One player's games in a season, newest first: [{ date, week, opp, away, dnp, line }].
// DNP rows (Sleeper lists them with empty stats) are kept and marked.
export async function gameLog(DATA, pid, season) {
  const [weeks, scoring] = await Promise.all([
    get(`/stats/nba/player/${pid}?season_type=regular&season=${season}&grouping=week`, {}),
    scoringFor(DATA, season),
  ]);
  return Object.values(weeks ?? {}).flat()
    .filter(g => g?.date)
    .map(g => ({ date: g.date, week: g.week, opp: g.opponent ?? '', away: !!g.is_away_team, team: g.team ?? '', dnp: !played(g.stats), line: statLine(g.stats ?? {}, scoring) }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

// A player's season-by-season totals, each from that season's game log.
export async function seasonLines(DATA, pid, seasons) {
  return (await Promise.all(seasons.map(async season => {
    const games = await gameLog(DATA, pid, season);
    const tot = totalOf(games);
    return tot.gp ? { season, team: games.find(g => !g.dnp)?.team ?? '', tot } : null;
  }))).filter(Boolean);
}
