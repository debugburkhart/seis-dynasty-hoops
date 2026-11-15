// Report: one team's 3-season outlook (owner, Nov 13 2026: "I think I'm aging and am worried about the gap between the top 4
// teams and the bottom 4 teams. Are there obvious trade targets ... What if I did a soft rebuild ahead of the 2028 draft ...
// Keep current rules ... allow it to auto update"). Read fresh every time it's opened (live Sleeper rosters + the same dynasty
// values as the Dynasty tab), so it follows every trade, pickup and projection change. No DOM.
// h = { DATA, esc, name, teamName, COMMISH, dynasty } from app.js (dynasty = gmDynasty: { season, me, f, v }).

import { ageMult } from './dynasty.js';
import { tradeContext, offersFor, offersToSell, packageValue, positionStrength } from './tradefinder.js';

// ---- Settings (owner may tune) ----
const LINEUP = 9; // Sleeper's starting slots: PG, SG, G, SF, PF, F, C, UTIL, UTIL
const PLAYOFF_TEAMS = 6; // league playoffs: 6 teams, top 2 byes
const AGING = 28; // "aging" = 28 or older this season (the age curve turns down from 26-27)
const YOUNG = 25; // trade targets: 25 or younger
const PICK_AGE = 20; // a drafted rookie is valued as a 20-year-old (same as dynasty.js)
const TARGETS = 6; // trade targets shown
const SELL_MIN_SCORE = 8; // aging players worth trying to sell (dynasty score)
const SELL_COUNT = 4; // the soft-rebuild simulation sells this many of them
const REBUILD_AGE = 22; // rebuild returns: picks and players this age or younger

const r0 = x => Math.round(x);
const r1 = x => Math.round(x * 10) / 10;
const span = s => `${s}-${String((Number(s) + 1) % 100).padStart(2, '0')}`;
const ord = n => `${n}${n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'}`;
const sign = x => (x > 0 ? `+${x}` : `${x}`);

// A pick's per-game value in season k (0 = this season). dynasty.js stores v3 = value two seasons after the draft
// (rookie value x age curve at 20 and 21), so the rookie year = v3 / (am(20) x am(21)); a pick plays from its draft's season on.
function pickValueAt(p, k, season) {
  const first = Number(p.season) - Number(season); // 2027 draft -> plays in 2027-28 = k 1
  if (k < first) return 0;
  let v = p.v3 / (ageMult(PICK_AGE) * ageMult(PICK_AGE + 1));
  for (let y = 0; y < k - first; y++) v *= ageMult(PICK_AGE + y);
  return v;
}

// Strength of a roster in season k = its best 9 per-game projections (this season: taxi can't start; later seasons: taxi
// players can be called up, and rookie picks join from their draft's season). Same idea as the Dynasty tab's outlook.
function strength(players, picks, k, season) {
  const vals = players.filter(p => k > 0 || p.where !== 'taxi').map(p => p.v[k] ?? 0);
  for (const p of picks) vals.push(pickValueAt(p, k, season));
  return vals.sort((a, b) => b - a).slice(0, LINEUP).reduce((a, b) => a + b, 0);
}

function leagueTable(teams, season) {
  const seasons = [0, 1, 2].map(k => {
    const rows = teams.map(t => ({ owner: t.owner, s: strength(t.players, t.picks, k, season) }));
    const avg = rows.reduce((a, r) => a + r.s, 0) / (rows.length || 1);
    rows.sort((a, b) => b.s - a.s).forEach((r, i) => { r.rank = i + 1; r.idx = r0(100 * r.s / (avg || 1)); });
    const top = rows.slice(0, 4), bot = rows.slice(-4);
    const mean = l => l.reduce((a, r) => a + r.idx, 0) / (l.length || 1);
    return { k, rows, by: Object.fromEntries(rows.map(r => [r.owner, r])), gap: r1(mean(top) - mean(bot)), fourth: rows[3], sixth: rows[PLAYOFF_TEAMS - 1] };
  });
  return seasons;
}

