// Matchup adjustment for the Assistant Coach (owner, Nov 4 2026; backtest in CLAUDE.md, "MATCHUP / SPREAD BACKTEST").
// Sleeper's per-game projections already price in how many fantasy points a defense allows; what they miss is that
// players keep beating (or missing) their projection against some defenses. Per NBA defense and position group
// (G / F / C): sum of actual FP / sum of projected FP for every player who faced it earlier this season, vs the
// same ratio league-wide. A game's expected score = projection x (1 + COEF x that edge), edge clipped to +-CLIP, only
// once the defense has MIN_GAMES games. Fitted on 2024-25 (coef 0.30), confirmed on 2025-26 (0.37-0.40): COEF 0.33,
// typical effect +-1.5%, at most +-4%. No DOM here; the nightly job saves data/matchup.json (updateMatchups).

import { get } from './commish.js';
import { exhibitionRow } from './config.js';

export const MATCHUP_VERSION = 1;
export const COEF = 0.33;
export const CLIP = 0.12;
export const MIN_GAMES = 8;
export const GROUP = { PG: 'G', SG: 'G', G: 'G', SF: 'F', PF: 'F', F: 'F', C: 'C' };
const API = 'https://api.sleeper.com';
const fantasy = (stats, scoring) => Object.entries(scoring).reduce((sum, [k, v]) => sum + (Number(stats?.[k]) || 0) * v, 0);
const played = s => !!(s && (s.gp || s.sp || s.min));
const r1 = x => Math.round(x * 10) / 10;
// Same position rule as defense.js pos5 (main position; a bare G / F goes by his first fantasy position).
const groupOf = player => GROUP[player?.position] ?? GROUP[(player?.fantasy_positions ?? [])[0]] ?? null;

async function rows(path) {
  const res = await fetch(`${API}${path}${path.includes('?') ? '&' : '?'}t=${Date.now()}`);
  if (!res.ok) throw new Error(`Sleeper ${path}: HTTP ${res.status}`);
  return ((await res.json()) ?? []).filter(r => !exhibitionRow(r));
}
// One week: { 'DEF|G': [actual, projected, dates...] } over played games with a projection > 0.
async function weekSums(season, week, scoring) {
  const [box, proj] = await Promise.all([rows(`/stats/nba/${season}/${week}?season_type=regular`), rows(`/projections/nba/${season}/${week}?season_type=regular`)]);
  const act = {};
  for (const b of box) if (/^\d+$/.test(b.player_id) && played(b.stats)) act[`${b.player_id}|${b.date}`] = fantasy(b.stats, scoring);
  const out = {};
  for (const p of proj) {
    if (!/^\d+$/.test(p.player_id) || !p.date || !p.opponent) continue;
    const pf = fantasy(p.stats ?? {}, scoring);
    const a = act[`${p.player_id}|${p.date}`];
    const g = groupOf(p.player);
    if (pf <= 0 || a == null || !g) continue;
    const s = (out[`${p.opponent}|${g}`] ??= [0, 0, []]);
    s[0] = r1(s[0] + a); s[1] = r1(s[1] + pf);
    if (!s[2].includes(p.date)) s[2].push(p.date);
  }
  return out;
}

// Nightly (scripts/update.mjs): data/matchup.json { version, at, season, sk, weeks: { w: sums } }, the season in progress.
// Finished weeks are kept; the current week is re-read every night (its played games so far).
export async function updateMatchups(DATA, prev, { log = () => {} } = {}) {
  const state = await (await fetch(`${API}/v1/state/nba?t=${Date.now()}`)).json();
  const cur = DATA.seasons.at(-1);
  const scoring = (await get(`/v1/league/${cur.leagueId}`, {}))?.scoring_settings ?? {};
  const sk = JSON.stringify(Object.entries(scoring).sort());
  const keep = prev?.version === MATCHUP_VERSION && prev.season === cur.season && prev.sk === sk ? prev.weeks ?? {} : {};
  const out = { version: MATCHUP_VERSION, at: new Date().toISOString(), season: cur.season, sk, weeks: {} };
  if (state?.season !== cur.season || state.season_type !== 'regular') { out.weeks = keep; return out; }
  const now = Number(state.week) || 1;
  for (let w = 1; w <= now; w++) out.weeks[w] = w < now && keep[w] ? keep[w] : await weekSums(cur.season, w, scoring);
  const t = matchupTable(out);
  log(`Matchups ${cur.season}: weeks 1-${now}, ${Object.keys(t.teams).length} defenses (${t.ready} with ${MIN_GAMES}+ games).`);
  return out;
}

// Browser: the saved file (no live weeks: last night's numbers are plenty for a season-long average). null = none yet.
let SAVED;
export async function loadMatchups() {
  if (SAVED !== undefined) return SAVED;
  try {
    const res = await fetch(`data/matchup.json?t=${Date.now()}`, { cache: 'no-store' });
    const f = res.ok ? await res.json() : null;
    SAVED = f?.version === MATCHUP_VERSION ? matchupTable(f) : null;
  } catch { SAVED = null; }
  return SAVED;
}

// { teams: { 'DEF|G': { ratio, edge, games } }, league: { G: ratio }, ready, through }.
export function matchupTable(file) {
  const sums = {};
  for (const wk of Object.values(file?.weeks ?? {})) {
    for (const [k, [a, p, dates]] of Object.entries(wk)) {
      const s = (sums[k] ??= { a: 0, p: 0, dates: new Set() });
      s.a += a; s.p += p; for (const d of dates) s.dates.add(d);
    }
  }
  const lg = {};
  for (const [k, s] of Object.entries(sums)) { const g = k.split('|')[1]; const x = (lg[g] ??= { a: 0, p: 0 }); x.a += s.a; x.p += s.p; }
  const league = Object.fromEntries(Object.entries(lg).map(([g, x]) => [g, x.p ? x.a / x.p : 1]));
  const teams = {};
  let ready = 0;
  for (const [k, s] of Object.entries(sums)) {
    const g = k.split('|')[1];
    const ratio = s.p ? s.a / s.p : 1;
    const games = s.dates.size;
    teams[k] = { ratio, edge: league[g] ? ratio / league[g] - 1 : 0, games };
    if (games >= MIN_GAMES) ready++;
  }
  return { teams, league, ready, at: file?.at ?? null, season: file?.season ?? null };
}

// A game's factor for a player at position `pos` (Sleeper main position) facing `opp`: { f, edge, games } (f = 1 when the
// defense has too few games or there's no table).
export function matchupFactor(table, opp, pos) {
  const g = GROUP[pos];
  const t = g && table?.teams?.[`${opp}|${g}`];
  if (!t || t.games < MIN_GAMES) return { f: 1, edge: 0, games: t?.games ?? 0, group: g ?? null };
  const edge = Math.max(-CLIP, Math.min(CLIP, t.edge));
  return { f: 1 + COEF * edge, edge: t.edge, games: t.games, group: g };
}
