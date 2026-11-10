// MyGM Contracts, 2K look (owner, Nov 8 2026: "it needs a makeover ... fit the 2K breakdown theme as everything in MyGM will look
// like that", from his NBA 2K MyLEAGUE screenshots): three screens, each built from one of them.
//   capTable()      = MyLEAGUE "Salary Cap Table" (Team status): team strip, big italic team name, a CAP ring and a POOL ring
//                     for any of the next 4 seasons (owner: "a similar circle design ... how much years in the year pool and salary
//                     in the salary cap are available ... the next 4 years ahead"), callouts, legend, cap hits by season.
//   resignBoard()   = "Contract Extensions" (Offseason planner, expiring players): hero card + status / expected table.
//   contractCard()  = "Roster Viewer" (tap any player name): contract panel + real NBA salary vs cap hit per season.
// No DOM; contracts-ui.js passes ctx = { S, DATA, esc, name, teamName, cur, season, info, all, file, guesses, back, f1 }.
// Styles: .mg-* at the end of styles.css (dark navy panels, gold numbers, like .bk on the 2K breakdown).
import { betaCard, mygmBase } from './test-features.js';
import { money } from './contracts.js';
import { playerPhoto } from './records.js';
import {
  CAP_GROWTH, CUT_SHARE, FOUR_YEAR_PER_SUMMER, FREE_CUT, NBA_TIERS, POOL, RESIGN_MAX, ROOKIE_SEASONS, ROSTER_MAX,
  nbaEnd, priceFor, span, tierScale,
} from './leaguecontracts.js';

const $ = n => `${n < 0 ? '−' : ''}$${Math.abs(Number.isInteger(n) ? n : Math.round(n * 10) / 10)}`;
const chip = t => (t ? `<span class="rs-tier rs-t${t.sym.length}" title="${t.label}">${t.sym}</span>` : '');
const short = n => { const p = String(n ?? '').trim().split(/\s+/); return p.length > 1 ? `${p[0][0]}. ${p.slice(1).join(' ')}` : p[0]; };
const split = n => { const p = String(n ?? '').trim().split(/\s+/); return [p.length > 1 ? p[0] : '', p.length > 1 ? p.slice(1).join(' ') : p[0]]; };

// A 2K-style ring: arc = used / max (gold; red when over), big number in the middle.
export function ring({ used, max, big, label, sub, over }) {
  const R = 46;
  const C = 2 * Math.PI * R;
  const f = Math.max(0, Math.min(1, max ? used / max : 0));
  return `<div class="mg-ring${over ? ' over' : ''}">
    <svg viewBox="0 0 110 110" aria-hidden="true"><circle cx="55" cy="55" r="${R}" class="mg-rtrack"/><circle cx="55" cy="55" r="${R}" class="mg-rarc${f > 0 ? '' : ' none'}" stroke-dasharray="${(f * C).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 55 55)"/></svg>
    <div class="mg-rin"><small>${label}</small><b>${big}</b></div>
    ${sub ? `<div class="mg-rsub">${sub}</div>` : ''}
  </div>`;
}

const nameBtn = (ctx, pid, n) => `<button type="button" class="mg-name" data-ccard="${pid}">${ctx.esc(short(n))}</button>`;

