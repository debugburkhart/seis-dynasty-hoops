// Advanced Stats page (Test features, owner Nov 4 2026; logic in assets/advstats.js). Kept out of app.js; app.js passes
// its helpers in (h = { DATA, esc, gmLoad, gmSave, COMMISH, teamName }). Hand-written SVG charts, sized to the card
// (redrawn on resize), tap any mark = its numbers in the card's tip line (phones have no hover).
// Owner's choices: game-by-game trends, percentile profile, scatter plots, consistency + FP mix, role shift, rest /
// home / starter / opponent splits, team usage tree; players = the 2K Compare tray (gm-bk-cmp, up to 4); teams = NBA
// teams and fantasy teams; pool switch position / whole NBA / rostered; windows season + last 5 / 10 / 20 games.

import { get } from './commish.js';
import { betaCard } from './test-features.js';
import { playerPhoto } from './records.js';
import { NBA_TEAM_CODES, gameLog, lineFromTable, nbaTeamName, seasonTable, teamLogo } from './breakdown.js';
import {
  GROUP, MIX, consistency, defenseDiffs, enrichGames, fpMix, loadAdv, mean, pctRank, poss, ptObj, roleWeeks, splits, tgObj, treemap, windowLine,
} from './advstats.js';

const MAX = 4;
const COLORS = ['#173266', '#d9a53f', '#2f8fd8', '#c8553d'];
const MIX_COLORS = { pts: '#173266', reb: '#2f8fd8', ast: '#d9a53f', stl: '#3a9d6a', blk: '#7a5cc4', tpm: '#8ec5ff', shoot: '#9aa3b5', bonus: '#f4c24f', to: '#c8553d', tf: '#e08a7a' };
const WINS = [['season', 'Season'], [5, 'Last 5'], [10, 'Last 10'], [20, 'Last 20']];
const POOLS = [['pos', 'His position'], ['nba', 'Whole NBA'], ['rost', 'Rostered here']];
const NBA_POS = new Set(['PG', 'SG', 'G', 'SF', 'PF', 'F', 'C']);
const POOL_MIN = 10; // pool: 10+ minutes a game and 40% of the most games anyone played
const f1 = x => (x == null || !Number.isFinite(x) ? '–' : (Math.round(x * 10) / 10).toFixed(1));
const pc = x => (x == null || !Number.isFinite(x) ? '–' : `${Math.round(x * 100)}%`);
const ord = n => { const t = n % 100, u = n % 10; return `${n}${t >= 11 && t <= 13 ? "th" : u === 1 ? "st" : u === 2 ? "nd" : u === 3 ? "rd" : "th"}`; };
const short = d => new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const sLabel = s => `${s}-${String(Number(s) + 1).slice(2)}`;
const plain = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Percentile stats (lo = lower is better). v(line) on a totals line.
const STATS = [
  ['fpg', 'FP/G', l => l.fp / l.gp], ['fp36', 'FP/36', l => (l.min ? (l.fp / l.min) * 36 : null)], ['min', 'Minutes', l => l.min / l.gp],
  ['pts', 'Points', l => l.pts / l.gp], ['reb', 'Rebounds', l => l.reb / l.gp], ['ast', 'Assists', l => l.ast / l.gp],
  ['stk', 'Stocks', l => (l.stl + l.blk) / l.gp], ['tpm', '3PM', l => l.tpm / l.gp], ['ts', 'TS%', l => l.ts], ['usg', 'Usage', l => l.usg],
  ['to', 'Turnovers', l => l.to / l.gp, true],
];
const RADAR = ['fpg', 'pts', 'reb', 'ast', 'stk', 'tpm', 'ts', 'usg'];
const fmtStat = (k, v) => (v == null ? '–' : k === 'ts' ? pc(v) : k === 'usg' ? `${f1(v)}%` : f1(v));
const SCATTERS = [
  ['usg', 'ts', 'Usage vs TS%'], ['min', 'fpg', 'Minutes vs FP/G'], ['usg', 'fpg', 'Usage vs FP/G'], ['min', 'fp36', 'Minutes vs FP/36'],
];
const TRENDS = [['fp', 'Fantasy pts', g => g.line.fp], ['min', 'Minutes', g => g.line.min], ['usg', 'Usage %', g => g.usg], ['fp36', 'FP/36', g => (g.line.min ? (g.line.fp / g.line.min) * 36 : null)], ['pts', 'Points', g => g.line.pts]];

// ---------- SVG helpers ----------
function scale(d0, d1, r0, r1) { const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0); return x => r0 + (x - d0) * k; }
function nice(lo, hi, n = 4) {
  if (!(hi > lo)) { hi = lo + 1; }
  const step0 = (hi - lo) / n, mag = 10 ** Math.floor(Math.log10(step0)), step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= step0);
  const a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step;
  const ticks = []; for (let t = a; t <= b + step / 2; t += step) ticks.push(Math.round(t * 1000) / 1000);
  return { lo: a, hi: b, ticks };
}
const tipAttr = (esc, t) => ` data-tip="${esc(t)}" tabindex="0"`;

