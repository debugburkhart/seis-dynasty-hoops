// Report: what changes if the league switched to Yahoo's or ESPN's standard points scoring (owner, Nov 9 2026: "Show
// comparable scores (like now anything over 40 is considered good, what is the comparable score to that and other scores)
// what positions get better, which ones get worse?"; then: "include ESPN standard scoring ... what the highest scoring
// records (both individual players and team scores) would look like"). Every NBA game of last season + this season so far
// is scored all three ways from Sleeper's per-game box scores (All-Star Game rows dropped). Records: the league's real
// locked games (DATA.playerWeeks) matched to their box score and re-scored. h = { DATA, esc, get, name, teamName }.
import { fantasy, minutes } from './breakdown.js';
import { exhibitionRow } from './config.js';

// Default points-league scoring on each site.
export const YAHOO = { pts: 1, reb: 1.2, ast: 1.5, stl: 3, blk: 3, to: -1 };
export const ESPN = { pts: 1, tpm: 1, fgm: 2, fga: -1, ftm: 1, fta: -1, reb: 1, ast: 2, stl: 4, blk: 4, to: -2 };
const MIN_GAME = 10; // games of 10+ minutes make up the score scale (no garbage-time cameos)
const MIN_GP = 20; // a player needs 20+ such games for the position / player tables
const POOL = 200; // players compared: the top 200 by FP/G under our scoring (about every rostered-quality player)
const REC_N = 10; // records shown per list
const CAND_PLAYER = 40; // re-scored candidates per season: best locked player games by our scoring
const CAND_TEAM = 15; // ... and best team scores
const POS = ['PG', 'SG', 'SF', 'PF', 'C'];
const LABEL = { pts: 'Points', reb: 'Rebounds', ast: 'Assists', stl: 'Steals', blk: 'Blocks', to: 'Turnovers', tpm: '3-pointers made',
  fgm: 'Field goals made', fga: 'Field goals attempted', ftm: 'Free throws made', fta: 'Free throws attempted',
  dd: 'Double-double', td: 'Triple-double', bonus_pt_40p: '40+ points bonus', bonus_pt_50p: '50+ points bonus',
  bonus_ast_15p: '15+ assists bonus', bonus_reb_20p: '20+ rebounds bonus', tf: 'Technical foul', ff: 'Flagrant foul' };
const ORDER = ['pts', 'tpm', 'fgm', 'fga', 'ftm', 'fta', 'reb', 'ast', 'stl', 'blk', 'to'];
// Stat -> the "points from" bucket (ESPN's shooting terms count as scoring).
const BUCKET = { pts: 'pts', tpm: 'pts', fgm: 'pts', fga: 'pts', ftm: 'pts', fta: 'pts', reb: 'reb', ast: 'ast', stl: 'stl', blk: 'blk' };
const BUCKETS = ['pts', 'reb', 'ast', 'stl', 'blk'];

const WEEKS = {};
async function weekGames(season, week) {
  const key = `${season}-${week}`;
  if (WEEKS[key]) return WEEKS[key];
  const res = await fetch(`https://api.sleeper.com/stats/nba/${season}/${week}?season_type=regular`);
  if (!res.ok) throw new Error(`Sleeper box scores ${season} week ${week}: HTTP ${res.status}`);
  const rows = ((await res.json()) ?? []).filter(r => /^\d+$/.test(r.player_id) && !exhibitionRow(r) && minutes(r.stats) > 0)
    .map(r => ({ pid: r.player_id, d: r.date, opp: r.opponent, min: minutes(r.stats), s: r.stats }));
  WEEKS[key] = rows;
  return rows;
}
async function loadWeeks(list) { // [[season, week]], 6 at a time; a failed week = empty
  const out = {};
  for (let i = 0; i < list.length; i += 6) {
    const part = list.slice(i, i + 6);
    const got = await Promise.all(part.map(([s, w]) => weekGames(s, w).catch(() => [])));
    part.forEach(([s, w], j) => { out[`${s}-${w}`] = got[j]; });
  }
  return out;
}

