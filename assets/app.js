import { ALL_STARS_FROM, LEAGUE_ID, RIVALRIES } from './config.js';
import { CATEGORIES, CHANGE_LABELS, buildRecords, playerPhoto, recordHistory, recordVisible, viewData } from './records.js';
import { PARTS, powerRankings, powerSeasons, scheduleLabel } from './power.js';
import { LEGACY, comparisons, finishes, legacy, legacyLabel, standings } from './standings.js';
import { frontOffice } from './frontoffice.js';
import { HYPE_PARTS, hypeSlate, moments, seasonWeeks, seriesBefore, standingsBefore, weekPairs } from './hype.js';
import { COMMISH, LOPSIDED, REPEAT_TRADES, activity, checkPasscode, lineupIssues, loadTradedPicks, loadWaivers, loadWeek, matchupForm, pickLedger, playoffPicture, seasonTotals, taxiCheck, teamRoster, tradeFlags, waiverWire, weeklyRecap } from './commish.js';
import { KINDS, ledgerTotals, matchesKind, transactionLog } from './transactions.js';
import { POSITION_GROUPS, REGULAR_WEEKS, allFantasy, allStars, banner, championshipMvp, gmOfTheYear, mvpRace, ownerAt, playerOfTheYear, rookieClass, seasonEndKey } from './awards.js';
import { ALL_STAR_POSITIONS, CORRECTIONS, DRAFT_CORRECTIONS, PHOTO_CORRECTIONS } from './corrections.js';
import { SORTS, playerIndex } from './players.js';
import { LEAGUE_START, RULES } from './rules.js';
import { MIN_GAMES, TIERS, draftClasses, draftGrades, draftOfYear, draftedPlayers, projectedOrder, reportCards, seasonPoints } from './draft.js';

// ---------- Navigation ----------

const NAV = [
  { title: 'Now', items: [['home', 'Home', 'home'], ['standings', 'Standings', 'list'], ['transactions', 'Transactions', 'swap'], ['rules', 'Rulebook', 'clipboard']] },
  { title: 'In Season', items: [['props', 'Weekly Props', 'ticket'], ['trade-court', 'Trade Court', 'scale'], ['power', 'Power Rankings', 'gauge'], ['hype', 'Matchup Hype', 'bolt']] },
  { title: 'Hall of Fame', items: [['awards', 'Awards', 'trophy'], ['records', 'Record Book', 'book'], ['players', 'Player Index', 'users'], ['timeline', 'Timeline', 'clock'], ['rivalry', 'Rivalry', 'swords']] },
  { title: 'Draft Kit', items: [['draft-history', 'Draft History', 'history'], ['future-drafts', 'Future Drafts', 'calendar'], ['draft-grades', 'Draft Grades', 'cap']] },
];
const READY = new Set(['home', 'rules', 'rivalry', 'records', 'power', 'hype', 'standings', 'transactions', 'awards', 'players', 'draft-history', 'future-drafts', 'draft-grades']);
const DEFAULT_PAGE = 'home';

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
  calendar: '<rect x="3" y="4.5" width="14" height="12.5" rx="1.5"/><path d="M3 8.5h14M7 3v3M13 3v3"/>',
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
  lock: '<rect x="4" y="9" width="12" height="8" rx="1.5"/><path d="M7 9V6.5a3 3 0 0 1 6 0V9"/>',
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
    <a class="commish-btn${page === 'commish' ? ' active' : ''}" href="#/commish">${icon('lock')}<span>Commish</span></a>
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
        <p>This page hasn't been built yet. For now, head back <a href="#/home">Home</a>.</p>
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
let EVENTS; // league-wide record changes
let PERSONAL; // managers beating their own bests

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

// The 6 most recent personal records, across every manager.
function personalBroken() {
  const latest = [...(PERSONAL ?? [])].sort((a, b) => (b.order ?? 0) - (a.order ?? 0)).slice(0, 6);
  if (!latest.length) return '';
  const catTitle = id => CATEGORIES.find(c => c.id === id)?.title ?? id;
  return `
    <section class="card">
      <div class="card-head"><h2>Personal records</h2><span class="card-sub">The latest managers to beat their own best</span></div>
      <div class="rb-list">
        ${latest.map(e => `
          <a class="rb-item rb-personal" href="#/records/${e.cat}?manager=${encodeURIComponent(e.owner)}">
            <div class="rb-top">
              <span class="rb-pill rb-personal">${esc(name(e.owner))}</span>
              <span class="rb-when">${e.s} · Wk ${e.w}</span>
            </div>
            <div class="rb-title">${esc(e.title)} <small>${esc(catTitle(e.cat))}</small></div>
            <div class="rb-who"><b>${esc(e.holders[0].whoText ?? name(e.owner))}</b> <span class="rb-val">${esc(e.holders[0].display)}</span></div>
            <div class="rb-prev">${esc(e.holders[0].ctx ?? '')}</div>
            <div class="rb-prev">Previous best: ${esc(e.prev[0].display)}${e.prev[0].ctx ? ` (${esc(e.prev[0].ctx)})` : ''}</div>
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
      <div class="f-group${cat.noStage ? ' f-two' : ''}">
        ${dropdown('season', 'Timeframe', f.season, seasonOpts)}
        ${dropdown('manager', 'Manager', f.manager, managerOpts)}
        ${cat.noStage ? '' : dropdown('stage', 'Stage', f.stage, STAGES)}
      </div>
    </section>`;
}

function filterSummary(f) {
  const bits = [];
  if (f.season !== 'all') bits.push(`the ${f.season} season only`);
  if (f.stage === 'regular') bits.push('regular-season games only');
  if (f.stage === 'playoffs') bits.push('championship-bracket games only');
  if (f.manager !== 'all') bits.push(`${esc(name(f.manager))}'s personal records (gold 1–10), with their league-wide rank`);
  if (!bits.length) return '';
  return `<p class="filter-note">Showing ${bits.join(' · ')}. <a href="${filterHash(route().sub, { season: 'all', manager: 'all', stage: 'all', q: f.q })}">Clear filters</a></p>`;
}

