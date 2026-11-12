// Advanced Stats (Test features in the commish office, owner Nov 4 2026): charts that compare players and teams in
// depth, from the same box scores as the 2K breakdown. No DOM here; assets/advstats-ui.js draws the page.
// The nightly job (scripts/update.mjs) saves data/adv-stats.json (updateAdvStats): per season, every NBA team-game's
// totals and every player's totals per NBA team. A week of Sleeper box scores is ~1.7 MB, so pages never download a
// past season themselves; the season in progress adds its newest weeks live (like season-stats.json / defense.json).

import { get } from './commish.js';
import { exhibitionRow } from './config.js';
import { boxWeek } from './weekcache.js';
import { fantasy, minutes, totalOf } from './breakdown.js';
import { pos5 } from './defense.js';

export const ADV_VERSION = 1;
const API = 'https://api.sleeper.com';
const POS5 = ['PG', 'SG', 'SF', 'PF', 'C'];
// Team-game row (tg['YYYY-MM-DD|TEAM']): what that team's players did in that game.
export const TG = ['opp', 'home', 'fp', 'pts', 'reb', 'ast', 'stl', 'blk', 'to', 'fga', 'fta', 'oreb', 'min', 'tpm', 'fgm', 'ftm', 'PG', 'SG', 'SF', 'PF', 'C'];
// Player-team row (pt['pid|TEAM']): his totals while playing for that team.
export const PT = ['gp', 'min', 'fp', 'pts', 'reb', 'ast', 'stl', 'blk', 'to', 'fga', 'fta', 'tpm', 'fgm', 'ftm', 'gs'];
const r1 = x => Math.round(x * 10) / 10;
const played = s => !!(s && (s.gp || s.sp || s.min));
const num = (s, k) => Number(s?.[k]) || 0;

const weekRows = boxWeek; // shared with defense / advstats / matchup (weekcache.js)
async function scoringFor(DATA, season) {
  const s = DATA.seasons.find(x => x.season === season);
  return s ? (await get(`/v1/league/${s.leagueId}`, {}))?.scoring_settings ?? {} : {};
}
const scoringKey = sc => JSON.stringify(Object.entries(sc ?? {}).sort());

// Adds one week of box rows to a season block. starters = Set of `gameId|pid` (NBA starting fives from Sleeper's
// schedule) or null (past seasons: gs stays 0; the 2K page has ESPN's GS for those).
function addRows(block, rows, scoring, starters) {
  for (const g of rows) {
    if (!/^\d+$/.test(g.player_id) || !played(g.stats) || !g.team || !g.date) continue;
    const s = g.stats, fp = fantasy(s, scoring), min = minutes(s);
    const k = `${g.date}|${g.team}`;
    const t = (block.tg[k] ??= [g.opponent ?? '', 0, ...TG.slice(2).map(() => 0)]);
    const add = (row, name, v, keys) => { const i = keys.indexOf(name); row[i] = r1(row[i] + v); };
    for (const [name, v] of [['fp', fp], ['pts', num(s, 'pts')], ['reb', num(s, 'reb')], ['ast', num(s, 'ast')], ['stl', num(s, 'stl')], ['blk', num(s, 'blk')],
      ['to', num(s, 'to')], ['fga', num(s, 'fga')], ['fta', num(s, 'fta')], ['oreb', num(s, 'oreb')], ['min', min], ['tpm', num(s, 'tpm')], ['fgm', num(s, 'fgm')], ['ftm', num(s, 'ftm')]]) add(t, name, v, TG);
    const pos = pos5(g.player);
    if (pos) add(t, pos, fp, TG);
    const p = (block.pt[`${g.player_id}|${g.team}`] ??= PT.map(() => 0));
    for (const [name, v] of [['gp', 1], ['min', min], ['fp', fp], ['pts', num(s, 'pts')], ['reb', num(s, 'reb')], ['ast', num(s, 'ast')], ['stl', num(s, 'stl')],
      ['blk', num(s, 'blk')], ['to', num(s, 'to')], ['fga', num(s, 'fga')], ['fta', num(s, 'fta')], ['tpm', num(s, 'tpm')], ['fgm', num(s, 'fgm')], ['ftm', num(s, 'ftm')],
      ['gs', starters?.has(`${g.game_id}|${g.player_id}`) ? 1 : 0]]) add(p, name, v, PT);
    if (pos) block.pos[g.player_id] = pos;
    if (!block.through || g.date > block.through) block.through = g.date;
  }
}
// Home flags + NBA starting fives from Sleeper's schedule (only complete games are added: no half games).
async function scheduleInfo(season) {
  const sched = await get(`/schedule/nba/regular/${season}`, []);
  const done = new Set(), starters = new Set(), home = new Set();
  for (const g of sched ?? []) {
    if (g.status !== 'complete') continue;
    done.add(g.game_id);
    if (g.home?.team) home.add(`${g.date}|${g.home.team}`);
    for (const side of [g.home, g.away]) for (const pid of side?.starters ?? []) starters.add(`${g.game_id}|${pid}`);
  }
  return { done, starters, home, maxWeek: Math.max(0, ...(sched ?? []).map(g => g.week ?? 0)) };
}
const copyBlock = b => ({ ...b, tg: Object.fromEntries(Object.entries(b.tg).map(([k, v]) => [k, [...v]])), pt: Object.fromEntries(Object.entries(b.pt).map(([k, v]) => [k, [...v]])), pos: { ...b.pos } });
async function addWeeks(block, season, from, to, scoring, info) {
  for (let w = from; w <= to; w++) {
    let rows = await weekRows(season, w);
    if (to >= 30 && !rows.length && block.through) break; // past season: stop after the last week with games
    if (info) rows = rows.filter(r => info.done.has(r.game_id));
    addRows(block, rows, scoring, info?.starters ?? null);
    if (rows.length || to < 30) block.weeks = w;
  }
  if (info) for (const k of Object.keys(block.tg)) block.tg[k][1] = info.home.has(k) ? 1 : 0;
  return block;
}

