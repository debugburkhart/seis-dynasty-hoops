import { LEAGUE_ID } from './config.js';

// ---------- Navigation ----------

const NAV = [
  { title: 'Now', items: [['home', 'Home', 'home'], ['standings', 'Standings', 'list'], ['transactions', 'Transactions', 'swap']] },
  { title: 'In Season', items: [['props', 'Weekly Props', 'ticket'], ['trade-court', 'Trade Court', 'scale'], ['power', 'Power Rankings', 'gauge'], ['hype', 'Matchup Hype', 'bolt']] },
  { title: 'Hall of Fame', items: [['awards', 'Awards', 'trophy'], ['records', 'Record Book', 'book'], ['timeline', 'Timeline', 'clock'], ['rivalry', 'Rivalry', 'swords']] },
  { title: 'Draft Kit', items: [['draft-history', 'Draft History', 'history'], ['cheat-sheet', 'Cheat Sheet', 'clipboard'], ['draft-grades', 'Draft Grades', 'cap']] },
];
const READY = new Set(['rivalry']);
const DEFAULT_PAGE = 'rivalry';

const ICONS = {
  home: '<path d="M3 9.5 10 4l7 5.5V16a1 1 0 0 1-1 1h-3.5v-4.5h-5V17H4a1 1 0 0 1-1-1z"/>',
  list: '<path d="M7 5h10M7 10h10M7 15h10M3.5 5h.01M3.5 10h.01M3.5 15h.01"/>',
  swap: '<path d="M4 7h12l-3-3M16 13H4l3 3"/>',
  ticket: '<path d="M3 6h14v2.5a1.5 1.5 0 0 0 0 3V14H3v-2.5a1.5 1.5 0 0 0 0-3zM12 6v8"/>',
  scale: '<path d="M10 3v14M5 17h10M4 6h12M4 6l-2 5a2.5 2.5 0 0 0 4 0zM16 6l-2 5a2.5 2.5 0 0 0 4 0z"/>',
  gauge: '<path d="M3 14a7 7 0 1 1 14 0M10 14l3.5-4"/>',
  bolt: '<path d="M11 2 4 11h5l-1 7 7-9h-5z"/>',
  trophy: '<path d="M6 3h8v4a4 4 0 0 1-8 0zM6 5H3v1a3 3 0 0 0 3 3M14 5h3v1a3 3 0 0 1-3 3M10 11v3M7 17h6M8 14h4v3H8z"/>',
  book: '<path d="M4 4h5a2 2 0 0 1 2 2v11a1.5 1.5 0 0 0-1.5-1.5H4zM16 4h-5M16 4v11.5h-5.5"/>',
  clock: '<circle cx="10" cy="10" r="7"/><path d="M10 6v4l2.5 2"/>',
  swords: '<path d="M3 3l8 8M3 3h3M3 3v3M17 3l-8 8M17 3h-3M17 3v3M6 14l-2 2 1 1 2-2M14 14l2 2-1 1-2-2M5 12l3 3M15 12l-3 3"/>',
  history: '<path d="M3.5 10a6.5 6.5 0 1 0 2-4.7M3 3v3.5h3.5M10 6.5V10l2.5 1.5"/>',
  clipboard: '<path d="M7 4H5v13h10V4h-2M7 3h6v3H7zM7.5 10h5M7.5 13h5"/>',
  cap: '<path d="M2 8l8-4 8 4-8 4zM5 9.5V13c0 1.2 2.2 2.5 5 2.5s5-1.3 5-2.5V9.5M18 8v4"/>',
};
const icon = name => `<svg class="ic" viewBox="0 0 20 20" aria-hidden="true">${ICONS[name] || ''}</svg>`;

// ---------- Helpers ----------

const $ = (sel, el = document) => el.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const num = n => (Math.round(n * 10) / 10).toLocaleString('en-US', { maximumFractionDigits: 1 });
const pct = (w, l, t) => (w + l + t ? ((w + t / 2) / (w + l + t)).toFixed(3).replace(/^0/, '') : '—');
const rec = (w, l, t) => `${w}–${l}${t ? `–${t}` : ''}`;
const yy = s => `’${String(s).slice(-2)}`;
const avatarUrl = id => (id ? `https://sleepercdn.com/avatars/thumbs/${id}` : null);

let DATA;
const name = id => DATA.owners[id]?.name ?? 'Unknown';

function currentOwners() {
  return new Set(DATA.seasons.at(-1).teams.map(t => t.owner));
}

