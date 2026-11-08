// Contract Sandbox: "How it works" view (owner, Nov 8 2026: "a friendly graphic that explains every aspect of how the
// contracts would work"). Pure HTML/CSS graphics (.hw-* in styles.css, so dark mode converts them like everything else);
// every number comes from the rule constants in leaguecontracts.js, so the page follows any rule change.
import { betaCard } from './test-features.js';
import { money } from './contracts.js';
import {
  CAP_GROWTH, CUT_SHARE, FOUR_YEAR_PER_SUMMER, FREE_CUT, MAX_YEARS, NBA_TIERS, POOL, RESIGN_MAX, ROOKIE_SEASONS, ROOKIE_TIER,
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
    <div class="hw-pillar"><span class="hw-ico">${L.cap}</span><b>Limits</b><p>A <b>${$(L.cap)} hard cap</b>, a <b>${POOL}-year pool</b> of contract seasons and a <b>${ROSTER_MAX}-man roster</b>. Taxi players are free.</p></div>
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

  // 4. A player's life: taxi -> rookie deal -> real contracts, free agency every 8th NBA season.
  const phases = Array.from({ length: 16 }, (_, i) => {
    const y = i + 1;
    if (y <= TAXI_YEARS) return ['taxi', 'Taxi', 'free'];
    if (y <= ROOKIE_SEASONS) return ['rk', 'Rookie', '$1'];
    return ['deal', 'Deal', 'tier'];
  });
  const life = `<div class="hw-life">${phases.map(([k, l, p], i) => `<div class="hw-yr hw-${k}${(i + 1) % SERVICE_MAX === 0 ? ' hw-fa' : ''}"><small>Yr ${i + 1}</small><b>${l}</b><span>${p}</span></div>`).join('')}</div>
  <div class="hw-key"><span class="hw-k hw-taxi"></span> Taxi: no contract, no cap hit (first ${TAXI_YEARS} NBA seasons at most) <span class="hw-k hw-rk"></span> ${$(1)} league rookie deal from call-up through his ${ROOKIE_SEASONS}th NBA season <span class="hw-k hw-deal"></span> Contracts at his real-salary tier <span class="hw-k hw-fa"></span> Free agency after every ${SERVICE_MAX}th NBA season</div>
  <ul class="hw-list">
    <li><b>Service time = NBA seasons</b> from his rookie year, on a roster or not. After his ${SERVICE_MAX}th, ${SERVICE_MAX * 2}th, ${SERVICE_MAX * 3}th... season he goes to free agency: he can't be re-signed and his old team bids FAAB like everyone else. No league deal can run past that point.</li>
    <li><b>Loaner stars:</b> a player in the last season before free agency can still be traded, a one-season rental for a contender.</li>
    <li><b>Any taxi rookie</b> (drafted or picked up) gets the ${$(1)} deal when called up. While on taxi nothing is on the books.</li>
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
    ${step(3, 'Re-sign window', `Keep up to <b>${RESIGN_MAX} expiring players</b> (players coming off the ${$(1)} rookie deal don't count) at their <b>new tier</b>, any length that fits. Players at a ${SERVICE_MAX}-season mark can't be re-signed.`)}
    ${step(4, 'Free agency', 'Everyone not re-signed goes into one Sleeper waiver / FAAB period. The winner picks the length (1-4) and needs cap room, pool years and a roster spot.')}
    ${step(5, 'Rookie draft', 'Picks go to taxi (free) or straight to the active roster on the $1 rookie deal.')}
    ${step(6, 'Season starts', `Every team must be under the <b>${$(L.cap)} hard cap</b> with ${ROSTER_MAX} or fewer players (taxi ${TAXI_MAX} or fewer).`)}
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

  // 9. All the numbers.
  const nums = [
    [$(L.cap), 'hard cap per team (league average + 10%, keep it fixed a few seasons)'],
    [POOL, 'contract-years per team (active + IR)'],
    [ROSTER_MAX, 'players max (active + IR); taxi up to ' + TAXI_MAX],
    [`1-${MAX_YEARS}`, 'seasons per contract, chosen by the team'],
    [FOUR_YEAR_PER_SUMMER, 'new 4-season deals a summer'],
    [RESIGN_MAX, 're-signings a summer (rookie-deal graduates free)'],
    [SERVICE_MAX, 'NBA seasons per cycle, then free agency'],
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
    + betaCard('All the numbers', all);
}
