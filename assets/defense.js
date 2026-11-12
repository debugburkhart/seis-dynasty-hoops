// Defense vs Position (Test features in the commish office, owner Nov 2 2026): fantasy points every NBA team
// ALLOWS to each position, from Sleeper's per-game box scores (league scoring of the season). No DOM here;
// assets/defense-ui.js draws it. The nightly job (scripts/update.mjs) saves data/defense.json (updateDefense).
// Owner's choices: PG/SG/SF/PF/C or G/F/C with a switch; whole season or each team's last 5 / 10 / 15 games;
// this season only (no blend with last season); soft-matchup chart, this week's schedule grades, grade chips on
// the Assistant Coach / Briefing game chips.

import { get } from './commish.js';
import { exhibitionRow } from './config.js';
import { boxWeek } from './weekcache.js';
import { fantasy, minutes } from './breakdown.js';

export const DEFENSE_VERSION = 1;
export const POS5 = ['PG', 'SG', 'SF', 'PF', 'C'];
export const POS3 = ['G', 'F', 'C'];
export const GROUP3 = { PG: 'G', SG: 'G', SF: 'F', PF: 'F', C: 'C' };
export const WINDOWS = ['season', 5, 10, 15];
// Matchup grade from FP allowed vs the league average at that position (per game or per 36, as shown).
export const GRADE_CUTS = [[0.12, 'A', 'Great'], [0.05, 'B', 'Good'], [-0.05, 'C', 'Neutral'], [-0.12, 'D', 'Tough'], [-Infinity, 'F', 'Very tough']];
export const MIN_GAMES = 3; // under this many games a team's numbers are flagged "small sample"

const API = 'https://api.sleeper.com';
const r1 = x => Math.round(x * 10) / 10;
// Sleeper's main position as one of the 5 columns (a bare G / F, rare, goes by his first fantasy position).
export function pos5(player) {
  const p = player?.position;
  if (POS5.includes(p)) return p;
  const f = (player?.fantasy_positions ?? []).find(x => POS5.includes(x));
  return f ?? (p === 'G' ? 'PG' : p === 'F' ? 'SF' : null);
}
export const posKey = (pos, split) => (pos ? (split === 3 ? GROUP3[pos] : pos) : null);

const weekRows = boxWeek; // shared with defense / advstats / matchup (weekcache.js)
const played = s => !!(s && (s.gp || s.sp || s.min));

// One row per FINISHED game per defending team: [date, gameId, def, off, ...for PG SG SF PF C: fp, min, starters' fp,
// starters' min] (fp under `scoring`, 1 decimal). Starters = the NBA starting five on Sleeper's schedule (home/away
// .starters). Games the schedule doesn't call complete are left out (no half games).
function gameRows(rows, games, scoring) {
  const out = {};
  for (const g of rows) {
    if (!/^\d+$/.test(g.player_id) || !played(g.stats)) continue;
    const sg = games[g.game_id];
    if (!sg || sg.status !== 'complete') continue;
    const pos = pos5(g.player);
    if (!pos) continue;
    const def = g.opponent, off = g.team;
    const key = `${g.game_id}|${def}`;
    const r = (out[key] ??= [g.date ?? sg.date, g.game_id, def, off, ...POS5.flatMap(() => [0, 0, 0, 0])]);
    const i = 4 + POS5.indexOf(pos) * 4;
    const fp = fantasy(g.stats, scoring), min = minutes(g.stats);
    const side = sg.home?.team === off ? sg.home : sg.away;
    const starter = (side?.starters ?? []).includes(g.player_id);
    r[i] += fp; r[i + 1] += min;
    if (starter) { r[i + 2] += fp; r[i + 3] += min; }
  }
  for (const r of Object.values(out)) for (let i = 4; i < r.length; i++) r[i] = r1(r[i]);
  return out;
}

async function scoringFor(DATA, season) {
  const s = DATA.seasons.find(x => x.season === season);
  return s ? (await get(`/v1/league/${s.leagueId}`, {}))?.scoring_settings ?? {} : {};
}
const scoringKey = sc => JSON.stringify(Object.entries(sc ?? {}).sort());