// ---------- 1. Cap table (Team status) ----------
export function capTable(ctx, L, T) {
  const { S, esc, name, teamName, cur, f1 } = ctx;
  const si = Math.max(0, Math.min(L.seasons.length - 1, Number(S.capSeason) || 0));
  const signed = T.rows.filter(r => r.kind !== 'taxi');
  const taxi = T.rows.filter(r => r.kind === 'taxi');
  // Per season (nothing new signed): money committed, pool years still out, players under contract.
  const per = L.seasons.map((s, i) => {
    const m = T.bySeason[i];
    const pool = signed.reduce((t, r) => t + Math.max(0, r.len - i), 0);
    return { s, m, room: L.cap - m, pool, free: POOL - pool, n: T.underBySeason[i] };
  });
  const P = per[si];
  const teams = `<div class="mg-teams">${L.teams.map(t => `<button type="button" class="mg-teamchip${t.owner === T.owner ? ' on' : ''}" data-goteam="${t.owner}">${esc(teamName(t.owner, cur.season))}</button>`).join('')}</div>`;
  const seasons = `<div class="mg-seasons">${per.map((x, i) => `<button type="button" class="mg-season${i === si ? ' on' : ''}" data-capseason="${i}"><b>${span(x.s)}</b><small>${$(x.room)} room · ${x.free} yrs free</small></button>`).join('')}</div>`;
  const rings = `<div class="mg-rings">
    ${ring({ used: P.m, max: L.cap, big: $(P.room), label: 'Cap room', sub: `${$(P.m)} of ${$(L.cap)} committed`, over: P.room < 0 })}
    ${ring({ used: P.pool, max: POOL, big: P.free, label: 'Pool years free', sub: `${P.pool} of ${POOL} out`, over: P.free < 0 })}
    <div class="mg-calls">
      <div><small>Team salary total</small><b>${$(P.m)}</b></div>
      <div><small>Under contract</small><b>${P.n}</b><em>${si ? `players still signed for ${span(P.s)}` : `roster ${T.counted} / ${ROSTER_MAX} + ${T.taxi} taxi`}</em></div>
      <div><small>4-season deals left</small><b>${Math.max(0, FOUR_YEAR_PER_SUMMER - T.fours)}</b><em>this summer</em></div>
    </div>
  </div>
  ${si ? `<p class="mg-note">${span(P.s)} as it stands today: only contracts already running that far. Re-signings and free agents come from the Offseason planner.</p>` : ''}`;
  const legend = `<div class="mg-legend"><span><i class="mg-dot ct"></i>Contract</span><span><i class="mg-dot rk"></i>Rookie deal</span><span><i class="mg-dot fa"></i>Free agent</span><span><i class="mg-dot svc"></i>2 contracts done</span><span><i class="mg-dot nba"></i>Real NBA deal over</span><span>~ estimate</span></div>`;
  const cell = (r, g, i) => {
    const on = i === si ? ' sel' : '';
    const nba = r.nbaEnd != null && g.s === r.nbaEnd + 1 ? ' mg-nba' : '';
    const t = nba ? ` title="His real NBA deal ends after ${span(r.nbaEnd)}: a new price is possible, only once his league deal ends"` : '';
    if (g.k === 'taxi') return `<td class="n mg-taxi${on}">Taxi</td>`;
    if (g.k === 'proj') return `<td class="n mg-rk${on}" title="Projected $1 rookie deal after call-up">$1</td>`;
    if (g.k === 'fa' && g.svc) return `<td class="n mg-svc${on}${nba}"${t}>FA<small>2 done</small></td>`;
    if (g.k === 'fa') return `<td class="n mg-fa${on}${nba}"${t}>FA<small>${g.est ? '~' : ''}${$(g.price)}</small></td>`;
    return `<td class="n ${g.k === 'rookie' ? 'mg-rk' : 'mg-ct'}${on}${nba}"${t}>${g.est ? '~' : ''}${$(g.price)}</td>`;
  };
  const row = r => `<tr class="${r.slot}"><td class="mg-nm">${nameBtn(ctx, r.pid, r.name)}<small>${esc([r.pos, r.team || 'FA', r.age != null ? r.age : ''].filter(Boolean).join(' · '))}${r.slot === 'ir' ? ' · <b class="mg-red">IR</b>' : ''}${r.traded ? ' · traded in' : ''}</small></td>
    <td class="n">${f1(r.fpg)}</td>${r.grid.map((g, i) => cell(r, g, i)).join('')}</tr>`;
  const table = `<div class="mg-scroll"><table class="mg-tbl mg-cap"><thead><tr><th>Name</th><th class="n">FP/G</th>${L.seasons.map((s, i) => `<th class="n${i === si ? ' sel' : ''}">${span(s)}</th>`).join('')}</tr></thead><tbody>
    ${signed.map(row).join('')}
    <tr class="mg-tot"><td>Committed</td><td></td>${per.map((x, i) => `<td class="n${i === si ? ' sel' : ''}"><b class="${x.room < 0 ? 'mg-red' : ''}">${$(x.m)}</b><small>${x.n} pl.</small></td>`).join('')}</tr>
    ${taxi.length ? `<tr class="mg-sep"><td colspan="${2 + L.seasons.length}">Taxi squad · no contract, no cap hit</td></tr>${taxi.map(row).join('')}` : ''}
  </tbody></table></div>`;
  const all = `<details class="mg-more"><summary>All 8 teams</summary><div class="mg-scroll"><table class="mg-tbl"><thead><tr><th>Team</th><th class="n">Salary</th><th class="n">Room</th><th class="n">Pool</th><th class="n">Roster</th></tr></thead><tbody>
    ${[...L.teams].sort((a, b) => b.payroll - a.payroll).map(t => `<tr data-goteam="${t.owner}" class="${t.owner === T.owner ? 'on' : ''}"><td>${esc(teamName(t.owner, cur.season))}<small>${esc(name(t.owner))}</small></td><td class="n">${$(t.payroll)}</td><td class="n ${t.payroll > L.cap ? 'mg-red' : 'mg-gold'}">${$(L.cap - t.payroll)}</td><td class="n">${t.pool} / ${POOL}</td><td class="n ${t.counted > ROSTER_MAX ? 'mg-red' : ''}">${t.counted} / ${ROSTER_MAX}</td></tr>`).join('')}
  </tbody></table></div></details>
  <details class="mg-more"><summary>Tier cutoffs by season (+${Math.round(CAP_GROWTH * 100)}% a year)</summary><div class="mg-scroll"><table class="mg-tbl"><thead><tr><th>Tier</th><th class="n">Price</th>${L.seasons.map(s => `<th class="n">${span(s)}</th>`).join('')}</tr></thead><tbody>
    ${NBA_TIERS.map(t => `<tr><td>${chip(t)} ${esc(t.label)}</td><td class="n mg-gold">${$(t.price)}</td>${L.seasons.map(s => `<td class="n">${t.min ? `${money(t.min * tierScale(s))}+` : 'any'}</td>`).join('')}</tr>`).join('')}
  </tbody></table></div></details>`;
  return betaCard('Salary cap table', `<div class="mg mg-pad">
    ${teams}
    <div class="mg-hd"><div><small>Current team · ${esc(name(T.owner))}</small><h3 class="mg-teamname">${esc(teamName(T.owner, cur.season))}</h3></div></div>
    ${seasons}${rings}${legend}${table}${all}
  </div>`, { sub: 'Tap a player for his contract card' });
}