// Nightly: data/adv-stats.json { version, at, seasons: { season: { sk, weeks, through, complete, tg, pt, pos } } }.
// Finished seasons are built once (home flags from the schedule; no GS) and kept; the season in progress re-reads
// its finished weeks from week 1 every night (Sleeper corrects box scores later; finished games only).
export async function updateAdvStats(DATA, prev, { log = () => {}, maxPast = 2 } = {}) {
  const state = await (await fetch(`${API}/v1/state/nba?t=${Date.now()}`)).json();
  const out = { version: ADV_VERSION, at: new Date().toISOString(), seasons: {} };
  const old = prev?.version === ADV_VERSION ? prev.seasons ?? {} : {};
  let past = 0;
  for (const { season } of DATA.seasons) {
    const scoring = await scoringFor(DATA, season);
    const sk = scoringKey(scoring);
    const was = old[season]?.sk === sk ? old[season] : null;
    const current = season === state?.season;
    if (!current) {
      if (was?.complete) { out.seasons[season] = was; continue; }
      if (Number(season) > Number(state?.season) || past >= maxPast) { if (was) out.seasons[season] = was; continue; }
      past++;
      const info = await scheduleInfo(season);
      const block = await addWeeks({ sk, weeks: 0, through: null, complete: true, tg: {}, pt: {}, pos: {} }, season, 1, 30, scoring, { ...info, done: { has: () => true }, starters: null });
      out.seasons[season] = block;
      log(`Advanced stats ${season}: ${Object.keys(block.tg).length} team-games, ${Object.keys(block.pt).length} player-teams (final).`);
      continue;
    }
    if (state.season_type !== 'regular' && state.season_type !== 'post') { if (was) out.seasons[season] = was; continue; }
    const info = await scheduleInfo(season);
    const last = state.season_type === 'regular' ? Math.min(Number(state.week) || 1, info.maxWeek || 99) : info.maxWeek;
    // Only FINISHED weeks are saved (kept night to night); pages add the current week live.
    const finished = state.season_type === 'regular' ? last - 1 : last;
    // Rebuilt from week 1 every night (owner, Nov 12 2026: Sleeper corrects box scores days later); downloads shared
    // through weekcache.js. A failed read keeps last night's block.
    try {
      const fin = await addWeeks({ sk, weeks: 0, through: null, tg: {}, pt: {}, pos: {} }, season, 1, finished, scoring, info);
      out.seasons[season] = { ...fin, complete: false };
      log(`Advanced stats ${season}: weeks 1-${fin.weeks} rebuilt, ${Object.keys(fin.tg).length} team-games through ${fin.through}.`);
    } catch (e) {
      if (was) out.seasons[season] = was;
      log(`Advanced stats ${season}: rebuild failed (${e.message}); ${was ? "kept last night's block" : 'nothing saved'}.`);
    }
  }
  return out;
}

