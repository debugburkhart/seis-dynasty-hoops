// Taxi players of the week (Home; owner, Oct 27 2026): the 5 best SINGLE games by players on a taxi
// squad during the last finished fantasy week, one game per player. Built by the nightly job once per
// week (taxi squads as they stand right after the week, so a player called up later stays on it) ->
// data/taxi-week.json. No DOM or Node APIs; the job passes getJson.

import { exhibitionRow } from './config.js';

// File: { version 2, at, weeks: [{ season, week, dates, taxiPlayers, played, games }] } oldest first, every
// week kept (the Home card steps through them and counts each player's appearances). A version 1 file (one
// week) is carried into the list.
export const TAXI_WEEK_VERSION = 2;
export const TAXI_WEEK_TOP = 5;

const r1 = n => Math.round(n * 10) / 10;
const fantasy = (stats, scoring) => Object.entries(scoring).reduce((t, [k, v]) => t + (Number(stats?.[k]) || 0) * v, 0);

// prev = last saved file; returns the file to save (unchanged when this week is already built).
export async function updateTaxiWeek(data, prev, { getJson, log = () => {} }) {
  const weeks = prev?.version === TAXI_WEEK_VERSION ? [...(prev.weeks ?? [])] : prev?.games ? [{ ...prev, version: undefined, at: undefined }] : [];
  const file = () => ({ version: TAXI_WEEK_VERSION, at: new Date().toISOString(), weeks });
  const cur = data.seasons.at(-1);
  const season = cur?.season;
  const week = Math.max(0, ...data.games.filter(g => g.s === season).map(g => g.w));
  if (!season || !week) return weeks.length ? file() : null;
  if (weeks.some(x => x.season === season && x.week === week)) return prev?.version === TAXI_WEEK_VERSION ? prev : file();
  const api = 'https://api.sleeper.app/v1';
  const [league, rosters, rows] = await Promise.all([
    getJson(`${api}/league/${cur.leagueId}`),
    getJson(`${api}/league/${cur.leagueId}/rosters`),
    getJson(`https://api.sleeper.com/stats/nba/${season}/${week}?season_type=regular`),
  ]);
  const scoring = league?.scoring_settings ?? {};
  const taxiOf = {};
  for (const r of rosters ?? []) for (const pid of r.taxi ?? []) taxiOf[pid] = r.owner_id;
  const best = {};
  const dates = [];
  for (const g of rows ?? []) {
    if (!/^\d+$/.test(g.player_id) || exhibitionRow(g) || !(g.stats?.gp || g.stats?.sp)) continue;
    if (g.date) dates.push(g.date);
    const owner = taxiOf[g.player_id];
    if (!owner) continue;
    const s = g.stats;
    const fp = r1(fantasy(s, scoring));
    if (best[g.player_id] && best[g.player_id].fp >= fp) continue;
    best[g.player_id] = {
      pid: g.player_id,
      name: g.player ? `${g.player.first_name} ${g.player.last_name}` : data.players?.[g.player_id]?.n ?? g.player_id,
      owner, team: g.team, opp: g.opponent, date: g.date, fp,
      line: { pts: s.pts ?? 0, reb: s.reb ?? 0, ast: s.ast ?? 0, stl: s.stl ?? 0, blk: s.blk ?? 0, tpm: s.tpm ?? 0, min: r1(s.min ?? (s.sp ?? 0) / 60) },
    };
  }
  const games = Object.values(best).sort((a, b) => b.fp - a.fp).slice(0, TAXI_WEEK_TOP);
  dates.sort();
  log(`Taxi players of the week: ${season} week ${week}, ${Object.keys(taxiOf).length} taxi players, ${Object.keys(best).length} played; top ${games.map(x => `${x.name} ${x.fp}`).join(', ')}`);
  weeks.push({
    season, week, dates: dates.length ? [dates[0], dates.at(-1)] : null,
    taxiPlayers: Object.keys(taxiOf).length, played: Object.keys(best).length, games,
  });
  weeks.sort((a, b) => a.season - b.season || a.week - b.week);
  return file();
}

// How many times each player made the list, up to and including week index i: { pid: [week labels] }.
export function taxiAppearances(weeks, i = weeks.length - 1) {
  const out = {};
  for (const w of weeks.slice(0, i + 1)) for (const g of w.games ?? []) (out[g.pid] ??= []).push(`${w.season} wk ${w.week}`);
  return out;
}
