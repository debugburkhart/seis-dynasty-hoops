// 2K-style team breakdown (Test features in the commish office, owner Oct 2026): a player list
// (one fantasy team's roster, the waiver wire, or every rostered player in the league) with NBA bio
// info and box-score stats from Sleeper, plus fantasy points under that season's league scoring.
// No DOM here; app.js draws it (renderBreakdown). The nightly job (scripts/update.mjs) saves the
// season stat tables (updateSeasonStats -> data/season-stats.json).

import { get } from './commish.js';
import { ALL_STARS_FROM, exhibitionRow } from './config.js';
import { ALL_STAR_POSITIONS } from './corrections.js';
import { allFantasy, allStars, championshipMvp, mvpRace, playerOfTheYear, rookieClass } from './awards.js';
import { draftOfYear } from './draft.js';
import { normName } from './scout.js';
import { weekBoxes } from './locks.js';
import { CANDIDATES as SLP_QUERIES, countedGame, gql, locksFromLegs } from './sleeperpriv.js';
const LOCKS_QUERY = SLP_QUERIES.find(c => c.id === 'locks').query;
const BLOCK_QUERY = SLP_QUERIES.find(c => c.id === 'block').query;

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
export const NBA_TEAM_CODES = Object.keys(NBA_TEAMS);
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
  // Usage rate (Basketball-Reference's formula): share of his team's plays he ended (shot, free-throw trip or
  // turnover) while on the floor. Needs the team totals of his games (season tables); game logs alone give null.
  const tmPlays = (line.tmFga ?? 0) + 0.44 * (line.tmFta ?? 0) + (line.tmTo ?? 0);
  line.usg = tmPlays > 0 && line.min > 0 && line.tmMin > 0 ? (100 * (line.fga + 0.44 * line.fta + line.to) * (line.tmMin / 5)) / (line.min * tmPlays) : null;
  return line;
}
// Season totals added up from a game log. Sleeper's season-total feeds are not used for stats:
// they run a day behind, have no plus/minus, and carry bonus flags (40/50 points, 15 assists,
// 20 rebounds) a player never earned (Banchero 2025-26: 2,568 FP vs 2,560 from his games).
const SUMS = ['gp', 'min', 'pts', 'reb', 'oreb', 'dreb', 'ast', 'stl', 'blk', 'to', 'pf', 'fgm', 'fga', 'tpm', 'tpa', 'ftm', 'fta', 'pm', 'dd', 'td', 'tf', 'fp',
  'tmFga', 'tmFta', 'tmTo', 'tmMin']; // team totals in his games (season tables only; usage rate)
export function totalOf(games) {
  const line = Object.fromEntries(SUMS.map(k => [k, 0]));
  let gs = 0;
  for (const g of games) {
    if (g.dnp) continue;
    for (const k of SUMS) line[k] += g.line[k] ?? 0;
    gs = gs === null || g.gs === null ? null : gs + (g.gs ?? 0); // games started: null when a season isn't collected yet
  }
  line.gs = gs;
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
  'plus_minus', 'dd', 'td', 'tf', 'ff', 'bonus_pt_40p', 'bonus_pt_50p', 'bonus_ast_15p', 'bonus_reb_20p',
  // His TEAM's totals in the games he played (for usage rate; owner, Oct 27 2026): FGA, FTA, turnovers, minutes.
  'tm_fga', 'tm_fta', 'tm_to', 'tm_min'];
