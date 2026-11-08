// Contracts page (Test features, owner Nov 7 2026; logic in assets/leaguecontracts.js). app.js passes its helpers in:
// h = { DATA, esc, gmLoad, gmSave, COMMISH, teamName, name, loadContracts }. Four views (?view=):
//   status = every team's payroll / years pool + one team's 4-season contract outlook (with when his NBA deal ends),
//   plan   = offseason planner for the summer after day one (re-sign / release / cut / call up / add),
//   init   = day-one contracts: a length 1-4 for every player within the pool (the other views read these),
//   (planner also lists Upcoming free agents: other teams' expiring day-one deals not re-signed in their plans)
//   ww     = waiver wire: every free agent's cap hit if added (owner asked the same day).
//   block  = trade block: a team's players on the block + which teams can afford each contract (owner, Nov 7 2026).
// Saved (gmSave, synced via 'gm-ct-'): gm-ct-deals { at, d: { pid: { len, o (team that signed it), t } } } = contracts BY PLAYER
// (a traded player keeps his deal; older per-team gm-ct-init-{owner} saves are folded in once), gm-ct-plan-{owner} { at, re, cut, up,
// adds }, gm-ct-guess { pid: price } (prices for players whose next real deal isn't signed), gm-ct-block-{owner} [pid], gm-ct-view, gm-ct-team.

import { get } from './commish.js';
import { betaCard } from './test-features.js';
import { loadBreakdown } from './breakdown.js';
import { money } from './contracts.js';
import { howItWorks } from './contracts-how.js';
import { faEvent, faView } from './contracts-fa.js';
import { capTable, contractCard, resignBoard } from './contracts-2k.js';
import {
  CUT_SHARE, FOUR_YEAR_PER_SUMMER, FREE_CUT, GRID_SEASONS, LEAGUE_ROOKIE_YEARS, MAX_YEARS, NBA_TIERS, POOL, PRICE_STEPS, ROOKIE_TIER,
  START_SEASON, SUGGEST_AGE, SUGGEST_MIN_FPG, SUGGEST_SPARE, buildLeague, lengthBlock, nbaEnd, planSummer, priceFor, rookiePicks, span, suggestLengths, whoCanAfford, rollPlans, serviceMap, SERVICE_MAX, RESIGN_MAX, ROOKIE_SEASONS, CAP_GROWTH, tierScale, TAXI_YEARS, ROSTER_MAX, TAXI_MAX,
} from './leaguecontracts.js';

// Tab order (owner, Nov 7 2026): set day-one contracts first, then see where teams stand, trade, plan the summer, waivers.
const VIEWS = [['init', 'Initial contracts'], ['status', 'Team status'], ['block', 'Trade block'], ['plan', `Offseason planner (summer ${START_SEASON + 1})`], ['fa', 'Free agency auction'], ['ww', 'Waiver wire'], ['how', 'How it works']];
const $ = n => `$${Number.isInteger(n) ? n : n.toFixed(1)}`;
const f1 = x => (x == null ? '—' : (Math.round(x * 10) / 10).toFixed(1));
const chip = t => (t ? `<span class="rs-tier rs-t${t.sym.length}" title="${t.label}">${t.sym}</span>` : '');
const WW_PAGE = 50;