export async function reportOutlook(h) {
  const { DATA, esc, name, teamName } = h;
  const { season, me, f, v } = await h.dynasty();
  const S = Number(season);
  const rosters = (f.rosters ?? []).filter(r => r.owner_id);
  const tn = o => `${esc(teamName(o, season))} <small>(${esc(name(o))})</small>`;
  const pl = pid => v.players[pid];
  const teamOf = r => ({
    owner: r.owner_id,
    players: [...new Set([...(r.players ?? []), ...(r.taxi ?? []), ...(r.reserve ?? [])])].map(pl).filter(Boolean),
    picks: v.picks.filter(p => p.owner === r.owner_id),
  });
  const teams = rosters.map(teamOf);
  const mine = teams.find(t => t.owner === me);
  if (!mine) return '<p class="cm-rule">Couldn’t read your roster from Sleeper. Try again in a minute.</p>';
  const T = leagueTable(teams, S);
  const myRank = k => T[k].by[me];

  // This season so far (head-to-head + median, like Sleeper's standings).
  const rec = {};
  for (const g of DATA.games ?? []) {
    if (g.s !== season || g.t !== 'R' || !g.win) continue;
    for (const [o, w] of [[g.a, g.win === 'a'], [g.b, g.win === 'b']]) { const x = (rec[o] ??= { w: 0, l: 0, pf: 0 }); x[w ? 'w' : 'l']++; x.pf += o === g.a ? g.ap : g.bp; }
  }
  for (const m of DATA.medianGames ?? []) { if (m.s !== season) continue; const x = (rec[m.o] ??= { w: 0, l: 0, pf: 0 }); if (m.res === 'W') x.w++; else if (m.res === 'L') x.l++; }
  const standing = Object.entries(rec).sort(([, a], [, b]) => (b.w / (b.w + b.l || 1)) - (a.w / (a.w + a.l || 1)) || b.pf - a.pf).map(([o]) => o);
  const myRec = rec[me];
  const recOf = list => list.reduce((a, o) => ({ w: a.w + (rec[o]?.w ?? 0), l: a.l + (rec[o]?.l ?? 0) }), { w: 0, l: 0 });
  const [topRec, botRec] = [recOf(standing.slice(0, 4)), recOf(standing.slice(-4))];
  const behind = (o, me2) => ((rec[o]?.w ?? 0) - (rec[me2]?.w ?? 0) + (rec[me2]?.l ?? 0) - (rec[o]?.l ?? 0)) / 2; // games behind
  const myPlace = standing.indexOf(me) + 1;
  const gb4 = myPlace > 4 && standing[3] ? behind(standing[3], me) : 0;
  const ahead7 = myPlace <= PLAYOFF_TEAMS && standing[PLAYOFF_TEAMS] ? behind(me, standing[PLAYOFF_TEAMS]) : null;
  const rosterNow = (rosters.find(r => r.owner_id === me)?.players ?? []).filter(pid => !(rosters.find(r => r.owner_id === me)?.taxi ?? []).includes(pid)).length;

  // Aging.
  const core = mine.players.filter(p => p.where !== 'taxi').sort((a, b) => b.v[0] - a.v[0]).slice(0, 12);
  const nowTop = core.slice(0, LINEUP);
  const oldShare = nowTop.filter(p => (p.age ?? 0) >= AGING).reduce((a, p) => a + p.v[0], 0) / (nowTop.reduce((a, p) => a + p.v[0], 0) || 1);
  const ages = Object.values(v.outlook).filter(o => o.age != null).sort((a, b) => b.age - a.age);
  const ageRank = ages.findIndex(o => o.owner === me) + 1;
  const drop = p => (p.v[0] ? r0((p.v[2] / p.v[0] - 1) * 100) : 0);
  const taxi = mine.players.filter(p => p.where === 'taxi').sort((a, b) => b.v[2] - a.v[2]);
  const psPct = when => Object.fromEntries(Object.entries(positionStrength(v, f.rosters, when).ratio[me] ?? {}).map(([g, x]) => [g, r0(x * 100)]));
  const [psNow, psLater] = [psPct('now'), psPct('later')];

  // Trade targets: young players (25 or under) who'd be in your best 9 now AND in 2028-29, offers built from your aging
  // players first (the Trade finder's trade-block boost).
  const c = tradeContext(DATA, v, f.rosters, me);
  const aging = mine.players.filter(p => (p.age ?? 0) >= AGING && p.where !== 'taxi' && p.score >= 1);
  const agingIds = aging.map(p => p.pid);
  const bar = k => mine.players.filter(p => k > 0 || p.where !== 'taxi').map(p => p.v[k]).sort((a, b) => b - a)[LINEUP - 1] ?? 0;
  const [bar0, bar2] = [bar(0), bar(2)];
  const targets = Object.entries(c.assets).filter(([o]) => o !== me).flatMap(([, list]) => list)
    .filter(a => a.kind === 'player' && (a.age ?? 99) <= YOUNG && pl(a.id) && pl(a.id).v[2] > bar2 + 1 && pl(a.id).v[0] >= bar0 - 2)
    .sort((a, b) => pl(b.id).v[2] - pl(a.id).v[2]);
  const targetOffers = [];
  for (const t of targets) {
    const offs = offersFor(c, t, { block: agingIds, limit: 3 });
    // Prefer the offer that sends the most of your aging players (that's the point), then the Trade finder's own order.
    const best = offs.sort((a, b) => b.give.filter(g => agingIds.includes(g.id)).length - a.give.filter(g => agingIds.includes(g.id)).length || b.rank - a.rank)[0];
    if (best) targetOffers.push(best);
    if (targetOffers.length >= TARGETS) break;
  }

  // Soft rebuild: sell aging players to win-now teams for young players and picks, from summer 2027 on.
  // Rebuild returns = picks and players REBUILD_AGE or younger only (prospects, not more veterans).
  const rebuildOk = o => o.get.every(a => a.kind === 'pick' || (a.age ?? 99) <= REBUILD_AGE);
  const youngGet = o => o.get.filter(a => a.kind === 'pick' || (a.age ?? 99) <= YOUNG).length / (o.get.length || 1);
  const laterGain = o => packageValue(o.get.map(a => a.view.later)) - packageValue(o.give.map(a => a.view.later));
  const sellRows = aging.filter(p => p.score >= SELL_MIN_SCORE).sort((a, b) => b.score - a.score).map(p => {
    const asset = c.assets[me].find(a => a.id === p.pid);
    const all = asset ? offersToSell(c, asset, { perTeam: 4 }) : [];
    const order = (a, b) => Number(rebuildOk(b)) - Number(rebuildOk(a)) || youngGet(b) - youngGet(a) || laterGain(b) - laterGain(a);
    const offers = [];
    for (const o of all.sort(order)) if (!offers.some(x => x.partner === o.partner)) { offers.push(o); if (offers.length >= 2) break; }
    return { p, offers, all: all.filter(rebuildOk).sort(order) };
  });
  // The plan: sell the SELL_COUNT aging players who lose the most by 2028-29 (per-game drop x value), each for a pick /
  // prospect return (no asset received twice, at most 2 deals per partner), applied to every roster involved; then
  // re-rank 2027-28 and 2028-29.
  const sim = teams.map(t => ({ owner: t.owner, players: [...t.players], picks: [...t.picks] }));
  const simOf = o => sim.find(t => t.owner === o);
  const used = new Set();
  const perPartner = {};
  const applied = [];
  const plan = sellRows.filter(r => r.all.length).sort((a, b) => (b.p.v[0] - b.p.v[2]) * b.p.score - (a.p.v[0] - a.p.v[2]) * a.p.score).slice(0, SELL_COUNT);
  for (const row of plan) {
    const o = row.all.find(x => x.get.every(a => !used.has(a.id)) && (perPartner[x.partner] ?? 0) < 2);
    if (!o) continue;
    perPartner[o.partner] = (perPartner[o.partner] ?? 0) + 1;
    o.get.forEach(a => used.add(a.id));
    const meT = simOf(me), them = simOf(o.partner);
    meT.players = meT.players.filter(p => p.pid !== row.p.pid);
    them.players.push(row.p);
    for (const a of o.get) {
      if (a.kind === 'player') { them.players = them.players.filter(p => p.pid !== a.id); if (pl(a.id)) meT.players.push(pl(a.id)); }
      else { const pk = them.picks.find(p => `pick-${p.season}-${p.round}-${p.orig}` === a.id); if (pk) { them.picks = them.picks.filter(p => p !== pk); meT.picks.push(pk); } }
    }
    applied.push({ p: row.p, o });
  }
  const T2 = leagueTable(sim, S);
  // 2028 draft order = reverse 2027-28 standings (projected here by strength); bottom 2 flip for No. 1.
  const slot28 = (table, orig) => { const r = table[1].by[orig]?.rank; return r ? teams.length + 1 - r : null; };
  const slotTxt = n => (n == null ? '?' : n <= 2 ? 'No. 1-2' : `No. ${n}`); // in-round slot; the bottom 2 flip for No. 1
  const myPicks28 = (tbl, list) => list.filter(p => p.season === String(S + 2)).sort((a, b) => a.round - b.round);
  const class28 = f.scout?.classes?.[String(S + 2)];

  // ---- HTML ----
  const trow = (tbl, k) => tbl[k].rows.map(r => `<tr${r.owner === me ? ' class="rc-rec"' : ''}><td class="n">${r.rank}</td><td>${tn(r.owner)}</td><td class="n"><b>${r.idx}</b></td><td class="n">${r1(r.s)}</td></tr>`).join('');
  const seasonCols = [0, 1, 2].map(k => `<th class="n">${span(S + k)}</th>`).join('');
  const rankCell = (tbl, k, o) => { const r = tbl[k].by[o]; return `<td class="n${r.rank <= 4 ? ' rc-ok' : r.rank > 6 ? ' rc-over' : ''}">${ord(r.rank)} <small>(${r.idx})</small></td>`; };
  const allRows = teams.map(t => t.owner).sort((a, b) => T[0].by[a].rank - T[0].by[b].rank)
    .map(o => `<tr${o === me ? ' class="rc-rec"' : ''}><td>${tn(o)}</td>${[0, 1, 2].map(k => rankCell(T, k, o)).join('')}<td class="n">${v.outlook[o]?.age ?? '–'}</td></tr>`).join('');
  const assetTxt = list => list.map(a => (a.kind === 'pick' ? esc(a.name) : `${esc(a.name)} <small>(${a.age ?? '?'}, ${a.score})</small>`)).join(' + ');
  const offerLine = o => `<li><b>${tn(o.partner)}</b> <small>${esc(o.lab ?? '')}</small><br>You give ${assetTxt(o.give)} · you get ${assetTxt(o.get)}<br><small>${o.why.slice(0, 3).map(esc).join(' ')}</small></li>`;
  const coreRow = p => `<tr><td>${esc(p.name)} <small>${esc(p.pos ?? '')}${p.where === 'ir' ? ' · IR' : ''}</small></td><td class="n">${p.age ?? '–'}</td><td class="n">${r1(p.v[0])}</td><td class="n">${r1(p.v[1])}</td><td class="n">${r1(p.v[2])}</td><td class="n ${drop(p) <= -5 ? 'rc-over' : drop(p) >= 5 ? 'rc-ok' : ''}">${sign(drop(p))}%</td><td class="n">${p.score}</td></tr>`;
  const gapLine = k => `${span(S + k)}: top 4 average ${r0(T[k].rows.slice(0, 4).reduce((a, r) => a + r.idx, 0) / 4)}, bottom 4 ${r0(T[k].rows.slice(-4).reduce((a, r) => a + r.idx, 0) / 4)} (gap <b>${T[k].gap}</b>)`;
  const toFourth = k => r1(T[k].fourth.s - myRank(k).s);
  const pctTxt = x => `${Math.round(x * 100)}%`;

  const stats = `
    <div class="rp-stats">
      <div><b>${ord(myRank(0).rank)} <small>→ ${ord(myRank(1).rank)} → ${ord(myRank(2).rank)}</small></b><span>your strength rank ${span(S)} → ${span(S + 1)} → ${span(S + 2)}</span></div>
      <div><b>${v.outlook[me]?.age ?? '–'}</b><span>value-weighted age (${ageRank === 1 ? 'oldest' : `${ord(ageRank)} oldest`} of ${ages.length})</span></div>
      <div><b>${pctTxt(oldShare)}</b><span>of your best 9 this season comes from players ${AGING}+</span></div>
    </div>`;

  return `${stats}
    <p class="cm-rule">Built from the same numbers as the Dynasty tab, read just now: every player’s projected fantasy points per game this season, next season and the one after (Sleeper’s projections, blended with this season’s games, aged on the league’s age curve), today’s Sleeper rosters and who owns which picks. <b>Strength</b> = a team’s best ${LINEUP} per-game projections (the starting lineup), shown as an index where the league average = 100. Current rules: ${LINEUP} starters, taxi players can’t start this season but count from next season (taxi time ends after a player’s 3rd NBA season), rookie picks join from their draft’s season, the rookie draft order is the reverse of the regular-season standings (win %, then points) with the bottom 2 flipping for No. 1, and the top ${PLAYOFF_TEAMS} make the playoffs. Free agents and future pickups aren’t projected. This report updates itself: it’s rebuilt every time you open it.</p>

    <h3 class="rp-h">Where you stand</h3>
    <ul class="rc-list">
      <li><b>This season so far:</b> ${myRec ? `${myRec.w}-${myRec.l} (head-to-head + median), ${ord(myPlace)} in the standings${gb4 ? `, ${gb4} game${gb4 === 1 ? '' : 's'} behind 4th` : ''}${ahead7 != null ? `, ${ahead7 > 0 ? `${ahead7} game${ahead7 === 1 ? '' : 's'} ahead of` : ahead7 < 0 ? `${-ahead7} behind` : 'level with'} ${ord(PLAYOFF_TEAMS + 1)} (the first team out of the playoffs)` : ''}` : 'no games yet'}. The standings already show the split: the top 4 are a combined <b>${topRec.w}-${topRec.l}</b>, the bottom 4 <b>${botRec.w}-${botRec.l}</b>. · <b>Projected strength ${ord(myRank(0).rank)}</b> of ${teams.length} (index ${myRank(0).idx}).</li>
      <li><b>Next two seasons:</b> ${ord(myRank(1).rank)} in ${span(S + 1)} (index ${myRank(1).idx}), ${ord(myRank(2).rank)} in ${span(S + 2)} (index ${myRank(2).idx}). The Dynasty tab calls you <b>${esc(v.outlook[me]?.label ?? '')}</b>.</li>
      <li><b>The top 4 / bottom 4 gap:</b> ${gapLine(0)}; ${gapLine(1)}; ${gapLine(2)}.</li>
      <li><b>To catch 4th place</b> you need about ${toFourth(0) > 0 ? `${toFourth(0)} more points a game from your best ${LINEUP} this season` : 'nothing: you’re already there this season'}${toFourth(2) > 0 ? `, and ${toFourth(2)} in ${span(S + 2)}` : ''}. One upgrade from a 25-point starter to a 40-point one is about 15.</li>
    </ul>

    <h3 class="rp-h">Every team, three seasons</h3>
    <div class="rc-scroll"><table class="rc-tbl"><thead><tr><th>Team</th>${seasonCols}<th class="n">Age</th></tr></thead><tbody>${allRows}</tbody></table></div>
    <p class="cm-rule">Rank (strength index). Green = top 4, red = 7th-8th. Age = value-weighted age of the roster.</p>

    <h3 class="rp-h">Your roster as it ages</h3>
    <div class="rc-scroll"><table class="rc-tbl"><thead><tr><th>Player</th><th class="n">Age</th>${seasonCols}<th class="n">Change</th><th class="n">Dyn</th></tr></thead><tbody>${core.map(coreRow).join('')}</tbody></table></div>
    <p class="cm-rule">Your top 12 outside taxi by this season’s points per game; the columns are projected points per game. Position strength vs the league (100 = average): guards ${psNow.G ?? '–'} now → ${psLater.G ?? '–'} in 2 years, forwards ${psNow.F ?? '–'} → ${psLater.F ?? '–'}, centers ${psNow.C ?? '–'} → ${psLater.C ?? '–'}.</p>
    ${taxi.length ? `<ul class="rc-list"><li><b>Taxi pipeline (${taxi.length}):</b> ${taxi.slice(0, 6).map(p => `${esc(p.name)} <small>(${p.age ?? '?'}, ${r1(p.v[2])} a game in ${span(S + 2)}${p.prospect ? `, prospect ${esc(p.prospect.grade)}` : ''})</small>`).join(', ')}${taxi.length > 6 ? ` and ${taxi.length - 6} more` : ''}. ${taxi[0] && taxi[0].v[2] > bar2 ? `${esc(taxi[0].name)} projects into your best ${LINEUP} by ${span(S + 2)}.` : `None of them projects into your best ${LINEUP} by ${span(S + 2)} yet.`}</li></ul>` : ''}

    <h3 class="rp-h">Trade targets: get younger without falling off</h3>
    ${targetOffers.length ? `<p class="cm-rule">Players ${YOUNG} or younger on other teams who’d be in your best ${LINEUP} this season (${r1(bar0)}+ a game now) and still in ${span(S + 2)} (${r1(bar2)}+). Offers are fair on the Trade finder’s numbers and built from your ${AGING}+ players first; the other team wouldn’t lose value on its own timeline.</p>
    <ul class="rc-list">${targetOffers.map(o => { const t = pl(o.get[0].id); return `<li><b>${esc(t.name)}</b> <small>(${t.age}, ${esc(t.pos ?? '')}, ${r1(t.v[0])} → ${r1(t.v[2])} a game, dyn ${t.score})</small> on ${tn(o.partner)}<br>You give ${assetTxt(o.give)}<br><small>${o.why.slice(0, 3).map(esc).join(' ')}</small></li>`; }).join('')}</ul>` : `<p class="cm-rule">No young player who’d start for you now and in ${span(S + 2)} has a fair offer built from your players today. Open the Trade finder for more ways (fill a need, sell a player).</p>`}

    <h3 class="rp-h">A soft rebuild ahead of the ${S + 2} draft</h3>
    <ul class="rc-list">
      <li><b>How the timing works:</b> the ${S + 2} rookie draft comes after the ${span(S + 1)} season and is ordered by that season’s standings, worst first (the bottom 2 flip for No. 1). So a soft rebuild means: <b>compete this season</b> (you’re ${ord(myRank(0).rank)} in strength, top ${PLAYOFF_TEAMS} make the playoffs), then <b>sell your aging players in summer ${S + 1}</b> or by the ${span(S + 1)} trade deadline, while they still hold value, and take young players and ${S + 2} picks back.</li>
      <li><b>Your ${S + 2} picks today:</b> ${myPicks28(T, mine.picks).map(p => `${esc(p.label)}${p.orig !== me ? ` from ${tn(p.orig)}` : ''} <small>(projected ${slotTxt(slot28(T, p.orig))} on ${span(S + 1)} strength)</small>`).join(', ') || 'none'}.</li>
      ${class28 ? `<li><b>The ${S + 2} class</b> is still in high school (class of ${class28.hsClass}), so it’s early: ${class28.prospects.slice(0, 5).map(p => `${esc(p.name)} <small>(${esc(p.pos ?? '')}, ${esc(p.grade ?? '')}, ${Math.round((p.chances?.starter ?? 0) * 100)}% starter)</small>`).join(', ')}. Draft Scout updates these weekly.</li>` : ''}
    </ul>
    ${sellRows.length ? `<p class="cm-rule">Your players ${AGING}+ worth ${SELL_MIN_SCORE}+ on the dynasty scale, each with the best fair returns built from young players (${YOUNG} or under) and picks. Win-now teams value this season more, so they pay most. Many returns are 2-3 players for 1: you’re at ${rosterNow} / 23 outside taxi today, so each extra player means a drop (or a taxi-eligible rookie going to taxi).</p>
    <ul class="rc-list">${sellRows.map(r => `<li><b>${esc(r.p.name)}</b> <small>(${r.p.age}, ${r1(r.p.v[0])} → ${r1(r.p.v[2])} a game, dyn ${r.p.score})</small>${r.offers.length ? `<ul>${r.offers.map(offerLine).join('')}</ul>` : '<br><small>No fair return built from young players or picks today.</small>'}</li>`).join('')}</ul>` : `<p class="cm-rule">You have no players ${AGING}+ worth ${SELL_MIN_SCORE}+ to sell.</p>`}
    ${applied.length ? `<h3 class="rp-h">If you sold your ${applied.length} biggest decliners from summer ${S + 1}</h3>
    <ul class="rc-list">
      <li><b>Sold</b> <small>(up to ${SELL_COUNT} of the aging players who lose the most value by ${span(S + 2)}, each for picks and players ${REBUILD_AGE} or younger only; a player is skipped when his only such returns were already used)</small>: ${applied.map(a => `${esc(a.p.name)} → ${esc(name(a.o.partner))} for ${assetTxt(a.o.get)}`).join('; ')}.</li>
      <li><b>${span(S + 1)}:</b> ${ord(myRank(1).rank)} → <b>${ord(T2[1].by[me].rank)}</b> in strength (index ${myRank(1).idx} → ${T2[1].by[me].idx}), so your own ${S + 2} 1st projects to <b>${slotTxt(slot28(T2, me))}</b> (was ${slotTxt(slot28(T, me))}).${T2[1].by[me].rank <= myRank(1).rank ? ` <b>The sales don’t make you worse that season:</b> the young players coming back already produce about as much as the veterans going out, so a soft rebuild alone won’t sink your own pick. To really drop, you’d also have to take back picks and teenagers only, or sit healthy veterans.` : ''}</li>
      <li><b>${span(S + 2)}:</b> ${ord(myRank(2).rank)} → <b>${ord(T2[2].by[me].rank)}</b> (index ${myRank(2).idx} → ${T2[2].by[me].idx}), before whoever you draft in ${S + 2} (only an average rookie for each pick is counted).</li>
      <li><b>Top 4 / bottom 4 gap after:</b> ${span(S + 1)} ${T[1].gap} → ${T2[1].gap}; ${span(S + 2)} ${T[2].gap} → ${T2[2].gap} (${T2[2].gap > T[2].gap ? 'wider: the teams you sell to get stronger' : T2[2].gap < T[2].gap ? 'narrower' : 'no change'}).</li>
      <li><b>Roster spots:</b> ${(() => { const n = applied.reduce((a, x) => a + x.o.get.filter(g => g.kind === 'player').length - 1, 0); return n > 0 ? `${n} more player${n === 1 ? '' : 's'} than you send out; you’re at ${rosterNow} / 23 outside taxi today, so that many drops (or young players onto taxi).` : 'no extra players.'; })()}</li>
    </ul>
    <p class="cm-rule">A rough picture, not a plan to follow move by move: one return per player at today’s values, no other moves by anyone, and projected strength stands in for the ${span(S + 1)} standings. This season’s strength is left as is (the sales start after it).</p>` : ''}

    <h3 class="rp-h">What it means</h3>
    <ul class="rc-list">
      <li><b>Stay the course:</b> ${myRank(1).rank <= 4 ? `you stay a top-4 team next season on these numbers, so keep competing and only move players who are about to lose value.` : `you’re projected ${ord(myRank(1).rank)} next season and ${ord(myRank(2).rank)} the season after, outside the top 4, and the gap gets ${T[2].gap > T[0].gap ? 'bigger' : 'smaller'} (${T[0].gap} → ${T[2].gap}).`}</li>
      <li><b>Retool:</b> the trade targets above swap aging players for younger ones of similar value now, which keeps this season and helps ${span(S + 2)}.</li>
      <li><b>Soft rebuild:</b> ${applied.length ? `selling your ${applied.length} biggest decliners from summer ${S + 1} takes you from ${ord(myRank(2).rank)} to ${ord(T2[2].by[me].rank)} in ${span(S + 2)} and puts your own ${S + 2} 1st around ${slotTxt(slot28(T2, me))}.` : 'nothing to sell for picks and prospects on today’s values.'}${myPicks28(T, mine.picks).filter(p => p.orig !== me && p.round === 1).map(p => ` Your best ${S + 2} lottery ticket is the 1st you own from ${tn(p.orig)}: projected ${slotTxt(slot28(T, p.orig))}.`).join('')}</li>
    </ul>`;
}