export const STATS_VERSION = 3; // 2: All-Star Game rows dropped (Oct 26 2026); 3: team totals for usage (Oct 27 2026)
const API = 'https://api.sleeper.com';
// One week of box scores; a failed read throws (a missing week must never be saved as zeros).
async function weekRows(season, week) {
  const res = await fetch(`${API}/stats/nba/${season}/${week}?season_type=regular&t=${Date.now()}`);
  if (!res.ok) throw new Error(`Sleeper box scores ${season} week ${week}: HTTP ${res.status}`);
  return ((await res.json()) ?? []).filter(r => !exhibitionRow(r)); // no All-Star Game (config.js)
}
const r2 = x => Math.round(x * 100) / 100;
function addRows(table, rows) {
  // Team totals per game (every player of that team in that game): what usage rate compares a player with.
  const team = {};
  for (const g of rows) {
    if (!/^\d+$/.test(g.player_id) || !played(g.stats)) continue;
    const t = (team[`${g.game_id}|${g.team}`] ??= { tm_fga: 0, tm_fta: 0, tm_to: 0, tm_min: 0 });
    t.tm_fga += n(g.stats, 'fga'); t.tm_fta += n(g.stats, 'fta'); t.tm_to += n(g.stats, 'to'); t.tm_min += minutes(g.stats);
  }
  for (const g of rows) {
    if (!/^\d+$/.test(g.player_id) || !played(g.stats)) continue;
    const a = (table.players[g.player_id] ??= STAT_KEYS.map(() => 0));
    const tm = team[`${g.game_id}|${g.team}`];
    STAT_KEYS.forEach((k, i) => { a[i] = r2(a[i] + (k === 'gp' ? 1 : k === 'min' ? minutes(g.stats) : k.startsWith('tm_') ? tm[k] : n(g.stats, k))); });
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
// seasons are built once and kept. The season in progress is REBUILT FROM WEEK 1 EVERY NIGHT (owner, Nov 12 2026):
// Sleeper corrects box scores days later (LeBron's removed technical foul: the table said 302, his games 304; 12
// players differed), and a week added once kept the old numbers forever. A season is rebuilt one last time when it
// finishes, then frozen. A failed read keeps last night's table for that season.
export async function updateSeasonStats(DATA, prev, { log = () => {} } = {}) {
  const state = await (await fetch(`${API}/v1/state/nba?t=${Date.now()}`)).json();
  const old = prev?.version === STATS_VERSION ? prev.seasons ?? {} : {};
  const out = { version: STATS_VERSION, at: new Date().toISOString(), seasons: {} };
  for (const { season } of DATA.seasons) {
    const was = old[season];
    const { weeks, complete } = doneWeeks(state, season);
    if (was?.complete) { out.seasons[season] = was; continue; }
    if (!complete && weeks === 0) continue;
    try {
      const t = await sumWeeks(season, null, 1, weeks);
      out.seasons[season] = { ...t, complete };
      log(`Season stats ${season}: weeks 1-${t.weeks} rebuilt (${Object.keys(t.players).length} players, through ${t.through})${complete ? ', final' : ''}.`);
    } catch (e) {
      if (was) out.seasons[season] = was;
      log(`Season stats ${season}: rebuild failed (${e.message}); kept last night's table.`);
    }
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
    tmFga: s.tm_fga, tmFta: s.tm_fta, tmTo: s.tm_to, tmMin: s.tm_min,
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

// Injury return estimates (owner, Oct 26 2026: "week/day/month estimate ... also Out for season"). Sleeper has
// none, so ESPN's public injury feed (CORS open, like the scoreboard gm.js reads for tip-offs): every listed
// injury has details.returnDate (an estimate), fantasyStatus OFS = out for the season, the injury date and a
// one-line news note. Matched to Sleeper ids by name (normName) and NBA team; browser only, cached 15 min;
// a failed read = null (no estimates shown). { pid: { status, since, ret, ofs, type, side, detail, note } }.
const ESPN_INJ_URL = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries';
let ESPN_INJ = null;
export async function espnInjuries(all) {
  if (ESPN_INJ && Date.now() - ESPN_INJ.at < 15 * 60e3) return ESPN_INJ.map;
  let map = null;
  try {
    const res = await fetch(ESPN_INJ_URL);
    if (!res.ok) throw new Error(`ESPN injuries ${res.status}`);
    const feed = await res.json();
    const byName = {};
    for (const [pid, p] of Object.entries(all ?? {})) {
      if (/^\d+$/.test(pid) && p?.team) (byName[normName(p.full_name ?? `${p.first_name} ${p.last_name}`)] ??= []).push(pid);
    }
    const codeOf = Object.fromEntries(Object.entries(NBA_TEAMS).map(([code, n]) => [n, code]));
    map = {};
    for (const team of feed?.injuries ?? []) {
      const code = codeOf[team.displayName];
      for (const i of team.injuries ?? []) {
        const cands = byName[normName(i.athlete?.displayName)] ?? [];
        const pid = cands.find(c => all[c].team === code) ?? (cands.length === 1 ? cands[0] : null);
        if (!pid) continue;
        const d = i.details ?? {};
        map[pid] = {
          status: i.status ?? null, since: i.date?.slice(0, 10) ?? null, ret: d.returnDate ?? null,
          ofs: d.fantasyStatus?.abbreviation === 'OFS', type: d.type ?? '', side: d.side ?? '', detail: d.detail ?? '',
          note: i.shortComment ?? '',
        };
      }
    }
  } catch { map = null; }
  ESPN_INJ = { at: Date.now(), map };
  return map;
}
// Plain-words estimate: { text, tone: 'season' | 'soon' | 'days' | 'weeks' | 'months' } or null.
export function returnEstimate(e, today = new Date()) {
  if (!e) return null;
  if (e.ofs) return { text: 'Out for season', tone: 'season' };
  if (!e.ret) return null;
  const at = new Date(`${e.ret}T12:00:00`);
  const days = Math.round((at - today) / 864e5);
  const when = at.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (days <= 1) return { text: 'Est. return: any day now', tone: 'soon' };
  const span = days < 14 ? `~${days} days` : days < 60 ? `~${Math.round(days / 7)} weeks` : `~${Math.round(days / 30.4)} months`;
  return { text: `Est. return ${when} (${span})`, tone: days < 14 ? 'days' : days < 60 ? 'weeks' : 'months' };
}

// ---------- Injury changes (owner, Nov 2 2026: "recently added names and updates to current injuries") ----------
// Neither Sleeper nor ESPN keeps an injury history, so the nightly job saves a snapshot of every injured player and
// logs what changed since the last one -> data/injury-log.json { version, at, since, last: { pid: state }, events:
// [{ at, pid, k: 'new' | 'upd' | 'off', ch: [[field, from, to]], st: state }] } (oldest first, INJ_LOG_DAYS kept).
// state = { nm, t, s (Sleeper status), b (body part), n (Sleeper note), e (ESPN status), r (ESPN est. return), o (1 =
// out for season), c (ESPN news note), d (ESPN date), nu (Sleeper news_updated ms) }. The page adds a live
// comparison of today's feeds with the newest snapshot, so changes since the last run show right away.
export const INJ_LOG_VERSION = 1;
export const INJ_LOG_DAYS = 30;
// Fields that make an event (the rest ride along for display).
export const INJ_FIELDS = ['s', 'e', 'o', 'r', 'b', 'n', 'c'];
export function injuryState(all, espn) {
  const out = {};
  for (const [pid, p] of Object.entries(all ?? {})) {
    if (!/^\d+$/.test(pid) || !p?.team || p.active === false) continue;
    const e = espn?.[pid];
    if (!p.injury_status && !e) continue;
    out[pid] = {
      nm: p.full_name ?? `${p.first_name} ${p.last_name}`, t: p.team,
      s: p.injury_status ?? null, b: p.injury_body_part ?? null, n: p.injury_notes ?? null,
      e: e?.status ?? null, r: e?.ret ?? null, o: e?.ofs ? 1 : 0, c: e?.note || null, d: e?.since ?? null,
      nu: p.news_updated ?? null,
    };
  }
  return out;
}
// Today's state; when ESPN couldn't be read (espnMap null / empty) its fields are kept from `last`.
export function injuryNow(all, espnMap, last = {}) {
  const fresh = espnMap && Object.keys(espnMap).length;
  const cur = injuryState(all, fresh ? espnMap : {});
  if (fresh) return cur;
  for (const [pid, was] of Object.entries(last)) {
    if (cur[pid]) cur[pid] = { ...cur[pid], e: was.e, r: was.r, o: was.o, c: was.c, d: was.d };
    else if (was.e && all?.[pid]?.team && all[pid].active !== false) cur[pid] = { ...was, s: all[pid].injury_status ?? null, t: all[pid].team };
  }
  return cur;
}
// What changed between two snapshots: new on the report, updated (any INJ_FIELDS value), off the report.
export function injuryDiff(prev, cur, at) {
  const events = [];
  for (const [pid, st] of Object.entries(cur)) {
    const was = prev[pid];
    if (!was) { events.push({ at, pid, k: 'new', ch: [], st }); continue; }
    const ch = INJ_FIELDS.filter(f => (was[f] ?? null) !== (st[f] ?? null)).map(f => [f, was[f] ?? null, st[f] ?? null]);
    if (ch.length) events.push({ at, pid, k: 'upd', ch, st });
  }
  for (const [pid, was] of Object.entries(prev)) if (!cur[pid]) events.push({ at, pid, k: 'off', ch: [], st: was });
  return events;
}
// Nightly: snapshot + log. The first run only saves the snapshot (no flood of "new" for everyone already hurt).
// A failed ESPN read keeps last night's ESPN fields, so a blip never logs every estimate as removed.
export async function updateInjuryLog(prev, all, { log = () => {} } = {}) {
  const espnMap = await espnInjuries(all).catch(() => null);
  const at = new Date().toISOString();
  const ok = prev?.version === INJ_LOG_VERSION;
  const last = ok ? prev.last : {};
  const cur = injuryNow(all, espnMap, last);
  const events = ok ? injuryDiff(last, cur, at) : [];
  const cut = new Date(Date.now() - INJ_LOG_DAYS * 864e5).toISOString();
  const kept = [...(ok ? prev.events ?? [] : []), ...events].filter(x => x.at >= cut);
  log(`Injury log: ${Object.keys(cur).length} on the report, ${events.length} changes (${events.filter(x => x.k === 'new').length} new, ${events.filter(x => x.k === 'upd').length} updated, ${events.filter(x => x.k === 'off').length} off)${espnMap ? '' : ' · ESPN unavailable, kept last ESPN fields'}`);
  return { version: INJ_LOG_VERSION, at, since: ok ? prev.since : at, last: cur, events: kept };
}

// ---------- Player news + trade talk (owner, Oct 26 2026) ----------
// Sleeper's per-player news feed /players/nba/{pid}/news (what the Sleeper app shows on a player page: FantasyPros /
// RotoWire blurbs; Sleeper keeps only the latest few per player): [{ published (ms), source, metadata: { title,
// description, analysis, url } }]. Each item goes to EXACTLY ONE list: trade talk when its words match TRADE_TALK,
// else news (moved, never copied). TRADE_TALK is tight on purpose: rumor wording only, so game recaps that mention
// a "former team" or an old draft-day trade stay in news (tested on 120 rostered players' news Oct 26 2026).
export const TRADE_TALK = new RegExp([
  'trade request', 'request(?:ed|s|ing)? (?:a |his )?trade', 'wants? out of', 'wants? to be (?:traded|moved|dealt)', 'trade (?:talks?|discussions?|market|chatter|rumou?rs?|candidate|target|block|speculation|interest|package|offers?)',
  'on the (?:trade|trading) block', '(?:being )?shopp(?:ed|ing)', 'gaug(?:e|ed|ing) (?:the )?(?:trade )?(?:market|interest)', 'suitors?',
  // "interested in acquiring", but not fantasy advice ("for those interested in acquiring Giddey ... buy-low").
  '(?<!those )interest(?:ed)? in (?:acquiring|trading for)', '(?:have|has|are|is) (?:shown|expressed|registered) interest', 'could be (?:traded|moved|dealt)',
  '(?:open|willing) to (?:trading|moving|dealing)', 'available (?:in|via|for) (?:a )?trades?', 'explor(?:e|es|ed|ing) (?:a |his )?trade',
  // Only an UPCOMING deadline ("acquired at the trade deadline" = an old trade, Jaren Jackson Jr. Oct 2026).
  '(?:ahead of|before|by|leading up to|approaching) (?:the|this season\'s|February\'s) (?:trade )?deadline',
  'buyout', 'asked (?:out|to be traded)',
].join('|'), 'i');
export const isTradeTalk = item => TRADE_TALK.test([item?.metadata?.title, item?.metadata?.description, item?.metadata?.analysis].filter(Boolean).join(' '));
// { news: [...], trade: [...] }, newest first, each item in one list only.
export async function playerNews(pid) {
  const items = ((await get(`/players/nba/${pid}/news`, [])) ?? []).filter(x => x?.metadata?.title || x?.metadata?.description)
    .sort((a, b) => (b.published ?? 0) - (a.published ?? 0));
  const out = { news: [], trade: [] };
  for (const x of items) (isTradeTalk(x) ? out.trade : out.news).push(x);
  return out;
}

// ---------- Auto tags (owner, Oct 26 2026) ----------
// Facts the site sets on players by itself (can't be added or removed by hand), usable as filters like custom
// tags. app.js decides who gets which (autoTagsOf); this file supplies the data that needs Sleeper.
// Recently traded comes as TWO tags so they're never confused (owner, Oct 26 2026): "League trade" = traded
// between fantasy teams here, "NBA trade" = a real NBA trade (ESPN), both within TRADED_DAYS.
// Order = order in the filter row and the Tags column sort (owner's second batch Oct 26 2026 after #3 option).
export const AUTO_TAGS = ['Injured', 'On the trade block', 'Trade talk','League trade', 'NBA trade', 'League pickup', 'Trending add',
  '#1 option', '#2 option', '#3 option', '4-game week', '2-game week', 'Hot', 'Cold', 'Minutes up',
  'Rookie', 'Last taxi season', 'Made Taxi POTW']; // Contract year, Extension next summer, Dynasty riser / faller, Top 100 prospect removed (owner, Nov 11 2026)
export const TRADE_TALK_DAYS = 30; // "Trade talk" = a trade-talk news item published in the last 30 days
export const TRADED_DAYS = 14; // "League trade" / "NBA trade" = traded in the last 14 days
export const PICKUP_DAYS = 7; // "League pickup" = added off waivers / free agency here in the last 7 days
export const TRENDING_TOP = 25; // "Trending add" = among Sleeper's 25 most-added NBA players in the last 48 hours
export const DYN_MOVE = 5; // "Dynasty riser / faller" = dynasty score up / down 5+ since about 7 days ago
// Hot / Cold / Minutes up: his last FORM.games games vs his games before them this season (needs FORM.minGp
// games in all). Hot / Cold = FP/G 20%+ AND 5+ points above / below; Minutes up = 5+ minutes AND 20%+ more.
// floor: only players who matter (Hot: recent 15+ FP/G, Cold: 15+ before, Minutes up: 15+ min now), so deep
// bench players going 2 -> 8 FP/G don't fill the list.
export const FORM = { games: 3, minGp: 5, pct: 0.2, fp: 5, min: 5, floor: 15 };

// This fantasy week's NBA games per team (Sleeper's schedule, week = Sleeper's NBA state week in the regular
// season): { week, teams: { BOS: [{ date, opp, home, done }] } } or null outside the regular season.
export async function weekSlate() {
  const state = await get('/v1/state/nba', {});
  if (state?.season_type !== 'regular') return null;
  const week = Number(state.week) || 1;
  const schedule = await get(`/schedule/nba/regular/${state.season}`, []);
  const teams = {};
  for (const g of schedule ?? []) {
    if (g.week !== week) continue;
    const h = g.home?.team, a = g.away?.team;
    if (h) (teams[h] ??= []).push({ date: g.date, opp: a, home: true, done: g.status === 'complete' });
    if (a) (teams[a] ??= []).push({ date: g.date, opp: h, home: false, done: g.status === 'complete' });
  }
  for (const l of Object.values(teams)) l.sort((x, y) => (x.date < y.date ? -1 : 1));
  return { week, teams };
}

// Recent form for Hot / Cold / Minutes up: per player { recent: { gp, fpg, min }, before: { gp, fpg, min } } this
// season (league scoring), from the season table (all games) and the per-game box scores of this week and the
// 2 weeks before (his last FORM.games games played; DNPs skipped). Cached 10 minutes.
let FORM_HIT = null;
export async function recentForm(DATA) {
  if (FORM_HIT && Date.now() - FORM_HIT.at < 600_000) return FORM_HIT.out;
  const cur = DATA.seasons.at(-1).season;
  const state = await get('/v1/state/nba', {});
  const week = state?.season === cur && state.season_type === 'regular' ? Number(state.week) || 1 : null;
  if (!week) return {};
  const weeks = [week, week - 1, week - 2].filter(w => w >= 1);
  const [table, scoring, ...rowsByWeek] = await Promise.all([seasonTable(cur), scoringFor(DATA, cur), ...weeks.map(w => weekRows(cur, w).catch(() => []))]);
  const games = {};
  for (const g of rowsByWeek.flat()) if (/^\d+$/.test(g.player_id) && played(g.stats) && minutes(g.stats) > 0) (games[g.player_id] ??= []).push(g);
  const out = {};
  for (const [pid, list] of Object.entries(games)) {
    const all = lineFromTable(table.players[pid], table.keys, scoring);
    if (!(all.gp >= FORM.minGp)) continue;
    const last = list.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, FORM.games);
    if (last.length < FORM.games) continue;
    const fp = last.reduce((s, g) => s + fantasy(g.stats, scoring), 0);
    const min = last.reduce((s, g) => s + minutes(g.stats), 0);
    const gpB = all.gp - last.length;
    if (gpB < 1) continue;
    const r1 = x => Math.round(x * 10) / 10;
    out[pid] = {
      recent: { gp: last.length, fpg: r1(fp / last.length), min: r1(min / last.length) },
      before: { gp: gpB, fpg: r1((all.fp - fp) / gpB), min: r1((all.min - min) / gpB) },
    };
  }
  FORM_HIT = { at: Date.now(), out };
  return out;
}

// Sleeper's most-added NBA players across all leagues, last 48 hours: { pid: { rank, count } }.
export async function trendingAdds() {
  const list = await get(`/v1/players/nba/trending/add?lookback_hours=48&limit=${TRENDING_TOP}`, []);
  // Sleeper's list isn't in count order: rank by adds.
  return Object.fromEntries([...(list ?? [])].sort((a, b) => b.count - a.count).map((x, i) => [x.player_id, { rank: i + 1, count: x.count }]));
}

// Players added in THIS league off waivers / free agency within PICKUP_DAYS: { pid: { ts, to, bid } }.
export function recentPickups(DATA, now = Date.now()) {
  const out = {};
  for (const x of DATA.transactions ?? []) {
    if ((x.type !== 'waiver' && x.type !== 'free_agent') || !(x.ts >= now - PICKUP_DAYS * 864e5)) continue;
    for (const [pid, to] of Object.entries(x.adds ?? {})) if (!out[pid] || out[pid].ts < x.ts) out[pid] = { ts: x.ts, to, bid: x.bid ?? null, type: x.type };
  }
  return out;
}

// #1 / #2 / #3 option: each NBA team's top 3 players by fantasy points per game this season (league scoring),
// among players Sleeper lists on that team now with at least half as many games as the team's most-played
// player (so a one-game cameo can't top it early on). { pid: { n, fpg, gp, team } }, cached 2 minutes.
const OPTIONS = {};
export async function teamOptions(DATA) {
  const season = DATA.seasons.at(-1).season;
  const hit = OPTIONS[season];
  if (hit && Date.now() - hit.at < 120_000) return hit.out;
  const [table, scoring, all] = await Promise.all([seasonTable(season), scoringFor(DATA, season), get('/v1/players/nba', {})]);
  const byTeam = {};
  for (const [pid, row] of Object.entries(table.players)) {
    const team = all?.[pid]?.team;
    if (!team || !NBA_TEAMS[team]) continue;
    const l = lineFromTable(row, table.keys, scoring);
    if (l.gp > 0) (byTeam[team] ??= []).push({ pid, gp: l.gp, fpg: l.fp / l.gp });
  }
  const out = {};
  for (const [team, list] of Object.entries(byTeam)) {
    const most = Math.max(...list.map(x => x.gp));
    list.filter(x => x.gp >= most / 2).sort((a, b) => b.fpg - a.fpg).slice(0, 3)
      .forEach((x, i) => { out[x.pid] = { n: i + 1, fpg: Math.round(x.fpg * 10) / 10, gp: x.gp, team }; });
  }
  OPTIONS[season] = { at: Date.now(), out };
  return out;
}

// Players moved in a trade in this league within TRADED_DAYS: { pid: { ts, to, from } } (newest trade wins).
export function recentTrades(DATA, now = Date.now()) {
  const out = {};
  for (const x of DATA.transactions ?? []) {
    if (x.type !== 'trade' || !(x.ts >= now - TRADED_DAYS * 864e5)) continue;
    for (const [pid, to] of Object.entries(x.adds ?? {})) {
      if (!out[pid] || out[pid].ts < x.ts) out[pid] = { ts: x.ts, to, from: x.drops?.[pid] ?? x.owners?.find(o => o !== to) ?? null };
    }
  }
  return out;
}

// Real NBA trades within TRADED_DAYS (owner, Oct 26 2026; kept apart from league trades): ESPN's public
// transactions feed (CORS open, newest first; limit=100 covers weeks). Entries are plain sentences, one per team
// ("Acquired G Ryan Nembhard from Dallas and G Luguentz Dort from Oklahoma City in a three-team trade that sent F
// Zaccharie Risacher to Dallas"), with no player ids, so for each entry that mentions a trade we tag the players
// Sleeper lists on THAT team now whose full name (normName) appears in the sentence = the players it got. Players
// it sent away are on another team now, so they aren't tagged by this entry (their new team's entry tags them).
// { pid: { ts, team, text } } (newest trade wins), cached 15 minutes; failure = null (no NBA trade tags).
const ESPN_TX_URL = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/transactions?limit=100';
let ESPN_TX = null;
export async function espnTrades(all, now = Date.now()) {
  if (ESPN_TX && Date.now() - ESPN_TX.at < 15 * 60e3 && ESPN_TX.now === now) return ESPN_TX.map;
  let map = null;
  try {
    const res = await fetch(ESPN_TX_URL);
    if (!res.ok) throw new Error(`ESPN transactions ${res.status}`);
    const feed = await res.json();
    const codeOf = Object.fromEntries(Object.entries(NBA_TEAMS).map(([code, n]) => [n, code]));
    const onTeam = {};
    for (const [pid, p] of Object.entries(all ?? {})) {
      if (/^\d+$/.test(pid) && p?.team) (onTeam[p.team] ??= []).push([pid, normName(p.full_name ?? `${p.first_name} ${p.last_name}`)]);
    }
    map = {};
    for (const x of feed?.transactions ?? []) {
      const ts = Date.parse(x.date);
      if (!(ts >= now - TRADED_DAYS * 864e5) || ts > now + 864e5 || !/\btrade\b/i.test(x.description ?? '')) continue;
      const team = codeOf[x.team?.displayName];
      const text = ` ${normName(x.description)} `;
      for (const [pid, nm] of onTeam[team] ?? []) {
        if (nm && text.includes(` ${nm} `) && (!map[pid] || map[pid].ts < ts)) map[pid] = { ts, team, text: x.description };
      }
    }
  } catch { map = null; }
  ESPN_TX = { at: Date.now(), now, map };
  return map;
}

// Trade talk for the whole league needs one news request per player, so the nightly job checks every rostered
// player and every active player with an NBA team (~550 requests, 8 at a time) -> data/trade-talk.json
// { version, at, checked, players: { pid: [published, title] } } (his newest trade-talk item, last 60 days).
// The page adds what it learns live when a player's card opens (his news is loaded then anyway).
export const TRADE_TALK_VERSION = 1;
export async function updateTradeTalk(DATA, { log = () => {} } = {}) {
  const cur = DATA.seasons.at(-1);
  const [all, rosters] = await Promise.all([get('/v1/players/nba', {}), get(`/v1/league/${cur.leagueId}/rosters`, [])]);
  const ids = new Set((rosters ?? []).flatMap(r => r.players ?? []));
  for (const [pid, p] of Object.entries(all ?? {})) if (/^\d+$/.test(pid) && p?.team && p.active !== false && NBA_POS.has(p.position)) ids.add(pid);
  const list = [...ids];
  const players = {};
  const since = Date.now() - 60 * 864e5;
  let i = 0, failed = 0;
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (i < list.length) {
      const pid = list[i++];
      try {
        const t = (await playerNews(pid)).trade.find(x => (x.published ?? 0) >= since);
        if (t) players[pid] = [t.published, t.metadata?.title || t.metadata?.description || ''];
      } catch { failed++; }
    }
  }));
  log(`Trade talk: ${list.length} players checked, ${Object.keys(players).length} with trade talk${failed ? `, ${failed} failed` : ''}`);
  return { version: TRADE_TALK_VERSION, at: new Date().toISOString(), checked: list.length, failed, players };
}
let TALK;
// ---------- NBA games started (owner, Oct 28 2026) ----------
// Sleeper's box scores don't say who started; ESPN's game summaries do (boxscore.players[].statistics[].athletes[]
// .starter, 10 per game, CORS open but ~0.5 MB each). The nightly job reads every finished regular-season game once
// -> data/nba-starts.json { version, at, seasons: { s: { full, through, dates: [days done], starts: { pid: [YYYYMMDD] },
// miss: [names] } } }. ESPN players are matched to Sleeper ids through Sleeper's own box-score rows of that date and
// team (normName), so traded / same-name players land right. The season in progress first, then past seasons a few
// hundred games a night (budget) until they're complete; `full` = every date through the season's end (or yesterday)
// is done, and pages only show a season's GS when it's full (never a partial count).
export const STARTS_VERSION = 1;
const ESPN_TEAM = { GS: 'GSW', NO: 'NOP', NY: 'NYK', SA: 'SAS', UTAH: 'UTA', WSH: 'WAS' };
export async function updateNbaStarts(DATA, prev, { log = () => {}, budget = 400 } = {}) {
  const out = prev?.version === STARTS_VERSION ? prev : { version: STARTS_VERSION, seasons: {} };
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date());
  const getJ = async url => { for (let i = 0; i < 3; i++) { try { const r = await fetch(url); if (r.ok) return await r.json(); } catch { /* retry */ } } return null; };
  let left = budget;
  for (const season of DATA.seasons.map(s => s.season).reverse()) { // newest first
    const S = (out.seasons[season] ??= { full: false, through: null, dates: [], starts: {}, miss: [] });
    if (S.full && season !== DATA.seasons.at(-1).season) continue;
    const schedule = await get(`/schedule/nba/regular/${season}`, []);
    const weekOf = {};
    for (const g of schedule ?? []) if (g.date && g.week) weekOf[g.date] ??= g.week;
    const dates = Object.keys(weekOf).filter(d => d < today).sort();
    const done = new Set(S.dates);
    const rowsByWeek = {};
    for (const d of dates) {
      if (done.has(d)) continue;
      if (left <= 0) break;
      const sb = await getJ(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${d.replaceAll('-', '')}`);
      if (!sb) break; // ESPN down: try again tomorrow
      // That day's NBA games (not the playoffs or the All-Star Game); a day is read only once all are final.
      const nba = e => (e.competitions?.[0]?.competitors ?? []).every(c => NBA_TEAMS[ESPN_TEAM[c.team?.abbreviation] ?? c.team?.abbreviation]);
      const events = (sb.events ?? []).filter(e => e.season?.type !== 3 && nba(e));
      if (events.some(e => !e.status?.type?.completed)) break;
      const w = weekOf[d];
      rowsByWeek[w] ??= await weekRows(season, w).catch(() => []);
      const sleeper = {}; // team -> normName -> pid, players with a Sleeper box row that date
      for (const r of rowsByWeek[w]) if (r.date === d && /^\d+$/.test(r.player_id)) {
        const nm = normName(r.player ? `${r.player.first_name} ${r.player.last_name}` : '');
        if (nm) (sleeper[r.team] ??= {})[nm] = r.player_id;
      }
      let ok = true;
      await Promise.all(events.map(async ev => {
        const sum = await getJ(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${ev.id}`);
        if (!sum) { ok = false; return; }
        for (const side of sum.boxscore?.players ?? []) {
          const a = side.team?.abbreviation;
          const team = ESPN_TEAM[a] ?? a;
          for (const block of side.statistics ?? []) for (const x of block.athletes ?? []) {
            if (!x.starter) continue;
            const nm = normName(x.athlete?.displayName);
            const pid = sleeper[team]?.[nm] ?? Object.values(sleeper).map(t => t[nm]).find(Boolean);
            if (pid) (S.starts[pid] ??= []).push(d.replaceAll('-', ''));
            else if (!S.miss.includes(`${x.athlete?.displayName} (${team} ${d})`)) S.miss.push(`${x.athlete?.displayName} (${team} ${d})`);
          }
        }
      }));
      if (!ok) break; // a game summary failed: redo this date next time
      left -= events.length;
      S.dates.push(d);
      S.through = d;
    }
    for (const list of Object.values(S.starts)) { const u = [...new Set(list)].sort(); list.length = 0; list.push(...u); }
    S.miss = S.miss.slice(-200);
    const need = dates.filter(d => !S.dates.includes(d));
    S.full = need.length === 0;
    log(`NBA starts ${season}: ${S.dates.length} of ${dates.length} days${S.full ? ' (complete)' : ''}, ${S.miss.length} unmatched`);
  }
  out.at = new Date().toISOString();
  return out;
}
let STARTS;
export async function loadNbaStarts() {
  if (STARTS !== undefined) return STARTS;
  try {
    const res = await fetch(`data/nba-starts.json?t=${Date.now()}`, { cache: 'no-store' });
    STARTS = res.ok ? await res.json() : null;
  } catch { STARTS = null; }
  if (STARTS && STARTS.version !== STARTS_VERSION) STARTS = null;
  return STARTS;
}
// Start dates (YYYYMMDD set) for a player in a season, or null when that season isn't complete yet.
export function startDates(starts, season, pid) {
  const S = starts?.seasons?.[season];
  return S?.full ? new Set(S.starts?.[pid] ?? []) : null;
}

