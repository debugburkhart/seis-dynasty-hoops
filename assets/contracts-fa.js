// Contract Sandbox: FREE AGENCY AUCTION + CAP BOARD (owner, Nov 8 2026). Public slow auction on PRICE PER SEASON only; the
// winner then picks the length (1-4, must fit pool / 4-season limit / service). Leading bids hold cap room and a roster spot;
// an outbid frees them. Each player closes BID_HOURS after his last bid (soft close). Opening bid >= OPEN_SHARE of his tier
// price, raises of BID_STEP+. Bids are binding. The team that cut a player can't bid on him until his old deal would have ended.
//
// PRACTICE MODE (this file): the commish bids as any team ("Bid as"), and closes players by hand ("Close"), because nothing
// runs on a server; saved in synced settings gm-ct-auc = { y: { summer: { bids: { pid: [{ o, p, t }] }, closed: { pid: { o, p, t } } } } }.
// A closed player becomes an add in the winner's plan for that summer (id auc-{pid}, auction: true, len chosen here or in the
// planner), so the cap, pool and roster numbers everywhere include him. A later "real" mode would keep the same shapes in
// Firestore (bids public, writes by signed-in managers, clocks by timestamp).
import { betaCard } from './test-features.js';
import { BID_HOURS, BID_STEP, CAP, FLOOR, FOUR_YEAR_PER_SUMMER, MAX_YEARS, POOL, RESIGN_MAX, ROSTER_MAX, openingBid, priceFor, span } from './leaguecontracts.js';

const $ = n => `$${Number.isInteger(n) ? n : n.toFixed(1)}`;
const KEY = 'gm-ct-auc';
const FA_PAGE = 40;

const aucAll = ctx => ctx.gmLoad(KEY, { y: {} }) ?? { y: {} };
const aucOf = (ctx, y) => ({ bids: {}, closed: {}, ...(aucAll(ctx).y?.[y] ?? {}) });
const saveAuc = (ctx, y, a) => { const all = aucAll(ctx); ctx.gmSave(KEY, { at: Date.now(), y: { ...(all.y ?? {}), [y]: a } }); };
const high = (a, pid) => (a.bids[pid] ?? []).reduce((m, b) => (!m || b.p > m.p ? b : m), null);
const hoursLeft = b => (b ? Math.max(0, BID_HOURS - (Date.now() - b.t) / 36e5) : null);

// Every team's numbers for the summer: its plan (incl. players won here) + its leading bids.
export function capBoard(ctx, y) {
  const { L, chainFor } = ctx;
  const a = aucOf(ctx, y);
  return L.teams.map(t => {
    const P = chainFor(L, t, y).at(-1);
    const lead = Object.keys(a.bids).filter(pid => !a.closed[pid] && high(a, pid)?.o === t.owner).map(pid => ({ pid, p: high(a, pid).p }));
    const leading = lead.reduce((s, x) => s + x.p, 0);
    const signed = P.money[0];
    return {
      owner: t.owner, P, signed, leading, lead, room: CAP - signed - leading, roster: P.roster + lead.length,
      poolFree: POOL - P.pool, foursLeft: Math.max(0, FOUR_YEAR_PER_SUMMER - P.fours), resigns: P.resigns, under: signed < FLOOR,
    };
  });
}

// The players up for bids that summer: every team's expiring players its plan doesn't re-sign, its cuts, players at a
// service mark; plus (toggle) every unsigned NBA player. { pid, name, from, why, tier price }.
function freeAgents(ctx, y) {
  const { L, chainFor, info, all, file, season, guesses } = ctx;
  const g = guesses();
  const out = new Map();
  for (const t of L.teams) {
    const Q = chainFor(L, t, y).at(-1);
    for (const r of Q.expiring) if (!(r.choice > 0)) out.set(r.pid, { ...r, from: t.owner, why: r.svcOut ? 'svc' : r.choice === 0 ? 'released' : 'expiring', tier: (r.tierNext ?? r.next).price });
    for (const r of Q.carried) if (r.cut) out.set(r.pid, { ...r, from: t.owner, why: 'cut', tier: (r.next ?? priceFor(r.c, y, r.exp, season, g[r.pid] ?? null)).price });
  }
  if (ctx.S.faUnsigned) {
    for (const [pid, p] of Object.entries(info)) {
      if (p.owner || !all?.[pid]?.team || out.has(pid)) continue;
      const exp = all[pid].years_exp ?? null;
      out.set(pid, { pid, name: p.name, fpg: p.fpg, age: p.age, pos: p.pos, team: p.team, exp, c: file.players[pid] ?? null, from: null, why: 'unsigned', tier: priceFor(file.players[pid] ?? null, y, exp, season, g[pid] ?? null).price });
    }
  }
  return [...out.values()];
}