// Browser: a season block, or null when a past season isn't saved yet. The season in progress = the saved finished
// weeks + every week after them read live (no saved file: built here from week 1). Cached 2 minutes.
let SAVED;
const HITS = {};
export async function loadAdv(DATA, season) {
  const hit = HITS[season];
  if (hit && (hit.data?.complete || Date.now() - hit.at < 120_000)) return hit.data;
  if (SAVED === undefined) {
    try {
      const res = await fetch(`data/adv-stats.json?t=${Date.now()}`, { cache: 'no-store' });
      SAVED = res.ok ? await res.json() : null;
    } catch { SAVED = null; }
    if (SAVED?.version !== ADV_VERSION) SAVED = null;
  }
  const [state, scoring] = await Promise.all([get('/v1/state/nba', {}), scoringFor(DATA, season)]);
  const sk = scoringKey(scoring);
  const saved = SAVED?.seasons?.[season]?.sk === sk ? SAVED.seasons[season] : null;
  let data = null;
  if (saved?.complete) data = saved;
  else if (state?.season === season && state.season_type === 'regular') {
    const info = await scheduleInfo(season);
    const base = saved ? copyBlock(saved) : { sk, weeks: 0, through: null, tg: {}, pt: {}, pos: {} };
    data = await addWeeks(base, season, base.weeks + 1, Number(state.week) || 1, scoring, info);
    data.complete = false;
  } else if (saved) data = saved;
  HITS[season] = { at: Date.now(), data };
  return data;
}

// ---------- Derived numbers ----------

export const mean = a => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
export function quantile(sorted, q) {
  if (!sorted.length) return null;
  const i = (sorted.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}
export function sd(a) {
  const m = mean(a);
  return a.length > 1 ? Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)) : 0;
}
// Possessions (pace proxy): FGA + 0.44 FTA + TO - OREB.
export const poss = t => t.fga + 0.44 * t.fta + t.to - t.oreb;
export const tgObj = row => Object.fromEntries(TG.map((k, i) => [k, row[i]]));
export const ptObj = row => Object.fromEntries(PT.map((k, i) => [k, row[i]]));

// Where his fantasy points come from: one number per category under `scoring` (TO and techs negative). Works on a
// box line (breakdown.js statLine / totalOf) or a team-game object. 'bonus' = everything else (double-doubles,
// triple-doubles, 40-point / 15-assist / 20-rebound bonuses, flagrants), so the parts add up to fp.
export const MIX = [['pts', 'Points'], ['reb', 'Rebounds'], ['ast', 'Assists'], ['stl', 'Steals'], ['blk', 'Blocks'], ['tpm', '3-pointers'], ['shoot', 'Shooting'], ['bonus', 'Bonuses'], ['to', 'Turnovers'], ['tf', 'Techs']];
export function fpMix(line, scoring) {
  const sc = k => Number(scoring?.[k]) || 0;
  const v = k => Number(line?.[k]) || 0;
  const out = {
    pts: v('pts') * sc('pts'), reb: v('reb') * sc('reb') + v('oreb') * sc('oreb') + v('dreb') * sc('dreb'), ast: v('ast') * sc('ast'),
    stl: v('stl') * sc('stl'), blk: v('blk') * sc('blk'), tpm: v('tpm') * sc('tpm'),
    shoot: v('fgm') * sc('fgm') + v('fga') * sc('fga') + v('ftm') * sc('ftm') + v('fta') * sc('fta') + v('tpa') * sc('tpa'),
    to: v('to') * sc('to'), tf: v('tf') * sc('tf'),
  };
  out.bonus = (Number(line?.fp) || 0) - Object.values(out).reduce((s, x) => s + x, 0);
  if (Math.abs(out.bonus) < 0.05) out.bonus = 0;
  return out;
}

// Consistency of a list of game FP: floor (10th pct), median, ceiling (90th), SD, boom/bust share (a game 25%+ above /
// below his own average in that window).
export const BOOM = 0.25;
export function consistency(fps) {
  const s = [...fps].sort((a, b) => a - b);
  const m = mean(fps);
  return {
    n: fps.length, avg: m, sd: sd(fps), floor: quantile(s, 0.1), med: quantile(s, 0.5), ceil: quantile(s, 0.9), min: s[0], max: s.at(-1),
    boom: fps.length ? fps.filter(x => x >= m * (1 + BOOM)).length / fps.length : 0,
    bust: fps.length ? fps.filter(x => x <= m * (1 - BOOM)).length / fps.length : 0,
    cv: m > 0 ? sd(fps) / m : null,
  };
}