// League Games Started (owner, Oct 28 2026): data/lgs.json written by scripts/lgs.mjs while games are played
// (it pushes straight to the repo without redeploying the site, so the page reads GitHub's raw copy first = minutes
// old, then the site's copy). lgsCounts -> { pid: { n (LGS), seen (games watched while on a roster, taxi/IR left
// out), u (unsure) } } for a season ('career' = every season) and an owner (null = any team).
const LGS_RAW = 'https://raw.githubusercontent.com/debugburkhart/seis-dynasty-hoops/main/data/lgs.json';
let LGS;
export async function loadLgs() {
  if (LGS !== undefined) return LGS;
  for (const url of [LGS_RAW, 'data/lgs.json']) {
    try {
      const res = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) { LGS = await res.json(); break; }
    } catch { /* next */ }
  }
  if (!LGS || LGS.version !== 1) LGS = null;
  return LGS;
}
export function lgsCounts(lgs, season, owner = null) {
  const out = {};
  for (const [s, S] of Object.entries(lgs?.seasons ?? {})) {
    if (season !== 'career' && s !== season) continue;
    for (const [pid, games] of Object.entries(S.p ?? {})) {
      for (const [v, o, flags = ''] of Object.values(games)) {
        if (owner && o !== owner) continue;
        if (flags.includes('k')) continue; // after his lock that week: not a start, not a game seen (owner, Oct 31 2026)
        if (flags.includes('r') && v !== 1) continue; // on taxi / IR: couldn't start
        const c = (out[pid] ??= { n: 0, seen: 0, u: 0 });
        if (v === 'u') c.u++; else { c.seen++; if (v === 1) c.n++; }
      }
    }
  }
  return out;
}