const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(p * (sorted.length - 1))))];
const rankOf = (sorted, v) => { let lo = 0, hi = sorted.length; while (lo < hi) { const m = (lo + hi) >> 1; if (sorted[m] < v) lo = m + 1; else hi = m; } return lo / sorted.length; };
const f1 = x => (Math.round(x * 10) / 10).toFixed(1);
const num = x => (Math.round(x * 10) / 10).toLocaleString();
const sign = x => `${x > 0 ? '+' : ''}${Math.round(x * 10) / 10}`;
const pc = x => `${x > 0 ? '+' : ''}${Math.round(x * 1000) / 10}%`;
const sorted = arr => [...arr].sort((a, b) => a - b);

export async function reportYahoo(h) {
  const { DATA, esc, get, name, teamName } = h;
  const cur = DATA.seasons.at(-1);
  const prevSeason = String(Number(cur.season) - 1);
  const [leagues, state, all, rosters] = await Promise.all([
    Promise.all(DATA.seasons.map(s => get(`/v1/league/${s.leagueId}`, null))), get('/v1/state/nba', {}), get('/v1/players/nba', {}),
    get(`/v1/league/${cur.leagueId}/rosters?t=${Date.now()}`, []),
  ]);
  const SC = Object.fromEntries(DATA.seasons.map((s, i) => [s.season, leagues[i]?.scoring_settings ?? null]));
  const OURS = SC[cur.season] ?? {};
  if (!Object.keys(OURS).length) return '<p class="cm-rule">Couldn’t read the league’s scoring from Sleeper. Try again in a minute.</p>';
  const SYS = [{ k: 'y', name: 'Yahoo', sc: YAHOO }, { k: 'e', name: 'ESPN', sc: ESPN }];
  const score = s => ({ o: fantasy(s, OURS), y: fantasy(s, YAHOO), e: fantasy(s, ESPN) });

  // ---- Games for the scale + positions: last season (weeks 1-26) + this season so far ----
  const nowWeek = state?.season === cur.season && state.season_type === 'regular' ? Number(state.week) || 1 : 0;
  const scaleWeeks = [...Array.from({ length: 26 }, (_, i) => [prevSeason, i + 1]), ...Array.from({ length: nowWeek }, (_, i) => [cur.season, i + 1])];
  // ---- Records: candidates from the real locked games ----
  const pw = (DATA.playerWeeks ?? []).filter(r => SC[r.s]);
  const pCand = [];
  for (const s of Object.keys(SC)) pCand.push(...pw.filter(r => r.s === s).sort((a, b) => b.p - a.p).slice(0, CAND_PLAYER));
  const teamGames = [];
  for (const g of DATA.games ?? []) {
    if (g.t !== 'R' && g.t !== 'P') continue;
    for (const side of ['a', 'b']) if (g[side] && g[`${side}p`] != null) teamGames.push({ s: g.s, w: g.w, t: g.t, o: g[side], p: g[`${side}p`], opp: g[side === 'a' ? 'b' : 'a'] });
  }
  const tCand = [];
  for (const s of Object.keys(SC)) tCand.push(...teamGames.filter(g => g.s === s).sort((a, b) => b.p - a.p).slice(0, CAND_TEAM));
  const recWeeks = new Set([...pCand, ...tCand].map(r => `${r.s}-${r.w}`));
  scaleWeeks.forEach(([s, w]) => recWeeks.delete(`${s}-${w}`));
  const weekData = await loadWeeks([...scaleWeeks, ...[...recWeeks].map(k => k.split('-'))]);

  const last = scaleWeeks.filter(([s]) => s === prevSeason).flatMap(([s, w]) => weekData[`${s}-${w}`] ?? []);
  const now = scaleWeeks.filter(([s]) => s === cur.season).flatMap(([s, w]) => weekData[`${s}-${w}`] ?? []);
  const games = [...last, ...now].filter(g => g.min >= MIN_GAME).map(g => ({ ...g, ...score(g.s) }));
  if (games.length < 500) return '<p class="cm-rule">Not enough box scores came back from Sleeper to compare. Try again in a minute.</p>';
  const S = { o: sorted(games.map(g => g.o)), y: sorted(games.map(g => g.y)), e: sorted(games.map(g => g.e)) };
  const avg = k => S[k].reduce((t, x) => t + x, 0) / S[k].length;
  const A = { o: avg('o'), y: avg('y'), e: avg('e') };
  const mapTo = (k, v) => pct(S[k], rankOf(S.o, v));

  // 1) Comparable scores
  const marks = [20, 30, 40, 50, 60, 70];
  const scale = marks.map(m => ({ m, top: 1 - rankOf(S.o, m), y: mapTo('y', m), e: mapTo('e', m) }));
  const at40 = scale.find(s => s.m === 40);
  const band = games.filter(g => g.o >= 25 && g.o <= 55);
  const weekRatio = k => band.reduce((t, g) => t + g[k], 0) / band.reduce((t, g) => t + g.o, 0);

  // 2) Players (last season, full): season FP/G all three ways, by Sleeper's main position.
  const per = {};
  for (const g of last.filter(x => x.min >= MIN_GAME)) {
    const p = (per[g.pid] ??= { pid: g.pid, gp: 0, o: 0, y: 0, e: 0, cat: {} });
    const sc = score(g.s);
    p.gp++; p.o += sc.o; p.y += sc.y; p.e += sc.e;
    for (const k of new Set([...Object.keys(OURS), ...ORDER])) p.cat[k] = (p.cat[k] ?? 0) + (Number(g.s?.[k]) || 0);
  }
  const posOf = pid => { const p = all?.[pid]?.position; return POS.includes(p) ? p : p === 'G' ? 'PG' : p === 'F' ? 'SF' : null; };
  const pname = pid => DATA.players?.[pid]?.n || [all?.[pid]?.first_name, all?.[pid]?.last_name].filter(Boolean).join(' ') || pid;
  const players = Object.values(per).filter(p => p.gp >= MIN_GP && posOf(p.pid))
    .map(p => ({ ...p, pos: posOf(p.pid), fo: p.o / p.gp, fy: p.y / p.gp, fe: p.e / p.gp }))
    .sort((a, b) => b.fo - a.fo).slice(0, POOL);
  players.forEach((p, i) => { p.ro = i + 1; });
  for (const k of ['y', 'e']) [...players].sort((a, b) => b[`f${k}`] - a[`f${k}`]).forEach((p, i) => { p[`r${k}`] = i + 1; });
  const pos = POS.map(ps => {
    const list = players.filter(p => p.pos === ps);
    const n = list.length || 1;
    const avgOf = f => list.reduce((t, p) => t + p[f], 0) / n;
    const top = (k, lim) => list.filter(p => p[k] <= lim).length;
    const move = k => list.reduce((t, p) => t + (p.ro - p[`r${k}`]), 0) / n;
    return { ps, n: list.length, o: avgOf('fo'), y: avgOf('fy'), e: avgOf('fe'), my: move('y'), me: move('e'),
      t50: { o: top('ro', 50), y: top('ry', 50), e: top('re', 50) } };
  });
  const allRatio = k => players.reduce((t, p) => t + p[`f${k}`], 0) / players.reduce((t, p) => t + p.fo, 0);
  const mix = (sc, ps) => {
    const list = players.filter(p => p.pos === ps);
    const tot = {};
    for (const p of list) for (const [k, v] of Object.entries(sc)) if (BUCKET[k]) tot[BUCKET[k]] = (tot[BUCKET[k]] ?? 0) + p.cat[k] * v;
    const sum = BUCKETS.reduce((t, b) => t + Math.max(0, tot[b] ?? 0), 0) || 1;
    return b => (tot[b] ?? 0) / sum;
  };
  const movers = k => ({
    up: [...players].sort((a, b) => (b.ro - b[`r${k}`]) - (a.ro - a[`r${k}`])).slice(0, 10),
    down: [...players].sort((a, b) => (a.ro - a[`r${k}`]) - (b.ro - b[`r${k}`])).slice(0, 10),
  });

  // 3) Our teams: each roster's top 9 (active + IR, no taxi) by last season's FP/G, all three ways.
  const byPid = Object.fromEntries(Object.values(per).filter(p => p.gp >= MIN_GP).map(p => [p.pid, { o: p.o / p.gp, y: p.y / p.gp, e: p.e / p.gp }]));
  const teams = (rosters ?? []).filter(r => r.owner_id).map(r => {
    const taxi = new Set(r.taxi ?? []);
    const list = (r.players ?? []).filter(pid => !taxi.has(pid) && byPid[pid]);
    const top = k => [...list].sort((a, b) => byPid[b][k] - byPid[a][k]).slice(0, 9).reduce((t, pid) => t + byPid[pid][k], 0);
    return { o: r.owner_id, so: top('o'), sy: top('y'), se: top('e') };
  });
  for (const k of ['o', 'y', 'e']) [...teams].sort((a, b) => b[`s${k}`] - a[`s${k}`]).forEach((t, i) => { t[`r${k}`] = i + 1; });
  teams.sort((a, b) => a.ro - b.ro);

  // 4) Records: each locked game matched to his box score that week (the game whose score under THAT season's league
  // scoring = his locked points; closest if Sleeper corrected the box score since), then re-scored.
  const matchCache = {};
  const matchGame = r => {
    const key = `${r.s}|${r.w}|${r.pid}|${r.p}`;
    if (key in matchCache) return matchCache[key];
    const mine = (weekData[`${r.s}-${r.w}`] ?? []).filter(g => g.pid === r.pid);
    let best = null, gap = Infinity;
    for (const g of mine) { const d = Math.abs(fantasy(g.s, SC[r.s]) - r.p); if (d < gap) { gap = d; best = g; } }
    return (matchCache[key] = best ? { g: best, sc: score(best.s), exact: gap < 0.05, gap } : null);
  };
  const pRecs = pCand.map(r => ({ ...r, m: matchGame(r) })).filter(r => r.m);
  const startersOf = (s, w, o) => pw.filter(r => r.s === s && r.w === w && r.o === o);
  const tRecs = tCand.map(g => {
    const st = startersOf(g.s, g.w, g.o).map(r => ({ ...r, m: matchGame(r) }));
    const ok = st.length && st.every(r => r.m);
    return ok ? { ...g, y: st.reduce((t, r) => t + r.m.sc.y, 0), e: st.reduce((t, r) => t + r.m.sc.e, 0),
      sum: st.reduce((t, r) => t + r.p, 0), exact: st.every(r => r.m.exact), n: st.length } : null;
  }).filter(Boolean);
  const pTop = k => [...pRecs].sort((a, b) => (k === 'o' ? b.p - a.p : b.m.sc[k] - a.m.sc[k])).slice(0, REC_N);
  const tTop = k => [...tRecs].sort((a, b) => (k === 'o' ? b.p - a.p : b[k] - a[k])).slice(0, REC_N);
  const pMissing = pCand.length - pRecs.length, tMissing = tCand.length - tRecs.length;

  // ---- Rendering helpers ----
  const tn = o => `${esc(teamName(o, cur.season))} <small>(${esc(name(o))})</small>`;
  const tnS = (o, s) => `${esc(teamName(o, s))} <small>(${esc(name(o))})</small>`;
  const span = s => `${s}-${String((Number(s) + 1) % 100).padStart(2, '0')}`;
  const wk = r => `${span(r.s)} · ${r.t === 'P' ? 'playoffs, ' : ''}wk ${r.w}`;
  const val = v => (v == null || v === 0 ? '—' : `${v > 0 ? '+' : ''}${v}`);
  const cats = [...new Set([...ORDER, ...Object.keys(OURS)])].filter(k => (OURS[k] ?? 0) !== 0 || (YAHOO[k] ?? 0) !== 0 || (ESPN[k] ?? 0) !== 0);
  const name5 = { PG: 'point guards', SG: 'shooting guards', SF: 'small forwards', PF: 'power forwards', C: 'centers' };
  const plist = arr => arr.map(x => name5[x]).join(', ').replace(/, ([^,]*)$/, ' and $1');
  const verdict = k => {
    const key = k === 'y' ? 'my' : 'me';
    const up = pos.filter(p => p[key] > 1.5).map(p => p.ps), down = pos.filter(p => p[key] < -1.5).map(p => p.ps);
    const even = pos.filter(p => !up.includes(p.ps) && !down.includes(p.ps)).map(p => p.ps);
    return { up, down, even, best: [...pos].sort((a, b) => b[key] - a[key])[0], worst: [...pos].sort((a, b) => a[key] - b[key])[0] };
  };
  const vy = verdict('y'), ve = verdict('e');
  const line = g => { const s = g.s; const b = (k, l) => (Number(s?.[k]) ? `${Number(s[k])} ${l}` : null);
    return [b('pts', 'pts'), b('reb', 'reb'), b('ast', 'ast'), b('stl', 'stl'), b('blk', 'blk'), b('to', 'TO')].filter(Boolean).join(', ')
      + (s?.fga ? ` · ${s.fgm ?? 0}-${s.fga} FG` : ''); };
  const pRow = (r, i, k) => `<tr><td class="n">${i + 1}</td><td><b>${esc(pname(r.pid))}</b><br><small>${tnS(r.o, r.s)} · ${wk(r)}${r.m.g.opp ? ` vs ${esc(r.m.g.opp)}` : ''}</small><br><small>${esc(line(r.m.g))}</small></td>
    <td class="n">${k === 'o' ? `<b>${num(r.p)}</b>` : num(r.p)}${r.m.exact ? '' : '<sup>*</sup>'}</td><td class="n">${k === 'y' ? '<b>' : ''}${num(r.m.sc.y)}${k === 'y' ? '</b>' : ''}</td><td class="n">${k === 'e' ? '<b>' : ''}${num(r.m.sc.e)}${k === 'e' ? '</b>' : ''}</td></tr>`;
  const tRow = (r, i, k) => `<tr><td class="n">${i + 1}</td><td><b>${tnS(r.o, r.s)}</b><br><small>${wk(r)} vs ${esc(name(r.opp))}</small></td>
    <td class="n">${k === 'o' ? `<b>${num(r.p)}</b>` : num(r.p)}${r.exact && Math.abs(r.sum - r.p) < 0.5 ? '' : '<sup>*</sup>'}</td><td class="n">${k === 'y' ? '<b>' : ''}${num(r.y)}${k === 'y' ? '</b>' : ''}</td><td class="n">${k === 'e' ? '<b>' : ''}${num(r.e)}${k === 'e' ? '</b>' : ''}</td></tr>`;
  const recTable = (rows, k, row, head) => `<div class="rc-scroll"><table class="rc-tbl"><thead><tr><th class="n">#</th><th>${head}</th><th class="n">Ours</th><th class="n">Yahoo</th><th class="n">ESPN</th></tr></thead>
    <tbody>${rows.map((r, i) => row(r, i, k)).join('')}</tbody></table></div>`;
  const moverCol = (list, k, title, cls) => `<div class="${cls}"><div class="rp-sec">${title}</div>
    ${list.map(p => `<div class="rp-c"><span class="rp-cn">${esc(pname(p.pid))} <small>${p.pos}</small></span><span class="rp-pts">#${p.ro} → <b>#${p[`r${k}`]}</b></span></div>`).join('')}</div>`;
  const posWhy = (v, k) => {
    const out = [];
    if (v.up.length) out.push(`<li><b>Better: ${esc(plist(v.up))}.</b> ${k === 'y'
      ? 'Assists 1.5 instead of 1, steals and blocks 3 instead of 2.'
      : 'Assists 2, steals and blocks 4 each, and an extra point for every made shot (so efficient scorers near the rim cash in).'}</li>`);
    if (v.down.length) out.push(`<li><b>Worse: ${esc(plist(v.down))}.</b> ${k === 'y'
      ? 'Their value leans on points, which Yahoo doesn’t raise.'
      : 'Every missed shot and free throw costs a point and turnovers cost 2, which hurts volume scorers and turnover-prone handlers.'}</li>`);
    if (v.even.length) out.push(`<li><b>About the same: ${esc(plist(v.even))}.</b></li>`);
    return out.join('');
  };

  return `
    <div class="rp-stats">
      <div><b>${Math.round(at40.y)} / ${Math.round(at40.e)}</b><span>Yahoo / ESPN score as rare as our 40 (top ${Math.round(at40.top * 100)}% of games)</span></div>
      <div><b>${pc(A.y / A.o - 1)} / ${pc(A.e / A.o - 1)}</b><span>bigger average game, Yahoo / ESPN (ours ${f1(A.o)})</span></div>
      <div><b>${esc(vy.best.ps)} / ${esc(ve.best.ps)}</b><span>position that gains the most, Yahoo / ESPN</span></div>
    </div>
    <p class="cm-rule">Every NBA game of ${span(prevSeason)}${now.length ? ` and ${span(cur.season)} so far` : ''} (${games.length.toLocaleString()} games of ${MIN_GAME}+ minutes, Sleeper box scores, no All-Star Game) scored three ways. Position and player tables use ${span(prevSeason)} (a full season), the top ${POOL} players by FP/G under our scoring with ${MIN_GP}+ games, by Sleeper’s main position. Records re-score the league’s real locked games.</p>

    <h3 class="rp-h">The three scoring systems</h3>
    <div class="rc-scroll"><table class="rc-tbl"><thead><tr><th>Stat</th><th class="n">Ours</th><th class="n">Yahoo standard</th><th class="n">ESPN standard</th></tr></thead><tbody>
      ${cats.map(k => `<tr><td>${esc(LABEL[k] ?? k)}</td><td class="n">${val(OURS[k])}</td><td class="n">${val(YAHOO[k])}</td><td class="n">${val(ESPN[k])}</td></tr>`).join('')}
    </tbody></table></div>
    <ul class="rc-list">
      <li><b>Yahoo</b> pays more for everything except points: rebounds ×1.2, assists ×1.5, steals and blocks 3. Turnovers cost the same as ours.</li>
      <li><b>ESPN</b> rewards efficiency: a made 2 is worth 3 points (2 pts + 2 for the make − 1 for the attempt), a miss costs 1, a made free throw is worth 1 (1 + 1 − 1), a miss costs 1; a made 3 is worth 5. Assists 2, steals and blocks 4, turnovers −2.</li>
      <li><b>Neither has bonuses</b> (double-double, triple-double, 40/50-point, 15-assist, 20-rebound) and fouls cost nothing.</li>
    </ul>

    <h3 class="rp-h">What a score means: our number → Yahoo and ESPN</h3>
    <p class="cm-rule">“Comparable” = just as rare: a score that beats the same share of games under each system.</p>
    <div class="rc-scroll"><table class="rc-tbl"><thead><tr><th class="n">Ours</th><th class="n">Yahoo</th><th class="n">ESPN</th><th class="n">Top % of games</th><th>Means</th></tr></thead><tbody>
      ${scale.map(s => `<tr${s.m === 40 ? ' class="rc-rec"' : ''}><td class="n"><b>${s.m}</b></td><td class="n"><b>${Math.round(s.y)}</b></td><td class="n"><b>${Math.round(s.e)}</b></td><td class="n">${s.top < 0.01 ? '<1%' : `${Math.round(s.top * 100)}%`}</td><td>${
        ({ 20: 'a quiet night', 30: 'a solid game', 40: 'a good game (our rule of thumb)', 50: 'a big game', 60: 'a monster game', 70: 'once-a-season stuff' })[s.m]}</td></tr>`).join('')}
    </tbody></table></div>
    <ul class="rc-list">
      <li><b>Our “40 is good” = about ${Math.round(at40.y)} in Yahoo and ${Math.round(at40.e)} in ESPN.</b> Average game: ours ${f1(A.o)}, Yahoo ${f1(A.y)} (${pc(A.y / A.o - 1)}), ESPN ${f1(A.e)} (${pc(A.e / A.o - 1)}).</li>
      <li><b>Team weeks (9 locked games), estimated:</b> ${[300, 350, 400, 450, 500].map(w => `${w} → ~${Math.round(w * weekRatio('y') / 5) * 5} Yahoo / ~${Math.round(w * weekRatio('e') / 5) * 5} ESPN`).join(' · ')} (games scoring 25-55 for us score ${pc(weekRatio('y') - 1)} in Yahoo and ${pc(weekRatio('e') - 1)} in ESPN; managers would lock different games, so it’s a guide).</li>
    </ul>

    <h3 class="rp-h">Which positions get better or worse</h3>
    <div class="rc-scroll"><table class="rc-tbl"><thead><tr><th>Position</th><th class="n">Players</th><th class="n">FP/G ours</th><th class="n">Yahoo</th><th class="n">Rank move</th><th class="n">ESPN</th><th class="n">Rank move</th><th class="n">Top 50 ours / Y / E</th></tr></thead><tbody>
      ${pos.map(p => `<tr><td><b>${p.ps}</b></td><td class="n">${p.n}</td><td class="n">${f1(p.o)}</td><td class="n">${f1(p.y)}</td>
        <td class="n ${p.my > 1.5 ? 'rc-ok' : p.my < -1.5 ? 'rc-over' : ''}"><b>${sign(p.my)}</b></td><td class="n">${f1(p.e)}</td>
        <td class="n ${p.me > 1.5 ? 'rc-ok' : p.me < -1.5 ? 'rc-over' : ''}"><b>${sign(p.me)}</b></td><td class="n">${p.t50.o} / ${p.t50.y} / ${p.t50.e}</td></tr>`).join('')}
    </tbody></table></div>
    <p class="cm-rule">Everyone scores more (all ${POOL}: Yahoo ${pc(allRatio('y') - 1)}, ESPN ${pc(allRatio('e') - 1)}), so what matters is who gains MORE than the rest: “Rank move” = average places up (+) or down (−) in the top-${POOL} list.</p>
    <p class="cm-rule"><b>Yahoo</b></p><ul class="rc-list">${posWhy(vy, 'y')}</ul>
    <p class="cm-rule"><b>ESPN</b></p><ul class="rc-list">${posWhy(ve, 'e')}</ul>

    <h3 class="rp-h">Where the points come from</h3>
    <div class="rc-scroll"><table class="rc-tbl"><thead><tr><th>Position</th>${BUCKETS.map(b => `<th class="n">${LABEL[b]}</th>`).join('')}</tr></thead><tbody>
      ${pos.map(p => { const a = mix(OURS, p.ps), y = mix(YAHOO, p.ps), e = mix(ESPN, p.ps); return `<tr><td><b>${p.ps}</b></td>${BUCKETS.map(b => `<td class="n">${Math.round(a(b) * 100)}% / ${Math.round(y(b) * 100)}% / <b>${Math.round(e(b) * 100)}%</b></td>`).join('')}</tr>`; }).join('')}
    </tbody></table></div>
    <p class="cm-rule">Share of each position’s fantasy points, ours / Yahoo / ESPN. ESPN’s “Points” includes its made / missed shot points. Bonuses and turnovers aren’t shown.</p>

    <h3 class="rp-h">Biggest movers (${span(prevSeason)}, top ${POOL})</h3>
    <p class="cm-rule"><b>Yahoo</b></p>
    <div class="rp-vs">${moverCol(movers('y').up, 'y', 'Climb in Yahoo', 'rp-l')}${moverCol(movers('y').down, 'y', 'Slide in Yahoo', 'rp-r')}</div>
    <p class="cm-rule"><b>ESPN</b></p>
    <div class="rp-vs">${moverCol(movers('e').up, 'e', 'Climb in ESPN', 'rp-l')}${moverCol(movers('e').down, 'e', 'Slide in ESPN', 'rp-r')}</div>

    <h3 class="rp-h">The league’s records, re-scored</h3>
    <p class="cm-rule">The real locked games behind the league’s best scores (regular season + playoffs, every season), each matched to his box score and scored the other ways. Each system’s list is ranked by its own score (bold). ${span(DATA.seasons[0].season)} used half a point per point, so those games look small under ours but full size in Yahoo / ESPN.${pMissing || tMissing ? ` ${pMissing + tMissing} candidate${pMissing + tMissing === 1 ? '' : 's'} couldn’t be matched to a box score and are left out.` : ''} <sup>*</sup> = Sleeper corrected the box score since, so his line today differs a little from what counted.</p>
    <p class="cm-rule"><b>Best player games</b></p>
    ${[['o', 'Ours (today’s record book)'], ['y', 'Yahoo'], ['e', 'ESPN']].map(([k, l]) => `<details class="rp-more"${k === 'o' ? ' open' : ''}><summary>${l}</summary>${recTable(pTop(k), k, pRow, 'Player')}</details>`).join('')}
    <p class="cm-rule"><b>Best team scores</b></p>
    ${[['o', 'Ours (today’s record book)'], ['y', 'Yahoo'], ['e', 'ESPN']].map(([k, l]) => `<details class="rp-more"${k === 'o' ? ' open' : ''}><summary>${l}</summary>${recTable(tTop(k), k, tRow, 'Team')}</details>`).join('')}
    <p class="cm-rule">Team scores = the 9 locked games re-scored and added up; managers might have locked different games under another system, so these are “the same lineups, scored differently”. Candidates: the best ${CAND_PLAYER} player games and ${CAND_TEAM} team scores of each season under our scoring.</p>

    <h3 class="rp-h">What it would do to our teams</h3>
    <div class="rc-scroll"><table class="rc-tbl"><thead><tr><th>Team</th><th class="n">Top 9 FP/G ours</th><th class="n">Yahoo</th><th class="n">Rank</th><th class="n">ESPN</th><th class="n">Rank</th></tr></thead><tbody>
      ${teams.map(t => `<tr><td>${tn(t.o)}</td><td class="n">${f1(t.so)} <small>(${t.ro})</small></td><td class="n">${f1(t.sy)}</td><td class="n ${t.ry < t.ro ? 'rc-ok' : t.ry > t.ro ? 'rc-over' : ''}"><b>${t.ry}</b></td><td class="n">${f1(t.se)}</td><td class="n ${t.re < t.ro ? 'rc-ok' : t.re > t.ro ? 'rc-over' : ''}"><b>${t.re}</b></td></tr>`).join('')}
    </tbody></table></div>
    <p class="cm-rule">Each roster today (active + IR, no taxi): its 9 best players by ${span(prevSeason)} FP/G, added up. Rookies and players with fewer than ${MIN_GP} games last season aren’t counted.</p>

    <h3 class="rp-h">If we switched</h3>
    <ul class="rc-list">
      <li><b>History would mix scales.</b> Records, awards and season totals would compare two systems (like 2023’s half-point scoring). Keep old seasons as scored and label the change, or show records both ways (like the table above).</li>
      <li><b>New rules of thumb:</b> 40 → about ${Math.round(at40.y)} Yahoo / ${Math.round(at40.e)} ESPN; 50 → ${Math.round(mapTo('y', 50))} / ${Math.round(mapTo('e', 50))}; Record Book clubs (60-point club, 400 / 450-point weeks) would need new lines.</li>
      <li><b>ESPN changes the game the most:</b> missed shots and turnovers cost points, so a 30-point night on bad shooting can score less than a quiet efficient one, and lock decisions get swingier with steals and blocks worth 4.</li>
      <li><b>Site tools re-tune themselves</b> from Sleeper’s scoring settings (coach, projections, props, dynasty scores), but their calibrations were fitted on our scoring and would need a re-check.</li>
      <li><b>Sleeper can do either</b> with custom points per stat (FGM, FGA, FTM, FTA and 3PM are all available); bonuses would be set to 0.</li>
    </ul>`;
}
