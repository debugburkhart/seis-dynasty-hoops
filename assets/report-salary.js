// Report: a league-made salary + contract system in small dollar numbers (owner, Nov 7 2026: "$ and $$ and maybe
// $$$ ... a realistic salary cap ... taxi exempt ... waiver adds, drops, max contract length, free agency").
// A PROPOSAL: nothing here changes the league. Prices come from the site's dynasty scores (0-100) so the report can
// show what every roster would pay today. h = { DATA, esc, get, name, teamName, dynasty } from app.js.

// ---- The proposed rules (change a number here and the whole report follows) ----
const MAX_PRICE = 50; // the most one player can cost a season ("max contract")
const CURVE = 1.6; // price = MAX_PRICE x (dynasty score / 100) ^ CURVE, at least $1
const TIERS = [[25, '$$$', 'Star'], [8, '$$', 'Starter'], [1, '$', 'Role / depth']]; // price at or above -> tier
const MAX_YEARS = 4;
const YEAR_PREMIUM = 0.10; // +10% a season for every year beyond the first
const ROOKIE_YEARS = 3;
const HOME_DISCOUNT = 0.10; // re-signing your own player
const CUT_SHARE = 0.5; // dead money this season when you cut a player
const CAP_ROUND = 10; // cap rounded up to $10
const CAP_CUSHION = 0.10; // cap = average payroll + 10%
const FLOOR_SHARE = 0.75;
// Rookie scale by overall pick (8 teams x 3 rounds): round 1 $8 -> $4, round 2 $3 -> $2, round 3 $1.
const ROOKIE_SCALE = no => (no <= 8 ? Math.max(4, 8 - Math.floor((no - 1) * 4 / 7)) : no <= 16 ? (no <= 12 ? 3 : 2) : 1);

export const priceOf = score => Math.max(1, Math.round(MAX_PRICE * Math.pow(Math.max(0, score) / 100, CURVE)));
const tierOf = price => TIERS.find(([min]) => price >= min);
const longDeal = (price, years) => Math.ceil(price * (1 + YEAR_PREMIUM * (years - 1)));