export async function loadTradeTalk() {
  if (TALK !== undefined) return TALK;
  try {
    const res = await fetch(`data/trade-talk.json?t=${Date.now()}`, { cache: 'no-store' });
    TALK = res.ok ? await res.json() : null;
  } catch { TALK = null; }
  if (TALK && TALK.version !== TRADE_TALK_VERSION) TALK = null;
  return TALK;
}

// Roster % across Sleeper leagues (owner, Oct 25 2026): Sleeper's research feed for this season's current
// week, { pid: { owned, started } } (percent of leagues). leagueType = our league's settings.type: the feed
// defaults to REDRAFT leagues; league_type=2 = dynasty leagues, what the Sleeper app shows in a dynasty
// league (owner, Oct 26 2026: Wendell Carter Jr. 85.6% / 46.9% dynasty vs 48.4% / 25.1% redraft).
export async function rosterShares(season, leagueType = 2) {
  const state = await get('/v1/state/nba', {});
  const week = state?.season === season && state.season_type === 'regular' ? Math.max(1, Number(state.week) || 1) : 1;
  return get(`/players/nba/research/regular/${season}/${week}?league_type=${leagueType}`, {});
}

// Player ranks under OUR league's scoring (owner, Oct 26 2026: "accurate to our league"): every NBA player
// with games that season, by total fantasy points (that season's league scoring, from the season stat
// table), overall and among players with the same main Sleeper position; ties share a rank. Same idea as
// Sleeper's rank_std / pos_rank_std (total points, main position) but with our scoring and no one-day lag.
// { pid: { ovr, pos } }, cached per season for 2 minutes (the live week changes it).
const RANKS = {};
export async function leagueRanks(DATA, season) {
  const hit = RANKS[season];
  if (hit && Date.now() - hit.at < 120_000) return hit.ranks;
  const [table, scoring, all] = await Promise.all([seasonTable(season), scoringFor(DATA, season), get('/v1/players/nba', {})]);
  const rows = Object.entries(table.players)
    .map(([pid, row]) => { const l = lineFromTable(row, table.keys, scoring); return { pid, fp: Math.round(l.fp * 10) / 10, gp: l.gp ?? 0, fpg: l.gp ? Math.round(l.fp / l.gp * 10) / 10 : 0, pos: all?.[pid]?.position ?? DATA.players?.[pid]?.pos ?? '' }; })
    .filter(r => r.fp > 0)
    .sort((a, b) => b.fp - a.fp);
  const ranks = {};
  const rankIn = (list, k = 'fp') => list.forEach((r, i) => { const prev = list[i - 1]; r.rk = prev && prev[k] === r[k] ? prev.rk : i + 1; });
  rankIn(rows);
  for (const r of rows) ranks[r.pid] = { ovr: r.rk, pos: null, fp: r.fp, avgOvr: null, avgPos: null };
  const byPos = {};
  for (const r of rows) if (r.pos) (byPos[r.pos] ??= []).push({ ...r });
  for (const list of Object.values(byPos)) { rankIn(list); for (const r of list) ranks[r.pid].pos = r.rk; }
  // Average ranks (owner, Nov 11 2026): by FP/G among players with FPG_MIN_SHARE of the most games played (same rule as
  // fpgRanks), overall and at his position; players under the cutoff get none.
  const most = Math.max(0, ...rows.map(r => r.gp));
  const need = Math.max(1, Math.round(most * FPG_MIN_SHARE));
  const avg = rows.filter(r => r.gp >= need).map(r => ({ ...r })).sort((a, b) => b.fpg - a.fpg);
  rankIn(avg, 'fpg');
  for (const r of avg) ranks[r.pid].avgOvr = r.rk;
  const avgPos = {};
  for (const r of avg) if (r.pos) (avgPos[r.pos] ??= []).push({ ...r });
  for (const list of Object.values(avgPos)) { rankIn(list, 'fpg'); for (const r of list) ranks[r.pid].avgPos = r.rk; }
  RANKS[season] = { at: Date.now(), ranks };
  return ranks;
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

// LIVE LOCKS (owner, Nov 8 2026: "update the 2K breakdown as soon as a lock hits", no waiting for the week to end).
// TRADE BLOCK (owner, Nov 11 2026): Sleeper's own trade block, read live (sleeperpriv.js league_players, NO login,
// unofficial). Managers set it in the Sleeper app only (no button on the site). Sleeper never clears the flag when a
// listed player is traded away, so only players STILL on the roster that listed them count. -> { pid: { owner, at } }
// (at = ms listed), or null when Sleeper doesn't answer. Cached 2 minutes.
let BLOCK = null;
export async function leagueTradeBlock(DATA) {
  if (BLOCK && Date.now() - BLOCK.at < 120_000) return BLOCK.v;
  const cur = DATA.seasons.at(-1);
  const [res, rosters] = await Promise.all([
    gql(BLOCK_QUERY, { leagueId: cur.leagueId }),
    get(`/v1/league/${cur.leagueId}/rosters`, null),
  ]);
  const rows = res.data?.league_players;
  if (!Array.isArray(rows) || !Array.isArray(rosters)) return null;
  const byRid = Object.fromEntries(rosters.map(r => [r.roster_id, r]));
  const v = {};
  for (const r of rows) {
    const rid = Number(r?.settings?.otb);
    const pid = String(r?.player_id ?? '');
    const ro = byRid[rid];
    if (!rid || !ro?.owner_id || !(ro.players ?? []).includes(pid)) continue; // stale flag: he left that roster
    v[pid] = { owner: ro.owner_id, at: Number(r.settings.otb_added_at) || null };
  }
  BLOCK = { v, at: Date.now() };
  return v;
}

// Sleeper's own lock data (sleeperpriv.js: matchup_legs_raw starters_games, NO login, unofficial) for the week being
// played: every starter already locked -> { s, w, t: 'R', o, pid, p, date, live: true }, the same shape as
// DATA.playerWeeks (o = the team whose MATCHUP lineup has him, p = that game's box score under league scoring). A
// locked week is SETTLED for that player: his points can't change and his later games that week aren't LGS. null when no
// regular week is in progress (or Sleeper / the box scores don't answer: then pages show finished weeks only, as before).
// Cached 2 minutes. Page-side only: DATA.playerWeeks, the nightly job and the solver never see these rows.
let LIVE = null;
export async function liveLocks(DATA) {
  if (LIVE && Date.now() - LIVE.at < 120_000) return LIVE.v;
  const v = await (async () => {
    const cur = DATA.seasons.at(-1);
    const state = await get('/v1/state/nba', null);
    const week = Number(state?.week);
    if (state?.season_type !== 'regular' || String(state.season) !== String(cur.season) || !week || Number(state.last_scored_leg) >= week) return null;
    const [res, schedule, scoring] = await Promise.all([
      gql(LOCKS_QUERY, { leagueId: cur.leagueId, round: week }),
      get(`/schedule/nba/regular/${cur.season}`, []),
      scoringFor(DATA, cur.season),
    ]);
    const legs = res.data?.matchup_legs_raw;
    if (!Array.isArray(legs)) return null;
    const boxes = await weekBoxes(cur.season, week, scoring ?? {});
    if (!boxes) return null;
    const ownerOf = Object.fromEntries(cur.teams.map(t => [t.rosterId, t.owner]));
    const rows = [];
    for (const [rid, t] of Object.entries(locksFromLegs(legs, schedule))) {
      const o = ownerOf[rid];
      if (!o) continue;
      for (const [pid, l] of Object.entries(t.locks)) {
        if (!l.date || !t.starters.includes(pid)) continue;
        const g = boxes.games?.[pid]?.find(x => x.date === l.date);
        if (!g) continue;
        rows.push({ s: String(cur.season), w: week, t: 'R', o, pid, p: g.p, date: l.date, live: true });
      }
    }
    return { season: String(cur.season), week, rows, locked: new Set(rows.map(r => `${r.o}|${r.pid}`)), at: Date.now() };
  })().catch(() => null);
  LIVE = { at: Date.now(), v };
  return v;
}
// LIVE LOCKED SCORES (owner, Nov 8 2026: Home + Matchup Hype "currently locked scores as the big number ... 100%
// accurate"). Per team, the points that are CERTAIN to count: every starter Sleeper shows locked (that game's box score)
// + every unlocked starter whose LAST game of the week has tipped (in progress or final: his last game counts, so it's
// his week's score, live while it's being played; same idea as the Assistant Coach's last-game call). Unlocked starters
// with games still to come aren't counted ("open"). A last game he sat on the bench for (watcher) -> his last lineup game
// (countedGame). -> { at, week, teams: { owner: { pts, open, live (starters in a game right now) } } } | null.
// Traffic (public pages, every minute): locks query ~3 KB + today's statuses ~1 KB each call; the season schedule once per
// 30 min; the week's box scores (~300 KB gzip) only when a game is in progress (at most every 2 min) or a game ended since.
const LS = { sched: null, schedAt: 0, boxes: null, boxesAt: 0, boxKey: '', doneSeen: '' };
const IN_PLAY = ['in_game', 'in_progress', 'complete'];
export async function liveTeamScores(DATA, season, week) {
  const cur = DATA.seasons.find(s => String(s.season) === String(season));
  if (!cur || !week) return null;
  try {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date());
    if (!LS.sched || Date.now() - LS.schedAt > 30 * 60_000) { LS.sched = await get(`/schedule/nba/regular/${season}`, null); LS.schedAt = Date.now(); }
    const [res, todayRes, scoring, lgs] = await Promise.all([
      gql(LOCKS_QUERY, { leagueId: cur.leagueId, round: Number(week) }),
      gql('query scores($date: String!, $season: String!, $seasonType: String!, $sport: String!) { scores(date: $date, season: $season, season_type: $seasonType, sport: $sport) { game_id status } }', { date: today, season: String(season), seasonType: 'regular', sport: 'nba' }),
      scoringFor(DATA, season),
      loadLgs().catch(() => null),
    ]);
    const legs = res.data?.matchup_legs_raw;
    if (!Array.isArray(legs) || !Array.isArray(LS.sched)) return null;
    const status = Object.fromEntries((todayRes.data?.scores ?? []).map(g => [g.game_id, g.status]));
    const games = LS.sched.filter(g => Number(g.week) === Number(week)).map(g => ({ id: g.game_id, date: g.date, home: g.home?.team, away: g.away?.team, status: status[g.game_id] ?? (g.date < today ? 'complete' : g.status) }));
    const liveNow = games.some(g => ['in_game', 'in_progress'].includes(g.status));
    const doneKey = games.filter(g => g.status === 'complete').map(g => g.id).join();
    const key = `${season}|${week}`;
    if (!LS.boxes || LS.boxKey !== key || LS.doneSeen !== doneKey || (liveNow && Date.now() - LS.boxesAt > 120_000)) {
      const rows = await get(`/stats/nba/${season}/${week}?season_type=regular`, null);
      if (!Array.isArray(rows)) return null;
      const boxes = {};
      for (const r of rows) {
        if (!/^\d+$/.test(r.player_id) || exhibitionRow(r) || !r.stats || !(r.stats.gp || r.stats.sp || r.stats.min)) continue;
        (boxes[r.player_id] ??= []).push({ date: r.date, p: Math.round(fantasy(r.stats, scoring ?? {}) * 10) / 10, team: r.team, done: status[r.game_id] ? status[r.game_id] === 'complete' : r.date < today });
      }
      for (const l of Object.values(boxes)) l.sort((a, b) => (a.date < b.date ? -1 : 1));
      Object.assign(LS, { boxes, boxesAt: Date.now(), boxKey: key, doneSeen: doneKey });
    }
    const byTeam = {};
    for (const g of games) for (const t of [g.home, g.away]) if (t) (byTeam[t] ??= []).push(g);
    for (const l of Object.values(byTeam)) l.sort((a, b) => (a.date < b.date ? -1 : 1));
    const ownerOf = Object.fromEntries(cur.teams.map(t => [t.rosterId, t.owner]));
    const locks = locksFromLegs(legs, LS.sched);
    const teams = {};
    for (const [rid, t] of Object.entries(locks)) {
      const o = ownerOf[rid];
      if (!o) continue;
      let pts = 0, open = 0, live = 0;
      for (const pid of t.starters) {
        const list = LS.boxes[pid] ?? [];
        const l = t.locks[pid];
        if (l?.date) { pts += list.find(x => x.date === l.date)?.p ?? 0; continue; }
        const nba = list.at(-1)?.team ?? DATA.players?.[pid]?.t ?? null;
        const last = (byTeam[nba] ?? []).at(-1);
        if (!last) continue; // no games this week: 0, settled
        if (!IN_PLAY.includes(last.status)) { open++; continue; }
        if (last.status !== 'complete') live++;
        const bench = benchSet(lgs, season, pid, o, week);
        const g = last.status === 'complete' && bench.has(last.date)
          ? countedGame(list, bench).g // sat on the bench for his last game: his last lineup game
          : list.find(x => x.date === last.date);
        pts += g?.p ?? 0;
      }
      teams[o] = { pts: Math.round(pts * 10) / 10, open, live };
    }
    return { at: Date.now(), week: Number(week), teams };
  } catch {
    return null;
  }
}
const benchSet = (lgs, season, pid, owner, week) => {
  const out = new Set();
  const S = lgs?.seasons?.[season];
  for (const [k, rec] of Object.entries(S?.p?.[pid] ?? {})) if (Number(S.games?.[k]?.w) === Number(week) && rec?.[0] === 0 && rec[1] === owner) out.add(k.slice(0, 10));
  return out;
};

