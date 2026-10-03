import { ALL_STARS_FROM, LEAGUE_ID } from './config.js';
import { CATEGORIES, CHANGE_LABELS, buildRecords, playerPhoto, recordHistory, recordVisible, viewData } from './records.js';
import { PARTS, powerRankings, powerSeasons, scheduleLabel } from './power.js';
import { LEGACY, comparisons, finishes, legacy, legacyLabel, standings } from './standings.js';
import { frontOffice } from './frontoffice.js';
import { HYPE_PARTS, hypeSlate, moments, seasonWeeks, weekPairs } from './hype.js';
import { KINDS, ledgerTotals, matchesKind, transactionLog } from './transactions.js';
import { POSITION_GROUPS, REGULAR_WEEKS, allFantasy, allStars, banner, championshipMvp, gmOfTheYear, mvpRace, playerOfTheYear, rookieClass } from './awards.js';
import { ALL_STAR_POSITIONS } from './corrections.js';
import { SORTS, playerIndex } from './players.js';

// ---------- Navigation ----------

const NAV = [
  { title: 'Now', items: [['home', 'Home', 'home'], ['standings', 'Standings', 'list'], ['transactions', 'Transactions', 'swap']] },
  { title: 'In Season', items: [['props', 'Weekly Props', 'ticket'], ['trade-court', 'Trade Court', 'scale'], ['power', 'Power Rankings', 'gauge'], ['hype', 'Matchup Hype', 'bolt']] },
  { title: 'Hall of Fame', items: [['awards', 'Awards', 'trophy'], ['records', 'Record Book', 'book'], ['players', 'Player Index', 'users'], ['timeline', 'Timeline', 'clock'], ['rivalry', 'Rivalry', 'swords']] },
  { title: 'Draft Kit', items: [['draft-history', 'Draft History', 'history'], ['cheat-sheet', 'Cheat Sheet', 'clipboard'], ['draft-grades', 'Draft Grades', 'cap']] },
];
const READY = new Set(['rivalry', 'records', 'power', 'hype', 'standings', 'transactions', 'awards', 'players']);
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
  crown: '<path d="M3 7l3.5 3L10 5l3.5 5L17 7l-1.5 8h-11zM5 17.5h10"/>',
  medal: '<path d="M6 3h8l-2.5 5h-3zM10 8a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zM10 10.5v4"/>',
  target: '<circle cx="10" cy="10" r="7"/><circle cx="10" cy="10" r="4"/><circle cx="10" cy="10" r="1"/>',
  users: '<circle cx="8" cy="7" r="3"/><path d="M2.5 17a5.5 5.5 0 0 1 11 0M13 4.3a3 3 0 0 1 0 5.4M15 12.3A5.5 5.5 0 0 1 17.5 17"/>',
  flame: '<path d="M10 2.5c.5 3 4.5 5 4.5 9a4.5 4.5 0 0 1-9 0c0-2 1-3.2 2-4 0 1.5.8 2.5 1.8 2.8C9 8 9.2 5 10 2.5z"/>',
  arrow: '<path d="M4 10h12M11 5l5 5-5 5"/>',
  back: '<path d="M16 10H4M9 5l-5 5 5 5"/>',
  down: '<path d="M10 3v9M6 8.5l4 4 4-4M4 16.5h12"/>',
  toilet: '<path d="M4.5 3h4v6h-4zM3 9h14c0 3-2.4 5.2-5.5 5.7L12 17H7l.6-2.4C5 13.8 3 11.7 3 9z"/>',
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
  // League-median games count in the record, as in Sleeper's standings.
  for (const m of DATA.medianGames ?? []) {
    if (m.o !== id) continue;
    c[m.res === 'W' ? 'w' : m.res === 'L' ? 'l' : 't']++;
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
      <div class="corner-label">${side === 'blue' ? 'Blue' : 'Gold'} corner</div>
      <label class="picker">
        ${av ? `<img class="avatar" src="${av}" alt="" loading="lazy">` : `<span class="avatar avatar-blank">${esc(name(id)[0])}</span>`}
        <span class="picker-name">${esc(name(id))}</span>
        <svg class="caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5l3-3"/></svg>
        <select data-side="${side === 'blue' ? 'A' : 'B'}" aria-label="${side} corner manager">${ownerOptions(id)}</select>
      </label>
      <div class="choose">Choose owner</div>
      ${team && team !== name(id) ? `<div class="team-sub">${esc(team)}</div>` : ''}
      <div class="wins">${wins}</div>
      <div class="wins-label">Wins</div>
    </div>`;
}

// "1 title meeting (2025)" from the seasons the two met in the Championship.
function titleLine(seasons, short = false) {
  const years = [...new Set(seasons)].sort();
  if (!years.length) return short ? '0 title meetings' : 'No title meetings yet';
  return `${years.length} title meeting${years.length === 1 ? '' : 's'} (${years.join(', ')})`;
}

// Playoff games tied on points are decided by Sleeper's tiebreaker.
const result = (m, winner) => (m.ap === m.bp
  ? `${esc(name(winner))} advanced on tiebreaker`
  : `${esc(name(winner))} by ${num(Math.abs(m.ap - m.bp))}`);

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
      <div class="m-result">${winner ? result(m, winner) : 'Tie'}</div>
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
      <div class="sig-meta">${result(m, winner)} · ${m.s} Wk ${m.w}${m.label ? ` · ${esc(m.label)}` : ''}</div>
    </div>`;
}

let showAll = false;

// ---------- Rivalry: trades between the two managers ----------
// Same valuation as the Front Office records: each player counts for the locked
// points he produced for the team that got him (until he left), and a draft pick
// counts as the player it became. "Est." means a value is still changing.

let LEDGER;
const ledger = () => (LEDGER ??= frontOffice(DATA));

function tradeHistory(A, B) {
  const trades = ledger().trades
    .filter(t => t.owners.includes(A) && t.owners.includes(B))
    .sort((x, y) => y.s - x.s || y.w - x.w);
  const side = (t, o) => t.sides.find(sd => sd.o === o);
  // The later trade in which this manager passed the pick on, if they did.
  const flipOf = (t, a, o) => ledger().trades
    .filter(x => x.ts > t.ts && x.sides.some(sd => sd.o === o && sd.gave.some(g => g.key === a.key)))
    .sort((x, y) => x.ts - y.ts)
    .map(x => ({ s: x.s, w: x.w, to: x.sides.find(sd => sd.got.some(g => g.key === a.key))?.o }))[0];
  // An asset as received by manager o: its label, a note under it, and whether
  // its value is still growing on o's own roster (the * marker).
  const describe = (t, a, o) => {
    if (!a.pick) return { label: DATA.players[a.pid]?.n ?? `Player ${a.pid}`, note: '', mine: a.active };
    const pick = a.pick.replace(/^(\d+) round (\d+)$/, '$1 round $2 pick');
    const player = a.pid ? DATA.players[a.pid]?.n ?? 'player' : null;
    const flip = a.usedBy === o ? null : flipOf(t, a, o);
    if (flip) {
      return {
        label: `${pick}${player ? ` → ${player}` : ''}`,
        note: `flipped to ${name(flip.to)} in ${flip.s} Wk ${flip.w}${player ? `; ${name(a.usedBy)} drafted ${player}` : ', not used yet'}`,
        mine: false,
      };
    }
    if (!player) return { label: `${pick} (not used yet)`, note: '', mine: true };
    return { label: `${pick} → ${player}`, note: a.usedBy && a.usedBy !== o ? `drafted by ${name(a.usedBy)}` : '', mine: a.usedBy === o && a.active };
  };
  // Who's ahead across all their trades: half the gap between the two managers'
  // nets (in a two-team deal that's just one side's net; a third team's share
  // in three-team deals doesn't tilt it).
  const netA = r1(trades.reduce((sum, t) => sum + (side(t, A).net - side(t, B).net) / 2, 0));
  const anyEst = trades.some(t => side(t, A).est || side(t, B).est);
  const column = (t, o) => {
    const sd = side(t, o);
    const others = t.owners.length > 2;
    return `
      <div class="tr-side${sd.net > 0 ? ' tr-won' : ''}">
        <div class="tr-who">${esc(name(o))} got</div>
        ${sd.got.length ? `<ul>${sd.got.map(a => {
          const d = describe(t, a, o);
          const notes = [others ? `from ${name(fromWhom(t, a, o))}` : '', d.note].filter(Boolean).join(' · ');
          return `
          <li><span>${esc(d.label)}${notes ? ` <small>${esc(notes)}</small>` : ''}</span><b>${num(a.value)}${d.mine ? '<i>*</i>' : ''}</b></li>`;
        }).join('')}</ul>`
          : '<p class="empty">Nothing</p>'}
        <div class="tr-total"><span>Total produced</span><b>${num(sd.gotValue)}</b></div>
        ${others ? `<div class="tr-total tr-net"><span>Gave up ${num(sd.gaveValue)} · net</span><b>${signedNum(sd.net)}</b></div>` : ''}
      </div>`;
  };
  const verdict = t => {
    const a = side(t, A);
    const est = a.est || side(t, B).est;
    if (t.owners.length > 2) {
      return `${esc(name(A))} ${signedNum(a.net)} · ${esc(name(B))} ${signedNum(side(t, B).net)}${est ? ' · Est.' : ''}`;
    }
    if (a.net === 0) return `Even${est ? ' so far' : ''}`;
    const winner = a.net > 0 ? A : B;
    return `${esc(name(winner))} ${est ? 'leads' : 'won'} by ${num(Math.abs(a.net))}${est ? ' · Est.' : ''}`;
  };

  return `
    <section class="card">
      <div class="card-head"><h2>Trade history</h2><span class="card-sub">${trades.length
        ? `${trades.length} trade${trades.length === 1 ? '' : 's'} · ${netA === 0 ? 'dead even on value' : `${esc(name(netA > 0 ? A : B))} ${anyEst ? 'is' : 'came out'} ahead by ${num(Math.abs(netA))}`}`
        : 'No trades yet'}</span></div>
      ${trades.length ? trades.map(t => `
        <div class="tr">
          <div class="tr-head">
            <span class="tr-when">${t.s} · Wk ${t.w}${t.owners.length > 2 ? ` · 3-team trade with ${esc(t.owners.filter(o => o !== A && o !== B).map(name).join(' & '))}` : ''}</span>
            <span class="tr-verdict">${verdict(t)}</span>
          </div>
          <div class="tr-sides">${column(t, A)}${column(t, B)}</div>
        </div>`).join('') : `<p class="empty">${esc(name(A))} and ${esc(name(B))} haven't made a trade with each other.</p>`}
      ${trades.length ? `<p class="rec-note">Values are locked points each player produced for the team that received him, until he left it. A draft pick counts as the player it became, even if it was flipped before the draft; that value then moves on in the trade where it was flipped, so it's never counted twice. * still on that manager's roster (or a pick they still hold), so the value is still growing. Est. means some value in the deal is still changing.</p>` : ''}
    </section>`;
}

// In a 3-team trade, who an asset came from.
function fromWhom(t, asset, receiver) {
  const x = DATA.transactions?.find(tx => tx.type === 'trade' && tx.s === t.s && tx.w === t.w && tx.owners.length === t.owners.length && t.owners.every(o => tx.owners.includes(o)));
  if (!x) return receiver;
  if (asset.pick) return x.picks.find(p => `${p.season} round ${p.round}` === asset.pick && p.to === receiver)?.from ?? receiver;
  return x.drops[asset.pid] ?? receiver;
}

const r1 = n => Math.round(n * 10) / 10;
const signedNum = n => `${n > 0 ? '+' : n < 0 ? '−' : ''}${num(Math.abs(n))}`;

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
          ${corner(A, 'blue', r.winsA)}
          <div class="vs-col">
            <div class="vs">VS</div>
            <div class="vs-meta">${r.meetings.length} meeting${r.meetings.length === 1 ? '' : 's'} · ${r.playoffs} playoff</div>
            <div class="vs-meta">${titleLine(r.meetings.filter(m => m.label === 'Championship').map(m => m.s), true)}</div>
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
          ${tapeRow('Regular-season points for', num(ca.pf), num(cb.pf), ca.pf, cb.pf)}
          ${tapeRow('Weekly high scores', ca.highs, cb.highs, ca.highs, cb.highs)}
        </div>
      </section>

      ${tradeHistory(A, B)}

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

// ---------- Record Book ----------

let RECORDS;
let EVENTS;

// The latest change to a record, if it happened recently and the new holder
// still holds it.
function recentChange(cat, r) {
  const e = EVENTS.findLast(x => x.cat === cat && x.title === r.title);
  if (!e?.recent) return null;
  const leaders = r.rows.filter(x => x.rank === 1).map(x => x.whoText ?? x.who);
  return e.holders.some(h => leaders.includes(h.whoText ?? h.who)) ? e : null;
}

const holderNames = list => list.map(h => esc(h.whoText ?? name(h.who))).join(' <span class="amp">&amp;</span> ');

function badge(e) {
  return `<span class="rb-badge rb-${e.type}">${icon('flame')}${CHANGE_LABELS[e.type]} · ${e.s} Wk ${e.w}</span>`;
}

// If the holder has kept growing the record since (a season or streak that
// kept going), show where it stands now.
function nowValue(e) {
  const r = RECORDS[e.cat]?.find(x => x.title === e.title);
  const top = r?.rows.find(x => x.rank === 1);
  if (!top || String(top.display) === String(e.holders[0].display)) return '';
  const same = e.holders.some(h => (h.whoText ?? h.who) === (top.whoText ?? top.who));
  return same ? ` <span class="rb-now">now ${esc(top.display)}</span>` : ` <span class="rb-now">since passed</span>`;
}

function previously(e) {
  const others = e.prev.filter(p => !e.holders.some(h => (h.whoText ?? h.who) === (p.whoText ?? p.who)));
  return others.length
    ? `Previously ${holderNames(others)} · ${esc(e.prev[0].display)}`
    : `Beat their own record of ${esc(e.prev[0].display)}`;
}

function recentlyBroken() {
  // Latest change per record, newest first.
  const seen = new Set();
  const latest = [];
  for (let i = EVENTS.length - 1; i >= 0 && latest.length < 8; i--) {
    const e = EVENTS[i];
    const k = `${e.cat}/${e.title}`;
    if (seen.has(k)) continue;
    seen.add(k);
    latest.push(e);
  }
  if (!latest.length) return '';
  const catTitle = id => CATEGORIES.find(c => c.id === id)?.title ?? id;
  return `
    <section class="card">
      <div class="card-head"><h2>Recently broken</h2><span class="card-sub">The latest records to change hands</span></div>
      <div class="rb-list">
        ${latest.map(e => `
          <a class="rb-item" href="#/records/${e.cat}">
            <div class="rb-top">
              <span class="rb-pill rb-${e.type}">${CHANGE_LABELS[e.type]}</span>
              <span class="rb-when">${e.s} · Wk ${e.w}</span>
            </div>
            <div class="rb-title">${esc(e.title)} <small>${esc(catTitle(e.cat))}</small></div>
            <div class="rb-who"><b>${holderNames(e.holders)}</b> <span class="rb-val">${esc(e.holders[0].display)}</span>${nowValue(e)}</div>
            <div class="rb-prev">${previously(e)}</div>
          </a>`).join('')}
      </div>
    </section>`;
}

// Records for a Timeframe + Stage combination, built once and cached.
const RECORD_VIEWS = {};
function recordsFor(season, stage) {
  return (RECORD_VIEWS[`${season}|${stage}`] ??= buildRecords(viewData(DATA, { season, stage })));
}

// The rows a card shows: only the chosen manager's entries (keeping their
// league-wide rank), then trimmed to the record's limit.
function shownRows(r, manager) {
  let rows = r.rows;
  // Records with per-manager rows (the position seasons) count only what a
  // player did for the chosen manager.
  if (manager !== 'all' && r.managerRows) rows = r.managerRows.filter(x => x.who === manager);
  else if (manager !== 'all') rows = rows.filter(x => x.who === manager || x.also === manager || x.whos?.includes(manager));
  return r.limit ? rows.slice(0, r.limit) : rows;
}

function recordCard(r, cat, { manager = 'all', badges = true, stage = 'all', showCat = false } = {}) {
  const rows = shownRows(r, manager);
  const head = `${esc(r.title)}${showCat ? ` <small class="rec-cat">${esc(CATEGORIES.find(c => c.id === cat)?.title)}</small>` : ''}`;
  if (!rows.length) {
    const why = manager !== 'all' ? `${esc(name(manager))} isn't on this board.` : 'No one qualifies yet.';
    return `<article class="rec"><div class="rec-title">${head}</div><p class="empty">${why}</p></article>`;
  }
  const topRank = rows[0].rank;
  if (topRank === '–' && manager === 'all') {
    return `<article class="rec"><div class="rec-title">${head}</div><p class="empty">No one qualifies yet.</p>${r.note ? `<p class="rec-note">${esc(r.note)}</p>` : ''}</article>`;
  }
  const leaders = topRank === '–' ? [rows[0]] : rows.filter(x => x.rank === topRank);
  // A shared record lists every co-holder below, so each keeps its details.
  const rest = leaders.length > 1 ? rows : rows.filter(x => !leaders.includes(x));
  const top = leaders[0];
  const holder = x => esc(x.whoText ?? name(x.who));
  const av = avatarUrl(DATA.owners[top.who]?.avatar);
  const fresh = badges && topRank === 1 ? recentChange(cat, r) : null;
  const rankNote = topRank === 1 ? '' : topRank === '–' ? 'Not ranked yet' : `#${topRank} overall`;
  const ctx = leaders.length === 1 ? [top.ctx, rankNote].filter(Boolean).join(' · ') : 'Shared record';
  // A note about "any game" doesn't apply once the Stage filter narrows the games.
  const note = r.scopeNote && stage !== 'all' ? '' : manager !== 'all' && r.managerNote ? r.managerNote : r.note;
  return `
    <article class="rec${fresh ? ' rec-fresh' : ''}${topRank !== 1 ? ' rec-sub' : ''}" id="rec-${cat}-${slug(r.title)}">
      <div class="rec-title"><span>${head}</span>${fresh ? badge(fresh) : ''}</div>
      <div class="rec-lead">
        ${leaders.length === 1 && top.img
          ? `<img class="rec-av rec-player" src="${esc(top.img)}" alt="" loading="lazy" onerror="this.remove()">`
          : leaders.length === 1 && !top.whoText
            ? (av ? `<img class="rec-av" src="${av}" alt="" loading="lazy">` : `<span class="rec-av avatar-blank">${esc(name(top.who)[0])}</span>`)
            : ''}
        <div class="rec-holder">
          <div class="rec-name">${leaders.length > 3 ? `${leaders.length}-way tie` : leaders.map(holder).join(' <span class="amp">&amp;</span> ')}</div>
          <div class="rec-ctx">${esc(ctx)}</div>
        </div>
        <div class="rec-value">${esc(top.display)}</div>
      </div>
      ${rest.length ? `
        <ol class="rec-rest">
          ${rest.map(x => `
            <li${x.rank === 1 ? ' class="co"' : ''}>
              <span class="rk">${x.rank}</span>
              <span class="rn">${holder(x)}<small>${esc(x.ctx)}</small></span>
              <span class="rv">${esc(x.display)}</span>
            </li>`).join('')}
        </ol>` : ''}
      ${note ? `<p class="rec-note">${esc(note)}</p>` : ''}
    </article>`;
}

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ---------- Record Book filters ----------

