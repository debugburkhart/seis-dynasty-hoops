// Defense vs Position page (Test features, owner Nov 2 2026; logic in assets/defense.js). Kept out of app.js so the
// page is one self-contained file; app.js passes its helpers in (h = { DATA, esc, gmLoad, gmSave, COMMISH, teamName }).
// Cards: the soft-matchup chart (30 teams x positions, rank + heat map), this week's schedule with a matchup grade per
// game for one fantasy roster, and how it works. dvpChips() gives the Assistant Coach / Briefing a grade chip.

import { get } from './commish.js';
import { betaCard } from './test-features.js';
import { nbaTeamName, teamLogo } from './breakdown.js';
import { MIN_GAMES, GRADE_CUTS, defenseTable, gradeOf, loadDefense, matchupGrade, pos5, weekGames } from './defense.js';

const OPTS = { split: 5, window: 'season', who: 'all', metric: 'game' };
const optsOf = gmLoad => ({ ...OPTS, ...gmLoad('gm-dvp-opts', {}) });
const f1 = x => (Math.round(x * 10) / 10).toFixed(1);
const pct = d => `${d >= 0 ? '+' : '−'}${Math.round(Math.abs(d) * 100)}%`;
const dayOf = d => new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' });
// Heat map: green = allows more than average (soft), red = allows less (tough); full colour at ±25%.
const heat = d => {
  const a = Math.min(Math.abs(d) / 0.25, 1) * 0.5;
  return a < 0.03 ? '' : ` style="background:rgba(${d > 0 ? '34,150,80' : '200,52,52'},${a.toFixed(2)})"`;
};
const optDesc = o => `${o.split === 3 ? 'G / F / C' : 'PG / SG / SF / PF / C'} · ${o.window === 'season' ? 'whole season' : `last ${o.window} games`} · ${o.who === 'starters' ? 'NBA starters only' : 'all players'} · ${o.metric === '36' ? 'per 36 minutes' : 'per game'}`;

export const gradeChip = (g, esc) => (g
  ? `<span class="dvp-g dvp-${g.letter}" title="${esc(`${g.word} matchup: allows ${pct(g.diff)} vs the league average to ${g.col} (rank ${g.rank} of 30, 1 = softest; ${g.gp} games)`)}">${g.letter}</span>`
  : '');