// Adds weeks from..to to a season block (rows keyed gameId|def, so re-reading a week replaces its games).
async function addWeeks(block, season, from, to, games, scoring) {
  const byKey = Object.fromEntries(block.rows.map(r => [`${r[1]}|${r[2]}`, r]));
  for (let w = from; w <= to; w++) Object.assign(byKey, gameRows(await weekRows(season, w), games, scoring));
  block.rows = Object.values(byKey).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  block.through = block.rows.at(-1)?.[0] ?? null;
  return block;
}
function scheduleMap(schedule) { return Object.fromEntries((schedule ?? []).map(g => [g.game_id, g])); }

// Nightly (scripts/update.mjs): data/defense.json { version, at, seasons: { season: { weeks (fully finished weeks
// saved), through, sk (scoring key: a scoring change rebuilds), rows } } }, the season in progress only (owner: this
// season only). Rebuilt from week 1 every night (see updateDefense).
export async function updateDefense(DATA, prev, { log = () => {} } = {}) {
  const state = await (await fetch(`${API}/v1/state/nba?t=${Date.now()}`)).json();
  const season = DATA.seasons.at(-1).season;
  const out = { version: DEFENSE_VERSION, at: new Date().toISOString(), seasons: {} };
  if (state?.season !== season || !['regular', 'post', 'off'].includes(state.season_type)) {
    const keep = prev?.version === DEFENSE_VERSION ? prev.seasons?.[season] : null;
    if (keep) out.seasons[season] = keep;
    return out;
  }
  const scoring = await scoringFor(DATA, season);
  const sk = scoringKey(scoring);
  const old = prev?.version === DEFENSE_VERSION && prev.seasons?.[season]?.sk === sk ? prev.seasons[season] : null;
  const last = state.season_type === 'regular' ? Number(state.week) || 1 : 30;
  const games = scheduleMap(await get(`/schedule/nba/regular/${season}`, []));
  const maxWeek = Math.max(0, ...Object.values(games).map(g => g.week ?? 0));
  const to = Math.min(last, maxWeek || last);
  // Rebuilt from week 1 every night (owner, Nov 12 2026: Sleeper corrects box scores days later, so weeks saved once
  // went stale); downloads shared through weekcache.js. A failed read keeps last night's table.
  try {
    const block = await addWeeks({ weeks: 0, through: null, sk, rows: [] }, season, 1, to, games, scoring);
    block.weeks = state.season_type === 'regular' ? Math.max(0, to - 1) : to;
    out.seasons[season] = block;
    log(`Defense vs position ${season}: weeks 1-${to} rebuilt, ${block.rows.length} team-games through ${block.through} (weeks 1-${block.weeks} final).`);
  } catch (e) {
    if (old) out.seasons[season] = old;
    log(`Defense vs position ${season}: rebuild failed (${e.message}); ${old ? "kept last night's table" : 'nothing saved'}.`);
  }
  return out;
}

// Browser: the saved file + the weeks after it (this week's finished games), cached 2 minutes. No saved file yet =
// built here from week 1.
let SAVED, HIT = null;
export async function loadDefense(DATA) {
  if (HIT && Date.now() - HIT.at < 120_000) return HIT.data;
  if (SAVED === undefined) {
    try {
      const res = await fetch(`data/defense.json?t=${Date.now()}`, { cache: 'no-store' });
      SAVED = res.ok ? await res.json() : null;
    } catch { SAVED = null; }
    if (SAVED?.version !== DEFENSE_VERSION) SAVED = null;
  }
  const season = DATA.seasons.at(-1).season;
  const [state, scoring, schedule] = await Promise.all([get('/v1/state/nba', {}), scoringFor(DATA, season), get(`/schedule/nba/regular/${season}`, [])]);
  const saved = SAVED?.seasons?.[season];
  const sk = scoringKey(scoring);
  const block = saved?.sk === sk ? { ...saved, rows: [...saved.rows] } : { weeks: 0, through: null, sk, rows: [] };
  if (state?.season === season && state.season_type === 'regular') {
    await addWeeks(block, season, block.weeks + 1, Number(state.week) || 1, scheduleMap(schedule), scoring);
  }
  const data = { season, state, schedule: schedule ?? [], ...block };
  HIT = { at: Date.now(), data };
  return data;
}