const STAGES = [['all', 'All stages'], ['regular', 'Regular season'], ['playoffs', 'Playoffs']];

function filterState(params) {
  const seasons = DATA.seasons.filter(s => s.weeksPlayed).map(s => s.season);
  const season = seasons.includes(params.get('season')) ? params.get('season') : 'all';
  const manager = DATA.owners[params.get('manager')] ? params.get('manager') : 'all';
  const stage = STAGES.some(([id]) => id === params.get('stage')) ? params.get('stage') : 'all';
  return { season, manager, stage, q: params.get('q') ?? '' };
}

function filterHash(cat, f) {
  const p = new URLSearchParams();
  if (f.season !== 'all') p.set('season', f.season);
  if (f.manager !== 'all') p.set('manager', f.manager);
  if (f.stage !== 'all') p.set('stage', f.stage);
  if (f.q) p.set('q', f.q);
  const qs = p.toString();
  return `#/records/${cat}${qs ? `?${qs}` : ''}`;
}

function dropdown(key, label, value, options) {
  const current = options.find(([id]) => id === value)?.[1] ?? '';
  return `
    <label class="f">
      <span class="f-label">${label}</span>
      <span class="f-val">${esc(current)}</span>
      <svg class="caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5l3-3"/></svg>
      <select data-f="${key}" aria-label="${label}">
        ${options.map(([id, text, group]) => `<option value="${esc(id)}"${id === value ? ' selected' : ''}${group ? ` data-group="${group}"` : ''}>${esc(text)}</option>`).join('')}
      </select>
    </label>`;
}

function filterBar(cat, f) {
  const complete = new Set(DATA.seasons.filter(s => s.status === 'complete').map(s => s.season));
  const seasonOpts = [['all', 'All history'], ...DATA.seasons.filter(s => s.weeksPlayed).map(s => s.season).reverse()
    .map(s => [s, `${s} season${complete.has(s) ? '' : ' (in progress)'}`])];
  const { current, former } = ownerOrder();
  const managerOpts = [['all', 'Everyone'], ...current.map(id => [id, name(id)]), ...former.map(id => [id, `${name(id)} (former)`])];
  const cats = CATEGORIES.filter(c => !c.soon);
  return `
    <div class="rb-toolbar">
      <a class="back" href="#/records">${icon('back')} All categories</a>
      <label class="rb-search">
        <svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><circle cx="9" cy="9" r="5.5"/><path d="m13.5 13.5 3.5 3.5"/></svg>
        <input type="search" id="rb-q" placeholder="Browse every record" value="${esc(f.q)}" autocomplete="off">
      </label>
    </div>
    <section class="filters">
      <label class="f-cat">
        <span class="page-icon">${icon(cat.icon)}</span>
        <span class="f-cat-text"><span class="eyebrow">Record Book</span><span class="f-cat-name">${esc(cat.title)}</span></span>
        <svg class="caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5l3-3"/></svg>
        <select data-f="cat" aria-label="Category">
          ${cats.map(c => `<option value="${c.id}"${c.id === cat.id ? ' selected' : ''}>${esc(c.title)}</option>`).join('')}
        </select>
      </label>
      <div class="f-group${cat.table ? ' f-two' : ''}">
        ${dropdown('season', 'Timeframe', f.season, seasonOpts)}
        ${dropdown('manager', 'Manager', f.manager, managerOpts)}
        ${cat.table ? '' : dropdown('stage', 'Stage', f.stage, STAGES)}
      </div>
    </section>`;
}

function filterSummary(f) {
  const bits = [];
  if (f.season !== 'all') bits.push(`the ${f.season} season only`);
  if (f.stage === 'regular') bits.push('regular-season games only');
  if (f.stage === 'playoffs') bits.push('championship-bracket games only');
  if (f.manager !== 'all') bits.push(`${esc(name(f.manager))}'s entries, with their league-wide rank`);
  if (!bits.length) return '';
  return `<p class="filter-note">Showing ${bits.join(' · ')}. <a href="${filterHash(route().sub, { season: 'all', manager: 'all', stage: 'all', q: f.q })}">Clear filters</a></p>`;
}

// Table layout (Front Office): one row per record, grouped, each opening its leaderboard.
function recordTable(list, cat, f) {
  const groups = [...new Set(list.map(r => r.group))];
  const holder = x => esc(x.whoText ?? name(x.who));
  const row = r => {
    const rows = shownRows(r, f.manager);
    const ranked = rows.filter(x => x.rank !== '–');
    const top = ranked[0];
    const leaders = top ? ranked.filter(x => x.rank === top.rank) : [];
    const who = !top ? '<span class="fo-none">—</span>'
      : leaders.length > 2 ? `${leaders.length}-way tie`
      : leaders.map(holder).join(' <span class="amp">&amp;</span> ');
    const rank = top && top.rank !== 1 ? `<small>#${top.rank} overall</small>` : '';
    const fresh = f.season === 'all' && top?.rank === 1 ? recentChange(cat.id, r) : null;
    return `
      <details class="fo-row${r.bad ? ' fo-bad' : ''}" id="rec-${cat.id}-${slug(r.title)}">
        <summary><div class="row-grid">
          <span class="fo-rec"><b>${esc(r.title)}</b><small>${esc(r.desc ?? '')}</small></span>
          <span class="fo-holder">${who}${rank}${fresh ? badge(fresh) : ''}</span>
          <span class="fo-val">${top ? esc(top.display) : '—'}</span>
          <span class="fo-arrow">${icon('arrow')}</span>
        </div></summary>
        <div class="fo-board">
          ${rows.length ? `<ol class="rec-rest">${rows.map(x => `
            <li${x.rank === 1 ? ' class="co"' : ''}>
              <span class="rk">${x.rank}</span>
              <span class="rn">${holder(x)}<small>${esc(x.ctx)}</small></span>
              <span class="rv">${esc(x.display)}</span>
            </li>`).join('')}</ol>` : `<p class="empty">${f.manager !== 'all' ? `${esc(name(f.manager))} isn't on this board.` : 'No one qualifies yet.'}</p>`}
          ${r.note ? `<p class="rec-note">${esc(r.note)}</p>` : ''}
        </div>
      </details>`;
  };
  return `
    <section class="card fo-table">
      <div class="fo-head"><span>Record</span><span>Record holder</span><span>Record value</span><span></span></div>
      ${groups.map(g => {
        const items = list.filter(r => r.group === g);
        return `<div class="fo-group"><b>${esc(g)}</b> <small>${items.length} record${items.length === 1 ? '' : 's'}</small></div>${items.map(row).join('')}`;
      }).join('')}
    </section>
    <p class="pw-foot">Every move is valued by the locked points it produced: a player counts for the team that acquired him until he left, and a draft pick counts as the player it became. <b>Est.</b> means the value is still changing, because a player in the deal is still on that roster or a pick hasn't been used yet.</p>`;
}

function recordResults(cat, f) {
  const recs = recordsFor(f.season, f.stage);
  const opts = { manager: f.manager, badges: f.season === 'all' && f.stage === 'all', stage: f.stage };
  const q = f.q.trim().toLowerCase();
  if (q) {
    // Search looks through every category, not just this one.
    const hits = CATEGORIES.filter(c => !c.soon).flatMap(c => (recs[c.id] || [])
      .filter(r => recordVisible(r, f) && `${r.title} ${c.title}`.toLowerCase().includes(q))
      .map(r => recordCard(r, c.id, { ...opts, showCat: true })));
    return hits.length
      ? `<p class="filter-note">${hits.length} record${hits.length === 1 ? '' : 's'} matching “${esc(f.q)}” across every category.</p><div class="rec-grid">${hits.join('')}</div>`
      : `<section class="card soon-card"><p>No records match “${esc(f.q)}”.</p></section>`;
  }
  const list = (recs[cat.id] || []).filter(r => recordVisible(r, f));
  if (cat.table && list.length) return recordTable(list, cat, f);
  return list.length
    ? `<div class="rec-grid">${list.map(r => recordCard(r, cat.id, opts)).join('')}</div>`
    : `<section class="card soon-card"><p>None of the ${esc(cat.title)} records apply to this stage.</p></section>`;
}

