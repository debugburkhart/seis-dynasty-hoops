// "Sleeper Insider" page (Test features, owner Nov 8 2026; logic in assets/sleeperpriv.js). Reads Sleeper's private
// GraphQL API, READ-ONLY, with the owner's own token when he pastes one (this browser's localStorage only).
// app.js passes h = { DATA, esc, name, teamName, COMMISH, sleeper, savePick }. Cards: token, Sleeper's locks (no login needed),
// trade block (no login needed), Explore (any candidate query or his own read-only query, raw JSON back).

import { get } from './commish.js';
import { betaCard } from './test-features.js';
import { benchDates, lawFor, loadLockDocs, weekBoxes } from './locks.js';
import { loadLgs } from './breakdown.js';
import { CANDIDATES, cleanToken, compareWithPicks, countedGame, forgetToken, getToken, gql, locksFromLegs, picksToSave, queryText, readOnlyProblem, saveToken, tokenInfo, tradeBlock, unauthorized } from './sleeperpriv.js';

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
    ${betaCard('Trade block from Sleeper', '<p class="empty">Reading Sleeper…</p>', { id: 'si-block', sub: 'no login needed' })}
    ${betaCard('Explore Sleeper’s private API', exploreHtml(esc), { id: 'si-explore', sub: 'read-only' })}
  </div>`;
  bind(body, params, h);

  const players = await get('/v1/players/nba', {});
  const pname = pid => { const p = players[pid]; return p ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() : pid; };
  fillLocks(body.querySelector('#si-locks'), { h, cur, season, maxWeek, liveWeek, state, team, pname });
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
  const league = await h.sleeper(`/league/${cur.leagueId}`).catch(() => null);
  const [res, schedule, boxes, docs, lgs] = await Promise.all([
    gql(CANDIDATES[0].query, { leagueId: cur.leagueId, round: SI.week }),
    get(`/schedule/nba/regular/${season}`, []),
    weekBoxes(season, SI.week, league?.scoring_settings ?? {}),
    loadLockDocs().catch(() => []),
    loadLgs().catch(() => null),
  ]);
  const legs = res.data?.matchup_legs_raw;
  if (!Array.isArray(legs)) {
    area.innerHTML = `<div class="ct-chips">${chips}</div><p class="si-st si-bad">Sleeper didn’t answer this query (${esc(res.errors?.[0]?.message ?? `HTTP ${res.status}`)}). ${unauthorized(res) ? 'It now needs a login: paste your token and try Explore → Locks with the token.' : 'It may have changed; try Explore.'}</p>`;
    return;
  }
  const locks = locksFromLegs(legs, schedule);
  const law = lawFor(season, SI.week, { docs });
  const cmp = compareWithPicks(locks, law);
  const same = cmp.filter(r => r.same).length;
  const ptsOf = (pid, date) => boxes?.games?.[pid]?.find(g => g.date === date)?.p;
  const lockedN = Object.values(locks).reduce((n, t) => n + Object.keys(t.locks).length, 0);
  const startersN = Object.values(locks).reduce((n, t) => n + t.starters.length, 0);
  const byMatch = {};
  for (const [rid, t] of Object.entries(locks)) (byMatch[t.matchup ?? `x${rid}`] ??= []).push([rid, t]);
  const ownerOf = Object.fromEntries(cur.teams.map(t => [t.rosterId, t.owner]));
  // Matchup of a game by date + NBA team ("AWY @ HOM"), from the schedule.
  const gameAt = {};
  for (const g of schedule ?? []) for (const s of [g.home?.team, g.away?.team]) if (s) gameAt[`${g.date}|${s}`] = `${g.away?.team} @ ${g.home?.team}`;
  // Unlocked starters (owner, Nov 8 2026): his last LINEUP game of the week counts, worked out from box scores.
  const unlocked = (pid, owner) => {
    const list = boxes?.games?.[pid] ?? [];
    const nbaTeam = list.at(-1)?.team ?? null;
    const left = nbaTeam ? (boxes?.sched?.[nbaTeam] ?? []).filter(g => !g.done).length : 0;
    return countedGame(list, benchDates(lgs, season, pid, owner, SI.week), left);
  };
  const teamHtml = ([rid, t]) => {
    let total = 0;
    let open = 0;
    const rows = t.starters.map(pid => {
      const l = t.locks[pid];
      const vs = l?.date ? (l.home && l.away ? ` · ${esc(l.away)} @ ${esc(l.home)}` : '') : '';
      const p = l?.date ? ptsOf(pid, l.date) : null;
      const pick = law[pid];
      const flag = pick && !cmp.find(r => r.pid === pid)?.same ? ` <span class="si-diff" title="Dev Dashboard pick: ${esc(pick.k === 'lock' ? `locked ${pick.d}` : pick.k)}">≠ pick</span>` : (pick ? ' <span class="si-same" title="Same as your Dev Dashboard pick">= pick</span>' : '');
      let line;
      if (l) {
        total += Number(p) || 0;
        line = `🔒 ${esc(dayLabel(l.date))}${vs}${p != null ? ` · <b>${p}</b>` : ''}`;
      } else {
        const c = unlocked(pid, ownerOf[rid]);
        total += c.p;
        if (!c.final) open++;
        const at = c.g ? ` · ${esc(dayLabel(c.g.date))}${gameAt[`${c.g.date}|${c.g.team}`] ? ` · ${esc(gameAt[`${c.g.date}|${c.g.team}`])}` : ''} · <b>${c.p}</b>` : ' · no lineup game · <b>0</b>';
        const sat = c.sat ? ` <small class="si-sat">(${c.sat} bench game${c.sat > 1 ? 's' : ''} skipped)</small>` : '';
        line = c.final
          ? `<i>not locked</i> → last game${at}${sat}`
          : `<i>not locked</i> → ${c.g ? `latest so far${at}` : 'no game yet'} <small class="si-sat">(${c.left} game${c.left > 1 ? 's' : ''} left)</small>${sat}`;
      }
      return `<li class="${l ? 'si-lk' : 'si-ul'}"><span class="si-pn">${esc(pname(pid))}</span><span class="si-lv">${line}${flag}</span></li>`;
    }).join('');
    const extra = Object.keys(t.locks).filter(pid => !t.starters.includes(pid));
    total = Math.round(total * 10) / 10;
    const official = t.points;
    const check = open
      ? `<p class="si-tot">So far ${total} <small>(${open} starter${open > 1 ? 's' : ''} still playing)</small></p>`
      : official == null
        ? `<p class="si-tot">Total ${total}</p>`
        : Math.abs(official - total) < 0.05
          ? `<p class="si-tot si-ok">Total ${total} = Sleeper’s ${official} ✓</p>`
          : `<p class="si-tot si-bad">Total ${total} vs Sleeper’s ${official} (${official > total ? '+' : ''}${Math.round((official - total) * 10) / 10}: a box score corrected since, or a bench game the watcher missed)</p>`;
    return `<div class="si-team"><h4>${team(rid)} <span class="si-n">${Object.keys(t.locks).length} / ${t.starters.length} locked</span></h4><ul>${rows}</ul>${check}${extra.length ? `<p class="cm-rule">Also in starters_games: ${extra.map(p => esc(pname(p))).join(', ')}</p>` : ''}</div>`;
  };
  // Save as picks (owner, Nov 8 2026: the solver gets Sleeper's locks only through this button).
  const done = SI.week < x.liveWeek || Number(x.state?.last_scored_leg) >= SI.week;
  const plan = picksToSave(locks, law, ownerOf, ptsOf, { done });
  const pickWord = k => (k === 'last' ? 'not locked' : k === 'zero' ? 'benched' : `locked ${dayLabel(k)}`);
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
    <p class="cm-rule">Points = that game's box score under league scoring (my math, not Sleeper's number). Not locked = his last game of the week IN THE LINEUP counts (bench games from the game-day watcher are skipped; week 1 has no bench records). Each team's total is checked against Sleeper's own total once the week is over. Nothing on this page changes anything until you press a save button.</p>`;
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
