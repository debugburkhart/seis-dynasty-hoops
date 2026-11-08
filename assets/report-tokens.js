// Report: a TOKEN contract system: no salaries, only contract lengths, and each team has a limited number of
// 4-, 3-, 2- and 1-year contracts to hand out (owner, Nov 7 2026: "would that work? ... the off season would be weird,
// how would that all work?"). A PROPOSAL. h = { DATA, esc, get, name, teamName, dynasty } from app.js; dynasty scores
// are only used to show an EXAMPLE of who would get the long deals, never to set a rule.

// ---- The proposed rules ----
const LAUNCH = [[4, 2], [3, 3], [2, 5]]; // day one: 2 four-year, 3 three-year, 5 two-year deals; everyone else 1 year
const SUMMER = [[4, 1], [3, 1], [2, 2], [1, 3]]; // new tokens every summer (use them or lose them)
const ROOKIE_YEARS = 3; // rookie draft picks: free 3-year deal, clock starts when called up from taxi
const MAX_YEARS = 4;

export async function reportTokens(h) {
  const { DATA, esc, get, name, teamName } = h;
  const cur = DATA.seasons.at(-1);
  const season = Number(cur.season);
  const span = s => `${s}-${String((s + 1) % 100).padStart(2, '0')}`;
  const [rosters, all, dyn] = await Promise.all([
    get(`/v1/league/${cur.leagueId}/rosters?t=${Date.now()}`, []), get('/v1/players/nba', {}), h.dynasty().catch(() => null),
  ]);
  const pname = pid => DATA.players?.[pid]?.n || [all?.[pid]?.first_name, all?.[pid]?.last_name].filter(Boolean).join(' ') || pid;
  const score = pid => dyn?.v?.players?.[pid]?.score ?? 0;
  const tn = o => `${esc(teamName(o, cur.season))} <small>(${esc(name(o))})</small>`;
  const rookieDraft = {};
  for (const d of DATA.drafts ?? []) {
    if (d.kind === 'startup' || Number(d.s) <= season - ROOKIE_YEARS) continue;
    for (const p of d.picks ?? []) if (p.pid) rookieDraft[p.pid] = Number(d.s);
  }
  const launchCount = LAUNCH.reduce((t, [, n]) => t + n, 0);
  const summerCount = SUMMER.reduce((t, [, n]) => t + n, 0);
  const summerYears = SUMMER.reduce((t, [y, n]) => t + y * n, 0);
  const tok = (list, sep = ', ') => list.map(([y, n]) => `${n} × ${y}-year`).join(sep);

  const teams = (rosters ?? []).filter(r => r.owner_id).map(r => {
    const taxi = new Set(r.taxi ?? []);
    const counted = (r.players ?? []).filter(pid => !taxi.has(pid));
    const rookies = counted.filter(pid => rookieDraft[pid]);
    const need = counted.filter(pid => !rookieDraft[pid]).sort((a, b) => score(b) - score(a));
    // Example only: the best players by dynasty score get the longest launch deals.
    const lengths = LAUNCH.flatMap(([y, n]) => Array(n).fill(y));
    const assigned = need.map((pid, i) => ({ pid, years: lengths[i] ?? 1 }));
    const oneYear = assigned.filter(a => a.years === 1).length;
    const rookiesEnding = rookies.filter(pid => rookieDraft[pid] + ROOKIE_YEARS - 1 <= season).length;
    const expiring = oneYear + rookiesEnding;
    return { owner: r.owner_id, counted: counted.length, rookies: rookies.length, taxi: taxi.size, need: need.length, assigned, oneYear, rookiesEnding, expiring, toPool: Math.max(0, expiring - summerCount) };
  });
  const pool = teams.reduce((t, x) => t + x.toPool, 0);
  const expiringAll = teams.reduce((t, x) => t + x.expiring, 0);
  const avgCounted = Math.round(teams.reduce((t, x) => t + x.counted, 0) / teams.length);
  const me = teams.find(t => t.owner === h.COMMISH) ?? teams[0];

  const teamRow = t => `<tr><td>${tn(t.owner)}</td><td class="n">${t.counted}</td><td class="n">${t.rookies}</td><td class="n">${t.taxi}</td><td class="n">${t.need}</td><td class="n">${t.expiring}</td><td class="n"><b>${t.toPool}</b></td></tr>`;

  return `
    <div class="rp-stats">
      <div><b>${launchCount}</b><span>multi-year deals each team hands out on day one</span></div>
      <div><b>${summerCount}</b><span>new contract tokens every summer</span></div>
      <div><b>${pool}+</b><span>players hitting free agency after year one (league-wide)</span></div>
    </div>
    <p class="cm-rule">A proposal: no salaries and no cap at all. The only thing a contract has is a <b>length</b>, and long contracts are scarce. Rosters below are read from Sleeper just now.</p>

    <h3 class="rp-h">The idea in one minute</h3>
    <ul class="rc-list">
      <li><b>Every player on your active roster or IR is under contract for 1 to ${MAX_YEARS} seasons.</b> When his contract runs out, you either use a token to keep him or he becomes a free agent anyone can claim.</li>
      <li><b>Contracts come from tokens.</b> A 4-year token signs a player for 4 seasons, a 3-year token for 3, and so on. You only get a few of each, so you have to choose who deserves the long deals.</li>
      <li><b>Taxi players need no contract</b> and don’t use tokens (the 15-spot limit and 3-season rule already limit taxi).</li>
      <li><b>Rookie draft picks are free:</b> a ${ROOKIE_YEARS}-year rookie deal that uses no token. Their clock starts the day they’re called up from taxi.</li>
      <li><b>Why it works without money:</b> the cost of a player isn’t dollars, it’s a token you could have spent on someone else. Keep your star, and maybe you can’t keep your sixth man.</li>
    </ul>

    <h3 class="rp-h">How many tokens</h3>
    <ul class="rc-list">
      <li><b>Day one (once):</b> each team gets ${tok(LAUNCH)} contracts for its current roster. Everyone else starts on a 1-year deal. Our teams carry about ${avgCounted} players outside taxi, so roughly ${launchCount} get multi-year deals and the rest are up next summer.</li>
      <li><b>Every summer after that:</b> ${tok(SUMMER)} tokens (${summerCount} signings, ${summerYears} contract-years). They’re for re-signing your own players and signing free agents. <b>Use them or lose them</b>: unused tokens don’t carry over (keeps it simple and stops hoarding).</li>
      <li><b>Why these numbers:</b> ${summerYears} contract-years from tokens plus about ${ROOKIE_YEARS * 3} from three free rookie deals a year is roughly one full roster’s worth of seasons, so a well-run team can keep its core but not everyone. Fewer tokens = more players hit free agency every summer; more tokens = closer to the dynasty league we have now.</li>
      <li><b>Max length ${MAX_YEARS} years:</b> long enough to lock up a young star through his prime, short enough that every star eventually comes up for a decision. The 4-year token is the rarest on purpose (1 a summer): it’s the most powerful thing you own.</li>
      <li><b>Tokens can be traded</b> (optional): a rebuilding team could sell its 4-year token for a pick. Fun, and it gives tokens a market value.</li>
    </ul>

    <h3 class="rp-h">During the season</h3>
    <ul class="rc-list">
      <li><b>Waiver and free-agent adds:</b> Sleeper waivers and FAAB exactly as now. A player you add gets a free <b>rest-of-season</b> deal (no token). If you want to keep him, you re-sign him next summer with a token like anyone else.</li>
      <li><b>Drops:</b> you can cut anyone, any time. The token you used on him is simply gone (no refund), so cutting a 4-year signing after one season wastes the rest of that token. No dead money, no math.</li>
      <li><b>Trades:</b> the contract goes with the player (same years left). The new team doesn’t spend a token.</li>
      <li><b>No in-season extensions:</b> tokens are only used in the summer windows, so nobody has to watch the calendar during the season.</li>
    </ul>

    <h3 class="rp-h">The offseason, step by step</h3>
    <ol class="rc-list">
      <li><b>Right after the championship:</b> every contract loses a season. Anyone at 0 is now “expiring”.</li>
      <li><b>Token day:</b> each team receives its ${summerCount} summer tokens.</li>
      <li><b>Re-sign window (about 1-2 weeks):</b> keep any expiring player by putting a token on him (any length you have). Players you don’t re-sign are released by the commish on the deadline day, all at once.</li>
      <li><b>Free agency (about 1 week):</b> every released player goes into Sleeper’s waiver pool. Teams claim them with FAAB (fresh budget each season); the highest bid wins, as now. A free agent you win starts on a 1-year deal, or you can put one of your remaining tokens on him for a longer deal.</li>
      <li><b>Rookie draft:</b> picks get their free ${ROOKIE_YEARS}-year rookie deals (or go to taxi, clock stopped).</li>
      <li><b>Leftover tokens disappear</b> when the season starts. Normal waivers from then on.</li>
    </ol>
    <p class="cm-rule">Why the order matters: re-signing BEFORE free agency gives teams a fair shot to keep their own players first, and doing free agency BEFORE the rookie draft means everyone knows their roster needs when they pick.</p>

    <h3 class="rp-h">What year one would look like</h3>
    <div class="rc-scroll"><table class="rc-tbl"><thead><tr><th>Team</th><th class="n">Under contract</th><th class="n">Rookie deals (free)</th><th class="n">Taxi</th><th class="n">Need tokens</th><th class="n">Expiring after ${span(season)}</th><th class="n">To free agency (at least)</th></tr></thead>
      <tbody>${teams.map(teamRow).join('')}</tbody></table></div>
    <p class="cm-rule">“Expiring” = players on 1-year launch deals plus rookie deals that end. “To free agency” = expiring minus the ${summerCount} summer tokens (if every token went to re-signing; signing a free agent instead sends one more of your own players to the pool). That’s at least <b>${pool}</b> of ${expiringAll} expiring players hitting the open market in the first summer.</p>
    ${me && dyn ? `<p class="cm-rule"><b>Example (${tn(me.owner)}):</b> if the day-one deals went to the highest dynasty scores (only an illustration), the 4-year deals would go to ${me.assigned.filter(a => a.years === 4).map(a => esc(pname(a.pid))).join(' and ')}, the 3-year deals to ${me.assigned.filter(a => a.years === 3).map(a => esc(pname(a.pid))).join(', ')}, and ${me.oneYear} players would start on 1-year deals.</p>` : ''}

    <h3 class="rp-h">Would it work?</h3>
    <ul class="rc-list">
      <li><b>Yes, mostly.</b> It’s the simplest system of the three: no dollars, no cap math, one number per player. Everyone understands “I have one 4-year deal left”.</li>
      <li><b>It creates a real free agency every summer</b> with good players in it, which a straight dynasty league never has. That’s great for rebuilding teams and for keeping all 8 managers active.</li>
      <li><b>Biggest change: it’s no longer pure dynasty.</b> You can’t keep everyone forever; it plays more like a keeper league with long keepers. Teams built deep (lots of good players) lose the most, teams built on a few stars plus rookies lose the least.</li>
      <li><b>Rookies get even more valuable</b> (free 3-year deals, no token), which most leagues like.</li>
    </ul>

    <h3 class="rp-h">Why the offseason feels weird (and how to fix it)</h3>
    <ul class="rc-list">
      <li><b>Sleeper won’t do it for you.</b> It has no contracts or tokens, so on the re-sign deadline the commish has to drop every released player by hand (league-wide that could be ${pool}+ players). Fix: one fixed date, a posted list, and the site can track contracts and tokens and print the release list.</li>
      <li><b>A huge waiver run at once.</b> Dozens of players hit waivers on the same day. Fix: run free agency as one long waiver period (a full week) so everyone can bid calmly, with a fresh FAAB budget.</li>
      <li><b>Order and timing with the NBA.</b> Our offseason runs while NBA free agency changes teams and roles. Fix: re-sign window after the NBA draft and the first wave of NBA free agency (mid-July), so managers know who landed where.</li>
      <li><b>Day one is a big job.</b> Every team assigns ${launchCount} multi-year deals at once. Fix: a deadline before next season, with anyone not assigned defaulting to 1 year.</li>
      <li><b>Strong teams will be unhappy</b> losing depth they built for years. Fix: start it next season, announce it now, and consider a bigger day-one allotment so nobody loses a core player in year one.</li>
    </ul>`;
}