function renderRecordBook(main, sub, params) {
  RECORDS = recordsFor('all', 'all');
  EVENTS ??= DATA.recordEvents ?? recordHistory(DATA);
  const cat = CATEGORIES.find(c => c.id === sub);

  if (!cat) {
    main.innerHTML = `
      <div class="page">
        <div class="page-head">
          <div class="page-icon">${icon('book')}</div>
          <div><div class="eyebrow">${esc(DATA.name)}</div><h1>Record Book</h1></div>
        </div>
        <section class="card book">
          ${CATEGORIES.map(c => {
            const n = RECORDS[c.id]?.length;
            const inner = `
              <span class="book-icon">${icon(c.icon)}</span>
              <span class="book-title">${esc(c.title)}</span>
              <span class="book-desc">${esc(c.desc)}</span>
              <span class="book-count">${c.soon ? '<span class="soon-pill">Soon</span>' : `<b>${n}</b> records`}</span>
              <span class="book-arrow">${c.soon ? '' : icon('arrow')}</span>`;
            return c.soon
              ? `<div class="book-row is-soon">${inner}</div>`
              : `<a class="book-row" href="#/records/${c.id}">${inner}</a>`;
          }).join('')}
        </section>
        ${recentlyBroken()}
      </div>`;
    return;
  }

  if (cat.soon) {
    main.innerHTML = `
      <div class="page page-wide">
        <a class="back" href="#/records">${icon('back')} All categories</a>
        <div class="page-head">
          <div class="page-icon">${icon(cat.icon)}</div>
          <div><div class="eyebrow">Record Book</div><h1>${esc(cat.title)}</h1></div>
        </div>
        <section class="card soon-card"><p>These records are still being built.</p></section>
      </div>`;
    return;
  }

  const f = filterState(params);
  if (cat.table) f.stage = 'all'; // Front Office values moves by every locked point, so no Stage filter
  main.innerHTML = `
    <div class="page page-wide">
      ${filterBar(cat, f)}
      <p class="page-desc">${esc(cat.desc)}</p>
      <div id="rb-summary">${filterSummary(f)}</div>
      <div id="rb-results">${recordResults(cat, f)}</div>
    </div>`;

  main.querySelectorAll('select[data-f]').forEach(sel => sel.addEventListener('change', () => {
    const next = { ...filterState(route().params) };
    if (sel.dataset.f === 'cat') {
      location.hash = filterHash(sel.value, next);
      return;
    }
    next[sel.dataset.f] = sel.value;
    location.hash = filterHash(cat.id, next);
  }));

  // Search updates the results in place so the box keeps focus while typing.
  let timer;
  $('#rb-q', main).addEventListener('input', e => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const next = { ...filterState(route().params), q: e.target.value };
      history.replaceState(null, '', filterHash(cat.id, next));
      $('#rb-summary', main).innerHTML = filterSummary(next);
      $('#rb-results', main).innerHTML = recordResults(cat, next);
    }, 150);
  });
}

// ---------- Power Rankings ----------

const initials = s => String(s ?? '').replace(/[^A-Za-z0-9 ]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

function renderPower(main, params) {
  const seasons = powerSeasons(DATA);
  const withWeeks = seasons.filter(s => s.weeks.length);
  if (!withWeeks.length) {
    main.innerHTML = `<div class="page"><section class="card soon-card"><p>The first edition comes out after week 1.</p></section></div>`;
    return;
  }
  // Default: the latest edition of the latest season with games.
  const pick = withWeeks.find(s => s.season === params.get('season')) ?? withWeeks.at(-1);
  const wanted = Number(params.get('week'));
  const week = pick.weeks.includes(wanted) ? wanted : pick.weeks.at(-1);
  const ed = powerRankings(DATA, pick.season, week);
  const upcoming = seasons.filter(s => !s.weeks.length && s.season > withWeeks.at(-1).season);
  const isFinal = pick.complete && week === pick.weeks.at(-1);

  const seasonSelect = `
    <label class="ed-select">
      <span>${esc(pick.season)}</span>
      <svg class="caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5l3-3"/></svg>
      <select data-p="season" aria-label="Season">
        ${[...withWeeks].reverse().map(s => `<option value="${s.season}"${s.season === pick.season ? ' selected' : ''}>${s.season} season${s.complete ? '' : ' (in progress)'}</option>`).join('')}
        ${upcoming.map(s => `<option disabled>${s.season} season (starts after week 1)</option>`).join('')}
      </select>
    </label>`;
  const weekSelect = `
    <label class="ed-select ed-week">
      <span>After Week ${week}${isFinal ? ' · Final' : ''}</span>
      <svg class="caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5l3-3"/></svg>
      <select data-p="week" aria-label="Week">
        ${[...pick.weeks].reverse().map(w => `<option value="${w}"${w === week ? ' selected' : ''}>After Week ${w}${pick.complete && w === pick.weeks.at(-1) ? ' (final regular season)' : ''}</option>`).join('')}
      </select>
    </label>`;

  const bar = (label, v) => `
    <div class="pw-part">
      <div class="pw-part-label">${label}</div>
      <div class="pw-track"><span style="width:${Math.max(2, v)}%"></span></div>
      <div class="pw-part-val">${Math.round(v)}</div>
    </div>`;
  const move = m => (m == null || m === 0
    ? '<span class="pw-move pw-flat">–</span>'
    : m > 0 ? `<span class="pw-move pw-up">↑ ${m}</span>` : `<span class="pw-move pw-down">↓ ${-m}</span>`);

  main.innerHTML = `
    <div class="page page-wide">
      <div class="page-head">
        <div class="page-icon">${icon('gauge')}</div>
        <div><div class="eyebrow">The table is only part of the story.</div><h1>Power Rankings</h1></div>
        <div class="archive">
          <div class="archive-main"><div class="archive-kicker">Season</div><div class="pw-season">${esc(pick.season)}</div></div>
          <div class="archive-stat"><b>W${week}</b><span>Week</span></div>
        </div>
      </div>

      <div class="pw-edition">
        <span class="pw-ed-label">Edition</span>
        ${seasonSelect}
        ${weekSelect}
        <div class="pw-weights">
          ${PARTS.map(p => `<span class="pw-weight"><b>${Math.round(p.weight * 100)}%</b> ${esc(p.name)}</span>`).join('')}
        </div>
      </div>

      ${ed.weeksPlayed < 4 ? `<p class="filter-note">Early read · Scores stay close to 50 while results are limited. One big week is a signal, not a season verdict.</p>` : ''}

      <ol class="pw-list">
        ${ed.rows.map(r => `
          <li class="pw-row${r.rank === 1 ? ' pw-top' : ''}">
            <div class="pw-rank">${r.rank}</div>
            <div class="pw-team">
              ${move(r.move)}
              <span class="pw-badge">${esc(initials(r.team))}</span>
              <div class="pw-name">
                <div class="pw-team-name">${esc(r.team)}</div>
                <div class="pw-owner">${esc(name(r.owner))} · ${rec(r.w, r.l, r.t)}</div>
              </div>
            </div>
            <div class="pw-parts">
              ${bar('REC', r.rec)}${bar('STR', r.str)}${bar('FORM', r.form)}${bar('ROS', r.ros)}
            </div>
            <div class="pw-score">
              <b>${r.power.toFixed(1)}</b>
              <span class="pw-score-label">Power</span>
              <span class="pw-sched">${esc(scheduleLabel(r))}</span>
            </div>
          </li>`).join('')}
      </ol>

      <p class="pw-foot">
        Power is a relative score out of 100 where 50 is league average, not a win probability.
        <b>REC</b> is win %${DATA.seasons.find(s => s.season === pick.season)?.medianGame ? ' (league-median games included, as in Sleeper)' : ''}.
        <b>STR</b> blends points per game against the league with how often a team would have beaten everyone else each week (all-play).
        <b>FORM</b> is the same scoring measure over the last three weeks.
        <b>ROS</b> rates the opponents still to play: above 50 means a softer road ahead; it settles at 50 once the regular season is done.
        Every part starts near 50 and separates as weeks are played, and record needs more weeks than scoring to count fully.
        Arrows show movement since the previous week's edition.
      </p>
    </div>`;

  main.querySelectorAll('select[data-p]').forEach(sel => sel.addEventListener('change', () => {
    const p = new URLSearchParams();
    if (sel.dataset.p === 'season') p.set('season', sel.value); // newest week of that season
    else { p.set('season', pick.season); p.set('week', sel.value); }
    location.hash = `#/power?${p}`;
  }));
}

// ---------- Matchup Hype ----------
// The slate, Main event and labels come from assets/hype.js. Which week is out
// and the live scores come straight from Sleeper in the visitor's browser, so a
// week's hype appears the moment that week starts, not after the nightly update.

const SLEEPER = 'https://api.sleeper.com/v1';
const sleeper = async path => {
  const res = await fetch(`${SLEEPER}${path}?t=${Date.now()}`);
  if (!res.ok) throw new Error(`Sleeper returned ${res.status}`);
  return res.json();
};
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms))]);

const ctToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date());
const dayShift = (ymd, days) => {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const mondayOf = ymd => dayShift(ymd, -((new Date(`${ymd}T12:00:00Z`).getUTCDay() + 6) % 7));
const prettyDate = ymd => new Date(`${ymd}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' });

let HYPE_NOW; // { season, week, done, tipoff, reveal }: the week whose hype is out
let HYPE_TIMER;
const LIVE = {}; // "season|week" -> { scores, pairs, at }

// The last week of the current season, from last season's bracket length.
function lastWeekOf(s) {
  const prev = DATA.seasons.filter(x => x.status === 'complete').at(-1);
  const rounds = prev ? Math.max(...DATA.games.filter(g => g.s === prev.season).map(g => g.w)) - prev.playoffStart : 2;
  return s.playoffStart + rounds;
}

// Hype for a week comes out once that week is under way in Sleeper. Week 1
// comes out on the Monday of tip-off week.
async function hypeNow() {
  const cur = DATA.seasons.at(-1);
  let state = null;
  try { state = await withTimeout(sleeper('/state/nba'), 5000); } catch { /* fall back to the saved data */ }
  const out = { season: cur.season, week: 0, done: cur.status === 'complete', tipoff: state?.season_start_date ?? null };
  if (out.tipoff) out.reveal = mondayOf(out.tipoff);
  if (out.done) return out;
  if (state && state.league_season === cur.season) {
    if (state.season_type === 'pre') out.week = out.reveal && ctToday() >= out.reveal ? 1 : 0;
    else if (state.season_type === 'regular' || state.season_type === 'post') out.week = Math.max(state.week || 0, state.leg || 0);
  } else if (cur.weeksPlayed) {
    out.week = cur.weeksPlayed + 1;
  }
  if (out.week > lastWeekOf(cur)) { out.week = lastWeekOf(cur); out.over = true; }  return out;
}

// Live scores (and, in the playoffs, the bracket pairings) for the week under way.
async function liveWeek(season, week) {
  const key = `${season}|${week}`;
  if (LIVE[key] && Date.now() - LIVE[key].at < 60_000) return LIVE[key];
  const s = DATA.seasons.find(x => x.season === season);
  const ownerOf = Object.fromEntries(s.teams.map(t => [t.rosterId, t.owner]));
  const rows = await withTimeout(sleeper(`/league/${s.leagueId}/matchups/${week}`), 8000);
  const scores = {};
  const byMatch = {};
  for (const m of rows ?? []) {
    scores[ownerOf[m.roster_id]] = Math.round((m.custom_points ?? m.points ?? 0) * 10) / 10;
    if (m.matchup_id != null) (byMatch[m.matchup_id] ??= []).push(ownerOf[m.roster_id]);
  }
  let pairs = null;
  if (week >= s.playoffStart) {
    // Bracket games for this round. Rounds are one week each in this league.
    const [lg, wb, lb] = await Promise.all([
      sleeper(`/league/${s.leagueId}`), sleeper(`/league/${s.leagueId}/winners_bracket`), sleeper(`/league/${s.leagueId}/losers_bracket`),
    ]);
    const twoWeek = lg?.settings?.playoff_round_type === 2;
    const round = twoWeek ? Math.floor((week - s.playoffStart) / 2) + 1 : week - s.playoffStart + 1;
    const maxRound = Math.max(0, ...(wb ?? []).map(g => g.r));
    const label = g => (g.p === 1 ? 'Championship' : g.p ? `${g.p}${{ 1: 'st', 2: 'nd', 3: 'rd' }[g.p] ?? 'th'} place game`
      : g.r === maxRound - 1 ? 'Semifinal' : g.r === maxRound - 2 ? 'Quarterfinal' : `Playoff round ${g.r}`);
    const ok = g => g.r === round && typeof g.t1 === 'number' && typeof g.t2 === 'number';
    pairs = [
      ...(wb ?? []).filter(ok).map(g => ({ a: ownerOf[g.t1], b: ownerOf[g.t2], t: g.p && g.p !== 1 ? 'X' : 'P', label: label(g), final: null })),
      ...(lb ?? []).filter(ok).map(g => ({ a: ownerOf[g.t1], b: ownerOf[g.t2], t: 'X', label: g.p === 1 ? 'Last place game' : 'Consolation', final: null })),
    ];
  } else if (!weekPairs(DATA, season, week).length) {
    pairs = Object.values(byMatch).filter(x => x.length === 2).map(([a, b]) => ({ a, b, t: 'R', label: null, final: null }));
  }
  return (LIVE[key] = { scores, pairs, at: Date.now() });
}

const HYPE_TONES = { gold: 'hy-gold', red: 'hy-red', navy: 'hy-navy' };
const chip = l => `<span class="hy-chip ${HYPE_TONES[l.tone] ?? ''}">${l.id === 'main' ? icon('bolt') : ''}${esc(l.text)}</span>`;
const teamName = (o, season) => DATA.owners[o]?.teams?.[season] ?? name(o);

async function renderHype(main, params) {
  if (!HYPE_NOW) {
    main.innerHTML = '<div class="page"><div class="loading">Checking this week’s slate…</div></div>';
    HYPE_NOW = await hypeNow();
    if (route().page !== 'hype') return;
  }
  const now = HYPE_NOW;
  const cur = DATA.seasons.at(-1);
  const curOpen = now.done || now.week >= 1;

  // Seasons and weeks a visitor can pick: past seasons in full, the current one
  // only up to the week under way.
  const weeksFor = season => {
    let list = seasonWeeks(DATA, season);
    if (season === cur.season && !now.done) {
      for (let w = cur.playoffStart; w <= now.week; w++) if (!list.some(x => x.w === w)) list.push({ w, label: 'Playoffs' });
      list = list.sort((a, b) => a.w - b.w);
    }
    return list;
  };
  const seasons = DATA.seasons.filter(s => (s.season === cur.season ? curOpen : weeksFor(s.season).length && DATA.games.some(g => g.s === s.season)));
  if (!seasons.length) {
    main.innerHTML = `<div class="page"><section class="card soon-card"><p>Matchup Hype starts with week 1 of the season.</p></section></div>`;
    return;
  }
  const pickSeason = seasons.find(s => s.season === params.get('season')) ?? seasons.at(-1);
  const season = pickSeason.season;
  const isCur = season === cur.season && !now.done;
  const allWeeks = weeksFor(season);
  const open = isCur ? allWeeks.filter(x => x.w <= now.week) : allWeeks.filter(x => DATA.games.some(g => g.s === season && g.w === x.w));
  const wanted = Number(params.get('week'));
  const week = open.some(x => x.w === wanted) ? wanted : (isCur ? now.week : open.at(-1)?.w);
  const live = isCur && week === now.week && !DATA.games.some(g => g.s === season && g.w === week);

  let liveData = null;
  if (live) {
    try { liveData = await liveWeek(season, week); } catch { /* scores just won't be live */ }
    if (route().page !== 'hype') return;
  }
  const pairs = liveData?.pairs ?? weekPairs(DATA, season, week);
  const slate = hypeSlate(DATA, season, week, pairs);
  const g = slate.games.find(x => x.a === params.get('m') || x.b === params.get('m')) ?? slate.games[0];
  const isPlayoffWeek = week > slate.lastRegular;
  const weekLabel = w => {
    const x = allWeeks.find(y => y.w === w);
    return `Week ${w}${x?.label ? ` · ${x.label}` : ''}`;
  };

  const hash = changes => {
    const p = new URLSearchParams({ season, week, ...changes });
    return `#/hype?${p}`;
  };
  const seasonSelect = `
    <label class="ed-select">
      <span>${esc(season)}</span>
      <svg class="caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5l3-3"/></svg>
      <select data-h="season" aria-label="Season">
        ${!curOpen ? `<option disabled>${cur.season} season (hype starts ${now.reveal ? prettyDate(now.reveal) : 'week 1'})</option>` : ''}
        ${[...seasons].reverse().map(s => `<option value="${s.season}"${s.season === season ? ' selected' : ''}>${s.season} season${s.season === cur.season && !now.done ? ' (in progress)' : ''}</option>`).join('')}
      </select>
    </label>`;
  const nextWeek = isCur && allWeeks.find(x => x.w > now.week);
  const weekSelect = `
    <label class="hy-pick">
      <span class="hy-pick-label">Week</span>
      <span class="ed-select"><span>Week ${week}</span>
        <svg class="caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5l3-3"/></svg>
        <select data-h="week" aria-label="Week">
          ${nextWeek ? `<option disabled>Week ${nextWeek.w} · revealed when it starts</option>` : ''}
          ${[...open].reverse().map(x => `<option value="${x.w}"${x.w === week ? ' selected' : ''}>${esc(weekLabel(x.w))}${isCur && x.w === now.week ? ' (this week)' : ''}</option>`).join('')}
        </select>
      </span>
    </label>`;
  const matchSelect = g ? `
    <label class="hy-pick hy-pick-wide">
      <span class="hy-pick-label">Matchup</span>
      <span class="ed-select"><span class="hy-pick-val">${esc(g.labels[0]?.text ?? 'Matchup')} · ${esc(teamName(g.a, season))} vs ${esc(teamName(g.b, season))}</span>
        <svg class="caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5l3-3"/></svg>
        <select data-h="m" aria-label="Matchup">
          ${slate.games.map(x => `<option value="${esc(x.a)}"${x === g ? ' selected' : ''}>${esc(x.labels[0]?.text ?? 'Matchup')} · ${esc(teamName(x.a, season))} vs ${esc(teamName(x.b, season))}</option>`).join('')}
        </select>
      </span>
    </label>` : '';

  const head = `
    <div class="page-head">
      <div class="page-icon">${icon('bolt')}</div>
      <div><div class="eyebrow">The weekly matchup desk</div><h1>Matchup Hype</h1></div>
      <div class="archive">
        <div class="archive-main"><div class="archive-kicker">Season</div><div class="pw-season">${esc(season)}</div></div>
        <div class="archive-stat"><b>W${week}</b><span>${live ? 'This week' : 'Week'}</span></div>
      </div>
    </div>
    <div class="hy-controls">${seasonSelect}${weekSelect}${matchSelect}</div>
    ${!curOpen && now.tipoff ? `<p class="hy-banner">${icon('clock')}<span><b>The ${esc(cur.season)} season tips off ${esc(prettyDate(now.tipoff))}.</b> Week 1’s Main event and labels drop ${esc(prettyDate(now.reveal))}, the start of tip-off week. Each week stays under wraps until it starts. Until then, look back at past weeks.</span></p>` : ''}`;

  if (!g) {
    main.innerHTML = `<div class="page page-wide">${head}<section class="card soon-card"><p>${isPlayoffWeek ? 'The bracket matchups show up here once Sleeper sets them.' : 'No matchups found for this week.'}</p></section></div>`;
    bindHype(main, hash);
    return;
  }

  // ----- This week -----
  const A = g.a;
  const B = g.b;
  const score = o => {
    if (g.final) return o === A ? g.final.ap : g.final.bp;
    return liveData?.scores?.[o] ?? 0;
  };
  const pa = score(A);
  const pb = score(B);
  const lastSeason = slate.prevSeason;
  // Before any games, show last season's finish instead of a standing.
  const kicker = (o, t) => {
    if (t?.dec) return `Standing · No. ${t.rank}`;
    const place = lastSeason && finishPlace(lastSeason, o);
    return place ? `${lastSeason} finish · ${ordinalPlace(place)}` : 'Standing · —';
  };
  const sideCard = (o, t, cls) => {
    const av = avatarUrl(DATA.owners[o]?.avatar);
    return `
      <div class="hy-side ${cls}">
        ${av ? `<img class="hy-av" src="${av}" alt="" loading="lazy">` : `<span class="hy-av avatar-blank">${esc(name(o)[0])}</span>`}
        <div class="hy-kicker">${esc(kicker(o, t))}</div>
        <div class="hy-team">${esc(teamName(o, season))}</div>
        <div class="hy-owner">${esc(name(o))}</div>
        <div class="hy-rec">${t ? rec(t.w, t.l, t.t) : '—'}</div>
        <div class="hy-pts" data-o="${esc(o)}">${num(score(o))}</div>
        <div class="hy-pts-label">${g.final ? 'Final' : 'Points'}</div>
      </div>`;
  };
  const leadLine = () => {
    const x = score(A);
    const y = score(B);
    const total = num(x + y);
    if (g.final) {
      if (g.final.win === 'tie') return `Tied at ${num(x)} · ${total} combined points`;
      const w = g.final.win === 'A' ? A : B;
      return x === y ? `${esc(name(w))} advanced on the tiebreaker · ${total} combined points`
        : `${esc(name(w))} won by ${num(Math.abs(x - y))} · ${total} combined points`;
    }
    if (!x && !y) return 'No points on the board yet · tip-off pending';
    if (x === y) return `All square · ${total} combined live points`;
    return `${esc(name(x > y ? A : B))} leads by ${num(Math.abs(x - y))} · ${total} combined live points`;
  };
  const status = g.final ? 'Final' : live && liveData ? `Live · updated ${new Date(liveData.at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : 'Scores load from Sleeper';

  // ----- The hype -----
  const rankOnSlate = slate.games.indexOf(g) + 1;
  const hypeCard = `
    <section class="card hy-why">
      <div class="card-head"><h2>Why it’s hyped</h2><span class="card-sub">${g.main ? 'Matchup of the Week' : `No. ${rankOnSlate} of ${slate.games.length} on the slate`}</span></div>
      <div class="hy-why-grid">
        <ul class="hy-reasons">
          ${g.labels.length ? g.labels.map(l => `<li>${chip(l)}<span>${esc(l.why)}</span></li>`).join('')
            : '<li><span class="empty">Nothing special on paper. Sometimes those are the wild ones.</span></li>'}
        </ul>
        <div class="hy-meter">
          <div class="hy-score"><b>${g.hype}</b><span>Hype score</span></div>
          ${HYPE_PARTS.map(p => `
            <div class="pw-part">
              <div class="pw-part-label">${esc(p.name.toUpperCase())} <small>${Math.round(p.weight * 100)}%</small></div>
              <div class="pw-track"><span style="width:${Math.max(2, g.parts[p.id])}%"></span></div>
              <div class="pw-part-val">${Math.round(g.parts[p.id])}</div>
            </div>`).join('')}
        </div>
      </div>
    </section>`;

  // ----- All-time series (entering this week) -----
  const sr = g.series;
  const cell = (v, lead) => `<div class="hy-cell${lead ? ' lead' : ''}">${v}</div>`;
  const srow = (label, sub, a, b, la, lb) => `
    <div class="hy-srow">${cell(a, la)}<div class="hy-slabel">${label}${sub ? `<small>${sub}</small>` : ''}</div>${cell(b, lb)}</div>`;
  const lm = sr.last;
  const seriesCard = `
    <section class="card hy-series">
      <div class="card-head"><h2>${icon('history')} All-time series</h2><span class="card-sub">${sr.reg.n} regular-season meeting${sr.reg.n === 1 ? '' : 's'} · ${sr.reg.ties} tie${sr.reg.ties === 1 ? '' : 's'}${g.final ? ' · entering this game' : ''}</span></div>
      <div class="hy-stable">
        <div class="hy-srow hy-shead"><div>${esc(name(A))}</div><div>Head to head</div><div>${esc(name(B))}</div></div>
        ${srow('Regular-season wins', '', sr.reg.A, sr.reg.B, sr.reg.A > sr.reg.B, sr.reg.B > sr.reg.A)}
        ${srow('Playoff wins', `${sr.po.n} meeting${sr.po.n === 1 ? '' : 's'}`, sr.po.A, sr.po.B, sr.po.A > sr.po.B, sr.po.B > sr.po.A)}
        ${sr.other.n ? srow('Placement games', `${sr.other.n} meeting${sr.other.n === 1 ? '' : 's'}`, sr.other.A, sr.other.B, sr.other.A > sr.other.B, sr.other.B > sr.other.A) : ''}
        ${lm ? srow('Last meeting', `${lm.s} · Week ${lm.w}${lm.t === 'R' ? '' : ` · ${esc(lm.label)}`}`, num(lm.ap), num(lm.bp), lm.win === 'A', lm.win === 'B')
          : srow('Last meeting', 'Never played', '—', '—')}
        ${srow('Current win streak', '', sr.streak?.who === 'A' ? sr.streak.n : '—', sr.streak?.who === 'B' ? sr.streak.n : '—', sr.streak?.who === 'A', sr.streak?.who === 'B')}
      </div>
      <div class="hy-sfoot">${icon('trophy')} ${titleLine([...sr.titles.map(m => m.s), ...(g.label === 'Championship' ? [season] : [])])}
        · <a href="#/rivalry?a=${encodeURIComponent(A)}&b=${encodeURIComponent(B)}">Full rivalry</a></div>
    </section>`;

  // ----- Notable moments -----
  const mo = moments(DATA, sr, A, B);
  const moment = x => {
    const res = x.tie ? 'tie' : x.won ? 'win' : 'loss';
    return `
      <details class="hy-moment">
        <summary>
          <div class="hy-mo-text">
            <div class="hy-tier">${icon('bolt')}${esc(x.tier)}</div>
            <div class="hy-player">${esc(DATA.players[x.pid]?.n ?? `Player ${x.pid}`)}</div>
            <div class="hy-mo-meta">${esc(name(x.o))} · ${x.m.s} · Week ${x.m.w}</div>
          </div>
          <div class="hy-mo-pts"><b>${num(x.p)}</b><span>points</span></div>
          <svg class="caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5l3-3"/></svg>
        </summary>
        <p>${x.rivalryRank === 1 ? 'The best player week in this rivalry. ' : `No. ${x.rivalryRank} player week in this rivalry. `}Locked points in a ${num(x.teamScore)}–${num(x.oppScore)} ${res}${x.m.t === 'R' ? '' : ` (${esc(x.m.label)})`}, ${Math.round((x.p / (x.teamScore || 1)) * 100)}% of the team’s score. Better than ${Math.floor(x.pctile * 100)}% of every player week in league history.</p>
      </details>`;
  };
  const momentsCard = `
    <section class="card hy-moments">
      <div class="card-head"><h2>${icon('bolt')} Notable moments</h2><span class="card-sub hy-right">Player performances</span></div>
      ${mo.A.length || mo.B.length ? `
        <div class="hy-mo-grid">
          <div>${mo.A.map(moment).join('') || `<p class="empty">No standout weeks for ${esc(name(A))} yet.</p>`}</div>
          <div>${mo.B.map(moment).join('') || `<p class="empty">No standout weeks for ${esc(name(B))} yet.</p>`}</div>
        </div>` : '<p class="empty">No earlier meetings, so no moments yet. This one writes the first chapter.</p>'}
    </section>`;

  // ----- The rest of the slate -----
  const slateCard = `
    <section class="card hy-slate">
      <div class="card-head"><h2>The full slate</h2><span class="card-sub">Week ${week} · ranked by hype</span></div>
      ${slate.games.map((x, i) => {
        const sa = x.final ? x.final.ap : liveData?.scores?.[x.a];
        const sb = x.final ? x.final.bp : liveData?.scores?.[x.b];
        return `
        <a class="hy-game${x === g ? ' on' : ''}" href="${hash({ m: x.a })}">
          <span class="hy-g-rank">${i + 1}</span>
          <span class="hy-g-teams"><b>${esc(teamName(x.a, season))}</b> <i>vs</i> <b>${esc(teamName(x.b, season))}</b>
            <small>${x.labels.slice(0, 3).map(chip).join('')}</small></span>
          <span class="hy-g-score">${sa != null && (sa || sb) ? `${num(sa)}–${num(sb)}` : ''}</span>
          <span class="hy-g-hype"><b>${x.hype}</b><small>Hype</small></span>
        </a>`;
      }).join('')}
    </section>`;

  const lag = isCur && week === now.week && !isPlayoffWeek && (cur.weeksPlayed ?? 0) < week - 1;
  main.innerHTML = `
    <div class="page page-wide">
      ${head}
      <section class="card hy-this">
        <div class="hy-this-head"><h2>${live ? 'This week' : `Week ${week}`}${g.label ? ` <span class="tag tag-po">${esc(g.label)}</span>` : ''}</h2><span class="card-sub" id="hy-status">${esc(status)}</span></div>
        <div class="hy-duel">
          ${sideCard(A, g.tA, 'hy-dark')}
          <div class="hy-vs">VS</div>
          ${sideCard(B, g.tB, 'hy-light')}
        </div>
        <div class="hy-lead" id="hy-lead">${leadLine()}</div>
      </section>
      <p class="filter-note">Standings use win percentage (league-median games included, as in Sleeper), then points for. The head-to-head series leaves median games out.${lag ? ' Last week’s results arrive with the nightly update, so this week’s hype may shift slightly until then.' : ''}</p>
      ${g.labels.length ? `<div class="hy-tags">${g.labels.map(chip).join('')}</div>` : ''}
      ${hypeCard}
      ${seriesCard}
      ${momentsCard}
      ${slateCard}
      <p class="pw-foot">
        <b>How hype works.</b> Each game gets a hype score out of 100: <b>Quality</b> (30%) is how strong both teams are by their Power Rankings score,
        <b>Closeness</b> (25%) is how evenly matched they are, <b>Stakes</b> (25%) is what the result means for the playoff race (it grows as the season goes on) or the bracket round,
        and <b>History</b> (20%) is the rivalry: a close series, playoff and title meetings, a recent nail-biter, a long streak.
        Until six weeks are played, strength leans on last season’s finish. The top score is the <b>Main event</b>; in title week it’s always the Championship.
        Labels like <b>Trap-game watch</b> (a clear favorite with a reason to slip: the underdog won the last meeting, is hotter lately, or the favorite has a top team on deck next week) come from the same numbers.
        Everything uses only games played before that week, and each week is revealed only once it starts.
      </p>
    </div>`;

  bindHype(main, hash);

  // Keep live scores fresh while the week is being played.
  if (live && liveData) {
    HYPE_TIMER = setInterval(async () => {
      if (route().page !== 'hype') return clearInterval(HYPE_TIMER);
      try {
        const d = await liveWeek(season, week);
        liveData = d;
        main.querySelectorAll('.hy-pts[data-o]').forEach(el => { el.textContent = num(d.scores[el.dataset.o] ?? 0); });
        const lead = $('#hy-lead', main);
        if (lead) lead.innerHTML = leadLine();
        const st = $('#hy-status', main);
        if (st) st.textContent = `Live · updated ${new Date(d.at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
      } catch { /* try again next time */ }
    }, 60 * 60_000); // hourly; every visit also loads fresh scores
  }
}

