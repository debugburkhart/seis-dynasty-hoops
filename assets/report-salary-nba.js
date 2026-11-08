// Report: Salary system v2: prices come from each player's REAL NBA contract tier (owner, Nov 7 2026: "base off the
// real NBA contract with tiers (supermax being the highest, rookie the lowest)"). Revised the same day (owner: "$50
// being the max (= to supermax) ... a more rounded number for salary cap, 370 is wonky ... contract length to be
// independent of their NBA contract"): supermax = $50, cap rounded to $50 steps, league contracts are 1-4 seasons
// chosen by the team, and the price is LOCKED when he signs. A PROPOSAL. h = { DATA, esc, get, name, teamName,
// loadContracts } from app.js.
import { money, readContract } from './contracts.js';

// ---- Tiers: real NBA salary -> league price (top down; first match wins) ----
// Cutoffs are real dollars for 2026-27; raise them with the NBA cap each summer (about +5-10% a year).
export const NBA_TIERS = [
  { id: 'supermax', label: 'Supermax', min: 55e6, price: 50, sym: '$$$', note: 'the top deals in the NBA (about 35% of the NBA cap)' },
  { id: 'max', label: 'Max', min: 45e6, price: 40, sym: '$$$', note: 'max contracts' },
  { id: 'nearmax', label: 'Near max', min: 35e6, price: 30, sym: '$$$', note: 'just under a max' },
  { id: 'big', label: 'Big starter', min: 25e6, price: 20, sym: '$$', note: 'well-paid starters' },
  { id: 'starter', label: 'Starter', min: 15e6, price: 15, sym: '$$', note: 'solid starters' },
  { id: 'mid', label: 'Mid-level', min: 8e6, price: 10, sym: '$$', note: 'about the NBA mid-level exception' },
  { id: 'role', label: 'Role player', min: 4e6, price: 5, sym: '$', note: 'rotation players' },
  { id: 'bench', label: 'Bench', min: 2.5e6, price: 3, sym: '$', note: 'end of the bench' },
  { id: 'minimum', label: 'Minimum', min: 0, price: 2, sym: '$', note: 'veteran minimum deals' },
];
export const ROOKIE_TIER = { id: 'rookie', label: 'Rookie deal', price: 1, sym: '$', note: 'in his first 4 NBA seasons, any pick: the cheapest tier, like the NBA rookie scale' };
export const ROOKIE_SEASONS = 4; // NBA rookie-scale deals run 4 seasons (2 + 2 team options)
export const NO_DEAL_TIER = { id: 'nodeal', label: 'No NBA deal', price: 1, sym: '$', note: 'two-way, G League or overseas: no standard NBA contract' };
export const CAP_ROUND = 50; // the cap is a round $50 step
export const CAP_CUSHION = 0.10; // average payroll + 10%, then rounded to the nearest $50
export const FLOOR_SHARE = 0.75;
export const MAX_YEARS = 4;
export const LEAGUE_ROOKIE_YEARS = 3; // our rookie draft picks: 3 seasons at the rookie price
export const CUT_SHARE = 0.5; // dead money per season left on a cut contract
export const FREE_CUT = 3; // players priced $3 or less can be cut for free

// A player's tier for a season from his contract (c = data/contracts.json row), or the no-deal tier. exp = NBA seasons
// before THAT season (Sleeper years_exp, + 1 per season ahead): his first ROOKIE_SEASONS seasons are the rookie tier,
// even when an extension that starts later is already signed (Wembanyama's 4th season).
export function nbaTier(c, season, exp) {
  const rc = c ? readContract(c, season, exp == null ? null : Math.min(3, exp)) : null;
  if (!rc?.now) return { tier: NO_DEAL_TIER, rc };
  if (rc.rookie || (exp != null && exp < ROOKIE_SEASONS)) return { tier: ROOKIE_TIER, rc };
  return { tier: NBA_TIERS.find(t => rc.now.salary >= t.min), rc };
}