// The table: { cols, teams: { DEF: { gp, cells: { col: { v, fp, min, rank, diff } } } }, avg: { col }, games }.
// window = 'season' or each team's last N games; who = 'all' | 'starters'; metric = 'game' (FP per game) or '36'
// (FP per 36 minutes played at that position). Rank 1 = allows the MOST (softest matchup), 30 = toughest.
export function defenseTable(def, { split = 5, window = 'season', who = 'all', metric = 'game' } = {}) {
  const cols = split === 3 ? POS3 : POS5;
  const byTeam = {};
  for (const r of def?.rows ?? []) (byTeam[r[2]] ??= []).push(r);
  const teams = {};
  for (const [t, list] of Object.entries(byTeam)) {
    const use = window === 'season' ? list : list.slice(-Number(window));
    const sums = Object.fromEntries(cols.map(c => [c, { fp: 0, min: 0 }]));
    for (const r of use) POS5.forEach((p, k) => {
      const c = posKey(p, split), i = 4 + k * 4 + (who === 'starters' ? 2 : 0);
      sums[c].fp += r[i]; sums[c].min += r[i + 1];
    });
    const gp = use.length;
    teams[t] = {
      gp, from: use[0]?.[0], to: use.at(-1)?.[0],
      cells: Object.fromEntries(cols.map(c => {
        const { fp, min } = sums[c];
        const v = metric === '36' ? (min > 0 ? (fp / min) * 36 : 0) : gp ? fp / gp : 0;
        return [c, { v, fp: r1(fp), min: r1(min), perGame: gp ? fp / gp : 0 }];
      })),
    };
  }
  const list = Object.values(teams).filter(x => x.gp);
  const avg = {};
  for (const c of cols) {
    avg[c] = list.length ? list.reduce((s, x) => s + x.cells[c].v, 0) / list.length : 0;
    const order = [...list].sort((a, b) => b.cells[c].v - a.cells[c].v);
    order.forEach((x, i) => {
      const cell = x.cells[c];
      cell.rank = i && order[i - 1].cells[c].v === cell.v ? order[i - 1].cells[c].rank : i + 1;
      cell.diff = avg[c] ? cell.v / avg[c] - 1 : 0;
    });
  }
  return { cols, teams, avg, games: def?.rows?.length ?? 0 };
}

export function gradeOf(diff) {
  if (diff == null || !Number.isFinite(diff)) return null;
  const d = Math.round(diff * 100) / 100; // grade on the whole percent shown, so "+12%" is never a B
  const [, letter, word] = GRADE_CUTS.find(([cut]) => d >= cut - 1e-9);
  return { letter, word, diff };
}
// Grade for a player at `pos` (one of POS5) facing defense `opp`, or null (no data / unknown position).
export function matchupGrade(table, opp, pos, split = 5) {
  const cell = table?.teams?.[opp]?.cells?.[posKey(pos, split)];
  if (!cell || !table.teams[opp].gp) return null;
  const g = gradeOf(cell.diff);
  return g && { ...g, rank: cell.rank, v: cell.v, gp: table.teams[opp].gp, col: posKey(pos, split) };
}

// This fantasy week's NBA games per team (the loaded schedule): { week, teams: { BOS: [{ date, opp, home, status }] } }.
export function weekGames(def) {
  const week = def?.state?.season_type === 'regular' ? Number(def.state.week) || 1 : null;
  if (week == null) return null;
  const teams = {};
  for (const g of def.schedule) {
    if (g.week !== week) continue;
    const h = g.home?.team, a = g.away?.team;
    if (h) (teams[h] ??= []).push({ date: g.date, opp: a, home: true, status: g.status });
    if (a) (teams[a] ??= []).push({ date: g.date, opp: h, home: false, status: g.status });
  }
  for (const l of Object.values(teams)) l.sort((x, y) => (x.date < y.date ? -1 : 1));
  return { week, teams };
}
