// "Sleeper Insider" page (Test features, owner Nov 8 2026; logic in assets/sleeperpriv.js). Reads Sleeper's private
// GraphQL API, READ-ONLY, with the owner's own token when he pastes one (this browser's localStorage only).
// app.js passes h = { DATA, esc, name, teamName, COMMISH, sleeper, savePick }. Cards: token, Sleeper's locks (no login needed),
// trade block (no login needed), Explore (any candidate query or his own read-only query, raw JSON back).

import { get } from './commish.js';
import { betaCard } from './test-features.js';
import { benchDates, lawFor, loadLockDocs, weekBoxes } from './locks.js';
import { loadLgs } from './breakdown.js';
import { CANDIDATES, cleanToken, compareWithPicks, forgetToken, getToken, gql, locksFromLegs, picksToSave, queryText, weekOddities, weekReport, readOnlyProblem, saveToken, tokenInfo, tradeBlock, unauthorized } from './sleeperpriv.js';

const SI = { week: null, q: 'locks', round: null, date: null, rosterId: 1, playerId: '', statuses: ['pending', 'proposed'], text: null, vars: null, result: null, busy: false, me: null, sendToken: null, full: false };
const MAX_SHOW = 60_000; // characters of JSON drawn before "Show all"
const dayLabel = ymd => (ymd ? new Date(`${ymd}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '?');
const when = ms => new Date(ms).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' });
const ctToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date());

export async function renderSleeperInsider(body, params, h) {
  const { DATA, esc } = h;
  const cur = DATA.seasons.at(-1);
  const season = cur.season;
  const state = await h.sleeper('/state/nba').catch(() => null);
  const liveWeek = state?.season_type === 'regular' ? Number(state.week) || 1 : (cur.weeksPlayed ?? 1);
  const maxWeek = Math.max(1, Math.min(liveWeek, (cur.playoffStart ?? 99) - 1));
  SI.week = Math.min(Math.max(1, Number(params.get('week')) || SI.week || maxWeek), maxWeek);
  SI.round ??= SI.week;
  SI.date ??= ctToday();
  if (params.get('q') && CANDIDATES.some(c => c.id === params.get('q'))) SI.q = params.get('q');
  SI.sendToken ??= !!(CANDIDATES.find(c => c.id === SI.q)?.auth && getToken());
  const ownerOf = Object.fromEntries(cur.teams.map(t => [t.rosterId, t.owner]));
  const team = rid => (ownerOf[rid] ? `${esc(h.teamName(ownerOf[rid], season))} <small>${esc(h.name(ownerOf[rid]))}</small>` : `Roster ${rid}`);

  body.innerHTML = `<div class="si-page">
    ${tokenCard(esc)}
    ${betaCard('Locks from Sleeper', '<p class="empty">Reading Sleeper…</p>', { id: 'si-locks', sub: 'no login needed' })}
    ${betaCard('Odd games this season', '<p class="empty">Scanning…</p>', { id: 'si-odd', sub: 'no login needed' })}
    ${betaCard('Trade block from Sleeper', '<p class="empty">Reading Sleeper…</p>', { id: 'si-block', sub: 'no login needed' })}
    ${betaCard('Explore Sleeper’s private API', exploreHtml(esc), { id: 'si-explore', sub: 'read-only' })}
  </div>`;
  bind(body, params, h);

  freshen();
  const players = await get('/v1/players/nba', {});
  const pname = pid => { const p = players[pid]; return p ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() : pid; };
  const x = { h, cur, season, maxWeek, liveWeek, state, team, pname };
  fillLocks(body.querySelector('#si-locks'), x).then(() => fillOdd(body.querySelector('#si-odd'), x));
  fillBlock(body.querySelector('#si-block'), { h, cur, team, pname });
}

// ---- token card ------------------------------------------------------------------------------------------------
function tokenCard(esc) {
  const t = getToken();
  const info = t ? tokenInfo(t) : null;
  const status = !t
    ? '<p class="si-st si-none"><b>No token saved.</b> The two cards below work without one; Explore\'s login-only queries need it.</p>'
    : `<p class="si-st ${info?.expired ? 'si-bad' : 'si-ok'}"><b>Token saved in this browser</b> (${t.length} characters)${info?.exp ? ` · ${info.expired ? 'EXPIRED' : 'expires'} ${esc(when(info.exp))} CT` : ' · not a JWT, expiry unknown'}${SI.me ? ` · signed in as <b>${esc(SI.me)}</b>` : ''}</p>`;
  return betaCard('Your Sleeper token', `
    ${status}
    <form class="si-tok" autocomplete="off">
      <input type="password" name="tok" placeholder="Paste your token here" autocomplete="off" spellcheck="false" aria-label="Sleeper token">
      <button class="btn" type="submit">Save</button>
      ${t ? '<button class="btn si-chk" type="button" data-act="check">Check token</button><button class="btn si-forget" type="button" data-act="forget">Forget token</button>' : ''}
    </form>
    <p class="si-msg" id="si-tokmsg"></p>
    <details class="si-how">
      <summary>How to get your token (desktop)</summary>
      <ol>
        <li>On a computer, sign in at <b>sleeper.com</b> yourself (Chrome or Edge) and open the league.</li>
        <li>Press <b>F12</b> (Mac: Cmd+Option+I) → <b>Network</b> tab → type <code>graphql</code> in the filter box → reload the page.</li>
        <li>Click any <code>graphql</code> row → <b>Headers</b> → <b>Request Headers</b> → copy the value of <code>authorization</code> (one long line, usually starts <code>eyJ</code>).</li>
        <li>Or: <b>Application</b> tab → <b>Local Storage</b> → <code>https://sleeper.com</code> → the <code>token</code> row (where sleeper.com saves it at sign-in).</li>
        <li>Paste it in the box above → <b>Save</b>. Close DevTools.</li>
      </ol>
      <p><b>Phone:</b> iPhone Safari has no DevTools, so get it on a computer. Each browser keeps its own copy (it is never synced); to use it on the phone you'd have to move it over yourself. Treat it like a password and delete any note you used.</p>
      <p><b>What it is:</b> the same key the Sleeper website uses for your account (full access, not a read-only key). This page only ever sends it to sleeper.com, only with read-only queries (anything with "mutation" is refused before it leaves the page), and keeps it in this browser's storage only: not in Firestore, not on GitHub. <b>Forget token</b> deletes it here. Signing out of sleeper.com may end it; if Explore says "Unauthorized", get a fresh one.</p>
      <p><b>Unofficial:</b> Sleeper doesn't document this API and can change or close it any time (likely against its terms). If it breaks, nothing else on the site is affected.</p>
    </details>`, { id: 'si-token', sub: 'this browser only' });
}

// ---- shared week loader ------------------------------------------------------------------------------------------
// Everything a week needs, read once per visit: Sleeper's locks (matchup_legs_raw, no login), box scores, schedule, the
// game-day watcher's bench records, and what the site saved (league.json playerWeeks = what Sleeper counted then).
let COMMON = null;
let LOADED_AT = 0;
// Re-read everything after 5 minutes (week chips re-render the page; within 5 min they reuse what was read).
const freshen = () => { if (Date.now() - LOADED_AT > 300_000) { COMMON = null; WEEKS.clear(); LOADED_AT = Date.now(); } };
const WEEKS = new Map();
const commonFor = (h, cur) => (COMMON ??= (async () => {
  const [league, schedule, lgs] = await Promise.all([
    h.sleeper(`/league/${cur.leagueId}`).catch(() => null),
    get(`/schedule/nba/regular/${cur.season}`, []),
    loadLgs().catch(() => null),
  ]);
  return { scoring: league?.scoring_settings ?? {}, schedule, lgs };
})());
const isDone = (x, w) => w < x.liveWeek || Number(x.state?.last_scored_leg) >= w;

function loadWeekRep(x, w) {
  const { h, cur, season } = x;
  if (!WEEKS.has(w)) {
    WEEKS.set(w, (async () => {
      const c = await commonFor(h, cur);
      const [res, boxes] = await Promise.all([
        gql(CANDIDATES[0].query, { leagueId: cur.leagueId, round: w }),
        weekBoxes(season, w, c.scoring),
      ]);
      const legs = res.data?.matchup_legs_raw;
      if (!Array.isArray(legs) || !boxes) return { error: res, boxes: !!boxes };
      const ownerOf = Object.fromEntries(cur.teams.map(t => [t.rosterId, t.owner]));
      const saved = {};
      for (const r of h.DATA.playerWeeks ?? []) if (String(r.s) === String(season) && Number(r.w) === w && r.t === 'R') saved[`${r.o}|${r.pid}`] = r.p;
      const done = isDone(x, w);
      const rep = weekReport({ legs, schedule: c.schedule, boxes, ownerOf, saved, done, benchOf: (pid, o) => benchDates(c.lgs, season, pid, o, w) });
      return { rep, boxes, ownerOf, done };
    })());
  }
  const p = WEEKS.get(w);
  p.then(v => { if (v.error) WEEKS.delete(w); });
  return p;
}

const pickWord = k => (k === 'last' ? 'not locked' : k === 'zero' ? 'benched' : `locked ${dayLabel(k)}`);
const pts = n => (Number.isInteger(n) ? n : n.toFixed(1));

// ---- locks card ------------------------------------------------------------------------------------------------
async function fillLocks(card, x) {
  const { h, cur, season, maxWeek, team, pname } = x;
  const { esc } = h;
  let area = card.querySelector('.si-area');
  if (!area) {
    area = document.createElement('div');
    area.className = 'si-area';
    card.querySelector('.empty')?.replaceWith(area);
  }
  const chips = Array.from({ length: maxWeek }, (_, i) => i + 1)
    .map(w => `<button type="button" class="ct-chip${w === SI.week ? ' on' : ''}" data-week="${w}">Week ${w}</button>`).join('');
  area.innerHTML = `<div class="ct-chips">${chips}</div><p class="empty">Reading week ${SI.week}…</p>`;
  const [wk, docs] = await Promise.all([loadWeekRep(x, SI.week), loadLockDocs().catch(() => [])]);
  if (wk.error) {
    const res = wk.error;
    area.innerHTML = `<div class="ct-chips">${chips}</div><p class="si-st si-bad">Sleeper didn’t answer (${esc(res.errors?.[0]?.message ?? (wk.boxes ? `HTTP ${res.status}` : 'box scores missing'))}). ${unauthorized(res) ? 'It now needs a login: paste your token and try Explore → Locks with the token.' : 'Try again in a minute, or check Explore.'}</p>`;
    return;
  }
  const { rep, boxes, ownerOf, done } = wk;
  const { locks } = rep;
  const law = lawFor(season, SI.week, { docs });
  const cmp = compareWithPicks(locks, law);
  const same = cmp.filter(r => r.same).length;
  const ptsOf = (pid, date) => boxes?.games?.[pid]?.find(g => g.date === date)?.p;
  const lockedN = Object.values(locks).reduce((n, t) => n + Object.keys(t.locks).length, 0);
  const startersN = Object.values(locks).reduce((n, t) => n + t.starters.length, 0);
  const byMatch = {};
  for (const t of Object.values(rep.teams)) (byMatch[t.matchup ?? `x${t.rid}`] ??= []).push(t);

  const rowHtml = r => {
    const pick = law[r.pid];
    const flag = pick && !cmp.find(c => c.pid === r.pid)?.same ? ` <span class="si-diff" title="Dev Dashboard pick: ${esc(pick.k === 'lock' ? `locked ${pick.d}` : pick.k)}">≠ pick</span>` : (pick ? ' <span class="si-same" title="Same as your Dev Dashboard pick">= pick</span>' : '');
    const at = r.g ? ` · ${esc(dayLabel(r.g.date))}${r.matchup ? ` · ${esc(r.matchup)}` : ''} · <b>${pts(r.p)}</b>` : '';
    const sat = r.benchGames.length ? ` <small class="si-sat">(${r.benchGames.length} bench game${r.benchGames.length > 1 ? 's' : ''} skipped)</small>` : '';
    let line;
    if (r.lock) line = r.lock.date ? `🔒${at || ` ${esc(dayLabel(r.lock.date))} · no box score`}` : '🔒 game not on the schedule';
    else if (r.final) line = `<i>not locked</i> → ${r.g ? `last game${at}` : 'no lineup game · <b>0</b>'}${sat}`;
    else line = `<i>not locked</i> → ${r.g ? `latest so far${at}` : 'no game yet'} <small class="si-sat">(${r.left} game${r.left > 1 ? 's' : ''} left)</small>${sat}`;
    const corr = r.note ? `<small class="si-corr">${r.note.kind === 'corr'
      ? `Stat correction: Sleeper counted ${pts(r.note.was)} then, box score now ${pts(r.note.now)}`
      : `Our records have ${pts(r.note.was)} = his ${esc(dayLabel(r.note.otherDate))} game, not this one: check it`}</small>` : '';
    return `<li class="${r.lock ? 'si-lk' : 'si-ul'}"><span class="si-pn">${esc(pname(r.pid))}</span><span class="si-lv">${line}${flag}</span>${corr}</li>`;
  };
  const totalHtml = t => {
    if (t.open) return `<p class="si-tot">So far ${pts(t.today)} <small>(${t.open} starter${t.open > 1 ? 's' : ''} still playing)</small></p>`;
    if (!done || t.official == null) return `<p class="si-tot">Total ${pts(t.today)}</p>`;
    // Finished week: the REPORTED total is Sleeper's final; box-score changes since are noted, never added in.
    const notes = [];
    const corr = t.rows.filter(r => r.note);
    if (corr.length) notes.push(`Box scores now add up to ${pts(t.today)}: ${corr.map(r => `${esc(pname(r.pid))} ${pts(r.note.was)} → ${pts(r.note.now)}`).join(', ')} (${corr.some(r => r.note.kind === 'corr') ? 'NBA stat corrections after the week; Sleeper keeps the score it counted' : 'records disagree on the game'}).`);
    if (t.unexplained != null && Math.abs(t.unexplained) >= 0.05) notes.push(`${t.unexplained > 0 ? '+' : ''}${pts(t.unexplained)} not explained by box scores: a bench game the watcher missed, or a lock read wrong. Check this team.`);
    const bad = t.unexplained != null && Math.abs(t.unexplained) >= 0.05;
    return `<p class="si-tot ${bad ? 'si-bad' : 'si-ok'}">Final ${pts(t.official)} <small>(Sleeper)</small>${!notes.length ? ' ✓' : ''}</p>${notes.map(n => `<p class="si-totnote">${n}</p>`).join('')}`;
  };
  const teamHtml = t => `<div class="si-team"><h4>${team(t.rid)} <span class="si-n">${Object.keys(t.locks).length} / ${t.rows.length} locked</span></h4><ul>${t.rows.map(rowHtml).join('')}</ul>${totalHtml(t)}${t.extras.length ? `<p class="cm-rule">Also in starters_games: ${t.extras.map(p => esc(pname(p))).join(', ')}</p>` : ''}</div>`;

  // Save as picks (owner, Nov 8 2026: the solver gets Sleeper's locks only through this button).
  const plan = picksToSave(locks, law, ownerOf, ptsOf, { done });
  const diffRows = plan.differ.map(r => `<li><span><b>${esc(pname(r.pid))}</b>: Sleeper ${r.sleeper ? `locked ${esc(dayLabel(r.sleeper))}` : 'not locked'}, your pick ${esc(pickWord(r.pick))}</span>${r.save
    ? `<button class="btn si-use" type="button" data-use="${esc(r.pid)}">Use Sleeper’s</button>`
    : '<small>week still live: Sleeper may show his lock later</small>'}</li>`).join('');
  const saveBox = `<div class="si-save">
      <h4>Save Sleeper’s locks as picks</h4>
      <p class="cm-rule">Saved picks are your Dev Dashboard picks (word of law): the Monday solve pins them, and the Assistant Coach, Briefing and Lock Report Card use them like any pick. Existing picks are never overwritten here. Needs the Google sign-in at the top of the office.</p>
      <p class="si-savest">${plan.add.length ? `<b>${plan.add.length}</b> locks Sleeper shows have no pick yet.` : 'Every lock Sleeper shows already has a pick.'} ${plan.same} picks already match.</p>
      <button class="btn" type="button" data-save="all"${plan.add.length ? '' : ' disabled'}>Save ${plan.add.length} as picks</button>
      ${diffRows ? `<p class="si-savest">Different from your picks (decide one at a time):</p><ul class="si-difflist">${diffRows}</ul>` : ''}
      <p class="si-msg" id="si-savemsg"></p>
    </div>`;
  area.innerHTML = `<div class="ct-chips">${chips}</div>
    <p class="si-st si-ok"><b>${lockedN} of ${startersN}</b> starters locked in week ${SI.week} per Sleeper (<code>matchup_legs_raw → starters_games</code>, read ${esc(when(Date.now()))} CT).
    ${cmp.length ? ` Your Dev Dashboard picks: <b>${same} of ${cmp.length}</b> the same.` : ' No Dev Dashboard picks for this week.'}</p>
    ${saveBox}
    <div class="si-grid">${Object.values(byMatch).map(m => `<div class="si-match">${m.map(teamHtml).join('<div class="si-vs">vs</div>')}</div>`).join('')}</div>
    <p class="cm-rule">Player points = that game's box score TODAY under league scoring (my math, after any NBA stat correction). Not locked = his last game of the week IN THE LINEUP counts (bench games from the game-day watcher are skipped; week 1 has no bench records). A finished week's team total is Sleeper's final; if today's box scores add up differently, the team says why. Nothing on this page changes anything until you press a save button.</p>`;
  const msg = t => { const m = area.querySelector('#si-savemsg'); if (m) m.textContent = t; };
  const busy = on => area.querySelectorAll('[data-save], [data-use]').forEach(b => { b.disabled = on || (b.dataset.save && !plan.add.length); });
  area.onclick = async e => {
    const all = e.target.closest('[data-save="all"]');
    const use = e.target.closest('[data-use]')?.dataset.use;
    if (!all && !use) return;
    let list;
    if (all) {
      if (!confirm(`Save ${plan.add.length} of Sleeper's week ${SI.week} locks as your Dev Dashboard picks?\n\nThey become word of law (the Monday solve pins them; the coach uses them). You can clear any one later on the Dev Dashboard.`)) return;
      list = plan.add;
    } else {
      const r = plan.differ.find(d => d.pid === use);
      if (!r?.save) return;
      if (!confirm(`Replace your pick for ${pname(use)} (${pickWord(r.pick)}) with Sleeper's: ${r.save.k === 'lock' ? `locked ${dayLabel(r.save.d)}` : 'not locked (his last lineup game counts)'}?`)) return;
      list = [r.save];
    }
    busy(true);
    let ok = 0;
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      msg(`Saving ${i + 1} of ${list.length}…`);
      // First save shows sign-in / rules problems as a pop-up; stop there if it fails.
      const saved = await h.savePick(season, SI.week, s.pid, s.o, s.k, s.d, s.p, { quiet: i > 0 });
      if (saved) ok++;
      else if (i === 0) { msg('Nothing saved.'); busy(false); return; }
    }
    msg(`Saved ${ok} of ${list.length}.`);
    await fillLocks(card, x);
    msg(`Saved ${ok} of ${list.length}.`);
  };
}