export async function renderAdvanced(body, params, h) {
  const { DATA, esc, gmLoad, gmSave, COMMISH, teamName } = h;
  // dark mode (theme.js): the navy series color would vanish on a dark card, so it turns light blue
  const navy = document.documentElement.classList.contains('dark') ? '#8eb4ec' : '#173266';
  COLORS[0] = navy; MIX_COLORS.pts = navy;
  const cur = DATA.seasons.at(-1);
  const seasonsAll = DATA.seasons.map(s => s.season);
  const season = params.get('season') === 'career' ? 'career' : seasonsAll.includes(params.get('season')) ? params.get('season') : cur.season;
  const O = { view: 'players', win: 'season', pool: 'pos', trend: 'fp', scatter: 0, tree: 'fp', teams: ['ATL'], role: null, kind: 'nba', ftree: 'pts', ...gmLoad('gm-adv-opts', {}) };
  if (params.get('view')) O.view = params.get('view') === 'teams' ? 'teams' : 'players';
  if (params.get('kind')) O.kind = params.get('kind') === 'fantasy' ? 'fantasy' : 'nba';
  if (params.get('nba') && NBA_TEAM_CODES.includes(params.get('nba'))) O.teams = [params.get('nba'), ...O.teams.filter(t => t !== params.get('nba'))].slice(0, MAX);
  const fteam = params.get('team') || COMMISH;
  const saveO = () => gmSave('gm-adv-opts', { ...O });
  // ?p=pid (2K card link): put him in the tray if there's room.
  const tray = () => gmLoad('gm-bk-cmp', []).filter(Boolean).slice(0, MAX);
  let note = '';
  const addP = params.get('p');
  if (addP && !tray().includes(addP)) { if (tray().length < MAX) gmSave('gm-bk-cmp', [...tray(), addP]); else note = `The compare list holds ${MAX} players: remove one to add another.`; }
  for (const pid of (params.get('ps') ?? '').split(',').filter(Boolean)) if (!tray().includes(pid) && tray().length < MAX) gmSave('gm-bk-cmp', [...tray(), pid]);
  // Used once: drop ?p= from the address so a later redraw doesn't add him back after he's removed.
  if (addP || params.get('ps')) {
    const q = new URLSearchParams(params); q.delete('p'); q.delete('ps');
    try { history.replaceState(null, '', `#/commish?${q}`); } catch { /* fine */ }
  }

  body.innerHTML = betaCard('Advanced Stats', '<p class="cm-rule">Adding up box scores…</p>');
  const poolSeason = season === 'career' ? cur.season : season;
  const seasons = season === 'career' ? seasonsAll : [season];
  const [all, rosters, table, leagues] = await Promise.all([
    get('/v1/players/nba', {}), get(`/v1/league/${cur.leagueId}/rosters`, []), seasonTable(poolSeason),
    Promise.all(DATA.seasons.map(s => get(`/v1/league/${s.leagueId}`, {}))),
  ]);
  const scoringOf = Object.fromEntries(DATA.seasons.map((s, i) => [s.season, leagues[i]?.scoring_settings ?? {}]));
  const advs = Object.fromEntries(await Promise.all(seasons.map(async s => [s, await loadAdv(DATA, s).catch(() => null)])));
  if (!body.isConnected) return;
  const rostered = new Set((rosters ?? []).flatMap(r => r.players ?? []));
  const ownerOf = {}; for (const r of rosters ?? []) for (const pid of r.players ?? []) ownerOf[pid] = r.owner_id;
  const nameOf = pid => all?.[pid]?.full_name ?? DATA.players?.[pid]?.n ?? `Player ${pid}`;
  const shortName = pid => { const p = all?.[pid]; return p?.first_name ? `${p.first_name[0]}. ${p.last_name}` : nameOf(pid); };
  const groupOf = pid => GROUP[all?.[pid]?.position ?? DATA.players?.[pid]?.pos] ?? null;

  // Pool: season lines of everyone with enough games and minutes.
  const sc = scoringOf[poolSeason];
  const lines = Object.entries(table.players).map(([pid, row]) => ({ pid, l: lineFromTable(row, table.keys, sc) }));
  const most = Math.max(0, ...lines.map(x => x.l.gp));
  const poolAll = lines.filter(x => x.l.gp >= Math.max(1, Math.round(most * 0.4)) && x.l.min / x.l.gp >= POOL_MIN);
  const poolFor = (group, which = O.pool) => poolAll.filter(x => (which === 'nba' ? true : which === 'rost' ? rostered.has(x.pid) : groupOf(x.pid) === group));
  const sortedCache = {};
  const sortedVals = (key, group, which = O.pool) => {
    const ck = `${key}|${group}|${which}`;
    if (sortedCache[ck]) return sortedCache[ck];
    const f = STATS.find(s => s[0] === key)[2];
    return (sortedCache[ck] = poolFor(group, which).map(x => f(x.l)).filter(v => v != null && Number.isFinite(v)).sort((a, b) => a - b));
  };
  const pctOf = (key, v, group) => { const p = pctRank(sortedVals(key, group), v); return p == null ? null : STATS.find(s => s[0] === key)[3] ? 1 - p : p; };

  // Picked players: game logs of the seasons shown, enriched with team totals; then the window.
  const loadPlayers = async () => Promise.all(tray().map(async (pid, i) => {
    const per = await Promise.all(seasons.map(async s => enrichGames((await gameLog(DATA, pid, s).catch(() => [])).map(g => ({ ...g, season: s })), advs[s])));
    const games = per.flat().filter(g => !g.dnp);
    const win = O.win === 'season' ? games : games.slice(-Number(O.win));
    return { pid, i, color: COLORS[i], name: nameOf(pid), short: shortName(pid), group: groupOf(pid), games, win, line: windowLine(win) };
  }));
  let P = await loadPlayers();
  if (!body.isConnected) return;

  const link = (q = {}) => `#/commish?${new URLSearchParams(Object.entries({ tab: 'advanced', season: season === cur.season ? '' : season, ...q, back: params.get('back') ?? '', backl: params.get('backl') ?? '' }).filter(([, v]) => v !== '' && v != null))}`;
  const seg = (key, list, val) => `<div class="dvp-seg as-seg" role="group">${list.map(([v, label]) => `<button type="button" class="ct-chip${String(val) === String(v) ? ' on' : ''}" data-o="${key}" data-v="${v}">${esc(label)}</button>`).join('')}</div>`;
  const tipLine = '<p class="as-tip" aria-live="polite">Tap a dot, bar or box for its numbers.</p>';
  const legend = () => `<div class="as-legend">${P.map(p => `<span><i style="background:${p.color}"></i>${esc(p.short)}</span>`).join('')}</div>`;
  const widthOf = () => Math.max(280, Math.min(900, (body.clientWidth || 360) - 34));

  // ---------- Player cards ----------
  const pickerCard = () => {
    const chips = P.map(p => `<span class="as-pchip" style="--c:${p.color}"><img src="${playerPhoto(DATA, p.pid)}" alt="" loading="lazy"><b>${esc(p.name)}</b><small>${esc([all?.[p.pid]?.team, all?.[p.pid]?.position].filter(Boolean).join(' · '))}</small><a href="#/commish?tab=breakdown&list=league&p=${p.pid}${ownerOf[p.pid] ? '' : '&fa=1'}&back=${encodeURIComponent(link())}&backl=${encodeURIComponent('Advanced Stats')}" title="2K card">2K</a><button type="button" data-rm="${p.pid}" aria-label="Remove ${esc(p.name)}">×</button></span>`).join('');
    return betaCard('Players', `
      <div class="as-pchips">${chips || '<p class="empty">No players picked yet. Search below, or use + Compare on the 2K breakdown.</p>'}</div>
      ${P.length < MAX ? '<div class="as-search"><input type="search" placeholder="Add a player (name)" aria-label="Add a player" autocomplete="off"><div class="as-results"></div></div>' : ''}
      ${note ? `<p class="as-note">${esc(note)}</p>` : ''}
      <p class="cm-rule">Same list as the 2K breakdown's Compare (up to ${MAX}; changes show on both pages). ${season === 'career' ? 'Career = every league season (2023-24 on), each season under its own league scoring.' : ''}</p>`, { sub: `${P.length}/${MAX}` });
  };

  // Game by game: dots per game + rolling average line per player.
  const trendCard = () => {
    const [tk, tl, tf] = TRENDS.find(t => t[0] === O.trend) ?? TRENDS[0];
    if (!P.length) return '';
    const W = widthOf(), H = 230, M = { l: 34, r: 10, t: 12, b: 26 };
    const career = season === 'career';
    const rollN = O.win !== 'season' && Number(O.win) <= 10 ? 3 : 5;
    const series = P.map(p => ({ p, pts: p.win.map((g, j) => ({ g, j, v: tf(g) })).filter(x => x.v != null && Number.isFinite(x.v)) }));
    const vals = series.flatMap(s => s.pts.map(x => x.v));
    if (!vals.length) return betaCard('Game by game', `${seg('trend', TRENDS.map(t => [t[0], t[1]]), O.trend)}<p class="empty">No games in this window.</p>`);
    const yv = nice(Math.min(0, ...vals), Math.max(...vals));
    const Y = scale(yv.lo, yv.hi, H - M.b, M.t);
    const day = d => Date.parse(`${d}T12:00:00Z`) / 864e5;
    // Season: x = date (shared); career / last N: x = game number in the window.
    const byDate = !career && O.win === 'season';
    const dates = series.flatMap(s => s.pts.map(x => day(x.g.date)));
    const maxN = Math.max(...series.map(s => s.pts.length));
    const X = byDate ? scale(Math.min(...dates), Math.max(...dates) + 0.01, M.l + 6, W - M.r - 6) : scale(0, Math.max(1, maxN - 1), M.l + 6, W - M.r - 6);
    const xOf = (s, x, k) => (byDate ? X(day(x.g.date)) : X(maxN - s.pts.length + k));
    const grid = yv.ticks.map(t => `<line class="as-grid" x1="${M.l}" x2="${W - M.r}" y1="${Y(t)}" y2="${Y(t)}"/><text class="as-ax" x="${M.l - 4}" y="${Y(t) + 3}" text-anchor="end">${t}</text>`).join('');
    const xl = byDate
      ? (() => { const a = Math.min(...dates), b = Math.max(...dates); return [a, (a + b) / 2, b].map(d => `<text class="as-ax" x="${X(d)}" y="${H - 8}" text-anchor="middle">${short(new Date(d * 864e5).toISOString().slice(0, 10))}</text>`).join(''); })()
      : `<text class="as-ax" x="${M.l + 6}" y="${H - 8}">${career ? 'oldest game' : `${maxN} games ago`}</text><text class="as-ax" x="${W - M.r}" y="${H - 8}" text-anchor="end">newest</text>`;
    const marks = series.map(s => {
      const roll = s.pts.map((x, k) => { const w = s.pts.slice(Math.max(0, k - rollN + 1), k + 1); return { x: xOf(s, x, k), y: Y(mean(w.map(z => z.v))) }; });
      const path = roll.length > 1 ? `<path class="as-roll" stroke="${s.p.color}" d="${roll.map((q, k) => `${k ? 'L' : 'M'}${q.x.toFixed(1)},${q.y.toFixed(1)}`).join('')}"/>` : '';
      const dots = s.pts.map((x, k) => { const g = x.g; return `<circle class="as-dot" cx="${xOf(s, x, k).toFixed(1)}" cy="${Y(x.v).toFixed(1)}" r="3.2" fill="${s.p.color}"${tipAttr(esc, `${s.p.name} · ${short(g.date)}${career ? ` ${g.season}` : ''} ${g.away ? '@' : 'vs'} ${g.opp}: ${f1(g.line.fp)} FP, ${f1(g.line.min)} min${g.usg != null ? `, ${f1(g.usg)}% usage` : ''}, ${g.line.pts} pts ${g.line.reb} reb ${g.line.ast} ast`)}><title>${esc(`${short(g.date)}: ${tl} ${f1(x.v)}`)}</title></circle>`; }).join('');
      return `<g>${dots}${path}</g>`;
    }).join('');
    const avgs = series.map(s => `<span style="color:${s.p.color}"><b>${esc(s.p.short)}</b> ${f1(mean(s.pts.map(x => x.v)))} avg · last ${rollN} ${f1(mean(s.pts.slice(-rollN).map(x => x.v)))}</span>`).join('');
    return betaCard('Game by game', `${seg('trend', TRENDS.map(t => [t[0], t[1]]), O.trend)}
      <svg class="as-svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(tl)} by game">${grid}${xl}${marks}</svg>
      ${legend()}<p class="as-avgs">${avgs}</p>${tipLine}
      <p class="cm-rule">Dots = each game; line = ${rollN}-game rolling average. ${byDate ? 'Across = date.' : 'Across = game number (newest on the right).'} Usage uses his team's totals in that game (same formula as the 2K page).</p>`, { sub: tl });
  };

  // Percentile profile: radar of 8 stats + every stat as a percentile bar.
  const profileCard = () => {
    if (!P.length) return '';
    const W = Math.min(widthOf(), 420), H = Math.min(W, 340), cx = W / 2, cy = H / 2 + 4, R = Math.min(W, H) / 2 - 42;
    const rows = P.map(p => ({ p, pc: Object.fromEntries(STATS.map(([k, , f]) => [k, pctOf(k, p.line.gp ? f(p.line) : null, p.group)])), v: Object.fromEntries(STATS.map(([k, , f]) => [k, p.line.gp ? f(p.line) : null])) }));
    const ang = i => -Math.PI / 2 + (i * 2 * Math.PI) / RADAR.length;
    const pt = (i, r) => [cx + Math.cos(ang(i)) * r, cy + Math.sin(ang(i)) * r];
    const rings = [0.25, 0.5, 0.75, 1].map(f => `<polygon class="as-ring" points="${RADAR.map((_, i) => pt(i, R * f).join(',')).join(' ')}"/>`).join('');
    const spokes = RADAR.map((k, i) => { const [x, y] = pt(i, R), [lx, ly] = pt(i, R + 18); return `<line class="as-grid" x1="${cx}" y1="${cy}" x2="${x}" y2="${y}"/><text class="as-ax as-rlab" x="${lx}" y="${ly + 3}" text-anchor="middle">${STATS.find(s => s[0] === k)[1]}</text>`; }).join('');
    const polys = rows.map(r => {
      const pts = RADAR.map((k, i) => pt(i, R * (r.pc[k] ?? 0)));
      return `<polygon class="as-rpoly" points="${pts.map(q => q.join(',')).join(' ')}" fill="${r.p.color}" stroke="${r.p.color}"/>${pts.map((q, i) => `<circle class="as-dot" cx="${q[0]}" cy="${q[1]}" r="3.5" fill="${r.p.color}"${tipAttr(esc, `${r.p.name}: ${STATS.find(s => s[0] === RADAR[i])[1]} ${fmtStat(RADAR[i], r.v[RADAR[i]])} = ${r.pc[RADAR[i]] == null ? 'no rank' : `${ord(Math.round(r.pc[RADAR[i]] * 100))} percentile`}`)}/>`).join('')}`;
    }).join('');
    const bars = STATS.map(([k, label, , lo]) => `<tr><th>${label}${lo ? ' <small>(fewer = better)</small>' : ''}</th>${rows.map(r => `<td><div class="as-pbar"${tipAttr(esc, `${r.p.name}: ${label} ${fmtStat(k, r.v[k])}, ${r.pc[k] == null ? 'no rank' : `${ord(Math.round(r.pc[k] * 100))} percentile`}`)}><i style="width:${Math.round((r.pc[k] ?? 0) * 100)}%;background:${r.p.color}"></i><span>${fmtStat(k, r.v[k])}</span><b>${r.pc[k] == null ? '–' : Math.round(r.pc[k] * 100)}</b></div></td>`).join('')}</tr>`).join('');
    const poolText = O.pool === 'nba' ? 'every NBA player' : O.pool === 'rost' ? 'players on a fantasy roster here' : 'players at his position (G / F / C)';
    return betaCard('Percentile profile', `${seg('pool', POOLS, O.pool)}
      <svg class="as-svg as-radar" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Percentile radar">${rings}${spokes}${polys}</svg>
      ${legend()}${tipLine}
      <div class="as-scroll"><table class="as-ptable"><thead><tr><th></th>${rows.map(r => `<th style="color:${r.p.color}">${esc(r.p.short)}</th>`).join('')}</tr></thead><tbody>${bars}</tbody></table></div>
      <p class="cm-rule">Number = his ${O.win === 'season' ? (season === 'career' ? 'career' : 'season') : `last ${O.win} games`} average; bar + bold = percentile among ${poolText} in ${sLabel(poolSeason)} (season averages, ${POOL_MIN}+ minutes a game and 40% of the most games played; ${poolAll.length} players). 100 = best; turnovers are flipped so fewer = higher.</p>`, { sub: 'vs the pool' });
  };

  // Scatter: the pool as grey dots, picked players big and labeled.
  const scatterCard = () => {
    const [xk, yk, title] = SCATTERS[O.scatter] ?? SCATTERS[0];
    const fx = STATS.find(s => s[0] === xk)[2], fy = STATS.find(s => s[0] === yk)[2];
    const groups = new Set(P.map(p => p.group));
    const pool = (O.pool === 'pos' && groups.size ? poolAll.filter(x => groups.has(groupOf(x.pid))) : poolFor(null)).map(x => ({ pid: x.pid, x: fx(x.l), y: fy(x.l) })).filter(d => d.x != null && d.y != null);
    const picked = P.filter(p => p.line.gp).map(p => ({ p, x: fx(p.line), y: fy(p.line) })).filter(d => d.x != null && d.y != null);
    const xs = [...pool, ...picked].map(d => d.x), ys = [...pool, ...picked].map(d => d.y);
    if (!xs.length) return '';
    const W = widthOf(), H = 280, M = { l: 40, r: 12, t: 12, b: 32 };
    const xv = nice(Math.min(...xs), Math.max(...xs)), yv = nice(Math.min(...ys), Math.max(...ys));
    const X = scale(xv.lo, xv.hi, M.l, W - M.r), Y = scale(yv.lo, yv.hi, H - M.b, M.t);
    const fx2 = (k, v) => (k === 'ts' ? `${Math.round(v * 100)}%` : v);
    const grid = yv.ticks.map(t => `<line class="as-grid" x1="${M.l}" x2="${W - M.r}" y1="${Y(t)}" y2="${Y(t)}"/><text class="as-ax" x="${M.l - 4}" y="${Y(t) + 3}" text-anchor="end">${fx2(yk, t)}</text>`).join('')
      + xv.ticks.map(t => `<text class="as-ax" x="${X(t)}" y="${H - 16}" text-anchor="middle">${fx2(xk, t)}</text>`).join('');
    const lab = k => STATS.find(s => s[0] === k)[1];
    const ax = `<text class="as-ax as-axt" x="${W - M.r}" y="${H - 3}" text-anchor="end">${lab(xk)} →</text><text class="as-ax as-axt" transform="translate(10 ${M.t}) rotate(90)">${lab(yk)} →</text>`;
    const mx = mean(pool.map(d => d.x)), my = mean(pool.map(d => d.y));
    const avg = `<line class="as-avg" x1="${X(mx)}" x2="${X(mx)}" y1="${M.t}" y2="${H - M.b}"/><line class="as-avg" x1="${M.l}" x2="${W - M.r}" y1="${Y(my)}" y2="${Y(my)}"/>`;
    const dots = pool.map(d => `<circle class="as-pool${rostered.has(d.pid) ? ' rost' : ''}" cx="${X(d.x).toFixed(1)}" cy="${Y(d.y).toFixed(1)}" r="3"${tipAttr(esc, `${nameOf(d.pid)} (${all?.[d.pid]?.team ?? ''}): ${lab(xk)} ${fmtStat(xk, d.x)}, ${lab(yk)} ${fmtStat(yk, d.y)}${rostered.has(d.pid) ? '' : ' · free agent'}`)}/>`).join('');
    const big = picked.map(d => `<g><circle class="as-dot as-big" cx="${X(d.x)}" cy="${Y(d.y)}" r="6" fill="${d.p.color}"${tipAttr(esc, `${d.p.name}: ${lab(xk)} ${fmtStat(xk, d.x)}, ${lab(yk)} ${fmtStat(yk, d.y)}${O.win === 'season' ? '' : ` (last ${O.win} games)`}`)}/><text class="as-lbl" x="${X(d.x) + (X(d.x) > W - 90 ? -9 : 9)}" y="${Y(d.y) - 7}" text-anchor="${X(d.x) > W - 90 ? 'end' : 'start'}">${esc(d.p.short)}</text></g>`).join('');
    return betaCard('Scatter', `${seg('scatter', SCATTERS.map((s, i) => [i, s[2]]), O.scatter)}${seg('pool', POOLS, O.pool)}
      <svg class="as-svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(title)}">${grid}${avg}${dots}${big}${ax}</svg>
      ${tipLine}<p class="cm-rule">Grey = the pool (${pool.length} players, ${sLabel(poolSeason)} season averages; darker = on a fantasy roster here, light = free agent); dashed = pool average. Picked players = ${O.win === 'season' ? 'this window' : `last ${O.win} games`}.</p>`, { sub: title });
  };

  // Consistency: every game as a dot on one FP axis, 10th-90th percentile band, median, average.
  const consistencyCard = () => {
    if (!P.length) return '';
    const W = widthOf(), rowH = 46, M = { l: 10, r: 10, t: 6, b: 22 };
    const cs = P.map(p => ({ p, c: consistency(p.win.map(g => g.line.fp)) })).filter(x => x.c.n);
    if (!cs.length) return '';
    const xv = nice(Math.min(0, ...cs.map(x => x.c.min)), Math.max(...cs.map(x => x.c.max)), 5);
    const X = scale(xv.lo, xv.hi, M.l, W - M.r);
    const H = M.t + cs.length * rowH + M.b;
    const rowsSvg = cs.map(({ p, c }, i) => {
      const y = M.t + i * rowH + rowH / 2;
      const dots = p.win.map((g, j) => `<circle class="as-cdot" cx="${X(g.line.fp).toFixed(1)}" cy="${(y + ((j * 7) % 15) - 7).toFixed(1)}" r="2.6" fill="${p.color}"${tipAttr(esc, `${p.name} · ${short(g.date)} ${g.away ? '@' : 'vs'} ${g.opp}: ${f1(g.line.fp)} FP${g.line.fp >= c.avg * 1.25 ? ' (boom)' : g.line.fp <= c.avg * 0.75 ? ' (bust)' : ''}`)}/>`).join('');
      return `<rect class="as-band" x="${X(c.floor)}" y="${y - 12}" width="${Math.max(2, X(c.ceil) - X(c.floor))}" height="24" fill="${p.color}"${tipAttr(esc, `${p.name}: floor (10th pct) ${f1(c.floor)}, ceiling (90th pct) ${f1(c.ceil)}, median ${f1(c.med)}`)}/>
        <line class="as-med" x1="${X(c.med)}" x2="${X(c.med)}" y1="${y - 14}" y2="${y + 14}"/>${dots}`;
    }).join('');
    const axis = xv.ticks.map(t => `<text class="as-ax" x="${X(t)}" y="${H - 6}" text-anchor="middle">${t}</text><line class="as-grid" x1="${X(t)}" x2="${X(t)}" y1="${M.t}" y2="${H - M.b}"/>`).join('');
    const table = `<div class="as-scroll"><table class="as-ptable as-ctable"><thead><tr><th></th><th>Games</th><th>Avg</th><th>Floor</th><th>Median</th><th>Ceiling</th><th>SD</th><th>Boom</th><th>Bust</th></tr></thead><tbody>${cs.map(({ p, c }) => `<tr><th style="color:${p.color}">${esc(p.short)}</th><td>${c.n}</td><td>${f1(c.avg)}</td><td>${f1(c.floor)}</td><td>${f1(c.med)}</td><td>${f1(c.ceil)}</td><td>${f1(c.sd)}</td><td>${pc(c.boom)}</td><td>${pc(c.bust)}</td></tr>`).join('')}</tbody></table></div>`;
    return betaCard('Consistency', `<svg class="as-svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Fantasy points per game spread">${axis}${rowsSvg}</svg>
      ${legend()}${tipLine}${table}
      <p class="cm-rule">Each dot = one game's FP; shaded band = his floor to ceiling (10th to 90th percentile of his games), black line = median. <b>Boom</b> = a game 25%+ above his own average in this window, <b>bust</b> = 25%+ below. SD = standard deviation (lower = steadier).</p>`, { sub: 'FP per game spread' });
  };

  // FP mix: where each player's fantasy points come from (per game, each game under its season's scoring).
  const mixCard = () => {
    if (!P.some(p => p.win.length)) return '';
    const mixes = P.filter(p => p.win.length).map(p => {
      const sum = Object.fromEntries(MIX.map(([k]) => [k, 0]));
      for (const g of p.win) { const m = fpMix(g.line, scoringOf[g.season]); for (const [k] of MIX) sum[k] += m[k]; }
      const n = p.win.length || 1;
      return { p, per: Object.fromEntries(MIX.map(([k]) => [k, sum[k] / n])) };
    });
    const bar = ({ p, per }) => {
      const pos = MIX.filter(([k]) => per[k] > 0.05), neg = MIX.filter(([k]) => per[k] < -0.05);
      const gross = pos.reduce((s, [k]) => s + per[k], 0) || 1;
      const net = Object.values(per).reduce((s, x) => s + x, 0);
      return `<div class="as-mixrow"><div class="as-mixname" style="color:${p.color}"><b>${esc(p.short)}</b><small>${f1(net)} FP/G</small></div>
        <div class="as-mixbar">${pos.map(([k, l]) => `<i style="width:${(per[k] / gross) * 100}%;background:${MIX_COLORS[k]}"${tipAttr(esc, `${p.name}: ${l} ${f1(per[k])} FP/G (${pc(per[k] / gross)} of his positive points)`)}>${per[k] / gross >= 0.12 ? Math.round((per[k] / gross) * 100) : ''}</i>`).join('')}</div>
        <div class="as-mixneg">${neg.map(([k, l]) => `<span${tipAttr(esc, `${p.name}: ${l} ${f1(per[k])} FP/G`)}>${l} ${f1(per[k])}</span>`).join(' · ') || 'No negatives'}</div></div>`;
    };
    const used = MIX.filter(([k]) => mixes.some(m => Math.abs(m.per[k]) > 0.05));
    return betaCard('Where the points come from', `${mixes.map(bar).join('')}
      <div class="as-legend">${used.map(([k, l]) => `<span><i style="background:${MIX_COLORS[k]}"></i>${l}</span>`).join('')}</div>${tipLine}
      <p class="cm-rule">Fantasy points per game split by category under the league's scoring (each game under its own season's). Bar = his positive points (number = % of them); turnovers and techs take points away and are listed under it. <b>Bonuses</b> = double-doubles, triple-doubles and the 40-point / 15-assist / 20-rebound bonuses.</p>`, { sub: O.win === 'season' ? (season === 'career' ? 'career' : 'season') : `last ${O.win}` });
  };

  // Role shift: one player's role by fantasy week (small multiples), big minutes jumps marked.
  const roleCard = () => {
    if (!P.length) return '';
    const p = P.find(x => x.pid === O.role && x.games.length) ?? P.find(x => x.games.length);
    if (!p) return '';
    const weeks = roleWeeks(p.games);
    if (!weeks.length) return '';
    const W = widthOf(), H = 74, M = { l: 6, r: 6, t: 16, b: 14 };
    const bw = (W - M.l - M.r) / weeks.length;
    const label = w => (season === 'career' ? `'${String(w.season).slice(2)} W${w.week}` : `W${w.week}`);
    const metric = (key, title, fmt) => {
      const vals = weeks.map(w => w[key]);
      if (vals.every(v => v == null)) return '';
      const hi = Math.max(...vals.filter(v => v != null)) || 1;
      const bars = weeks.map((w, i) => {
        const v = w[key]; if (v == null) return '';
        const bh = ((H - M.t - M.b) * v) / hi, x = M.l + i * bw;
        return `<rect class="as-wbar${w.jump ? ` j-${w.jump}` : ''}" x="${(x + 1).toFixed(1)}" y="${(H - M.b - bh).toFixed(1)}" width="${Math.max(1, bw - 2).toFixed(1)}" height="${bh.toFixed(1)}" fill="${p.color}"${tipAttr(esc, `${p.name} · ${label(w)} (${w.n} games): ${title} ${fmt(v)}${w.jump === 'up' ? ' · minutes jumped' : w.jump === 'down' ? ' · minutes dropped' : ''}`)}/>`;
      }).join('');
      const first = vals.find(v => v != null), last = [...vals].reverse().find(v => v != null);
      const marks = key === 'min' ? weeks.map((w, i) => (w.jump ? `<text class="as-jump ${w.jump}" x="${M.l + i * bw + bw / 2}" y="${M.t - 3}" text-anchor="middle">${w.jump === 'up' ? '▲' : '▼'}</text>` : '')).join('') : '';
      const ticks = weeks.length <= 12 ? weeks.map((w, i) => `<text class="as-ax" x="${M.l + i * bw + bw / 2}" y="${H - 2}" text-anchor="middle">${label(w)}</text>`).join('') : `<text class="as-ax" x="${M.l}" y="${H - 2}">${label(weeks[0])}</text><text class="as-ax" x="${W - M.r}" y="${H - 2}" text-anchor="end">${label(weeks.at(-1))}</text>`;
      return `<div class="as-mult"><div class="as-multh"><b>${title}</b><span>${fmt(first)} → <b>${fmt(last)}</b></span></div><svg class="as-svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${bars}${marks}${ticks}</svg></div>`;
    };
    const withG = P.filter(x => x.games.length);
    const pick = withG.length > 1 ? `<div class="dvp-seg as-seg">${withG.map(x => `<button type="button" class="ct-chip${x.pid === p.pid ? ' on' : ''}" data-o="role" data-v="${x.pid}">${esc(x.short)}</button>`).join('')}</div>` : '';
    return betaCard('Role shift', `${pick}
      ${metric('min', 'Minutes', f1)}${metric('usg', 'Usage', v => `${f1(v)}%`)}${metric('fgaShare', 'Share of team shots', pc)}${metric('fpShare', 'Share of team FP', pc)}${metric('gs', 'Started', pc)}${metric('fp', 'FP per game', f1)}
      ${tipLine}<p class="cm-rule">One bar per fantasy week (${season === 'career' ? 'every league season' : 'this season'}, all his games, not the window). ▲ / ▼ = minutes up / down 25%+ and 5+ a game vs his 3 weeks before (a trade, a teammate's injury, a new role). Shares = his part of his NBA team's totals in the games he played. Started = ESPN's games started${season === 'career' || season !== cur.season ? ' (past seasons: from the 2K page\'s GS file)' : ''}.</p>`, { sub: esc(p.name) });
  };

  // Splits: rest, home/away, starter/bench, opponent defense.
  const splitCard = () => {
    if (!P.some(p => p.win.length)) return '';
    // Opponent strength by season (FP allowed to his position group, that season's team rows).
    const bySeason = {};
    for (const s of seasons) bySeason[s] = advs[s] ? defenseDiffs(advs[s]) : null;
    const hasDef = Object.values(bySeason).some(Boolean);
    const hasGs = P.some(p => p.win.some(g => g.gs != null));
    const per = P.filter(p => p.win.length).map(p => {
      const games = p.win.map(g => ({ ...g, defd: bySeason[g.season]?.[g.opp]?.[p.group ?? 'all']?.diff }));
      return { p, rows: splits(games, { opp: hasDef, gs: hasGs }) };
    });
    const labels = per[0].rows.map(r => [r.label, r.group]);
    const hi = Math.max(1, ...per.flatMap(x => x.rows.map(r => r.fp ?? 0)));
    let lastGroup = '';
    const body2 = labels.map(([label, group], i) => {
      const head = group !== lastGroup ? `<tr class="as-sgroup"><th colspan="${per.length + 1}">${group}</th></tr>` : '';
      lastGroup = group;
      return `${head}<tr><th>${label}</th>${per.map(({ p, rows }) => { const r = rows[i]; return `<td><div class="as-sbar"${tipAttr(esc, `${p.name} · ${label}: ${r.n ? `${f1(r.fp)} FP/G, ${f1(r.min)} min in ${r.n} games` : 'no games'}`)}><i style="width:${r.n ? ((r.fp / hi) * 100).toFixed(1) : 0}%;background:${p.color}"></i><span>${r.n ? f1(r.fp) : '–'} <small>${r.n}g</small></span></div></td>`; }).join('')}</tr>`;
    }).join('');
    return betaCard('Splits', `<div class="as-scroll"><table class="as-ptable as-stable"><thead><tr><th></th>${per.map(({ p }) => `<th style="color:${p.color}">${esc(p.short)}</th>`).join('')}</tr></thead><tbody>${body2}</tbody></table></div>${tipLine}
      <p class="cm-rule">FP per game in each situation (small number = games). <b>Rest</b> = days since his NBA team's last game (back-to-back = played the day before). <b>Opponent</b> = how many FP that defense allowed per game to his position group (G / F / C) over the whole season vs the league average: soft = 5%+ more, tough = 5%+ less (hindsight: the full season's numbers, like Defense vs Position). Small samples swing a lot.</p>`, { sub: O.win === 'season' ? (season === 'career' ? 'career' : 'season') : `last ${O.win}` });
  };

  // ---------- Team cards ----------
  const advNow = advs[season === 'career' ? cur.season : season];
  const teamGames = () => {
    const by = {};
    for (const [k, row] of Object.entries(advNow?.tg ?? {})) { const [d, t] = k.split('|'); (by[t] ??= []).push({ d, ...tgObj(row) }); }
    for (const l of Object.values(by)) l.sort((a, b) => (a.d < b.d ? -1 : 1));
    return by;
  };
  const teamStats = () => {
    const by = teamGames();
    const allowed = {}; // games each team allowed, keyed by date
    for (const [t, l] of Object.entries(by)) for (const g of l) (allowed[g.opp] ??= {})[g.d] = g;
    const out = {};
    for (const [t, l] of Object.entries(by)) {
      const use = O.win === 'season' ? l : l.slice(-Number(O.win));
      const opp = use.map(g => allowed[t]?.[g.d]).filter(Boolean);
      const sum = (list, f) => list.reduce((s, g) => s + f(g), 0);
      const n = use.length;
      const ps = sum(use, poss), pa = sum(opp, poss);
      out[t] = {
        n, fp: sum(use, g => g.fp) / n, fpa: opp.length ? sum(opp, g => g.fp) / opp.length : null, pace: (ps + pa) / 2 / n,
        fp100: ps ? (sum(use, g => g.fp) / ps) * 100 : null, fpa100: pa ? (sum(opp, g => g.fp) / pa) * 100 : null,
        pos: Object.fromEntries(['PG', 'SG', 'SF', 'PF', 'C'].map(k => [k, sum(use, g => g[k]) / n])),
        mix: (() => { const m = Object.fromEntries(MIX.map(([k]) => [k, 0])); for (const g of use) { const x = fpMix(g, scoringOf[season === 'career' ? cur.season : season]); for (const [k] of MIX) m[k] += x[k]; } for (const k in m) m[k] /= n; return m; })(),
      };
    }
    return out;
  };
  const teamPicker = () => `<div class="as-tchips">${O.teams.map((t, i) => `<span class="as-pchip" style="--c:${COLORS[i]}">${teamLogo(t) ? `<img src="${teamLogo(t)}" alt="">` : ''}<b>${esc(nbaTeamName(t))}</b><button type="button" data-trm="${t}" aria-label="Remove ${esc(t)}">×</button></span>`).join('')}
    ${O.teams.length < MAX ? `<select class="as-tadd" aria-label="Add an NBA team"><option value="">+ Add a team</option>${NBA_TEAM_CODES.filter(t => !O.teams.includes(t)).sort((a, b) => nbaTeamName(a).localeCompare(nbaTeamName(b))).map(t => `<option value="${t}">${esc(nbaTeamName(t))}</option>`).join('')}</select>` : ''}</div>`;
  const teamMapCard = T => {
    const codes = Object.keys(T).filter(t => T[t].n && T[t].fpa != null);
    if (!codes.length) return '';
    const W = widthOf(), H = 300, M = { l: 40, r: 12, t: 12, b: 32 };
    const xv = nice(Math.min(...codes.map(t => T[t].fp)), Math.max(...codes.map(t => T[t].fp))), yv = nice(Math.min(...codes.map(t => T[t].fpa)), Math.max(...codes.map(t => T[t].fpa)));
    const X = scale(xv.lo, xv.hi, M.l, W - M.r), Y = scale(yv.lo, yv.hi, M.t, H - M.b); // allowed: fewer = higher up
    const mx = mean(codes.map(t => T[t].fp)), my = mean(codes.map(t => T[t].fpa));
    const grid = yv.ticks.map(t => `<line class="as-grid" x1="${M.l}" x2="${W - M.r}" y1="${Y(t)}" y2="${Y(t)}"/><text class="as-ax" x="${M.l - 4}" y="${Y(t) + 3}" text-anchor="end">${t}</text>`).join('') + xv.ticks.map(t => `<text class="as-ax" x="${X(t)}" y="${H - 16}" text-anchor="middle">${t}</text>`).join('');
    const dots = codes.map(t => { const i = O.teams.indexOf(t); return `<g${tipAttr(esc, `${nbaTeamName(t)} (${T[t].n} games): scores ${f1(T[t].fp)} FP/G, allows ${f1(T[t].fpa)}, pace ${f1(T[t].pace)} possessions`)}><circle class="${i >= 0 ? 'as-dot as-big' : 'as-pool rost'}" cx="${X(T[t].fp)}" cy="${Y(T[t].fpa)}" r="${i >= 0 ? 7 : 4}"${i >= 0 ? ` fill="${COLORS[i]}"` : ''}/><text class="as-tlbl${i >= 0 ? ' on' : ''}" x="${X(T[t].fp) + 7}" y="${Y(T[t].fpa) + 3}">${t}</text></g>`; }).join('');
    return betaCard('Team map', `<svg class="as-svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Fantasy points scored versus allowed">${grid}
      <line class="as-avg" x1="${X(mx)}" x2="${X(mx)}" y1="${M.t}" y2="${H - M.b}"/><line class="as-avg" x1="${M.l}" x2="${W - M.r}" y1="${Y(my)}" y2="${Y(my)}"/>
      <text class="as-q" x="${W - M.r - 4}" y="${M.t + 12}" text-anchor="end">Productive + stingy</text><text class="as-q" x="${W - M.r - 4}" y="${H - M.b - 6}" text-anchor="end">Shootouts</text><text class="as-q" x="${M.l + 4}" y="${H - M.b - 6}">Leaky, little scoring</text><text class="as-q" x="${M.l + 4}" y="${M.t + 12}">Grind-it-out</text>
      ${dots}<text class="as-ax as-axt" x="${W - M.r}" y="${H - 3}" text-anchor="end">FP scored per game →</text><text class="as-ax as-axt" transform="translate(10 ${M.t}) rotate(90)">FP allowed (fewer = higher) →</text></svg>${tipLine}
      <p class="cm-rule">Every NBA team's players' fantasy points per game (across) vs what its opponents' players scored against it (up = allows fewer), ${O.win === 'season' ? 'this season' : `each team's last ${O.win} games`}, league scoring. Dashed = league average.</p>`, { sub: '30 teams' });
  };
  const teamProfileCard = T => {
    const picked = O.teams.filter(t => T[t]);
    if (!picked.length) return betaCard('Team profile', '<p class="empty">No games for these teams yet.</p>');
    const codes = Object.keys(T).filter(t => T[t].n);
    const rank = (k, t, lo) => { const order = codes.filter(c => T[c][k] != null).sort((a, b) => (lo ? T[a][k] - T[b][k] : T[b][k] - T[a][k])); return order.indexOf(t) + 1; };
    const rows = [['fp', 'FP scored / game'], ['fpa', 'FP allowed / game', true], ['pace', 'Pace (possessions)'], ['fp100', 'FP per 100 possessions'], ['fpa100', 'FP allowed per 100', true]];
    const tbl = `<div class="as-scroll"><table class="as-ptable"><thead><tr><th></th>${picked.map(t => `<th style="color:${COLORS[O.teams.indexOf(t)]}">${t}</th>`).join('')}</tr></thead><tbody>${rows.map(([k, l, lo]) => {
      const hi = Math.max(...codes.map(c => T[c][k] ?? 0));
      return `<tr><th>${l}</th>${picked.map(t => `<td><div class="as-sbar"${tipAttr(esc, `${nbaTeamName(t)}: ${l} ${f1(T[t][k])} (${ord(rank(k, t, lo))} of ${codes.length}${lo ? ', 1st = fewest' : ''})`)}><i style="width:${(((T[t][k] ?? 0) / hi) * 100).toFixed(1)}%;background:${COLORS[O.teams.indexOf(t)]}"></i><span>${f1(T[t][k])} <small>${ord(rank(k, t, lo))}</small></span></div></td>`).join('')}</tr>`;
    }).join('')}</tbody></table></div>`;
    const stack = (t, parts, colors, title) => {
      const pos = parts.filter(([, v]) => v > 0.05), tot = pos.reduce((s, [, v]) => s + v, 0) || 1;
      return `<div class="as-mixrow"><div class="as-mixname" style="color:${COLORS[O.teams.indexOf(t)]}"><b>${t}</b></div><div class="as-mixbar">${pos.map(([k, v, l]) => `<i style="width:${(v / tot) * 100}%;background:${colors[k]}"${tipAttr(esc, `${nbaTeamName(t)} · ${title}: ${l} ${f1(v)} FP/G (${pc(v / tot)})`)}>${v / tot >= 0.12 ? Math.round((v / tot) * 100) : ''}</i>`).join('')}</div></div>`;
    };
    const POSC = { PG: COLORS[0], SG: '#2f8fd8', SF: '#d9a53f', PF: '#3a9d6a', C: '#c8553d' };
    return betaCard('Team profile', `${tbl}
      <h3 class="as-h3">FP by position (who produces)</h3>${picked.map(t => stack(t, Object.entries(T[t].pos).map(([k, v]) => [k, v, k]), POSC, 'by position')).join('')}
      <div class="as-legend">${Object.entries(POSC).map(([k, c]) => `<span><i style="background:${c}"></i>${k}</span>`).join('')}</div>
      <h3 class="as-h3">FP by category</h3>${picked.map(t => stack(t, MIX.map(([k, l]) => [k, T[t].mix[k], l]), MIX_COLORS, 'by category')).join('')}
      <div class="as-legend">${MIX.filter(([k]) => picked.some(t => T[t].mix[k] > 0.05)).map(([k, l]) => `<span><i style="background:${MIX_COLORS[k]}"></i>${l}</span>`).join('')}</div>${tipLine}
      <p class="cm-rule">Small number = league rank. Pace = possessions per game (FGA + 0.44 FTA + TO − OREB, both teams averaged). Positions = Sleeper's main position of each player.</p>`, { sub: O.win === 'season' ? 'season' : `last ${O.win}` });
  };
  const TREE_M = [['fp', 'FP', 'fantasy points'], ['min', 'Minutes', 'minutes'], ['fga', 'Shots (FGA)', 'shots'], ['plays', 'Plays used', 'plays used']];
  const treeSvg = (items, W, H, color) => treemap(items, W, H).map(r => {
    const big = r.w > 58 && r.h > 30;
    return `<g${tipAttr(esc, r.tip)}><rect class="as-trect" x="${r.x.toFixed(1)}" y="${r.y.toFixed(1)}" width="${Math.max(0, r.w - 2).toFixed(1)}" height="${Math.max(0, r.h - 2).toFixed(1)}" fill="${color(r)}"/>${big ? `<text class="as-tname" x="${r.x + 5}" y="${r.y + 15}">${esc(r.label)}</text><text class="as-tval" x="${r.x + 5}" y="${r.y + 28}">${pc(r.share)}</text>` : ''}</g>`;
  }).join('');
  const usageTreeCard = () => {
    const t = O.teams.includes(O.treeTeam) ? O.treeTeam : O.teams[0];
    if (!t || !advNow) return '';
    const rows = Object.entries(advNow.pt).filter(([k]) => k.endsWith(`|${t}`)).map(([k, row]) => ({ pid: k.split('|')[0], ...ptObj(row) }));
    const val = r => (O.tree === 'plays' ? r.fga + 0.44 * r.fta + r.to : r[O.tree]);
    const total = rows.reduce((s, r) => s + val(r), 0) || 1;
    const items = rows.map(r => ({ v: val(r), share: val(r) / total, label: shortName(r.pid), pid: r.pid, gone: all?.[r.pid]?.team !== t,
      tip: `${nameOf(r.pid)}${all?.[r.pid]?.team !== t ? ` (now ${all?.[r.pid]?.team || 'no team'})` : ''}: ${pc(val(r) / total)} of the ${TREE_M.find(m => m[0] === O.tree)[2]} · ${r.gp} games, ${f1(r.min / r.gp)} min, ${f1(r.fp / r.gp)} FP/G${r.gs ? `, ${r.gs} starts` : ''}${ownerOf[r.pid] ? ` · ${teamName(ownerOf[r.pid], cur.season)}` : ' · free agent'}` }));
    const W = widthOf(), H = Math.round(Math.min(420, W * 0.75));
    const ranked = [...items].sort((a, b) => b.v - a.v);
    const color = r => { const i = ranked.indexOf(r); return r.gone ? '#b9bfcc' : ['#0b1d3d', '#10264f', '#173266', '#22427e', '#2f5596', '#4a6ea8', '#6f8dbd', '#94acd0'][Math.min(i, 7)]; };
    const top3 = ranked.slice(0, 3).reduce((s, r) => s + r.share, 0);
    return betaCard(`Usage tree: ${esc(nbaTeamName(t))}`, `${O.teams.length > 1 ? `<div class="dvp-seg as-seg">${O.teams.map(x => `<button type="button" class="ct-chip${x === t ? ' on' : ''}" data-o="treeTeam" data-v="${x}">${x}</button>`).join('')}</div>` : ''}${seg('tree', TREE_M, O.tree)}
      <svg class="as-svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Team share by player">${treeSvg(items, W, H, color)}</svg>${tipLine}
      <p class="as-avgs">Top 3 players = <b>${pc(top3)}</b> of the team's ${TREE_M.find(m => m[0] === O.tree)[2]}; ${items.length} players used.</p>
      <p class="cm-rule">Box size = each player's share of the team's season total (${sLabel(season === "career" ? cur.season : season)}; the window doesn't apply). Grey = no longer on the team. <b>Plays used</b> = FGA + 0.44 FTA + turnovers (the plays usage rate counts). Tap a box for his numbers.</p>`, { sub: 'who gets the minutes, shots, FP' });
  };

  // Fantasy teams: locked points by player (who carried the team), and how top-heavy each team is.
  const fantasyCards = () => {
    const pw = (DATA.playerWeeks ?? []).filter(x => season === 'career' || x.s === season);
    const teams = {};
    for (const x of pw) { const t = (teams[x.o] ??= { pts: 0, starts: 0, by: {} }); t.pts += x.p; t.starts++; const b = (t.by[x.pid] ??= { pts: 0, starts: 0 }); b.pts += x.p; b.starts++; }
    const me = teams[fteam] ? fteam : Object.keys(teams)[0];
    if (!me) return betaCard('Fantasy teams', '<p class="empty">No locked points yet this season.</p>');
    const owners = (DATA.seasons.at(-1).teams ?? []).map(t => t.owner ?? t.o ?? t).filter(o => typeof o === 'string');
    const ownerList = [...new Set([...owners, ...Object.keys(teams)])].filter(o => teams[o]);
    const pick = `<select class="as-fsel" aria-label="Fantasy team">${ownerList.map(o => `<option value="${o}"${o === me ? ' selected' : ''}>${esc(teamName(o, season === 'career' ? cur.season : season))}</option>`).join('')}</select>`;
    const t = teams[me];
    const key = O.ftree === 'starts' ? 'starts' : 'pts';
    const items = Object.entries(t.by).map(([pid, b]) => ({ v: b[key], share: b[key] / (key === 'pts' ? t.pts : t.starts), label: shortName(pid), pid, still: ownerOf[pid] === me,
      tip: `${nameOf(pid)}: ${f1(b.pts)} locked points in ${b.starts} starts (${f1(b.pts / b.starts)} per start) = ${pc(b.pts / t.pts)} of the team's locked points${ownerOf[pid] === me ? '' : ' · no longer on the roster'}` }));
    const ranked = [...items].sort((a, b) => b.v - a.v);
    const W = widthOf(), H = Math.round(Math.min(400, W * 0.7));
    const color = r => { const i = ranked.indexOf(r); return !r.still ? '#b9bfcc' : ['#7a560a', '#9a6d10', '#b88520', '#d9a53f', '#e4b964', '#ecc983', '#f2d8a3', '#f6e4bf'][Math.min(i, 7)]; };
    const rows = ownerList.map(o => { const x = teams[o]; const tops = Object.values(x.by).map(b => b.pts).sort((a, b) => b - a); return { o, pts: x.pts, starts: x.starts, n: Object.keys(x.by).length, top1: tops[0] / x.pts, top3: tops.slice(0, 3).reduce((s, v) => s + v, 0) / x.pts, per: x.pts / x.starts }; }).sort((a, b) => b.pts - a.pts);
    const tbl = `<div class="as-scroll"><table class="as-ptable as-ftable"><thead><tr><th>Team</th><th>Locked</th><th>Per start</th><th>Players</th><th>Top 3 share</th></tr></thead><tbody>${rows.map(r => `<tr class="${r.o === me ? 'cm-me' : ''}"><th>${esc(teamName(r.o, season === 'career' ? cur.season : season))}</th><td>${Math.round(r.pts).toLocaleString()}</td><td>${f1(r.per)}</td><td>${r.n}</td><td><div class="as-sbar"${tipAttr(esc, `Top player ${pc(r.top1)}, top 3 ${pc(r.top3)} of the locked points`)}><i style="width:${(r.top3 * 100).toFixed(1)}%;background:#d9a53f"></i><span>${pc(r.top3)}</span></div></td></tr>`).join('')}</tbody></table></div>`;
    return `${betaCard('Who carried the team', `<div class="as-row">${pick}${seg('ftree', [['pts', 'Locked points'], ['starts', 'Starts']], O.ftree)}</div>
      <svg class="as-svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Locked points by player">${treeSvg(items, W, H, color)}</svg>${tipLine}
      <p class="cm-rule">Box = each player's share of the team's locked points (or starts), ${season === 'career' ? 'every season' : 'this season'}, every game type. Grey = not on the roster today.</p>`, { sub: esc(teamName(me, season === 'career' ? cur.season : season)) })}
      ${betaCard('Star power vs depth', `${tbl}<p class="cm-rule"><b>Top 3 share</b> = how much of the team's locked points came from its 3 best players (high = star-driven, low = deep). Per start = locked points per starter-week.</p>`, { sub: 'all 8 teams' })}`;
  };

  // ---------- Page ----------
  const draw = () => {
    const head = betaCard('Advanced Stats', `
      ${params.get('back') ? `<a class="bk-back" href="${esc(params.get('back'))}">← Back to ${esc(params.get('backl') || 'the last page')}</a>` : ''}
      ${seg('view', [['players', 'Players'], ['teams', 'Teams']], O.view)}
      <div class="dvp-seg as-seg">${[...seasonsAll.map(s => [s, `${s}-${String(Number(s) + 1).slice(2)}`]), ['career', 'Career']].map(([s, l]) => `<a class="ct-chip${season === s ? ' on' : ''}" href="${link({ season: s === cur.season ? '' : s })}">${l}</a>`).join('')}</div>
      ${seg('win', WINS, O.win)}
      ${O.view === 'teams' ? seg('kind', [['nba', 'NBA teams'], ['fantasy', 'Fantasy teams']], O.kind) : ''}
      ${advNow ? '' : `<p class="as-note">Team totals for ${season === 'career' ? cur.season : season} arrive with the next nightly update (usage, shares, rest days and team views use them).</p>`}`, { sub: 'charts from every box score' });
    let cards;
    if (O.view === 'teams') {
      if (O.kind === 'fantasy') cards = fantasyCards();
      else { const T = teamStats(); cards = `${betaCard('NBA teams', teamPicker(), { sub: `${O.teams.length}/${MAX}` })}${teamProfileCard(T)}${usageTreeCard()}${teamMapCard(T)}`; }
    } else {
      cards = `${pickerCard()}${trendCard()}${profileCard()}${scatterCard()}${consistencyCard()}${mixCard()}${roleCard()}${splitCard()}
        ${betaCard('How it works', `<p class="cm-rule">Everything comes from Sleeper's per-game box scores (the same games as the 2K breakdown; All-Star Game left out), scored with each season's league scoring. Team totals per game (for usage, shares, rest days, pace and opponent strength) are saved nightly in data/adv-stats.json; this week's games are added live. Windows: Season = every game of the season picked; Last N = his last N games played. Percentiles and the scatter pool always use season averages (${POOL_MIN}+ minutes a game).</p>`)}`;
    }
    body.innerHTML = `<div class="as-page">${head}${cards}</div>`;
    bind();
  };
  const redraw = async reload => { if (reload) { P = await loadPlayers(); if (!body.isConnected) return; } const y = window.scrollY; draw(); window.scrollTo(0, y); };

  function bind() {
    const page = body.querySelector('.as-page');
    page.addEventListener('click', e => {
      const o = e.target.closest('[data-o]');
      if (o) {
        const k = o.dataset.o, v = o.dataset.v;
        O[k] = k === 'scatter' ? Number(v) : k === 'win' && v !== 'season' ? Number(v) : v;
        saveO();
        redraw(k === 'win');
        return;
      }
      const rm = e.target.closest('[data-rm]');
      if (rm) { gmSave('gm-bk-cmp', tray().filter(x => x !== rm.dataset.rm)); redraw(true); return; }
      const trm = e.target.closest('[data-trm]');
      if (trm) { O.teams = O.teams.filter(x => x !== trm.dataset.trm); if (!O.teams.length) O.teams = ['ATL']; saveO(); redraw(); return; }
      const add = e.target.closest('[data-add]');
      if (add) { if (tray().length < MAX && !tray().includes(add.dataset.add)) gmSave('gm-bk-cmp', [...tray(), add.dataset.add]); redraw(true); return; }
      const tip = e.target.closest('[data-tip]');
      if (tip) {
        const card = tip.closest('.card');
        card?.querySelectorAll('.as-sel').forEach(x => x.classList.remove('as-sel'));
        tip.classList.add('as-sel');
        const line = card?.querySelector('.as-tip');
        if (line) line.textContent = tip.dataset.tip;
      }
    });
    page.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest?.('[data-tip]')) { e.preventDefault(); e.target.click(); } });
    page.querySelector('.as-tadd')?.addEventListener('change', e => { if (e.target.value) { O.teams = [...O.teams, e.target.value].slice(0, MAX); O.treeTeam = e.target.value; saveO(); redraw(); } });
    page.querySelector('.as-fsel')?.addEventListener('change', e => { location.hash = link({ view: 'teams', kind: 'fantasy', team: e.target.value === COMMISH ? '' : e.target.value }); });
    const input = page.querySelector('.as-search input');
    if (input) {
      const fpOf = Object.fromEntries(lines.map(x => [x.pid, x.l.fp]));
      const res = page.querySelector('.as-results');
      input.addEventListener('input', () => {
        const q = plain(input.value.trim());
        if (q.length < 2) { res.innerHTML = ''; return; }
        const hits = Object.entries(all ?? {}).filter(([pid, p]) => /^\d+$/.test(pid) && p?.active !== false && p?.team && NBA_POS.has(p.position) && !tray().includes(pid) && plain(p.full_name ?? '').includes(q))
          .sort((a, b) => (fpOf[b[0]] ?? 0) - (fpOf[a[0]] ?? 0)).slice(0, 8);
        res.innerHTML = hits.map(([pid, p]) => `<button type="button" data-add="${pid}"><b>${esc(p.full_name)}</b> <small>${esc([p.team, p.position, ownerOf[pid] ? teamName(ownerOf[pid], cur.season) : 'free agent'].join(' · '))}</small></button>`).join('') || '<p class="empty">No match.</p>';
      });
    }
  }
  draw();
  // Charts are drawn to the card's width: redraw after a real width change (rotation, window resize).
  let lastW = body.clientWidth, rt;
  const onResize = () => { clearTimeout(rt); rt = setTimeout(() => { if (!body.isConnected) { window.removeEventListener('resize', onResize); return; } if (Math.abs(body.clientWidth - lastW) > 30) { lastW = body.clientWidth; redraw(); } }, 250); };
  window.addEventListener('resize', onResize);
}