// Joins a player's game log (breakdown.js gameLog rows, newest first) with his team's game totals: per game usage,
// shares of team FP / FGA / minutes, days of rest (since his TEAM's last game), home flag. Oldest first.
export function enrichGames(games, adv) {
  const teamDates = {};
  for (const k of Object.keys(adv?.tg ?? {})) { const [d, t] = k.split('|'); (teamDates[t] ??= []).push(d); }
  // No team rows (past season not saved yet): his own log's dates (DNP rows included) for that team.
  for (const g of games) if (!adv?.tg && g.team) (teamDates[g.team] ??= []).push(g.date);
  for (const l of Object.values(teamDates)) l.sort();
  const day = d => Date.parse(`${d}T12:00:00Z`) / 864e5;
  return [...games].reverse().map(g => {
    const row = adv?.tg?.[`${g.date}|${g.team}`];
    const t = row ? tgObj(row) : null;
    const l = g.line;
    const dates = teamDates[g.team] ?? [];
    const prev = dates.filter(d => d < g.date).at(-1);
    const plays = l.fga + 0.44 * l.fta + l.to;
    const tPlays = t ? t.fga + 0.44 * t.fta + t.to : 0;
    return {
      ...g,
      tm: t,
      rest: prev ? Math.round(day(g.date) - day(prev)) - 1 : null,
      home: t ? !!t.home : !g.away,
      usg: !g.dnp && t && l.min > 0 && tPlays > 0 ? (100 * plays * (t.min / 5)) / (l.min * tPlays) : null,
      fpShare: !g.dnp && t?.fp > 0 ? l.fp / t.fp : null,
      fgaShare: !g.dnp && t?.fga > 0 ? l.fga / t.fga : null,
      minShare: !g.dnp && t?.min > 0 ? l.min / t.min : null,
    };
  });
}

// Defense strength by season from the team-game rows: FP each team allowed per game to G / F / C and overall, vs the
// league average (+ = soft). { DEF: { gp, all, G, F, C } } as diffs.
export function defenseDiffs(adv) {
  const sums = {};
  for (const [k, row] of Object.entries(adv?.tg ?? {})) {
    const t = tgObj(row);
    const d = (sums[t.opp] ??= { gp: 0, all: 0, G: 0, F: 0, C: 0 });
    d.gp++; d.all += t.fp; d.G += t.PG + t.SG; d.F += t.SF + t.PF; d.C += t.C;
  }
  const teams = Object.entries(sums).filter(([, x]) => x.gp);
  const out = {};
  for (const key of ['all', 'G', 'F', 'C']) {
    const per = teams.map(([c, x]) => [c, x[key] / x.gp]);
    const avg = mean(per.map(x => x[1]));
    const order = [...per].sort((a, b) => b[1] - a[1]);
    for (const [c, v] of per) { (out[c] ??= { gp: sums[c].gp })[key] = { v, diff: avg ? v / avg - 1 : 0, rank: order.findIndex(x => x[0] === c) + 1 }; }
  }
  return out;
}
export const GROUP = { PG: 'G', SG: 'G', G: 'G', SF: 'F', PF: 'F', F: 'F', C: 'C' };

// Split rows for a list of enriched games: [label, games, FP/G, minutes/G].
export function splits(games, opts = {}) {
  const live = games.filter(g => !g.dnp);
  const row = (label, list, group) => ({ label, group, n: list.length, fp: mean(list.map(g => g.line.fp)), min: mean(list.map(g => g.line.min)) });
  const out = [
    row('Back-to-back', live.filter(g => g.rest === 0), 'Rest'),
    row('1 day off', live.filter(g => g.rest === 1), 'Rest'),
    row('2+ days off', live.filter(g => g.rest >= 2), 'Rest'),
    row('Home', live.filter(g => g.home), 'Where'),
    row('Away', live.filter(g => !g.home), 'Where'),
  ];
  if (opts.gs ?? live.some(g => g.gs != null)) {
    out.push(row('Started', live.filter(g => g.gs === 1), 'Role'), row('Off the bench', live.filter(g => g.gs === 0), 'Role'));
  }
  if (opts.opp) {
    // g.defd = how soft his opponent was that season for his position group (defenseDiffs; + = allows more).
    const grade = g => g.defd;
    out.push(
      row('Soft defense (+5%)', live.filter(g => grade(g) >= 0.05), 'Opponent'),
      row('Average (±5%)', live.filter(g => grade(g) > -0.05 && grade(g) < 0.05), 'Opponent'),
      row('Tough defense (−5%)', live.filter(g => grade(g) <= -0.05), 'Opponent'),
    );
  }
  return out;
}