let FINISHES;
const finishPlace = (season, owner) => (FINISHES ??= finishes(DATA))[season]?.[owner];

function bindHype(main, hash) {
  main.querySelectorAll('select[data-h]').forEach(sel => sel.addEventListener('change', () => {
    const key = sel.dataset.h;
    if (key === 'season') location.hash = `#/hype?season=${sel.value}`;
    else if (key === 'week') location.hash = hash({ week: sel.value });
    else location.hash = hash({ m: sel.value });
  }));
}

// ---------- Transactions ----------
// Every roster move, newest first, grouped by week (assets/transactions.js).
// The Value Desk adds what each move produced, from the Front Office numbers.

let TXLOG;
const TX_PAGE = 50;
let txShown = TX_PAGE;
let txKey = '';
const TX_PILL = { trades: ['Trade', 'tx-trade'], waivers: ['Waiver', 'tx-waiver'], fa: ['FA', 'tx-fa'], drops: ['Drop', 'tx-drop'], commish: ['Commish', 'tx-commish'] };
const shortDate = ts => (ts ? new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Chicago' }) : '');

function playerTag(pid) {
  const p = DATA.players?.[pid];
  const meta = [p?.pos, p?.t].filter(Boolean).join(' · ');
  return `<span class="tx-p">${esc(p?.n ?? `Player ${pid}`)}${meta ? ` <small>${esc(meta)}</small>` : ''}</span>`;
}

// Who a draft pick originally belonged to, from its roster ID.
function pickOwner(season, orig, fallbackSeason) {
  const teams = (DATA.seasons.find(s => s.season === season) ?? DATA.seasons.find(s => s.season === fallbackSeason))?.teams ?? [];
  return teams.find(t => t.rosterId === orig)?.owner;
}

function tradeBody(m) {
  if (!m.trade) return '';
  return m.trade.sides.map(sd => {
    const assets = sd.got.map(a => {
      if (!a.pick) return `<span class="tx-item"><i class="tx-in">→</i>${playerTag(a.pid)}</span>`;
      const [season, , round] = a.pick.split(' ');
      const raw = m.picks.find(p => `${p.season}|${p.round}|${p.orig}` === a.key);
      const orig = raw && pickOwner(season, raw.orig, m.s);
      const became = a.pid ? DATA.players?.[a.pid]?.n : null;
      const note = [orig && orig !== raw.from ? `orig. ${name(orig)}` : '', became ? `became ${became}` : ''].filter(Boolean).join(' · ');
      return `<span class="tx-item"><i class="tx-in">→</i><span class="tx-p">${season} Rd ${round} pick${note ? ` <small>${esc(note)}</small>` : ''}</span></span>`;
    });
    return `<div class="tx-side"><b>${esc(name(sd.o))}</b> gets ${assets.join('') || '<span class="tx-none">nothing</span>'}</div>`;
  }).join('');
}

function txFlow(m) {
  const who = esc(name(m.owners[0] ?? m.adds[0]?.o ?? m.drops[0]?.o));
  if (m.kind === 'trades') return [...new Set(m.owners)].map(o => esc(name(o))).join(` <i class="tx-swap">${icon('swap')}</i> `);
  if (m.kind === 'waivers') return `<em class="src-w">Waivers</em> → ${who}`;
  if (m.kind === 'fa') return `<em class="src-fa">Free agents</em> → ${who}`;
  if (m.kind === 'drops') return `${who} → <em class="src-w">Waivers</em>`;
  return `<em class="src-c">Commissioner</em> → ${who}`;
}

function txValue(m) {
  if (m.kind === 'trades' && m.trade) {
    const sides = m.trade.sides;
    const est = sides.some(sd => sd.est);
    const best = [...sides].sort((a, b) => b.net - a.net)[0];
    if (!best || best.net === 0) return `<b>Even</b><small>${est ? 'so far · Est.' : 'on value'}</small>`;
    return `<b class="v-pos">+${num(best.net)}</b><small>${esc(name(best.o))} ${est ? 'leads · Est.' : 'won it'}</small>`;
  }
  const out = [];
  const add = m.adds.find(a => a.pickup);
  if (add) out.push(`<b class="v-pos">${num(add.pickup.value)}${add.pickup.active ? '<i>*</i>' : ''}</b><small>pts for ${esc(name(add.o))}</small>`);
  const gone = m.drops.find(d => d.later);
  if (gone) {
    const l = gone.later;
    out.push(add
      ? `<small class="v-neg">drop: ${num(l.value)}${l.active ? '*' : ''} for ${esc(name(l.to))}</small>`
      : `<b class="v-neg">${num(l.value)}${l.active ? '<i>*</i>' : ''}</b><small>for ${esc(name(l.to))} after</small>`);
  }
  return out.join('') || '<span class="tx-dash">—</span>';
}

function txRow(m, desk) {
  const [label, cls] = TX_PILL[m.kind];
  const body = m.kind === 'trades' ? tradeBody(m)
    : [...m.adds.map(a => `<span class="tx-item"><i class="tx-in">→</i>${playerTag(a.pid)}</span>`),
      ...m.drops.map(d => `<span class="tx-item"><i class="tx-out">←</i>${playerTag(d.pid)}</span>`)].join('');
  return `
    <div class="tx-row${desk ? ' tx-desk' : ''}">
      <span class="tx-pill ${cls}">${label}</span>
      <div class="tx-body">${body}</div>
      <div class="tx-flow">${txFlow(m)}</div>
      ${desk ? `<div class="tx-val">${txValue(m)}</div>` : ''}
      <div class="tx-date">${shortDate(m.ts)}</div>
    </div>`;
}

function renderTransactions(main, params) {
  TXLOG ??= transactionLog(DATA, ledger());
  const kind = KINDS.some(([id]) => id === params.get('type')) ? params.get('type') : 'all';
  const seasons = [...new Set(TXLOG.map(m => m.s))].sort().reverse();
  const season = seasons.includes(params.get('season')) ? params.get('season') : 'all';
  const manager = DATA.owners[params.get('manager')] ? params.get('manager') : 'all';
  const desk = true; // the Value Desk is always on
  const key = `${kind}|${season}|${manager}`;
  if (key !== txKey) { txKey = key; txShown = TX_PAGE; }

  const scoped = TXLOG.filter(m => (season === 'all' || m.s === season) && (manager === 'all' || m.owners.includes(manager)));
  const list = scoped.filter(m => matchesKind(m, kind));
  const shown = list.slice(0, txShown);
  const totals = ledgerTotals(scoped);
  // Everyone: the busiest manager. One manager: where they rank in moves.
  const { ranking } = ledgerTotals(TXLOG.filter(m => season === 'all' || m.s === season));
  const rankOf = manager === 'all' ? -1 : ranking.findIndex(x => x.o === manager);
  const lastStat = manager === 'all'
    ? `<span>${icon('users')} Busiest</span><b>${totals.busiest ? totals.busiest.n : '—'} <small>${totals.busiest ? esc(name(totals.busiest.o)) : ''}</small></b>`
    : `<span>${icon('users')} Activity rank</span><b>${rankOf >= 0 ? `#${rankOf + 1}` : '—'} <small>of ${ranking.length} managers</small></b>`;

  const hash = changes => {
    const p = new URLSearchParams();
    const next = { type: kind, season, manager, ...changes };
    if (next.type !== 'all') p.set('type', next.type);
    if (next.season !== 'all') p.set('season', next.season);
    if (next.manager !== 'all') p.set('manager', next.manager);
    const qs = p.toString();
    return `#/transactions${qs ? `?${qs}` : ''}`;
  };
  const { current, former } = ownerOrder();
  const pick = (key, label, value, options) => `
    <label class="hy-pick">
      <span class="hy-pick-label">${label}</span>
      <span class="ed-select"><span class="hy-pick-val">${esc(options.find(([id]) => id === value)?.[1] ?? '')}</span>
        <svg class="caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5l3-3"/></svg>
        <select data-t="${key}" aria-label="${label}">
          ${options.map(([id, text]) => `<option value="${esc(id)}"${id === value ? ' selected' : ''}>${esc(text)}</option>`).join('')}
        </select>
      </span>
    </label>`;

  // Week groups, newest first.
  const groups = [];
  for (const m of shown) {
    const g = groups.at(-1);
    if (g && g.s === m.s && g.w === m.w) g.moves.push(m);
    else groups.push({ s: m.s, w: m.w, moves: [m] });
  }
  const scopeName = [season === 'all' ? 'All-time' : season, manager === 'all' ? '' : name(manager)].filter(Boolean).join(' · ');

  main.innerHTML = `
    <div class="page page-wide">
      <div class="page-head">
        <div class="page-icon">${icon('swap')}</div>
        <div><div class="eyebrow">Front office</div><h1>Transactions</h1></div>
      </div>

      <div class="tx-controls">
        <nav class="tx-tabs" aria-label="Move type">
          ${KINDS.map(([id, label]) => `<a class="${id === kind ? 'on' : ''}" href="${hash({ type: id })}">${label}</a>`).join('')}
        </nav>
        ${pick('season', 'Season', season, [['all', 'All-time'], ...seasons.map(s => [s, s])])}
        ${pick('manager', 'Manager', manager, [['all', 'Everyone'], ...current.map(id => [id, name(id)]), ...former.map(id => [id, `${name(id)} (former)`])])}
        <span class="tx-count">${shown.length} of ${list.length} · newest first</span>
      </div>

      <section class="tx-ledger">
        <div class="tx-ledger-main"><b>The Ledger</b><span>${esc(scopeName)}</span></div>
        <div class="tx-stat"><span>${icon('swap')} Trades</span><b>${totals.trades}</b></div>
        <div class="tx-stat"><span>${icon('clipboard')} Waivers</span><b>${totals.waivers}</b></div>
        <div class="tx-stat"><span>${icon('users')} Adds / drops</span><b>${totals.addsDrops}</b></div>
        <div class="tx-stat"><span>${icon('history')} Total moves</span><b>${totals.total}</b></div>
        <div class="tx-stat">${lastStat}</div>
      </section>

      <section class="tx-deskbar">
        <div><h2>The Value Desk</h2><p>Which moves paid off in starting-lineup points. Pickups show the locked points the player scored for the team that added him, until he left. Drops show what he scored for the next team that picked him up. Trades show who’s ahead. * still on that roster, so the value is still growing.</p></div>
      </section>

      ${list.length ? `
        <div class="tx-timeline">
          ${groups.map(g => {
            const all = list.filter(m => m.s === g.s && m.w === g.w);
            const trades = all.filter(m => m.kind === 'trades').length;
            const ts = all.map(m => m.ts).filter(Boolean);
            const from = shortDate(Math.min(...ts));
            const to = shortDate(Math.max(...ts));
            return `
            <section class="tx-week">
              <div class="tx-week-head">
                <span><b>Wk ${g.w}</b> · ${g.s}${ts.length ? ` <small>${from === to ? from : `${from} – ${to}`}</small>` : ''}</span>
                <span class="tx-week-n"><b>${all.length}</b> move${all.length === 1 ? '' : 's'}${trades ? ` <b>${trades}</b> trade${trades === 1 ? '' : 's'}` : ''}</span>
              </div>
              ${g.moves.map(m => txRow(m, desk)).join('')}
            </section>`;
          }).join('')}
        </div>
        ${shown.length < list.length ? `<div class="tx-more"><button class="tx-morebtn" type="button">Load more (showing ${shown.length} of ${list.length})</button></div>` : ''}`
        : '<section class="card soon-card"><p>No moves match these filters.</p></section>'}
      <p class="pw-foot">Sleeper files offseason moves under week 1 of the new season. Commissioner moves count in the total but not toward the busiest manager. NBA teams are each player’s current team.</p>
    </div>`;

  main.querySelectorAll('select[data-t]').forEach(sel => sel.addEventListener('change', () => {
    location.hash = hash({ [sel.dataset.t]: sel.value });
  }));
  $('.tx-morebtn', main)?.addEventListener('click', () => {
    txShown += TX_PAGE;
    renderTransactions(main, params);
  });
}

// ---------- Awards ----------
// Banners for completed seasons, each with its GM of the Year (assets/awards.js).

const signedPts = n => `${n > 0 ? '+' : n < 0 ? '−' : ''}${num(Math.abs(n))}`;

function assetName(a) {
  if (!a.pick) return DATA.players?.[a.pid]?.n ?? `Player ${a.pid}`;
  const [season, , round] = a.pick.split(' ');
  const became = a.pid ? DATA.players?.[a.pid]?.n : null;
  return `${season} Rd ${round} pick${became ? ` (${became})` : ''}`;
}

function gmMove(m) {
  const pl = pid => DATA.players?.[pid]?.n ?? `Player ${pid}`;
  const starts = n => `${n} start${n === 1 ? '' : 's'}`;
  const what = m.kind === 'trade'
    ? `Trade with ${m.with.map(name).join(' & ')}: got ${m.got.map(assetName).join(', ') || 'nothing'} for ${m.gave.map(assetName).join(', ') || 'nothing'}`
    : m.kind === 'claim' ? `Claimed ${pl(m.pid)} off waivers (${starts(m.starts)})`
    : m.kind === 'pickup' ? `Picked up ${pl(m.pid)} (${starts(m.starts)})`
    : m.kind === 'rookie' ? `Drafted ${pl(m.pid)} (round ${m.round}, pick ${m.no})`
    : `Dropped ${pl(m.pid)}, who made ${starts(m.starts)} for ${name(m.to)}`;
  return `<li><span>${esc(what)}</span><b class="${m.value >= 0 ? 'v-pos' : 'v-neg'}">${signedPts(m.value)}</b></li>`;
}

function renderAwards(main) {
  const done = DATA.seasons.filter(s => s.status === 'complete' && s.champion).map(s => s.season).reverse();
  if (!done.length) {
    main.innerHTML = '<div class="page"><section class="card soon-card"><p>The first banner goes up when the first season is complete.</p></section></div>';
    return;
  }
  const fo = ledger();
  const banners = done.map(s => ({ ...banner(DATA, s), gm: gmOfTheYear(DATA, fo, s), poy: playerOfTheYear(DATA, s), mvp: mvpRace(DATA, fo, s),
    finalsMvp: championshipMvp(DATA, s), stars: allStars(DATA, fo, s, ALL_STAR_POSITIONS, ALL_STARS_FROM),
    allFantasy: allFantasy(DATA, fo, s), rookies: rookieClass(DATA, fo, s) }));
  // A player's fantasy team: o null = on no roster; undefined = not known.
  const fteam = (o, s) => (o === null ? 'Free agent' : o ? teamName(o, s) : '');
  const fteamFull = (o, s) => (o === null ? 'Free agent' : o ? `${teamName(o, s)} (${name(o)})` : '');
  const sub = (s, r, ...rest) => [fteam(r.o, s), pmeta(r.pid), ...rest].filter(Boolean).join(' · ');
  const longDate = ymd => new Date(`${ymd}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' });
  const pname = pid => DATA.players?.[pid]?.n ?? `Player ${pid}`;
  // Position only: Sleeper's NBA team is today's, which would be wrong for past seasons.
  const pmeta = pid => DATA.players?.[pid]?.pos ?? '';
  // Top-3 race list for Player of the Year and League MVP.
  const raceList = (rows, value, sub) => `<ol class="aw-race">${rows.map((r, i) => `
    <li${i === 0 ? ' class="win"' : ''}><span>${i + 1}. ${esc(pname(r.pid))}<small>${esc(sub(r))}</small></span><b>${value(r)}</b></li>`).join('')}</ol>`;
  const champs = {};
  for (const b of [...banners].reverse()) (champs[b.champ] ??= []).push(b.season);
  const multi = Object.entries(champs).filter(([, list]) => list.length >= 2);
  const once = Object.entries(champs).filter(([, list]) => list.length === 1);
  const latest = banners[0];
  const chips = list => list.map(([o, seasons]) => `<span class="aw-chip">${esc(name(o))} ${seasons.map(yy).join(' ')}</span>`).join('');

  main.innerHTML = `
    <div class="page page-wide">
      <div class="page-head">
        <div class="page-icon">${icon('trophy')}</div>
        <div><div class="eyebrow">Hung from the rafters · Est. ${esc(done.at(-1))}</div><h1>Awards</h1></div>
        <div class="archive">
          <div class="archive-main">
            <div class="archive-kicker">Defending champion</div>
            <div class="archive-name">${esc(name(latest.champ))}</div>
            <div class="archive-sub">${esc(latest.season)} season</div>
          </div>
          <div class="archive-stat"><b>${banners.length}</b><span>Banners</span></div>
          <div class="archive-stat"><b>${Object.keys(champs).length}</b><span>Champions</span></div>
        </div>
      </div>

      <div class="aw-groups">
        ${multi.length ? `
          <section class="card aw-group">
            <div><div class="eyebrow">Multiple rings</div><h2 class="aw-group-title">Dynasty</h2><p class="card-sub">Managers with more than one banner</p><div class="aw-chips">${chips(multi)}</div></div>
            <b class="aw-group-n">${multi.length}</b>
          </section>` : ''}
        ${once.length ? `
          <section class="card aw-group">
            <div><div class="eyebrow">One shining moment</div><h2 class="aw-group-title">The field</h2><p class="card-sub">One-time champions</p><div class="aw-chips">${chips(once)}</div></div>
            <b class="aw-group-n">${once.length}</b>
          </section>` : ''}
      </div>

      <div class="aw-rule">
        <h2>Every banner</h2><span class="aw-range">${esc(done.at(-1))}${done.length > 1 ? ` – ${esc(done[0])}` : ''}</span>
        <span class="aw-line"></span><span class="aw-note">Title game · winner’s score first</span>
      </div>

      <div class="aw-grid">
        ${banners.map((b, i) => {
          const gm = b.gm.winner;
          const race = b.gm.rows.filter(r => r.eligible);
          return `
          <article class="aw-banner">
            <div class="aw-top"><span class="aw-year">${esc(b.season)}</span><span class="aw-tag">${i === 0 ? 'Reigning' : 'Champion'}</span></div>
            <div class="aw-body">
              <div class="aw-champ">
                <div class="aw-label">League champion</div>
                <div class="aw-name">${esc(name(b.champ))}</div>
                <div class="aw-team">${esc(teamName(b.champ, b.season))}</div>
                ${b.finalsMvp ? `<div class="aw-fmvp">${icon('medal')}<span>Championship MVP</span><b>${esc(pname(b.finalsMvp.pid))}</b><small>${num(b.finalsMvp.pts)} pts</small></div>` : ''}
                ${b.won ? `
                  <div class="aw-score"><b>${num(b.won.pts)}</b> – ${num(b.won.oppPts)}</div>
                  <div class="aw-meta">def. ${esc(name(b.won.opp))}</div>
                  <div class="aw-meta">${b.won.pts === b.won.oppPts ? 'Won on the tiebreaker' : `Won by ${num(b.won.pts - b.won.oppPts)}`} · Week ${b.week}</div>` : ''}
              </div>
              ${b.record ? `<div class="aw-row"><span>Regular season</span><b>${rec(b.record.w, b.record.l, b.record.t)} · ${ordinalPlace(b.seed)}</b></div>` : ''}
              <ol class="aw-awards">
                <li>
                  <span class="aw-num">01</span>
                  <div class="aw-award">
                    <div class="aw-label">GM of the Year</div>
                    ${gm ? `
                      <div class="aw-winner">${esc(name(gm.o))} <b class="${gm.total >= 0 ? 'v-pos' : 'v-neg'}">${signedPts(gm.total)} pts</b></div>
                      <div class="aw-meta">Trades ${signedPts(gm.trades)} · Pickups ${signedPts(gm.pickups)} · Rookies ${signedPts(gm.rookies)} · Drops ${signedPts(gm.drops)}</div>
                      <details class="aw-more">
                        <summary>Biggest moves and the race ${icon('arrow')}</summary>
                        <ul class="aw-moves">${gm.moves.slice(0, 5).map(gmMove).join('') || '<li><span>No moves counted.</span></li>'}</ul>
                        <div class="aw-race-title">The race · playoff teams</div>
                        <ol class="aw-race">${race.map(r => `<li${r === gm ? ' class="win"' : ''}><span>${esc(name(r.o))}</span><b>${signedPts(r.total)}</b></li>`).join('')}</ol>
                      </details>` : '<div class="aw-meta">No playoff teams recorded.</div>'}
                  </div>
                </li>
                <li>
                  <span class="aw-num">02</span>
                  <div class="aw-award">
                    <div class="aw-label">Player of the Year</div>
                    ${b.poy.length ? `
                      <div class="aw-winner">${esc(pname(b.poy[0].pid))}${pmeta(b.poy[0].pid) ? ` <small class="aw-pos">${esc(pmeta(b.poy[0].pid))}</small>` : ''}</div>
                      <div class="aw-meta aw-fteam">${esc(fteamFull(b.poy[0].team, b.season))}</div>
                      <div class="aw-meta">${num(b.poy[0].pts)} locked pts${b.poy[0].multi ? ' (most for this team; he also started for others)' : ''}</div>
                      <details class="aw-more">
                        <summary>The race · top 3 ${icon('arrow')}</summary>
                        ${raceList(b.poy, r => `${num(r.pts)}`, r => `${r.weeks} weeks started · ${Object.entries(r.teams).sort((x, y) => y[1] - x[1]).map(([o, p]) => `${teamName(o, b.season)}${r.multi ? ` ${num(p)}` : ''}`).join(', ')}`)}
                      </details>` : '<div class="aw-meta">No locked points recorded.</div>'}
                  </div>
                </li>
                <li>
                  <span class="aw-num">03</span>
                  <div class="aw-award">
                    <div class="aw-label">League MVP</div>
                    ${b.mvp.length ? `
                      <div class="aw-winner">${esc(pname(b.mvp[0].pid))}${pmeta(b.mvp[0].pid) ? ` <small class="aw-pos">${esc(pmeta(b.mvp[0].pid))}</small>` : ''}</div>
                      <div class="aw-meta aw-fteam">${esc(fteamFull(b.mvp[0].o, b.season))}</div>
                      <div class="aw-meta">${num(b.mvp[0].fp)} fantasy pts in ${b.mvp[0].gp} games</div>
                      <details class="aw-more">
                        <summary>The race · top 3 ${icon('arrow')}</summary>
                        ${raceList(b.mvp, r => `${num(r.fp)}`, r => [fteam(r.o, b.season), `${r.gp} games`, `${num(r.fp / Math.max(1, r.gp))} per game`].filter(Boolean).join(' · '))}
                      </details>` : '<div class="aw-meta">Added with the next nightly update.</div>'}
                  </div>
                </li>
                <li>
                  <span class="aw-num">04</span>
                  <div class="aw-award">
                    <div class="aw-label">Rookie of the Year</div>
                    ${b.rookies.roy ? `
                      <div class="aw-winner">${esc(pname(b.rookies.roy.pid))}${pmeta(b.rookies.roy.pid) ? ` <small class="aw-pos">${esc(pmeta(b.rookies.roy.pid))}</small>` : ''}</div>
                      <div class="aw-meta aw-fteam">${esc(fteamFull(b.rookies.roy.o, b.season))}</div>
                      <div class="aw-meta">${num(b.rookies.roy.fp)} fantasy pts in ${b.rookies.roy.gp} games</div>` : '<div class="aw-meta">Added with the next nightly update.</div>'}
                  </div>
                </li>
                <li>
                  <span class="aw-num">05</span>
                  <div class="aw-award">
                    <div class="aw-label">All-Stars</div>
                    ${b.stars && !b.stars.awarded ? `<div class="aw-meta">First named in ${esc(ALL_STARS_FROM)}.</div>` : b.stars ? `
                      <div class="aw-winner">${Object.values(b.stars.teams).flat().length} players</div>
                      <div class="aw-meta">Top 5 guards, forwards and centers in total fantasy points through ${esc(longDate(b.stars.through))}</div>
                      <details class="aw-more">
                        <summary>The All-Star teams ${icon('arrow')}</summary>
                        <div class="aw-stars">
                          ${POSITION_GROUPS.map(([g, label]) => `
                            <div>
                              <div class="aw-race-title">${label}</div>
                              <ol class="aw-race">${b.stars.teams[g].map((p, i) => `<li${i === 0 ? ' class="win"' : ''}><span>${esc(pname(p.pid))}<small>${esc([fteam(p.o, b.season), p.pos, `${p.gp} games`].filter(Boolean).join(' · '))}</small></span><b>${num(p.fp)}</b></li>`).join('')}</ol>
                            </div>`).join('')}
                        </div>
                      </details>` : '<div class="aw-meta">Added with the next nightly update.</div>'}
                  </div>
                </li>
                <li>
                  <span class="aw-num">06</span>
                  <div class="aw-award">
                    <div class="aw-label">All-Fantasy Team</div>
                    ${b.allFantasy.length ? `
                      <div class="aw-winner">${b.allFantasy.length} players</div>
                      <div class="aw-meta">The top ${b.allFantasy.length} in total fantasy points, any position</div>
                      <details class="aw-more">
                        <summary>The team ${icon('arrow')}</summary>
                        ${raceList(b.allFantasy, r => `${num(r.fp)}`, r => sub(b.season, r, `${r.gp} games`))}
                      </details>` : '<div class="aw-meta">Added with the next nightly update.</div>'}
                  </div>
                </li>
                <li>
                  <span class="aw-num">07</span>
                  <div class="aw-award">
                    <div class="aw-label">All-Rookie Team</div>
                    ${b.rookies.team.length ? `
                      <div class="aw-winner">${b.rookies.team.length} players</div>
                      <div class="aw-meta">The top ${b.rookies.team.length === 5 ? 5 : `5 (${b.rookies.team.length} with a tie)`} rookies in total fantasy points</div>
                      <details class="aw-more">
                        <summary>The team ${icon('arrow')}</summary>
                        ${raceList(b.rookies.team, r => `${num(r.fp)}`, r => sub(b.season, r, `${r.gp} games`))}
                      </details>` : '<div class="aw-meta">Added with the next nightly update.</div>'}
                  </div>
                </li>
              </ol>
            </div>
            <a class="aw-recap" href="#/standings?tab=table&period=${encodeURIComponent(b.season)}">Season recap ${icon('arrow')}</a>
          </article>`;
        }).join('')}
      </div>

      <section class="lg-behind">
        <div class="lg-behind-head"><h2>How the awards are decided</h2><span>In plain English</span></div>
        <div class="aw-rules">
          <article class="aw-rule-block">
            <h3><span class="aw-num">01</span> GM of the Year</h3>
            <p>Goes to the playoff team whose moves that season added the most locked points that season, regular season and playoffs included. Only moves made that season count, and only the points they produced that season, so the award is settled the day the season ends. A manager’s total adds up four parts:</p>
            <dl class="aw-parts">
              <div><dt>Trades</dt><dd>Locked points from everything he received, minus what the other team got from what he gave up. A draft pick counts as the player it became. The same math as the Value Desk, limited to that season.</dd></div>
              <div><dt>Pickups</dt><dd>Waiver claims and free-agent adds count only if the player became a regular: at least ${REGULAR_WEEKS} weeks in his starting lineup that season. Streaming volume alone doesn’t win it.</dd></div>
              <div><dt>Rookies</dt><dd>Locked points his rookie-draft picks scored for him that season.</dd></div>
              <div><dt>Drops</dt><dd>Count against him: what a player he dropped scored for the next team that picked him up, if he became a regular there (the same ${REGULAR_WEEKS}-week rule).</dd></div>
            </dl>
            <p class="aw-rule-fine">Commissioner moves aren’t a manager’s decision and are left out. Only playoff teams are eligible; “the race” on each banner lists them all.</p>
          </article>
          <article class="aw-rule-block">
            <h3><span class="aw-num">02</span> Player of the Year</h3>
            <p>The player with the most locked points that season, regular season and playoffs included: the points he actually scored in this league’s starting lineups. A player traded mid-season keeps his points from every team he started for; the banner names the team he scored the most for. The race shows the top 3.</p>
          </article>
          <article class="aw-rule-block">
            <h3><span class="aw-num">03</span> League MVP</h3>
            <p>The player with the most fantasy points over the whole NBA regular season, scored with this league’s settings for that season, whether or not anyone started him (or even rostered him). It measures the best fantasy season in the NBA; Player of the Year measures what counted here. The race shows the top 3.</p>
          </article>
          <article class="aw-rule-block">
            <h3><span class="aw-num">04</span> Rookie of the Year</h3>
            <p>The rookie with the most total fantasy points over the NBA regular season, scored with this league’s settings, rostered or not. A rookie is a player in his first NBA season: no NBA games in any of the 10 seasons before.</p>
          </article>
          <article class="aw-rule-block">
            <h3><span class="aw-num">05</span> All-Stars</h3>
            <p>Named at the NBA All-Star break, starting in ${esc(ALL_STARS_FROM)}: the 15 players with the most total fantasy points (every game, this league’s scoring, rostered or not) through the last regular-season game before the All-Star Game. Five per position, by primary position that season:</p>
            <dl class="aw-parts">
              <div><dt>Guards</dt><dd>Point guards and shooting guards (PG, SG).</dd></div>
              <div><dt>Forwards</dt><dd>Small forwards and power forwards (SF, PF).</dd></div>
              <div><dt>Centers</dt><dd>Centers (C).</dd></div>
            </dl>
            <p class="aw-rule-fine">All-Star Weekend exhibitions (Rising Stars and the All-Star Game) don’t count.</p>
          </article>
          <article class="aw-rule-block">
            <h3><span class="aw-num">06</span> All-Fantasy Team</h3>
            <p>The 10 players with the most total fantasy points over the NBA regular season, any position: the same season totals as League MVP, so the MVP leads it.</p>
          </article>
          <article class="aw-rule-block">
            <h3><span class="aw-num">07</span> All-Rookie Team</h3>
            <p>The 5 rookies with the most total fantasy points over the NBA regular season (same rookie rule as Rookie of the Year, who leads it).</p>
          </article>
          <p class="aw-rule-fine">Teams list everyone tied with the last player in, so a tie can make a team one bigger.</p>
          <article class="aw-rule-block">
            <h3><span class="aw-num">${icon('medal')}</span> Championship MVP</h3>
            <p>Shown with each champion: the player on the winning team with the most locked points in the championship game.</p>
          </article>
        </div>
        <p class="lg-fine">Bench points never count toward GM or Player of the Year: only locked points do. League MVP is the one award that looks past this league’s lineups. Each player is shown with the fantasy team that had him at the end of the season (All-Stars: at the All-Star break; Player of the Year: the team he scored the most for), or “Free agent” if no one did. Season recap opens that season’s standings.</p>
      </section>
    </div>`;
}

// ---------- Player Index ----------
// Every player's locked points (assets/players.js), searchable, with season and
// manager filters and a breakdown by fantasy team.

const PI_PAGE = 50;
const PI_MIN_STARTS = 5;
let piShown = PI_PAGE;
let piKey = '';
const PI_CACHE = {};
const plainText = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function piState(params) {
  const seasons = DATA.seasons.filter(s => s.weeksPlayed).map(s => s.season);
  return {
    q: params.get('q') ?? '',
    season: seasons.includes(params.get('season')) ? params.get('season') : 'all',
    manager: DATA.owners[params.get('manager')] ? params.get('manager') : 'all',
    sort: SORTS.some(([id]) => id === params.get('sort')) ? params.get('sort') : 'pts',
  };
}

function piHash(f) {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  if (f.season !== 'all') p.set('season', f.season);
  if (f.manager !== 'all') p.set('manager', f.manager);
  if (f.sort !== 'pts') p.set('sort', f.sort);
  const qs = p.toString();
  return `#/players${qs ? `?${qs}` : ''}`;
}

// The filtered, sorted list (ranks come from the full list, before the search).
function piRows(f) {
  const key = `${f.season}|${f.manager}`;
  const all = (PI_CACHE[key] ??= playerIndex(DATA, f));
  const val = SORTS.find(([id]) => id === f.sort)[2];
  // Per-start averages rank players with enough starts first, so one big week can't top the list.
  const enough = r => (f.sort === 'avg' ? (r.weeks >= PI_MIN_STARTS ? 1 : 0) : 0);
  const ranked = [...all].sort((a, b) => enough(b) - enough(a) || val(b) - val(a) || b.pts - a.pts)
    .map((r, i) => ({ ...r, rank: i + 1 }));
  const q = plainText(f.q.trim());
  return { total: all.length, rows: q ? ranked.filter(r => plainText(DATA.players?.[r.pid]?.n).includes(q)) : ranked };
}

function piRow(r, f) {
  const p = DATA.players?.[r.pid];
  const teams = o => [...new Set(o.seasons.map(s => teamName(o.o, s)))].join(' / ');
  const seasons = list => (list.length > 1 ? `${list[0]}–${list.at(-1)}` : list[0]);
  return `
    <details class="pi-row">
      <summary><div class="row-grid">
        <span class="pi-rank">${r.rank}</span>
        <span class="pi-who">
          <img class="pi-img" src="${esc(playerPhoto(DATA, r.pid))}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">
          <span><b>${esc(p?.n ?? `Player ${r.pid}`)}</b><small>${esc([p?.pos, `${r.owners.length} fantasy team${r.owners.length === 1 ? '' : 's'}`].filter(Boolean).join(' · '))}</small>
            <small class="pi-meta">${r.weeks} weeks · ${num(r.avg)} per start</small></span>
        </span>
        <span class="pi-num">${r.weeks}</span>
        <span class="pi-num">${num(r.avg)}</span>
        <span class="pi-pts">${num(r.pts)}<small>locked pts</small></span>
        <span class="pi-open">${icon('arrow')}</span>
      </div></summary>
      <div class="pi-detail">
        <div class="pi-sub pi-sub-head"><span>Fantasy team</span><span>Seasons</span><span>Weeks</span><span>Locked pts</span></div>
        ${r.owners.map(o => `
          <div class="pi-sub">
            <span><b>${esc(teams(o))}</b><small>${esc(name(o.o))}</small>
              <span class="pi-bar"><i style="width:${Math.max(2, (o.pts / (r.pts || 1)) * 100)}%"></i></span></span>
            <span data-l="Seasons">${esc(seasons(o.seasons))}</span>
            <span data-l="Weeks">${o.weeks}</span>
            <span data-l="Locked pts"><b>${num(o.pts)}</b> <small>${Math.round((o.pts / (r.pts || 1)) * 100)}%</small></span>
          </div>`).join('')}
        ${f.season === 'all' && r.seasons.length > 1 ? `<p class="pi-seasons">By season: ${r.seasons.map(x => `<span><b>${x.s}</b> ${num(x.pts)}</span>`).join('')}</p>` : ''}
      </div>
    </details>`;
}

function piResults(f) {
  const { total, rows } = piRows(f);
  const shown = rows.slice(0, piShown);
  const by = SORTS.find(([id]) => id === f.sort)[1];
  const scope = [f.season === 'all' ? 'all-time' : `the ${f.season} season`, f.manager === 'all' ? '' : `for ${name(f.manager)}’s teams only`].filter(Boolean).join(', ');
  return `
    <p class="filter-note">${f.q ? `${rows.length} of ${total} players match “${esc(f.q)}”` : `${total} players`} · ${esc(scope)} · ranked by ${esc(by.toLowerCase())}${f.sort === 'avg' ? ` (players with ${PI_MIN_STARTS}+ starts first)` : ''}</p>
    ${rows.length ? `
      <section class="pi-table">
        <div class="pi-head"><span>#</span><span>Player</span><span>Weeks</span><span>Per start</span><span>Locked pts</span><span></span></div>
        ${shown.map(r => piRow(r, f)).join('')}
      </section>
      ${shown.length < rows.length ? `<div class="tx-more"><button class="tx-morebtn pi-more" type="button">Load more (showing ${shown.length} of ${rows.length})</button></div>` : ''}`
      : '<section class="card soon-card"><p>No players match. Try a different spelling or filter.</p></section>'}`;
}

function renderPlayers(main, params) {
  const f = piState(params);
  const key = `${f.season}|${f.manager}|${f.sort}|${f.q}`;
  if (key !== piKey) { piKey = key; piShown = PI_PAGE; }
  const seasons = DATA.seasons.filter(s => s.weeksPlayed).map(s => s.season).reverse();
  const { current, former } = ownerOrder();
  const all = PI_CACHE['all|all'] ??= playerIndex(DATA);
  const pick = (k, label, value, options) => `
    <label class="hy-pick">
      <span class="hy-pick-label">${label}</span>
      <span class="ed-select"><span class="hy-pick-val">${esc(options.find(([id]) => id === value)?.[1] ?? '')}</span>
        <svg class="caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5l3-3"/></svg>
        <select data-pi="${k}" aria-label="${label}">
          ${options.map(([id, text]) => `<option value="${esc(id)}"${id === value ? ' selected' : ''}>${esc(text)}</option>`).join('')}
        </select>
      </span>
    </label>`;

  main.innerHTML = `
    <div class="page page-wide">
      <div class="page-head">
        <div class="page-icon">${icon('users')}</div>
        <div><div class="eyebrow">Every locked point</div><h1>Player Index</h1></div>
        <div class="archive">
          <div class="archive-main"><div class="archive-kicker">All-time</div><div class="archive-name">${esc(DATA.name)}</div></div>
          <div class="archive-stat"><b>${all.length.toLocaleString('en-US')}</b><span>Players</span></div>
        </div>
      </div>
      <div class="pi-controls">
        <label class="rb-search pi-search">
          <svg class="ic" viewBox="0 0 20 20" aria-hidden="true"><circle cx="9" cy="9" r="5.5"/><path d="m13.5 13.5 3.5 3.5"/></svg>
          <input type="search" id="pi-q" placeholder="Search players" value="${esc(f.q)}" autocomplete="off">
        </label>
        ${pick('season', 'Season', f.season, [['all', 'All-time'], ...seasons.map(s => [s, s])])}
        ${pick('manager', 'Manager', f.manager, [['all', 'Everyone'], ...current.map(id => [id, name(id)]), ...former.map(id => [id, `${name(id)} (former)`])])}
        ${pick('sort', 'Sort', f.sort, SORTS.map(([id, label]) => [id, label]))}
      </div>
      <div id="pi-results">${piResults(f)}</div>
      <p class="pw-foot">Locked points are what a player scored while in a fantasy starting lineup here, regular season and playoffs; bench points never count. A player’s breakdown lists every fantasy team he started for, with the team names that manager used in those seasons. Ranks come from the full list, so they stay the same while you search. With a manager selected, only the points he scored for that manager’s teams count.</p>
    </div>`;

  const bind = () => $('.pi-more', main)?.addEventListener('click', () => {
    piShown += PI_PAGE;
    $('#pi-results', main).innerHTML = piResults(piState(route().params));
    bind();
  });
  bind();
  main.querySelectorAll('select[data-pi]').forEach(sel => sel.addEventListener('change', () => {
    location.hash = piHash({ ...piState(route().params), [sel.dataset.pi]: sel.value });
  }));
  // Search updates the list in place so the box keeps focus while typing.
  let timer;
  $('#pi-q', main).addEventListener('input', e => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const next = { ...piState(route().params), q: e.target.value };
      history.replaceState(null, '', piHash(next));
      piKey = `${next.season}|${next.manager}|${next.sort}|${next.q}`;
      piShown = PI_PAGE;
      $('#pi-results', main).innerHTML = piResults(next);
      bind();
    }, 150);
  });
}