// DATA with the live week's locked starters added to playerWeeks (for lockedTotals and friends on a page).
export const withLiveWeeks = (DATA, live) => (live?.rows?.length ? { ...DATA, playerWeeks: [...(DATA.playerWeeks ?? []), ...live.rows] } : DATA);
// data/lgs.json with the live week's after-lock games flagged 'k' right away (the watcher's markAfterLock only does it
// once the week is settled): a copy, the loaded file is never changed.
export function withLiveLgs(lgs, live) {
  const S0 = lgs?.seasons?.[live?.season];
  if (!S0 || !live.rows.length) return lgs;
  const p = { ...S0.p };
  for (const r of live.rows) {
    const games = p[r.pid];
    if (!games) continue;
    let copy = null;
    for (const [key, rec] of Object.entries(games)) {
      const [v, o, fl = ''] = rec;
      if (o !== r.o || Number(S0.games?.[key]?.w) !== live.week || key.slice(0, 10) <= r.date || fl.includes('k')) continue;
      (copy ??= { ...games })[key] = [v, o, `${fl}k`];
    }
    if (copy) p[r.pid] = copy;
  }
  return { ...lgs, seasons: { ...lgs.seasons, [live.season]: { ...S0, p } } };
}
// A LOCK IS A START (owner, Nov 8 2026: "assume week 1 locks had one LGS that week so max Lk% is 100%"): a player whose
// week counted for a team (D.playerWeeks, live rows included) was in that team's lineup for at least one game, so a
// week with a lock but no LGS record for that team (week 1 before the fill-in, Oct 26-28 of week 2 before the watcher
// started) gets ONE virtual LGS: [1, owner, 'v'], key '{date}|lock-{owner}-{week}' (date = his lock date when known, else
// the week's first game date). Counted by lgsCounts / Lock per start like any LGS; the game log skips 'v' (no real game).
export function withLockLgs(lgs, D) {
  if (!lgs?.seasons) return lgs;
  const out = { ...lgs, seasons: { ...lgs.seasons } };
  const firstDay = {};
  for (const x of D?.playerWeeks ?? []) {
    const S0 = out.seasons[x.s];
    if (!S0) continue;
    const w = Number(x.w);
    const has = Object.entries(S0.p?.[x.pid] ?? {}).some(([k, [v, o, fl = '']]) => v === 1 && o === x.o && !fl.includes('k') && Number(S0.games?.[k]?.w) === w);
    if (has) continue;
    let S = S0;
    if (S0 === lgs.seasons[x.s]) S = out.seasons[x.s] = { ...S0, p: { ...S0.p }, games: { ...S0.games } };
    const date = x.date ?? (firstDay[`${x.s}|${w}`] ??= Object.entries(S.games).filter(([, g]) => Number(g.w) === w).map(([k]) => k.slice(0, 10)).sort()[0] ?? `${x.s}-00-00`);
    const key = `${date}|lock-${x.o}-${w}`;
    S.games[key] = { d: date, w };
    S.p[x.pid] = { ...(S.p[x.pid] ?? {}), [key]: [1, x.o, 'v'] };
  }
  return out;
}

