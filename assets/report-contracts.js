// Report: every fantasy team's real NBA contracts (owner, Nov 7 2026) + what a salary cap built on them would
// look like, with recommendations and concerns. Reads data/contracts.json (Basketball-Reference, weekly), today's
// Sleeper rosters and this season's locked points. h = { DATA, esc, get, name, teamName, loadContracts } from
// app.js; returns the report's HTML (the Reports tab draws it inside its fold, Save as PDF included).
import { money, readContract } from './contracts.js';

// Cap rule choices the report recommends (numbers are worked out from the league's own payrolls).
const CAP_STEP = 25e6; // caps are rounded up to the next $25M
const TOLERANCE = 0.10; // recommended cap = average counted payroll + 10%
const FLOOR_SHARE = 0.70; // salary floor = 70% of the cap
const NO_DEAL = 1.3e6; // players with no standard NBA deal (two-way, G League, overseas) counted at about a minimum
const BIG_DEAL = 10e6; // "big contracts" in the dead-weight list

export async function reportContracts(h) {
  const { DATA, esc, get, name, teamName } = h;
  const cur = DATA.seasons.at(-1);
  const season = Number(cur.season);
  const span = s => `${s}-${String((s + 1) % 100).padStart(2, '0')}`;
  const [file, rosters, all] = await Promise.all([
    h.loadContracts(), get(`/v1/league/${cur.leagueId}/rosters?t=${Date.now()}`, []), get('/v1/players/nba', {}),
  ]);
  if (!file?.players) return '<p class="empty">The NBA contract file isn’t available yet (it’s built by the nightly update on Sundays).</p>';
  const pname = pid => DATA.players?.[pid]?.n || [all?.[pid]?.first_name, all?.[pid]?.last_name].filter(Boolean).join(' ') || pid;
  const sal = (c, s) => c?.seasons?.find(x => x.season === s)?.salary ?? 0;
  // Locked points this season per owner + player (finished weeks).
  const locked = {};
  for (const x of DATA.playerWeeks) if (x.s === cur.season) locked[`${x.o}|${x.pid}`] = (locked[`${x.o}|${x.pid}`] ?? 0) + x.p;
  const nbaTotal = Object.values(file.players).reduce((t, c) => t + (c.waived?.length ? 0 : sal(c, season)), 0);

  const teams = (rosters ?? []).filter(r => r.owner_id).map(r => {
    const taxi = new Set(r.taxi ?? []);
    const ir = new Set(r.reserve ?? []);
    const players = (r.players ?? []).map(pid => {
      const c = file.players[pid];
      // NBA seasons before this one (Sleeper's years_exp, capped at 3 like dynasty.js) so rookie deals are recognized.
      const exp = all?.[pid]?.years_exp;
      const rc = c ? readContract(c, season, exp == null ? null : Math.min(3, exp)) : null;
      const slot = taxi.has(pid) ? 'taxi' : ir.has(pid) ? 'ir' : 'active';
      const now = rc?.now?.salary ?? 0;
      return {
        pid, name: pname(pid), slot, c, now, deal: Boolean(rc?.now),
        next: sal(c, season + 1), next2: sal(c, season + 2), left: rc?.left ?? 0,
        flags: rc?.flags ?? [], rookie: Boolean(rc?.rookie), lk: locked[`${r.owner_id}|${pid}`] ?? 0,
        nbaTeam: all?.[pid]?.team ?? c?.team ?? '',
      };
    }).sort((a, b) => b.now - a.now);
    const sum = (list, f = p => p.now) => list.reduce((t, p) => t + f(p), 0);
    const by = s => players.filter(p => p.slot === s);
    const noDeal = players.filter(p => !p.deal);
    const counted = sum(players.filter(p => p.slot !== 'taxi')) + noDeal.filter(p => p.slot !== 'taxi').length * NO_DEAL;
    const lkTotal = sum(players, p => p.lk);
    return {
      owner: r.owner_id, players, noDeal, counted,
      total: sum(players), active: sum(by('active')), ir: sum(by('ir')), taxi: sum(by('taxi')),
      next: sum(players, p => p.next), next2: sum(players, p => p.next2),
      expiring: sum(players.filter(p => p.deal && p.left === 0)),
      rookies: players.filter(p => p.rookie), lkTotal,
      perLk: lkTotal ? sum(players.filter(p => p.lk > 0)) / lkTotal : null,
      top3: sum(players.slice(0, 3)),
      counted27: sum(players.filter(p => p.slot !== 'taxi'), p => p.next),
    };
  }).sort((a, b) => b.counted - a.counted);

  const avg = teams.reduce((t, x) => t + x.counted, 0) / teams.length;
  const avg27 = teams.reduce((t, x) => t + x.counted27, 0) / teams.length;
  const roundUp = x => Math.ceil(x / CAP_STEP) * CAP_STEP;
  const cap = roundUp(avg * (1 + TOLERANCE));
  const floor = roundUp(cap * FLOOR_SHARE) - CAP_STEP;
  const caps = [['League average', roundUp(avg)], ['Average + 10% (recommended)', cap], ['Average + 20%', roundUp(avg * 1.2)]];
  const leagueTotal = teams.reduce((t, x) => t + x.total, 0);
  const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
  const sorted = [...teams].sort((a, b) => a.counted - b.counted);
  const median = (sorted[3].counted + sorted[4].counted) / 2;
  const over = teams.filter(t => t.counted > cap);
  const under = teams.filter(t => t.counted < floor);
  const tn = o => `${esc(teamName(o, cur.season))} <small>(${esc(name(o))})</small>`;

  const bar = (t, max) => {
    const w = v => `${(100 * v) / max}%`;
    return `<div class="rc-bar" title="Active ${money(t.active)} · IR ${money(t.ir)} · Taxi ${money(t.taxi)}">
      <span class="rc-a" style="width:${w(t.active)}"></span><span class="rc-i" style="width:${w(t.ir)}"></span><span class="rc-t" style="width:${w(t.taxi)}"></span>
      <i class="rc-cap" style="left:${w(cap)}" title="Recommended cap ${money(cap)}"></i></div>`;
  };
  const max = Math.max(...teams.map(t => t.total), cap) * 1.02;

  // Biggest contracts that produced the least locked points for this team this season (dead weight).
  const dead = t => t.players.filter(p => p.now >= BIG_DEAL && p.slot !== 'taxi').map(p => ({ ...p, rate: p.lk / (p.now / 1e6) }))
    .sort((a, b) => a.rate - b.rate).slice(0, 3);

  const teamCard = (t, i) => {
    const room = cap - t.counted;
    const row = p => `<tr class="${p.slot}">
        <td><b>${esc(p.name)}</b> <small>${esc(p.nbaTeam)}${p.slot === 'ir' ? ' · IR' : p.slot === 'taxi' ? ' · taxi' : ''}</small>${p.flags.map(f => ` <span class="ct-flag ct-${f.id}" title="${esc(f.why)}">${esc(f.label)}</span>`).join('')}</td>
        <td class="n">${p.deal ? money(p.now) : '<small>No NBA deal</small>'}</td>
        <td class="n">${p.next ? money(p.next) : '—'}</td>
        <td class="n">${p.deal ? (p.left ? `${p.left}` : 'Final') : '—'}</td>
        <td class="n">${p.lk ? Math.round(p.lk) : '—'}</td></tr>`;
    return `<div class="rc-team">
      <div class="rc-th"><b>${i + 1}. ${tn(t.owner)}</b><span class="${room < 0 ? 'rc-over' : 'rc-ok'}">${room < 0 ? `${money(-room)} over the cap` : `${money(room)} under the cap`}</span></div>
      ${bar(t, max)}
      <div class="rc-nums">
        <span><b>${money(t.total)}</b> total</span><span><b>${money(t.counted)}</b> counted (no taxi)</span>
        <span>Active ${money(t.active)}</span><span>IR ${money(t.ir)}</span><span>Taxi ${money(t.taxi)}</span>
        <span>Top 3 = ${pct(t.top3, t.total)}%</span><span>Expiring ${money(t.expiring)}</span>
        <span>${span(season + 1)}: ${money(t.next)}</span><span>${span(season + 2)}: ${money(t.next2)}</span>
        <span>${t.rookies.length} on first NBA deals</span><span>${t.noDeal.length} without an NBA deal</span>
        ${t.perLk ? `<span>${money(t.perLk)} per locked point</span>` : ''}
      </div>
      ${t.counted > cap ? `<p class="rc-dead"><b>To get under ${money(cap)}:</b> shed ${money(t.counted - cap)}. Biggest deals producing the least for you this season: ${dead(t).map(p => `${esc(p.name)} ${money(p.now)} (${Math.round(p.lk)} locked pts)`).join(' · ') || '—'}.</p>` : ''}
      <details class="rp-more"><summary>All ${t.players.length} players</summary>
        <div class="rc-scroll"><table class="rc-tbl"><thead><tr><th>Player</th><th class="n">${span(season)}</th><th class="n">${span(season + 1)}</th><th class="n">Yrs left</th><th class="n">Locked</th></tr></thead>
        <tbody>${t.players.map(row).join('')}</tbody></table></div></details>
    </div>`;
  };

  const capTable = `<div class="rc-scroll"><table class="rc-tbl rc-caps"><thead><tr><th>Team</th><th class="n">Counted ${span(season)}</th>${caps.map(([l, v]) => `<th class="n">${esc(l)}<br><small>${money(v)}</small></th>`).join('')}<th class="n">${span(season + 1)} commits<br><small>vs ${money(cap)}</small></th></tr></thead><tbody>
    ${teams.map(t => `<tr><td>${tn(t.owner)}</td><td class="n">${money(t.counted)}</td>${caps.map(([, v]) => { const d = v - t.counted; return `<td class="n ${d < 0 ? 'rc-over' : 'rc-ok'}">${d < 0 ? '−' : '+'}${money(Math.abs(d))}</td>`; }).join('')}
      <td class="n ${t.counted27 > cap ? 'rc-over' : 'rc-ok'}">${money(t.counted27)}</td></tr>`).join('')}
  </tbody></table></div>`;

  const irHeavy = [...teams].sort((a, b) => b.ir - a.ir)[0];
  const cheapStars = teams.flatMap(t => t.players.filter(p => p.rookie && p.lk > 0).map(p => ({ ...p, o: t.owner }))).sort((a, b) => b.lk - a.lk).slice(0, 3);
  const noDealAll = teams.reduce((n, t) => n + t.noDeal.length, 0);
  const at = file.source?.read ?? file.at;

  return `
    <div class="rp-stats">
      <div><b>${leagueTotal >= 1e9 ? `$${(leagueTotal / 1e9).toFixed(2)}B` : money(leagueTotal)}</b><span>on our 8 rosters (${pct(leagueTotal, nbaTotal)}% of all ${span(season)} NBA salary)</span></div>
      <div><b>${money(avg)}</b><span>average counted payroll (median ${money(median)})</span></div>
      <div><b>${money(teams[0].counted - teams.at(-1).counted)}</b><span>gap between the highest and lowest payroll</span></div>
    </div>
    <p class="cm-rule">“Counted” = every player’s ${span(season)} salary on the active roster + IR, taxi left out (like NBA two-way deals), and players without a standard NBA contract at ${money(NO_DEAL)} each. Contracts from ${esc(file.source?.name ?? 'Basketball-Reference')} (read ${esc(String(at).slice(0, 10))}); rosters read from Sleeper just now.</p>

    <h3 class="rp-h">Payroll by team</h3>
    <div class="rc-key"><span class="rc-a"></span> Active <span class="rc-i"></span> IR <span class="rc-t"></span> Taxi <i class="rc-cap"></i> Recommended cap ${money(cap)}</div>
    ${teams.map(teamCard).join('')}

    <h3 class="rp-h">What a salary cap would look like</h3>
    ${capTable}
    <p class="cm-rule">Green = room under that cap, red = over. The last column checks next season’s already-signed money against the recommended cap (options and new deals not included yet, so those numbers only go up).</p>

    <h3 class="rp-h">Recommendations</h3>
    <ol class="rc-list">
      <li><b>Set the cap on our scale, not the NBA’s.</b> Our rosters hold about ${Math.round(teams.reduce((n, t) => n + t.players.length, 0) / teams.length)} players each, against an NBA team’s 15, so a real NBA cap (about $150-170M) would put every team far over. Recommended: <b>${money(cap)}</b> (league average + 10%, rounded up), checked on the counted payroll.</li>
      <li><b>Add a floor of ${money(floor)}</b> (about 70% of the cap) so a rebuilding team can’t hoard cheap rookies and picks with no veteran salary.${under.length ? ` Under it today: ${under.map(t => tn(t.owner)).join(', ')}.` : ' Nobody is under it today.'}</li>
      <li><b>Leave taxi out, count IR.</b> Taxi players are development stashes on small deals; IR players still come back onto the roster, so their salary should count (as it does in the NBA).</li>
      <li><b>Start it next season (${span(season + 1)}), not mid-season.</b> Rosters were built without a cap. ${over.length ? `${over.map(t => `${tn(t.owner)} is ${money(t.counted - cap)} over`).join('; ')} today: forcing that now means fire sales.` : 'Nobody is over today.'} Announce it now, check it on the first day of the ${span(season + 1)} season.</li>
      <li><b>Use a soft cap with a penalty first, a hard cap later.</b> Year one: a team over the cap loses FAAB or moves down in the rookie draft for every $${CAP_STEP / 1e6}M over. Hard cap (no trades or pickups that add salary while over) only once everyone has had a summer to adjust.</li>
      <li><b>Check it at fixed times</b> (start of the season, the trade deadline, the start of the playoffs) instead of every day, so an NBA trade or a re-signing can’t break the rule overnight. The site can show each team’s counted payroll live and flag anyone over.</li>
      <li><b>Write the edge cases into the rulebook:</b> players with no NBA contract (counted at ${money(NO_DEAL)}), waived players (only the money their current team pays), rookie extensions that jump in July, and which day’s numbers count.</li>
    </ol>

    <h3 class="rp-h">Concerns</h3>
    <ul class="rc-list">
      <li><b>Salary isn’t fantasy value.</b> Rookie deals are the best value in the game: ${cheapStars.length ? cheapStars.map(p => `${esc(p.name)} (${money(p.now)}, ${Math.round(p.lk)} locked pts for ${esc(name(p.o))})`).join(', ') : 'young players on rookie scale'}. A cap rewards young cores and punishes teams built on proven veterans, and makes rookie picks even more valuable.</li>
      <li><b>Teams can be pushed over by things they don’t control.</b> A player re-signs or gets a rookie extension in July (salaries can triple), or an NBA trade changes who pays him. The fixed check dates and a soft cap matter because of this.</li>
      <li><b>Injuries cost cap room.</b> ${irHeavy ? `${tn(irHeavy.owner)} has ${money(irHeavy.ir)} on IR right now.` : ''} A team can lose a star for the season and still carry his salary. Consider counting season-ending injuries at half, or letting a team waive salary at a cost.</li>
      <li><b>The data has gaps.</b> ${noDealAll} rostered players have no standard NBA contract (two-way, G League or overseas stashes), waived players can show money from two teams, and the contract file is read once a week from Basketball-Reference (if that read fails, the last good copy is used). Any rule should name its source and the day it’s read.</li>
      <li><b>Sleeper won’t enforce it.</b> The cap would live on the site and in the rulebook; the commish has to police it (the site can flag teams, but can’t block a move in Sleeper).</li>
      <li><b>It changes the league’s character.</b> The biggest payrolls (${teams.slice(0, 2).map(t => tn(t.owner)).join(', ')}) would have to dump salary, likely to the lowest (${teams.slice(-2).map(t => tn(t.owner)).join(', ')}), which can make for lopsided trades. It needs everyone’s buy-in, ideally a league vote.</li>
    </ul>`;
}