export function faView(ctx) {
  const { L, S, esc, tn, card2k, adv, name, teamName, cur } = ctx;
  const y = S.summer;
  const a = aucOf(ctx, y);
  const board = capBoard(ctx, y);
  const as = S.faAs && L.teams.some(t => t.owner === S.faAs) ? S.faAs : S.team;
  const me = board.find(b => b.owner === as);
  const q = (S.faQ ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  // Cap board.
  const boardHtml = `<div class="rc-scroll"><table class="rc-tbl fa-board"><thead><tr><th>Team</th><th class="n">Signed</th><th class="n">Leading bids</th><th class="n">Room</th><th class="n">Roster</th><th class="n">Pool free</th><th class="n">4-yr left</th><th class="n">Re-signed</th></tr></thead><tbody>
    ${[...board].sort((x, z) => z.room - x.room).map(b => `<tr class="${b.owner === as ? 'cx-me' : ''}"><td><b>${tn(b.owner)}</b>${b.under ? `<small class="cx-sub rc-over">Under the ${$(FLOOR)} floor by ${$(FLOOR - b.signed)}</small>` : ''}</td>
      <td class="n">${$(b.signed)}</td><td class="n">${b.leading ? `${$(b.leading)} <small>${b.lead.length} pl.</small>` : '—'}</td>
      <td class="n"><b class="${b.room < 0 ? 'rc-over' : 'rc-ok'}">${$(b.room)}</b></td><td class="n ${b.roster > ROSTER_MAX ? 'rc-over' : ''}">${b.roster} / ${ROSTER_MAX}</td>
      <td class="n">${b.poolFree}</td><td class="n">${b.foursLeft}</td><td class="n">${b.resigns} / ${RESIGN_MAX}</td></tr>`).join('')}
  </tbody></table></div>
  <p class="cm-rule">Signed = contracts for ${span(y)} after each team's summer plan (dead money included, players won here included). Room = ${$(CAP)} − signed − leading bids. Leading bids also hold a roster spot. Everyone sees this board.</p>`;

  // Free agents + bids.
  const list = freeAgents(ctx, y).filter(r => !a.closed[r.pid]).filter(r => !q || (r.name ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().includes(q))
    .map(r => ({ ...r, hb: high(a, r.pid) }))
    .sort((x, z) => (z.hb?.p ?? -1) - (x.hb?.p ?? -1) || (z.fpg ?? 0) - (x.fpg ?? 0));
  const shown = list.slice(0, S.faN ?? FA_PAGE);
  const banned = me.P.banned ?? {};
  const whyTxt = r => (r.why === 'svc' ? '2 contracts done: free agent' : r.why === 'cut' ? `Cut by ${esc(name(r.from))}` : r.why === 'released' ? `Released by ${esc(name(r.from))}` : r.why === 'expiring' ? `Not re-signed by ${esc(name(r.from))}` : 'Unsigned');
  const row = r => {
    const hb = r.hb;
    const min = hb ? hb.p + BID_STEP : openingBid(r.tier);
    const lead = hb?.o === as;
    const block = banned[r.pid] >= y ? `You cut him: no bids until after ${span(banned[r.pid])}` : lead ? 'You lead' : me.roster >= ROSTER_MAX ? 'Roster full' : min > me.room ? `Not enough room (${$(me.room)})` : '';
    const hl = hoursLeft(hb);
    return `<tr class="${lead ? 'fa-lead' : ''}"><td>${card2k(r.pid, r.name)} ${adv(r.pid)}<small class="cx-sub">${esc([r.pos, r.team, r.age != null ? `age ${r.age}` : ''].filter(Boolean).join(' · '))}${r.fpg != null ? ` · ${Number(r.fpg).toFixed(1)} FP/G` : ''}</small><small class="cx-sub">${whyTxt(r)} · tier ${$(r.tier)} · opens at ${$(openingBid(r.tier))}</small></td>
      <td class="n">${hb ? `<b>${$(hb.p)}</b><small class="cx-sub">${esc(name(hb.o))}${hl != null ? ` · closes in ~${Math.ceil(hl)}h` : ''}</small>` : '<small>No bids</small>'}</td>
      <td class="fa-bidcell">${block ? `<small class="${lead ? 'rc-ok' : 'rc-over'}">${block}</small>` : `<input type="number" min="${min}" step="1" value="${min}" data-fabid="${r.pid}" aria-label="Bid for ${esc(r.name)}"><button type="button" class="btn" data-fago="${r.pid}">Bid</button>`}
        ${hb ? `<button type="button" class="cx-x fa-close" data-faclose="${r.pid}" title="Close bidding: ${esc(name(hb.o))} wins at ${$(hb.p)}">Close</button>` : ''}
        ${(a.bids[r.pid] ?? []).length ? `<details class="fa-hist"><summary>${a.bids[r.pid].length} bid${a.bids[r.pid].length === 1 ? '' : 's'}</summary>${[...a.bids[r.pid]].reverse().map(b => `<small class="cx-sub">${$(b.p)} · ${esc(name(b.o))} · ${new Date(b.t).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</small>`).join('')}<button type="button" class="cx-x" data-faundo="${r.pid}">Undo last bid</button></details>` : ''}</td></tr>`;
  };
  const faHtml = `<div class="fa-ctl">
      <label class="cx-pick">Bid as <select data-faas>${L.teams.map(t => `<option value="${t.owner}"${t.owner === as ? ' selected' : ''}>${esc(teamName(t.owner, cur.season))} (${esc(name(t.owner))})</option>`).join('')}</select></label>
      <span class="fa-room">Room <b class="${me.room < 0 ? 'rc-over' : 'rc-ok'}">${$(me.room)}</b> · roster ${me.roster} / ${ROSTER_MAX}</span>
      <input type="search" placeholder="Search players" data-faq value="${esc(S.faQ ?? '')}">
      <label class="cx-cut"><input type="checkbox" data-faunsigned${S.faUnsigned ? ' checked' : ''}> Include every unsigned NBA player</label>
    </div>
    <div class="rc-scroll"><table class="rc-tbl fa-list"><thead><tr><th>Free agent</th><th class="n">High bid</th><th>Bid (price per season)</th></tr></thead><tbody>
      ${shown.map(row).join('') || '<tr><td colspan="3"><small>No free agents this summer yet: they come from every team\'s plan (expiring players not re-signed, cuts, service free agents).</small></td></tr>'}
    </tbody></table></div>
    ${list.length > shown.length ? `<div class="cx-btns"><button type="button" class="btn" data-famore>Show ${FA_PAGE} more (${list.length - shown.length} left)</button></div>` : ''}`;

  // Signed in this auction.
  const won = Object.entries(a.closed).map(([pid, w]) => {
    const add = ctx.planOf(w.o, y).adds.find(x => x.id === `auc-${pid}`);
    return { pid, ...w, len: add?.len ?? 1, name: info(ctx, pid) };
  }).sort((x, z) => z.p - x.p);
  const wonHtml = won.length ? `<div class="rc-scroll"><table class="rc-tbl"><thead><tr><th>Player</th><th>Winner</th><th class="n">Price</th><th class="n">Seasons</th><th></th></tr></thead><tbody>
    ${won.map(w => `<tr><td>${card2k(w.pid, w.name)}</td><td>${tn(w.o)}</td><td class="n"><b>${$(w.p)}</b></td>
      <td class="n"><select data-falen="${w.pid}">${Array.from({ length: MAX_YEARS }, (_, i) => i + 1).map(n => `<option value="${n}"${w.len === n ? ' selected' : ''}>${n}</option>`).join('')}</select></td>
      <td><button type="button" class="cx-x" data-fareopen="${w.pid}" title="Undo: reopen bidding">Reopen</button></td></tr>`).join('')}
  </tbody></table></div><p class="cm-rule">Each winner picks the length (1-${MAX_YEARS}); it must fit his years pool, the ${FOUR_YEAR_PER_SUMMER} four-season deals a summer and the player's service cycle (the planner warns). Won players are adds in the winner's summer ${y} plan.</p>` : '<p class="cm-rule">Nobody signed yet.</p>';

  return betaCard(`Cap board · summer ${y}`, boardHtml, { sub: `${$(CAP)} cap · ${$(FLOOR)} floor` })
    + betaCard(`Free agency auction · summer ${y}`, `<p class="cm-rule"><b>Practice mode:</b> bid as any team and close players by hand. Rules: bid a <b>price per season</b>; opening bid at least half his tier price, then +${$(BID_STEP)} or more; a player closes ${BID_HOURS} hours after his last bid; the leader wins and then picks the length. Leading bids hold cap room and a roster spot; an outbid frees them. Bids are binding.</p>${faHtml}`, { sub: `${list.length} free agents` })
    + betaCard('Signed in free agency', wonHtml, { sub: `${won.length} players` });
}
const info = (ctx, pid) => ctx.info[pid]?.name ?? pid;

// Clicks and changes on the free-agency view; returns true when handled (the page redraws).
export function faEvent(e, ctx) {
  const t = e.target;
  const { S } = ctx;
  const y = S.summer;
  const a = aucOf(ctx, y);
  const asOwner = S.faAs ?? S.team;
  if (e.type === 'change') {
    if (t.dataset.faas != null) { S.faAs = t.value; return true; }
    if (t.dataset.faq != null) { S.faQ = t.value; S.faN = FA_PAGE; return true; }
    if (t.dataset.faunsigned != null) { S.faUnsigned = t.checked; S.faN = FA_PAGE; return true; }
    if (t.dataset.falen) {
      const w = a.closed[t.dataset.falen];
      const p = ctx.planOf(w.o, y);
      p.adds = p.adds.map(x => (x.id === `auc-${t.dataset.falen}` ? { ...x, len: Number(t.value) } : x));
      ctx.savePlan(w.o, p, y);
      return true;
    }
    return false;
  }
  const b = t.closest('button');
  if (!b) return false;
  if (b.dataset.famore != null) { S.faN = (S.faN ?? FA_PAGE) + FA_PAGE; return true; }
  if (b.dataset.fago) {
    const pid = b.dataset.fago;
    const val = Number(ctx.page.querySelector(`[data-fabid="${pid}"]`)?.value);
    const board = capBoard(ctx, y).find(x => x.owner === asOwner);
    const hb = high(a, pid);
    const fa = freeAgents(ctx, y).find(r => r.pid === pid);
    const min = hb ? hb.p + BID_STEP : openingBid(fa?.tier ?? 1);
    if (!(val >= min)) { alert(`The bid must be at least $${min}.`); return false; }
    if (val > board.room) { alert(`${ctx.name(asOwner)} has only $${board.room} of room.`); return false; }
    a.bids[pid] = [...(a.bids[pid] ?? []), { o: asOwner, p: val, t: Date.now() }];
    saveAuc(ctx, y, a);
    return true;
  }
  if (b.dataset.faundo) { a.bids[b.dataset.faundo] = (a.bids[b.dataset.faundo] ?? []).slice(0, -1); saveAuc(ctx, y, a); return true; }
  if (b.dataset.faclose) {
    const pid = b.dataset.faclose;
    const hb = high(a, pid);
    if (!hb) return false;
    a.closed[pid] = { o: hb.o, p: hb.p, t: Date.now() };
    saveAuc(ctx, y, a);
    const p = ctx.planOf(hb.o, y);
    p.adds = [...p.adds.filter(x => x.id !== `auc-${pid}`), { id: `auc-${pid}`, pid, name: ctx.info[pid]?.name ?? pid, price: hb.p, len: 1, rookie: false, auction: true }];
    ctx.savePlan(hb.o, p, y);
    return true;
  }
  if (b.dataset.fareopen) {
    const pid = b.dataset.fareopen;
    const w = a.closed[pid];
    delete a.closed[pid];
    saveAuc(ctx, y, a);
    if (w) { const p = ctx.planOf(w.o, y); p.adds = p.adds.filter(x => x.id !== `auc-${pid}`); ctx.savePlan(w.o, p, y); }
    return true;
  }
  return false;
}