// ---------- Standings ----------

const ordinalPlace = n => (n ? `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n] ?? 'th'}` : '—');
const pct1 = x => `${(x * 100).toFixed(1)}%`;

function standingsTabs(tab) {
  return `
    <div class="st-tabs" role="tablist">
      <a role="tab" class="${tab === 'legacy' ? 'on' : ''}" href="#/standings">Legacy</a>
      <a role="tab" class="${tab === 'table' ? 'on' : ''}" href="#/standings?tab=table">Standings</a>
    </div>`;
}

function takeaways(r, rows) {
  const n = rows.length;
  const byMedian = [...rows].sort((a, b) => b.medianPct - a.medianPct).findIndex(x => x.owner === r.owner) + 1;
  const titles = r.titles.length
    ? `${r.titles.length} title${r.titles.length === 1 ? '' : 's'} (${r.titles.join(', ')}) ${r.titles.length === 1 ? 'is' : 'are'} worth ${r.parts.titles.toFixed(1)} of the 40 title points.`
    : r.seconds.length
      ? `Reached ${r.seconds.length === 1 ? 'the final' : `${r.seconds.length} finals`} (${r.seconds.join(', ')}) but is still chasing a first ring, so 0 of 40 title points.`
      : 'No finals yet, so the title component is still at 0 of 40.';
  const field = `Beat the weekly median ${pct1(r.medianPct)} of the time (${rec(r.median.w, r.median.l, r.median.t)}), ${byMedian === 1 ? 'the best in the league' : byMedian === n ? 'the lowest in the league' : `${ordinalPlace(byMedian)} of ${n}`}.`;
  const playoffs = `Made the playoffs in ${r.made} of ${r.seasons} season${r.seasons === 1 ? '' : 's'}${r.lasts.length ? `, and lost the toilet bowl ${r.lasts.length === 1 ? 'once' : `${r.lasts.length} times`} (${r.lasts.join(', ')})` : ''}.`;
  return [titles, field, playoffs];
}