export async function reportSalary(h) {
  const { DATA, esc, get, name, teamName } = h;
  const cur = DATA.seasons.at(-1);
  const season = Number(cur.season);
  const span = s => `${s}-${String((s + 1) % 100).padStart(2, '0')}`;
  const [dyn, rosters, all] = await Promise.all([
    h.dynasty().catch(() => null), get(`/v1/league/${cur.leagueId}/rosters?t=${Date.now()}`, []), get('/v1/players/nba', {}),
  ]);
  if (!dyn?.v?.players) return '<p class="empty">Couldn’t load dynasty scores right now, so prices can’t be worked out. Try again in a minute.</p>';
  const score = pid => dyn.v.players[pid]?.score ?? 0;
  const pname = pid => DATA.players?.[pid]?.n || [all?.[pid]?.first_name, all?.[pid]?.last_name].filter(Boolean).join(' ') || pid;
  // Rookie deals: drafted in one of the last ROOKIE_YEARS rookie drafts by this team's manager.
  const rookiePick = {};
  for (const d of DATA.drafts ?? []) {
    if (d.kind === 'startup' || Number(d.s) <= season - ROOKIE_YEARS) continue;
    for (const p of d.picks ?? []) if (p.pid) rookiePick[p.pid] = { no: p.no, s: Number(d.s), o: p.o };
  }

  const teams = (rosters ?? []).filter(r => r.owner_id).map(r => {
    const taxi = new Set(r.taxi ?? []);
    const ir = new Set(r.reserve ?? []);
    const players = (r.players ?? []).map(pid => {
      const s = score(pid);
      const price = priceOf(s);
      const rk = rookiePick[pid];
      const onTaxi = taxi.has(pid);
      // On a rookie deal (drafted by anyone, still inside the 3 seasons): the scale price, not the market price.
      const rookie = !onTaxi && rk ? { ...rk, years: Math.max(1, ROOKIE_YEARS - (season - rk.s)) } : null;
      const pay = onTaxi ? 0 : rookie ? ROOKIE_SCALE(rk.no) : price;
      return { pid, name: pname(pid), score: s, price, pay, rookie, slot: onTaxi ? 'taxi' : ir.has(pid) ? 'ir' : 'active', team: all?.[pid]?.team ?? '' };
    }).sort((a, b) => b.pay - a.pay || b.score - a.score);
    const counted = players.filter(p => p.slot !== 'taxi');
    const payroll = counted.reduce((t, p) => t + p.pay, 0);
    const tiers = TIERS.map(([min, sym]) => [sym, counted.filter(p => tierOf(p.pay)?.[0] === min).length]);
    const savings = counted.filter(p => p.rookie).reduce((t, p) => t + (p.price - p.pay), 0);
    return { owner: r.owner_id, players, counted, payroll, tiers, savings, taxi: players.filter(p => p.slot === 'taxi') };
  }).sort((a, b) => b.payroll - a.payroll);

  const avg = teams.reduce((t, x) => t + x.payroll, 0) / teams.length;
  const cap = Math.ceil((avg * (1 + CAP_CUSHION)) / CAP_ROUND) * CAP_ROUND;
  const floor = Math.round((cap * FLOOR_SHARE) / CAP_ROUND) * CAP_ROUND;
  const tn = o => `${esc(teamName(o, cur.season))} <small>(${esc(name(o))})</small>`;
  const $ = n => `$${n}`;
  const tierChip = price => { const t = tierOf(price); return t ? `<span class="rs-tier rs-t${t[1].length}" title="${esc(t[2])}">${t[1]}</span>` : ''; };
  const allCounted = teams.flatMap(t => t.counted.map(p => ({ ...p, o: t.owner })));
  const top = [...allCounted].sort((a, b) => b.pay - a.pay).slice(0, 10);
  const tierCount = sym => allCounted.filter(p => tierOf(p.pay)?.[1] === sym).length;
  const over = teams.filter(t => t.payroll > cap);
  const under = teams.filter(t => t.payroll < floor);
  const example = top[0];
  const max = Math.max(cap, ...teams.map(t => t.payroll)) * 1.04;

  const teamRow = t => {
    const room = cap - t.payroll;
    return `<div class="rc-team">
      <div class="rc-th"><b>${tn(t.owner)}</b><span class="${room < 0 ? 'rc-over' : 'rc-ok'}">${$(t.payroll)} · ${room < 0 ? `${$(-room)} over` : `${$(room)} room`}</span></div>
      <div class="rc-bar"><span class="rc-a" style="width:${(100 * t.payroll) / max}%"></span><i class="rc-cap" style="left:${(100 * cap) / max}%"></i></div>
      <div class="rc-nums">${t.tiers.map(([sym, n]) => `<span><b>${n}</b> × ${sym}</span>`).join('')}<span>${t.counted.length} under contract</span><span>${t.taxi.length} on taxi (free)</span>${t.savings > 0 ? `<span>Rookie deals save ${$(t.savings)}</span>` : t.savings < 0 ? `<span>Rookie deals cost ${$(-t.savings)} more than market</span>` : ''}</div>
      <details class="rp-more"><summary>Every contract</summary><div class="rc-scroll"><table class="rc-tbl"><thead><tr><th>Player</th><th class="n">Dynasty</th><th class="n">Pays</th><th class="n">Market price</th></tr></thead><tbody>
        ${t.players.map(p => `<tr class="${p.slot}"><td><b>${esc(p.name)}</b> <small>${esc(p.team)}${p.slot === 'ir' ? ' · IR' : p.slot === 'taxi' ? ' · taxi' : ''}${p.rookie ? ` · rookie deal (No. ${p.rookie.no}, ${p.rookie.years} yr${p.rookie.years === 1 ? '' : 's'} left)` : ''}</small></td>
          <td class="n">${p.score}</td><td class="n">${p.slot === 'taxi' ? '<small>Exempt</small>' : `${$(p.pay)} ${tierChip(p.pay)}`}</td><td class="n">${$(p.price)}</td></tr>`).join('')}
      </tbody></table></div></details>
    </div>`;
  };

  return `
    <div class="rp-stats">
      <div><b>${$(cap)}</b><span>salary cap per team (floor ${$(floor)})</span></div>
      <div><b>${$(1)} – ${$(MAX_PRICE)}</b><span>what one player can cost a season</span></div>
      <div><b>${MAX_YEARS} years</b><span>longest contract (rookie deals ${ROOKIE_YEARS})</span></div>
    </div>
    <p class="cm-rule">A proposal for our own salary system in small, easy numbers. It doesn’t change anything in Sleeper or on the site; the payrolls below show what each roster would cost if it started today. Prices come from each player’s dynasty score (the site’s 0-100 value rating), read just now.</p>

    <h3 class="rp-h">The money in one minute</h3>
    <ul class="rc-list">
      <li><b>Every player has a price from ${$(1)} to ${$(MAX_PRICE)} a season.</b> It follows his dynasty score: a score of 100 costs ${$(priceOf(100))}, 80 costs ${$(priceOf(80))}, 60 costs ${$(priceOf(60))}, 40 costs ${$(priceOf(40))}, 20 costs ${$(priceOf(20))}, and anyone under about 15 costs ${$(1)}. Stars cost a lot more than role players on purpose, like real NBA pay.</li>
      <li><b>Three tiers you can read at a glance:</b> <span class="rs-tier rs-t1">$</span> ${$(1)}–${$(TIERS[1][0] - 1)} role / depth player, <span class="rs-tier rs-t2">$$</span> ${$(TIERS[1][0])}–${$(TIERS[0][0] - 1)} starter, <span class="rs-tier rs-t3">$$$</span> ${$(TIERS[0][0])}+ star. Today the league has ${tierCount('$$$')} stars, ${tierCount('$$')} starters and ${tierCount('$')} role players under contract.</li>
      <li><b>Each team gets a ${$(cap)} salary cap.</b> Add up everyone on your active roster and IR; that total has to stay at or under ${$(cap)}. It’s set at the league’s average payroll plus 10%, so most teams fit today and a few have work to do. There’s also a ${$(floor)} floor so nobody plays with an empty wallet.</li>
      <li><b>Taxi is free.</b> Players on the taxi squad have no contract and don’t count against the cap. The 15-player taxi limit and the 3-season rule keep that from being abused.</li>
    </ul>

    <h3 class="rp-h">Contracts</h3>
    <ul class="rc-list">
      <li><b>A contract is a price and a length: 1 to ${MAX_YEARS} seasons.</b> The price is locked in for every season of the deal, even if his dynasty score shoots up or crashes.</li>
      <li><b>Longer deals cost a bit more per season:</b> +10% for each year past the first (rounded up). ${example ? `${esc(example.name)} at ${$(example.price)}: 1 year ${$(longDeal(example.price, 1))}, 2 years ${$(longDeal(example.price, 2))}, 3 years ${$(longDeal(example.price, 3))}, 4 years ${$(longDeal(example.price, 4))} a season.` : ''} A young player you expect to grow is worth locking up long; a 33-year-old is better on a 1-year deal.</li>
      <li><b>Why ${MAX_YEARS} years max:</b> it’s long enough to build around a young core (a rookie deal plus one more contract), short enough that a bad deal doesn’t sink a team for half a decade, and players’ values change fast (injuries, trades, aging). It also matches how far ahead our draft picks go. Longer deals would mostly reward whoever locked up a young star cheapest first.</li>
      <li><b>Rookie deals:</b> every rookie draft pick signs a ${ROOKIE_YEARS}-season deal on a fixed scale: pick 1.01 ${$(ROOKIE_SCALE(1))}, 1.08 ${$(ROOKIE_SCALE(8))}, round 2 ${$(ROOKIE_SCALE(9))}–${$(ROOKIE_SCALE(16))}, round 3 ${$(ROOKIE_SCALE(17))}. That’s cheap on purpose: it’s the reward for drafting well, like the NBA’s rookie scale. A rookie on the taxi squad has no contract yet; his ${ROOKIE_YEARS} seasons start the day he’s called up. When his rookie deal ends you can re-sign him first (see Free agency).</li>
      <li><b>Trades:</b> contracts travel with the player (same price, same years left). Both teams have to be under the cap after the trade.</li>
    </ul>

    <h3 class="rp-h">Waiver adds, drops and free agency</h3>
    <ul class="rc-list">
      <li><b>Waiver and free-agent adds (during the season):</b> keep using Sleeper’s waivers and FAAB exactly as now. The player you add signs a rest-of-season deal at his price that day (most are ${$(1)}–${$(3)}). You need the cap room first: if you’re at the cap, drop someone before the claim. At the end of the season he’s yours to re-sign first, or he goes to free agency.</li>
      <li><b>Drops:</b> cutting a player under contract leaves dead money: you still pay ${Math.round(CUT_SHARE * 100)}% of his price this season (rounded up), and every season after that is wiped clean. ${$(1)} players, rest-of-season pickups and rookies in their first season can be cut for free. That makes a long deal a real commitment without trapping anyone.</li>
      <li><b>Free agency (every summer, after the playoffs):</b>
        <ol>
          <li><b>Contracts tick down.</b> Every deal loses a season; deals that hit zero end.</li>
          <li><b>Re-sign window</b> (before the rookie draft): you can keep your own expiring players at their new price minus ${Math.round(HOME_DISCOUNT * 100)}% (a home-team discount), any length up to ${MAX_YEARS} years.</li>
          <li><b>Open bidding</b> for everyone not re-signed: each team sends the commish a blind bid (price per season + years) for any free agent it wants, within its cap room. The highest price per season wins; a tie goes to the longer deal, then to the team that finished lower. Bids can go above a player’s listed price (that’s the market) but not above ${$(MAX_PRICE)}.</li>
          <li><b>Rookie draft</b> after free agency, then normal waivers.</li>
        </ol></li>
      <li><b>Who keeps track:</b> Sleeper has no contracts, so the site would keep the contract list (price, years, dead money) and flag anyone over the cap; the commish enters signings and settles the bids.</li>
    </ul>

    <h3 class="rp-h">What it would look like today</h3>
    <div class="rc-key"><span class="rc-a"></span> Payroll (active + IR) <i class="rc-cap"></i> Cap ${$(cap)}</div>
    ${teams.map(teamRow).join('')}
    <p class="cm-rule">Players drafted in the last ${ROOKIE_YEARS} rookie drafts and not on taxi are shown on their rookie deal; everyone else at his market price. ${over.length ? `Over the cap today: ${over.map(t => `${tn(t.owner)} (${$(t.payroll - cap)} over)`).join(', ')}.` : 'Nobody is over the cap today.'} ${under.length ? `Under the floor: ${under.map(t => tn(t.owner)).join(', ')}.` : ''}</p>

    <h3 class="rp-h">The 10 biggest contracts</h3>
    <div class="rc-scroll"><table class="rc-tbl"><thead><tr><th>Player</th><th class="n">Dynasty</th><th class="n">Price</th></tr></thead><tbody>
      ${top.map(p => `<tr><td><b>${esc(p.name)}</b> <small>${esc(name(p.o))}</small></td><td class="n">${p.score}</td><td class="n">${$(p.pay)} ${tierChip(p.pay)}</td></tr>`).join('')}
    </tbody></table></div>

    <h3 class="rp-h">Things to decide before using it</h3>
    <ul class="rc-list">
      <li><b>Starting contracts.</b> On day one every player needs a length. Simplest: each team assigns 1-4 years to its own players at their price, with the +10% per extra year, before a deadline.</li>
      <li><b>Prices come from the site’s dynasty scores.</b> They’re a model, not gospel; the league could instead set prices once a year (each summer) and keep them fixed all season, so a hot week never changes what a waiver add costs.</li>
      <li><b>Rookie picks who struggle</b> can cost more on the rookie scale than they’re worth (a high pick at ${$(ROOKIE_SCALE(1))} who plays like a ${$(2)} player). That’s why rookies can be cut free in their first season; after that, normal dead money applies.</li>
      <li><b>Over-the-cap teams on day one</b> need a grace period (start it next season) or a one-time amnesty: cut one contract with no dead money.</li>
      <li><b>Bookkeeping</b> is the real cost: blind bids and contract years have to live somewhere. The site can hold them, but it’s more work for the commish than today’s setup.</li>
    </ul>`;
}