function ownerOrder() {
  const cur = currentOwners();
  const byName = (x, y) => name(x).localeCompare(name(y), undefined, { sensitivity: 'base' });
  const all = Object.keys(DATA.owners);
  return { current: all.filter(id => cur.has(id)).sort(byName), former: all.filter(id => !cur.has(id)).sort(byName) };
}

// ---------- Stats ----------

const chrono = (x, y) => x.s - y.s || x.w - y.w;

function meetingsBetween(A, B) {
  return DATA.games
    .filter(g => (g.a === A && g.b === B) || (g.a === B && g.b === A))
    .map(g => {
      const flip = g.a !== A;
      return {
        ...g,
        ap: flip ? g.bp : g.ap,
        bp: flip ? g.ap : g.bp,
        win: g.win === 'tie' ? 'tie' : (g.win === 'a') !== flip ? 'A' : 'B',
      };
    })
    .sort(chrono);
}

function longestStreak(meetings, side) {
  let best = 0;
  let run = 0;
  for (const m of meetings) {
    run = m.win === side ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

function rivalry(A, B) {
  const ms = meetingsBetween(A, B);
  const count = side => ms.filter(m => m.win === side).length;
  const po = ms.filter(m => m.t === 'P');
  const best = ms.reduce((top, m) => {
    const cand = m.ap >= m.bp ? { pts: m.ap, who: A, m } : { pts: m.bp, who: B, m };
    return !top || cand.pts > top.pts ? cand : top;
  }, null);
  const margins = ms.filter(m => m.win !== 'tie').map(m => ({ m, diff: Math.abs(m.ap - m.bp) }));
  return {
    meetings: ms,
    winsA: count('A'),
    winsB: count('B'),
    ties: count('tie'),
    playoffs: po.length,
    poA: po.filter(m => m.win === 'A').length,
    poB: po.filter(m => m.win === 'B').length,
    ptsA: ms.reduce((s, m) => s + m.ap, 0),
    ptsB: ms.reduce((s, m) => s + m.bp, 0),
    bestA: Math.max(0, ...ms.map(m => m.ap)),
    bestB: Math.max(0, ...ms.map(m => m.bp)),
    streakA: longestStreak(ms, 'A'),
    streakB: longestStreak(ms, 'B'),
    best,
    blowout: margins.reduce((t, x) => (!t || x.diff > t.diff ? x : t), null),
    closest: margins.reduce((t, x) => (!t || x.diff < t.diff ? x : t), null),
  };
}

let weeklyHighs; // "season-week" -> top regular-season score that week
function career(id) {
  if (!weeklyHighs) {
    weeklyHighs = {};
    for (const g of DATA.games) {
      if (g.t !== 'R') continue;
      const k = `${g.s}-${g.w}`;
      weeklyHighs[k] = Math.max(weeklyHighs[k] ?? 0, g.ap, g.bp);
    }
  }
  const c = { seasons: 0, w: 0, l: 0, t: 0, pw: 0, pl: 0, pf: 0, highs: 0, titles: 0, finals: 0 };
  for (const s of DATA.seasons) {
    if (s.weeksPlayed && s.teams.some(t => t.owner === id)) c.seasons++;
    if (s.champion === id) c.titles++;
    if (s.champion === id || s.runnerUp === id) c.finals++;
  }
  for (const g of DATA.games) {
    const side = g.a === id ? 'a' : g.b === id ? 'b' : null;
    if (!side) continue;
    const mine = side === 'a' ? g.ap : g.bp;
    const won = g.win === side;
    const tie = g.win === 'tie';
    if (g.t === 'R') {
      c.pf += mine;
      if (won) c.w++;
      else if (tie) c.t++;
      else c.l++;
      if (mine === weeklyHighs[`${g.s}-${g.w}`]) c.highs++;
    } else if (g.t === 'P') {
      if (won) c.pw++;
      else c.pl++;
    }
  }
  c.winPct = c.w + c.l + c.t ? (c.w + c.t / 2) / (c.w + c.l + c.t) : 0;
  return c;
}

function defaultPair() {
  const cur = [...currentOwners()];
  let best = null;
  for (let i = 0; i < cur.length; i++) {
    for (let j = i + 1; j < cur.length; j++) {
      const r = rivalry(cur[i], cur[j]);
      const score = r.meetings.length * 100 - Math.abs(r.winsA - r.winsB);
      if (!best || score > best.score) best = { score, pair: [cur[i], cur[j]] };
    }
  }
  return best?.pair ?? Object.keys(DATA.owners).slice(0, 2);
}

// ---------- Layout ----------

function renderSidebar(page) {
  const played = DATA.seasons.filter(s => s.weeksPlayed).length;
  const updated = new Date(DATA.generatedAt).toLocaleString('en-US', {
    timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
  $('#sidebar').innerHTML = `
    <div class="brand">
      <span class="logo-mark">SD</span>
      <span class="brand-text">Fantasy<br>Hall of Fame</span>
    </div>
    <div class="league-chip" title="${esc(DATA.name)}">
      <span class="league-name">${esc(DATA.name)}</span>
      <span class="league-meta">${played} season${played === 1 ? '' : 's'}</span>
    </div>
    <nav>
      ${NAV.map(sec => `
        <div class="nav-title">${sec.title}</div>
        ${sec.items.map(([id, label, ic]) => `
          <a class="nav-item${id === page ? ' active' : ''}${READY.has(id) ? '' : ' soon'}" href="#/${id}">
            ${icon(ic)}<span>${label}</span>${READY.has(id) ? '' : '<span class="soon-tag">Soon</span>'}
          </a>`).join('')}
      `).join('')}
    </nav>
    <div class="sidebar-foot">
      ${DATA.live ? 'Live from Sleeper' : `Updated ${esc(updated)} CT`}
    </div>`;
}

function renderSoon(main, page) {
  const item = NAV.flatMap(s => s.items).find(([id]) => id === page);
  main.innerHTML = `
    <div class="page">
      <div class="page-head">
        <div class="page-icon">${icon(item?.[2] || 'clock')}</div>
        <div><div class="eyebrow">Coming soon</div><h1>${esc(item?.[1] || 'Not found')}</h1></div>
      </div>
      <section class="card soon-card">
        <p>This page hasn't been built yet. For now, head over to the <a href="#/rivalry">Rivalry</a> page.</p>
      </section>
    </div>`;
}

// ---------- Rivalry page ----------

function ownerOptions(selected) {
  const { current, former } = ownerOrder();
  const opt = id => `<option value="${esc(id)}"${id === selected ? ' selected' : ''}>${esc(name(id))}</option>`;
  return `<optgroup label="Current managers">${current.map(opt).join('')}</optgroup>` +
    (former.length ? `<optgroup label="Former managers">${former.map(opt).join('')}</optgroup>` : '');
}

function corner(id, side, wins) {
  const o = DATA.owners[id];
  const av = avatarUrl(o.avatar);
  const team = o.teams[DATA.currentSeason] || Object.values(o.teams).at(-1);
  return `
    <div class="corner ${side}">
      <div class="corner-label">${side === 'green' ? 'Green' : 'Gold'} corner</div>
      <label class="picker">
        ${av ? `<img class="avatar" src="${av}" alt="" loading="lazy">` : `<span class="avatar avatar-blank">${esc(name(id)[0])}</span>`}
        <span class="picker-name">${esc(name(id))}</span>
        <svg class="caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5l3-3"/></svg>
        <select data-side="${side === 'green' ? 'A' : 'B'}" aria-label="${side} corner manager">${ownerOptions(id)}</select>
      </label>
      <div class="choose">Choose owner</div>
      ${team && team !== name(id) ? `<div class="team-sub">${esc(team)}</div>` : ''}
      <div class="wins">${wins}</div>
      <div class="wins-label">Wins</div>
    </div>`;
}

function meetingRow(m, A, B) {
  const winner = m.win === 'A' ? A : m.win === 'B' ? B : null;
  const tag = m.t === 'P' ? `<span class="tag tag-po">${esc(m.label)}</span>` : m.t === 'X' ? `<span class="tag">${esc(m.label)}</span>` : '';
  return `
    <div class="meeting">
      <div class="m-when">${m.s} · Wk ${m.w}${tag}</div>
      <div class="m-score">
        <span class="${m.win === 'A' ? 'won' : ''}">${num(m.ap)}</span>
        <span class="dash">—</span>
        <span class="${m.win === 'B' ? 'won' : ''}">${num(m.bp)}</span>
      </div>
      <div class="m-result">${winner ? `${esc(name(winner))} by ${num(Math.abs(m.ap - m.bp))}` : 'Tie'}</div>
    </div>`;
}

function tapeRow(label, a, b, cmpA, cmpB) {
  const lead = cmpA == null || cmpA === cmpB ? '' : cmpA > cmpB ? 'A' : 'B';
  return `
    <div class="tape-row">
      <div class="tv tv-a${lead === 'A' ? ' lead' : ''}">${a}</div>
      <div class="tl">${label}</div>
      <div class="tv tv-b${lead === 'B' ? ' lead' : ''}">${b}</div>
    </div>`;
}

function signature(title, x, A, B) {
  if (!x) return '';
  const { m, diff } = x;
  const winner = m.win === 'A' ? A : B;
  return `
    <div class="sig">
      <div class="sig-title">${title}</div>
      <div class="sig-score">${num(m.ap)} <span class="dash">—</span> ${num(m.bp)}</div>
      <div class="sig-meta">${esc(name(winner))} by ${num(diff)} · ${m.s} Wk ${m.w}${m.label ? ` · ${esc(m.label)}` : ''}</div>
    </div>`;
}

let showAll = false;

function renderRivalry(main, params) {
  let A = params.get('a');
  let B = params.get('b');
  if (!DATA.owners[A] || !DATA.owners[B] || A === B) [A, B] = defaultPair();

  const r = rivalry(A, B);
  const ca = career(A);
  const cb = career(B);
  const total = r.winsA + r.winsB + r.ties;
  const share = total ? ((r.winsA + r.ties / 2) / total) * 100 : 50;
  const latest = [...r.meetings].reverse();
  const played = DATA.seasons.filter(s => s.weeksPlayed).length;

  const poLead = r.poA === r.poB ? (r.playoffs ? 'Even' : 'None yet') : `${esc(name(r.poA > r.poB ? A : B))} leads`;
  const ptsLead = r.ptsA === r.ptsB ? 'Even' : esc(name(r.ptsA > r.ptsB ? A : B));
  const bestMeta = r.best ? `${esc(name(r.best.who))} · ${yy(r.best.m.s)} Wk ${r.best.m.w}` : '—';

  main.innerHTML = `
    <div class="page">
      <div class="page-head">
        <div class="page-icon">${icon('swords')}</div>
        <div><div class="eyebrow">Head to head</div><h1>Rivalry</h1></div>
        <div class="archive">
          <div class="archive-main">
            <div class="archive-kicker">Rivalry archive</div>
            <div class="archive-name">${esc(DATA.name)}</div>
            <div class="archive-sub">Head-to-head records</div>
          </div>
          <div class="archive-stat"><b>${played}</b><span>Seasons</span></div>
          <div class="archive-stat"><b>${r.meetings.length}</b><span>Meetings</span></div>
        </div>
      </div>

      <section class="fight">
        <div class="fight-top"><span>Official fight card</span><span class="gold-text">All-time series</span></div>
        <div class="corners">
          ${corner(A, 'green', r.winsA)}
          <div class="vs-col">
            <div class="vs">VS</div>
            <div class="vs-meta">${r.meetings.length} meeting${r.meetings.length === 1 ? '' : 's'} · ${r.playoffs} playoff</div>
            ${r.ties ? `<div class="vs-meta">${r.ties} tie${r.ties === 1 ? '' : 's'}</div>` : ''}
            <button class="swap" type="button">${icon('swap')} Swap</button>
          </div>
          ${corner(B, 'gold', r.winsB)}
        </div>
        <div class="tug">
          <div class="tug-bar"><span style="width:${share}%"></span></div>
          <div class="tug-labels"><span>${esc(name(A))} · ${r.winsA}</span><span>${esc(name(B))} · ${r.winsB}</span></div>
        </div>
        <div class="fight-stats">
          <div><div class="fs-label">Playoff record</div><div class="fs-val">${r.poA}–${r.poB} <small>${poLead}</small></div></div>
          <div><div class="fs-label">Points in rivalry</div><div class="fs-val">${num(r.ptsA)}–${num(r.ptsB)} <small>${ptsLead}</small></div></div>
          <div><div class="fs-label">Best week here</div><div class="fs-val">${r.best ? num(r.best.pts) : '—'} <small>${bestMeta}</small></div></div>
        </div>
      </section>

      <section class="card">
        <div class="card-head"><h2>Latest meetings</h2><span class="card-sub">${Math.min(5, latest.length)} of ${latest.length}</span></div>
        ${latest.length
          ? latest.slice(0, 5).map(m => meetingRow(m, A, B)).join('')
          : `<p class="empty">${esc(name(A))} and ${esc(name(B))} haven't played each other yet.</p>`}
      </section>

      <section class="card">
        <div class="card-head"><h2>Tale of the tape</h2><span class="card-sub">Head-to-head, then career</span></div>
        <div class="tape">
          <div class="tape-row tape-names">
            <div class="tv tv-a">${esc(name(A))}</div><div class="tl"></div><div class="tv tv-b">${esc(name(B))}</div>
          </div>
          ${tapeRow('Head-to-head avg score', total ? num(r.ptsA / total) : '—', total ? num(r.ptsB / total) : '—', total ? r.ptsA : null, r.ptsB)}
          ${tapeRow('Best score in rivalry', total ? num(r.bestA) : '—', total ? num(r.bestB) : '—', total ? r.bestA : null, r.bestB)}
          ${tapeRow('Longest win streak', r.streakA, r.streakB, total ? r.streakA : null, r.streakB)}
          <div class="tape-divider"><span>Career numbers</span></div>
          ${tapeRow('Championships', ca.titles, cb.titles, ca.titles, cb.titles)}
          ${tapeRow('Finals appearances', ca.finals, cb.finals, ca.finals, cb.finals)}
          ${tapeRow('Seasons', ca.seasons, cb.seasons, null)}
          ${tapeRow('Regular-season record', rec(ca.w, ca.l, ca.t), rec(cb.w, cb.l, cb.t), ca.w, cb.w)}
          ${tapeRow('Playoff record', rec(ca.pw, ca.pl, 0), rec(cb.pw, cb.pl, 0), ca.pw, cb.pw)}
          ${tapeRow('Win %', pct(ca.w, ca.l, ca.t), pct(cb.w, cb.l, cb.t), ca.winPct, cb.winPct)}
          ${tapeRow('Career points for', num(ca.pf), num(cb.pf), ca.pf, cb.pf)}
          ${tapeRow('Weekly high scores', ca.highs, cb.highs, ca.highs, cb.highs)}
        </div>
      </section>

      <section class="card">
        ${r.meetings.length ? `
          <div class="sigs">
            ${signature('Biggest blowout', r.blowout, A, B)}
            ${signature('Closest finish', r.closest, A, B)}
          </div>` : ''}
        <div class="all-toggle">
          <p class="card-sub">Every meeting and signature game.</p>
          <button class="btn" type="button" id="toggle-all" ${r.meetings.length ? '' : 'disabled'}>
            ${showAll ? 'Hide meetings' : `View all ${r.meetings.length} meetings`}
          </button>
        </div>
        ${showAll ? `<div class="all-list">${latest.map(m => meetingRow(m, A, B)).join('')}</div>` : ''}
      </section>
    </div>`;

  const setPair = (a, b) => {
    history.replaceState(null, '', `#/rivalry?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`);
    renderRivalry(main, new URLSearchParams({ a, b }));
  };
  main.querySelectorAll('select[data-side]').forEach(sel => {
    sel.addEventListener('change', () => {
      const pick = sel.value;
      if (sel.dataset.side === 'A') setPair(pick, pick === B ? A : B);
      else setPair(pick === A ? B : A, pick);
    });
  });
  $('.swap', main).addEventListener('click', () => setPair(B, A));
  $('#toggle-all', main).addEventListener('click', () => {
    showAll = !showAll;
    setPair(A, B);
  });
}

// ---------- Boot ----------

function route() {
  const [path, qs] = location.hash.replace(/^#\/?/, '').split('?');
  return { page: path || DEFAULT_PAGE, params: new URLSearchParams(qs || '') };
}

function render() {
  const { page, params } = route();
  renderSidebar(page);
  const main = $('#main');
  if (page === 'rivalry') renderRivalry(main, params);
  else renderSoon(main, page);
  document.body.classList.remove('nav-open');
  window.scrollTo(0, 0);
}

async function loadData() {
  try {
    const res = await fetch('data/league.json', { cache: 'no-cache' });
    if (res.ok) return await res.json();
  } catch { /* fall through to live */ }
  // No saved data yet (first deploy, or opened locally): build it straight from Sleeper.
  const { buildLeagueData } = await import('./build-data.js');
  return { ...(await buildLeagueData(LEAGUE_ID)), live: true };
}

$('.menu-btn').addEventListener('click', () => document.body.classList.toggle('nav-open'));
$('.scrim').addEventListener('click', () => document.body.classList.remove('nav-open'));

try {
  DATA = await loadData();
  window.addEventListener('hashchange', render);
  render();
} catch (err) {
  $('#main').innerHTML = `<div class="page"><section class="card"><h2>Couldn't load the league</h2><p class="empty">${esc(err.message)}</p></section></div>`;
}