function renderLegacy(main) {
  const now = legacy(DATA);
  if (!now.rows.length) {
    main.innerHTML = `<div class="page">${standingsTabs('legacy')}<section class="card soon-card"><p>Legacy scores start after the first completed season.</p></section></div>`;
    return;
  }
  const prevSeason = now.seasons.at(-2);
  const before = prevSeason ? Object.fromEntries(legacy(DATA, { through: prevSeason }).rows.map(r => [r.owner, r.score])) : {};
  const comps = comparisons(now.rows);
  const n = now.rows.length;
  const inProgress = DATA.seasons.find(s => s.status !== 'complete' && s.weeksPlayed);
  const firstMedian = DATA.seasons.find(s => s.medianGame)?.season;
  const bar = (label, v, max) => `
    <div class="lg-part">
      <div class="lg-part-top"><span>${label}</span><b>${v.toFixed(1)}<small> / ${max}</small></b></div>
      <div class="pw-track"><span style="width:${Math.max(2, (v / max) * 100)}%"></span></div>
    </div>`;
  const move = r => {
    if (!prevSeason) return '';
    if (before[r.owner] == null) return '<span class="lg-move lg-new">New</span>';
    const d = Math.round((r.score - before[r.owner]) * 10) / 10;
    return d === 0 ? '<span class="lg-move">±0</span>' : `<span class="lg-move ${d > 0 ? 'up' : 'down'}">${d > 0 ? '↗' : '↘'} ${d > 0 ? '+' : ''}${d}</span>`;
  };

  main.innerHTML = `
    <div class="page page-wide">
      <div class="page-head">
        <div class="page-icon">${icon('list')}</div>
        <div><div class="eyebrow">All-time rankings</div><h1>Standings</h1></div>
      </div>
      ${standingsTabs('legacy')}
      <p class="page-desc">See how every franchise stacks up all-time. ${now.seasons.length} completed season${now.seasons.length === 1 ? '' : 's'} (${now.seasons[0]}–${now.seasons.at(-1)}).</p>

      <section class="card lg-table">
        <div class="lg-head"><span>Rank</span><span>Manager / career</span><span>Hardware</span><span>The field</span><span>Legacy score</span><span></span></div>
        ${now.rows.map(r => `
          <details class="lg-row${r.rank <= 2 ? ' lg-top' : ''}">
            <summary><div class="row-grid">
              <span class="lg-rank">${String(r.rank).padStart(2, '0')}</span>
              <span class="lg-who">
                <span class="lg-label">${legacyLabel(r.rank, n)}</span>
                <span class="lg-name">${esc(name(r.owner))}<small> — ${r.seasons} season${r.seasons === 1 ? '' : 's'}</small></span>
              </span>
              <span class="lg-stats">
                <span class="lg-hw">
                  <span class="hw-1st" title="Championships">${icon('trophy')}<b>${r.titles.length}</b><small>1st</small></span>
                  <span class="hw-2nd" title="Runner-up finishes">${icon('trophy')}<b>${r.seconds.length}</b><small>2nd</small></span>
                  <span class="hw-3rd" title="Third-place finishes">${icon('trophy')}<b>${r.thirds.length}</b><small>3rd</small></span>
                  <span class="hw-reg" title="Worst regular-season record">${icon('down')}<b>${r.regLasts.length}</b><small>Reg. last</small></span>
                  <span class="hw-toilet" title="Toilet bowl losses (last in the final standings)">${icon('toilet')}<b>${r.lasts.length}</b><small>Toilet</small></span>
                </span>
                <span class="lg-field"><b>${Math.round(r.medianPct * 100)}%</b><small>vs median</small></span>
                <span class="lg-hint">Details ${icon('arrow')}</span>
              </span>
              <span class="lg-score"><b>${r.score.toFixed(1)}</b>${move(r)}<small>Legacy score</small></span>
              <span class="lg-open">${icon('arrow')}</span>
            </div></summary>
            <div class="lg-detail">
              <div class="lg-parts">
                ${bar('Championships', r.parts.titles, LEGACY.titles)}
                ${bar('Beating the median', r.parts.median, LEGACY.median)}
                ${bar('Head-to-head wins', r.parts.wins, LEGACY.wins)}
                ${bar('Playoff consistency', r.parts.playoffs, LEGACY.playoffs)}
              </div>
              <div class="lg-facts">
                <p class="lg-comp">${esc(comps[r.owner])}</p>
                <ul>${takeaways(r, now.rows).map(t => `<li>${esc(t)}</li>`).join('')}</ul>
                <p class="lg-line">Head-to-head ${rec(r.h2h.w, r.h2h.l, r.h2h.t)} · Median ${rec(r.median.w, r.median.l, r.median.t)} · Playoffs ${r.made}/${r.seasons} · Finishes ${r.finish.map(f => `${f.s} ${ordinalPlace(f.place)}`).join(', ')}</p>
              </div>
            </div>
          </details>`).join('')}
      </section>

      <section class="lg-behind">
        <div class="lg-behind-head"><h2>Behind the index</h2><span>The formula, in plain English</span></div>
        <p><b>40 points for championships. 25 for beating the median. 15 for head-to-head wins. 20 for playoff consistency.</b>
          Titles carry the most weight; the weekly median counts for more than head-to-head wins because it takes schedule luck out: every week, a score in the top half of the league is a win no matter who you drew. This is one transparent definition of legacy, not a claim to remove every kind of luck.</p>
        <p>Career labels are relative to this league: the top-ranked franchise alone is the GOAT, and the bottom-ranked franchise alone is the cellar dweller. NBA comparisons are assigned once per league, best résumé first. Equal scores break ties by titles, then median record, then name; a tie-break is not a score gap.</p>
        <div class="lg-cols">
          <div><h3>Earn the rings</h3><p>Championship points = 40 × (1 − 0.6<sup>titles</sup>). Your first ring adds 16 points, your second adds 9.6, and later rings keep adding credit.</p></div>
          <div><h3>Prove it over time</h3><p>Median and head-to-head win rates each start with a neutral ${LEGACY.neutral}–${LEGACY.neutral} season, half of a ${LEGACY.neutral * 2}-game schedule, before scoring. A short hot streak can't carry the same certainty as years of results.</p></div>
          <div><h3>Show up in the spring</h3><p>Playoff points = 20 − 20 × (misses + 1) / (seasons + 2). Only completed seasons count, and a first-round bye counts as making the playoffs. With no history yet, you start at neutral credit.</p></div>
          <div><h3>Read the movement</h3><p>${prevSeason ? `The arrow compares the same formula through ${prevSeason} and through ${now.seasons.at(-1)}. It measures score points, not places. Managers without a season through ${prevSeason} show "New".` : 'Movement arrows appear once there are two completed seasons to compare.'}${inProgress ? ` ${inProgress.season} games are excluded until that season is complete.` : ''}</p></div>
        </div>
        <p class="lg-fine">The weekly median is measured from every regular-season week's scores, so ${firstMedian ? `seasons before the league-median game (added in ${firstMedian})` : 'every season'} count${firstMedian ? '' : 's'} the same way. Hardware counts completed seasons: 1st, 2nd and 3rd are final finishes; Reg. last is the worst regular-season record (win %, then points for); Toilet is losing the toilet bowl, the last-place game, which means finishing last in the final standings. None of the hardware except championships feeds the score. Components are rounded to tenths. The three takeaways and the NBA comparison come from the same facts as the score.</p>
      </section>
    </div>`;
}