// ---------- 2. Re-sign board (Offseason planner, expiring players) ----------
export function resignBoard(ctx, P, summer, sel, L) {
  const { S, DATA, esc } = ctx;
  const list = [...P.expiring].sort((a, b) => !!a.svcOut - !!b.svcOut); // players who can be re-signed first
  if (!list.length) return `<div class="mg mg-pad"><p class="mg-note">Nobody is expiring this summer: every contract runs past ${span(summer - 1)}.</p></div>`;
  const h = list.find(r => r.pid === S.reSel) ?? list[0];
  const status = r => (r.svcOut ? '<span class="mg-pill red">Ineligible</span>' : r.choice === 0 ? '<span class="mg-pill">Released</span>' : r.choice > 0 ? `<span class="mg-pill gold">Re-sign ${r.choice} yr${r.choice === 1 ? '' : 's'}</span>` : 'Undecided');
  const [first, last] = split(h.name);
  const hero = `<div class="mg-hero">
    <img class="mg-photo" src="${playerPhoto(DATA, h.pid)}" alt="" loading="lazy">
    <div class="mg-hname"><small>${esc([h.pos, h.team, h.age != null ? `age ${h.age}` : ''].filter(Boolean).join(' · '))}</small>
      <span>${esc(first)}</span><b>${esc(last)}</b>
      <em>Contract ${h.cn ?? 1} of 2 · price now ${$(h.price)} · ${h.kind === 'rookie' ? 'rookie deal ends' : 'deal ends'} ${span(summer - 1)}</em>
      <button type="button" class="mg-link" data-ccard="${h.pid}">Contract card</button></div>
    ${ring({ used: h.svcOut ? 0 : h.next.price, max: NBA_TIERS[0].price, big: h.svcOut ? 'FA' : $(h.next.price), label: h.svcOut ? 'Free agent' : 'Re-sign', sub: h.svcOut ? '2nd contract over' : h.next.kept ? 'keeps his FA price' : `${h.next.known ? '' : '~ '}${h.next.tier?.label ?? ''}` })}
  </div>`;
  const table = `<div class="mg-scroll"><table class="mg-tbl mg-re"><thead><tr><th>Name</th><th class="n">Age</th><th>Status</th><th class="n">Expected</th><th class="n">Contract</th><th>Decision</th></tr></thead><tbody>
    ${list.map(r => `<tr class="${r.pid === h.pid ? 'on' : ''}${r.choice === 0 ? ' gone' : ''}"><td class="mg-nm"><button type="button" class="mg-name" data-resel="${r.pid}">${esc(short(r.name))}</button><small>${esc([r.pos, r.team].filter(Boolean).join(' · '))}</small></td>
      <td class="n">${r.age ?? ''}</td><td>${status(r)}</td><td class="n mg-gold">${r.svcOut ? '—' : `${r.next.known ? '' : '~'}${$(r.next.price)}`}</td>
      <td class="n">${r.cn ?? 1} of 2</td><td>${r.svcOut ? '<small>Free agency (no re-sign slot used)</small>' : sel(r)}</td></tr>`).join('')}
  </tbody></table></div>`;
  const strip = `<div class="mg-strip"><span>Re-signed <b class="${P.resigns > RESIGN_MAX ? 'mg-red' : ''}">${P.resigns} / ${RESIGN_MAX}</b></span><span>Pool <b>${P.pool} / ${POOL}</b></span><span>Cap room <b class="${P.money[0] > L.cap ? 'mg-red' : ''}">${$(L.cap - P.money[0])}</b></span><span>Roster <b>${P.roster} / ${ROSTER_MAX}</b></span></div>`;
  return `<div class="mg mg-pad">${hero}${table}${strip}</div>`;
}

