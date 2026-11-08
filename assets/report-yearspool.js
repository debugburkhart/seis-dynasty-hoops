// Report: a "years pool" for Salary system v2's league contracts (owner, Nov 7 2026: "you can sign players to any length
// contract as long as you have the years available (4 is still max) ... a max to how many 4 year contracts ... compare
// that to other ways of doing it"). A PROPOSAL that plugs into report-salary-nba.js (prices, cap, dead money stay the
// same). h = { DATA, esc, get, name, teamName, COMMISH } from app.js.

// ---- The proposed rules ----
export const POOL = 50; // contract-years a team may have out at once (active + IR; taxi exempt)
const MAX_YEARS = 4;
export const FOUR_YEAR_PER_SUMMER = 2; // new 4-season deals a team may sign each summer
const LEAGUE_ROOKIE_YEARS = 3;

export async function reportYearsPool(h) {
  const { DATA, esc, get, name, teamName } = h;
  const cur = DATA.seasons.at(-1);
  const season = Number(cur.season);
  const span = s => `${s}-${String((s + 1) % 100).padStart(2, '0')}`;
  const rosters = await get(`/v1/league/${cur.leagueId}/rosters?t=${Date.now()}`, []);
  const tn = o => `${esc(teamName(o, cur.season))} <small>(${esc(name(o))})</small>`;
  const rookieDraft = {};
  for (const d of DATA.drafts ?? []) {
    if (d.kind === 'startup' || Number(d.s) <= season - LEAGUE_ROOKIE_YEARS) continue;
    for (const p of d.picks ?? []) if (p.pid) rookieDraft[p.pid] = Number(d.s);
  }

  const teams = (rosters ?? []).filter(r => r.owner_id).map(r => {
    const taxi = new Set(r.taxi ?? []);
    const counted = (r.players ?? []).filter(pid => !taxi.has(pid));
    // Rookie deals already run a fixed length (3 seasons from his draft); everyone else needs at least 1 season.
    const rookieYears = counted.filter(pid => rookieDraft[pid]).reduce((t, pid) => t + Math.max(1, LEAGUE_ROOKIE_YEARS - (season - rookieDraft[pid])), 0);
    const rookies = counted.filter(pid => rookieDraft[pid]).length;
    const minUsed = rookieYears + (counted.length - rookies);
    const spare = POOL - minUsed;
    return { owner: r.owner_id, counted: counted.length, rookies, rookieYears, minUsed, spare, taxi: taxi.size };
  }).sort((a, b) => a.spare - b.spare);
  const avgCounted = Math.round(teams.reduce((t, x) => t + x.counted, 0) / teams.length);
  const me = teams.find(t => t.owner === h.COMMISH) ?? teams[0];
  // Example plan for one team: 2 four-season, then three-season deals, then two-season, the rest one season.
  const plan = t => {
    let left = t.spare;
    const out = [];
    const add = (years, n) => { const k = Math.max(0, Math.min(n, Math.floor(left / (years - 1)))); if (k) { out.push([years, k]); left -= k * (years - 1); } };
    add(4, FOUR_YEAR_PER_SUMMER); add(3, 4); add(2, 99);
    return { out, left };
  };
  const ex = plan(me);

  const row = t => `<tr><td>${tn(t.owner)}</td><td class="n">${t.counted}</td><td class="n">${t.rookies} <small>(${t.rookieYears} yrs)</small></td><td class="n">${t.minUsed}</td><td class="n ${t.spare < 0 ? 'rc-over' : 'rc-ok'}"><b>${t.spare}</b></td></tr>`;
  const methods = [
    ['Free choice (v2 as it stands)', 'Any length 1-4, no limits', 'Very', 'No: everyone locks bargains for 4', 'Most', 'None', 'Only dead money slows it down'],
    ['Cap on 4-season deals only', `At most ${FOUR_YEAR_PER_SUMMER} four-season deals a summer`, 'Very', 'Partly: 3-season deals still unlimited', 'High', 'One count', 'Good first step'],
    ['Years pool + 4-season limit', `${POOL} years at once, ${FOUR_YEAR_PER_SUMMER} four-season deals a summer`, 'Fairly', 'Yes', 'High', 'One running total', 'Recommended'],
    ['Tokens (fixed counts per length)', '1 four, 1 three, 2 two, 3 one each summer', 'Very', 'Yes', 'Low: lengths are rationed', 'Token counts', 'Rigid; offseason heavy'],
    ['Price premium for length', '+10% a season per year past the first', 'Some math', 'Partly: the cap does the work', 'High', 'None extra', 'Self-balancing, but players feel taxed'],
    ['Mirror the NBA contract', 'League deal = his real deal', 'Very', 'Yes (no choices)', 'None', 'None', 'Removes the decisions you wanted'],
  ];

  return `
    <div class="rp-stats">
      <div><b>${POOL} years</b><span>contract-years each team can have out at once</span></div>
      <div><b>${FOUR_YEAR_PER_SUMMER} a summer</b><span>new 4-season deals allowed</span></div>
      <div><b>${MAX_YEARS} seasons</b><span>longest single contract</span></div>
    </div>
    <p class="cm-rule">A proposal that plugs into <b>Salary system v2</b>: prices ($1 rookie to $50 supermax), the cap and dead money stay exactly the same. The years pool only decides <b>how long</b> you can sign players. Rosters read from Sleeper just now.</p>

    <h3 class="rp-h">Would a years pool work? Yes.</h3>
    <ul class="rc-list">
      <li><b>Every team has ${POOL} contract-years.</b> Add up the seasons left on every league contract on your active roster and IR (taxi doesn’t count). That total can never go over ${POOL}.</li>
      <li><b>Sign anyone for 1 to ${MAX_YEARS} seasons, as long as the years fit.</b> A 4-season deal uses 4 years of your pool, a 1-season deal uses 1.</li>
      <li><b>The pool refills by itself:</b> every summer each contract loses a season, so a 26-man roster gets about 26 years back each summer, plus whatever expired.</li>
      <li><b>Why ${POOL}:</b> our teams carry about ${avgCounted} players outside taxi, so ${POOL} works out to an average contract of about 2 seasons. Everyone can be signed (1 year each uses only ~${avgCounted}), with roughly ${POOL - avgCounted} spare years to hand out as longer deals. Smaller pool = shorter deals and a bigger free agency each summer; bigger pool = closer to today’s league.</li>
      <li><b>And yes, keep a 4-season limit: ${FOUR_YEAR_PER_SUMMER} new ones a summer.</b> Without it, a team could put most of its spare years into 4-season deals for every cheap rookie about to get paid (the lock-in bargains in v2). With it, a team can still have up to ${FOUR_YEAR_PER_SUMMER * MAX_YEARS} players on deals signed for 4 over time, but has to pick its 2 best bets each year.</li>
    </ul>

    <h3 class="rp-h">How it looks in practice</h3>
    <ul class="rc-list">
      <li><b>Day one:</b> each team assigns lengths to its current roster within ${POOL} years and ${FOUR_YEAR_PER_SUMMER} four-season deals. Anyone not assigned by the deadline gets 1 season.</li>
      <li><b>Example (${tn(me.owner)}):</b> ${me.counted} players outside taxi, ${me.rookies} on rookie deals (${me.rookieYears} years already set), so ${me.minUsed} years are used just by giving everyone else 1 season, leaving <b>${me.spare}</b> spare. One way to spend them: ${ex.out.map(([y, n]) => `${n} × ${y}-season deal${n === 1 ? '' : 's'}`).join(', ')}${ex.left ? `, with ${ex.left} year${ex.left === 1 ? '' : 's'} left for in-season adds` : ''}; everyone else 1 season.</li>
      <li><b>Summer re-sign window:</b> you see how many years you have free (after the tick-down), then re-sign your expiring players at their new tier price for any length that fits.</li>
      <li><b>Free agency:</b> the FAAB winner picks the length, as long as it fits his years and (for a 4-season deal) his summer limit.</li>
      <li><b>Waiver adds during the season:</b> rest-of-season deals cost 1 year from the pool. That’s why it’s smart to keep a few years spare.</li>
      <li><b>Drops:</b> the dead money from v2 still applies (half his price for every season left), and the cut player’s years stay used until next summer, then come back. So a bad long deal hurts twice for one season, but never forever.</li>
      <li><b>Trades:</b> the contract moves with the player, and the team getting him needs the years in its pool (and the cap room). This is the one place a pool makes life harder: a team at ${POOL} can only take back as many years as it sends out.</li>
      <li><b>Rookie draft picks:</b> their ${LEAGUE_ROOKIE_YEARS}-season rookie deal uses ${LEAGUE_ROOKIE_YEARS} years once they’re called up from taxi (on taxi they use none).</li>
    </ul>

    <h3 class="rp-h">Every team today</h3>
    <div class="rc-scroll"><table class="rc-tbl"><thead><tr><th>Team</th><th class="n">Under contract</th><th class="n">Rookie deals</th><th class="n">Years used at the minimum</th><th class="n">Spare years</th></tr></thead>
      <tbody>${teams.map(row).join('')}</tbody></table></div>
    <p class="cm-rule">“Years used at the minimum” = rookie deals’ seasons left + 1 season for everyone else. “Spare years” = what’s left of ${POOL} to make some deals longer. ${teams.some(t => t.spare < 8) ? 'Teams with only a few spare years carry big rosters: they’d sign most players for 1 season and choose 1-2 long deals.' : ''}</p>

    <h3 class="rp-h">Compared with the other ways</h3>
    <div class="rc-scroll"><table class="rc-tbl"><thead><tr><th>Method</th><th>Rule</th><th>Simple?</th><th>Stops lock-in abuse?</th><th>Freedom</th><th>Extra tracking</th><th>Verdict</th></tr></thead><tbody>
      ${methods.map(m => `<tr${m[6] === 'Recommended' ? ' class="rc-rec"' : ''}><td><b>${esc(m[0])}</b></td>${m.slice(1).map(x => `<td>${esc(x)}</td>`).join('')}</tr>`).join('')}
    </tbody></table></div>
    <ul class="rc-list">
      <li><b>Free choice</b> is the easiest to explain, but the smartest move is always the same (sign every cheap rising player for 4), so the decisions get boring and the dead-money rule ends up doing all the work.</li>
      <li><b>Just limiting 4-season deals</b> is the smallest change, and catches the worst case, but nothing stops a team from signing its whole roster to 3 seasons.</li>
      <li><b>The years pool</b> keeps the freedom (any length for anyone) but makes every long deal cost something you could have used elsewhere, and one number covers it all. Its only real downside is trades between teams that are full.</li>
      <li><b>Tokens</b> are simple to read, but rigid: you can’t trade two 2-season deals for one 4-season deal, and the offseason gets crowded. (See the token report.)</li>
      <li><b>A price premium</b> (+10% a season per extra year) is clever because the cap balances it, but it raises prices on exactly the deals people want to sign, and the math is harder to explain.</li>
      <li><b>Mirroring the NBA deal</b> is zero work but takes away the choice you wanted.</li>
    </ul>

    <h3 class="rp-h">Recommendation</h3>
    <ul class="rc-list">
      <li><b>Use the years pool: ${POOL} contract-years per team + at most ${FOUR_YEAR_PER_SUMMER} new 4-season deals a summer</b>, on top of v2’s prices, cap and dead money.</li>
      <li><b>Keep the numbers fixed for a few seasons</b>, then adjust together: the pool size if free agency feels too small or too big, the 4-season limit if lock-ins still dominate.</li>
      <li><b>Let the site keep score:</b> each team’s years used and free, its 4-season deals this summer, and a warning before a signing or trade would break either limit.</li>
    </ul>`;
}