// ---- odd games card (owner, Nov 8 2026: "a section of all these weird games so I don't have to look week to week") -------
// Every week of the season scanned with the same report. Weeks finished 3+ weeks ago are cached in this browser's
// localStorage (si-odd-{season}-{week}, not synced; picks are compared live every visit).
const ODD_KINDS = [
  ['corr', 'Stat corrections'], ['total', 'Totals off'], ['other', 'Game disagreements'], ['pick', 'Pick ≠ Sleeper'],
  ['zero', 'Benched to 0'], ['bench', 'Benched late'], ['extra', 'Locked, not in lineup'], ['nogame', 'Unknown game'],
];
const ODD = { kind: 'all' };
const oddKey = (season, w) => `si-odd-${season}-${w}`;
const readOdd = (season, w) => { try { return JSON.parse(localStorage.getItem(oddKey(season, w)) ?? 'null'); } catch { return null; } };
const writeOdd = (season, w, items) => { try { localStorage.setItem(oddKey(season, w), JSON.stringify({ at: Date.now(), items })); } catch { /* full or blocked */ } };

async function fillOdd(card, x) {
  const { h, cur, season, maxWeek, team, pname } = x;
  const { esc } = h;
  const area = document.createElement('div');
  card.querySelector('.empty')?.replaceWith(area);
  const docs = await loadLockDocs().catch(() => []);
  const all = [];
  for (let w = maxWeek; w >= 1; w--) {
    area.innerHTML = `<p class="empty">Scanning week ${w} (${maxWeek - w + 1} of ${maxWeek})…</p>`;
    const old = w <= x.liveWeek - 3;
    let items = old ? readOdd(season, w)?.items : null;
    let locks = null;
    if (!items) {
      const wk = await loadWeekRep(x, w);
      if (wk.error) { all.push({ week: w, kind: 'fail' }); continue; }
      items = weekOddities(w, wk.rep);
      locks = wk.rep.locks;
      if (old) writeOdd(season, w, items);
    }
    all.push(...items);
    // Pick differences are live (picks change): only needs Sleeper's locks, cheap from the cache or one query.
    if (!locks) {
      const res = await gql(CANDIDATES[0].query, { leagueId: cur.leagueId, round: w });
      if (Array.isArray(res.data?.matchup_legs_raw)) locks = locksFromLegs(res.data.matchup_legs_raw, (await commonFor(h, cur)).schedule);
    }
    if (locks) {
      const ownerOfPid = pid => cur.teams.find(t => locks[t.rosterId]?.starters.includes(pid) || locks[t.rosterId]?.locks[pid])?.owner ?? null;
      for (const r of compareWithPicks(locks, lawFor(season, w, { docs }))) if (!r.same) all.push({ week: w, owner: ownerOfPid(r.pid), pid: r.pid, kind: 'pick', sleeper: r.sleeper, pick: r.pick });
    }
  }
  const draw = () => {
    const counts = Object.fromEntries(ODD_KINDS.map(([k]) => [k, all.filter(i => i.kind === k).length]));
    const shown = all.filter(i => i.kind !== 'fail' && (ODD.kind === 'all' || i.kind === ODD.kind));
    const fails = all.filter(i => i.kind === 'fail').map(i => i.week);
    const chip = (k, label, n) => `<button type="button" class="ct-chip${ODD.kind === k ? ' on' : ''}" data-odd="${k}">${label} <b>${n}</b></button>`;
    const text = i => {
      const who = `${i.pid ? `<b>${esc(pname(i.pid))}</b> · ` : ''}${i.owner ? team(cur.teams.find(t => t.owner === i.owner)?.rosterId) : ''}`;
      const day = d => esc(dayLabel(d));
      const msg = {
        corr: () => `Stat correction on his ${day(i.date)} game: Sleeper counted ${pts(i.was)}, box score now ${pts(i.now)}. Sleeper's team final stays as counted.`,
        other: () => `Our records have ${pts(i.was)} (his ${day(i.otherDate)} game) but Sleeper's data says ${i.date ? day(i.date) : 'another game'} (${pts(i.now)}) counted. Check which one.`,
        total: () => `Team total off: Sleeper's final ${pts(i.official)}, box scores ${pts(i.today)}${i.explained ? ` + ${pts(i.explained)} of stat corrections` : ''} → ${i.diff > 0 ? '+' : ''}${pts(i.diff)} unexplained (a bench game the watcher missed, or a lock read wrong).`,
        bench: () => `On the bench for his later game(s): ${i.dates.map(d => `${day(d.date)} ${pts(d.p)}`).join(', ')} didn't count${i.counted ? `; ${day(i.counted.date)} ${pts(i.counted.p)} counted` : ''}.${i.live ? ' (week still live)' : ''}`,
        zero: () => `Started but scored 0: every game he played was from the bench (${i.dates.map(d => `${day(d.date)} ${pts(d.p)}`).join(', ')}).`,
        extra: () => `Locked${i.date ? ` on ${day(i.date)}` : ''} but not in the final lineup (traded after his lock?).`,
        nogame: () => 'Locked on a game Sleeper\'s schedule doesn\'t have.',
        pick: () => `Sleeper says ${i.sleeper ? `locked ${day(i.sleeper)}` : 'not locked'}, your Dev Dashboard pick says ${esc(pickWord(i.pick))}.`,
      }[i.kind]();
      const label = ODD_KINDS.find(([k]) => k === i.kind)?.[1] ?? i.kind;
      return `<li><span class="si-k si-k-${i.kind}">${esc(label)}</span><span class="si-odd-who">${who}</span><span class="si-odd-t">${msg}</span></li>`;
    };
    const weeks = [...new Set(shown.map(i => i.week))].sort((a, b) => b - a);
    area.innerHTML = `
      <p class="cm-rule">Every week this season, scanned with the same math as the Locks card. Weeks finished 3+ weeks ago are remembered in this browser; newer weeks are re-read every visit (stat corrections can still land).</p>
      <div class="ct-chips">${chip('all', 'All', all.filter(i => i.kind !== 'fail').length)}${ODD_KINDS.filter(([k]) => counts[k]).map(([k, l]) => chip(k, l, counts[k])).join('')}</div>
      ${fails.length ? `<p class="si-st si-bad">Couldn't read week ${fails.join(', ')} (try again later).</p>` : ''}
      ${weeks.length ? weeks.map(w => `<h4 class="si-odd-wk">Week ${w}${w === x.liveWeek && !isDone(x, w) ? ' <small>(live)</small>' : ''}</h4><ul class="si-odd">${shown.filter(i => i.week === w).map(text).join('')}</ul>`).join('') : '<p class="empty">Nothing odd. Every team adds up.</p>'}`;
  };
  draw();
  area.onclick = e => {
    const k = e.target.closest('[data-odd]')?.dataset.odd;
    if (!k) return;
    ODD.kind = k;
    draw();
  };
}

// ---- trade block card -------------------------------------------------------------------------------------------
async function fillBlock(card, x) {
  const { h, cur, team, pname } = x;
  const { esc } = h;
  const res = await gql(CANDIDATES.find(c => c.id === 'block').query, { leagueId: cur.leagueId });
  const rows = res.data?.league_players;
  const area = document.createElement('div');
  card.querySelector('.empty')?.replaceWith(area);
  if (!Array.isArray(rows)) { area.innerHTML = `<p class="si-st si-bad">Sleeper didn’t answer (${esc(res.errors?.[0]?.message ?? `HTTP ${res.status}`)}).</p>`; return; }
  const block = tradeBlock(rows);
  if (!block.length) { area.innerHTML = '<p class="empty">Nobody is on a trade block.</p>'; return; }
  const by = {};
  for (const b of block) (by[b.roster] ??= []).push(b);
  area.innerHTML = `<p class="si-st si-ok"><b>${block.length}</b> players on trade blocks (<code>league_players → settings.otb</code>).</p>
    <div class="si-blocks">${Object.entries(by).sort((a, b) => b[1].length - a[1].length).map(([rid, list]) => `
      <div class="si-team"><h4>${team(rid)} <span class="si-n">${list.length}</span></h4><ul>${list.map(b => `<li><span class="si-pn">${esc(pname(b.pid))}</span><span class="si-lv">${b.at ? `since ${esc(new Date(b.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }))}` : ''}</span></li>`).join('')}</ul></div>`).join('')}</div>`;
}

// ---- explore card -----------------------------------------------------------------------------------------------
const ctx = () => ({ league: null, round: Number(SI.round) || 1, date: SI.date, season: null, rosterId: Number(SI.rosterId) || 1, playerId: SI.playerId, statuses: SI.statuses });

function exploreHtml(esc) {
  const c = CANDIDATES.find(k => k.id === SI.q) ?? CANDIDATES[0];
  const field = (k, label, html) => (c.use.includes(k) ? `<label class="si-f"><span>${label}</span>${html}</label>` : '');
  return `
    <p class="cm-rule">Pick a query, press Run, see exactly what Sleeper sends back. "Needs login" queries send your token; the rest don't need it. You can edit the query text: anything that isn't a plain read is refused.</p>
    <div class="si-qs">${CANDIDATES.map(k => `<button type="button" class="ct-chip${k.id === c.id ? ' on' : ''}" data-q="${k.id}">${esc(k.label)} <span class="si-tag ${k.auth ? 'si-auth' : 'si-open'}">${k.auth ? 'needs login' : 'no login'}</span></button>`).join('')}</div>
    <p class="si-about">${esc(c.about)}</p>
    <div class="si-form">
      ${field('round', 'Week', `<input type="number" min="1" max="30" data-f="round" value="${esc(SI.round)}">`)}
      ${field('rosterId', 'Roster id (1-8)', `<input type="number" min="1" max="12" data-f="rosterId" value="${esc(SI.rosterId)}">`)}
      ${field('playerId', 'Sleeper player id', `<input type="text" inputmode="numeric" data-f="playerId" value="${esc(SI.playerId)}" placeholder="e.g. 4886">`)}
      ${field('date', 'Date', `<input type="date" data-f="date" value="${esc(SI.date)}">`)}
      ${field('statuses', 'Status filter', ['pending', 'proposed', 'complete', 'failed'].map(s => `<label class="si-cb"><input type="checkbox" data-st="${s}"${SI.statuses.includes(s) ? ' checked' : ''}> ${s}</label>`).join(''))}
    </div>
    <details class="si-raw"${SI.text != null ? ' open' : ''}><summary>Query text + variables (editable)</summary>
      <textarea class="si-q" rows="8" spellcheck="false" data-f="text"></textarea>
      <textarea class="si-v" rows="3" spellcheck="false" data-f="vars"></textarea>
    </details>
    <div class="si-run">
      <label class="si-cb"><input type="checkbox" data-f="sendToken"${SI.sendToken ? ' checked' : ''}> Send my token</label>
      <button class="btn" type="button" data-act="run"${SI.busy ? ' disabled' : ''}>${SI.busy ? 'Running…' : 'Run'}</button>
    </div>
    <div id="si-out"></div>`;
}

function fillExplore(card, h, cur) {
  const c = CANDIDATES.find(k => k.id === SI.q) ?? CANDIDATES[0];
  const cx = { ...ctx(), league: cur.leagueId, season: cur.season };
  const q = card.querySelector('.si-q');
  const v = card.querySelector('.si-v');
  if (q) q.value = SI.text ?? queryText(c, cx);
  if (v) v.value = SI.vars ?? JSON.stringify(c.vars(cx), null, 2);
  drawResult(card, h);
}

function drawResult(card, h) {
  const { esc } = h;
  const out = card.querySelector('#si-out');
  if (!out) return;
  const r = SI.result;
  if (!r) { out.innerHTML = ''; return; }
  if (r.refused) { out.innerHTML = `<p class="si-st si-bad">${esc(r.refused)}</p>`; return; }
  const json = JSON.stringify(r.errors ? { errors: r.errors, data: r.data } : r.data, null, 2) ?? 'null';
  const shown = SI.full || json.length <= MAX_SHOW ? json : `${json.slice(0, MAX_SHOW)}\n… (${(json.length - MAX_SHOW).toLocaleString()} more characters)`;
  const lockNote = /"starters_games"/.test(json)
    ? '<p class="si-st si-ok">This answer has <code>starters_games</code>: player id → Sleeper game id of his locked game (no entry = not locked). Game ids match <code>/schedule/nba/regular/{season}</code>.</p>' : '';
  const authNote = unauthorized(r) ? `<p class="si-st si-bad">Unauthorized: ${r.authed ? 'the token was sent but Sleeper refused it (expired or signed out? get a fresh one).' : 'this query needs your token (paste it above and tick "Send my token").'}</p>` : '';
  out.innerHTML = `
    <p class="si-meta ${r.ok ? 'si-ok' : 'si-bad'}">${r.ok ? 'OK' : 'Error'} · HTTP ${r.status} · ${r.ms} ms · ${(r.bytes / 1024).toFixed(1)} KB · ${r.authed ? 'token sent' : 'no token sent'} · ${esc(when(r.at))} CT</p>
    ${authNote}${lockNote}
    <div class="si-actions"><button class="btn" type="button" data-act="copy">Copy JSON</button>${json.length > MAX_SHOW ? `<button class="btn" type="button" data-act="full">${SI.full ? 'Show less' : 'Show all'}</button>` : ''}</div>
    <pre class="si-json">${esc(shown)}</pre>`;
  out.dataset.json = json;
}

// ---- events -----------------------------------------------------------------------------------------------------
function bind(body, params, h) {
  const { DATA } = h;
  const cur = DATA.seasons.at(-1);
  const explore = body.querySelector('#si-explore');
  fillExplore(explore, h, cur);
  const msg = t => { const m = body.querySelector('#si-tokmsg'); if (m) m.textContent = t; };
  const redrawToken = () => {
    const old = body.querySelector('#si-token');
    const tmp = document.createElement('div');
    tmp.innerHTML = tokenCard(h.esc);
    old.replaceWith(tmp.firstElementChild);
    bindToken();
  };
  const bindToken = () => {
    const card = body.querySelector('#si-token');
    card.querySelector('form.si-tok').addEventListener('submit', e => {
      e.preventDefault();
      const input = e.target.elements.tok;
      const t = cleanToken(input.value);
      input.value = '';
      if (!t) { msg('That doesn’t look like a token (one long line of letters, numbers, dots, dashes). Nothing was saved.'); return; }
      if (!saveToken(t)) { msg('This browser blocked saving it (private mode?). Nothing was saved.'); return; }
      SI.me = null;
      redrawToken();
      msg('Saved in this browser. Press "Check token" to test it.');
    });
    card.addEventListener('click', async e => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'forget') {
        if (!confirm('Forget the Sleeper token saved in this browser?')) return;
        forgetToken();
        SI.me = null;
        redrawToken();
        msg('Token deleted from this browser.');
      } else if (act === 'check') {
        msg('Asking Sleeper who you are…');
        const r = await gql(CANDIDATES.find(c => c.id === 'me').query, {}, { token: getToken() });
        const me = r.data?.me;
        if (me?.user_id) {
          SI.me = me.display_name || me.username || me.user_id;
          redrawToken();
          msg(`Token works: Sleeper says you are ${SI.me}.`);
        } else msg(unauthorized(r) ? 'Sleeper refused the token (Unauthorized). Get a fresh one.' : `No answer: ${r.errors?.[0]?.message ?? `HTTP ${r.status}`}`);
      }
    });
  };
  bindToken();

  body.querySelector('#si-locks').addEventListener('click', e => {
    const w = e.target.closest('[data-week]')?.dataset.week;
    if (!w) return;
    SI.week = Number(w);
    location.hash = `#/commish?tab=sleeper&week=${w}`;
  });

  explore.addEventListener('input', e => {
    const f = e.target.dataset.f;
    if (f === 'text') SI.text = e.target.value;
    else if (f === 'vars') SI.vars = e.target.value;
    else if (f === 'sendToken') SI.sendToken = e.target.checked;
    else if (f) { SI[f] = e.target.value; SI.text = null; SI.vars = null; fillExplore(explore, h, cur); }
    else if (e.target.dataset.st) {
      SI.statuses = [...explore.querySelectorAll('[data-st]')].filter(x => x.checked).map(x => x.dataset.st);
      SI.vars = null;
      fillExplore(explore, h, cur);
    }
  });
  explore.addEventListener('click', async e => {
    const qb = e.target.closest('[data-q]');
    if (qb) {
      SI.q = qb.dataset.q; SI.text = null; SI.vars = null; SI.result = null; SI.full = false;
      const c = CANDIDATES.find(k => k.id === SI.q);
      SI.sendToken = !!c?.auth && !!getToken();
      const tmp = document.createElement('div');
      tmp.innerHTML = exploreHtml(h.esc);
      [...explore.children].slice(1).forEach(n => n.remove());
      explore.append(...tmp.childNodes);
      fillExplore(explore, h, cur);
      return;
    }
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'run') {
      const text = explore.querySelector('.si-q').value;
      let vars = {};
      const bad = readOnlyProblem(text);
      if (bad) { SI.result = { refused: bad }; drawResult(explore, h); return; }
      try { vars = JSON.parse(explore.querySelector('.si-v').value || '{}'); } catch { SI.result = { refused: 'The variables box isn’t valid JSON.' }; drawResult(explore, h); return; }
      const token = SI.sendToken ? getToken() : '';
      SI.busy = true;
      const btn = explore.querySelector('[data-act="run"]');
      btn.disabled = true; btn.textContent = 'Running…';
      try {
        SI.result = { ...(await gql(text, vars, { token })), at: Date.now() };
      } catch (err) {
        SI.result = { refused: err.message };
      }
      SI.busy = false; SI.full = false;
      btn.disabled = false; btn.textContent = 'Run';
      drawResult(explore, h);
    } else if (act === 'copy') {
      const json = explore.querySelector('#si-out')?.dataset.json ?? '';
      navigator.clipboard?.writeText(json).then(() => { e.target.textContent = 'Copied'; }, () => { e.target.textContent = 'Copy failed'; });
    } else if (act === 'full') {
      SI.full = !SI.full;
      drawResult(explore, h);
    }
  });
  void params;
}