export async function renderContracts(body, params, h) {
  const { DATA, esc, gmLoad, gmSave, COMMISH, teamName, name } = h;
  body.innerHTML = betaCard('Contracts', '<p class="cm-rule">Reading rosters, real NBA contracts and this season’s stats…</p>');
  const cur = DATA.seasons.at(-1);
  const season = Number(cur.season);
  const [file, rosters, all, bk] = await Promise.all([
    h.loadContracts(), get(`/v1/league/${cur.leagueId}/rosters?t=${Date.now()}`, []), get('/v1/players/nba', {}),
    loadBreakdown(DATA, { list: 'league', withFa: true, season: cur.season }).catch(() => null),
  ]);
  if (!body.isConnected) return;
  if (!file?.players) {
    body.innerHTML = betaCard('Contracts', '<p class="empty">The NBA contract file (data/contracts.json) isn’t available yet: it’s built by the nightly update on Sundays.</p>');
    return;
  }
  const info = {};
  for (const p of bk?.players ?? []) info[p.pid] = { name: p.name, age: p.age, fpg: p.avg?.gp ? p.avg.fp : null, gp: p.tot?.gp ?? 0, team: p.team, pos: p.mainPos, owner: p.owner };
  const owners = (rosters ?? []).filter(r => r.owner_id).map(r => r.owner_id);
  // Each league season's rosters as they ended (current season = live) to find when each rookie pick left taxi.
  const hist = { [season]: rosters };
  await Promise.all(DATA.seasons.filter(x => Number(x.season) !== season && x.leagueId).map(x => get(`/v1/league/${x.leagueId}/rosters`, []).then(r => { hist[Number(x.season)] = r; })));
  // Taxi moves logged nightly (data/taxi-log.json): tells a trade off a taxi squad from a real call-up.
  const taxiLog = await fetch(`data/taxi-log.json?t=${Date.now()}`, { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).catch(() => null);
  const rookies = rookiePicks(DATA, hist, START_SEASON, { taxiLog, cur: season, all });
  // League service clock (owner, Nov 8 2026: from the 2023 startup; resets whenever he hits free agency). Taxi seasons and a
  // trade off a taxi squad don't count.
  const service = serviceMap(hist, season, new Set(Object.keys(rookies).filter(pid => rookies[pid].tradedTaxi)));
  const S = { view: params.get('view') || gmLoad('gm-ct-view', 'init'), team: params.get('team') || gmLoad('gm-ct-team', COMMISH), ww: { q: '', sort: 'fpg', n: WW_PAGE } };
  if (!VIEWS.some(([v]) => v === S.view)) S.view = 'init';
  if (!owners.includes(S.team)) S.team = owners.includes(COMMISH) ? COMMISH : owners[0];

  // Contracts by player. First visit after the change: fold the old per-team saves in (that team = the signer).
  const dealsNow = () => gmLoad('gm-ct-deals', null);
  if (!dealsNow()) {
    const d = {};
    for (const o of owners) for (const [pid, len] of Object.entries(gmLoad(`gm-ct-init-${o}`, { len: {} }).len ?? {})) d[pid] = { len: Number(len), o, t: Date.now() };
    gmSave('gm-ct-deals', { at: Date.now(), d });
  }
  const deals = () => dealsNow()?.d ?? {};
  const saveDeals = upd => gmSave('gm-ct-deals', { at: Date.now(), d: upd({ ...deals() }) });
  const guesses = () => gmLoad('gm-ct-guess', {});
  const league = () => buildLeague({ rosters, all, file, info, deals: deals(), guesses: guesses(), rookies, txs: DATA.transactions ?? [], service, cur: season });
  const tn = o => `${esc(teamName(o, cur.season))} <small>(${esc(name(o))})</small>`;
  const here = () => `#/mygm?tab=contracts&view=${S.view}&team=${S.team}`;
  const back = () => `&back=${encodeURIComponent(here())}&backl=${encodeURIComponent('Contracts')}`;
  // Names open the 2K-style contract card (owner, Nov 8 2026); the card links on to the 2K breakdown + Advanced stats.
  const card2k = (pid, label) => `<button type="button" class="cx-name" data-ccard="${pid}" title="Contract card">${esc(label)}</button>`;
  const k2 = () => ({ S, DATA, esc, name, teamName, cur, season, info, all, file, guesses, back, f1 });
  const adv = pid => `<a class="cx-adv" href="#/commish?tab=advanced&p=${pid}${back()}" title="Advanced stats">Adv</a>`;
  const who = r => `${esc([r.pos, r.team || 'no NBA team', r.age != null ? `age ${r.age}` : ''].filter(Boolean).join(' · '))}${r.fpg != null ? ` · ${f1(r.fpg)} FP/G` : ''}${r.slot === 'ir' ? ' · <b class="cx-ir">IR</b>' : r.slot === 'taxi' ? ' · taxi' : ''}${r.tradedTaxi ? ' · <b class="cx-trd" title="Traded off a taxi squad: Sleeper puts him on the active roster until his new team moves him, so he still counts as taxi (no call-up, no cap hit)">traded off taxi: still taxi</b>' : ''}${r.traded ? ` · <b class="cx-trd" title="His contract came with him in a trade">traded in</b> (signed by ${esc(name(r.signer))})` : ''}`;
  // NBA years + service (owner, Nov 8 2026: "note each player's NBA years so it's clear why they're at what they're at"):
  // service = his NBA seasons in cycles of 8 (every 8th season ends with free agency), on a roster or not.
  // Two contracts, then free agency (option B): his day-one deal is contract 2 of 2 when he has been on league rosters every
  // season since the 2023 startup, else contract 1 of 2 (taxi: no contract yet; free agents: their next signing = contract 1).
  const svcLine = r => (r.cn === 2 ? `Contract 2 of 2 on day one (on league rosters every season since the 2023 startup): free agency when it ends`
    : r.cn === 1 ? `Contract 1 of 2 on day one${r.kind === 'rookie' ? ' (his $1 rookie deal)' : ''}: one more contract after it, then free agency`
    : r.slot === 'taxi' ? 'Taxi: no contract yet (his $1 rookie deal will be contract 1 of 2)' : 'Free agent: his next signing is contract 1 of 2');
  const nbaCell = r => {
    if (!r.c?.seasons?.length) return '<small>No NBA deal</small>';
    if (r.c.waived?.length) return `<small>Waived (${esc(r.c.waived.join('/'))} pays)</small>`;
    return `${r.real ? money(r.real) : '—'}<small>ends ${span(r.nbaEnd)}</small>`;
  };
  const priceTxt = (price, est, why) => `<span${est ? ` class="cx-est" title="${esc(why || 'estimate: his real deal for that season isn’t signed yet')}"` : ''}>${est ? '~' : ''}${$(price)}</span>`;
  const bar = (val, cap, max) => `<div class="rc-bar"><span class="rc-a${val > cap ? ' cx-overbar' : ''}" style="width:${Math.min(100, (100 * val) / max)}%"></span><i class="rc-cap" style="left:${(100 * cap) / max}%" title="Cap ${$(cap)}"></i></div>`;
  const room = (val, cap) => `<span class="${val > cap ? 'rc-over' : 'rc-ok'}">${val > cap ? `${$(val - cap)} over` : `${$(cap - val)} room`}</span>`;

  // ---------------- page frame ----------------
  const page = document.createElement('div');
  page.className = 'cx-page mg-page';
  body.replaceChildren(page);
  const draw = () => {
    gmSave('gm-ct-view', S.view);
    gmSave('gm-ct-team', S.team);
    try { history.replaceState(null, '', here() + (params.get('back') ? `&back=${encodeURIComponent(params.get('back'))}&backl=${encodeURIComponent(params.get('backl') ?? '')}` : '')); } catch { /* fine */ }
    const L = league();
    const T = L.teams.find(t => t.owner === S.team) ?? L.teams[0];
    const head = `<div class="cx-head">
      <div class="dvp-seg" role="group">${VIEWS.map(([v, l]) => `<button type="button" class="ct-chip${S.view === v ? ' on' : ''}" data-view="${v}">${l}</button>`).join('')}</div>
      <label class="cx-pick">Team <select data-team>${L.teams.map(t => `<option value="${t.owner}"${t.owner === S.team ? ' selected' : ''}>${esc(teamName(t.owner, cur.season))} (${esc(name(t.owner))})</option>`).join('')}</select></label>
    </div>
    <div class="rp-stats cx-stats">
      <div><b>${$(L.cap)}</b><span>hard cap (fixed) · floor ${$(L.floor)} at the season start</span></div>
      <div><b>${POOL} yrs</b><span>contract-years per team · ${FOUR_YEAR_PER_SUMMER} new 4-season deals a summer</span></div>
      <div><b>${span(START_SEASON)}</b><span>day one: prices = tier of his real ${span(START_SEASON)} salary, locked for the deal</span></div>
    </div>`;
    const views = { status: viewStatus, block: viewBlock, plan: viewPlan, init: viewInit, ww: viewWaivers, how: Lx => howItWorks(Lx), fa: Lx => yearChips(S.summer) + faView(faCtx(Lx)) };
    page.innerHTML = betaCard('Contracts', head + '<p class="cm-rule">A sandbox for the proposed league contracts (Reports: “Salary system v2” + “years pool”). Taxi is exempt; active roster + IR count. Saved on this account (synced), nothing is official yet.</p>', { sub: `Real salaries ${esc(String(file.source?.read ?? file.at ?? '').slice(0, 10))}` }) + (S.card ? contractCard(k2(), L, S.card) : '') + views[S.view](L, T);
    if (S.view === 'ww') drawWaivers(L, T);
  };

  // ---------------- 1. Team status ----------------
  function viewStatus(L, T) {
    return capTable(k2(), L, T);
  }

  // ---------------- 3. Initial contracts ----------------
  function viewInit(L, T) {
    const deals = T.rows.filter(r => r.kind === 'deal');
    const rk = T.rows.filter(r => r.kind === 'rookie');
    const taxi = T.rows.filter(r => r.kind === 'taxi');
    const g = guesses();
    const lenBtns = r => `<div class="cx-len">${[1, 2, 3, 4].map(n => {
      const on = n === r.len;
      const why = on ? '' : lengthBlock(T, r, n);
      return `<button type="button" class="ct-chip${on ? ' on' : ''}" data-len="${n}" data-pid="${r.pid}"${why ? ` disabled title="${esc(why)}"` : ''}>${n}</button>`;
    }).join('')}</div>`;
    // League-wide service (8 seasons max): how many he has and the last season he can be under contract before free agency.
    const svcTxt = r => `<small class="cx-sub cx-svcline">${svcLine(r)}</small>`;
    const guessSel = r => (r.guessable ? `<select class="cx-guess" data-guess="${r.pid}" title="His real ${span(L.start)} deal isn’t signed yet: pick the price you expect"><option value="">est. ${$(priceFor(r.c, L.start, r.exp, season).price)}</option>${PRICE_STEPS.map(p => `<option value="${p}"${g[r.pid] === p ? ' selected' : ''}>${$(p)}</option>`).join('')}</select>` : '');
    const row = r => `<tr class="${r.slot}"><td>${card2k(r.pid, r.name)} ${adv(r.pid)}<small class="cx-sub">${who(r)}</small>${svcTxt(r)}</td><td class="n cx-nba">${nbaCell(r)}</td>
      <td class="n">${priceTxt(r.price, !r.known, r.why)} ${chip(r.tier)}${guessSel(r)}</td><td>${lenBtns(r)}${relBtn(r)}</td></tr>`;
    // 23 contracts at most on day one (owner, Nov 8 2026 = ROSTER_MAX; taxi exempt). Release = no contract: a free agent.
    const over = T.counted - ROSTER_MAX;
    const relBtn = r => `<button type="button" class="ct-chip cx-relbtn" data-rel="${r.pid}" title="No day-one contract: he becomes a free agent">Release</button>`;
    const offered = `<div class="cx-offer ${over > 0 ? 'over' : 'ok'}"><b>${T.counted} / ${ROSTER_MAX}</b> contracts offered${over > 0 ? ` · <b>release ${over} more</b> to get to ${ROSTER_MAX}` : T.counted === ROSTER_MAX ? ' · at the limit' : ` · ${ROSTER_MAX - T.counted} open`}${T.released.length ? ` · ${T.released.length} released` : ''}</div>`;
    const rel = T.released.length ? `<div class="rc-scroll"><table class="rc-tbl cx-init cx-rel"><thead><tr><th>Released (free agents)</th><th class="n">Tier ${span(L.start)}</th><th></th></tr></thead><tbody>
      ${T.released.map(r => `<tr><td>${card2k(r.pid, r.name)} ${adv(r.pid)}<small class="cx-sub">${who(r)}</small><small class="cx-sub">No day-one contract: free agent for ${span(L.start)} (any team can sign him; his next deal is contract 1 of 2)</small></td><td class="n">${priceTxt(r.grid[0].price, r.grid[0].est, r.grid[0].why)} ${chip(r.grid[0].tier)}</td>
        <td><button type="button" class="ct-chip" data-unrel="${r.pid}"${over >= 0 ? ` disabled title="Already ${T.counted} / ${ROSTER_MAX} contracts: release someone else first"` : ''}>Undo</button></td></tr>`).join('')}
    </tbody></table></div>` : '';
    return betaCard(`${tn(T.owner)} · day-one contracts`, `
      ${offered}
      <div class="cx-sum">
        <div><b>${T.pool}</b> / ${POOL} contract-years · <b>${POOL - T.pool}</b> free<div class="rc-bar"><span class="rc-a${T.pool > POOL ? ' cx-overbar' : ''}" style="width:${Math.min(100, (100 * T.pool) / POOL)}%"></span></div></div>
        <div><b>${T.fours}</b> / ${FOUR_YEAR_PER_SUMMER} four-season deals · payroll <b>${$(T.payroll)}</b> ${room(T.payroll, L.cap)} · roster <b class="${T.counted > ROSTER_MAX ? 'rc-over' : ''}">${T.counted} / ${ROSTER_MAX}</b></div>
      </div>
      <div class="cx-btns"><button type="button" class="btn" data-fill="one">Everyone 1 season</button><button type="button" class="btn" data-fill="suggest">Suggest (age + FP/G)</button></div>
      <p class="cm-rule">Pick a length (1-${MAX_YEARS} seasons) for every player; unassigned = 1 season. Lengths never change the price (his ${span(L.start)} tier, locked for the deal). Greyed buttons would break the ${POOL}-year pool or the ${FOUR_YEAR_PER_SUMMER} four-season deals. Suggest: best FP/G first, age ≤ ${SUGGEST_AGE[0][0]} = 4, ≤ ${SUGGEST_AGE[1][0]} = 3, ≤ ${SUGGEST_AGE[2][0]} = 2, older or under ${SUGGEST_MIN_FPG} FP/G = 1, within the pool (in-season waiver pickups don't count toward the cap or the pool, so all ${POOL} can go to day-one deals). Contracts belong to the <b>player</b>: if he’s traded in Sleeper, his length and price go with him (“traded in”), and the quick fills leave those alone.</p>
      <div class="rc-scroll"><table class="rc-tbl cx-init"><thead><tr><th>Player</th><th class="n">Real now</th><th class="n">Price ${span(L.start)}</th><th>Seasons</th></tr></thead><tbody>
        ${deals.map(row).join('')}
        ${rk.length ? `<tr class="cx-sep"><td colspan="4">League rookie deals (rookie draft picks and called-up taxi rookies; fixed: $1 from call-up through his ${ROOKIE_SEASONS}th NBA season)</td></tr>${rk.map(r => `<tr><td>${card2k(r.pid, r.name)} ${adv(r.pid)}<small class="cx-sub">${who(r)}</small></td><td class="n cx-nba">${nbaCell(r)}</td><td class="n">${$(1)} <span class="cx-r">R</span></td><td><small>${r.len} season${r.len === 1 ? '' : 's'} left</small>${relBtn(r)}</td></tr>`).join('')}` : ''}
      </tbody></table></div>
      ${rel}
      ${taxi.length ? `<details class="rp-more"><summary>Taxi squad: ${taxi.length} exempt (no contract until called up)</summary><p class="cm-rule">${taxi.map(r => `${card2k(r.pid, r.name)}`).join(' · ')}</p></details>` : ''}`, { sub: `${deals.filter(r => r.set).length} of ${deals.length} set` });
  }

  // ---------------- 2. Offseason planner ----------------
  // ---------------- Trade block ----------------
  // gm-ct-block-{owner} = [pid] per team (sandbox: you can put any team's players on its block).
  const blockOf = o => gmLoad(`gm-ct-block-${o}`, []);
  function viewBlock(L, T) {
    const mine = new Set(blockOf(T.owner));
    const contractTxt = r => (r.kind === 'taxi' ? 'Taxi: exempt, no contract' : `${priceTxt(r.price, !r.known, r.why)} ${r.kind === 'rookie' ? '<span class="cx-r">R</span>' : chip(r.tier)} × ${r.len} season${r.len === 1 ? '' : 's'} (through ${span(L.start + r.len - 1)})`);
    // The seller is still over the cap after sending him away: it can't take back any salary.
    // Money and years fit, but no roster (or taxi) spot: any player back, or a drop, makes room.
    const spotTxt = (x, r) => (r.kind === 'taxi' ? `<b class="rc-over">Taxi full</b> (${x.taxi} / ${TAXI_MAX}): send back or drop a taxi player` : `<b class="rc-over">Roster full</b> (${x.roster} / ${ROSTER_MAX}): send back any player or drop one`);
    const sellerStuck = (from, r) => { const s = L.teams.find(t => t.owner === from); return s.payroll - (r.kind === 'taxi' ? 0 : r.price) > L.cap; };
    const verdicts = (from, r) => {
      const v = whoCanAfford(L, from, r);
      const ok = v.filter(x => x.fits).length;
      return `<p class="cx-afford"><b class="${ok ? 'rc-ok' : 'rc-over'}">${ok} of ${v.length} teams can afford him</b> as is.</p>
      <div class="rc-scroll"><table class="rc-tbl cx-aff"><thead><tr><th>Team</th><th class="n">Cap room</th><th class="n">Years free</th><th class="n">Roster</th><th>Can they take him?</th></tr></thead><tbody>
        ${v.map(x => `<tr class="${x.fits ? 'cx-yes' : 'cx-no'}"><td>${tn(x.owner)}</td><td class="n ${x.room < 0 ? 'rc-over' : ''}">${x.room < 0 ? `−${$(-x.room)}` : $(x.room)}</td><td class="n">${x.years}</td><td class="n ${x.roster > ROSTER_MAX ? 'rc-over' : ''}">${x.roster} / ${ROSTER_MAX}</td>
          <td>${x.fits ? '<b class="rc-ok">Yes</b>' : !x.needMoney && !x.needYears ? spotTxt(x, r) : `<b class="rc-over">Only if they send back</b> ${[x.needMoney ? `${$(x.needMoney)}+` : '', x.needYears ? `${x.needYears}+ yrs` : ''].filter(Boolean).join(' and ')}${x.back ? `<small class="cx-sub">e.g. ${card2k(x.back.pid, x.back.name)} (${$(x.back.price)}, ${x.back.len} season${x.back.len === 1 ? '' : 's'})</small>` : `<small class="cx-sub">${sellerStuck(from, r) ? `${esc(teamName(from, cur.season))} is over the cap even after moving him, so it can’t take salary back` : 'no single player of theirs covers it and keeps both teams legal'}</small>`}`}</td></tr>`).join('')}
      </tbody></table></div>`;
    };
    const blocked = T.rows.filter(r => mine.has(r.pid));
    const yours = blocked.map(r => `<div class="cx-blk"><div class="cx-blkh"><div>${card2k(r.pid, r.name)} ${adv(r.pid)}<small class="cx-sub">${who(r)}</small></div><button type="button" class="ct-chip on" data-block="${r.pid}" title="Take him off the block">On the block ×</button></div>
      <div class="cx-blkc">Contract: ${contractTxt(r)}</div>${verdicts(T.owner, r)}</div>`).join('') || '<p class="cm-rule">Nobody on the block yet: add players below.</p>';
    const pick = `<div class="rc-scroll"><table class="rc-tbl"><thead><tr><th>Player</th><th class="n">Contract</th><th class="n">Teams that can afford</th><th></th></tr></thead><tbody>
      ${T.rows.map(r => { const n = whoCanAfford(L, T.owner, r).filter(x => x.fits).length; return `<tr class="${r.slot}"><td>${card2k(r.pid, r.name)}<small class="cx-sub">${who(r)}</small></td><td class="n">${r.kind === 'taxi' ? '<small>Taxi</small>' : `${$(r.price)} × ${r.len}`}</td><td class="n">${n} / ${L.teams.length - 1}</td>
        <td><button type="button" class="ct-chip${mine.has(r.pid) ? ' on' : ''}" data-block="${r.pid}">${mine.has(r.pid) ? 'On block' : '+ Block'}</button></td></tr>`; }).join('')}
    </tbody></table></div>`;
    // Other teams' blocks: can the picked team take each one on?
    const others = L.teams.filter(t => t.owner !== T.owner).flatMap(t => { const b = new Set(blockOf(t.owner)); return t.rows.filter(r => b.has(r.pid)).map(r => ({ t, r })); });
    const otherRows = others.map(({ t, r }) => {
      const me = whoCanAfford(L, t.owner, r).find(x => x.owner === T.owner);
      return `<tr><td>${card2k(r.pid, r.name)}<small class="cx-sub">${tn(t.owner)} · ${who(r)}</small></td><td class="n">${r.kind === 'taxi' ? '<small>Taxi</small>' : `${$(r.price)} × ${r.len}`}</td>
        <td>${me.fits ? '<b class="rc-ok">Yes</b>' : !me.needMoney && !me.needYears ? spotTxt(me, r) : `<b class="rc-over">Send back</b> ${[me.needMoney ? `${$(me.needMoney)}+` : '', me.needYears ? `${me.needYears}+ yrs` : ''].filter(Boolean).join(' and ')}${me.back ? `<small class="cx-sub">e.g. ${esc(me.back.name)} (${$(me.back.price)} × ${me.back.len})</small>` : ''}`}</td></tr>`;
    }).join('');
    return betaCard(`${tn(T.owner)} · trade block`, `
      <p class="cm-rule">A contract moves with the player in a trade (same price, same seasons left), and the team getting him must stay under the ${$(L.cap)} cap and inside its ${POOL}-year pool (day-one ${span(L.start)} numbers). “Send back” = salary and/or contract-years they’d have to return; the example is their cheapest single player that covers it and keeps ${esc(teamName(T.owner, cur.season))} legal too.</p>
      ${yours}`, { sub: `${blocked.length} on the block` })
      + betaCard('Add players to the block', pick, { sub: 'Tap + Block' })
      + betaCard(`Other teams’ blocks: can ${esc(teamName(T.owner, cur.season))} afford them?`, otherRows ? `<div class="rc-scroll"><table class="rc-tbl"><thead><tr><th>Player</th><th class="n">Contract</th><th>Fits?</th></tr></thead><tbody>${otherRows}</tbody></table></div>` : '<p class="cm-rule">No other team has anyone on its block. Pick another team above to set up its block (sandbox).</p>', { sub: `${others.length} players` });
  }

  // Plans per summer (owner, Nov 8 2026: "year selections for the next 4 years"): gm-ct-plan-{owner} = { at, y: { year: { re, cut,
  // up, adds } } }; an older one-summer save is read as summer START_SEASON + 1. Each summer is built on the ones before it.
  const SUMMERS = Array.from({ length: GRID_SEASONS }, (_, i) => START_SEASON + 1 + i);
  const yearChips = summer => `<div class="dvp-seg cx-years" role="group">${SUMMERS.map(y => `<button type="button" class="ct-chip${y === summer ? ' on' : ''}" data-summer="${y}">Summer ${y}<small>before ${span(y)}</small></button>`).join('')}</div>`;
  // Helpers handed to the free-agency auction (contracts-fa.js).
  const faCtx = L => ({ L, S, esc, tn, card2k, adv, name, teamName, cur, chainFor, planOf, savePlan, gmLoad, gmSave, info, all, file, season, guesses, page });
  S.summer = Number(params.get('summer')) || gmLoad('gm-ct-summer', SUMMERS[0]);
  if (!SUMMERS.includes(S.summer)) S.summer = SUMMERS[0];
  const plansOf = o => {
    const raw = gmLoad(`gm-ct-plan-${o}`, {}) ?? {};
    if (raw.y) return raw.y;
    const { at, ...p } = raw;
    return Object.keys(p).length ? { [SUMMERS[0]]: p } : {};
  };
  const planOf = (o, y = S.summer) => ({ re: {}, cut: [], up: [], adds: [], ...(plansOf(o)[y] ?? {}) });
  const savePlan = (o, p, y = S.summer) => gmSave(`gm-ct-plan-${o}`, { at: Date.now(), y: { ...plansOf(o), [y]: p } });
  const priceAtFn = () => { const g = guesses(); return (r, s) => (r.fake ? { price: r.price, tier: r.tier, known: false, why: 'made-up player: same price' } : priceFor(r.c, s, r.exp, season, g[r.pid] ?? null)); };
  // A roster row for a player added in a plan, so later summers can price and re-sign him.
  const mkRow = a => {
    const p = a.pid ? all?.[a.pid] ?? {} : {};
    return {
      pid: a.pid ?? `add-${a.id}`, name: a.name, c: a.pid ? file.players[a.pid] ?? null : null, exp: p.years_exp ?? null, kind: a.rookie ? 'rookie' : 'deal', slot: 'active',
      len: a.len, price: a.price, tier: NBA_TIERS.find(t => t.price === a.price) ?? ROOKIE_TIER, known: true, fpg: info[a.pid]?.fpg ?? null, age: info[a.pid]?.age ?? null,
      team: p.team ?? '', pos: p.position ?? '', fake: !a.pid, set: true, added: true,
    };
  };
  // Every summer from the first through `upTo` for one team (rollPlans in leaguecontracts.js).
  const chainFor = (L, team, upTo) => rollPlans(team, plansOf(team.owner), { cap: L.cap, floor: L.floor, cur: season, upTo, priceAt: priceAtFn(), mkRow });
  // Upcoming free agents (owner, Nov 7 2026): every OTHER team's players whose day-one deal ends before `summer` and that
  // its own plan doesn't re-sign (released, or not decided = released on the deadline), at their new tier price, with
  // whether the planned team could fit him (payroll after this plan + his price <= cap, pool + 1 season <= 50).
  S.faAll ??= false;
  function upcomingFas(L, T, P, summer) {
    const g = guesses();
    const priceAt = (r, s) => priceFor(r.c, s, r.exp, season, g[r.pid] ?? null);
    const inPlan = new Set(P.adds.map(a => a.pid).filter(Boolean));
    const list = L.teams.filter(t => t.owner !== T.owner).flatMap(t => {
      const Q = chainFor(L, t, summer).at(-1);
      // Plus players that team CUT this summer (dead money stays with it; any other team can sign them).
      return [...Q.expiring.filter(r => !(r.choice > 0)).map(r => ({ ...r, next: r.tierNext ?? r.next, from: t.owner, released: r.choice === 0 })),
        ...Q.carried.filter(r => r.cut).map(r => ({ ...r, from: t.owner, cutBy: true, next: priceAt(r, summer) }))];
    }).sort((a, b) => (b.fpg ?? 0) - (a.fpg ?? 0) || b.next.price - a.next.price);
    const room = L.cap - P.money[0];
    const free = POOL - P.pool;
    const shown = S.faAll ? list : list.slice(0, 30);
    const spot = P.roster < ROSTER_MAX;
    const fits = spot ? list.filter(r => r.next.price <= room && free >= 1).length : 0;
    const noLens = L.teams.filter(t => t.owner !== T.owner && !t.rows.some(r => r.set)).map(t => esc(name(t.owner)));
    return `<p class="cm-rule">${list.length} players on other teams have contracts ending this summer (after their earlier summers' plans) and aren’t re-signed in their team’s plan, so they’d hit free agency at their <b>${span(summer)}</b> tier. With this plan ${esc(teamName(T.owner, cur.season))} has <b>${room < 0 ? `no room (${$(-room)} over)` : `${$(room)} of cap room`}</b> and <b>${free}</b> pool years free: <b>${fits}</b> of them fit on a 1-season deal. “Add” puts him in this plan (1 season; change it below).${noLens.length ? ` <span class="rc-over">No day-one lengths set yet for ${noLens.join(", ")}: everyone on those teams counts as a 1-season deal, so their whole rosters show here.</span>` : ''}</p>
      <div class="rc-scroll"><table class="rc-tbl cx-ufa"><thead><tr><th>Player</th><th class="n">FP/G</th><th class="n">Price ${span(summer)}</th><th class="n">Fits?</th><th></th></tr></thead><tbody>
        ${shown.map(r => {
          const ok = r.next.price <= room && free >= 1 && spot;
          return `<tr><td>${card2k(r.pid, r.name)} ${adv(r.pid)}<small class="cx-sub">${tn(r.from)} · ${esc([r.pos, r.team, r.age != null ? `age ${r.age}` : ''].filter(Boolean).join(' · '))}</small><small class="cx-sub">${r.cutBy ? `<b class="rc-over">Cut by ${esc(name(r.from))}</b> (dead money stays with them)` : r.svcOut ? `<b class="rc-over">2 contracts done: must hit free agency</b>` : r.released ? '<b class="rc-over">Released in their plan</b>' : 'Not re-signed in their plan (yet)'} · now ${$(r.price)}</small></td>
            <td class="n">${f1(r.fpg)}</td><td class="n"><b>${priceTxt(r.next.price, !r.next.known, r.next.why)}</b> ${chip(r.next.tier)}</td><td class="n ${ok ? 'rc-ok' : 'rc-over'}">${ok ? 'Yes' : !spot ? 'Roster full' : free < 1 ? 'No years' : 'No room'}</td>
            <td>${inPlan.has(r.pid) ? '<small>In plan</small>' : `<button type="button" class="ct-chip" data-faadd="${r.pid}" data-price="${r.next.price}">Add</button>`}</td></tr>`;
        }).join('') || '<tr><td colspan="5"><small>Nobody: every other team’s day-one deals run past this summer or are re-signed.</small></td></tr>'}
      </tbody></table></div>
      ${list.length > 30 ? `<div class="cx-btns"><button type="button" class="btn" data-faall>${S.faAll ? 'Show top 30' : `Show all ${list.length}`}</button></div>` : ''}`;
  }

  function viewPlan(L, T) {
    const summer = S.summer;
    const chain = chainFor(L, T, summer);
    const P = chain.at(-1);
    const earlier = chain.slice(0, -1);
    // Year chips + what the earlier summers did.
    const chips = yearChips(summer);
    const builtOn = earlier.length ? `<p class="cx-d1line"><b>Built on your summer ${earlier.map(e => e.summer).join(' + ')} plan${earlier.length > 1 ? 's' : ''}:</b> ${earlier.map(e => `${e.summer}: ${e.expiring.filter(r => r.choice > 0).length} re-signed, ${e.expiring.filter(r => !(r.choice > 0)).length} released${e.undecided ? ` (${e.undecided} undecided = released)` : ''}, ${e.adds.length} added, ${e.taxi.filter(r => r.up).length} called up, ${e.carried.filter(r => r.cut).length} cut`).join(' · ')}. Change those on their own year tabs.</p>` : '';
    const deadIn = P.deadIn.length ? `<p class="cm-rule">Dead money from earlier cuts: ${P.deadIn.map(d => `${esc(d.name)} ${$(d.amt)} × ${d.left}`).join(' · ')}.</p>` : '';
    const maxM = Math.max(L.cap, ...P.money) * 1.08;
    // 8 seasons played = free agency, no select. Re-sign lengths stop at his 8th season; once 6 re-signings are used, more are
    // greyed out (players coming off a rookie deal never count).
    const full = P.resigns >= RESIGN_MAX;
    const sel = r => (r.svcOut ? `<b class="rc-over">2nd contract over: free agency</b><small class="cx-sub">Can't be re-signed; doesn't use a re-sign slot</small>` : `<select data-re="${r.pid}"><option value=""${r.choice == null ? ' selected' : ''}>— decide —</option>${[1, 2, 3, 4].filter(n => n <= r.maxLen).map(n => `<option value="${n}"${r.choice === n ? ' selected' : ''}${full && !(r.choice > 0) && r.kind !== 'rookie' ? ' disabled' : ''}>Re-sign ${n} season${n === 1 ? '' : 's'}</option>`).join('')}<option value="0"${r.choice === 0 ? ' selected' : ''}>Release</option></select>${r.cn === 1 ? '<small class="cx-sub">Contract 1 of 2 ends: a re-sign is his 2nd and last before free agency</small>' : ''}${r.kind === 'rookie' ? `<small class="cx-sub">Off his rookie deal: doesn’t count toward the ${RESIGN_MAX}</small>` : ''}`);
    const nameCell = r => `${card2k(r.pid, r.name)} ${adv(r.pid)}<small class="cx-sub">${who(r)}</small>`;
    // The day-one decision behind each row (owner, Nov 7 2026: "show the decisions of the initial contracts").
    const dayOne = r => dayOne0(r) + (r.cn ? `<span class="cx-d1">Contract ${r.cn} of 2${r.cn >= 2 ? ': free agency when it ends' : ''}</span>` : '');
    const dayOne0 = r => (r.added ? `<span class="cx-d1">Added summer ${r.signedIn}: ${r.signLen} season${r.signLen === 1 ? '' : 's'} · through ${span(r.signedIn + r.signLen - 1)}</span>` : r.signedIn ? `<span class="cx-d1">Re-signed summer ${r.signedIn}: ${r.signLen} season${r.signLen === 1 ? '' : 's'} · through ${span(r.signedIn + r.signLen - 1)} · price locked at ${$(r.price)}</span>` : r.calledUpIn ? `<span class="cx-d1">Called up summer ${r.calledUpIn}: ${r.kind === 'rookie' ? 'rookie deal' : 'deal'} through ${span(r.calledUpIn + r.signLen - 1)}</span>` : r.kind === 'rookie'
      ? `<span class="cx-d1">League rookie deal · ${r.len0 ?? r.len} season${(r.len0 ?? r.len) === 1 ? '' : 's'} left on day one · through ${span(L.start + (r.len0 ?? r.len) - 1)}</span>`
      : `<span class="cx-d1${r.set ? '' : ' unset'}">Day one: <b>${r.len0 ?? r.len} season${(r.len0 ?? r.len) === 1 ? '' : 's'}</b> ${r.set ? '' : '(not set = 1) '}· ${span(L.start)}${(r.len0 ?? r.len) > 1 ? ` – ${span(L.start + (r.len0 ?? r.len) - 1)}` : ' only'}</span>`);
    const deals = T.rows.filter(r => r.kind === 'deal');
    const byLen = [4, 3, 2, 1].map(n => [n, deals.filter(r => r.len === n).length]).filter(([, k]) => k);
    const unset = deals.filter(r => !r.set).length;
    const d1Line = earlier.length ? builtOn : `<p class="cx-d1line">Day-one contracts (from <a href="${here().replace(/view=\w+/, 'view=init')}">Initial contracts</a>): ${byLen.map(([n, k]) => `<b>${k}</b> × ${n} season${n === 1 ? '' : 's'}`).join(' · ')}${unset ? ` · <span class="rc-over">${unset} not set (= 1 season, so they expire here)</span>` : ''}. Players signed for 2+ seasons are still under contract this summer and can’t be re-signed; only 1-season deals expire.</p>`;
    const fa =Object.entries(info).filter(([pid]) => all?.[pid]?.team).map(([pid, p]) => `<option value="${esc(p.name)}">`).join('');
    const totals = `<div class="cx-sum cx-plansum">
        <div><b>${$(P.money[0])}</b> payroll ${span(summer)} · ${room(P.money[0], L.cap)}${bar(P.money[0], L.cap, maxM)}</div>
        <div><b>${P.pool}</b> / ${POOL} contract-years · 4-season deals this summer <b class="${P.fours > FOUR_YEAR_PER_SUMMER ? 'rc-over' : ''}">${P.fours} / ${FOUR_YEAR_PER_SUMMER}</b> · roster <b class="${P.roster > ROSTER_MAX ? 'rc-over' : ''}">${P.roster} / ${ROSTER_MAX}</b> · re-signed <b class="${P.resigns > RESIGN_MAX ? 'rc-over' : ''}">${P.resigns} / ${RESIGN_MAX}</b>${P.svcOut.length ? ` · ${P.svcOut.length} finished 2 contracts (free agents)` : ''}<div class="rc-bar"><span class="rc-a${P.pool > POOL ? ' cx-overbar' : ''}" style="width:${Math.min(100, (100 * P.pool) / POOL)}%"></span></div></div>
      </div>
      ${P.warn.length ? `<ul class="cx-warn">${P.warn.map(w => `<li>${esc(w)}</li>`).join('')}</ul>` : '<p class="cx-good">Under the cap, inside the pool and the 4-season limit.</p>'}
      <div class="rc-scroll"><table class="rc-tbl cx-money"><thead><tr><th>After this plan</th>${P.seasons.map(s => `<th class="n">${span(s)}</th>`).join('')}</tr></thead><tbody><tr><td>Committed</td>${P.money.map(m => `<td class="n"><b class="${m > L.cap ? 'rc-over' : ''}">${$(m)}</b></td>`).join('')}</tr></tbody></table></div>`;
    const exp = resignBoard(k2(), P, summer, sel, L);
    const car = `<div class="rc-scroll"><table class="rc-tbl"><thead><tr><th>Player · day-one deal</th><th class="n">Price (locked)</th><th class="n">Seasons left</th><th>Cut?</th></tr></thead><tbody>
      ${P.carried.map(r => `<tr class="${r.cut ? 'cx-gone' : ''}"><td>${nameCell(r)}${dayOne(r)}</td><td class="n">${$(r.price)} ${r.kind === 'rookie' ? '<span class="cx-r">R</span>' : chip(r.tier)}</td><td class="n">${r.left}</td><td><label class="cx-cut"><input type="checkbox" data-cut="${r.pid}"${r.cut ? ' checked' : ''}> ${r.free ? 'free' : `dead ${$(r.dead)} × ${r.left}`}</label></td></tr>`).join('') || '<tr><td colspan="4"><small>No contracts run into next season yet: set lengths on Initial contracts.</small></td></tr>'}
    </tbody></table></div>`;
    const tx = P.taxi.length ? `<div class="rc-scroll"><table class="rc-tbl"><thead><tr><th>Taxi player</th><th>Call up?</th></tr></thead><tbody>${P.taxi.map(r => `<tr class="${r.forced && !r.up ? 'cx-gone' : ''}"><td>${nameCell(r)}<small class="cx-sub">${r.forced ? `<b class="rc-over">Taxi time is up after ${span(r.taxiLast)} (his 3rd NBA season): call him up for ${span(summer)} or he's released</b>` : `Can stay on taxi through ${span(r.taxiLast)} (his 3rd NBA season)`}${r.pick ? '' : ' · not our draft pick: signs at his tier'}</small></td><td><label class="cx-cut"><input type="checkbox" data-up="${r.pid}"${r.up ? ' checked' : ''}> ${$(r.upPrice)} × ${r.upLen} season${r.upLen === 1 ? '' : 's'}</label></td></tr>`).join('')}</tbody></table></div>` : '<p class="cm-rule">No taxi players.</p>';
    const adds = `${P.adds.length ? `<div class="rc-scroll"><table class="rc-tbl"><thead><tr><th>Added</th><th class="n">Price</th><th class="n">Seasons</th><th></th></tr></thead><tbody>${P.adds.map(a => `<tr><td><b>${a.pid ? card2k(a.pid, a.name) : esc(a.name)}</b><small class="cx-sub">${a.rookie ? 'rookie draft pick' : 'free agent'}</small>${a.banned ? `<small class="cx-sub rc-over">You cut him: can't sign him until after ${span(a.banned)}. Not counted.</small>` : ''}</td><td class="n">${$(a.price)}</td><td class="n">${a.rookie ? a.len : `<select data-addlen="${a.id}">${[1, 2, 3, 4].map(n => `<option value="${n}"${a.len === n ? ' selected' : ''}>${n}</option>`).join('')}</select>`}</td><td><button type="button" class="cx-x" data-rmadd="${a.id}" aria-label="Remove">×</button></td></tr>`).join('')}</tbody></table></div>` : ''}
      <div class="cx-addform">
        <input type="text" list="cx-players" placeholder="Player name (any NBA player or a made-up one)" data-add="name" maxlength="40">
        <datalist id="cx-players">${fa}</datalist>
        <select data-add="price" title="Price (filled in for real players)"><option value="">Price: his tier</option>${PRICE_STEPS.map(p => `<option value="${p}">${$(p)}</option>`).join('')}</select>
        <select data-add="len">${[1, 2, 3, 4].map(n => `<option value="${n}">${n} season${n === 1 ? '' : 's'}</option>`).join('')}</select>
        <label class="cx-cut"><input type="checkbox" data-add="rookie"> Rookie pick ($1 × ${ROOKIE_SEASONS}: his NBA rookie years)</label>
        <button type="button" class="btn" data-addgo>Add</button>
      </div>`;
    return betaCard(`${tn(T.owner)} · summer ${summer}`, `
      ${chips}
      <p class="cx-when"><b>Which summer:</b> summer ${summer}, after the ${span(summer - 1)} season and before ${span(summer)}: ${summer - L.start === 1 ? 'one year' : `${summer - L.start} years`} after the day-one contracts start (${span(L.start)}), not this coming summer. Prices use each player's real NBA contract for that season (tier cutoffs grown ${Math.round(CAP_GROWTH * 100)}% a year); taxi clocks and contract lengths roll forward.</p>
      <p class="cm-rule">Every contract loses a season. Players at 0 are expiring: re-sign them at their <b>new tier</b> (his real ${span(summer)} salary) for 1-${MAX_YEARS} seasons, or release them to free agency. Contracts still running keep their locked price; cutting one costs ${Math.round(CUT_SHARE * 100)}% of his price for every season left (free at ${$(FREE_CUT)} or less) and his years stay used until next summer. <b>A cut ends his contract</b>: only the dead money is left, and it stays with the team that cut him. Nobody inherits his old seasons: picked up during the season he's a free pickup (no cap hit, no pool years) and that summer his new team can re-sign him at his tier or let him go; still unsigned at season's end, he's a free agent any other team can sign to a new deal at his tier. The team that cut him can't sign him again until his old deal would have ended (the very next summer if it was his last season). In season, re-adding a player you cut restores his old contract and cancels the dead money.</p>
      ${d1Line}${deadIn}${totals}`, { sub: 'Saved on this account', cls: 'cx-plantop' })
      + betaCard(earlier.length ? 'Still under contract' : 'Still under contract (day-one deals running)', car, { sub: `${P.carried.length} players` })
      + betaCard('Contract extensions: re-sign or release', exp, { sub: `${P.expiring.length} players` })
      + betaCard('Taxi call-ups', tx)
      + betaCard(`Upcoming free agents · summer ${summer} (before ${span(summer)})`, upcomingFas(L, T, P, summer), { sub: 'Other teams’ expiring deals' })
      + betaCard('Add free agents and rookies', adds +'<p class="cm-rule">Free agency = the public auction (Free agency auction tab): price per season, the winner picks the length and needs cap room, pool years and a roster spot. Adds here are for planning. Real players get their own tier price unless you pick one.</p><div class="cx-btns"><button type="button" class="btn" data-planreset>Reset this plan</button></div>');
  }

  // ---------------- 4. Waiver wire ----------------
  function viewWaivers(L, T) {
    return betaCard('Waiver wire: in-season pickups', `
      <p class="cm-rule">Every free agent with an NBA team. An <b>in-season pickup costs nothing</b>: no cap hit and no pool years, only a roster spot (${tn(T.owner)}: ${T.counted} / ${ROSTER_MAX}). He's yours for the rest of the season; to keep him after it, re-sign him in the summer at his tier (“${span(L.start)} price”, real contract for that season), which counts toward the ${RESIGN_MAX} re-signings and uses pool years.</p>
      <div class="cx-wwctl"><input type="search" placeholder="Search players" data-wwq value="${esc(S.ww.q)}">
        <div class="dvp-seg" role="group">${[['fpg', 'FP/G'], ['hit', 'Re-sign price'], ['salary', 'Real salary'], ['age', 'Age']].map(([k, l]) => `<button type="button" class="ct-chip${S.ww.sort === k ? ' on' : ''}" data-wwsort="${k}">${l}</button>`).join('')}</div></div>
      <div id="cx-wwlist"></div>`, { sub: 'Free agents today' });
  }
  function drawWaivers(L, T) {
    const box = page.querySelector('#cx-wwlist');
    if (!box) return;
    const g = guesses();
    const q = S.ww.q.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const rows = Object.entries(info).filter(([pid, p]) => !p.owner && all?.[pid]?.team).map(([pid, p]) => {
      const c = file.players[pid] ?? null;
      const exp = all?.[pid]?.years_exp ?? null;
      const now = priceFor(c, season, exp, season);
      const day1 = priceFor(c, L.start, exp, season, g[pid] ?? null);
      return { pid, ...p, c, exp, now, day1, real: c?.seasons?.find(x => Number(x.season) === season)?.salary ?? 0, nbaEnd: nbaEnd(c), slot: 'fa' };
    }).filter(r => !q || r.name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().includes(q));
    // FP/G: players with 3+ games first, so a one-game spike doesn't top the list.
    const key = { fpg: r => (r.gp >= 3 ? 0 : 1000) - (r.fpg ?? -1), hit: r => -r.day1.price, salary: r => -r.real, age: r => r.age ?? 99 }[S.ww.sort];
    rows.sort((a, b) => key(a) - key(b) || (b.fpg ?? 0) - (a.fpg ?? 0));
    const shown = rows.slice(0, S.ww.n);
    box.innerHTML = `<div class="rc-scroll"><table class="rc-tbl cx-ww"><thead><tr><th>Player</th><th class="n">FP/G</th><th class="n">Real now</th><th class="n">${span(L.start)} price</th><th class="n">Roster spot?</th></tr></thead><tbody>
      ${shown.map(r => {
        const ok = T.counted < ROSTER_MAX; // in-season pickups: no cap hit, no pool years (owner, Nov 8 2026)
        return `<tr><td>${card2k(r.pid, r.name)} ${adv(r.pid)}<small class="cx-sub">${esc([r.pos, r.team, r.age != null ? `age ${r.age}` : ''].filter(Boolean).join(' · '))}${r.gp ? ` · ${r.gp} GP` : ''}</small><small class="cx-sub cx-svcline">${svcLine(r)}</small></td>
          <td class="n">${f1(r.fpg)}</td><td class="n cx-nba">${nbaCell(r)}</td>
          <td class="n">${priceTxt(r.day1.price, !r.day1.known, r.day1.why)} ${chip(r.day1.tier)}</td><td class="n ${ok ? 'rc-ok' : 'rc-over'}">${ok ? 'Yes' : 'Drop first'}</td></tr>`;
      }).join('') || '<tr><td colspan="6"><small>No free agents match.</small></td></tr>'}
    </tbody></table></div>
    <p class="cm-rule">${rows.length} free agents${rows.length > shown.length ? ` · showing ${shown.length}` : ''}.</p>
    ${rows.length > shown.length ? `<div class="cx-btns"><button type="button" class="btn" data-wwmore>Show ${WW_PAGE} more</button></div>` : ''}`;
  }

  // ---------------- events ----------------
  const setLen = (owner, pid, n) => {
    saveDeals(d => ({ ...d, [pid]: { len: n, o: owner, t: Date.now() } }));
  };
  // A player this team cut can't be signed again until his old deal's last season is over.
  const banCheck = pid => {
    const Ln = league();
    const T = Ln.teams.find(x => x.owner === S.team);
    const until = chainFor(Ln, T, S.summer).at(-1).banned[pid];
    if (until >= S.summer) { alert(`You cut ${info[pid]?.name ?? 'him'}: he can't come back until after ${span(until)} (his old deal's last season). Other teams can sign him.`); return true; }
    return false;
  };
  page.addEventListener('click', e => {
    if (S.view === 'fa' && !e.target.closest('[data-summer], [data-view], [data-ccard], [data-ccard-close]') && faEvent(e, faCtx(league()))) { draw(); return; }
    const t = e.target.closest('button, tr[data-goteam]');
    if (!t || t.disabled) return;
    const L = () => league();
    if (t.dataset.ccard) { S.card = t.dataset.ccard; draw(); page.querySelector('.mg-card')?.closest('.tf-card')?.scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
    if (t.dataset.ccardClose != null) { S.card = null; draw(); return; }
    if (t.dataset.capseason) { S.capSeason = Number(t.dataset.capseason); draw(); return; }
    if (t.dataset.resel) { S.reSel = t.dataset.resel; draw(); return; }
    if (t.dataset.view) { S.view = t.dataset.view; draw(); window.scrollTo(0, 0); return; }
    if (t.dataset.goteam) { if (e.target.closest('a')) return; S.team = t.dataset.goteam; draw(); page.querySelectorAll('.tf-card')[2]?.scrollIntoView({ block: 'start' }); return; }
    if (t.dataset.summer) { S.summer = Number(t.dataset.summer); gmSave('gm-ct-summer', S.summer); S.faAll = false; draw(); return; }
    if (t.dataset.faall != null) { S.faAll = !S.faAll; draw(); return; }
    if (t.dataset.faadd) { const pid = t.dataset.faadd; if (banCheck(pid)) return; const p = planOf(S.team); p.adds = [...p.adds, { id: String(Date.now()), pid, name: info[pid]?.name ?? pid, price: Number(t.dataset.price), len: 1, rookie: false }]; savePlan(S.team, p); draw(); return; }
    if (t.dataset.block) { const b = blockOf(S.team); gmSave(`gm-ct-block-${S.team}`, b.includes(t.dataset.block) ? b.filter(x => x !== t.dataset.block) : [...b, t.dataset.block]); draw(); return; }
    if (t.dataset.len) { setLen(S.team, t.dataset.pid, Number(t.dataset.len)); draw(); return; }
    if (t.dataset.rel) { saveDeals(d => ({ ...d, [t.dataset.rel]: { rel: true, o: S.team, t: Date.now() } })); draw(); return; }
    if (t.dataset.unrel) { saveDeals(d => { const n = { ...d }; delete n[t.dataset.unrel]; return n; }); draw(); return; }
    if (t.dataset.fill) {
      const T = L().teams.find(x => x.owner === S.team);
      const had = T.rows.some(r => r.set);
      if (had && !confirm(t.dataset.fill === 'one' ? 'Set every player back to 1 season?' : 'Replace every length with the suggestion (age + FP/G)?')) return;
      // Only this team's own signings; contracts traded in from other teams stay as they are.
      const len = t.dataset.fill === 'one' ? Object.fromEntries(T.rows.filter(r => r.kind === 'deal' && !r.traded).map(r => [r.pid, 1])) : suggestLengths(T);
      saveDeals(d => { for (const [pid, n] of Object.entries(len)) d[pid] = { len: n, o: S.team, t: Date.now() }; return d; });
      draw();
      return;
    }
    if (t.dataset.wwsort) { S.ww.sort = t.dataset.wwsort; S.ww.n = WW_PAGE; page.querySelectorAll('[data-wwsort]').forEach(b => b.classList.toggle('on', b === t)); const Ln = L(); drawWaivers(Ln, Ln.teams.find(x => x.owner === S.team)); return; }
    if (t.dataset.wwmore != null) { S.ww.n += WW_PAGE; const Ln = L(); drawWaivers(Ln, Ln.teams.find(x => x.owner === S.team)); return; }
    if (t.dataset.rmadd) { const p = planOf(S.team); p.adds = p.adds.filter(a => a.id !== t.dataset.rmadd); savePlan(S.team, p); draw(); return; }
    if (t.dataset.planreset != null) { if (confirm(`Clear this team’s summer ${S.summer} plan? (Other summers stay.)`)) { savePlan(S.team, { re: {}, cut: [], up: [], adds: [] }); draw(); } return; }
    if (t.dataset.addgo != null) {
      const val = k => page.querySelector(`[data-add="${k}"]`);
      const nm = val('name').value.trim();
      if (!nm) { val('name').focus(); return; }
      const rookie = val('rookie').checked;
      const pid = Object.keys(info).find(k => info[k].name.toLowerCase() === nm.toLowerCase()) ?? null;
      if (pid && banCheck(pid)) return;
      let price = Number(val('price').value) || null;
      if (!price) price = pid ? priceFor(file.players[pid], S.summer, all?.[pid]?.years_exp ?? null, season, guesses()[pid] ?? null).price : 2;
      const p = planOf(S.team);
      p.adds = [...p.adds, { id: String(Date.now()), pid, name: pid ? info[pid].name : nm, price: rookie ? ROOKIE_TIER.price : price, len: rookie ? ROOKIE_SEASONS : Number(val('len').value), rookie }];
      savePlan(S.team, p);
      draw();
    }
  });
  page.addEventListener('change', e => {
    const t = e.target;
    if (S.view === 'fa' && !t.matches('[data-team]') && faEvent(e, faCtx(league()))) { draw(); return; }
    if (t.dataset.team != null) { S.team = t.value; draw(); return; }
    if (t.dataset.guess) { const g = guesses(); if (t.value) g[t.dataset.guess] = Number(t.value); else delete g[t.dataset.guess]; gmSave('gm-ct-guess', g); draw(); return; }
    const p = planOf(S.team);
    if (t.dataset.addlen) { p.adds = p.adds.map(a => (a.id === t.dataset.addlen ? { ...a, len: Number(t.value) } : a)); savePlan(S.team, p); draw(); return; }
    if (t.dataset.re) { if (t.value === '') delete p.re[t.dataset.re]; else p.re[t.dataset.re] = Number(t.value); savePlan(S.team, p); draw(); return; }
    if (t.dataset.cut) { p.cut = t.checked ? [...new Set([...p.cut, t.dataset.cut])] : p.cut.filter(x => x !== t.dataset.cut); savePlan(S.team, p); draw(); return; }
    if (t.dataset.up) { p.up = t.checked ? [...new Set([...p.up, t.dataset.up])] : p.up.filter(x => x !== t.dataset.up); savePlan(S.team, p); draw(); }
  });
  page.addEventListener('input', e => {
    if (e.target.dataset.wwq == null) return;
    S.ww.q = e.target.value;
    S.ww.n = WW_PAGE;
    const Ln = league();
    drawWaivers(Ln, Ln.teams.find(x => x.owner === S.team));
  });
  draw();
}