export async function reportSalaryNba(h) {
  const { DATA, esc, get, name, teamName } = h;
  const cur = DATA.seasons.at(-1);
  const season = Number(cur.season);
  const span = s => `${s}-${String((s + 1) % 100).padStart(2, '0')}`;
  const [file, rosters, all] = await Promise.all([
    h.loadContracts(), get(`/v1/league/${cur.leagueId}/rosters?t=${Date.now()}`, []), get('/v1/players/nba', {}),
  ]);
  if (!file?.players) return '<p class="empty">The NBA contract file isn’t available yet (it’s built by the nightly update on Sundays).</p>';
  const pname = pid => DATA.players?.[pid]?.n || [all?.[pid]?.first_name, all?.[pid]?.last_name].filter(Boolean).join(' ') || pid;
  const $ = n => `$${n}`;
  const tn = o => `${esc(teamName(o, cur.season))} <small>(${esc(name(o))})</small>`;

  const teams = (rosters ?? []).filter(r => r.owner_id).map(r => {
    const taxi = new Set(r.taxi ?? []);
    const ir = new Set(r.reserve ?? []);
    const players = (r.players ?? []).map(pid => {
      const exp = all?.[pid]?.years_exp;
      const c = file.players[pid];
      const { tier, rc } = nbaTier(c, season, exp);
      // Next season's tier, from the real contract already on file (rookie extensions show up here).
      const nextC = c?.seasons?.some(x => x.season === season + 1) ? nbaTier(c, season + 1, exp == null ? null : exp + 1).tier : null;
      const onTaxi = taxi.has(pid);
      return {
        pid, name: pname(pid), tier, nextTier: nextC, real: rc?.now?.salary ?? 0,
        slot: onTaxi ? 'taxi' : ir.has(pid) ? 'ir' : 'active', pay: onTaxi ? 0 : tier.price, team: all?.[pid]?.team ?? '',
      };
    }).sort((a, b) => b.pay - a.pay || b.real - a.real);
    const counted = players.filter(p => p.slot !== 'taxi');
    return {
      owner: r.owner_id, players, counted, taxi: players.filter(p => p.slot === 'taxi'),
      payroll: counted.reduce((t, p) => t + p.pay, 0),
      bySym: ['$$$', '$$', '$'].map(s => [s, counted.filter(p => p.tier.sym === s).length]),
      rookies: counted.filter(p => p.tier.id === 'rookie').length,
    };
  }).sort((a, b) => b.payroll - a.payroll);

  const avg = teams.reduce((t, x) => t + x.payroll, 0) / teams.length;
  const cap = Math.round((avg * (1 + CAP_CUSHION)) / CAP_ROUND) * CAP_ROUND;
  const floor = Math.round((cap * FLOOR_SHARE) / CAP_ROUND) * CAP_ROUND;
  const top = NBA_TIERS[0].price;
  const allCounted = teams.flatMap(t => t.counted.map(p => ({ ...p, o: t.owner })));
  const tierCount = id => allCounted.filter(p => p.tier.id === id).length;
  const over = teams.filter(t => t.payroll > cap);
  const under = teams.filter(t => t.payroll < floor);
  const max = Math.max(cap, ...teams.map(t => t.payroll)) * 1.04;
  const chip = t => `<span class="rs-tier rs-t${t.sym.length}" title="${esc(t.label)}: ${esc(t.note)}">${t.sym}</span>`;
  // Lock-in bargains: players whose real contract already puts them in a pricier tier next season.
  const jumps = allCounted.filter(p => p.nextTier && p.nextTier.price > p.pay).map(p => ({ ...p, jump: p.nextTier.price - p.pay }))
    .sort((a, b) => b.jump - a.jump).slice(0, 6);
  const drops = allCounted.filter(p => p.nextTier && p.nextTier.price < p.pay).length;
  const ex = allCounted.find(p => p.tier.id === 'big') ?? allCounted[0];

  const tierTable = `<div class="rc-scroll"><table class="rc-tbl"><thead><tr><th>Tier</th><th>Real ${span(season)} salary</th><th class="n">League price</th><th class="n">On our rosters</th></tr></thead><tbody>
    ${NBA_TIERS.map((t, i) => `<tr><td>${chip(t)} <b>${esc(t.label)}</b> <small>${esc(t.note)}</small></td><td>${i === 0 ? `${money(t.min)}+` : t.min ? `${money(t.min)} – ${money(NBA_TIERS[i - 1].min)}` : `under ${money(NBA_TIERS[i - 1].min)}`}</td><td class="n"><b>${$(t.price)}</b></td><td class="n">${tierCount(t.id)}</td></tr>`).join('')}
    <tr><td>${chip(ROOKIE_TIER)} <b>${ROOKIE_TIER.label}</b> <small>${esc(ROOKIE_TIER.note)}</small></td><td>any (first ${ROOKIE_SEASONS} NBA seasons)</td><td class="n"><b>${$(ROOKIE_TIER.price)}</b></td><td class="n">${tierCount('rookie')}</td></tr>
    <tr><td>${chip(NO_DEAL_TIER)} <b>${NO_DEAL_TIER.label}</b> <small>${esc(NO_DEAL_TIER.note)}</small></td><td>none</td><td class="n"><b>${$(NO_DEAL_TIER.price)}</b></td><td class="n">${tierCount('nodeal')}</td></tr>
  </tbody></table></div>`;

  const teamRow = t => {
    const room = cap - t.payroll;
    return `<div class="rc-team">
      <div class="rc-th"><b>${tn(t.owner)}</b><span class="${room < 0 ? 'rc-over' : 'rc-ok'}">${$(t.payroll)} · ${room < 0 ? `${$(-room)} over` : `${$(room)} room`}</span></div>
      <div class="rc-bar"><span class="rc-a" style="width:${(100 * t.payroll) / max}%"></span><i class="rc-cap" style="left:${(100 * cap) / max}%"></i></div>
      <div class="rc-nums">${t.bySym.map(([s, n]) => `<span><b>${n}</b> × ${s}</span>`).join('')}<span>${t.rookies} at the rookie price</span><span>${t.taxi.length} on taxi (free)</span></div>
      <details class="rp-more"><summary>Every player’s price</summary><div class="rc-scroll"><table class="rc-tbl"><thead><tr><th>Player</th><th class="n">Real salary</th><th class="n">Price now</th><th class="n">Next season</th></tr></thead><tbody>
        ${t.players.map(p => `<tr class="${p.slot}"><td><b>${esc(p.name)}</b> <small>${esc(p.team)}${p.slot === 'ir' ? ' · IR' : p.slot === 'taxi' ? ' · taxi' : ''} · ${esc(p.tier.label)}</small></td>
          <td class="n">${p.real ? money(p.real) : '—'}</td>
          <td class="n">${p.slot === 'taxi' ? '<small>Exempt</small>' : `${$(p.pay)} ${chip(p.tier)}`}</td>
          <td class="n">${p.nextTier ? $(p.nextTier.price) : '<small>new deal</small>'}</td></tr>`).join('')}
      </tbody></table></div></details>
    </div>`;
  };

  return `
    <div class="rp-stats">
      <div><b>${$(cap)}</b><span>salary cap per team = room for ${cap / top} supermax deals (floor ${$(floor)})</span></div>
      <div><b>${$(ROOKIE_TIER.price)} – ${$(top)}</b><span>rookie deal to supermax, per season</span></div>
      <div><b>1 – ${MAX_YEARS} seasons</b><span>contract length, chosen by the team, not the NBA</span></div>
    </div>
    <p class="cm-rule">A proposal. A player’s price comes from his <b>real NBA contract</b> (what tier he’s paid at), but how long he’s yours is a <b>league contract</b> the team chooses. Real ${span(season)} salaries from ${esc(file.source?.name ?? 'Basketball-Reference')} (read ${esc(String(file.source?.read ?? file.at).slice(0, 10))}); rosters from Sleeper just now.</p>

    <h3 class="rp-h">1. Price: from his real NBA salary</h3>
    <ul class="rc-list"><li><b>Find his real salary’s tier.</b> A supermax deal costs the most, ${$(top)}; a player still on his NBA rookie deal costs ${$(1)}; everyone else is in between, in round numbers:</li></ul>
    ${tierTable}
    <ul class="rc-list">
      <li><b>$ / $$ / $$$:</b> $$$ = supermax, max and near-max (${$(NBA_TIERS[2].price)}–${$(top)}), $$ = starter deals (${$(NBA_TIERS[5].price)}–${$(NBA_TIERS[3].price)}), $ = role, bench, minimum, rookie and no-deal players (${$(1)}–${$(NBA_TIERS[6].price)}).</li>
      <li><b>The price is set the day he signs a league contract and stays locked</b> for that whole contract, no matter what happens to his real salary afterwards. ${ex ? `Sign ${esc(ex.name)} (${esc(ex.tier.label)}, ${$(ex.pay)}) for 3 seasons and he costs ${$(ex.pay)} in each of them.` : ''}</li>
      <li><b>Which salary counts:</b> his real salary for the first season of the new league contract. In the summer that’s next season’s salary (after NBA free agency), during the season it’s this season’s.</li>
    </ul>

    <h3 class="rp-h">2. The cap: ${$(cap)}</h3>
    <ul class="rc-list">
      <li><b>${$(cap)} per team</b>, counting the active roster and IR. <b>Taxi players are exempt</b> and cost nothing.</li>
      <li><b>Why ${$(cap)}:</b> our average payroll today is ${$(Math.round(avg))}; add 10% so a well-run team has room to move, and round to the nearest ${$(CAP_ROUND)}. An easy way to picture it: ${$(cap)} is room for ${cap / top} supermax players, or about ${Math.round(cap / NBA_TIERS[4].price)} solid starters. Once set, keep the number the same for a few seasons so everyone can plan.</li>
      <li><b>A ${$(floor)} floor</b> (75% of the cap), checked once at the start of the season, so nobody plays with an empty wallet.</li>
      <li><b>The cap is hard:</b> no waiver claim, signing or trade can put a team over it. Over at the season-start check (for example after a re-signing) = fix it within a week, or the commish cuts the most recent signing.</li>
    </ul>

    <h3 class="rp-h">3. Contract length: the team decides, not the NBA</h3>
    <ul class="rc-list">
      <li><b>Every league contract is 1 to ${MAX_YEARS} seasons</b>, picked by the team when it signs or re-signs a player. It has nothing to do with his real NBA deal: a player with 1 year left in the NBA can be on a 4-year league contract, and the other way around.</li>
      <li><b>The trade-off:</b> a long deal locks his price (great for a player whose real salary is about to jump), but cutting a long deal is expensive (see Drops). A short deal keeps you flexible but means re-signing him at his new price sooner.</li>
      <li><b>Why ${MAX_YEARS} seasons max:</b> long enough to build around a young core, short enough that a bad deal doesn’t sink a team for half a decade, and players change fast (injuries, trades, aging). It also matches how far ahead our draft picks go.</li>
      <li><b>Rookie draft picks</b> sign a ${LEAGUE_ROOKIE_YEARS}-season league rookie deal at ${$(1)}. On the taxi squad there’s no contract at all; the ${LEAGUE_ROOKIE_YEARS} seasons start the day he’s called up.</li>
    </ul>

    <h3 class="rp-h">4. The year, step by step</h3>
    <ol class="rc-list">
      <li><b>End of the playoffs:</b> every league contract loses a season. Contracts at 0 are expiring.</li>
      <li><b>NBA draft and NBA free agency (late June - July):</b> nothing happens in our league yet; it sets next season’s real salaries, which set prices. Raise the tier cutoffs with the new NBA cap.</li>
      <li><b>Re-sign window (late July, about 2 weeks):</b> keep any of your expiring players: new price from his new real salary tier, any length 1-${MAX_YEARS}. Players you don’t re-sign are released on the deadline.</li>
      <li><b>Free agency (early August, about 1 week):</b> every released player, plus anyone else unrostered, goes into one long Sleeper waiver period. Teams claim with FAAB (fresh budget each season); the price is already set by his tier, so FAAB only decides who gets him. The winner picks the length (1-${MAX_YEARS}) and needs the cap room.</li>
      <li><b>Rookie draft (after free agency):</b> picks sign ${$(1)} rookie deals (or go to taxi, clock stopped).</li>
      <li><b>Season start: cap and floor check.</b> Every team at or under ${$(cap)} and at or above ${$(floor)}.</li>
      <li><b>During the season:</b>
        <ul>
          <li><b>Waiver and free-agent adds:</b> Sleeper waivers and FAAB as now. He signs a <b>rest-of-season</b> deal at his current tier price (no length choice); in the summer you can re-sign him like anyone else. You need cap room before the claim.</li>
          <li><b>Drops:</b> you pay dead money of ${Math.round(CUT_SHARE * 100)}% of his price for <b>every season left</b> on his league deal, this one included. A ${$(20)} player cut with 3 seasons left = ${$(10)} of dead money this season, next season and the one after. Free to cut: players priced ${$(FREE_CUT)} or less, rest-of-season pickups, and rookies in their first season.</li>
          <li><b>Trades:</b> the contract moves with the player (same price, same seasons left). Both teams must be under the cap after the trade.</li>
          <li><b>Taxi call-ups:</b> a called-up rookie starts his ${$(1)} rookie deal and counts against the cap from that day.</li>
          <li><b>IR:</b> injured players still count (they come back onto the roster).</li>
        </ul></li>
      <li><b>Trade deadline:</b> last chance to move salary until the summer.</li>
    </ol>

    <h3 class="rp-h">5. What it would look like today</h3>
    <p class="cm-rule">On day one every player’s price is his tier today, and each team chooses a length (1-${MAX_YEARS}) for everyone it keeps. Lengths don’t change this season’s payroll, so here is each roster at today’s prices.</p>
    <div class="rc-key"><span class="rc-a"></span> Payroll (active + IR) <i class="rc-cap"></i> Cap ${$(cap)}</div>
    ${teams.map(teamRow).join('')}
    <p class="cm-rule">${over.length ? `Over the cap today: ${over.map(t => `${tn(t.owner)} (${$(t.payroll - cap)} over)`).join(', ')}.` : 'Nobody is over the cap today.'} ${under.length ? `Under the floor: ${under.map(t => tn(t.owner)).join(', ')}.` : ''} A system like this would start next season, after a summer to adjust.</p>

    <h3 class="rp-h">6. Why length matters: lock-in bargains</h3>
    <p class="cm-rule">Players whose real contract already puts them in a pricier tier next season. Signed now on a long deal, they’d keep today’s price; on a 1-year deal, they’d cost the new price next summer.</p>
    <ul class="rc-list">${jumps.map(p => `<li><b>${esc(p.name)}</b> <small>(${esc(name(p.o))})</small>: ${$(p.pay)} now → ${$(p.nextTier.price)} next season (${esc(p.nextTier.label)})</li>`).join('') || '<li>None found.</li>'}</ul>
    <p class="cm-rule">The other way: ${drops} players get cheaper next season, so long deals for them would lock in a higher price than needed. That push and pull is the whole point of choosing lengths.</p>

    <h3 class="rp-h">7. Good and not so good</h3>
    <ul class="rc-list">
      <li><b>Good: prices nobody can argue with.</b> They come from public NBA contracts in round numbers.</li>
      <li><b>Good: real decisions.</b> Who gets a long deal, who to re-sign, when to cut and eat dead money.</li>
      <li><b>Watch out: the best move is locking up rookies about to get paid</b> (see section 6). That rewards good scouting, but the league might cap how many 4-season deals a team can sign each summer (for example 2) if it gets out of hand.</li>
      <li><b>Watch out: real salary isn’t fantasy value.</b> Overpaid or injured players are expensive even when they don’t produce; that’s the risk you take signing them.</li>
      <li><b>Watch out: tier edges.</b> Just over a cutoff costs a lot more than just under. Raise the cutoffs with the NBA cap each summer.</li>
      <li><b>Bookkeeping:</b> each player needs a league price and seasons left, which Sleeper can’t store. The site would keep the contract list, flag cap problems and print the release list; the commish enters signings.</li>
    </ul>`;
}