export async function renderDefense(body, params, h) {
  const { DATA, esc, gmLoad, gmSave } = h;
  body.innerHTML = betaCard('Defense vs Position', '<p class="cm-rule">Adding up every NBA box score this season…</p>');
  const [def, all] = await Promise.all([loadDefense(DATA), get('/v1/players/nba', {})]);
  const cur = DATA.seasons.at(-1);
  const rosters = await get(`/v1/league/${cur.leagueId}/rosters`, []);
  if (!body.isConnected) return;
  let sort = gmLoad('gm-dvp-sort', { col: 'team', dir: 1 });

  const draw = () => {
    const o = optsOf(gmLoad);
    const t = defenseTable(def, o);
    const seg = (key, list) => `<div class="dvp-seg" role="group">${list.map(([v, label]) => `<button type="button" class="ct-chip${String(o[key]) === String(v) ? ' on' : ''}" data-opt="${key}" data-v="${v}">${label}</button>`).join('')}</div>`;
    const controls = `<div class="dvp-ctl">
      ${seg('split', [[5, 'PG · SG · SF · PF · C'], [3, 'G · F · C']])}
      ${seg('window', [['season', 'Season'], [5, 'Last 5'], [10, 'Last 10'], [15, 'Last 15']])}
      ${seg('who', [['all', 'All players'], ['starters', 'Starters only']])}
      ${seg('metric', [['game', 'Per game'], ['36', 'Per 36 min']])}
    </div>`;

    // Soft-matchup chart.
    const codes = Object.keys(t.teams).filter(c => t.teams[c].gp);
    const val = c => (sort.col === 'team' ? nbaTeamName(c) : sort.col === 'gp' ? t.teams[c].gp : t.teams[c].cells[sort.col]?.v ?? 0);
    const dir = sort.col === 'team' ? sort.dir : -sort.dir; // numbers: softest (highest) first
    codes.sort((a, b) => (val(a) < val(b) ? -dir : val(a) > val(b) ? dir : 0));
    const th = (key, label) => `<th><button type="button" class="dvp-sort${sort.col === key ? ' on' : ''}" data-sort="${key}">${label}${sort.col === key ? (sort.dir > 0 ? ' ▾' : ' ▴') : ''}</button></th>`;
    const rows = codes.map(c => {
      const x = t.teams[c];
      const small = x.gp < MIN_GAMES;
      return `<tr><td class="dvp-tm"><span>${teamLogo(c) ? `<img src="${teamLogo(c)}" alt="" loading="lazy" width="20" height="20">` : ''}<b>${esc(c)}</b></span></td>
        <td class="dvp-gp${small ? ' small' : ''}" title="${esc(`${x.gp} games, ${x.from} to ${x.to}`)}">${x.gp}${small ? '*' : ''}</td>
        ${t.cols.map(col => { const cell = x.cells[col]; return `<td class="dvp-c"${heat(cell.diff)} title="${esc(`${nbaTeamName(c)} allow ${f1(cell.v)} to ${col} (${pct(cell.diff)} vs avg, rank ${cell.rank}; ${f1(cell.fp)} FP in ${f1(cell.min)} min)`)}"><b>${f1(cell.v)}</b><small>${cell.rank}</small></td>`; }).join('')}</tr>`;
    }).join('');
    const avgRow = `<tr class="dvp-avg"><td class="dvp-tm"><span><b>Avg</b></span></td><td></td>${t.cols.map(col => `<td class="dvp-c"><b>${f1(t.avg[col])}</b></td>`).join('')}</tr>`;
    const chart = codes.length
      ? `<div class="dvp-wrap"><table class="dvp-table"><thead><tr>${th('team', 'Team')}${th('gp', 'GP')}${t.cols.map(c => th(c, c)).join('')}</tr></thead><tbody>${rows}${avgRow}</tbody></table></div>
        <p class="cm-rule dvp-key"><span class="dvp-sw soft"></span> allows more than average (soft) <span class="dvp-sw tough"></span> allows less (tough). Small number = rank, 1 = allows the most. * = under ${MIN_GAMES} games. Tap a column to sort (again = flip).</p>`
      : '<p class="empty">No finished games yet this season.</p>';

    // This week's schedule for one fantasy roster, a grade per game.
    const wk = weekGames(def);
    const me = gmLoad('gm-dvp-team', null) ?? params.get?.('team') ?? h.COMMISH;
    const roster = rosters.find(r => r.owner_id === me) ?? rosters[0];
    const pick = `<label class="dvp-team">Fantasy team <select data-team>${rosters.map(r => `<option value="${esc(r.owner_id)}"${r === roster ? ' selected' : ''}>${esc(h.teamName(r.owner_id, cur.season))}</option>`).join('')}</select></label>`;
    let week = '<p class="empty">The schedule grades show during the regular season.</p>';
    if (wk && roster) {
      const out = new Set([...(roster.taxi ?? []), ...(roster.reserve ?? [])]);
      const starters = roster.starters ?? [];
      const players = (roster.players ?? []).filter(pid => !out.has(pid) && all[pid]).map(pid => {
        const p = all[pid], pos = pos5(p);
        const games = (wk.teams[p.team] ?? []).map(g => ({ ...g, grade: matchupGrade(t, g.opp, pos, o.split) }));
        const left = games.filter(g => g.status !== 'complete' && g.grade);
        const avg = left.length ? left.reduce((s, g) => s + g.grade.diff, 0) / left.length : null;
        return { pid, name: `${p.first_name} ${p.last_name}`, pos, team: p.team, games, left, avg, st: starters.indexOf(pid) };
      });
      players.sort((a, b) => ((a.st < 0) - (b.st < 0)) || (b.left.length - a.left.length) || ((b.avg ?? -9) - (a.avg ?? -9)));
      const allLeft = players.flatMap(p => p.left);
      const good = allLeft.filter(g => 'AB'.includes(g.grade.letter)).length, bad = allLeft.filter(g => 'DF'.includes(g.grade.letter)).length;
      // A player's week: the average of his games still to play.
      const avgChip = p => {
        const g = p.avg == null ? null : gradeOf(p.avg);
        return g ? `<span class="dvp-g dvp-${g.letter}" title="${esc(`Games left this week: ${g.word.toLowerCase()} on average (${pct(p.avg)} vs the league average, ${p.left.length} games)`)}">${g.letter}</span>` : '';
      };
      const chip = g =>`<span class="dvp-gm${g.status === 'complete' ? ' done' : ''}"><small>${dayOf(g.date)}</small>${g.home ? 'vs' : '@'} ${esc(g.opp)} ${gradeChip(g.grade, esc)}</span>`;
      week = `<p class="cm-rule">Week ${wk.week}: ${allLeft.length} games still to play for the active roster (taxi and IR left out): <b class="dvp-good">${good} good (A/B)</b>, <b class="dvp-bad">${bad} tough (D/F)</b>. Finished games are faded.</p>
        <ul class="dvp-list">${players.map(p => `<li><span class="dvp-who"><b>${esc(p.name)}</b><small>${esc(p.pos ?? '')} · ${esc(p.team ?? 'FA')} · ${p.st >= 0 ? 'Starter' : 'Bench'}</small></span>
          <span class="dvp-avgg">${avgChip(p)}</span>
          <span class="dvp-gms">${p.games.length ? p.games.map(chip).join('') : '<small class="dvp-none">No games</small>'}</span></li>`).join('')}</ul>`;
    }

    const grades = GRADE_CUTS.map(([cut, l, w], i) => `<span><span class="dvp-g dvp-${l}">${l}</span> ${w}${i === GRADE_CUTS.length - 1 ? ' (under −12%)' : i === 0 ? ` (+${cut * 100}% or more)` : ` (${pct(cut)} or more)`}</span>`).join('');
    page.innerHTML = `<div class="dvp-page">
      ${betaCard('Defense vs Position', `${controls}${chart}`, { sub: esc(optDesc(o)), id: 'dvp-chart' })}
      ${betaCard('This week’s matchups', `${pick}${week}<p class="cm-rule dvp-grades">${grades}</p>`, { sub: 'grade = what the opponent allows to his position', id: 'dvp-week' })}
      ${betaCard('How it works', `<p class="cm-rule">Every finished NBA game this season (Sleeper’s box scores, All-Star Game left out): each player’s fantasy points under this season’s league scoring are added to the team he played AGAINST, under his main Sleeper position (today’s). G / F / C adds PG + SG and SF + PF together. Per game = points allowed to that position divided by the defense’s games; per 36 min = points per 36 minutes played at that position, which evens out teams that just play more guards or more bigs. Starters only = the NBA starting five on Sleeper’s schedule. Last N = each defense’s own last N games.</p>
        <p class="cm-rule">Grade = the defense vs the league average at that position in the view chosen above. The grade chips on the Assistant Coach and the Briefing use the same view. This season only (no blend with last season), so early weeks are small samples: the GP column and the * mark say how many games each number rests on. Saved nightly (data/defense.json); this week’s finished games are added live.</p>`)}
    </div>`;
  };
  // Listeners on a fresh element each render, so a re-render never stacks them.
  const page = document.createElement('div');
  body.replaceChildren(page);
  draw();
  page.addEventListener('click', e => {
    const b = e.target.closest('[data-opt]');
    if (b) {
      const o = optsOf(gmLoad);
      const v = b.dataset.v;
      o[b.dataset.opt] = b.dataset.opt === 'split' || (b.dataset.opt === 'window' && v !== 'season') ? Number(v) : v;
      gmSave('gm-dvp-opts', o);
      if (o.split === 3 && !['team', 'gp', 'G', 'F', 'C'].includes(sort.col)) sort = { col: 'team', dir: 1 };
      if (o.split === 5 && ['G', 'F'].includes(sort.col)) sort = { col: 'team', dir: 1 };
      return draw();
    }
    const s = e.target.closest('[data-sort]');
    if (s) {
      sort = sort.col === s.dataset.sort ? { col: sort.col, dir: -sort.dir } : { col: s.dataset.sort, dir: 1 };
      gmSave('gm-dvp-sort', sort);
      draw();
    }
  });
  page.addEventListener('change', e => {
    if (e.target.matches('[data-team]')) { gmSave('gm-dvp-team', e.target.value); draw(); }
  });
}

// Grade chips for other pages (Assistant Coach game chips, Briefing "Games by day"): resolves to (pid, opp) => chip
// html, in the view saved on the Defense vs Position page. Any failure = no chips.
export async function dvpChips(DATA, gmLoad, esc) {
  try {
    const [def, all] = await Promise.all([loadDefense(DATA), get('/v1/players/nba', {})]);
    const o = optsOf(gmLoad);
    const t = defenseTable(def, o);
    return (pid, opp) => (pid && opp ? gradeChip(matchupGrade(t, opp, pos5(all[pid]), o.split), esc) : '');
  } catch {
    return () => '';
  }
}