const RANK_BY = [
  ['wins', 'Total wins', r => r.w],
  ['pct', 'Win %', r => r.pct],
  ['pps', 'Points / season', r => r.pps],
  ['pf', 'Total points', r => r.pf],
  ['titles', 'Titles', r => r.titles],
  ['median', 'Vs median %', r => { const m = r.median; return m.w + m.l + m.t ? (m.w + m.t / 2) / (m.w + m.l + m.t) : 0; }],
];

function renderStandingsTable(main, params) {
  const played = DATA.seasons.filter(s => s.weeksPlayed).map(s => s.season);
  const period = played.includes(params.get('period')) ? params.get('period') : 'all';
  const stage = ['regular', 'playoffs', 'both'].includes(params.get('stage')) ? params.get('stage') : 'regular';
  const by = RANK_BY.find(([id]) => id === params.get('by')) ?? RANK_BY[0];
  const dir = params.get('dir') === 'asc' ? 'asc' : 'desc';
  const { seasons, rows } = standings(DATA, { period, stage });
  const val = by[2];
  rows.sort((a, b) => (dir === 'desc' ? val(b) - val(a) : val(a) - val(b)) || b.pct - a.pct || b.pf - a.pf);
  const shown = v => (by[0] === 'pct' || by[0] === 'median' ? pct1(v) : by[0] === 'pps' || by[0] === 'pf' ? num(v) : v);
  const hash = changes => {
    const p = new URLSearchParams({ tab: 'table', period, stage, by: by[0], dir, ...changes });
    return `#/standings?${p}`;
  };
  const hasMedian = DATA.seasons.some(s => s.medianGame && seasons.includes(s.season));
  const mRec = m => rec(m.w, m.l, m.t);

  main.innerHTML = `
    <div class="page page-wide">
      <div class="page-head">
        <div class="page-icon">${icon('list')}</div>
        <div><div class="eyebrow">All-time rankings</div><h1>Standings</h1></div>
      </div>
      ${standingsTabs('table')}
      <p class="page-desc">${period === 'all' ? 'All-time' : `${period} season`} · ${rows.length} managers · ${seasons[0]}${seasons.length > 1 ? `–${seasons.at(-1)}` : ''}</p>
      <p class="filter-note">${stage === 'playoffs'
        ? 'Playoff records count championship-bracket games only.'
        : `Win–loss records ${hasMedian ? 'include league-median games where the league played them, as in Sleeper' : 'are head-to-head games'}${stage === 'both' ? ', plus championship-bracket games' : ''}. The median column compares every weekly score with the league median, in every season.`}</p>

      <div class="st-controls">
        <label class="st-pick"><span>Time period</span>
          <select data-s="period"><option value="all">All-time</option>${[...played].reverse().map(s => `<option value="${s}"${s === period ? ' selected' : ''}>${s}</option>`).join('')}</select>
        </label>
        <label class="st-pick"><span>Rank managers by</span>
          <select data-s="by">${RANK_BY.map(([id, label]) => `<option value="${id}"${id === by[0] ? ' selected' : ''}>${label}</option>`).join('')}</select>
        </label>
        <a class="st-dir" href="${hash({ dir: dir === 'desc' ? 'asc' : 'desc' })}" title="Reverse order">${dir === 'desc' ? '↓' : '↑'}</a>
      </div>
      <div class="st-stage">
        ${[['regular', 'Regular'], ['playoffs', 'Playoffs'], ['both', 'Both']].map(([id, label]) => `<a class="${id === stage ? 'on' : ''}" href="${hash({ stage: id })}">${label}</a>`).join('')}
      </div>

      <section class="st-table">
        <div class="st-head"><span>#</span><span>Manager</span><span>Record</span><span>Win %</span><span>Points / season</span><span>${by[1]} ${dir === 'desc' ? '↓' : '↑'}</span><span></span></div>
        ${rows.map((r, i) => `
          <details class="st-row">
            <summary><div class="row-grid">
              <span class="st-rank">${String(i + 1).padStart(2, '0')}</span>
              <span class="st-man"><span class="st-av">${esc(name(r.owner)[0]?.toUpperCase())}</span><span><b>${esc(name(r.owner))}</b><small>${r.titles} title${r.titles === 1 ? '' : 's'}</small><small class="st-meta">${rec(r.w, r.l, r.t)} · ${r.g ? pct1(r.pct) : '—'} · ${num(r.pps)} pts/season</small></span></span>
              <span class="st-rec">${rec(r.w, r.l, r.t)}</span>
              <span>${r.g ? pct1(r.pct) : '—'}</span>
              <span>${num(r.pps)}</span>
              <span class="st-val">${shown(val(r))}<small>${esc(by[1])}</small></span>
              <span class="st-open">${icon('arrow')}</span>
            </div></summary>
            <div class="st-detail">
              <div class="st-sub st-sub-head"><span>Season</span><span>Record</span><span>Finish</span><span>Vs median</span><span>Points for</span><span>Points against</span></div>
              ${r.bySeason.map(x => `
                <div class="st-sub">
                  <span>${x.s}</span>
                  <span data-l="Record">${x.w + x.l + x.t ? rec(x.w, x.l, x.t) : '—'}</span>
                  <span data-l="Finish">${x.complete ? (x.champion ? '🏆 Champion' : ordinalPlace(x.place)) : 'In progress'}</span>
                  <span data-l="Vs median">${mRec(x.median)}</span>
                  <span data-l="Points for">${num(x.pf)}</span>
                  <span data-l="Points against">${num(x.pa)}</span>
                </div>`).join('')}
            </div>
          </details>`).join('')}
      </section>
    </div>`;

  main.querySelectorAll('select[data-s]').forEach(sel => sel.addEventListener('change', () => {
    location.hash = hash({ [sel.dataset.s]: sel.value });
  }));
}

function renderStandings(main, params) {
  if (params.get('tab') === 'table') renderStandingsTable(main, params);
  else renderLegacy(main);
}

// ---------- Boot ----------

function route() {
  const [path, qs] = location.hash.replace(/^#\/?/, '').split('?');
  const [page, sub] = (path || DEFAULT_PAGE).split('/');
  return { page, sub, params: new URLSearchParams(qs || '') };
}

function render() {
  const { page, sub, params } = route();
  clearInterval(HYPE_TIMER);
  renderSidebar(page);
  const main = $('#main');
  if (page === 'rivalry') renderRivalry(main, params);
  else if (page === 'hype') renderHype(main, params);
  else if (page === 'transactions') renderTransactions(main, params);
  else if (page === 'awards') renderAwards(main);
  else if (page === 'players') renderPlayers(main, params);
  else if (page === 'records') renderRecordBook(main, sub, params);
  else if (page === 'power') renderPower(main, params);
  else if (page === 'standings') renderStandings(main, params);
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
