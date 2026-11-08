// Contract Sandbox: "How it works" view (owner, Nov 8 2026: "a friendly graphic that explains every aspect of how the
// contracts would work"). Pure HTML/CSS graphics (.hw-* in styles.css, so dark mode converts them like everything else);
// every number comes from the rule constants in leaguecontracts.js, so the page follows any rule change.
import { betaCard } from './test-features.js';
import { money } from './contracts.js';
import {
  BID_HOURS, BID_STEP, CAP_GROWTH, CUT_SHARE, FLOOR, FOUR_YEAR_PER_SUMMER, OPEN_SHARE, FREE_CUT, MAX_YEARS, NBA_TIERS, POOL, RESIGN_MAX, ROOKIE_SEASONS, ROOKIE_TIER,
  ROSTER_MAX, SERVICE_MAX, START_SEASON, TAXI_MAX, TAXI_YEARS, span, tierScale,
} from './leaguecontracts.js';

const $ = n => `$${n}`;
const chip = t => `<span class="rs-tier rs-t${t.sym.length}">${t.sym}</span>`;
const step = (n, title, body) => `<li class="hw-step"><span class="hw-num">${n}</span><div><b>${title}</b><p>${body}</p></div></li>`;

export function howItWorks(L) {
  const top = NBA_TIERS[0].price;
  const s = START_SEASON;

  // 1. The big picture: three ideas.
  const pillars = `<div class="hw-pillars">
    <div class="hw-pillar"><span class="hw-ico">$</span><b>Price</b><p>Set by his <b>real NBA salary</b>: the bigger his real deal, the more he costs. ${$(1)} for rookie deals up to ${$(top)} for a supermax.</p></div>
    <div class="hw-pillar"><span class="hw-ico">${MAX_YEARS}</span><b>Length</b><p>You choose <b>1 to ${MAX_YEARS} seasons</b>. The price is <b>locked</b> for the whole deal, whatever happens to his real salary.</p></div>
    <div class="hw-pillar"><span class="hw-ico">${L.cap}</span><b>Limits</b><p>A fixed <b>${$(L.cap)} hard cap</b> (and a ${$(FLOOR)} floor), a <b>${POOL}-year pool</b> of contract seasons and a <b>${ROSTER_MAX}-man roster</b>. Taxi players are free.</p></div>
  </div>`;

  // 2. Price ladder.
  const ladder = `<div class="hw-ladder">
    ${NBA_TIERS.map((t, i) => `<div class="hw-rung">
      <span class="hw-tname">${chip(t)} ${t.label}</span>
      <span class="hw-bar"><i style="width:${Math.max(4, (100 * t.price) / top)}%"></i></span>
      <b class="hw-price">${$(t.price)}</b>
      <small class="hw-cut">${t.min ? `${money(t.min * tierScale(s))}+` : `under ${money(NBA_TIERS[i - 1].min * tierScale(s))}`}</small>
    </div>`).join('')}
    <div class="hw-rung hw-rk"><span class="hw-tname">${chip(ROOKIE_TIER)} Rookie deal</span><span class="hw-bar"><i style="width:4%"></i></span><b class="hw-price">${$(1)}</b><small class="hw-cut">first ${ROOKIE_SEASONS} NBA seasons</small></div>
  </div>
  <p class="hw-note">Real-salary cutoffs shown for ${span(s)}. They grow ${Math.round(CAP_GROWTH * 100)}% a season with the NBA cap, so a max deal stays a max deal. No NBA contract = ${$(1)}.</p>`;

  // 3. Price lock example.
  const lock = `<div class="hw-lock">
    <div class="hw-lrow"><span class="hw-lab">Real NBA salary</span>${[['$30M', 'Big starter'], ['$38M', 'Near max'], ['$47M', 'Max']].map(([m, l], i) => `<span class="hw-sal" style="--h:${40 + i * 25}%"><i></i><b>${m}</b><small>${l}</small></span>`).join('')}</div>
    <div class="hw-lrow"><span class="hw-lab">League price</span>${[0, 1, 2].map(() => '<span class="hw-locked">🔒 <b>$20</b></span>').join('')}</div>
    <div class="hw-lrow hw-yrs"><span class="hw-lab"></span>${[0, 1, 2].map(i => `<small>${span(s + i)}</small>`).join('')}</div>
  </div>
  <p class="hw-note">Sign him for 3 seasons as a Big starter and he costs $20 in all three, even as his real salary climbs. When his deal ends, his next contract uses his tier at that time. That push and pull is why length matters.</p>`;

  // 4. A player's life: two contracts in a row, then free agency (owner, Nov 8 2026; option B for startup players).
  const yr = y => `'${String(y).slice(2)}-${String(y + 1).slice(2)}`;
  const box = (k, top, mid, bot, fa) => `<div class="hw-yr hw-${k}${fa ? ' hw-fa' : ''}"><small>${top}</small><b>${mid}</b><span>${bot}</span></div>`;
  const rookieRow = [box('taxi', 'Yr 1', 'Taxi', 'free'), ...[2, 3, 4].map(y => box('rk', `Yr ${y}`, 'C1', 'rookie $1')), ...[5, 6, 7, 8].map(y => box('deal', `Yr ${y}`, 'C2', 'tier', y === 8))].join('');
  const vetRow = [...[1, 2].map(y => box('deal', yr(s + y - 1), 'C2', 'day one', y === 2)), box('fa', yr(s + 2), 'FA', 'bids'), ...[4, 5, 6].map(y => box('deal', yr(s + y - 1), 'C1', 'new deal')), box('deal', yr(s + 6), 'C2', 're-sign', true)].join('');
  const life = `<p class="hw-cap"><b>A drafted rookie</b> (stashed 1 season on taxi): at most 8 years with your team, taxi included.</p>
  <div class="hw-life">${rookieRow}</div>
  <p class="hw-cap"><b>A startup veteran</b> (on rosters every season since 2023): his day-one deal is already his 2nd contract.</p>
  <div class="hw-life">${vetRow}</div>
  <div class="hw-key">C1 / C2 = contract 1 / 2 of 2 · FA = free agent · <span class="hw-k hw-taxi"></span> Taxi: no contract, no cap hit <span class="hw-k hw-rk"></span> ${$(1)} rookie deal (contract 1), from call-up through his ${ROOKIE_SEASONS}th NBA season <span class="hw-k hw-deal"></span> Contracts at his real-salary tier (or his auction price) <span class="hw-k hw-fa"></span> Free agency after his 2nd contract in a row</div>
  <ul class="hw-list">
    <li><b>Two contracts in a row, then free agency.</b> When a player's 2nd contract ends he can't be re-signed; every team (his old one too) can bid on him, and his new deal is contract 1 again.</li>
    <li><b>What counts as a contract:</b> day-one deals, re-signings, free-agency signings and the ${$(1)} rookie deal. Taxi and in-season pickups don't (no contract); re-signing a pickup in the summer is his contract 1.</li>
    <li><b>Your lengths decide when he leaves:</b> two 1-season deals = free agency after 2 seasons, two 4-season deals = 8. Long deals hold him longer but use pool years and risk dead money.</li>
    <li><b>Rookies max out at 8 years from the draft, taxi included</b>: the rookie deal ends with his ${ROOKIE_SEASONS}th NBA season, so taxi time just shortens it, plus one more contract of up to ${MAX_YEARS}.</li>
    <li><b>Startup players (on league rosters every season since 2023)</b> have used a contract already: their day-one deal is contract 2 of 2, so they reach free agency between ${s + 1} and ${s + MAX_YEARS} depending on the length chosen.</li>
    <li><b>Trades keep the count; a cut ends the contract</b> (his next signing elsewhere is contract 1). <b>Loaner stars</b> = players in the last season of their 2nd contract.</li>
  </ul>`;

  // 5. Years pool.
  const example = [[4, 2], [3, 4], [2, 6], [1, 12]];
  const used = example.reduce((t, [y, n]) => t + y * n, 0);
  const cells = example.flatMap(([y, n]) => Array.from({ length: y * n }, () => y));
  const pool = `<div class="hw-pool">${Array.from({ length: POOL }, (_, i) => `<i class="${cells[i] ? `hw-p${cells[i]}` : 'hw-p0'}"></i>`).join('')}</div>
  <div class="hw-key">${example.map(([y, n]) => `<span class="hw-k hw-p${y}"></span> ${n} × ${y}-season deal${n === 1 ? '' : 's'}`).join(' ')} <span class="hw-k hw-p0"></span> ${POOL - used} years free</div>
  <ul class="hw-list">
    <li><b>Every team has ${POOL} contract-years.</b> Add up the seasons left on every contract (active roster + IR). A 4-season deal uses 4, a 1-season deal uses 1.</li>
    <li><b>It refills by itself:</b> every summer each contract loses a season, so the years come back.</li>
    <li><b>At most ${FOUR_YEAR_PER_SUMMER} new 4-season deals a summer</b>, so nobody locks up every rising star.</li>
    <li><b>Free:</b> taxi players and in-season waiver pickups use no years and no cap.</li>
  </ul>`;

  // 6. The league year.
  const year = `<ol class="hw-steps">
    ${step(1, 'End of the playoffs', 'Every contract loses a season. Deals at 0 are expiring.')}
    ${step(2, 'NBA draft + NBA free agency', 'Nothing happens in our league yet: the NBA sets next season\'s real salaries, and those set prices.')}
    ${step(3, 'Re-sign window', `Keep up to <b>${RESIGN_MAX} expiring players</b> (players coming off the ${$(1)} rookie deal don't count) at their <b>new tier</b> (players won in free agency: the higher of their price and their tier), any length that fits. Players finishing their 2nd contract in a row can't be re-signed.`)}
    ${step(4, 'Free agency auction', `Everyone not re-signed goes up for <b>public bids on price per season</b>. The highest bid wins when his ${BID_HOURS}-hour clock runs out; the winner then picks the length (1-4).`)}
    ${step(5, 'Rookie draft', 'Picks go to taxi (free) or straight to the active roster on the $1 rookie deal.')}
    ${step(6, 'Season starts', `Every team must be under the <b>${$(L.cap)} hard cap</b> and over the <b>${$(FLOOR)} floor</b> (the gap becomes dead money the season after) with ${ROSTER_MAX} or fewer players (taxi ${TAXI_MAX} or fewer).`)}
    ${step(7, 'During the season', 'Waiver pickups are free for the rest of the season. Trades move contracts as they are. The trade deadline is the last chance to send a player back to taxi.')}
  </ol>`;

  // 7. Cuts and dead money.
  const cut = `<div class="hw-cutex">
    <div class="hw-cutcard"><small>Cut a</small><b>$20 player</b><small>with 3 seasons left</small></div>
    <span class="hw-arrow">→</span>
    <div class="hw-dead">${[0, 1, 2].map(i => `<span><b>$10</b><small>${span(s + 1 + i)}</small></span>`).join('')}</div>
  </div>
  <ul class="hw-list">
    <li><b>Dead money = ${Math.round(CUT_SHARE * 100)}% of his price for every season left</b>, and it counts against your cap each of those seasons. His pool years stay used until next summer.</li>
    <li><b>Free to cut:</b> anyone priced ${$(FREE_CUT)} or less (bench, minimum and rookie-deal players), and in-season pickups.</li>
    <li><b>A cut ends his contract.</b> Nobody inherits his old seasons: another team picks him up free during the season, or signs him to a new deal at his tier in the summer. The dead money stays with you.</li>
    <li><b>You can't sign him again</b> until his old deal would have ended. (Re-adding him in the same season restores his old contract instead.)</li>
  </ul>`;

  // 8. Trades and taxi.
  const trade = `<div class="hw-trade">
    <div class="hw-team">Team A</div>
    <div class="hw-ctr"><small>contract travels</small><b>Same price · same seasons left</b></div>
    <div class="hw-team">Team B</div>
  </div>
  <div class="hw-checks"><span>✓ Under the cap</span><span>✓ Pool years free</span><span>✓ Roster spot</span></div>
  <ul class="hw-list">
    <li><b>Both teams must still fit</b> the cap, the pool and the roster limit after the trade. Trades aren't new signings, so the 4-season limit doesn't apply.</li>
    <li><b>Taxi players keep the rookie path in a trade</b>, even while Sleeper parks them on the new team's active roster for a moment.</li>
    <li><b>Sent back to taxi at the deadline:</b> it counts as if he'd always been on taxi; his ${$(1)} deal starts fresh at the next call-up.</li>
    <li><b>Drops reset the rookie path:</b> a player picked up straight onto an active roster is a normal pickup, not a rookie deal.</li>
  </ul>`;

  // 8b. Free agency auction.
  const auction = `<div class="hw-auc">
    <div class="hw-aucrow hw-out"><span class="hw-bidder">Team A</span><b>$15</b><small>opening bid, then outbid: $15 of room back</small></div>
    <div class="hw-aucrow hw-out"><span class="hw-bidder">Team B</span><b>$18</b><small>outbid: $18 of room back</small></div>
    <div class="hw-aucrow"><span class="hw-bidder">Team C</span><b>$20</b><small>new leader: holds $20 of room + a roster spot</small></div>
    <div class="hw-gavel">⏱ ${BID_HOURS} hours with no new bid → Team C wins at $20 a season, then picks 1-4 seasons</div>
  </div>
  <ul class="hw-list">
    <li><b>Bid on price only</b> (per season). Opening bid at least ${Math.round(OPEN_SHARE * 100)}% of his tier price, then raise by ${$(BID_STEP)} or more.</li>
    <li><b>Leading bids count against your cap</b> and hold a roster spot; if you're outbid, the room comes back. You can't bid more than your room.</li>
    <li><b>Soft close:</b> each player closes ${BID_HOURS} hours after his last bid, so nobody can snipe at the buzzer.</li>
    <li><b>Bids are binding.</b> The winner picks the length; it must fit the years pool, the 4-season limit and his service cycle.</li>
    <li><b>Re-signing him later costs the higher of his current price and his tier.</b> Win a star at $150 and re-signing him stays $150 (or more): an overpay never gets cheaper.</li>
    <li><b>Public cap board:</b> every team's signed payroll, leading bids, room, roster, pool years and re-signings, live for everyone.</li>
  </ul>`;

  // 9. All the numbers.
  const nums = [
    [$(L.cap), 'hard cap per team (fixed)'],
    [$(FLOOR), 'floor at the season start'],
    [`${Math.round(OPEN_SHARE * 100)}%`, 'of his tier price = the lowest opening bid'],
    [POOL, 'contract-years per team (active + IR)'],
    [ROSTER_MAX, 'players max (active + IR); taxi up to ' + TAXI_MAX],
    [`1-${MAX_YEARS}`, 'seasons per contract, chosen by the team'],
    [FOUR_YEAR_PER_SUMMER, 'new 4-season deals a summer'],
    [RESIGN_MAX, 're-signings a summer (rookie-deal graduates free)'],
    [2, 'contracts in a row, then free agency (startup players: day one is their 2nd)'],
    [`${Math.round(CUT_SHARE * 100)}%`, 'dead money per season left on a cut'],
  ];
  const all = `<div class="hw-nums">${nums.map(([n, t]) => `<div><b>${n}</b><span>${t}</span></div>`).join('')}</div>`;

  return betaCard('How it works: the big picture', pillars, { sub: 'A sandbox: nothing is official yet' })
    + betaCard('1. Price comes from the real NBA salary', ladder)
    + betaCard('2. The price is locked for the whole deal', lock)
    + betaCard('3. A player\'s life in the league', life)
    + betaCard('4. The years pool', pool)
    + betaCard('5. The league year, step by step', year)
    + betaCard('6. Cuts and dead money', cut)
    + betaCard('7. Trades and taxi', trade)
    + betaCard('8. Free agency: the public auction', auction)
    + betaCard('All the numbers', all);
}