// Role by fantasy week (oldest first): minutes, usage, shares, starts. Weeks with a big minutes jump (25%+ and 5+ min vs
// the 3 weeks before) are flagged.
export function roleWeeks(games) {
  const by = new Map();
  for (const g of games) {
    if (g.dnp) continue;
    const k = `${g.season ?? ''}|${g.week}`;
    if (!by.has(k)) by.set(k, { season: g.season, week: g.week, games: [] });
    by.get(k).games.push(g);
  }
  const weeks = [...by.values()].map(w => {
    const gl = w.games;
    const avg = f => mean(gl.map(f).filter(x => x != null));
    return { ...w, n: gl.length, min: avg(g => g.line.min), fp: avg(g => g.line.fp), usg: avg(g => g.usg), fgaShare: avg(g => g.fgaShare), fpShare: avg(g => g.fpShare),
      gs: gl.every(g => g.gs == null) ? null : gl.filter(g => g.gs === 1).length / gl.length };
  });
  weeks.forEach((w, i) => {
    const before = weeks.slice(Math.max(0, i - 3), i);
    if (before.length < 2) return;
    const b = mean(before.map(x => x.min));
    if (w.min - b >= 5 && w.min >= b * 1.25) w.jump = 'up';
    else if (b - w.min >= 5 && w.min <= b * 0.75) w.jump = 'down';
  });
  return weeks;
}

// Percentile of v in a sorted list (share of the pool at or below it; lower-better stats flipped by the caller).
export function pctRank(sorted, v) {
  if (!sorted.length || v == null) return null;
  let lo = 0, hi = sorted.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (sorted[m] <= v) lo = m + 1; else hi = m; }
  return lo / sorted.length;
}

// Squarified treemap: items [{ v, ... }] (v > 0) into a w x h box -> [{ ...item, x, y, w, h }].
export function treemap(items, w, h) {
  const list = items.filter(x => x.v > 0).sort((a, b) => b.v - a.v);
  const total = list.reduce((s, x) => s + x.v, 0);
  if (!total) return [];
  const scale = (w * h) / total;
  const out = [];
  let x = 0, y = 0, W = w, H = h;
  let row = [];
  const worst = (r, side) => {
    const s = r.reduce((a, b) => a + b.a, 0);
    const mx = Math.max(...r.map(z => z.a)), mn = Math.min(...r.map(z => z.a));
    return Math.max((side * side * mx) / (s * s), (s * s) / (side * side * mn));
  };
  const place = r => {
    const s = r.reduce((a, b) => a + b.a, 0);
    if (W >= H) { const cw = s / H; let cy = y; for (const z of r) { const ch = z.a / cw; out.push({ ...z.it, x, y: cy, w: cw, h: ch }); cy += ch; } x += cw; W -= cw; }
    else { const ch = s / W; let cx = x; for (const z of r) { const cw = z.a / ch; out.push({ ...z.it, x: cx, y, w: cw, h: ch }); cx += cw; } y += ch; H -= ch; }
  };
  for (const it of list) {
    const z = { it, a: it.v * scale };
    const side = Math.min(W, H);
    if (!row.length || worst([...row, z], side) <= worst(row, side)) row.push(z);
    else { place(row); row = [z]; }
  }
  if (row.length) place(row);
  return out;
}

// Totals of a window of enriched games (DNPs skipped), with his team's totals in those games so usage rate is the same
// formula as the 2K page (null when any game has no team row).
export function windowLine(games) {
  const live = games.filter(g => !g.dnp);
  const line = totalOf(live.map(g => ({ ...g, line: { ...g.line, tmFga: g.tm?.fga ?? 0, tmFta: g.tm?.fta ?? 0, tmTo: g.tm?.to ?? 0, tmMin: g.tm?.min ?? 0 } })));
  if (live.some(g => !g.tm)) line.usg = null;
  return line;
}