// ---------- 3. Contract card (any player) ----------
export function contractCard(ctx, L, pid) {
  const { DATA, esc, name, teamName, cur, season, info, all, file, guesses, back } = ctx;
  let row = null;
  let owner = null;
  for (const t of L.teams) { const r = t.rows.find(x => x.pid === pid); if (r) { row = r; owner = t.owner; break; } }
  const p = all?.[pid] ?? {};
  const c = row?.c ?? file?.players?.[pid] ?? null;
  const nm = row?.name ?? info[pid]?.name ?? [p.first_name, p.last_name].filter(Boolean).join(' ') ?? pid;
  const [first, last] = split(nm);
  const exp = row?.exp ?? p.years_exp ?? null;
  const fpg = row?.fpg ?? info[pid]?.fpg ?? null;
  const g = guesses();
  // Season rows: real NBA salary vs league cap hit (his grid when he's rostered, else his price if signed that season).
  const rows = L.seasons.map((s, i) => {
    const real = c?.seasons?.find(x => Number(x.season) === s)?.salary;
    const cell = row?.grid?.[i];
    let hit;
    if (!row) hit = `<span class="mg-fa">FA · ${$(priceFor(c, s, exp, season, g[pid] ?? null).price)}</span>`;
    else if (cell.k === 'taxi') hit = '<span class="mg-taxi">Taxi</span>';
    else if (cell.k === 'proj') hit = '<span class="mg-rk">$1 (call-up)</span>';
    else if (cell.k === 'fa') hit = `<span class="${cell.svc ? 'mg-svc' : 'mg-fa'}">${cell.svc ? 'Free agent' : `FA · ${cell.est ? '~' : ''}${$(cell.price)}`}</span>`;
    else hit = `<b class="${cell.k === 'rookie' ? 'mg-rk' : 'mg-gold'}">${cell.est ? '~' : ''}${$(cell.price)}</b>`;
    return `<tr><td>${span(s)}</td><td class="n">${p.birth_date ? Math.floor((Date.parse(`${s}-10-15`) - Date.parse(p.birth_date)) / 3.156e10) : ''}</td><td class="n">${real ? money(real) : '—'}</td><td class="n">${hit}</td></tr>`;
  }).join('');
  const end = nbaEnd(c);
  const kind = row?.kind;
  const box = !row ? 'Free agent' : kind === 'taxi' ? 'Taxi · no contract' : `Contract ${row.cn ?? 1} of 2`;
  const why = !row ? 'His next signing is contract 1 of 2.'
    : kind === 'taxi' ? `Nothing on the books until he's called up; then the $1 rookie deal runs through his ${ROOKIE_SEASONS}th NBA season.`
      : row.cn >= 2 ? 'His 2nd contract in a row: free agency when it ends (no re-sign).'
        : 'One more contract after this one, then free agency.';
  const dead = !row || kind === 'taxi' ? '—' : row.price <= FREE_CUT ? 'Free to cut' : `${$(Math.round(CUT_SHARE * row.price * 2) / 2)} a season left`;
  const signedTxt = !row ? '—' : kind === 'taxi' ? '—' : kind === 'rookie' ? `$1 rookie deal, ${row.len} season${row.len === 1 ? '' : 's'} left` : `Day one, ${row.len} season${row.len === 1 ? '' : 's'}${row.set ? '' : ' (not set)'}${row.traded ? ` · traded in (signed by ${esc(name(row.signer))})` : ''}`;
  const team = owner ? `${esc(teamName(owner, cur.season))} (${esc(name(owner))})` : 'Free agent';
  return betaCard('Contract card', `<div class="mg mg-pad mg-card">
    <div class="mg-chead">
      <img class="mg-photo" src="${playerPhoto(DATA, pid)}" alt="" loading="lazy">
      <div class="mg-hname">${p.number != null ? `<small class="mg-gold">#${esc(p.number)} · ${esc((p.fantasy_positions ?? [p.position]).filter(Boolean).join(' / '))}</small>` : ''}
        <span>${esc(first)}</span><b>${esc(last)}</b>
        <em>${esc([p.team ?? 'No NBA team', p.age ? `age ${p.age}` : '', exp != null ? `${exp + 1}${exp === 0 ? 'st' : exp === 1 ? 'nd' : exp === 2 ? 'rd' : 'th'} NBA season` : ''].filter(Boolean).join(' · '))} · ${team}</em></div>
      ${ring({ used: fpg ?? 0, max: 60, big: fpg != null ? (Math.round(fpg * 10) / 10).toFixed(1) : '—', label: 'FP/G' })}
    </div>
    <div class="mg-cbody">
      <div class="mg-paper">
        <div class="mg-box">${box}</div>
        <p>${why}</p>
        <dl>
          <dt>Tier</dt><dd>${row && kind !== 'taxi' ? `${chip(row.tier)} ${esc(row.tier?.label ?? '')}` : '—'}</dd>
          <dt>Signed</dt><dd>${signedTxt}</dd>
          <dt>Dead money if cut</dt><dd>${dead}</dd>
          <dt>Real NBA deal</dt><dd>${c?.seasons?.length ? (c.waived?.length ? 'Waived' : `ends ${span(end)}`) : 'none'}</dd>
        </dl>
        <div class="mg-links"><a href="${mygmBase()}?tab=rosters&list=league&p=${pid}${owner ? '' : '&fa=1'}${back()}">2K card</a><a href="#/commish?tab=advanced&p=${pid}${back()}">Advanced stats</a></div>
      </div>
      <div class="mg-scroll"><table class="mg-tbl"><thead><tr><th>Season</th><th class="n">Age</th><th class="n">Real NBA</th><th class="n">Cap hit</th></tr></thead><tbody>${rows}</tbody></table></div>
    </div>
    <button type="button" class="mg-close" data-ccard-close aria-label="Close the contract card">×</button>
  </div>`, { sub: esc(nm) });
}