// Table layout for every category: one row per record, grouped into sections,
// each opening its leaderboard. items: [{ r, cat, group }].
// With a manager selected, records a manager can hold many times (a game, a
// season) rank his own entries 1-10 in gold: his personal records, with his
// league-wide rank alongside.
function recordTable(items, f) {
  const groups = [...new Set(items.map(x => x.group))];
  const holder = x => esc(x.whoText ?? name(x.who));
  const one = f.manager !== 'all';
  const row = ({ r, cat }) => {
    const rows = shownRows(r, f.manager);
    const personal = one && r.limit; // records with many entries per manager
    // Personal ranks: ties share a number, like the league ranks.
    const pranks = rows.map(x => x.value);
    const prank = i => (i && pranks[i - 1] === pranks[i] ? prank(i - 1) : i + 1);
    const ranked = rows.filter(x => x.rank !== '–');
    const top = ranked[0];
    const leaders = top ? (personal ? [top] : ranked.filter(x => x.rank === top.rank)) : [];
    const who = !top ? '<span class="fo-none">—</span>'
      : leaders.length > 2 ? `${leaders.length}-way tie`
      : leaders.map(holder).join(' <span class="amp">&amp;</span> ');
    const rank = !top ? ''
      : personal ? `<small>${top.rank === 1 ? 'Personal best · league record' : `Personal best · #${top.rank} in the league`}</small>`
      : top.rank !== 1 ? `<small>#${top.rank} overall</small>` : '';
    const fresh = f.season === 'all' && top?.rank === 1 ? recentChange(cat, r) : null;
    // A note about "any game" doesn't apply once the Stage filter narrows the games.
    const note = r.scopeNote && f.stage !== 'all' ? '' : r.note;
    const desc = r.desc ?? note ?? '';
    return `
      <details class="fo-row${r.bad ? ' fo-bad' : ''}" id="rec-${cat}-${slug(r.title)}">
        <summary><div class="row-grid">
          <span class="fo-rec"><b>${esc(r.title)}</b><small>${esc(desc)}</small></span>
          <span class="fo-holder">${who}${rank}${fresh ? badge(fresh) : ''}</span>
          <span class="fo-val">${top ? esc(top.display) : '—'}</span>
          <span class="fo-arrow">${icon('arrow')}</span>
        </div></summary>
        <div class="fo-board">
          ${rows.length ? `<ol class="rec-rest${personal ? ' rec-personal' : ''}">${rows.map((x, i) => `
            <li${!personal && x.rank === 1 ? ' class="co"' : ''}>
              <span class="rk${personal ? ' rk-gold' : ''}">${personal ? prank(i) : x.rank}</span>
              <span class="rn">${x.img ? `<img class="rk-img" src="${esc(x.img)}" alt="" loading="lazy" onerror="this.remove()">` : ''}${holder(x)}<small>${esc(x.ctx)}${personal && x.rank !== '–' ? ` · #${x.rank} in the league` : ''}</small></span>
              <span class="rv">${esc(x.display)}</span>
            </li>`).join('')}</ol>` : `<p class="empty">${one ? `${esc(name(f.manager))} isn't on this board.` : 'No one qualifies yet.'}</p>`}
          ${r.desc && note ? `<p class="rec-note">${esc(note)}</p>` : ''}
          ${one && r.managerNote ? `<p class="rec-note">${esc(r.managerNote)}</p>` : ''}
        </div>
      </details>`;
  };
  return `
    <section class="card fo-table">
      <div class="fo-head"><span>Record</span><span>${one ? `${esc(name(f.manager))}’s best` : 'Record holder'}</span><span>Record value</span><span></span></div>
      ${groups.map(g => {
        const list = items.filter(x => x.group === g);
        return `<div class="fo-group"><b>${esc(g)}</b> <small>${list.length} record${list.length === 1 ? '' : 's'}</small></div>${list.map(row).join('')}`;
      }).join('')}
    </section>
    ${items.some(x => x.cat === 'front-office') ? '<p class="pw-foot">Every move is valued by the locked points it produced: a player counts for the team that acquired him until he left, and a draft pick counts as the player it became. <b>Est.</b> means the value is still changing, because a player in the deal is still on that roster or a pick hasn\'t been used yet.</p>' : ''}
    ${one ? `<p class="pw-foot"><b class="rk-gold-key">1–10</b> in gold are ${esc(name(f.manager))}’s personal records: his best entries on that board, with where each ranks in the whole league. Records with one entry per manager (career totals, streaks) show his league rank.</p>` : ''}`;
}

function recordResults(cat, f) {
  const recs = recordsFor(f.season, f.stage);
  const q = f.q.trim().toLowerCase();
  if (q) {
    // Search looks through every category, not just this one; each category is a section.
    const hits = CATEGORIES.filter(c => !c.soon).flatMap(c => (recs[c.id] || [])
      .filter(r => recordVisible(r, f) && `${r.title} ${c.title} ${r.group ?? ''}`.toLowerCase().includes(q))
      .map(r => ({ r, cat: c.id, group: c.title })));
    return hits.length
      ? `<p class="filter-note">${hits.length} record${hits.length === 1 ? '' : 's'} matching “${esc(f.q)}” across every category.</p>${recordTable(hits, f)}`
      : `<section class="card soon-card"><p>No records match “${esc(f.q)}”.</p></section>`;
  }
  const list = (recs[cat.id] || []).filter(r => recordVisible(r, f));
  return list.length
    ? recordTable(list.map(r => ({ r, cat: cat.id, group: r.group })), f)
    : `<section class="card soon-card"><p>None of the ${esc(cat.title)} records apply to this stage.</p></section>`;
}

function loadRecordEvents() {
  if (EVENTS) return;
  const all = DATA.recordEvents ?? recordHistory(DATA);
  EVENTS = all.filter(e => !e.personal);
  PERSONAL = all.filter(e => e.personal);
}

function renderRecordBook(main, sub, params) {
  RECORDS = recordsFor('all', 'all');
  loadRecordEvents();
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
        ${personalBroken()}
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
  if (cat.noStage) f.stage = 'all'; // Front Office values moves by every locked point, so no Stage filter
  main.innerHTML = `
    <div class="page page-wide">
      ${filterBar(cat, f)}
      <p class="page-desc">${esc(cat.desc)}</p>
      <div id="rb-summary">${filterSummary(f)}</div>
      <div id="rb-results">${recordResults(cat, f)}</div>
    </div>`;

  // ?rec=<slug> (from the Home page's record watch) opens that leaderboard.
  const target = params.get('rec') && document.getElementById(`rec-${cat.id}-${params.get('rec')}`);
  if (target) {
    target.open = true;
    target.classList.add('rec-flash');
    setTimeout(() => target.scrollIntoView({ block: 'start' })); // after render() scrolls to the top
  }

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
  if (LIVE[key] && Date.now() - LIVE[key].at < 50_000) return LIVE[key];
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
// Every game on the slate is a league rivalry (config.js).
const rivalryBanner = () => `<p class="hy-banner hy-rivalry">${icon('swords')}<span><b>Rivalry Week.</b> Every league rivalry plays this week: ${RIVALRIES.map(([a, b]) => `${esc(name(a))} vs ${esc(name(b))}`).join(', ')}. Each one gets the Rivalry bonus.</span></p>`;

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
    ${slate.rivalryWeek ? rivalryBanner() : ''}
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
        <b>How hype works.</b> Each game gets a hype score out of 100: <b>Quality</b> (30%) is how strong both teams are next to the rest of the league that week, by their Power Rankings score (the two best teams score 100, an average pair 50),
        <b>Closeness</b> (25%) is how evenly matched they are (within 2 Power points counts as dead even), <b>Stakes</b> (25%) is what the result means for the playoff race (it grows as the season goes on) or the bracket round,
        and <b>History</b> (20%) is the rivalry: a close series, playoff and title meetings, a recent nail-biter, a long streak.
        A perfect 100 takes a Championship between the league’s two best teams, dead even, with a deep rivalry behind it.
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
    }, 60_000); // every minute while the page is open
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
  // Today's grade for a pick (Draft Grades), next to its year-one award numbers.
  const today = DATA.draftStats ? draftGrades(DATA) : null;
  const todayPick = p => today?.picks.find(x => x.s === p.s && x.no === p.no && x.kind === p.kind);
  const banners = done.map(s => ({ ...banner(DATA, s), gm: gmOfTheYear(DATA, fo, s), poy: playerOfTheYear(DATA, s), mvp: mvpRace(DATA, fo, s),
    finalsMvp: championshipMvp(DATA, s), stars: allStars(DATA, fo, s, ALL_STAR_POSITIONS, ALL_STARS_FROM),
    allFantasy: allFantasy(DATA, fo, s), rookies: rookieClass(DATA, fo, s), draft: draftOfYear(DATA, s) }));
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
                      <div class="aw-meta">The top ${b.allFantasy.length} in total fantasy points on playoff teams, any position</div>
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
                <li>
                  <span class="aw-num">08</span>
                  <div class="aw-award">
                    <div class="aw-label">Draft of the Year <span class="aw-y1" title="Judged on the rookies’ first season, as it stood when the season ended">Year-one numbers</span></div>
                    ${b.draft?.none ? `<div class="aw-meta">No rookie draft this season${DATA.drafts?.some(d => d.s === b.season && d.kind === 'startup') ? ': the startup draft built the league' : ''}.</div>`
                      : b.draft ? `
                      <div class="aw-winner">${esc(name(b.draft.winner.owner))} <b class="aw-grade">${b.draft.winner.grade}</b></div>
                      <div class="aw-meta aw-fteam">${esc(teamName(b.draft.winner.owner, b.season))}</div>
                      <div class="aw-meta">${b.draft.winner.picks.length} pick${b.draft.winner.picks.length === 1 ? '' : 's'} · ${perGame(b.draft.winner.diff)} pts/game vs their spots · best: ${esc(playerName(b.draft.winner.best.pid))}</div>
                      ${(() => { const t = today && draftClasses(today, b.season).rows.find(r => r.owner === b.draft.winner.owner); return t?.grade && (t.grade !== b.draft.winner.grade || perGame(t.diff) !== perGame(b.draft.winner.diff)) ? `<div class="aw-meta aw-today">Today: <b>${t.grade}</b> · ${perGame(t.diff)} pts/game vs their spots · <a href="#/draft-grades?season=${esc(b.season)}">Draft Grades ${icon('arrow')}</a></div>` : ''; })()}
                      <details class="aw-more">
                        <summary>Every class after year one ${icon('arrow')}</summary>
                        <ol class="aw-race">${b.draft.rows.map((r, j) => `<li${j === 0 ? ' class="win"' : ''}><span>${esc(name(r.owner))}<small>${r.picks.length} pick${r.picks.length === 1 ? '' : 's'} · best: ${esc(playerName(r.best.pid))}</small></span><b>${r.grade}</b></li>`).join('')}</ol>
                        <a class="aw-link" href="#/draft-grades?season=${esc(b.season)}">Today’s grades for this draft ${icon('arrow')}</a>
                      </details>` : '<div class="aw-meta">Decided once that draft’s rookies have played their first season.</div>'}
                  </div>
                </li>
                <li>
                  <span class="aw-num">09</span>
                  <div class="aw-award">
                    <div class="aw-label">Steal of the Draft <span class="aw-y1" title="Judged on the rookies’ first season, as it stood when the season ended">Year-one numbers</span></div>
                    ${b.draft?.none ? `<div class="aw-meta">No rookie draft this season${DATA.drafts?.some(d => d.s === b.season && d.kind === 'startup') ? ': the startup draft built the league' : ''}.</div>`
                      : b.draft?.steal ? `
                      <div class="aw-winner">${esc(playerName(b.draft.steal.pid))}${pmeta(b.draft.steal.pid) ? ` <small class="aw-pos">${esc(pmeta(b.draft.steal.pid))}</small>` : ''}</div>
                      <div class="aw-meta aw-fteam">Drafted by ${esc(teamName(b.draft.steal.o, b.season))} (${esc(name(b.draft.steal.o))}) · ${pickLabel(b.draft.steal)}, #${b.draft.steal.no} overall</div>
                      <div class="aw-meta">${fpg(b.draft.steal.value)} pts/game vs ${fpg(b.draft.steal.expected)} expected for the spot · ${perGame(pickDiff(b.draft.steal))}</div>
                      ${(() => { const t = todayPick(b.draft.steal); return t?.value != null && (fpg(t.value) !== fpg(b.draft.steal.value) || fpg(t.expected) !== fpg(b.draft.steal.expected)) ? `<div class="aw-meta aw-today">Today: ${fpg(t.value)} pts/game vs ${fpg(t.expected)} expected · ${perGame(pickDiff(t))}${t.tier ? ` · ${TIERS.find(x => x.id === t.tier).label}` : ''} · <a href="#/draft-grades?season=${esc(b.season)}">Draft Grades ${icon('arrow')}</a></div>` : ''; })()}
                      <details class="aw-more">
                        <summary>The race · top 3 ${icon('arrow')}</summary>
                        <ol class="aw-race">${b.draft.steals.map((p, j) => `<li${j === 0 ? ' class="win"' : ''}><span>${j + 1}. ${esc(playerName(p.pid))}<small>${pickLabel(p)} · ${esc(name(p.o))} · ${fpg(p.value)} vs ${fpg(p.expected)} expected</small></span><b>${perGame(pickDiff(p))}</b></li>`).join('')}</ol>
                      </details>` : '<div class="aw-meta">Decided once that draft’s rookies have played their first season.</div>'}
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
            <p>The 10 players with the most total fantasy points over the NBA regular season, any position, who were on a fantasy playoff team at the end of the season (league rulebook). The same season totals as League MVP, but the MVP can be on any team, so he doesn’t always lead it.</p>
          </article>
          <article class="aw-rule-block">
            <h3><span class="aw-num">07</span> All-Rookie Team</h3>
            <p>The 5 rookies with the most total fantasy points over the NBA regular season (same rookie rule as Rookie of the Year, who leads it).</p>
          </article>
          <article class="aw-rule-block">
            <h3><span class="aw-num">08</span> Draft of the Year</h3>
            <p>The best class grade from that season’s rookie draft, judged on the rookies’ first NBA season: fantasy points per game against what each draft spot is expected to produce, the same method as the Draft Grades in the Draft Kit. It uses only what was known when the season ended, so the banner never changes. The Draft Grades tab keeps grading every class as the players develop, so today’s grade can differ.</p>
          </article>
          <article class="aw-rule-block">
            <h3><span class="aw-num">09</span> Steal of the Draft</h3>
            <p>The pick from that season’s rookie draft that beat its draft spot by the most after the rookies’ first NBA season: his fantasy points per game minus what that spot is expected to produce, the same numbers as the Draft Grades. Like Draft of the Year, it uses only what was known when the season ended, so it never changes. The race shows the top 3.</p>
          </article>
          <p class="aw-rule-fine">Teams list everyone tied with the last player in, so a tie can make a team one bigger.</p>
          <article class="aw-rule-block">
            <h3><span class="aw-num">${icon('medal')}</span> Championship MVP</h3>
            <p>Shown with each champion: the player on the winning team with the most locked points in the championship game.</p>
          </article>
        </div>
        <p class="lg-fine">Bench points never count toward GM or Player of the Year: only locked points do. League MVP is the one award that looks past this league’s lineups. Fantasy-point awards use that season’s league scoring, except 2023-24, which was awarded under today’s scoring (1 per point) instead of that season’s 0.5 per point. Each player is shown with the fantasy team that had him at the end of the season (All-Stars: at the All-Star break; Player of the Year: the team he scored the most for), or “Free agent” if no one did. Season recap opens that season’s standings.</p>
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

// ---------- Commissioner's office ----------
// Behind a passcode that's asked for every time the section is opened (nothing is
// remembered). Scouting report and health report live in assets/commish.js.

let COMMISH_OPEN = false;

function renderCommish(main, params) {
  if (!COMMISH_OPEN) {
    main.innerHTML = `
      <div class="page">
        <section class="card cm-lock">
          <div class="page-icon">${icon('lock')}</div>
          <h1>Commish only</h1>
          <p class="card-sub">Enter the passcode to open the commissioner’s office.</p>
          <form class="cm-form" autocomplete="off">
            <input type="password" id="cm-code" placeholder="Passcode" aria-label="Passcode" autocomplete="off" autofocus>
            <button class="btn" type="submit">Open</button>
          </form>
          <p class="cm-error" id="cm-error" hidden>Wrong passcode.</p>
        </section>
      </div>`;
    $('.cm-form', main).addEventListener('submit', async e => {
      e.preventDefault();
      if (await checkPasscode($('#cm-code', main).value)) {
        COMMISH_OPEN = true;
        renderCommish(main, route().params);
      } else {
        const err = $('#cm-error', main);
        err.hidden = false;
        $('#cm-code', main).select();
      }
    });
    $('#cm-code', main).focus();
    return;
  }
  const TABS = [['scout', 'Scouting report'], ['waivers', 'Waiver wire'], ['playoffs', 'Playoff picture'], ['recap', 'Weekly recap'], ['picks', 'Draft picks'], ['races', 'Award races'], ['hype', 'Early hype'], ['health', 'Health report']];
  const tab = TABS.some(([id]) => id === params.get('tab')) ? params.get('tab') : 'scout';
  main.innerHTML = `
    <div class="page page-wide">
      <div class="page-head">
        <div class="page-icon">${icon('lock')}</div>
        <div><div class="eyebrow">For the commish only</div><h1>Commissioner’s office</h1></div>
      </div>
      <div class="st-tabs cm-tabs" role="tablist">
        ${TABS.map(([id, label]) => `<a role="tab" class="${tab === id ? 'on' : ''}" href="#/commish${id === 'scout' ? '' : `?tab=${id}`}">${label}</a>`).join('')}
      </div>
      <div id="cm-body"><div class="loading">Pulling the latest from Sleeper…</div></div>
    </div>`;
  const body = $('#cm-body', main);
  const show = { scout: renderScouting, waivers: renderWaivers, playoffs: renderPlayoffs, recap: renderRecap, picks: renderPicks, races: renderRaces, hype: renderEarlyHype, health: renderHealth }[tab];
  show(body, params).catch(err => {
    body.innerHTML = `<section class="card"><p class="empty">Couldn’t load this report: ${esc(err.message)}</p></section>`;
  });
}

// The week to scout: the one under way, or week 1 before the season starts.
async function scoutWeek() {
  HYPE_NOW ??= await hypeNow();
  const cur = DATA.seasons.at(-1);
  if (HYPE_NOW.done || HYPE_NOW.over) return null;
  return { season: cur.season, week: Math.max(1, HYPE_NOW.week), started: HYPE_NOW.week >= 1 };
}

const injuryTag = p => (p.injury ? `<span class="cm-inj${/out|ir|susp|inactive/i.test(p.injury) ? ' bad' : ''}">${esc(p.injury)}</span>` : '');

function rosterTable(team, ctx, title) {
  const row = p => (p.empty ? `<tr class="cm-empty"><td>${esc(p.slot)}</td><td colspan="5">Empty spot</td></tr>` : `
    <tr>
      <td class="cm-slot">${esc(p.slot ?? '')}</td>
      <td class="cm-player"><b>${esc(p.name)}</b> ${injuryTag(p)}<small>${esc([p.pos, p.team].filter(Boolean).join(' · ') || 'No team')}</small></td>
      <td>${ctx.live ? `${p.left}<small>/${p.games}</small>` : p.games}</td>
      <td>${p.projNow ? num(p.projNow) : '—'}</td>
      <td>${p.fpg != null ? num(p.fpg) : p.fpgLast != null ? `${num(p.fpgLast)}<small>*</small>` : '—'}</td>
      ${ctx.live ? `<td><b>${p.livePts != null ? num(p.livePts) : '—'}</b></td>` : ''}
    </tr>`);
  const head = `<tr><th>Slot</th><th>Player</th><th>${ctx.live ? 'Games left' : 'Games'}</th><th>${ctx.live ? 'Proj. left' : 'Proj.'}</th><th>Pts/game</th>${ctx.live ? '<th>This week</th>' : ''}</tr>`;
  const group = (label, list, open) => (list.length ? `
    <details class="cm-group"${open ? ' open' : ''}><summary>${label} <small>${list.length}</small></summary>
      <table class="cm-table"><tbody>${list.map(p => row({ ...p, slot: label === 'Bench' ? 'BN' : label === 'IR' ? 'IR' : 'TX' })).join('')}</tbody></table>
    </details>` : '');
  return `
    <section class="card cm-roster">
      <div class="card-head"><h2>${esc(title)}</h2><span class="card-sub">${esc(name(team.owner))}</span></div>
      <div class="cm-scroll">
        <table class="cm-table"><thead>${head}</thead><tbody>${team.starters.map(row).join('')}</tbody></table>
      </div>
      <div class="cm-total"><span>Projected locked points${ctx.live ? ' (final)' : ''}</span><b>${num(team.projStarters)}</b></div>
      ${group('Bench', team.bench, false)}${group('IR', team.ir, false)}${group('Taxi', team.taxi, false)}
    </section>`;
}

async function renderScouting(body, params) {
  const at = await scoutWeek();
  if (!at) {
    body.innerHTML = '<section class="card soon-card"><p>The season is over. Scouting reports return when next season’s schedule is set.</p></section>';
    return;
  }
  const { season, week } = at;
  const cur = DATA.seasons.at(-1);
  const me = cur.teams.some(t => t.owner === params.get('team')) ? params.get('team') : COMMISH;
  let pairs = weekPairs(DATA, season, week);
  if (!pairs.length) pairs = (await liveWeek(season, week).catch(() => null))?.pairs ?? [];
  const pair = pairs.find(p => p.a === me || p.b === me);
  const teamPick = `
    <label class="hy-pick cm-pick">
      <span class="hy-pick-label">Scout for</span>
      <span class="ed-select"><span class="hy-pick-val">${esc(teamName(me, season))}</span>
        <svg class="caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5l3-3"/></svg>
        <select id="cm-team" aria-label="Team">${cur.teams.map(t => `<option value="${esc(t.owner)}"${t.owner === me ? ' selected' : ''}>${esc(teamName(t.owner, season))} (${esc(name(t.owner))})</option>`).join('')}</select>
      </span>
    </label>`;
  const bindPick = () => $('#cm-team', body)?.addEventListener('change', e => {
    location.hash = `#/commish?team=${encodeURIComponent(e.target.value)}`;
  });
  if (!pair) {
    body.innerHTML = `${teamPick}<section class="card soon-card"><p>${esc(teamName(me, season))} has no matchup in week ${week}.</p></section>`;
    bindPick();
    return;
  }
  const opp = pair.a === me ? pair.b : pair.a;
  const [ctx] = await Promise.all([loadWeek(DATA, season, week)]);
  if (route().page !== 'commish') return;
  const A = teamRoster(DATA, ctx, me);
  const B = teamRoster(DATA, ctx, opp);
  const table = standingsBefore(DATA, season, week);
  const slate = hypeSlate(DATA, season, week, pairs);
  const g = slate.games.find(x => (x.a === me && x.b === opp) || (x.a === opp && x.b === me));
  const strength = o => (g ? (g.a === o ? g.sA : g.sB) : null);
  const form = matchupForm(DATA, season, me, opp);
  const series = seriesBefore(DATA, me, opp, season, week);
  const mo = moments(DATA, series, me, opp);
  const ta = table.by[me];
  const tb = table.by[opp];
  const live = ctx.live && A?.liveScore != null;
  const projA = A?.projStarters ?? 0;
  const projB = B?.projStarters ?? 0;
  const gamesOf = t => t.starters.reduce((s, p) => s + (ctx.live ? p.left || 0 : p.games || 0), 0);
  const pct = x => `${Math.round(x * 100)}%`;
  const basisNote = form.basis !== season ? ` (from ${form.basis}, until both teams have played this season)` : '';

  // Scouting notes, most useful first.
  const notes = [];
  const diff = r1(projA - projB);
  notes.push(`${live ? 'Projected final' : 'Sleeper’s projections with the current lineups'}: ${esc(teamName(me, season))} ${num(projA)}, ${esc(teamName(opp, season))} ${num(projB)}. ${diff === 0 ? 'Dead even.' : `${diff > 0 ? 'You’re' : 'They’re'} ahead by ${num(Math.abs(diff))}.`}`);
  notes.push(`Your starters have ${gamesOf(A)} game${gamesOf(A) === 1 ? '' : 's'}${ctx.live ? ' left' : ''} this week; theirs have ${gamesOf(B)}. Each starter locks one game, so more games mean more chances at a big night.`);
  const outs = t => t.starters.filter(p => !p.empty && p.injury).map(p => `${p.name} (${p.injury})`);
  if (outs(B).length) notes.push(`Their starters on the injury report: ${esc(outs(B).join(', '))}.`);
  if (outs(A).length) notes.push(`Your starters on the injury report: ${esc(outs(A).join(', '))}.`);
  const star = [...B.starters].filter(p => !p.empty).sort((x, y) => y.projNow - x.projNow)[0];
  if (star?.projNow) notes.push(`Their biggest threat: ${esc(star.name)}, ${star.games} game${star.games === 1 ? '' : 's'}, about ${num(star.perGame)} a game, ${num(star.projNow)} projected to lock.`);
  const few = t => t.starters.filter(p => !p.empty && p.games === 1).map(p => p.name);
  if (few(A).length) notes.push(`Only one game this week (no choice of which to lock): ${esc(few(A).join(', '))}. A bench player with more games could be worth a look.`);
  if (form.b.n >= 3) {
    const trend = form.b.last3 - form.b.ppg;
    if (Math.abs(trend) >= 10) notes.push(`They’re ${trend > 0 ? 'heating up' : 'cooling off'}: ${num(form.b.last3)} a week over their last three vs ${num(form.b.ppg)} on the season${basisNote}.`);
  }
  if (form.odds != null) notes.push(`On scoring alone${basisNote}, your weekly score beats theirs ${pct(form.odds)} of the time.`);
  if (form.a.medianRate != null && form.b.medianRate != null) notes.push(`Beating the weekly median (a second win each week this season): you ${pct(form.a.medianRate)}, them ${pct(form.b.medianRate)}${basisNote}.`);
  const streak = series.streak ? `${name(series.streak.who === 'A' ? me : opp)} ${series.streak.n === 1 ? 'won the last meeting' : `has won the last ${series.streak.n}`}` : '';
  notes.push(series.all.n ? `All-time you’re ${series.all.A}–${series.all.B}${series.all.ties ? `–${series.all.ties}` : ''} against them${streak ? `; ${esc(streak)}` : ''}.` : 'You’ve never played them before.');
  for (const l of g?.labels ?? []) notes.push(`Matchup Hype: <b>${esc(l.text)}</b>. ${esc(l.why)}`);

  const side = (o, t, team, proj, cls) => `
    <div class="hy-side ${cls}">
      <div class="hy-kicker">${t?.dec ? `Standing · No. ${t.rank}` : 'Week ' + week}</div>
      <div class="hy-team">${esc(teamName(o, season))}</div>
      <div class="hy-owner">${esc(name(o))}</div>
      <div class="hy-rec">${t ? rec(t.w, t.l, t.t) : ''}${strength(o) != null ? ` · strength ${Math.round(strength(o))}` : ''}</div>
      <div class="hy-pts">${num(live ? team.liveScore : proj)}</div>
      <div class="hy-pts-label">${live ? `Live · proj. ${num(proj)}` : 'Projected'}</div>
    </div>`;
  const tape = (label, a, b, ca, cb) => tapeRow(label, a, b, ca, cb);
  const lastMeet = [...series.meetings].reverse().slice(0, 5);

  body.innerHTML = `
    ${teamPick}
    <section class="card hy-this">
      <div class="hy-this-head"><h2>Week ${week} scouting report</h2><span class="card-sub">${esc(season)}${at.started ? '' : ' · preview before tip-off'}${ctx.live ? ' · live' : ''}</span></div>
      <div class="hy-duel">${side(me, ta, A, projA, 'hy-dark')}<div class="hy-vs">VS</div>${side(opp, tb, B, projB, 'hy-light')}</div>
      <div class="hy-lead">${form.odds != null ? `Win odds on scoring${esc(basisNote)}: ${pct(form.odds)}` : 'Not enough games yet for scoring odds'}</div>
    </section>

    <section class="card">
      <div class="card-head"><h2>Scouting notes</h2></div>
      <ul class="cm-notes">${notes.map(n => `<li>${n}</li>`).join('')}</ul>
    </section>

    <section class="card">
      <div class="card-head"><h2>Form</h2><span class="card-sub">${form.basis === season ? `${season} season` : `${form.basis} season${basisNote}`}</span></div>
      <div class="tape">
        <div class="tape-row tape-names"><div class="tv tv-a">${esc(name(me))}</div><div class="tl"></div><div class="tv tv-b">${esc(name(opp))}</div></div>
        ${tape('Points per week', num(form.a.ppg), num(form.b.ppg), form.a.ppg, form.b.ppg)}
        ${tape('Last 3 weeks', num(form.a.last3), num(form.b.last3), form.a.last3, form.b.last3)}
        ${tape('Best week', num(form.a.high), num(form.b.high), form.a.high, form.b.high)}
        ${tape('Worst week', num(form.a.low), num(form.b.low), form.a.low, form.b.low)}
        ${tape('Beat the median', form.a.medianRate != null ? pct(form.a.medianRate) : '—', form.b.medianRate != null ? pct(form.b.medianRate) : '—', form.a.medianRate, form.b.medianRate)}
        ${tape('Projected this week', num(projA), num(projB), projA, projB)}
      </div>
    </section>

    <div class="cm-rosters">
      ${rosterTable(A, ctx, `Your lineup · ${teamName(me, season)}`)}
      ${rosterTable(B, ctx, `Their lineup · ${teamName(opp, season)}`)}
    </div>
    <p class="filter-note">This league counts one locked game per starter per week. Proj. is Sleeper’s per-game projection (scored with this league’s settings) boosted by how many games he has to choose from, using this league’s own history: a 2-game week locks about 11% above his average game, 3+ games about 23–25%, plus 8% because Sleeper’s projections run low here. Tested on real 2024–25 lineups, this lands within about 27 points of a team’s score on average and picks the winner about 72% of the time. Once the week starts, a player’s current points count if they beat what his remaining games are expected to give. Games come from Sleeper’s NBA schedule. Pts/game is this season’s fantasy points per game (* last season’s, until he plays this season). Injury tags are Sleeper’s current report.</p>

    <section class="card">
      <div class="card-head"><h2>Head to head</h2><span class="card-sub">${series.all.n} meeting${series.all.n === 1 ? '' : 's'} · <a href="#/rivalry?a=${encodeURIComponent(me)}&b=${encodeURIComponent(opp)}">Full rivalry</a></span></div>
      ${lastMeet.length ? lastMeet.map(m => meetingRow(m, me, opp)).join('') : '<p class="empty">First meeting.</p>'}
      ${mo.A.length || mo.B.length ? `<div class="cm-moments">${[...mo.A, ...mo.B].map(x => `<span><b>${esc(DATA.players?.[x.pid]?.n ?? x.pid)}</b> ${num(x.p)} <small>${esc(name(x.o))} · ${x.m.s} Wk ${x.m.w}</small></span>`).join('')}</div>` : ''}
    </section>`;
  bindPick();
}

// ---- Waiver wire: players on no roster worth a look ----

async function renderWaivers(body, params) {
  const at = (await scoutWeek()) ?? { season: DATA.seasons.at(-1).season, week: 1, started: false };
  const [ctx, extra] = await Promise.all([loadWeek(DATA, at.season, at.week), loadWaivers(at.season, at.week, at.started)]);
  if (route().page !== 'commish') return;
  const pos = ['G', 'F', 'C'].includes(params.get('pos')) ? params.get('pos') : 'all';
  const all = waiverWire(DATA, ctx, extra).filter(p => !p.out && (pos === 'all' || p.group === pos));
  const top = (rows, n = 10) => rows.slice(0, n);
  const risers = top(all.filter(p => p.recentGames >= 2 && p.recent >= 20 && p.jump >= 5).sort((a, b) => b.jump - a.jump));
  const trending = top(all.filter(p => p.adds > 0).sort((a, b) => b.adds - a.adds));
  const best = top(all.filter(p => (p.gp >= 5 ? p.fpg : p.fpgLast) != null).sort((a, b) => (b.gp >= 5 ? b.fpg : b.fpgLast) - (a.gp >= 5 ? a.fpg : a.fpgLast)));
  const streams = top(all.filter(p => p.proj > 0).sort((a, b) => b.proj - a.proj));
  const meta = p => [p.pos, p.team || 'No team', p.games ? `${p.games} game${p.games === 1 ? '' : 's'} this week` : 'no games this week'].join(' · ');
  const rows = (list, value, extraLine) => (list.length ? `<ol class="aw-race">${list.map((p, i) => `
    <li><span>${i + 1}. ${esc(p.name)} ${injuryTag(p)}<small>${esc(meta(p))}${extraLine ? ` · ${esc(extraLine(p))}` : ''}</small></span><b>${value(p)}</b></li>`).join('')}</ol>`
    : '<p class="empty">Nobody fits right now.</p>');
  const chips = [['all', 'All'], ['G', 'Guards'], ['F', 'Forwards'], ['C', 'Centers']].map(([id, label]) =>
    `<a class="${id === pos ? 'on' : ''}" href="#/commish?tab=waivers${id === 'all' ? '' : `&pos=${id}`}">${label}</a>`).join('');

  body.innerHTML = `
    <div class="st-stage cm-pos">${chips}</div>
    <p class="filter-note">Players on no roster in this league, ${at.started ? `week ${at.week}` : `before week ${at.week}`}. Players listed Out are hidden. Recently dropped players stay on waivers for ${ctx.league?.settings?.waiver_clear_days ?? 2} days before they’re free agents.</p>
    <div class="cm-races">
      <section class="card"><div class="card-head"><h2>Risers</h2></div>
        <p class="cm-rule">Fantasy points per game over the last 14 days vs his season average (2+ recent games, 20+ a game).</p>
        ${at.started ? rows(risers, p => `+${num(p.jump)}`, p => `${num(p.recent)} a game lately vs ${num(p.fpg)}`) : '<p class="empty">Risers show up after the first week of games.</p>'}
      </section>
      <section class="card"><div class="card-head"><h2>Trending on Sleeper</h2></div>
        <p class="cm-rule">Adds across every Sleeper league in the last 48 hours: often the first sign of a new role or an injury elsewhere.</p>
        ${rows(trending, p => `${p.adds.toLocaleString('en-US')}<small> adds</small>`, p => (p.fpg != null ? `${num(p.fpg)} a game` : p.fpgLast != null ? `${num(p.fpgLast)} a game last season` : ''))}
      </section>
      <section class="card"><div class="card-head"><h2>Best available</h2></div>
        <p class="cm-rule">Fantasy points per game this season (5+ games; last season’s until then).</p>
        ${rows(best, p => num(p.gp >= 5 ? p.fpg : p.fpgLast), p => (p.gp >= 5 ? `${p.gp} games` : 'last season'))}
      </section>
      <section class="card"><div class="card-head"><h2>Streamers this week</h2></div>
        <p class="cm-rule">Projected locked points this week: his projected game, boosted by how many games he has to choose from (same as the scouting report).</p>
        ${rows(streams, p => num(p.proj))}
      </section>
    </div>`;
}

// ---- Playoff picture: clinch and elimination math ----

// Seasons and regular-season weeks with games, for the "as of" pickers.
function playedWeeks(season) {
  const s = DATA.seasons.find(x => x.season === season);
  return [...new Set(DATA.games.filter(g => g.s === season && g.t === 'R').map(g => g.w))]
    .filter(w => w < (s.playoffStart ?? 99)).sort((a, b) => a - b);
}

async function renderPlayoffs(body, params) {
  const cur = DATA.seasons.at(-1);
  const seasons = DATA.seasons.filter(s => s.season === cur.season || playedWeeks(s.season).length).map(s => s.season).reverse();
  const season = seasons.includes(params.get('season')) ? params.get('season') : seasons[0];
  const weeks = playedWeeks(season);
  const week = weeks.includes(Number(params.get('week'))) ? Number(params.get('week')) : weeks.at(-1) ?? 0;
  const pic = playoffPicture(DATA, season, week, standingsBefore);
  const power = week ? Object.fromEntries(powerRankings(DATA, season, week).rows.map(r => [r.owner, r.str])) : {};
  const hash = c => `#/commish?${new URLSearchParams({ tab: 'playoffs', season, week, ...c })}`;
  const statusCls = r => (r.clinched ? 'good' : r.eliminated ? 'bad' : '');
  const magic = r => (r.magic == null ? '—' : r.magic === 'help' ? 'Needs help' : `${r.magic}`);
  const gapText = r => (r.rank <= pic.spots ? (r.gap > 0 ? `+${r.gap} up` : r.gap === 0 ? 'tied with 7th' : '') : `${-r.gap} back`);
  const seed = n => pic.seeds[n - 1];

  body.innerHTML = `
    <div class="cm-pickers">
      <label class="hy-pick"><span class="hy-pick-label">Season</span><span class="ed-select"><span class="hy-pick-val">${esc(season)}</span>
        <svg class="caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5l3-3"/></svg>
        <select data-c="season">${seasons.map(s => `<option value="${s}"${s === season ? ' selected' : ''}>${s}</option>`).join('')}</select></span></label>
      <label class="hy-pick"><span class="hy-pick-label">As of</span><span class="ed-select"><span class="hy-pick-val">${week ? `After week ${week}` : 'Before week 1'}</span>
        <svg class="caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5l3-3"/></svg>
        <select data-c="week">${[0, ...weeks].reverse().map(w => `<option value="${w}"${w === week ? ' selected' : ''}>${w ? `After week ${w}` : 'Before week 1'}</option>`).join('')}</select></span></label>
    </div>
    <p class="filter-note">${pic.left} regular-season week${pic.left === 1 ? '' : 's'} left. ${pic.spots} teams make the playoffs, the top ${pic.byes} get a bye. A team can win ${pic.perWeek} a week${pic.perWeek === 2 ? ' (head-to-head plus the league median)' : ''}. Ties in the standings break on points for, so a team only clinches when even a tie can’t catch it.</p>

    <section class="card">
      <div class="card-head"><h2>The race</h2><span class="card-sub">${season} · ${week ? `after week ${week}` : 'before week 1'}</span></div>
      <div class="cm-scroll">
        <table class="cm-table cm-race">
          <thead><tr><th>#</th><th>Team</th><th>Record</th><th>Line</th><th>Magic #</th><th>Status</th></tr></thead>
          <tbody>${pic.rows.map(r => `
            <tr class="${r.owner === COMMISH ? 'cm-me' : ''}${r.rank === pic.spots ? ' cm-line' : ''}">
              <td class="cm-slot">${r.rank}</td>
              <td class="cm-player"><b>${esc(teamName(r.owner, season))}</b><small>${esc(name(r.owner))} · ${pic.remaining(r.owner).length} left${power[r.owner] != null && pic.remaining(r.owner).length ? ` · opp. strength ${Math.round(mean(pic.remaining(r.owner).map(g => power[g.opp] ?? 50)))}` : ''}</small><span class="cm-pill cm-pill-m ${statusCls(r)}">${esc(r.status)}</span></td>
              <td>${rec(r.w, r.l, r.t)}</td>
              <td>${esc(gapText(r))}</td>
              <td>${esc(magic(r))}</td>
              <td><span class="cm-pill ${statusCls(r)}">${esc(r.status)}</span></td>
            </tr>`).join('')}</tbody>
        </table>
      </div>
      <p class="cm-rule">The line after No. ${pic.spots} is the playoff cut. Magic # = wins that clinch a spot even if everyone else wins out (“Needs help” = can’t clinch alone). Opp. strength: the average Power Rankings strength of the teams left on the schedule (50 = average).</p>
    </section>

    <section class="card">
      <div class="card-head"><h2>If the season ended today</h2></div>
      <div class="cm-bracket">
        <div><span class="cm-seed">Bye</span><b>1. ${esc(teamName(seed(1).owner, season))}</b></div>
        <div><span class="cm-seed">Bye</span><b>2. ${esc(teamName(seed(2).owner, season))}</b></div>
        <div><span class="cm-seed">Quarterfinal</span><b>3. ${esc(teamName(seed(3).owner, season))}</b> vs <b>6. ${esc(teamName(seed(6).owner, season))}</b></div>
        <div><span class="cm-seed">Quarterfinal</span><b>4. ${esc(teamName(seed(4).owner, season))}</b> vs <b>5. ${esc(teamName(seed(5).owner, season))}</b></div>
      </div>
    </section>

    <section class="card">
      <div class="card-head"><h2>Schedules left</h2></div>
      ${pic.left ? `<div class="cm-scroll"><table class="cm-table cm-picks"><tbody>${pic.rows.map(r => `<tr${r.owner === COMMISH ? ' class="cm-me"' : ''}><td class="cm-player"><b>${esc(name(r.owner))}</b></td><td class="cm-left">${pic.remaining(r.owner).map(g => `<span>Wk ${g.w} ${esc(name(g.opp))}</span>`).join('')}</td></tr>`).join('')}</tbody></table></div>` : '<p class="empty">The regular season is over.</p>'}
    </section>`;
  body.querySelectorAll('select[data-c]').forEach(sel => sel.addEventListener('change', () => {
    location.hash = sel.dataset.c === 'season' ? `#/commish?tab=playoffs&season=${sel.value}` : hash({ week: sel.value });
  }));
}

// ---- Weekly recap: ready to paste into the group chat ----

async function renderRecap(body, params) {
  const cur = DATA.seasons.at(-1);
  const withGames = s => [...new Set(DATA.games.filter(g => g.s === s).map(g => g.w))].sort((a, b) => a - b);
  const seasons = DATA.seasons.filter(s => withGames(s.season).length).map(s => s.season).reverse();
  if (!seasons.length) {
    body.innerHTML = '<section class="card soon-card"><p>Recaps start after the first week of games.</p></section>';
    return;
  }
  const season = seasons.includes(params.get('season')) ? params.get('season') : seasons[0];
  const weeks = withGames(season);
  const week = weeks.includes(Number(params.get('week'))) ? Number(params.get('week')) : weeks.at(-1);
  const s = DATA.seasons.find(x => x.season === season);
  const next = week + 1 < (s.playoffStart ?? 99) && weekPairs(DATA, season, week + 1).length ? hypeSlate(DATA, season, week + 1) : null;
  const text = weeklyRecap(DATA, season, week, { hypeSlate, standingsBefore, nextSlate: next });
  const hash = c => `#/commish?${new URLSearchParams({ tab: 'recap', season, week, ...c })}`;

  body.innerHTML = `
    <div class="cm-pickers">
      <label class="hy-pick"><span class="hy-pick-label">Season</span><span class="ed-select"><span class="hy-pick-val">${esc(season)}</span>
        <svg class="caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5l3-3"/></svg>
        <select data-c="season">${seasons.map(x => `<option value="${x}"${x === season ? ' selected' : ''}>${x}</option>`).join('')}</select></span></label>
      <label class="hy-pick"><span class="hy-pick-label">Week</span><span class="ed-select"><span class="hy-pick-val">Week ${week}</span>
        <svg class="caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5l3-3"/></svg>
        <select data-c="week">${[...weeks].reverse().map(w => `<option value="${w}"${w === week ? ' selected' : ''}>Week ${w}</option>`).join('')}</select></span></label>
    </div>
    ${season !== cur.season ? `<p class="hy-banner">${icon('clock')}<span>${esc(cur.season)} hasn’t played a week yet, so this shows ${esc(season)}. Once week 1 is final, the newest recap shows here.</span></p>` : ''}
    <section class="card">
      <div class="card-head"><h2>Week ${week} recap</h2><span class="card-sub">${esc(season)} · ${text.length.toLocaleString('en-US')} characters</span></div>
      <textarea class="cm-recap" id="cm-recap" readonly rows="18">${esc(text)}</textarea>
      <div class="cm-copy"><button class="btn" type="button" id="cm-copy">Copy recap</button><span id="cm-copied" hidden>Copied. Paste it in the group chat.</span></div>
    </section>
    <p class="filter-note">Built from the week’s final scores: results (biggest win first; 🚨 marks a win over a team stronger on paper by the Power Rankings), high and low scores, the closest and most lopsided games, the league median, the top 3 player performances by locked points, any records set, the standings, and next week’s Main event.</p>`;
  body.querySelectorAll('select[data-c]').forEach(sel => sel.addEventListener('change', () => {
    location.hash = sel.dataset.c === 'season' ? `#/commish?tab=recap&season=${sel.value}` : hash({ week: sel.value });
  }));
  $('#cm-copy', body).addEventListener('click', async () => {
    const area = $('#cm-recap', body);
    try { await navigator.clipboard.writeText(area.value); } catch { area.select(); document.execCommand('copy'); }
    $('#cm-copied', body).hidden = false;
  });
}

const mean = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

// ---- Draft picks: who owns every future rookie pick ----

async function renderPicks(body) {
  const traded = await loadTradedPicks(DATA);
  if (route().page !== 'commish') return;
  const { seasons, rounds, picks } = pickLedger(DATA, traded);
  const cur = DATA.seasons.at(-1);
  const ord = r => `${r}${{ 1: 'st', 2: 'nd', 3: 'rd' }[r] ?? 'th'}`;
  const managers = [...cur.teams].sort((a, b) => (a.owner === COMMISH ? -1 : b.owner === COMMISH ? 1 : name(a.owner).localeCompare(name(b.owner))));
  const holdings = (o, s) => {
    const mine = picks.filter(p => p.season === s && p.owner === o);
    return Array.from({ length: rounds }, (_, i) => i + 1).map(r => {
      const n = mine.filter(p => p.round === r).length;
      return n ? `${ord(r)}${n > 1 ? ` ×${n}` : ''}` : '';
    }).filter(Boolean).join(', ') || '—';
  };
  const pathText = p => (p.path.length
    ? [name(p.path[0].from), ...p.path.map(x => `${name(x.to)} (${x.s} Wk ${x.w})`)].join(' → ')
    : `traded to ${name(p.owner)}`);

  body.innerHTML = `
    <p class="filter-note">Every future rookie-draft pick and who owns it today, from Sleeper’s traded-pick list. Draft order is set later, so picks are listed by original team.</p>
    <section class="card">
      <div class="card-head"><h2>Picks by manager</h2><span class="card-sub">What each manager holds</span></div>
      <div class="cm-scroll">
        <table class="cm-table cm-picks">
          <thead><tr><th>Manager</th>${seasons.map(s => `<th>${s}</th>`).join('')}<th>Total</th></tr></thead>
          <tbody>${managers.map(t => `<tr${t.owner === COMMISH ? ' class="cm-me"' : ''}><td class="cm-player"><b>${esc(teamName(t.owner, cur.season))}</b><small>${esc(name(t.owner))}</small></td>${seasons.map(s => `<td>${holdings(t.owner, s)}</td>`).join('')}<td><b>${picks.filter(p => p.owner === t.owner).length}</b></td></tr>`).join('')}</tbody>
        </table>
      </div>
    </section>
    ${seasons.map(s => {
      const list = picks.filter(p => p.season === s);
      const moved = list.filter(p => p.owner !== p.orig);
      return `
      <section class="card">
        <div class="card-head"><h2>${s} rookie draft</h2><span class="card-sub">${moved.length} of ${list.length} picks traded</span></div>
        <div class="cm-scroll">
          <table class="cm-table cm-picks">
            <thead><tr><th>Original team</th>${Array.from({ length: rounds }, (_, i) => `<th>${ord(i + 1)} rd</th>`).join('')}</tr></thead>
            <tbody>${managers.map(t => `<tr><td class="cm-player"><b>${esc(name(t.owner))}</b></td>${Array.from({ length: rounds }, (_, i) => {
              const p = list.find(x => x.round === i + 1 && x.orig === t.owner);
              const cls = [p.owner !== p.orig ? 'cm-moved' : '', p.owner === COMMISH ? 'cm-mine' : ''].filter(Boolean).join(' ');
              return `<td${cls ? ` class="${cls}"` : ''}>${p.owner === p.orig ? 'Own pick' : `<b>${esc(name(p.owner))}</b>`}</td>`;
            }).join('')}</tr>`).join('')}</tbody>
          </table>
        </div>
        ${moved.length ? `<ul class="cm-list cm-paths">${moved.sort((a, b) => a.round - b.round).map(p => `<li><b>${ord(p.round)} round, orig. ${esc(name(p.orig))}</b>: ${esc(pathText(p))}</li>`).join('')}</ul>` : ''}
      </section>`;
    }).join('')}
    <p class="filter-note">Highlighted: picks that changed hands; gold = yours. Trade dates come from the league’s transactions.</p>`;
}

// ---- Award races: where every award stands today ----

async function renderRaces(body, params) {
  HYPE_NOW ??= await hypeNow();
  const cur = DATA.seasons.at(-1);
  const seasons = DATA.seasons.filter(s => s.season === cur.season || s.weeksPlayed).map(s => s.season).reverse();
  const season = seasons.includes(params.get('season')) ? params.get('season') : seasons[0];
  const s = DATA.seasons.find(x => x.season === season);
  const done = s.status === 'complete';
  const fo = ledger();
  const totals = await seasonTotals(DATA, season);
  if (route().page !== 'commish') return;
  const key = done ? seasonEndKey(DATA, season) : Number(season) * 100 + 99; // who has him now / at season's end
  const owner = pid => {
    const o = ownerAt(fo, pid, key);
    return o ? teamName(o, season) : 'Free agent';
  };
  const spots = s.playoffTeams?.length || 6;
  const table = standingsBefore(DATA, season, 99);
  const inPlayoffs = o => (done ? (s.playoffTeams ?? []).includes(o) : (table.by[o]?.dec ? table.by[o].rank <= spots : null));
  const gm = gmOfTheYear(DATA, fo, season);
  const poy = playerOfTheYear(DATA, season, 10);
  const noGames = !totals.rows.length && !poy.length;
  const list = (rows, value, sub) => (rows.length ? `<ol class="aw-race">${rows.map((r, i) => `
    <li${i === 0 ? ' class="win"' : ''}><span>${i + 1}. ${esc(r.name ?? DATA.players?.[r.pid]?.n ?? r.pid)}<small>${esc(sub(r))}</small></span><b>${value(r)}</b></li>`).join('')}</ol>`
    : '<p class="empty">No games yet.</p>');
  const card = (title, rule, inner) => `
    <section class="card"><div class="card-head"><h2>${title}</h2></div><p class="cm-rule">${rule}</p>${inner}</section>`;
  const groupOf = pos => (/^(PG|SG|G)/.test(pos) ? 'G' : /^(SF|PF|F)/.test(pos) ? 'F' : /^C/.test(pos) ? 'C' : null);
  // All-Stars: the named teams once the break has passed (they're saved then), the
  // race so far before it, and nothing for seasons before the league named any.
  const named = Number(season) >= Number(ALL_STARS_FROM) ? allStars(DATA, fo, season, ALL_STAR_POSITIONS, ALL_STARS_FROM) : null;
  const starTeams = teams => `<div class="aw-stars">${POSITION_GROUPS.map(([g, label]) => `<div><div class="aw-race-title">${label}</div>${teams(g)}</div>`).join('')}</div>`;
  const starCard = Number(season) < Number(ALL_STARS_FROM)
    ? { rule: `The league started naming All-Stars in ${esc(ALL_STARS_FROM)}.`, inner: '' }
    : named?.awarded
      ? { rule: `Named at the NBA All-Star break: top 5 guards, forwards and centers in total fantasy points through ${esc(new Date(`${named.through}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' }))}.`,
        inner: starTeams(g => list(named.teams[g], r => num(r.fp), r => [r.o === null ? 'Free agent' : r.o ? teamName(r.o, season) : '', r.pos].filter(Boolean).join(' · '))) }
      : done
        ? { rule: 'Added with the next nightly update.', inner: '' }
        : { rule: 'If named today: top 5 guards, forwards and centers in total fantasy points so far. The real teams are named at the NBA All-Star break.',
          inner: starTeams(g => list(totals.rows.filter(r => groupOf(r.pos) === g).slice(0, 5), r => num(r.fp), r => [owner(r.pid), r.pos].filter(Boolean).join(' · '))) };

  // Draft of the Year / Steal of the Draft: this season's rookie draft, judged on the
  // rookies' first season (the same as the banner once the season is over).
  const draftRace = draftOfYear(DATA, season);
  const noDraft = draftRace?.none;
  const draftRule = `The best class grade from the ${esc(season)} rookie draft, in fantasy points per game against each draft spot’s expectation${done ? ', after year one' : ', so far'}.`;
  const draftEmpty = noDraft
    ? `No rookie draft in ${esc(season)}${DATA.drafts?.some(d => d.s === season && d.kind === 'startup') ? ': the startup draft built the league' : ''}.`
    : `Starts once the ${esc(season)} rookies have played ${MIN_GAMES} NBA games.`;
  const finalsMvp = done ? championshipMvp(DATA, season) : null;

  body.innerHTML = `
    <label class="hy-pick cm-pick">
      <span class="hy-pick-label">Season</span>
      <span class="ed-select"><span class="hy-pick-val">${esc(season)}${done ? ' (final)' : ' (so far)'}</span>
        <svg class="caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5l3-3"/></svg>
        <select id="cm-season" aria-label="Season">${seasons.map(x => `<option value="${x}"${x === season ? ' selected' : ''}>${x}${DATA.seasons.find(y => y.season === x).status === 'complete' ? ' (final)' : ' (in progress)'}</option>`).join('')}</select>
      </span>
    </label>
    ${noGames ? `<p class="hy-banner">${icon('clock')}<span><b>No games yet in ${esc(season)}.</b> The races fill in once the season tips off${HYPE_NOW.tipoff && !done ? ` on ${esc(prettyDate(HYPE_NOW.tipoff))}` : ''}. Pick ${esc(seasons[1] ?? 'last season')} above to see how the races finished.</span></p>` : ''}
    ${done ? '<p class="filter-note">A finished season: these match its banner on the Awards page.</p>' : '<p class="filter-note">Where each award stands today. Teams are who has the player now.</p>'}
    <div class="cm-races">
      ${card('01 · GM of the Year', `Locked points added by ${esc(season)} moves. Playoff teams only${done ? '' : `: ✓ = in a playoff spot today (top ${spots})`}.`,
        `<ol class="aw-race">${gm.rows.map((r, i) => `<li${r === gm.winner ? ' class="win"' : ''}><span>${i + 1}. ${esc(teamName(r.o, season))}${inPlayoffs(r.o) ? ' <i class="cm-in">✓</i>' : ''}<small>${esc(name(r.o))} · trades ${signedPts(r.trades)} · pickups ${signedPts(r.pickups)} · rookies ${signedPts(r.rookies)} · drops ${signedPts(r.drops)}</small></span><b>${signedPts(r.total)}</b></li>`).join('')}</ol>`)}
      ${card('02 · Player of the Year', 'Most locked points this season, every team he started for.',
        list(poy, r => num(r.pts), r => `${teamName(r.team, season)} · ${r.weeks} weeks started`))}
      ${card('03 · League MVP', 'Most total fantasy points (every game, rostered or not).',
        list(totals.rows.slice(0, 5), r => num(r.fp), r => [owner(r.pid), r.pos, `${r.gp} games`].filter(Boolean).join(' · ')))}
      ${card('04 · Rookie of the Year', 'Most total fantasy points by a rookie (no NBA games in the 10 seasons before).',
        list(totals.rookies.slice(0, 5), r => num(r.fp), r => [owner(r.pid), r.pos, `${r.gp} games`].filter(Boolean).join(' · ')))}
      ${card('05 · All-Stars', starCard.rule, starCard.inner)}
      ${card('06 · All-Fantasy Team', `The top 10 in total fantasy points on a playoff team${done ? '' : ` (today: a team in the top ${spots})`}.`,
        list(totals.rows.filter(r => { const o = ownerAt(fo, r.pid, key); return o && inPlayoffs(o) !== false; }).slice(0, 10), r => num(r.fp), r => [owner(r.pid), r.pos, `${r.gp} games`].filter(Boolean).join(' · ')))}
      ${card('07 · All-Rookie Team', 'The top 5 rookies in total fantasy points (ties at 5th all make it).',
        list(totals.rookies.filter((r, i, all) => i < 5 || (all[4] && r.fp === all[4].fp)), r => num(r.fp), r => [owner(r.pid), r.pos, `${r.gp} games`].filter(Boolean).join(' · ')))}
      ${card('08 · Draft of the Year', draftRule, draftRace && !noDraft ? `<ol class="aw-race">${draftRace.rows.map((r, i) => `<li${i === 0 ? ' class="win"' : ''}><span>${i + 1}. ${esc(teamName(r.owner, season))}<small>${esc(name(r.owner))} · ${r.picks.length} pick${r.picks.length === 1 ? '' : 's'} · ${perGame(r.diff)} pts/game vs spots · best: ${esc(playerName(r.best.pid))}</small></span><b>${r.grade}</b></li>`).join('')}</ol>` : `<p class="empty">${draftEmpty}</p>`)}
      ${card('09 · Steal of the Draft', `The ${esc(season)} rookie pick furthest above what its draft spot is expected to produce, in fantasy points per game${done ? ' after year one' : ' so far'}.`,
        draftRace?.steals?.length ? `<ol class="aw-race">${draftRace.steals.map((p, i) => `<li${i === 0 ? ' class="win"' : ''}><span>${i + 1}. ${esc(playerName(p.pid))}<small>${pickLabel(p)} · ${esc(name(p.o))} · ${fpg(p.value)} vs ${fpg(p.expected)} expected</small></span><b>${perGame(pickDiff(p))}</b></li>`).join('')}</ol>` : `<p class="empty">${draftEmpty}</p>`)}
      ${card('Championship MVP', 'The champion’s player with the most locked points in the title game.',
        finalsMvp ? `<ol class="aw-race"><li class="win"><span>${esc(playerName(finalsMvp.pid))}<small>${esc(teamName(s.champion, season))} · title game</small></span><b>${num(finalsMvp.pts)}</b></li></ol>`
          : `<p class="empty">Decided in the championship game${s.playoffStart ? ` (around week ${s.playoffStart + 2})` : ''}.</p>`)}
    </div>`;
  $('#cm-season', body)?.addEventListener('change', e => { location.hash = `#/commish?tab=races&season=${e.target.value}`; });
}

// ---- Early hype: upcoming weeks' Matchup Hype before it's revealed ----

async function renderEarlyHype(body, params) {
  HYPE_NOW ??= await hypeNow();
  const cur = DATA.seasons.at(-1);
  const season = cur.season;
  const lastRegular = (cur.playoffStart ?? 99) - 1;
  const future = HYPE_NOW.done ? [] : seasonWeeks(DATA, season).map(x => x.w).filter(w => w > HYPE_NOW.week && w <= lastRegular && weekPairs(DATA, season, w).length);
  if (!future.length) {
    body.innerHTML = '<section class="card soon-card"><p>No upcoming weeks to preview. Early hype returns when next season’s schedule is set.</p></section>';
    return;
  }
  const week = future.includes(Number(params.get('week'))) ? Number(params.get('week')) : future[0];
  const slate = hypeSlate(DATA, season, week);
  const g0 = slate.games[0];
  const weeksAway = week - Math.max(HYPE_NOW.week, 0);

  body.innerHTML = `
    <label class="hy-pick cm-pick">
      <span class="hy-pick-label">Week</span>
      <span class="ed-select"><span class="hy-pick-val">Week ${week}</span>
        <svg class="caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5l3-3"/></svg>
        <select id="cm-week" aria-label="Week">${future.map(w => `<option value="${w}"${w === week ? ' selected' : ''}>Week ${w}${w === future[0] ? ' (next to be revealed)' : ''}</option>`).join('')}</select>
      </span>
    </label>
    ${slate.rivalryWeek ? rivalryBanner() : ''}
    <p class="hy-banner">${icon('lock')}<span><b>Not public yet.</b> Week ${week} is revealed to everyone ${week === 1 && HYPE_NOW.reveal ? `on ${esc(prettyDate(HYPE_NOW.reveal))}` : 'when it starts'}. ${weeksAway > 1 ? `This preview uses only the results so far; ${weeksAway - 1} more week${weeksAway - 1 === 1 ? '' : 's'} will be played first, so the hype can change by then.` : week === 1 ? 'Nothing is played before it, so this is what everyone will see unless a manager or team name changes.' : 'It uses the same results the announcement will, so this is very likely what everyone will see (unless last week’s results are still coming in).'}</span></p>

    <section class="card hy-why">
      <div class="card-head"><h2>Week ${week} main event</h2><span class="card-sub">${esc(season)}</span></div>
      <div class="cm-main">
        <div class="cm-main-teams"><b>${esc(teamName(g0.a, season))}</b> <i>vs</i> <b>${esc(teamName(g0.b, season))}</b><small>${esc(name(g0.a))} vs ${esc(name(g0.b))}</small></div>
        <div class="hy-score"><b>${g0.hype}</b><span>Hype score</span></div>
      </div>
      <ul class="hy-reasons">${g0.labels.map(l => `<li>${chip(l)}<span>${esc(l.why)}</span></li>`).join('')}</ul>
    </section>

    <section class="card hy-slate">
      <div class="card-head"><h2>The full slate</h2><span class="card-sub">Week ${week} · ranked by hype</span></div>
      ${slate.games.map((x, i) => `
        <div class="hy-game cm-hype-game">
          <span class="hy-g-rank">${i + 1}</span>
          <span class="hy-g-teams"><b>${esc(teamName(x.a, season))}</b> <i>vs</i> <b>${esc(teamName(x.b, season))}</b>
            <small>${x.labels.map(chip).join('')}</small>
            ${x.labels.length ? `<span class="cm-why">${x.labels.map(l => esc(l.why)).join(' ')}</span>` : '<span class="cm-why">No labels: nothing special on paper.</span>'}
            <span class="cm-parts">${HYPE_PARTS.map(p => `${p.name} ${Math.round(x.parts[p.id])}`).join(' · ')}</span></span>
          <span class="hy-g-hype"><b>${x.hype}</b><small>Hype</small></span>
        </div>`).join('')}
    </section>`;
  $('#cm-week', body)?.addEventListener('change', e => { location.hash = `#/commish?tab=hype&week=${e.target.value}`; });
}

async function renderHealth(body) {
  const fo = ledger();
  const at = await scoutWeek().catch(() => null);
  const [runs, check, guard, ctx] = await Promise.all([
    fetch('https://api.github.com/repos/debugburkhart/seis-dynasty-hoops/actions/runs?per_page=5').then(r => (r.ok ? r.json() : null)).catch(() => null),
    fetch(`data/scoring-check.txt?t=${Date.now()}`).then(r => (r.ok ? r.text() : null)).catch(() => null),
    fetch(`data/week-guard.json?t=${Date.now()}`).then(r => (r.ok ? r.json() : null)).catch(() => null),
    at ? loadWeek(DATA, at.season, at.week).catch(() => null) : null,
  ]);
  if (route().page !== 'commish') return;
  const when = x => new Date(x).toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const ok = (good, text) => `<span class="cm-status ${good ? 'good' : 'bad'}">${good ? '✓' : '!'}</span>${text}`;
  const acts = activity(DATA);
  const inSeason = DATA.seasons.at(-1).status === 'in_season' && at?.started;
  const flags = tradeFlags(DATA, fo);
  const lineups = ctx ? lineupIssues(DATA, ctx) : [];
  const taxi = ctx ? await taxiCheck(DATA, ctx.rosters, ctx.league, at.season).catch(() => null) : null;
  if (route().page !== 'commish') return;
  const taxiName = pid => {
    const i = ctx?.info?.[pid];
    return i ? `${i.first_name} ${i.last_name}` : DATA.players?.[pid]?.n ?? `Player ${pid}`;
  };
  const holds = Object.entries(guard ?? {});
  const corrections = [
    ...CORRECTIONS.map(c => `${c.season} week ${c.week}: ${[c.scores && `scores for ${Object.keys(c.scores).join(', ')}`, c.players && `player points for ${Object.keys(c.players).join(', ')}`].filter(Boolean).join('; ')}`),
    ...DRAFT_CORRECTIONS.map(c => `${c.season} draft pick ${c.pick}: ${c.ignore ? 'left out of the draft records' : `counted as ${c.player}`}`),
    ...Object.keys(PHOTO_CORRECTIONS).map(n => `Photo for ${n} from NBA.com`),
    ...Object.entries(ALL_STAR_POSITIONS).flatMap(([s, m]) => Object.entries(m).map(([n, p]) => `${s} All-Star position for ${n}: ${p}`)),
  ];

  body.innerHTML = `
    <section class="card">
      <div class="card-head"><h2>Nightly update</h2><span class="card-sub">Data from ${esc(when(DATA.generatedAt))} CT</span></div>
      <ul class="cm-checks">
        ${runs?.workflow_runs ? runs.workflow_runs.map(r => `<li>${ok(r.conclusion === 'success', `<b>${esc(r.display_title)}</b> <small>${esc(when(r.created_at))} · ${esc(r.conclusion ?? r.status)}</small>`)}</li>`).join('') : '<li>Couldn’t reach GitHub for the run history.</li>'}
      </ul>
      <p class="filter-note"><a href="https://github.com/debugburkhart/seis-dynasty-hoops/actions" target="_blank" rel="noopener">All runs on GitHub</a></p>
    </section>

    <section class="card">
      <div class="card-head"><h2>Data checks</h2></div>
      <ul class="cm-checks">
        <li>${check == null ? '<span class="cm-status">?</span>Scoring check result isn’t available here (it is on the live site).' : check.trim() ? ok(false, `<b>Scoring check found problems</b><pre class="cm-pre">${esc(check.trim())}</pre>`) : ok(true, '<b>Scoring check passed.</b> Every weekly score matches Sleeper’s standings and every lineup adds up.')}</li>
        <li>${(DATA.warnings ?? []).length ? ok(false, `<b>corrections.js warnings</b><pre class="cm-pre">${esc(DATA.warnings.join('\n'))}</pre>`) : ok(true, 'No problems with corrections.js.')}</li>
        <li>${holds.length ? ok(false, `<b>Weeks held back by the week guard:</b> ${holds.map(([k, v]) => `${esc(k.replace('|', ' week '))} (night ${v.nights})`).join(', ')}`) : ok(true, 'No weeks held back by the week guard.')}</li>
        <li>${fo.unusedDuplicates.length ? ok(false, `<b>Draft picks recorded as a duplicate player:</b> ${fo.unusedDuplicates.map(p => `${p.s} pick ${p.no} (${esc(name(p.o))})`).join(', ')}`) : ok(true, 'No unresolved duplicate draft picks.')}</li>
        <li>${ok(true, `Frozen seasons: ${DATA.seasons.filter(s => s.frozen).map(s => s.season).join(', ') || 'none'}.`)}</li>
      </ul>
      <details class="cm-group"><summary>Corrections in effect <small>${corrections.length}</small></summary><ul class="cm-list">${corrections.map(c => `<li>${esc(c)}</li>`).join('')}</ul></details>
    </section>

    <section class="card">
      <div class="card-head"><h2>Lineup check</h2><span class="card-sub">${at ? `Week ${at.week}${at.started ? '' : ' (before tip-off)'}` : 'No week to check'}</span></div>
      ${ctx ? `<ul class="cm-checks">${lineups.map(l => `<li>${ok(!l.issues.length, `<b>${esc(teamName(l.owner, at.season))}</b> <small>${esc(name(l.owner))}</small>${l.issues.length ? `<span class="cm-issues">${l.issues.map(esc).join(' · ')}</span>` : ' <small>All set</small>'}`)}</li>`).join('')}</ul>` : '<p class="empty">Couldn’t load rosters from Sleeper.</p>'}
    </section>

    <section class="card">
      <div class="card-head"><h2>Taxi squad limit</h2><span class="card-sub">${taxi ? `A player can stay on taxi through his ${ordinalPlace(taxi.years)} NBA season` : ''}</span></div>
      ${!taxi ? '<p class="empty">Couldn’t load taxi squads from Sleeper.</p>'
        : taxi.flagged.length ? `<ul class="cm-checks">${taxi.flagged.map(f => `<li>${ok(false, `<b>${esc(taxiName(f.pid))}</b> on ${esc(teamName(f.owner, at.season))} <small>${esc(name(f.owner))} · already played NBA seasons ${f.seasons.join(', ')}</small>`)}</li>`).join('')}</ul>`
        : `<ul class="cm-checks"><li>${ok(true, `Every taxi player is within his first ${taxi.years} NBA seasons.`)}</li></ul>`}
      <p class="cm-rule">League rule: a player can stay on taxi until he completes his ${ordinalPlace(taxi?.years ?? 3)} NBA season, so he’s flagged once he has played ${taxi?.years ?? 3} NBA seasons before this one. Seasons are counted from real NBA games.</p>
    </section>

    <section class="card">
      <div class="card-head"><h2>Activity watch</h2><span class="card-sub">Last move by each manager (commissioner moves aside)</span></div>
      <ul class="cm-checks">${acts.map(a => `<li>${ok(!inSeason || (a.days ?? 99) <= 21, `<b>${esc(name(a.owner))}</b> <small>${a.last ? `${esc(when(a.last))} · ${a.days} day${a.days === 1 ? '' : 's'} ago` : 'no moves yet'} · ${a.season} move${a.season === 1 ? '' : 's'} this season</small>`)}</li>`).join('')}</ul>
      <p class="filter-note">${inSeason ? 'Flagged: no move in more than 3 weeks during the season.' : 'Flags start once the season tips off.'}</p>
    </section>

    <section class="card">
      <div class="card-head"><h2>Trade review</h2><span class="card-sub">This season and last</span></div>
      <ul class="cm-checks">
        ${flags.lopsided.length ? flags.lopsided.map(x => `<li>${ok(false, `<b>${esc(x.t.s)} Wk ${x.t.w}: ${x.t.owners.map(name).map(esc).join(' ⇄ ')}</b> <small>${esc(name(x.best.o))} ${x.best.est ? 'leads' : 'won'} by ${num(x.best.net)} locked pts${x.best.est ? ' (still changing)' : ''}</small>`)}</li>`).join('') : `<li>${ok(true, `No trade has a side ahead by ${LOPSIDED}+ locked points.`)}</li>`}
        ${flags.repeats.length ? flags.repeats.map(p => `<li>${ok(false, `<b>${esc(name(p.a))} and ${esc(name(p.b))}</b> <small>traded ${p.n} times in ${p.s}</small>`)}</li>`).join('') : `<li>${ok(true, `No pair of managers traded ${REPEAT_TRADES}+ times in one season.`)}</li>`}
      </ul>
      <p class="filter-note">Lopsided means one side is ahead by ${LOPSIDED}+ locked points on the Value Desk. That’s often just a trade that worked out, so it’s a prompt to look, not proof of anything.</p>
    </section>`;
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

// ---------- Home ----------
// One look at the league right now: this week's Main event, a scrolling record
// watch, the top of the Power Rankings, all-time standings and the latest moves.
// Every piece links to its full page.

const HOME_BY = [['wins', 'Wins'], ['titles', 'Titles'], ['median', 'Median %'], ['pf', 'Total points'], ['pps', 'Pts / season']];
let homeBy = 'wins';

// The week the Matchup Hype page opens on: the week under way, or else the
// last week with games.
async function homeHypeWeek() {
  HYPE_NOW ??= await hypeNow();
  const now = HYPE_NOW;
  const cur = DATA.seasons.at(-1);
  if (!now.done && now.week >= 1) {
    const live = !DATA.games.some(g => g.s === cur.season && g.w === now.week);
    return { season: cur.season, week: now.week, live, now };
  }
  const season = DATA.games.map(g => g.s).sort().at(-1);
  if (!season) return { now };
  const week = seasonWeeks(DATA, season).filter(x => DATA.games.some(g => g.s === season && g.w === x.w)).at(-1)?.w;
  return { season, week, live: false, now };
}

// Fills the Main event card. Returns true when the week is being played, so
// the scores are worth refreshing. refresh: a timed update of a card already
// shown, which keeps the old card if Sleeper doesn't answer.
async function homeHype(box, refresh = false) {
  let pick;
  try { pick = await homeHypeWeek(); } catch { pick = {}; }
  if (!box.isConnected) return false;
  const { season, week, live, now } = pick;
  const cur = DATA.seasons.at(-1);
  if (!season || !week) {
    box.innerHTML = '<a class="card hm-card hm-link" href="#/hype"><p class="empty">Matchup Hype starts with week 1 of the season.</p></a>';
    return false;
  }
  let liveData = null;
  if (live) {
    try { liveData = await liveWeek(season, week); } catch { /* scores just won't be live */ }
    if (!box.isConnected || (refresh && !liveData)) return live;
  }
  const pairs = liveData?.pairs ?? weekPairs(DATA, season, week);
  const slate = hypeSlate(DATA, season, week, pairs);
  const g = slate.games[0];
  if (!g) {
    box.innerHTML = `<a class="card hm-card hm-link" href="#/hype"><p class="empty">Week ${week}’s matchups show up once Sleeper sets them.</p></a>`;
    return live;
  }
  const score = o => (g.final ? (o === g.a ? g.final.ap : g.final.bp) : liveData?.scores?.[o]);
  const sa = score(g.a);
  const sb = score(g.b);
  const hasScore = sa != null && (sa || sb);
  const winner = g.final && g.final.win !== 'tie' ? (g.final.win === 'A' ? g.a : g.b) : null;
  const side = (o, t) => {
    const av = avatarUrl(DATA.owners[o]?.avatar);
    return `
      <div class="hm-side${winner === o ? ' won' : ''}">
        ${av ? `<img class="hy-av" src="${av}" alt="" loading="lazy">` : `<span class="hy-av avatar-blank">${esc(name(o)[0])}</span>`}
        <div class="hm-team">${esc(teamName(o, season))}</div>
        <div class="hm-owner">${esc(name(o))}${t ? ` · <span class="nw">${rec(t.w, t.l, t.t)}</span>` : ''}</div>
      </div>`;
  };
  const waiting = !(now.done || now.week >= 1) && now.tipoff && cur.season !== season;
  const when = waiting ? `Last Main event · ${season} Week ${week}` : live ? `This week · Week ${week}` : `${season} · Week ${week}`;
  const status = g.final ? 'Final' : live && hasScore ? `Live · updated ${new Date(liveData.at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : live ? 'Tip-off pending' : '';
  const why = g.labels.find(l => l.id === 'main')?.why ?? g.labels[0]?.why;
  box.innerHTML = `
    <a class="hm-main" href="#/hype?${new URLSearchParams({ season, week, m: g.a })}">
      <div class="hm-main-top">
        <span class="hm-kicker">${icon('bolt')} ${esc(when)}${g.label ? ` · ${esc(g.label)}` : ''}</span>
        <span class="hm-hype"><b>${g.hype}</b> Hype</span>
      </div>
      <div class="hm-duel">
        ${side(g.a, g.tA)}
        <div class="hm-mid">
          ${hasScore ? `<div class="hm-score"><span${winner === g.a ? ' class="won"' : ''}>${num(sa)}</span><i>–</i><span${winner === g.b ? ' class="won"' : ''}>${num(sb)}</span></div>` : '<div class="hm-vs">VS</div>'}
          ${status ? `<div class="hm-status">${esc(status)}</div>` : ''}
        </div>
        ${side(g.b, g.tB)}
      </div>
      ${g.labels.length ? `<div class="hm-chips">${g.labels.slice(0, 3).map(chip).join('')}</div>` : ''}
      ${why ? `<p class="hm-why">${esc(why)}</p>` : ''}
      <span class="hm-go">Full matchup ${icon('arrow')}</span>
    </a>
    ${waiting ? `<p class="hm-note">${icon('clock')}<span>The ${esc(cur.season)} season tips off ${esc(prettyDate(now.tipoff))}. Week 1’s Main event drops ${esc(prettyDate(now.reveal))}.</span></p>` : ''}`;
  return live;
}

// Newest record changes, league and personal together.
function homeRecordItems() {
  loadRecordEvents();
  const seen = new Set();
  const league = [];
  for (let i = EVENTS.length - 1; i >= 0 && league.length < 8; i--) {
    const e = EVENTS[i];
    const k = `${e.cat}/${e.title}`;
    if (seen.has(k)) continue;
    seen.add(k);
    league.push(e);
  }
  const personal = [...(PERSONAL ?? [])].sort((a, b) => (b.order ?? 0) - (a.order ?? 0)).slice(0, 6);
  const when = e => Number(e.s) * 100 + e.w;
  return [...league, ...personal].sort((a, b) => when(b) - when(a) || (a.personal ? 1 : 0) - (b.personal ? 1 : 0)).slice(0, 14);
}

function homeTicker() {
  const items = homeRecordItems();
  if (!items.length) return '';
  const catTitle = id => CATEGORIES.find(c => c.id === id)?.title ?? id;
  const item = (e, copy) => {
    const href = e.personal
      ? `#/records/${e.cat}?manager=${encodeURIComponent(e.owner)}&rec=${slug(e.title)}`
      : `#/records/${e.cat}?rec=${slug(e.title)}`;
    const player = e.personal && e.holders[0].whoText;
    const who = e.personal ? `${esc(name(e.owner))}${player ? `</b> · ${esc(player)}<b>` : ''}` : holderNames(e.holders);
    return `
      <a class="hm-tk-item${e.personal ? ' rb-personal' : ''}" href="${href}"${copy ? ' tabindex="-1" aria-hidden="true"' : ''}>
        <span class="hm-tk-top">
          <span class="rb-pill rb-${e.personal ? 'personal' : e.type}">${esc(CHANGE_LABELS[e.personal ? 'personal' : e.type])}</span>
          <span class="rb-when">${e.s} · Wk ${e.w}</span>
        </span>
        <span class="hm-tk-title">${esc(e.title)} <small>${esc(catTitle(e.cat))}</small></span>
        <span class="hm-tk-who"><b>${who}</b> <span class="rb-val">${esc(e.holders[0].display)}</span></span>
      </a>`;
  };
  const list = items.map(e => item(e)).join('');
  return `
    <section class="hm-ticker" aria-label="Recently broken records">
      <a class="hm-tk-label" href="#/records">${icon('flame')}<span>Record<br>watch</span></a>
      <div class="hm-tk-view">
        <div class="hm-tk-track" style="--hm-dur:${items.length * 5}s">${list}<span class="hm-tk-copy">${items.map(e => item(e, true)).join('')}</span></div>
      </div>
    </section>`;
}

function homePower() {
  const withWeeks = powerSeasons(DATA).filter(s => s.weeks.length);
  const pick = withWeeks.at(-1);
  if (!pick) return '';
  const week = pick.weeks.at(-1);
  const ed = powerRankings(DATA, pick.season, week);
  const href = `#/power?season=${pick.season}&week=${week}`;
  const edition = pick.complete ? `${pick.season} · Final edition` : `${pick.season} · After week ${week}`;
  const move = m => (!m ? '' : m > 0 ? `<span class="pw-move pw-up">↑ ${m}</span>` : `<span class="pw-move pw-down">↓ ${-m}</span>`);
  return `
    <section class="card hm-card">
      <div class="hm-head"><h2>${icon('gauge')} Power Rankings</h2><a class="hm-all" href="#/power">All ${ed.rows.length} ${icon('arrow')}</a></div>
      <p class="card-sub">${esc(edition)}</p>
      <ol class="hm-list">
        ${ed.rows.slice(0, 3).map(r => `
          <li><a class="hm-row${r.rank === 1 ? ' hm-first' : ''}" href="${href}">
            <span class="hm-rank">${r.rank}</span>
            <span class="pw-badge">${esc(initials(r.team))}</span>
            <span class="hm-name"><b>${esc(r.team)}</b><small>${esc(name(r.owner))} · ${rec(r.w, r.l, r.t)} ${move(r.move)}</small></span>
            <span class="hm-val"><b>${r.power.toFixed(1)}</b><small>Power</small></span>
          </a></li>`).join('')}
      </ol>
    </section>`;
}

function homeStandingsRows() {
  const by = RANK_BY.find(([id]) => id === homeBy);
  const label = HOME_BY.find(([id]) => id === homeBy)[1];
  const { rows } = standings(DATA, { period: 'all', stage: 'regular' });
  const val = by[2];
  rows.sort((a, b) => val(b) - val(a) || b.pct - a.pct || b.pf - a.pf);
  const shown = v => (homeBy === 'median' ? pct1(v) : homeBy === 'pf' || homeBy === 'pps' ? num(v) : v);
  const sub = r => (homeBy === 'titles' ? `${r.seasons} season${r.seasons === 1 ? '' : 's'}`
    : homeBy === 'median' ? `${rec(r.median.w, r.median.l, r.median.t)} vs median`
    : `${rec(r.w, r.l, r.t)} · ${r.g ? pct1(r.pct) : '—'}`);
  // Equal values share a rank.
  const rank = i => (i && val(rows[i - 1]) === val(rows[i]) ? rank(i - 1) : i + 1);
  const href = `#/standings?${new URLSearchParams({ tab: 'table', period: 'all', stage: 'regular', by: by[0], dir: 'desc' })}`;
  return rows.slice(0, 5).map((r, i) => `
    <li><a class="hm-row${rank(i) === 1 ? ' hm-first' : ''}" href="${href}">
      <span class="hm-rank">${rank(i)}</span>
      <span class="hm-name"><b>${esc(name(r.owner))}</b><small>${esc(sub(r))}</small></span>
      <span class="hm-val"><b>${shown(val(r))}</b><small>${esc(label)}</small></span>
    </a></li>`).join('');
}

function homeStandings() {
  return `
    <section class="card hm-card">
      <div class="hm-head"><h2>${icon('list')} All-time standings</h2><a class="hm-all" href="#/standings?tab=table">Full table ${icon('arrow')}</a></div>
      <div class="hm-tabs" role="tablist" aria-label="Rank by">
        ${HOME_BY.map(([id, label]) => `<button type="button" role="tab" data-by="${id}" aria-selected="${id === homeBy}" class="${id === homeBy ? 'on' : ''}">${label}</button>`).join('')}
      </div>
      <ol class="hm-list" id="hm-st">${homeStandingsRows()}</ol>
      <p class="hm-foot">Regular season, every season. Records include league-median games, as in Sleeper.</p>
    </section>`;
}

function homeWireRow(m) {
  const [label, cls] = TX_PILL[m.kind];
  const pl = pid => DATA.players?.[pid]?.n ?? `Player ${pid}`;
  let what;
  let detail;
  if (m.kind === 'trades') {
    what = [...new Set(m.owners)].map(o => esc(name(o))).join(' <i class="hm-swap">⇄</i> ');
    detail = m.trade
      ? m.trade.sides.map(sd => `${esc(name(sd.o))} gets ${esc(sd.got.map(assetName).join(', ') || 'nothing')}`).join(' · ')
      : '';
  } else {
    what = esc(name(m.owners[0] ?? m.adds[0]?.o ?? m.drops[0]?.o));
    detail = [...m.adds.map(a => `<span class="hm-in">+</span> ${esc(pl(a.pid))}`), ...m.drops.map(d => `<span class="hm-out">−</span> ${esc(pl(d.pid))}`)].join(' &nbsp;');
  }
  return `
    <li><a class="hm-tx" href="#/transactions?type=${m.kind}&season=${m.s}">
      <span class="tx-pill ${cls}">${label}</span>
      <span class="hm-tx-body"><b>${what}</b><small>${detail}</small></span>
      <span class="hm-tx-date">${shortDate(m.ts) || `Wk ${m.w}`}</span>
    </a></li>`;
}

function homeWire() {
  TXLOG ??= transactionLog(DATA, ledger());
  const latest = TXLOG.slice(0, 6);
  return `
    <section class="card hm-card">
      <div class="hm-head"><h2>${icon('swap')} Transaction wire</h2><a class="hm-all" href="#/transactions">All moves ${icon('arrow')}</a></div>
      ${latest.length ? `<ol class="hm-wire">${latest.map(homeWireRow).join('')}</ol>` : '<p class="empty">No moves yet.</p>'}
    </section>`;
}

function renderHome(main) {
  main.innerHTML = `
    <div class="page page-wide hm">
      <div class="page-head">
        <div class="page-icon">${icon('home')}</div>
        <div><div class="eyebrow">${esc(DATA.name)}</div><h1>Home</h1></div>
      </div>
      <div id="hm-hype"><div class="hm-main hm-loading"><span class="hm-kicker">${icon('bolt')} Main event</span><p>Checking this week’s slate…</p></div></div>
      ${homeTicker()}
      <div class="hm-grid">
        ${homePower()}
        ${homeStandings()}
      </div>
      ${homeWire()}
    </div>`;

  main.querySelectorAll('.hm-tabs button').forEach(b => b.addEventListener('click', () => {
    homeBy = b.dataset.by;
    main.querySelectorAll('.hm-tabs button').forEach(x => {
      x.classList.toggle('on', x === b);
      x.setAttribute('aria-selected', x === b);
    });
    $('#hm-st', main).innerHTML = homeStandingsRows();
  }));
  // While a week is being played, refresh the Main event's scores every minute.
  const box = $('#hm-hype', main);
  homeHype(box).then(live => {
    if (!live || !box.isConnected) return;
    HYPE_TIMER = setInterval(() => {
      if (!box.isConnected) return clearInterval(HYPE_TIMER);
      homeHype(box, true);
    }, 60_000);
  });
}

// ---------- Rulebook ----------
// The league's rules (assets/rules.js), grouped by the season each was added.
// A changed point shows today's rule with a note; every addition and change is
// also listed by season at the bottom.

const seasonSpan = s => `${s}-${String(Number(s) + 1).slice(-2)}`;

function renderRules(main) {
  const cur = DATA.seasons.at(-1).season;
  const letter = i => String.fromCharCode(97 + i);
  const changeNote = c => (c ? `<span class="rl-change">Changed in ${seasonSpan(c.season)} · was ${esc(c.was)}</span>` : '');
  const addNote = (p, rule) => (p.added && p.added !== rule.added ? `<span class="rl-change rl-added">Added in ${seasonSpan(p.added)}</span>` : '');
  const point = (p, label, rule, depth) => {
    const x = typeof p === 'string' ? { text: p } : p;
    return `
      <li>
        <span class="rl-num">${label}</span>
        <div class="rl-text">${esc(x.text)}${changeNote(x.changed)}${addNote(x, rule)}
          ${x.items?.length ? `<ol class="rl-sub">${x.items.map((y, i) => point(y, depth ? String(i + 1) : letter(i), rule, depth + 1)).join('')}</ol>` : ''}
        </div>
      </li>`;
  };
  const eras = [...new Set(RULES.map(r => r.added))].sort();
  const eraTitle = s => (s === LEAGUE_START ? `Since the league began · ${seasonSpan(s)}` : `Added in ${seasonSpan(s)}`);

  // Every addition and change, by season.
  const walk = (list, rule, out) => {
    for (const p of list) {
      if (typeof p === 'string') continue;
      if (p.changed) out.push({ s: p.changed.season, text: `${rule.n}. ${rule.title}: now “${p.text}” (was ${p.changed.was})` });
      if (p.added && p.added !== rule.added) out.push({ s: p.added, text: `${rule.n}. ${rule.title}: added “${p.text}”` });
      if (p.items) walk(p.items, rule, out);
    }
  };
  const log = [];
  for (const r of RULES) {
    if (r.added !== LEAGUE_START) log.push({ s: r.added, text: `New rule: ${r.n}. ${r.title}` });
    walk(r.items, r, log);
  }
  const logSeasons = [...new Set(log.map(x => x.s))].sort().reverse();

  main.innerHTML = `
    <div class="page">
      <div class="page-head">
        <div class="page-icon">${icon('clipboard')}</div>
        <div><div class="eyebrow">${esc(DATA.name)}</div><h1>Rulebook</h1></div>
      </div>
      <p class="page-desc">The league’s rules, grouped by the season each one was added. Changed rules show today’s version with a note; the full history is at the bottom.</p>
      <nav class="dk-seasons rl-jump" aria-label="Jump to a season">
        ${eras.map(s => `<a href="#/rules" data-era="${s}">${s === LEAGUE_START ? 'Original rules' : seasonSpan(s)}</a>`).join('')}
        ${log.length ? '<a href="#/rules" data-era="changes">Rule changes</a>' : ''}
      </nav>
      ${eras.map(s => `
        <section class="rl-era" id="rl-${s}">
          <div class="rl-era-head"><h2>${eraTitle(s)}</h2>${s === cur ? '<span class="rl-new">New this season</span>' : ''}</div>
          ${RULES.filter(r => r.added === s).map(r => `
            <article class="card rl-rule">
              <h3><span class="rl-badge">${r.n}</span>${esc(r.title)}</h3>
              <ol class="rl-items">${r.items.map((p, i) => point(p, `${r.n}.${i + 1}`, r, 0)).join('')}</ol>
            </article>`).join('')}
        </section>`).join('')}
      ${log.length ? `
        <section class="card rl-log" id="rl-changes">
          <div class="card-head"><h2>Rule changes</h2><span class="card-sub">Every addition and change, newest first</span></div>
          ${logSeasons.map(s => `
            <div class="rl-log-season"><b>${seasonSpan(s)}</b>
              <ul>${log.filter(x => x.s === s).map(x => `<li>${esc(x.text)}</li>`).join('')}</ul>
            </div>`).join('')}
        </section>` : ''}
    </div>`;

  main.querySelectorAll('.rl-jump a').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    document.getElementById(`rl-${a.dataset.era}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
}

// ---------- Draft Kit ----------
// Three tabs on one page: Draft History (every board, colored by how each pick
// turned out), Future Drafts (who owns every pick of the next three drafts, plus
// the projected order of the next one) and Draft Grades (class grades and manager
// report cards). The math is in assets/draft.js.

const DRAFT_TABS = [['draft-history', 'Draft History'], ['future-drafts', 'Future Drafts'], ['draft-grades', 'Draft Grades']];
let DRAFT_GRADES;
let TRADED_PICKS; // { at, list } from Sleeper, refreshed after 5 minutes
let dkPath = null; // the traded future pick whose trade path is open

const pickLabel = p => `${p.round}.${String(p.inRound).padStart(2, '0')}`;
// Rookie of the Year winners (the Awards page leader of DATA.rookies): player id -> season.
const royOf = pid => Object.entries(DATA.rookies ?? {}).find(([, list]) => list[0]?.pid === pid)?.[0];
const royBadge = pid => {
  const s = royOf(pid);
  return s ? `<span class="dk-roy" title="${s} Rookie of the Year">${icon('trophy')}ROY ${yy(s)}</span>` : '';
};
// Hover card on a board square: what the player produced against what the spot
// is expected to produce. The first line is the heading.
function tipLines(p) {
  const head = `${playerName(p.pid)} · ${pickLabel(p)} (#${p.no})`;
  const exp = p.expected != null ? `Expected for this spot: ${fpg(p.expected)} pts/game${p.kind === 'startup' ? ' (startup picks)' : ''}` : '';
  if (p.value != null) {
    return [head, `Produced: ${fpg(p.value)} pts/game over ${p.gp} games`, exp,
      p.tier ? `${perGame(pickDiff(p))} vs the spot · ${TIERS.find(t => t.id === p.tier).label}` : ''].filter(Boolean);
  }
  if (p.limited) return [head, `Barely played: ${p.allGp} NBA game${p.allGp === 1 ? '' : 's'}, no ${MIN_GAMES}-game season yet`, exp].filter(Boolean);
  return [head, 'Not graded yet: no NBA season played', exp].filter(Boolean);
}

// One shared hover card, placed next to the square. Only on devices with a real
// mouse: on phones a hover handler can make the first tap show the card instead
// of opening the player.
function bindTips(main) {
  if (!matchMedia('(hover: hover)').matches) return;
  let tip = $('#dk-tip');
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'dk-tip';
    tip.className = 'dk-tip';
    tip.setAttribute('role', 'tooltip');
    document.body.append(tip);
    addEventListener('scroll', () => tip.classList.remove('on'), { passive: true });
  }
  const hide = () => tip.classList.remove('on');
  const show = a => {
    const [head, ...rest] = a.dataset.tip.split('|');
    tip.innerHTML = `<b>${esc(head)}</b>${rest.map(l => `<span>${esc(l)}</span>`).join('')}`;
    tip.classList.add('on');
    const r = a.getBoundingClientRect();
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    const left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8);
    const top = r.top - h - 8 >= 8 ? r.top - h - 8 : r.bottom + 8;
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  };
  main.querySelectorAll('.dk-cell[data-tip]').forEach(a => {
    a.addEventListener('mouseenter', () => show(a));
    a.addEventListener('mouseleave', hide);
    a.addEventListener('focus', () => show(a));
    a.addEventListener('blur', hide);
    a.addEventListener('click', hide);
  });
  $('.dk-scroll', main)?.addEventListener('scroll', hide, { passive: true });
}

const roundName = r => `${r}${{ 1: 'st', 2: 'nd', 3: 'rd' }[r] ?? 'th'}`;
const perGame = n => {
  const r = Math.round(n * 10) / 10;
  return r === 0 ? '0.0' : `${r > 0 ? '+' : '−'}${Math.abs(r).toFixed(1)}`;
};
// A pick's difference from the rounded numbers on screen, so 34.4 vs 26.5 reads +7.9.
const pickDiff = p => Math.round(p.value * 10) / 10 - Math.round(p.expected * 10) / 10;
const fpg = n => n.toFixed(1);
const playerName = pid => DATA.players?.[pid]?.n ?? `Player ${pid}`;
const playerLink = pid => `#/players?q=${encodeURIComponent(playerName(pid))}`;

// Season fantasy points for drafted players are saved nightly; until the first
// nightly run with them (or when the site builds live), they're pulled here.
async function draftKitData() {
  if (DRAFT_GRADES) return DRAFT_GRADES;
  if (!DATA.draftStats) {
    const pids = draftedPlayers(DATA);
    const out = {};
    await Promise.all(DATA.seasons.map(async s => {
      const [lg, stats] = await Promise.all([sleeper(`/league/${s.leagueId}`), sleeper(`/stats/nba/regular/${s.season}`)]);
      const pts = seasonPoints(stats, lg?.scoring_settings, pids);
      if (Object.keys(pts).length) out[s.season] = pts;
    }));
    DATA.draftStats = out;
  }
  return (DRAFT_GRADES = draftGrades(DATA));
}

const tierPill = p => (p.tier
  ? `<span class="dk-tier t-${p.tier}">${TIERS.find(t => t.id === p.tier).label}</span>`
  : `<span class="dk-tier t-${p.limited ? 'limited' : 'none'}">${p.limited ? 'Barely played' : 'Incomplete'}</span>`);
const gradeBadge = (g, big = false) => `<span class="dk-grade${big ? ' big' : ''} g-${g ? g[0].toLowerCase() : 'none'}">${g ?? 'INC'}</span>`;

function draftTabs(page) {
  return `
    <div class="st-tabs dk-tabs" role="tablist">
      ${DRAFT_TABS.map(([id, label]) => `<a role="tab" class="${id === page ? 'on' : ''}" href="#/${id}">${label.replace('Draft ', '').replace(' Drafts', '')}</a>`).join('')}
    </div>`;
}

function draftSeasonPicker(page, list, season, extra = '') {
  return `
    <div class="dk-seasons">
      ${list.map(([s, label]) => `<a class="${s === season ? 'on' : ''}" href="#/${page}?season=${s}${extra}">${label}</a>`).join('')}
    </div>`;
}

async function renderDraftKit(main, page, params) {
  const title = DRAFT_TABS.find(([id]) => id === page)[1];
  const shell = body => `
    <div class="page page-wide">
      <div class="page-head">
        <div class="page-icon">${icon('cap')}</div>
        <div><div class="eyebrow">Draft Kit</div><h1>${title}</h1></div>
      </div>
      ${draftTabs(page)}
      ${body}
    </div>`;
  if (!DRAFT_GRADES) {
    main.innerHTML = shell('<div class="loading">Loading the draft room…</div>');
    try { await draftKitData(); } catch (err) {
      if (route().page === page) main.innerHTML = shell(`<section class="card soon-card"><p>Couldn’t load player stats from Sleeper (${esc(err.message)}). Try again in a minute.</p></section>`);
      return;
    }
    if (route().page !== page) return;
  }
  if (page === 'draft-history') {
    main.innerHTML = shell(draftHistory(params));
    bindTips(main);
    $('#dk-manager', main)?.addEventListener('change', e => {
      const p = new URLSearchParams(route().params);
      if (e.target.value === 'all') p.delete('manager'); else p.set('manager', e.target.value);
      location.hash = `#/draft-history${p.toString() ? `?${p}` : ''}`;
    });
  }
  else if (page === 'draft-grades') {
    main.innerHTML = shell(draftGradesTab(params));
    // ?manager= (from the board's highlight): open that manager's report card.
    const card = params.get('manager') && document.getElementById(`rc-${params.get('manager')}`);
    if (card) {
      card.querySelector('details')?.setAttribute('open', '');
      card.classList.add('rc-flash');
      setTimeout(() => card.scrollIntoView({ block: 'start' }));
    }
  }
  else {
    main.innerHTML = shell('<div class="loading">Checking Sleeper for traded picks…</div>');
    let body;
    try {
      if (!TRADED_PICKS || Date.now() - TRADED_PICKS.at > 5 * 60_000) {
        TRADED_PICKS = { at: Date.now(), list: await withTimeout(sleeper(`/league/${DATA.seasons.at(-1).leagueId}/traded_picks`), 8000) };
      }
      body = futureDrafts();
    } catch (err) {
      body = `<section class="card soon-card"><p>Couldn’t reach Sleeper for the traded-pick list (${esc(err.message)}). Try again in a minute.</p></section>`;
    }
    if (route().page !== page) return;
    main.innerHTML = shell(body);
    bindFuture(main);
  }
}

// ----- Draft History -----

function draftHistory(params) {
  const drafts = [...(DATA.drafts ?? [])].sort((a, b) => Number(b.s) - Number(a.s));
  if (!drafts.length) return '<section class="card soon-card"><p>No drafts yet.</p></section>';
  const d = drafts.find(x => x.s === params.get('season')) ?? drafts[0];
  const picks = DRAFT_GRADES.picks.filter(p => p.s === d.s && p.kind === d.kind);
  const rounds = Math.max(...picks.map(p => p.round));
  const teams = DATA.seasons.find(s => s.season === d.s)?.teams ?? [];
  const slots = Math.max(teams.length, ...picks.map(p => p.slot));
  const startup = d.kind === 'startup';
  const graded = picks.some(p => p.tier);
  const slotTeam = slot => picks.find(p => p.slot === slot && p.round === 1)?.orig;
  // Highlight one manager's picks: everyone else's squares fade.
  const drafters = [...new Set((DATA.drafts ?? []).flatMap(x => x.picks.map(p => p.o)))]
    .sort((a, b) => name(a).localeCompare(name(b), undefined, { sensitivity: 'base' }));
  const manager = drafters.includes(params.get('manager')) ? params.get('manager') : 'all';
  const mineCount = picks.filter(p => p.o === manager).length;
  const highlight = `
    <label class="hy-pick dk-hl">
      <span class="hy-pick-label">Highlight</span>
      <span class="ed-select"><span class="hy-pick-val">${manager === 'all' ? 'Every manager' : esc(name(manager))}</span>
        <svg class="caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5l3-3"/></svg>
        <select id="dk-manager" aria-label="Highlight a manager's picks">
          <option value="all">Every manager</option>
          ${drafters.map(o => `<option value="${esc(o)}"${o === manager ? ' selected' : ''}>${esc(name(o))}</option>`).join('')}
        </select>
      </span>
    </label>`;

  const cell = p => {
    if (!p) return `<td class="dk-empty${manager !== 'all' ? ' dk-dim' : ''}">—</td>`;
    const via = p.orig !== p.o ? `<small class="dk-via">via ${esc(name(p.orig))}</small>` : '';
    const pos = DATA.players?.[p.pid]?.pos;
    const hl = manager === 'all' ? '' : p.o === manager ? ' dk-hit' : ' dk-dim';
    return `
      <td class="t-${p.tier ?? (p.limited ? 'limited' : 'none')}${hl}"><a class="dk-cell" href="${playerLink(p.pid)}" data-tip="${esc(tipLines(p).join('|'))}">
        <span class="dk-no"><span>${pickLabel(p)}</span><i>#${p.no}</i></span>
        <b>${esc(playerName(p.pid))}</b>
        <small>${pos ? `${esc(pos)} · ` : ''}${esc(name(p.o))}</small>
        ${via}
        ${royBadge(p.pid)}
      </a></td>`;
  };

  return `
    <div class="dk-histbar">
      ${draftSeasonPicker('draft-history', drafts.map(x => [x.s, x.kind === 'startup' ? `${x.s} Startup` : `${x.s} Rookie`]), d.s, manager === 'all' ? '' : `&manager=${encodeURIComponent(manager)}`)}
      ${highlight}
    </div>
    ${manager === 'all' ? '' : `<p class="filter-note">${mineCount
      ? `Showing ${esc(name(manager))}’s ${mineCount} pick${mineCount === 1 ? '' : 's'} in this draft; everyone else’s are faded. <a href="#/draft-grades?view=cards&manager=${encodeURIComponent(manager)}">${esc(name(manager))}’s report card</a>`
      : `${esc(name(manager))} made no picks in this draft.`} · <a href="#/draft-history?season=${d.s}">Show everyone</a></p>`}
    <p class="page-desc">${startup
      ? `The ${d.s} startup draft that built the league: ${rounds} rounds, snake order. Colors show how each pick turned out against other startup picks; startup picks aren’t graded.`
      : `The ${d.s} rookie draft: ${rounds} rounds, ${picks.length} picks. Tap a pick to open the player.`}</p>
    <div class="dk-legend">
      ${TIERS.map(t => `<span class="dk-key t-${t.id}">${t.label}</span>`).join('')}
      <span class="dk-key t-limited">Barely played</span>
      <span class="dk-key t-none">Not graded yet</span>
    </div>
    ${graded ? '' : `<p class="filter-note">The ${d.s} class hasn’t played enough NBA games yet. Colors start once a player has a season of ${MIN_GAMES}+ games.</p>`}
    ${startup ? '' : `
    <section class="dk-board-wrap dk-board-phone">
      <table class="dk-board dk-flip">
        <thead><tr><th class="dk-rd">Pick</th>${Array.from({ length: rounds }, (_, r) => `<th>Round ${r + 1}</th>`).join('')}</tr></thead>
        <tbody>${Array.from({ length: slots }, (_, i) => {
          const o = slotTeam(i + 1);
          return `
          <tr><th class="dk-rd">${i + 1}${o ? `<small>${esc(name(o))}</small>` : ''}</th>${Array.from({ length: rounds }, (_, r) => cell(picks.find(p => p.round === r + 1 && p.slot === i + 1))).join('')}</tr>`;
        }).join('')}
        </tbody>
      </table>
    </section>`}
    <section class="dk-board-wrap${startup ? '' : ' dk-board-desk'}">
      <div class="dk-scroll">
        <table class="dk-board">
          <thead><tr><th class="dk-rd">Rd</th>${Array.from({ length: slots }, (_, i) => {
            const o = slotTeam(i + 1);
            return `<th>${startup ? `Slot ${i + 1}` : `Pick ${i + 1}`}${o ? `<small>${esc(name(o))}</small>` : ''}</th>`;
          }).join('')}</tr></thead>
          <tbody>${Array.from({ length: rounds }, (_, r) => `
            <tr><th class="dk-rd">${r + 1}</th>${Array.from({ length: slots }, (_, i) => cell(picks.find(p => p.round === r + 1 && p.slot === i + 1))).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </div>
    </section>
    <p class="pw-foot">Each square shows the pick (round.pick and overall number), the player, his position and the manager who made the pick; “via” means the pick was traded and first belonged to that manager. ${startup ? 'Columns are draft slots, so the snake runs back and forth.' : `The draft order runs across (on phones, down each round); the name with each pick number is the team that owned that spot. <a href="#/draft-grades?season=${d.s}">See the ${d.s} draft grades</a>.`}</p>`;
}

// ----- Future Drafts -----

function futureDrafts() {
  const { seasons: all, rounds, picks } = pickLedger(DATA, TRADED_PICKS.list);
  const seasons = all.slice(0, 3);
  const cur = DATA.seasons.at(-1);
  const proj = projectedOrder(DATA, seasons[0], standingsBefore);
  const slotOf = Object.fromEntries((proj?.rows ?? []).map(r => [r.owner, r]));
  const managers = cur.teams.map(t => t.owner)
    .sort((a, b) => (slotOf[a]?.slot ?? 99) - (slotOf[b]?.slot ?? 99) || name(a).localeCompare(name(b)));
  const per = seasons.length * rounds;
  const held = o => picks.filter(p => seasons.includes(p.season) && p.owner === o).length;
  const key = p => `${p.season}|${p.round}|${p.orig}`;
  const fp = (s, r, o) => picks.find(p => p.season === s && p.round === r && p.orig === o);

  const projCard = !proj ? '' : !proj.rows.length
    ? `<p class="filter-note">The projected ${seasons[0]} order appears once the ${proj.season} season’s first week is played: reverse standings, with the two worst teams flipping a coin for No. 1.</p>`
    : `
    <section class="card">
      <div class="card-head"><h2>${proj.final ? '' : 'Projected '}${seasons[0]} draft order</h2><span class="card-sub">${proj.final ? `Final ${proj.season} standings` : `${proj.season} standings after ${proj.weeks} week${proj.weeks === 1 ? '' : 's'}`} · worst record picks first</span></div>
      <ol class="dk-order">
        ${proj.rows.map(r => {
          const first = fp(seasons[0], 1, r.owner);
          const holder = first && first.owner !== r.owner ? `<span class="dk-held">held by <b>${esc(name(first.owner))}</b></span>` : '';
          return `<li>
            <span class="dk-order-no">${r.coin ? '1–2' : r.slot}</span>
            <span class="dk-order-team"><b>${esc(teamName(r.owner, cur.season))}</b><small>${esc(name(r.owner))} · ${rec(r.w, r.l, r.t)} · ${num(r.pf)} pts</small></span>
            ${holder}
          </li>`;
        }).join('')}
      </ol>
      <p class="hm-foot">The two worst records flip a coin for the No. 1 pick, so both show “1–2”. Ties in record go to points for.</p>
    </section>`;

  const path = dkPath && picks.find(p => key(p) === dkPath);
  const pathBox = path ? `
    <div class="dk-path">
      <b>${path.season} ${roundName(path.round)}-round pick, originally ${esc(name(path.orig))}’s</b>
      <p>${path.path.length
        ? [esc(name(path.path[0].from)), ...path.path.map(x => `<b>${esc(name(x.to))}</b> <small>(${x.s} Wk ${x.w})</small>`)].join(' → ')
        : `Now held by <b>${esc(name(path.owner))}</b>. The trade isn’t in the league’s transaction history.`}</p>
    </div>` : '<p class="dk-path-hint">Tap a traded pick to see how it moved.</p>';

  return `
    ${projCard}
    <section class="card dk-future">
      <div class="card-head"><h2>Who owns every pick</h2><span class="card-sub">The next ${seasons.length} rookie drafts · live from Sleeper</span></div>
      <div class="dk-scroll">
        <table class="dk-ftable">
          <thead>
            <tr><th rowspan="2" class="dk-fman">Original team</th>${seasons.map(s => `<th colspan="${rounds}" class="dk-fyear">${s}</th>`).join('')}<th rowspan="2" class="dk-fheld">Picks held</th></tr>
            <tr>${seasons.map(() => Array.from({ length: rounds }, (_, r) => `<th class="dk-fround">Rd ${r + 1}</th>`).join('')).join('')}</tr>
          </thead>
          <tbody>${managers.map(o => {
            const h = held(o);
            return `<tr>
              <th class="dk-fman"><b>${esc(teamName(o, cur.season))}</b><small>${esc(name(o))}${slotOf[o] && seasons[0] ? ` · ${proj.final ? '' : 'proj. '}${seasons[0]} #${slotOf[o].coin ? '1–2' : slotOf[o].slot}` : ''}</small></th>
              ${seasons.map(s => Array.from({ length: rounds }, (_, r) => {
                const p = fp(s, r + 1, o);
                if (!p) return '<td>—</td>';
                if (p.owner === o) return '<td class="dk-own">Own</td>';
                return `<td><button type="button" class="dk-moved${key(p) === dkPath ? ' on' : ''}" data-pick="${esc(key(p))}">${esc(name(p.owner))}</button></td>`;
              }).join('')).join('')}
              <td class="dk-fheld"><b>${h}</b>${h !== per ? `<small class="${h > per ? 'v-pos' : 'v-neg'}">${h > per ? '+' : '−'}${Math.abs(h - per)}</small>` : ''}</td>
            </tr>`;
          }).join('')}</tbody>
        </table>
      </div>
      ${pathBox}
    </section>
    <p class="pw-foot">Rows are each pick’s original team; “Own” means that team still has its own pick, and a name means that manager holds it now. Picks held counts every pick a manager owns across these ${seasons.length} drafts (${per} each to start). Trade paths come from the league’s transactions.</p>`;
}

function bindFuture(main) {
  main.querySelectorAll('.dk-moved').forEach(b => b.addEventListener('click', () => {
    dkPath = dkPath === b.dataset.pick ? null : b.dataset.pick;
    const box = $('.dk-future', main);
    const keep = $('.dk-scroll', box)?.scrollLeft ?? 0;
    const html = futureDrafts();
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    box.replaceWith($('.dk-future', tmp));
    const next = $('.dk-future', main);
    $('.dk-scroll', next).scrollLeft = keep;
    bindFuture(main);
    $('.dk-path', next)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }));
}

// ----- Draft Grades -----

function draftGradesTab(params) {
  const view = params.get('view') === 'cards' ? 'cards' : 'draft';
  const rookie = [...new Set(DRAFT_GRADES.picks.filter(p => p.kind === 'rookie').map(p => p.s))].sort().reverse();
  if (!rookie.length) return '<section class="card soon-card"><p>Grades start after the first rookie draft.</p></section>';
  const season = rookie.includes(params.get('season')) ? params.get('season') : rookie.find(s => DRAFT_GRADES.picks.some(p => p.s === s && p.tier)) ?? rookie[0];
  const toggle = `
    <div class="st-stage dk-view">
      <a class="${view === 'draft' ? 'on' : ''}" href="#/draft-grades?season=${season}">By draft</a>
      <a class="${view === 'cards' ? 'on' : ''}" href="#/draft-grades?view=cards">Report cards</a>
    </div>`;
  const how = `
    <section class="lg-behind dk-how">
      <div class="lg-behind-head"><h2>How grades work</h2><span>Value compared with the draft spot</span></div>
      <p><b>Each pick is worth the player’s NBA fantasy points per game since he was drafted</b>, under that season’s league scoring, no matter who rostered him later. A manager who drafted well and then traded the player still gets the credit.</p>
      <p><b>Injuries don’t make a bust.</b> Only seasons where the player played at least ${MIN_GAMES} games count, so a season lost to injury neither helps nor hurts. A pick with no season like that yet shows <b>Barely played</b> instead of a grade. Missing a few games doesn’t lower a grade either, because it’s per game; playing poorly when healthy does.</p>
      <p>That’s compared with what the spot is <b>expected</b> to produce: a smooth curve through every rookie pick in league history, so an earlier pick is always expected to produce more. A 1.01 has to be a star to grade well; a late 3rd-rounder who sticks in the league is a steal.</p>
      <p><b>Steal</b>, <b>Hit</b>, <b>Fair</b>, <b>Miss</b> and <b>Bust</b> show how far a pick landed from its spot’s expectation. A class grade (A+ to F) adds up the manager’s picks in that draft, so two solid picks can match one great one. Report cards average a manager’s class grades (A = 4.0).</p>
      <p class="lg-fine">The season in progress counts once the player reaches ${MIN_GAMES} games in it. A pick is <b>Incomplete</b> before its first NBA season is well under way. Sleeper’s stats show games played but not why a player sat, so a season spent on the bench or in the G League is skipped the same way as one lost to injury. Grades move as players develop. With only a few drafts behind the league, the expectation curve will sharpen every year. The ${DATA.drafts?.find(d => d.kind === 'startup')?.s ?? ''} startup draft isn’t graded.</p>
    </section>`;
  return `${toggle}${view === 'cards' ? reportCardsView() : classView(season, rookie)}${how}`;
}

function classView(season, rookie) {
  const c = draftClasses(DRAFT_GRADES, season);
  const callout = (p, label, cls) => (p ? `
    <a class="card dk-call ${cls}" href="${playerLink(p.pid)}">
      <span class="eyebrow">${label}</span>
      <b>${esc(playerName(p.pid))}</b>
      <small>${pickLabel(p)} (#${p.no}) · ${esc(name(p.o))}</small>
      <span class="dk-call-val">${fpg(p.value)} <small>pts/game</small></span>
      <small>Spot expected ${fpg(p.expected)} · ${perGame(pickDiff(p))}</small>
    </a>` : '');
  const picker = draftSeasonPicker('draft-grades', rookie.map(s => [s, `${s} draft`]), season);
  const rows = c.rows.map(r => `
    <div class="dk-crow">
      ${gradeBadge(r.grade)}
      <span class="dk-cman"><b>${esc(teamName(r.owner, season))}</b><small>${esc(name(r.owner))} · ${r.picks.length} pick${r.picks.length === 1 ? '' : 's'}</small></span>
      <span class="dk-cval">${r.grade ? `<b class="${r.diff >= 0 ? 'v-pos' : 'v-neg'}">${perGame(r.diff)}</b><small>pts/game vs spot</small>` : '<small>Incomplete</small>'}</span>
      <span class="dk-cbest">${r.best ? `<small>Best pick</small><b>${esc(playerName(r.best.pid))}</b>` : ''}</span>
    </div>`).join('');
  const pickRows = [...c.picks].sort((a, b) => a.no - b.no).map(p => pickRow(p)).join('');
  return `
    ${picker}
    ${c.complete ? `<div class="dk-calls">${callout(c.steal, 'Steal of the draft', 'dk-steal')}${callout(c.bust, 'Biggest bust', 'dk-bust')}</div>`
      : `<section class="card soon-card"><p><b>The ${season} class is Incomplete.</b> Grades start once these rookies have a season of ${MIN_GAMES}+ games, and keep updating after that.</p></section>`}
    <section class="card">
      <div class="card-head"><h2>Class grades</h2><span class="card-sub">${season} rookie draft · by manager</span></div>
      <div class="dk-classes">${rows}</div>
    </section>
    <section class="card">
      <div class="card-head"><h2>Every pick</h2><span class="card-sub">Fantasy points per game since the draft, against the spot’s expectation</span></div>
      <div class="dk-picks">${pickRows}</div>
    </section>`;
}

// One pick with its points per game, the spot's expectation and the difference.
// mine: inside a manager's own report card, so his name is left out.
function pickRow(p, mine = false) {
  const who = [mine ? '' : name(p.o), p.orig !== p.o ? `via ${name(p.orig)}` : ''].filter(Boolean).join(' ');
  return `
    <a class="dk-prow" href="${playerLink(p.pid)}">
      <span class="dk-no">${pickLabel(p)}</span>
      <span class="dk-pname"><b>${esc(playerName(p.pid))} ${royBadge(p.pid)}</b><small>${[esc(DATA.players?.[p.pid]?.pos ?? ''), esc(mine ? who : who.replace(/ via (.*)$/, ' (via $1)'))].filter(Boolean).join(' · ')}</small></span>
      <span class="dk-pnum">${p.value != null ? fpg(p.value) : '—'}<small>pts/game</small></span>
      <span class="dk-pnum dk-pexp">${p.expected != null ? fpg(p.expected) : '—'}<small>expected</small></span>
      <span class="dk-pnum dk-pdiff ${p.diff == null || !pickDiff(p) ? '' : pickDiff(p) > 0 ? 'v-pos' : 'v-neg'}">${p.diff != null ? perGame(pickDiff(p)) : '—'}<small>vs spot</small></span>
      ${tierPill(p)}
    </a>`;
}

function reportCardsView() {
  const owners = [...new Set([...DATA.seasons.at(-1).teams.map(t => t.owner), ...DRAFT_GRADES.picks.filter(p => p.kind === 'rookie').map(p => p.o)])];
  const cards = reportCards(DRAFT_GRADES, owners);
  const cur = DATA.seasons.at(-1).season;
  const pickLine = (label, p) => (p ? `
    <li><span>${label}</span><a href="${playerLink(p.pid)}"><b>${esc(playerName(p.pid))}</b> <small>${p.s} ${pickLabel(p)} · ${perGame(pickDiff(p))}</small></a></li>` : '');
  return `
    <div class="dk-cards">
      ${cards.map(c => `
        <section class="card dk-card" id="rc-${esc(c.owner)}">
          <div class="dk-card-head">
            ${gradeBadge(c.grade, true)}
            <div><b>${esc(teamName(c.owner, cur))}</b><small>${esc(name(c.owner))}${c.gpa != null ? ` · GPA ${c.gpa.toFixed(2)}` : ''}</small></div>
          </div>
          <div class="dk-chips">${c.classes.map(x => `<a class="dk-chip" href="#/draft-grades?season=${x.s}"><small>${x.s}</small>${x.picks.length ? (x.grade ?? 'INC') : '—'}</a>`).join('')}</div>
          <ul class="dk-facts">
            <li><span>Picks made</span><b>${c.picks}${c.graded !== c.picks ? ` <small>(${c.graded} graded)</small>` : ''}</b></li>
            <li><span>Beat their spot</span><b>${c.graded ? `${c.beat} of ${c.graded}` : '—'}</b></li>
            <li><span>Value vs spots</span><b class="${c.diff >= 0 ? 'v-pos' : 'v-neg'}">${c.graded ? `${perGame(c.diff)} <small>pts/game</small>` : '—'}</b></li>
            ${pickLine('Best pick', c.best)}
            ${c.worst && c.worst !== c.best ? pickLine('Worst pick', c.worst) : ''}
          </ul>
          ${c.picks ? `
          <details class="dk-mine">
            <summary>See every pick ${icon('arrow')}</summary>
            ${[...c.classes].reverse().filter(x => x.picks.length).map(x => `
              <div class="dk-mine-head">
                <b>${x.s} class</b>${gradeBadge(x.grade)}
                <small>${x.grade ? `<span class="${x.diff >= 0 ? 'v-pos' : 'v-neg'}">${perGame(x.diff)}</span> pts/game vs spots` : `None with a ${MIN_GAMES}-game season yet`}</small>
                <a href="#/draft-history?season=${x.s}&manager=${encodeURIComponent(c.owner)}">On the board ${icon('arrow')}</a>
              </div>
              <div class="dk-picks">${[...x.picks].sort((a, b) => a.no - b.no).map(p => pickRow(p, true)).join('')}</div>`).join('')}
          </details>` : ''}
        </section>`).join('')}
    </div>
    <p class="pw-foot">“—” means no picks in that draft (traded away); INC means none of the class has a ${MIN_GAMES}-game season yet. Value vs spots adds up every graded pick’s fantasy points per game above or below what its spot is expected to produce.</p>`;
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
  if (page !== 'commish') COMMISH_OPEN = false; // leaving the section locks it again
  $('#dk-tip')?.classList.remove('on');
  renderSidebar(page);
  const main = $('#main');
  if (page === 'home') renderHome(main);
  else if (page === 'rivalry') renderRivalry(main, params);
  else if (page === 'hype') renderHype(main, params);
  else if (page === 'transactions') renderTransactions(main, params);
  else if (page === 'awards') renderAwards(main);
  else if (page === 'players') renderPlayers(main, params);
  else if (page === 'commish') renderCommish(main, params);
  else if (page === 'records') renderRecordBook(main, sub, params);
  else if (page === 'power') renderPower(main, params);
  else if (page === 'standings') renderStandings(main, params);
  else if (page === 'rules') renderRules(main);
  else if (DRAFT_TABS.some(([id]) => id === page)) renderDraftKit(main, page, params);
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