// LGS records that count toward Lock per start % (owner, Oct 31 2026: finished weeks only): a finished week, or the live
// week once THIS player is locked for that team (his week is settled).
export const lgsSettled = (lgs, live, s, key, o, pid, doneWeekOf) => {
  const w = Number(lgs?.seasons?.[s]?.games?.[key]?.w);
  return w <= doneWeekOf(s) || (!!live && s === live.season && w === live.week && live.locked.has(`${o}|${pid}`));
};

// The page's player list. list: 'team' (owner's roster), 'fa' (waiver wire: active players with an NBA
// team on no roster) or 'league' (every rostered player); rosters are today's. season = a season, or
// 'career' (team and league lists, owner Oct 25 2026): League = every league season added up; Team =
// only games from weeks he was on that team (needs stints = frontOffice(DATA).stints; his game logs).
// { list, owner, statSeason, players: [{ pid, owner, slot, bio..., tot, avg }], top, through }.
// list 'nba' (owner, Oct 26 2026) = every active player Sleeper lists on NBA team nbaTeam, rostered here or not.
// list 'pick' (compare, Oct 26 2026) = exactly the players in pids, from any list (League-style Career).
export async function loadBreakdown(DATA, { list = 'team', owner, season: statSeason, stints = [], nbaTeam = null, pids = [], withFa = false }) {
  const cur = DATA.seasons.at(-1);
  const career = statSeason === 'career';
  const seasons = career ? DATA.seasons.map(s => s.season) : [statSeason];
  const [league, rosters, all, tables, scorings, starts] = await Promise.all([
    get(`/v1/league/${cur.leagueId}`, {}),
    get(`/v1/league/${cur.leagueId}/rosters`, []),
    get('/v1/players/nba', {}),
    // Team career works from game logs, so it needs only this season's table (for the ring).
    Promise.all((career && list === 'team' ? [cur.season] : seasons).map(seasonTable)),
    Promise.all(seasons.map(s => scoringFor(DATA, s))),
    loadNbaStarts(),
  ]);
  const [research, ranks] = await Promise.all([
    rosterShares(cur.season, league.settings?.type ?? 2),
    leagueRanks(DATA, career ? cur.season : statSeason), // Career shows this season's rank
  ]);
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
    // "Include waiver wire" (owner, Oct 26 2026): plus every free agent the Waiver wire list shows.
    if (withFa) ids.push(...Object.keys(all ?? {}).filter(pid => /^\d+$/.test(pid) && !where[pid] && all[pid]?.team && all[pid].active !== false && NBA_POS.has(all[pid].position)));
  } else if (list === 'pick') {
    ids = pids.filter(pid => all?.[pid] || DATA.players?.[pid]);
  } else if (list === 'nba') {
    ids = Object.keys(all ?? {}).filter(pid => /^\d+$/.test(pid) && all[pid]?.team === nbaTeam && all[pid].active !== false && NBA_POS.has(all[pid].position));
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
    // NBA games started (ESPN, collected nightly): only when every season shown is complete, else null ("—").
    for (const pid of ids) {
      const sets = seasons.map(s => startDates(starts, s, pid));
      totals[pid].gs = sets.every(Boolean) ? sets.reduce((a, x) => a + x.size, 0) : null;
    }
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
      rankOvr: ranks[pid]?.ovr ?? null, rankPos: ranks[pid]?.pos ?? null,
      rankAvgOvr: ranks[pid]?.avgOvr ?? null, rankAvgPos: ranks[pid]?.avgPos ?? null,
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
  const [weeks, scoring, starts] = await Promise.all([
    get(`/stats/nba/player/${pid}?season_type=regular&season=${season}&grouping=week`, {}),
    scoringFor(DATA, season),
    loadNbaStarts(),
  ]);
  const started = startDates(starts, season, pid); // null = this season's starts aren't collected yet
  const through = starts?.seasons?.[season]?.through ?? '';
  return Object.values(weeks ?? {}).flat()
    .filter(g => g?.date && !exhibitionRow(g)) // no All-Star Game
    .map(g => ({ date: g.date, week: g.week, opp: g.opponent ?? '', away: !!g.is_away_team, team: g.team ?? '', dnp: !played(g.stats), line: statLine(g.stats ?? {}, scoring),
      // 1 / 0 = started or not; undefined = today's game (read tonight); null = season not collected yet
      gs: !started ? null : g.date <= through ? (started.has(g.date.replaceAll('-', '')) ? 1 : 0) : undefined }))
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

// ---------- NBA depth charts (Depth Chart test feature, owner Oct 29 2026) ----------
// ESPN keeps each NBA team's official depth chart (PG, SG, SF, PF, C, deepest last). Two public feeds, both CORS
// open: the team roster (names + ESPN ids + the ESPN season year) and the core-API depth chart (ranks by ESPN id).
// (site.api's own /depthcharts has names but no CORS, so a browser can't read it.) Matched to Sleeper ids by name
// (normName) on that NBA team first, then a unique name anywhere. Cached 15 min per team; null on failure.
// -> { at, cols: { PG: [{ espnId, name, pid, rank }] } }; a player can sit in more than one column (ESPN does that).
export const ESPN_TEAM_ID = { ATL: 1, BOS: 2, BKN: 17, CHA: 30, CHI: 4, CLE: 5, DAL: 6, DEN: 7, DET: 8, GSW: 9, HOU: 10, IND: 11, LAC: 12, LAL: 13, MEM: 29,
  MIA: 14, MIL: 15, MIN: 16, NOP: 3, NYK: 18, OKC: 25, ORL: 19, PHI: 20, PHX: 21, POR: 22, SAC: 23, SAS: 24, TOR: 28, UTA: 26, WAS: 27 };
export const DEPTH_POS = ['PG', 'SG', 'SF', 'PF', 'C'];
const ESPN_DEPTH = {};
export async function espnDepthChart(code, all) {
  const id = ESPN_TEAM_ID[code];
  if (!id) return null;
  const hit = ESPN_DEPTH[code];
  if (hit && Date.now() - hit.at < 15 * 60e3) return hit;
  try {
    const roster = await (await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${id}/roster`)).json();
    const year = roster?.season?.year;
    const res = await fetch(`https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/seasons/${year}/teams/${id}/depthcharts`);
    if (!year || !res.ok) throw new Error('ESPN depth chart');
    const chart = (await res.json())?.items?.[0]?.positions ?? {};
    const names = Object.fromEntries((roster.athletes ?? []).map(a => [String(a.id), a.displayName ?? a.fullName ?? '']));
    const byName = {};
    for (const [pid, p] of Object.entries(all ?? {})) {
      if (/^\d+$/.test(pid) && p?.active !== false) (byName[normName(p.full_name ?? `${p.first_name} ${p.last_name}`)] ??= []).push(pid);
    }
    // Players on the chart but not in the roster feed (two-way deals, Oct 29 2026: 7 league-wide): ESPN's athlete page.
    const missing = [...new Set(Object.values(chart).flatMap(c => c?.athletes ?? []).map(a => /athletes\/(\d+)/.exec(a.athlete?.$ref ?? '')?.[1]).filter(x => x && !names[x]))];
    await Promise.all(missing.map(async x => {
      try { names[x] = (await (await fetch(`https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/seasons/${year}/athletes/${x}`)).json())?.displayName ?? ''; } catch { /* stays unnamed */ }
    }));
    // No name match on this team: the only player Sleeper lists on it with that last name (ESPN "RJ Nembhard Jr." =
    // Sleeper "Ryan Nembhard", DEN), before a same-name player elsewhere.
    const lastOf = nm => normName(nm).split(' ').at(-1);
    const onTeam = Object.keys(all ?? {}).filter(pid => /^\d+$/.test(pid) && all[pid]?.team === code && all[pid].active !== false);
    const pidOf = nm => {
      const c = byName[normName(nm)] ?? [];
      const here = c.find(x => all[x]?.team === code);
      if (here) return here;
      const same = onTeam.filter(pid => lastOf(all[pid].full_name ?? all[pid].last_name) === lastOf(nm));
      return same.length === 1 ? same[0] : c.length === 1 ? c[0] : null;
    };
    const cols = {};
    for (const pos of DEPTH_POS) {
      cols[pos] = (chart[pos.toLowerCase()]?.athletes ?? [])
        .map(a => ({ espnId: /athletes\/(\d+)/.exec(a.athlete?.$ref ?? '')?.[1] ?? null, rank: a.rank }))
        .filter(a => a.espnId)
        .sort((a, b) => a.rank - b.rank)
        .map(a => ({ ...a, name: names[a.espnId] ?? '', pid: names[a.espnId] ? pidOf(names[a.espnId]) : null }));
    }
    ESPN_DEPTH[code] = { at: Date.now(), cols };
    return ESPN_DEPTH[code];
  } catch { return null; }
}

// League rank by fantasy points PER GAME this season (Depth Chart auto designations, owner Oct 30 2026): every NBA
// player with enough games (FPG_MIN_SHARE of the most games anyone has played, at least 1) ranked by FP/G under that
// season's league scoring; ties share. Players with too few games aren't ranked. Cached 2 min. { pid: rank }.
export const FPG_MIN_SHARE = 0.4;
const FPG_RANKS = {};
export async function fpgRanks(DATA, season) {
  const hit = FPG_RANKS[season];
  if (hit && Date.now() - hit.at < 120_000) return hit.ranks;
  const [table, scoring] = await Promise.all([seasonTable(season), scoringFor(DATA, season)]);
  const lines = Object.entries(table.players).map(([pid, row]) => ({ pid, l: lineFromTable(row, table.keys, scoring) }));
  const most = Math.max(0, ...lines.map(x => x.l.gp || 0));
  const need = Math.max(1, Math.round(most * FPG_MIN_SHARE));
  const rows = lines.filter(x => x.l.gp >= need).map(x => ({ pid: x.pid, v: Math.round((x.l.fp / x.l.gp) * 10) / 10 })).sort((a, b) => b.v - a.v);
  const ranks = {};
  rows.forEach((r, i) => { const prev = rows[i - 1]; r.rk = prev && prev.v === r.v ? prev.rk : i + 1; ranks[r.pid] = r.rk; });
  FPG_RANKS[season] = { at: Date.now(), ranks };
  return ranks;
}
