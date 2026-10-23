import { ALL_STARS_FROM, LEAGUE_ID, MINOR_RIVALRIES, RIVALRIES, RIVALRIES_FROM, RIVALRY_BONUS, WAGER } from './config.js';
import { CATEGORIES, CHANGE_LABELS, buildRecords, playerPhoto, recordHistory, recordVisible, viewData } from './records.js';
import { PARTS, PRESEASON_PARTS, powerRankings, powerSeasons, preseasonRankings, scheduleLabel } from './power.js';
import { LEGACY, comparisons, finishes, legacy, legacyLabel, standings } from './standings.js';
import { frontOffice } from './frontoffice.js';
import { HYPE_PARTS, hypeSlate, isRivalry, moments, seasonSeries, seasonWeeks, seriesBefore, standingsBefore, trophyHistory, trophyImg, trophyOf, weekPairs } from './hype.js';
import { COMMISH, LOPSIDED, REPEAT_TRADES, activity, checkPasscode, get, lineupIssues, loadTradedPicks, loadWaivers, loadWeek, matchupForm, pickLedger, playoffPicture, seasonTotals, taxiCheck, teamRoster, tradeFlags, waiverWire, weeklyRecap } from './commish.js';
import { LOCK_CAL, bestLineup, gameCoach, injuryNews, loadBoxes, loadSlate, lockCoach, lockedPoints, tipTime } from './gm.js';
import { PROSPECT_LIST, PROSPECT_MAX_AGE, SEASON_WEIGHTS, dynastyValues, loadDynasty, prospectRanking, taxiLeft } from './dynasty.js';
import { CENTERPIECE, evaluateTrade, moveImpacts, offersFor, offersForNeed, offersToSell, packageValue, positionStrength, teamAssets, teamSnapshot, tradeContext, unpackTeam } from './tradefinder.js';
import { KINDS, ledgerTotals, matchesKind, transactionLog } from './transactions.js';
import { POSITION_GROUPS, REGULAR_WEEKS, allFantasy, allStars, banner, championshipMvp, gmOfTheYear, mvpRace, ownerAt, playerOfTheYear, rookieClass, seasonEndKey } from './awards.js';
import { ALL_STAR_POSITIONS, CORRECTIONS, DRAFT_CORRECTIONS, PHOTO_CORRECTIONS } from './corrections.js';
import { SORTS, playerIndex } from './players.js';
import { LEAGUE_START, RULES } from './rules.js';
import { buildTimeline } from './timeline.js';
import { MIN_GAMES, TIERS, draftClasses, draftGrades, draftOfYear, draftedPlayers, projectedOrder, reportCards, seasonPoints } from './draft.js';
import { gradeOf } from './scout.js';
import { CONTRACTS_SOURCE, contractText, readContract } from './contracts.js';

// ---------- Navigation ----------

const NAV = [
  { title: 'Now', items: [['home', 'Home', 'home'], ['standings', 'Standings', 'list'], ['transactions', 'Transactions', 'swap'], ['rules', 'Rulebook', 'clipboard']] },
  { title: 'In Season', items: [['props', 'Weekly Props', 'ticket'], ['trade-court', 'Trade Court', 'scale'], ['power', 'Power Rankings', 'gauge'], ['hype', 'Matchup Hype', 'bolt']] },
  { title: 'Hall of Fame', items: [['awards', 'Awards', 'trophy'], ['records', 'Record Book', 'book'], ['players', 'Player Index', 'users'], ['timeline', 'Timeline', 'clock'], ['rivalry', 'Rivalry', 'swords']] },
  { title: 'Draft Kit', items: [['draft-history', 'Draft History', 'history'], ['future-drafts', 'Future Drafts', 'calendar'], ['draft-grades', 'Draft Grades', 'cap']] },
];
const READY = new Set(['home', 'rules', 'timeline', 'rivalry', 'records', 'power', 'hype', 'standings', 'transactions', 'awards', 'players', 'draft-history', 'future-drafts', 'draft-grades']);
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
  pencil: '<path d="M13.5 3.5l3 3L7 16H4v-3zM11.5 5.5l3 3"/>',
  grid: '<rect x="3.5" y="3.5" width="5" height="5" rx="1"/><rect x="11.5" y="3.5" width="5" height="5" rx="1"/><rect x="3.5" y="11.5" width="5" height="5" rx="1"/><rect x="11.5" y="11.5" width="5" height="5" rx="1"/>',
  flag: '<path d="M5 17V3.5M5 4h9l-2 3.5 2 3.5H5"/>',
  calc: '<rect x="4" y="3" width="12" height="14" rx="1.5"/><path d="M7 6.5h6M7 10h.01M10 10h.01M13 10h.01M7 13.5h.01M10 13.5h.01M13 13.5h.01"/>',
  star: '<path d="M10 3l2.1 4.4 4.9.6-3.6 3.4.9 4.8L10 13.9l-4.3 2.3.9-4.8L3 8l4.9-.6z"/>',
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
      <img class="logo-img" src="assets/logo.svg" alt="Seis Dynasty Basketball logo">
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
        <div class="tr" id="tr-${t.tx}">
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
  const rv = isRivalry(DATA.seasons.at(-1).season, A, B);

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

      <section class="card tro-case-card">
        <div class="card-head"><h2>Trophy case</h2><span class="card-sub">Who holds each rivalry trophy · tap one for the rivalry</span></div>
        ${trophyCase()}
      </section>

      <div class="rv-named">
        <span class="rv-named-l">Minor rivalries</span>
        ${MINOR_RIVALRIES.map(([a, b, n]) => {
          const on = (a === A && b === B) || (a === B && b === A);
          return `<a class="rv-chip minor${on ? ' on' : ''}" href="#/rivalry?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}" title="${esc(name(a))} vs ${esc(name(b))}">${esc(n)}<small>${esc(name(a))} vs ${esc(name(b))}</small></a>`;
        }).join('')}
      </div>

      <section class="fight">
        <div class="fight-top"><span>Official fight card</span><span class="gold-text">All-time series</span></div>
        ${rv ? `<div class="rv-title ${rv.level}">${trophyOf(A, B) ? trophyPic(trophyOf(A, B), 'tiny') : icon('swords')}<b>${esc(rv.name)}</b><span>${rv.level === 'major' ? 'League rivalry' : 'Minor rivalry'} · +${rv.bonus} hype when they meet</span></div>` : ''}
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

      ${trophyDetail(A, B)}

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

  // ?trade= (from the Transactions page): scroll to that trade and highlight it.
  const trade = params.get('trade') && document.getElementById(`tr-${params.get('trade')}`);
  if (trade) {
    trade.classList.add('tr-flash');
    setTimeout(() => trade.scrollIntoView({ block: 'start' })); // after render() scrolls to the top
  }
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
  // A season has editions once it has a preseason edition or a week played.
  const hasPre = s => !!DATA.preseason?.[s.season]?.rows?.length;
  const withWeeks = seasons.filter(s => s.weeks.length || hasPre(s));
  if (!withWeeks.length) {
    main.innerHTML = `<div class="page"><section class="card soon-card"><p>The first edition comes out after week 1.</p></section></div>`;
    return;
  }
  // Default: the latest edition of the latest season (its preseason edition
  // before any games). Week 0 = the preseason edition.
  const pick = withWeeks.find(s => s.season === params.get('season')) ?? withWeeks.at(-1);
  const editions = [...(hasPre(pick) ? [0] : []), ...pick.weeks];
  const wanted = params.get('week') == null ? NaN : Number(params.get('week'));
  const week = editions.includes(wanted) ? wanted : editions.at(-1);
  const upcoming = seasons.filter(s => !s.weeks.length && !hasPre(s) && s.season > withWeeks.at(-1).season);
  const isFinal = pick.complete && week === pick.weeks.at(-1);
  const pre = hasPre(pick) ? preseasonRankings(DATA, pick.season) : null;
  const ed = week === 0 ? null : powerRankings(DATA, pick.season, week);
  // Week 1's arrows compare with the preseason edition.
  if (ed && pre && week === pick.weeks[0]) {
    const was = Object.fromEntries(pre.rows.map(r => [r.owner, r.rank]));
    for (const r of ed.rows) if (was[r.owner]) r.move = was[r.owner] - r.rank;
  }
  const editionLabel = w => (w === 0 ? 'Preseason' : `After Week ${w}`);

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
      <span>${editionLabel(week)}${isFinal ? ' · Final' : ''}</span>
      <svg class="caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5l3-3"/></svg>
      <select data-p="week" aria-label="Week">
        ${[...editions].reverse().map(w => `<option value="${w}"${w === week ? ' selected' : ''}>${editionLabel(w)}${pick.complete && w === pick.weeks.at(-1) ? ' (final regular season)' : ''}</option>`).join('')}
      </select>
    </label>`;
  if (week === 0) {
    renderPreseason(main, pre, seasonSelect, weekSelect, pick);
    return;
  }

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
        Arrows show movement since the previous week's edition (Week 1: since the preseason edition).
      </p>
    </div>`;

  main.querySelectorAll('select[data-p]').forEach(sel => sel.addEventListener('change', () => {
    const p = new URLSearchParams();
    if (sel.dataset.p === 'season') p.set('season', sel.value); // newest week of that season
    else { p.set('season', pick.season); p.set('week', sel.value); }
    location.hash = `#/power?${p}`;
  }));
}

// The preseason edition (assets/power.js): ranked on paper before any games.
function renderPreseason(main, pre, seasonSelect, weekSelect, pick) {
  const pl = pid => DATA.players?.[pid]?.n ?? `Player ${pid}`;
  const bar = (label, v) => `
    <div class="pw-part">
      <div class="pw-part-label">${label}</div>
      <div class="pw-track"><span style="width:${Math.max(2, v)}%"></span></div>
      <div class="pw-part-val">${Math.round(v)}</div>
    </div>`;
  const prevSeason = DATA.seasons.filter(x => x.status === 'complete' && Number(x.season) < Number(pick.season)).at(-1)?.season;
  const asOf = pre.at ? new Date(`${pre.at}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' }) : '';
  main.innerHTML = `
    <div class="page page-wide">
      <div class="page-head">
        <div class="page-icon">${icon('gauge')}</div>
        <div><div class="eyebrow">The table is only part of the story.</div><h1>Power Rankings</h1></div>
        <div class="archive">
          <div class="archive-main"><div class="archive-kicker">Season</div><div class="pw-season">${esc(pick.season)}</div></div>
          <div class="archive-stat"><b>PRE</b><span>Preseason</span></div>
        </div>
      </div>

      <div class="pw-edition">
        <span class="pw-ed-label">Edition</span>
        ${seasonSelect}
        ${weekSelect}
        <div class="pw-weights">
          ${PRESEASON_PARTS.map(p => `<span class="pw-weight"><b>${Math.round(p.weight * 100)}%</b> ${esc(p.name)}</span>`).join('')}
        </div>
      </div>

      <p class="filter-note">On paper only: no games yet.${pick.complete || pick.weeks.length ? ' This is how the league looked before tip-off.' : ` Updated nightly until tip-off${asOf ? ` (last update ${esc(asOf)})` : ''}, then kept as the season’s starting point.`}</p>

      <ol class="pw-list">
        ${pre.rows.map(r => `
          <li class="pw-row${r.rank === 1 ? ' pw-top' : ''}">
            <div class="pw-rank">${r.rank}</div>
            <div class="pw-team">
              <span class="pw-badge">${esc(initials(r.team))}</span>
              <div class="pw-name">
                <div class="pw-team-name">${esc(r.team)}</div>
                <div class="pw-owner">${esc(name(r.owner))} · ~${Math.round(r.proj)} pts/week projected</div>
                <details class="pw-lineup">
                  <summary>Projected lineup ${icon('arrow')}</summary>
                  <ol>${r.starters.map(p => `<li><span class="pw-slot">${esc(p.slot)}</span><span>${esc(pl(p.pid))}</span><b>${num(p.fp)}</b></li>`).join('')}</ol>
                  ${r.bench?.length ? `<div class="pw-lineup-sub">Depth: ${r.bench.map(p => `${esc(pl(p.pid))} ${num(p.fp)}`).join(' · ')}</div>` : ''}
                  ${r.out?.length ? `<div class="pw-lineup-sub">Out: ${r.out.map(pid => esc(pl(pid))).join(', ')}</div>` : ''}
                </details>
              </div>
            </div>
            <div class="pw-parts">
              ${bar('LINEUP', r.lineup)}${bar('DEPTH', r.depth)}${bar('LAST YR', r.last)}${bar('SCHED', r.sched)}
            </div>
            <div class="pw-score">
              <b>${r.power.toFixed(1)}</b>
              <span class="pw-score-label">Power</span>
              <span class="pw-sched">${r.lastPlace ? `${esc(prevSeason)} finish: ${ordinalPlace(r.lastPlace)}` : 'New to the league'}</span>
            </div>
          </li>`).join('')}
      </ol>

      <p class="pw-foot">
        The preseason edition ranks every team on paper, out of 100 with 50 as league average.
        <b>LINEUP</b> is the best starting lineup the roster can field (PG, SG, G, SF, PF, F, C and two UTIL), from Sleeper’s per-game projections for the season under this league’s scoring. The weekly number is calibrated to real results: the lineup’s per-game projections are added up, then scaled so the average team matches ${pre.calib?.avg ? `last season’s real average weekly score (${num(pre.calib.avg)} in ${esc(pre.calib.season)})` : 'last season’s real average weekly score'}. Projections assume a healthy lineup every week, so unscaled they run high; the gaps between teams still come from the projections. Taxi, IR and players listed Out don’t start.
        <b>DEPTH</b> is the next 4 best players, for injuries and rest. <b>LAST YR</b> is last season’s final finish. <b>SCHED</b> rates the whole regular-season schedule: above 50 means weaker opponents (by their LINEUP).
        Once Week 1 is played, the weekly editions take over, and Week 1’s arrows show the move from here.
      </p>
    </div>`;

  main.querySelectorAll('select[data-p]').forEach(sel => sel.addEventListener('change', () => {
    const p = new URLSearchParams();
    if (sel.dataset.p === 'season') p.set('season', sel.value);
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
  // Week 1 shows as soon as the season's schedule is set (the owner wants the site
  // to look live all preseason); later weeks still show once they start.
  const scheduled = weekPairs(DATA, cur.season, 1).length > 0;
  if (state && state.league_season === cur.season) {
    if (state.season_type === 'pre') { out.week = scheduled ? 1 : 0; out.pre = true; }
    else if (state.season_type === 'regular' || state.season_type === 'post') out.week = Math.max(state.week || 0, state.leg || 0);
  } else if (cur.weeksPlayed) {
    out.week = cur.weeksPlayed + 1;
  } else if (scheduled) {
    out.week = 1;
    out.pre = true;
  }
  if (out.week > lastWeekOf(cur)) { out.week = lastWeekOf(cur); out.over = true; }  return out;
}

// Live scores (and, in the playoffs, the bracket pairings) for the week under way.
// { locked: true } (commish office only): also estimate each team's locked points (gm.js).
// Public pages show Sleeper's live total, labeled live (owner, Oct 22 2026: locks can't be read
// reliably mid-week; finished weeks show the saved final = locked score).
async function liveWeek(season, week, { locked: wantLocked = false } = {}) {
  const key = `${season}|${week}`;
  const hit = LIVE[key];
  if (hit && Date.now() - hit.at < 50_000) {
    if (!wantLocked || hit.locked !== undefined) return hit;
    hit.locked = await lockedFor(season, week, hit.rows);
    return hit;
  }
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
  const out = { scores, pairs, rows, at: Date.now() };
  if (wantLocked) out.locked = await lockedFor(season, week, rows);
  return (LIVE[key] = out);
}
// Locked points per owner (gm.js); null if the box scores can't be read, then the commish pages show Sleeper's total.
async function lockedFor(season, week, rows) {
  const s = DATA.seasons.find(x => x.season === season);
  const ownerOf = Object.fromEntries(s.teams.map(t => [t.rosterId, t.owner]));
  try {
    const byRoster = await withTimeout(lockedPoints(season, week, s.leagueId, rows), 8000);
    return Object.fromEntries(Object.entries(byRoster).map(([r, v]) => [ownerOf[r], v]));
  } catch { return null; }
}

const HYPE_TONES = { gold: 'hy-gold', red: 'hy-red', navy: 'hy-navy' };
const chip = l => `<span class="hy-chip ${HYPE_TONES[l.tone] ?? ''}">${l.id === 'main' ? icon('bolt') : ''}${esc(l.text)}</span>`;
const teamName = (o, season) => DATA.owners[o]?.teams?.[season] ?? name(o);
// Every game on the slate is a league rivalry (config.js).
const rivalryBanner = () => `<p class="hy-banner hy-rivalry">${icon('swords')}<span><b>Rivalry Week.</b> Every major rivalry plays this week: ${RIVALRIES.map(([a, b, n]) => `<b>${esc(n)}</b> (${esc(name(a))} vs ${esc(name(b))})`).join(', ')}. Each one gets +${RIVALRY_BONUS.major} hype.</span></p>`;

// ---- Rivalry trophies (hype.js seasonSeries/trophyHistory; images in assets/trophies/) ----
const trophyPic = (r, cls = '') => `<img class="tro-img ${cls}" src="${trophyImg(r)}" alt="${esc(r[2])} trophy" loading="lazy">`;
const wl = (x, o) => `${x.wins[o]}–${x.wins[o === x.A ? x.B : x.A]}${x.ties ? `–${x.ties}` : ''}`;
// One line on a season series: "jimmycooks2 leads 1–0", "Tied 1–1 (points 760–742)", "tzola13 clinched 2–0".
function seriesLine(x) {
  const span = seasonSpan(x.season);
  if (!x.games.length) return x.upcoming.length ? `${span} series starts week ${x.upcoming[0]}` : `No ${span} meetings`;
  if (x.winner) {
    const how = x.how === 'points' ? ` on points (${num(x.pts[x.winner])}–${num(x.pts[x.winner === x.A ? x.B : x.A])})` : '';
    return `${name(x.winner)} ${x.complete ? 'won' : 'clinched'} the ${span} series ${wl(x, x.winner)}${how}`;
  }
  if (x.lead) return `${name(x.lead)} leads the ${span} series ${wl(x, x.lead)}`;
  const ahead = x.pts[x.A] === x.pts[x.B] ? null : x.pts[x.A] > x.pts[x.B] ? x.A : x.B;
  return `${span} series tied ${x.wins[x.A]}–${x.wins[x.B]}${ahead ? ` · ${name(ahead)} ahead on points (${num(x.pts[ahead])}–${num(x.pts[ahead === x.A ? x.B : x.A])})` : ''}`;
}
const holderLine = h => (h.holder ? `Held by <b>${esc(name(h.holder))}</b>${h.since ? ` since ${seasonSpan(h.since)}` : ''}` : 'Up for grabs: first awarded this season');

// All four trophies (Rivalry page top, Home).
function trophyCase(compact = false) {
  return `<div class="tro-case${compact ? ' compact' : ''}">${RIVALRIES.map(r => {
    const h = trophyHistory(DATA, r);
    return `<a class="tro-tile" href="#/rivalry?a=${encodeURIComponent(r[0])}&b=${encodeURIComponent(r[1])}">
      ${trophyPic(r)}
      <span class="tro-txt"><b>${esc(r[2])}</b><small>${esc(name(r[0]))} vs ${esc(name(r[1]))}</small>
      <span class="tro-hold">${holderLine(h)}</span>
      ${h.current ? `<span class="tro-series">${esc(seriesLine(h.current))}</span>` : ''}</span></a>`;
  }).join('')}</div>`;
}

// Matchup page: what the two teams are playing for (major rivalries only).
function trophyStake(season, week, A, B) {
  const r = trophyOf(A, B);
  if (!r || Number(season) < Number(RIVALRIES_FROM)) return '';
  const x = seasonSeries(DATA, season, A, B, week);
  const h = trophyHistory(DATA, r);
  const nth = x.games.length + 1;
  const decided = x.winner ? `${name(x.winner)} has already clinched it (${wl(x, x.winner)}).` : '';
  return `
    <section class="card tro-stake">
      ${trophyPic(r, 'big')}
      <div class="tro-stake-txt">
        <div class="eyebrow">Playing for</div>
        <h2>${esc(r[2])} trophy</h2>
        <p>${x.games.length ? `${esc(seriesLine(x))} before this game.` : `Meeting 1 of the ${seasonSpan(season)} season series.`} ${x.games.length ? `This is meeting ${nth}.` : ''} ${esc(decided)}</p>
        <p class="tro-hold">${holderLine(h)}</p>
      </div>
    </section>`;
}

// Rivalry page: the trophy for the selected pair.
function trophyDetail(A, B) {
  const r = trophyOf(A, B);
  if (!r) return '';
  const h = trophyHistory(DATA, r);
  const x = h.current;
  const row = g => `<li><span>Week ${g.w}${g.t === 'P' ? ` · ${esc(g.label ?? 'Playoffs')}` : ''}</span><span>${esc(name(A))} ${num(g.ap)} – ${num(g.bp)} ${esc(name(B))}</span><b>${g.win === 'tie' ? 'Tie' : esc(name(g.win))}</b></li>`;
  return `
    <section class="card tro-detail">
      <div class="card-head"><h2>The traveling trophy</h2><span class="card-sub">${esc(r[2])}</span></div>
      <div class="tro-detail-grid">
        ${trophyPic(r, 'big')}
        <div>
          <p class="tro-hold">${holderLine(h)}</p>
          ${x ? `<p class="tro-series"><b>${esc(seriesLine(x))}</b></p>
          <div class="tro-score"><span>${esc(name(A))} <b>${x.wins[A]}</b></span><span>${esc(name(B))} <b>${x.wins[B]}</b></span><small>Points ${num(x.pts[A])}–${num(x.pts[B])}</small></div>
          ${x.games.length ? `<ul class="tro-games">${x.games.map(row).join('')}</ul>` : ''}
          ${x.upcoming.length ? `<p class="cm-rule">Still to play: week${x.upcoming.length === 1 ? '' : 's'} ${x.upcoming.join(', ')}${x.playoffLeft ? ', plus a playoff meeting if they draw each other' : ''}.</p>` : x.playoffLeft ? '<p class="cm-rule">A playoff meeting would still count.</p>' : ''}` : ''}
          ${h.seasons.length ? `<p class="cm-rule"><b>Past winners:</b> ${h.seasons.map(s => `${seasonSpan(s.season)} ${esc(name(s.winner))} (${wl(s, s.winner)})`).join(' · ')}</p>` : ''}
        </div>
      </div>
      <p class="cm-rule">The trophy goes to whoever wins the season series: their 3 regular-season meetings, plus a playoff meeting if they have one (consolation games don’t count). Level on wins, for example 2–2 after a playoff meeting, goes to whoever scored more points in those games. Once a team can’t be caught, it has clinched and holds the trophy. A playoff meeting stops being possible as soon as either team is mathematically out of the playoffs or gets knocked out, so a series can be clinched (or settled on points) right then.</p>
    </section>`;
}

// preview: a future week number (commish Early hype tab): the page exactly as that week will
// look once it starts, with no live scores and links that stay in the preview.
async function renderHype(main, params, preview = null) {
  const pageKey = preview ? 'commish' : 'hype';
  if (!HYPE_NOW) {
    main.innerHTML = '<div class="page"><div class="loading">Checking this week’s slate…</div></div>';
    HYPE_NOW = await hypeNow();
    if (route().page !== pageKey) return;
  }
  // In a preview, act as if week `preview` is the week under way.
  const now = preview ? { ...HYPE_NOW, pre: preview === 1 && HYPE_NOW.pre, done: false, week: preview } : HYPE_NOW;
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
  const open = preview ? allWeeks.filter(x => x.w <= Math.max(preview, now.week)) : isCur ? allWeeks.filter(x => x.w <= now.week) : allWeeks.filter(x => DATA.games.some(g => g.s === season && g.w === x.w));
  const wanted = Number(params.get('week'));
  const week = preview ?? (open.some(x => x.w === wanted) ? wanted : (isCur ? now.week : open.at(-1)?.w));
  const live = Boolean(preview) || (isCur && week === now.week && !DATA.games.some(g => g.s === season && g.w === week));

  let liveData = null;
  if (live && !preview) {
    try { liveData = await liveWeek(season, week); } catch { /* scores just won't be live */ }
    if (route().page !== pageKey) return;
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
    return preview ? `#/commish?${new URLSearchParams({ tab: 'hype', view: 'page', week: changes.week ?? week, ...(changes.m ? { m: changes.m } : {}) })}` : `#/hype?${p}`;
  };
  const seasonSelect = `
    <label class="ed-select">
      <span>${esc(season)}</span>
      <svg class="caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5l3-3"/></svg>
      <select data-h="season" aria-label="Season">
        ${!curOpen ? `<option disabled>${cur.season} season (hype starts once the schedule is set)</option>` : ''}
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
        <div class="archive-stat"><b>W${week}</b><span>${live && now.pre ? 'Opening week' : live ? 'This week' : 'Week'}</span></div>
      </div>
    </div>
    <div class="hy-controls">${seasonSelect}${weekSelect}${matchSelect}</div>
    ${slate.rivalryWeek ? rivalryBanner() : ''}
    ${!curOpen && now.tipoff ? `<p class="hy-banner">${icon('clock')}<span><b>The ${esc(cur.season)} season tips off ${esc(prettyDate(now.tipoff))}.</b> Week 1’s Main event and labels appear as soon as Sleeper sets the schedule; every later week appears when it starts. Until then, look back at past weeks.</span></p>` : ''}
    ${isCur && now.pre && week === 1 ? `<p class="hy-banner">${icon('clock')}<span><b>Opening week preview.</b> The ${esc(cur.season)} season tips off ${now.tipoff ? esc(prettyDate(now.tipoff)) : 'soon'}. Scores go live once the games start; Week 2 appears when it begins.</span></p>` : ''}`;

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
  // Mid-week the number is Sleeper's live total (every starter's latest game, locked or not):
  // labeled live, not locked. A finished week shows the saved final (= the locked score).
  const isLive = !g.final && live && Boolean(liveData);
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
        <div class="hy-pts-label">${g.final ? 'Final · locked' : isLive ? 'Live' : 'Points'}</div>
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
    const note = ' · live scores count each starter’s latest game, locked or not; the final locked score shows when the week ends';
    if (x === y) return `All square · ${total} combined live points${note}`;
    return `${esc(name(x > y ? A : B))} leads by ${num(Math.abs(x - y))} live · ${total} combined live points${note}`;
  };
  const status = g.final ? 'Final · locked scores' : live && liveData ? `Live · updated ${new Date(liveData.at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : preview ? 'Tip-off pending' : 'Scores load from Sleeper';

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
          ${g.rivalry ? `<div class="hy-bonus">${icon('swords')} ${esc(g.rivalry.name)} <b>+${g.rivalry.bonus}</b></div>` : ''}
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
        const liveLine = !x.final && (sa || sb) ? '<small>live</small>' : '';
        return `
        <a class="hy-game${x === g ? ' on' : ''}" href="${hash({ m: x.a })}">
          <span class="hy-g-rank">${i + 1}</span>
          <span class="hy-g-teams"><b>${esc(teamName(x.a, season))}</b> <i>vs</i> <b>${esc(teamName(x.b, season))}</b>
            <small>${x.labels.slice(0, 3).map(chip).join('')}</small></span>
          <span class="hy-g-score">${sa != null && (sa || sb || liveLine) ? `${num(sa)}–${num(sb)}${liveLine}` : ''}</span>
          <span class="hy-g-hype"><b>${x.hype}</b><small>Hype</small></span>
        </a>`;
      }).join('')}
    </section>`;

  const lag = !preview && isCur && week === now.week && !isPlayoffWeek && (cur.weeksPlayed ?? 0) < week - 1;
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
      ${trophyStake(season, week, A, B)}
      ${hypeCard}
      ${seriesCard}
      ${momentsCard}
      ${slateCard}
      <p class="pw-foot">
        <b>How hype works.</b> Each game gets a hype score out of 100: <b>Quality</b> (30%) is how strong both teams are next to the rest of the league that week, by their Power Rankings score (the two best teams score 100, an average pair 50),
        <b>Closeness</b> (25%) is how evenly matched they are (within 2 Power points counts as dead even), <b>Stakes</b> (25%) is what the result means for the playoff race (it grows as the season goes on) or the bracket round,
        and <b>History</b> (20%) is the rivalry: a close series, playoff and title meetings, a recent nail-biter, a long streak.
        A perfect 100 takes a Championship between the league’s two best teams, dead even, with a deep rivalry behind it.
        Until six weeks are played, strength leans on the preseason Power Rankings (rosters and projections when the season started; last season’s finish for seasons before 2026-27). The top score is the <b>Main event</b>; in title week it’s always the Championship.
        Labels like <b>Trap-game watch</b> (a clear favorite with a reason to slip: the underdog won the last meeting, is hotter lately, or the favorite has a top team on deck next week) come from the same numbers.
        <b>League rivalries</b> (since ${seasonSpan(RIVALRIES_FROM)}), tagged by name: ${RIVALRIES.map(([a, b, n]) => `<b>${esc(n)}</b> (${esc(name(a))} vs ${esc(name(b))})`).join(", ")}, each <b>+${RIVALRY_BONUS.major}</b> hype; minor rivalries ${MINOR_RIVALRIES.map(([a, b, n]) => `<b>${esc(n)}</b> (${esc(name(a))} vs ${esc(name(b))})`).join(", ")}, each <b>+${RIVALRY_BONUS.minor}</b> (hype tops out at 100). A week when every major rivalry plays is <b>Rivalry Week</b>.
        Everything uses only games played before that week. Week 1 appears as soon as the schedule is set; every later week appears once it starts.
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
  // A trade opens on the Rivalry page between its teams (the first two in a
  // 3-team deal), scrolled to that trade, where each side's value is broken down.
  const sides = [...new Set(m.owners)];
  const tag = m.kind === 'trades' && sides.length >= 2 ? 'a' : 'div';
  const link = tag === 'a' ? ` href="#/rivalry?a=${encodeURIComponent(sides[0])}&b=${encodeURIComponent(sides[1])}&trade=${m.i}" title="Open this trade on the Rivalry page"` : '';
  return `
    <${tag} class="tx-row${desk ? ' tx-desk' : ''}${tag === 'a' ? ' tx-link' : ''}"${link}>
      <span class="tx-pill ${cls}">${label}</span>
      <div class="tx-body">${body}</div>
      <div class="tx-flow">${txFlow(m)}</div>
      ${desk ? `<div class="tx-val">${txValue(m)}</div>` : ''}
      <div class="tx-date">${shortDate(m.ts)}${tag === 'a' ? `<span class="tx-open">Details ${icon('arrow')}</span>` : ''}</div>
    </${tag}>`;
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
// Behind a passcode that's asked for every time the section is opened. Reloading while in
// the office keeps it open (owner, Oct 2026: pull to refresh on the phone app): a flag in
// sessionStorage, cleared on leaving the section and gone when the app/tab is closed.
// Scouting report and health report live in assets/commish.js.

const cmFlag = on => { try { on ? sessionStorage.setItem('cm-open', '1') : sessionStorage.removeItem('cm-open'); } catch { /* private mode */ } };
let COMMISH_OPEN = (() => { try { return sessionStorage.getItem('cm-open') === '1'; } catch { return false; } })();

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
        cmFlag(true);
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
  // Two groups: the Assistant GM tools, then the league office reports.
  const GROUPS = [
    ['My GM', [['brief', 'Briefing'], ['coach', 'Lock-in coach'], ['dynasty', 'Dynasty'], ['prospects', 'Prospects'], ['draftscout', 'Draft Scout'], ['tracker', 'Team tracker'], ['trades', 'Trade finder'], ['managers', 'Managers']]],
    ['League office', [['scout', 'Scouting report'], ['waivers', 'Waiver wire'], ['playoffs', 'Playoff picture'], ['recap', 'Weekly recap'], ['picks', 'Draft picks'], ['races', 'Award races'], ['hype', 'Early hype'], ['wager', 'Wager Weeks'], ['health', 'Health report']]],
  ];
  const TABS = GROUPS.flatMap(([, tabs]) => tabs);
  const tab = TABS.some(([id]) => id === params.get('tab')) ? params.get('tab') : 'brief';
  clearInterval(GM_TIMER);
  main.innerHTML = `
    <div class="page page-wide">
      <div class="page-head">
        <div class="page-icon">${icon('lock')}</div>
        <div><div class="eyebrow">For the commish only</div><h1>Commissioner’s office</h1></div>
        <div class="cm-run">
          <a class="btn" href="https://github.com/debugburkhart/seis-dynasty-hoops/actions/workflows/update.yml" target="_blank" rel="noopener">${icon('history')}<span>Run nightly update</span></a>
          <small>Opens GitHub: tap <b>Run workflow</b>, then the green <b>Run workflow</b>. Done in about 3–5 minutes; then reload the site.${(() => { const cur = DATA.seasons.at(-1); return cur && !cur.weeksPlayed && cur.status !== 'complete' ? ' Until Week 1, this also redoes the <b>preseason Power Rankings</b> from today’s rosters (after a trade, for example).' : ''; })()}</small>
        </div>
      </div>
      <div class="cm-groups">
        ${GROUPS.map(([label, tabs]) => `
          <div class="cm-group-tabs">
            <span class="cm-group-label">${label}</span>
            <div class="st-tabs cm-tabs" role="tablist">
              ${tabs.map(([id, text]) => `<a role="tab" class="${tab === id ? 'on' : ''}" href="#/commish${id === 'brief' ? '' : `?tab=${id}`}">${text}</a>`).join('')}
            </div>
          </div>`).join('')}
      </div>
      <div id="cm-body"><div class="loading">Pulling the latest from Sleeper…</div></div>
    </div>`;
  const body = $('#cm-body', main);
  const show = { brief: renderBriefing, coach: renderCoach, dynasty: renderDynasty, prospects: renderProspects, draftscout: renderDraftScout, tracker: renderTracker, trades: renderTrades, managers: renderManagers, scout: renderScouting, waivers: renderWaivers, playoffs: renderPlayoffs, recap: renderRecap, picks: renderPicks, races: renderRaces, hype: renderEarlyHype, wager: renderWagerAdmin, health: renderHealth }[tab];
  show(body, params).catch(err => {
    body.innerHTML = `<section class="card"><p class="empty">Couldn’t load this report: ${esc(err.message)}</p></section>`;
  });
}

// The week to scout: the one under way, or week 1 before the season starts.
async function scoutWeek() {
  HYPE_NOW ??= await hypeNow();
  const cur = DATA.seasons.at(-1);
  if (HYPE_NOW.done || HYPE_NOW.over) return null;
  return { season: cur.season, week: Math.max(1, HYPE_NOW.week), started: HYPE_NOW.week >= 1 && !HYPE_NOW.pre };
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
    location.hash = `#/commish?tab=scout&team=${encodeURIComponent(e.target.value)}`;
  });
  if (!pair) {
    body.innerHTML = `${teamPick}<section class="card soon-card"><p>${esc(teamName(me, season))} has no matchup in week ${week}.</p></section>`;
    bindPick();
    return;
  }
  const opp = pair.a === me ? pair.b : pair.a;
  const ctx = await loadWeek(DATA, season, week);
  const [boxes, nbaSlate] = await Promise.all([loadBoxes(season, week, ctx.scoring), loadSlate(season, week)]);
  if (route().page !== 'commish') return;
  const A = teamRoster(DATA, ctx, me);
  const B = teamRoster(DATA, ctx, opp);
  // Their best healthy lineup (the same one the Lock-in coach and Briefing assume), scored the
  // way this report scores lineups: who plays from bestLineup(), each player's projection here.
  const oppBest = bestLineup(lockCoach(DATA, ctx, boxes, nbaSlate, opp), nbaSlate, ctx.today, boxes);
  const oppAll = [...B.starters, ...B.bench, ...B.ir, ...B.taxi].filter(p => !p.empty);
  const bestProjB = r1(oppBest.lineup.reduce((a, p) => a + (p.empty ? 0 : p.sitting ? p.state.fixed : oppAll.find(x => x.pid === p.pid)?.projNow ?? 0), 0));
  const bestIn = oppBest.lineup.filter(p => p.fromBench).map(p => p.name);
  const bestOut = oppBest.benched.map(p => `${p.name}${p.injury ? ` (${p.injury})` : ''}`);
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
  // Locked points are the big number while the week is live (liveWeek, cached for a minute).
  const lockedNow = live ? (await liveWeek(season, week, { locked: true }).catch(() => null))?.locked ?? null : null;
  const projA = A?.projStarters ?? 0;
  const projB = B?.projStarters ?? 0;
  const gamesOf = t => t.starters.reduce((s, p) => s + (ctx.live ? p.left || 0 : p.games || 0), 0);
  const pct = x => `${Math.round(x * 100)}%`;
  const basisNote = form.basis !== season ? ` (from ${form.basis}, until both teams have played this season)` : '';

  // Scouting notes, most useful first.
  const notes = [];
  const diff = r1(projA - projB);
  notes.push(`${live ? 'Projected final' : 'Sleeper’s projections with the current lineups'}: ${esc(teamName(me, season))} ${num(projA)}, ${esc(teamName(opp, season))} ${num(projB)}. ${diff === 0 ? 'Dead even.' : `${diff > 0 ? 'You’re' : 'They’re'} ahead by ${num(Math.abs(diff))}.`}`);
  if (Math.abs(bestProjB - projB) >= 0.5) {
    const bd = r1(projA - bestProjB);
    notes.push(`If ${esc(teamName(opp, season))} starts its best healthy lineup${bestIn.length ? ` (${esc(bestIn.join(', '))} in${bestOut.length ? `; ${esc(bestOut.join(', '))} out` : ''})` : ''}: ${num(bestProjB)}, and ${bd === 0 ? 'it’s dead even' : bd > 0 ? `you’re still ahead by ${num(bd)}` : `they’re ahead by ${num(-bd)}`}. The Briefing and Lock-in coach plan against this lineup.`);
  }
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
      <div class="hy-pts">${num(live ? lockedNow?.[o] ?? team.liveScore : proj)}</div>
      <div class="hy-pts-label">${live ? `${lockedNow ? 'Locked' : 'Live'} · proj. ${num(proj)}` : 'Projected (as set)'}</div>
      ${live && lockedNow ? `<div class="hy-pts-live">Live <b>${num(team.liveScore)}</b></div>` : ''}
      ${o === opp && Math.abs(bestProjB - projB) >= 0.5 ? `<div class="hy-pts-label sc-best">Best lineup: <b>${num(bestProjB)}</b></div>` : ''}
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

// ---- My GM: Lock-in coach and Daily briefing (logic in assets/gm.js) ----

let GM_TIMER;
// Small per-browser settings (risk setting, marked locks, injuries already seen).
const gmLoad = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const gmSave = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private window: not saved */ } };

function gmTeamPick(me, season, tab) {
  const cur = DATA.seasons.at(-1);
  return `
    <label class="hy-pick cm-pick">
      <span class="hy-pick-label">Team</span>
      <span class="ed-select"><span class="hy-pick-val">${esc(teamName(me, season))}</span>
        <svg class="caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5l3-3"/></svg>
        <select class="gm-team" data-tab="${tab}" aria-label="Team">${cur.teams.map(t => `<option value="${esc(t.owner)}"${t.owner === me ? ' selected' : ''}>${esc(teamName(t.owner, season))} (${esc(name(t.owner))})</option>`).join('')}</select>
      </span>
    </label>`;
}
function bindTeamPick(body) {
  $('.gm-team', body)?.addEventListener('change', e => {
    const tab = e.target.dataset.tab;
    location.hash = `#/commish?${new URLSearchParams({ ...(tab === 'brief' ? {} : { tab }), team: e.target.value })}`;
  });
}

// Everything both GM tabs need for this week, or null when the season is over.
async function gmWeek(params) {
  const at = await scoutWeek();
  if (!at) return null;
  const cur = DATA.seasons.at(-1);
  const me = cur.teams.some(t => t.owner === params.get('team')) ? params.get('team') : COMMISH;
  const ctx = await loadWeek(DATA, at.season, at.week);
  const [boxes, slate] = await Promise.all([loadBoxes(at.season, at.week, ctx.scoring), loadSlate(at.season, at.week)]);
  let pairs = weekPairs(DATA, at.season, at.week);
  if (!pairs.length) pairs = (await liveWeek(at.season, at.week).catch(() => null))?.pairs ?? [];
  // Balanced is the default (owner, Oct 2026) until Play to win is recalibrated; new key so an old saved choice doesn't carry over.
  const mode = GM_MODES.some(([id]) => id === gmLoad('gm-mode')) ? gmLoad('gm-mode') : 'balanced';
  const marksKey = `gm-locks-${at.season}-${at.week}`;
  // What-if locks: the coach's math only (never the live locked points on Home or the Hype page).
  const whatKey = `gm-whatif-${at.season}-${at.week}`;
  const whatifs = gmLoad(whatKey, {});
  const medianOn = Boolean(DATA.seasons.find(s => s.season === at.season)?.medianGame);
  const coach = gameCoach(DATA, ctx, boxes, slate, me, pairs, { mode, marks: gmLoad(marksKey, {}), whatifs, medianOn });
  return { ...at, me, ctx, boxes, slate, pairs, mode, marksKey, whatKey, whatifs, medianOn, coach };
}
// Banner while what-if locks are on: they change the coach's math on this device only.
function whatIfBanner(w) {
  if (!Object.keys(w.whatifs ?? {}).length) return '';
  const rows = [...w.coach.rows, ...(w.coach.oppCoach?.rows ?? [])].filter(r => r.whatIf);
  const names = rows.map(r => `${esc(r.name)} (${num(r.score)})`).join(', ');
  return `<div class="gm-whatif-bar"><p><b>Testing what-if locks</b>${names ? `: ${names}` : ''}. The coach plans as if they’re locked. Home, the Hype page and Sleeper don’t change.</p>
    <button class="gm-whatif-clear" type="button">Clear what-ifs</button></div>`;
}
function bindWhatIfs(body, w, rerender) {
  body.querySelectorAll('.gm-whatif-clear').forEach(b => b.addEventListener('click', () => { gmSave(w.whatKey, {}); rerender(); }));
  body.querySelectorAll('.gm-whatif').forEach(b => b.addEventListener('click', () => {
    const m = gmLoad(w.whatKey, {});
    if (m[b.dataset.pid]) delete m[b.dataset.pid];
    else m[b.dataset.pid] = { date: b.dataset.date, slot: b.dataset.slot === '' ? null : Number(b.dataset.slot) };
    gmSave(w.whatKey, m);
    rerender();
  }));
}
const GM_MODES = [['win', 'Play to win <span class="gm-beta">Beta</span>'], ['safe', 'Safe'], ['balanced', 'Balanced'], ['bold', 'Bold']];
const gmPct = x => `${Math.round(x * 100)}%`;

// Win chances line: head-to-head, plus the median when it counts.
const gmOdds = (w, odds) => `<div class="gm-odds">${odds.h2h != null ? `<span>Win chance <b>${gmPct(odds.h2h)}</b></span>` : ''}${w.medianOn ? `<span>Beat the median <b>${gmPct(odds.median)}</b></span>` : ''}</div>`;

// Bench players worth starting (and starters who should change slots to make room), from the
// coach's plan for the whole roster, plus the odds with the lineup as set vs following the coach.
function swapList(w, swaps) {
  const c = w.coach;
  const moves = c.moves ?? [];
  if (!swaps.length && !moves.length) return '<p class="empty">Your lineup is set: no bench player is worth 3+ more points than the starter he could replace.</p>';
  const keepText = s => (s.r.empty ? 'an empty spot' : s.r.call === 'none' ? 'no games this week' : s.r.call === 'final' ? `done at ${num(s.keep)}` : `worth about ${num(s.keep)}`);
  const odds = o => [o.h2h != null ? `win ${gmPct(o.h2h)}` : '', w.medianOn ? `median ${gmPct(o.median)}` : ''].filter(Boolean).join(', ');
  const oddsLine = c.asSet && (c.now.h2h != null || w.medianOn) && swaps.length
    ? `<p class="cm-rule">Your lineup exactly as set: ${odds(c.asSet)}. With these moves (and the lock calls): ${odds(c.now)}.</p>` : '';
  return `<ol class="aw-race gm-swaps">${swaps.map(s => `
    <li><span>Start <b>${esc(s.b.name)}</b> ${injuryTag(s.b)} in ${esc(s.slot)} for ${s.r.empty ? 'an empty spot' : esc(s.r.name)}, before ${esc(s.when)}
      <small>${s.games.length} game${s.games.length === 1 ? '' : 's'} left, worth about ${num(s.worth)} vs ${s.r.empty ? '0' : `${esc(s.r.name)}: ${keepText(s)}`}.${s.first ? ` ${esc(s.first)}` : ''}</small></span>
      <b>+${num(s.gain)}</b></li>`).join('')}${moves.map(m => `
    <li><span>Move <b>${esc(m.name)}</b> from ${esc(m.from)} to ${esc(m.to)}<small>Makes room for the players above.</small></span><b>↔</b></li>`).join('')}</ol>${oddsLine}`;
}

const CALL_LABEL = { lock: 'Lock', wait: 'Wait', locked: 'Locked', final: 'Done', live: 'Live', plan: 'Plan', none: 'No games' };
const shortDay = date => new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' });
// Tip-off in Central time, short: "6:30p" (gm.js tipTime; '' when ESPN had no time for it).
const tipShort = g => tipTime(g).replace(/ ([AP])M$/, (_, x) => x.toLowerCase());
const longDay = date => new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

// Refresh a GM tab every 2 minutes while games are being played today.
function gmAutoRefresh(body, params, render, w) {
  const today = Object.values(w.slate).some(list => list.some(g => g.date === w.ctx.today && g.status !== 'complete'));
  if (!today) return;
  GM_TIMER = setInterval(() => {
    if (!body.isConnected) return clearInterval(GM_TIMER);
    clearInterval(GM_TIMER);
    render(body, params).catch(() => {});
  }, 120_000);
}

// Lock-in coach board: which player cards are open (kept across the 2-minute refresh) and
// dynasty values for the tier tags (injured players at full value, owner's choice; once per page load).
const MB_OPEN = new Set();
let COACH_DYN = null;
const coachDynasty = () => (COACH_DYN ??= loadDynastyFeeds().then(f => dynastyValues(DATA, f, { fullInjured: true })).catch(() => null));

async function renderCoach(body, params) {
  const [w, dyn] = await Promise.all([gmWeek(params), coachDynasty()]);
  if (!w) {
    body.innerHTML = '<section class="card soon-card"><p>The season is over. The Lock-in coach returns when next season’s schedule is set.</p></section>';
    return;
  }
  if (route().page !== 'commish') return;
  const coach = w.coach;
  if (!coach) {
    body.innerHTML = `${gmTeamPick(w.me, w.season, 'coach')}<section class="card soon-card"><p>No roster found for this team.</p></section>`;
    bindTeamPick(body);
    return;
  }
  const count = c => coach.rows.filter(r => r.call === c).length;
  const summary = [[count('lock'), 'to lock'], [count('live'), 'playing now'], [count('wait'), 'waiting'], [count('locked'), 'locked'], [count('final'), 'done'], [count('plan'), 'not started']].filter(([n]) => n);
  const game = (r, g) => {
    const isLocked = r.call === 'locked' && !r.whatIf && g.pts != null && (r.lockDate ? r.lockDate === g.date : Math.abs(g.pts - r.score) < 0.05);
    const cls = g.playing ? 'playing' : g.done ? (g.pts == null ? 'dnp' : 'done') : 'next';
    const inner = `<small>${shortDay(g.date)}${!g.done && !g.playing && tipShort(g) ? ` <span class="mb-tip">${tipShort(g)}</span>` : ''}</small><span>${g.home ? 'vs' : '@'} ${esc(g.opp ?? '')}</span><b>${g.pts != null ? num(g.pts) : g.done ? 'DNP' : g.playing ? 'Live' : '–'}</b>`;
    // A starter's played game is a button: tap = "he was locked on this game" (tap again to undo).
    if (r.pid && g.done && g.pts != null) {
      const on = r.marked && isLocked;
      return `<button class="gm-game ${cls}${isLocked ? ' locked' : ''} gm-pick" type="button" data-pid="${esc(r.pid)}" data-date="${esc(g.date)}" aria-pressed="${on}" title="${on ? 'Undo this lock' : 'Mark as the game he was locked on'}">${inner}</button>`;
    }
    return `<span class="gm-game ${cls}${isLocked ? ' locked' : ''}">${inner}</span>`;
  };
  const markable = r => r.call === 'lock' || r.call === 'wait' || r.marked;
  const label = r => (r.whatIf ? 'What-if' : CALL_LABEL[r.call]);
  // What-if button: lock him in the coach's math only, in the slot it suggests (else where he is).
  const whatIfBtn = (r, i, mine) => {
    if (r.whatIf) return `<button class="gm-whatif on" type="button" data-pid="${esc(r.pid)}">Undo what-if</button>`;
    if (!['lock', 'wait'].includes(r.call)) return '';
    const last = r.sched.filter(g => g.done && g.pts != null).at(-1);
    if (!last) return '';
    return `<button class="gm-whatif" type="button" data-pid="${esc(r.pid)}" data-date="${esc(last.date)}" data-slot="${r.lockSlotIdx ?? i}">What if ${mine ? 'I lock' : 'they lock'} him${r.lockSlot ? ` in ${esc(r.lockSlot)}` : ''}?</button>`;
  };
  // A starter's lock card (opened from the board). mine = false: the opponent's (button says "They locked him").
  const card = (r, mine = true, i = 0) => (r.empty ? `<div class="gm-call gm-none"><div class="gm-call-top"><span class="cm-slot">${esc(r.slot)}</span><b>Empty spot</b></div></div>` : `
    <div class="gm-call gm-${r.call}${r.whatIf ? ' gm-whatif-card' : ''}">
      <div class="gm-call-top">
        <span class="cm-slot">${esc(r.slot)}</span>
        <div class="gm-who"><b>${esc(r.name)}</b> ${injuryTag(r)}<small>${esc([r.pos, r.team || 'No team', r.perGame ? `about ${num(r.perGame * LOCK_CAL)} a game` : ''].filter(Boolean).join(' · '))}</small></div>
        <span class="gm-badge">${label(r)}</span>
      </div>
      ${r.sched.length ? `<div class="gm-games">${r.sched.map(g => game(r, g)).join('')}</div>` : ''}
      ${r.sched.some(g => g.done && g.pts != null) ? `<p class="gm-hint">Tap the game ${mine ? 'you' : 'they'} locked to mark it${r.marked ? ', or the marked one again to undo' : ''}.</p>` : ''}
      <p class="gm-text">${esc(r.text)}</p>
      <div class="gm-btns">${markable(r) ? `<button class="gm-mark" type="button" data-pid="${esc(r.pid)}" data-date="${esc(r.sched.filter(g => g.done && g.pts != null).at(-1)?.date ?? '')}">${r.marked ? 'Undo: not locked' : mine ? 'I locked him' : 'They locked him'}</button>` : ''}${whatIfBtn(r, i, mine)}</div>
    </div>`);
  const riskBtns = GM_MODES.map(([k, label]) => `<a href="#" data-risk="${k}" class="${k === w.mode ? 'on' : ''}">${label}</a>`).join('');
  const opp = coach.opp;
  // The opponent's lineup as the coach assumes it: their best healthy players (fromBench = moved in).
  const oppRow = r => {
    if (r.empty) return `<li><span>Empty spot<small>${esc(r.slot)} · nobody healthy with games left to fill it</small></span><b class="gm-badge-s gm-none">0</b></li>`;
    const s = r.state;
    const what = s.fixed != null
      ? (r.call === 'locked' ? `locked at ${num(s.fixed)}` : r.sitting ? `listed ${r.injury}: keeps ${num(s.fixed)}` : r.call === 'none' ? 'no games' : `done: ${num(s.fixed)} counts`)
      : r.call === 'live' ? 'playing now'
        : s.cur != null ? `${num(s.cur)} so far, ${s.k} game${s.k === 1 ? '' : 's'} left` : `${s.k} game${s.k === 1 ? '' : 's'} to play`;
    const badge = s.fixed != null ? num(s.fixed) : 'Open';
    return `<li><span>${esc(r.name)}${r.fromBench ? ' <span class="cm-pill good">From bench</span>' : ''} ${injuryTag(r)}<small>${esc(r.slot)} · ${esc(what)}</small></span><b class="gm-badge-s gm-${s.fixed != null ? 'locked' : 'wait'}">${badge}</b></li>`;
  };
  const benchedOpp = coach.oppBest?.benched ?? [];

  // Matchup board: both current starting lineups across from each other, slot in the middle.
  const oppRows = coach.oppCoach?.rows ?? [];
  // Locked points and starters left to lock; ifLocked/ifLeft = the same if every unlocked
  // score (a finished game not locked yet) were locked now.
  const tally = rows => {
    const locked = rows.reduce((t, r) => t + (!r.empty && ['locked', 'final'].includes(r.call) ? r.score ?? 0 : 0), 0);
    const left = rows.filter(r => !r.empty && ['lock', 'wait', 'live', 'plan'].includes(r.call)).length;
    const open = rows.filter(r => !r.empty && ['lock', 'wait'].includes(r.call) && r.score != null);
    return { locked, left, ifLocked: locked + open.reduce((t, r) => t + r.score, 0), ifLeft: left - open.length };
  };
  const short = n => { const [f, ...rest] = String(n ?? '').split(' '); return rest.length ? `${f[0]}. ${rest.join(' ')}` : f; };
  // A player's score box: locked/done (solid), playing now, unlocked score (outlined), none yet.
  const scoreBox = r => {
    if (!r || r.empty) return '<span class="mb-pts mb-empty">–</span>';
    if (r.whatIf) return `<span class="mb-pts mb-whatif" title="What-if lock (coach only)">${num(r.score ?? 0)}</span>`;
    if (['locked', 'final'].includes(r.call)) return `<span class="mb-pts mb-locked">${num(r.score ?? 0)}</span>`;
    if (r.call === 'live') return `<span class="mb-pts mb-live">${r.score != null ? num(r.score) : '0'}</span>`;
    if (r.score != null && ['lock', 'wait'].includes(r.call)) return `<span class="mb-pts mb-open">${num(r.score)}</span>`;
    return '<span class="mb-pts mb-empty">–</span>';
  };
  // This week's games for any player (bench and IR too), and the ones a bench player could
  // still play if moved in now (only games after he's moved in count).
  const today = w.ctx.today;
  const weekGames = p => (w.slate[p.team] ?? []).map(g => {
    const box = (w.boxes[p.pid] ?? []).find(b => b.date === g.date);
    const done = g.status === 'complete' || g.date < today;
    return { ...g, pts: box?.pts ?? null, done, playing: !done && g.date === today && (['in_progress', 'in_game'].includes(g.status) || Boolean(box)) };
  });
  const gamesLeft = p => (w.slate[p.team] ?? []).filter(g => g.status !== 'complete' && (g.date > today || (g.date === today && g.status === 'pre_game'))).length;
  const todayGame = p => (w.slate[p.team] ?? []).find(g => g.date === today && g.status !== 'complete');
  const tier = p => (dyn?.players[p.pid] ? tierTag(dyn.players[p.pid].score) : '');
  // Tags line under a name: dynasty tier, injury, plays today.
  const tags = p => {
    const g = todayGame(p);
    return `${tier(p)}${p.injury ? injuryTag(p) : ''}${g ? `<span class="mb-today">${['in_progress', 'in_game'].includes(g.status) ? 'Live' : 'Today'} ${g.home ? 'vs' : '@'} ${esc(g.opp ?? '')}${!['complete', 'in_progress', 'in_game'].includes(g.status) && tipShort(g) ? ` · <span class="mb-tip">${tipShort(g)}</span>` : ''}</span>` : ''}`;
  };
  const nameHtml = p => `<b><span class="mb-full">${esc(p.name)}</span><span class="mb-short">${esc(short(p.name))}</span></b>`;
  // A tappable player: key = side + pid, opens his card (data-for) below the row.
  const tapAttrs = key => `role="button" tabindex="0" data-key="${esc(key)}" aria-expanded="${MB_OPEN.has(key)}"`;
  const who = (r, side) => {
    if (!r) return `<div class="mb-p mb-${side}"></div>`;
    if (r.empty) return `<div class="mb-p mb-${side}"><span class="mb-name"><i>Empty</i></span>${scoreBox(r)}</div>`;
    const meta = [r.team || 'FA', r.call === 'none' ? 'No games' : r.call === 'plan' ? `${r.sched.length} game${r.sched.length === 1 ? '' : 's'}` : label(r)].join(' · ');
    return `<div class="mb-p mb-${side} mb-${r.whatIf ? 'wi' : r.call}${todayGame(r) ? ' mb-on' : ''}" ${tapAttrs(`${side}-${r.pid}`)}>
      <span class="mb-name">${nameHtml(r)}<span class="mb-tags">${tags(r)}</span><small>${esc(meta)}</small></span>
      ${scoreBox(r)}</div>`;
  };
  // Bench and IR players: no score (bench points never count); red + struck out with no games left.
  const reserve = (p, side, where) => {
    if (!p) return `<div class="mb-p mb-${side}"></div>`;
    const left = gamesLeft(p);
    const meta = [p.team || 'FA', left ? `${left} game${left === 1 ? '' : 's'} left` : 'No games left'].join(' · ');
    return `<div class="mb-p mb-${side} mb-res${left ? '' : ' mb-gone'}${todayGame(p) ? ' mb-on' : ''}" ${tapAttrs(`${side}-${where}-${p.pid}`)}>
      <span class="mb-name">${nameHtml(p)}<span class="mb-tags">${tags(p)}</span><small>${esc(meta)}</small></span></div>`;
  };
  // The card a tapped bench/IR player opens: his week's games and what he could still add.
  const reserveCard = (p, where, mine) => {
    const left = gamesLeft(p);
    const sched = weekGames(p);
    const text = where === 'ir' ? `On IR: ${mine ? 'you’d' : 'they’d'} have to move him off IR to start him.${left ? ` ${left} game${left === 1 ? '' : 's'} left this week.` : ' No games left this week.'}`
      : left ? `On the bench: ${left} game${left === 1 ? '' : 's'} left this week. Only games after ${mine ? 'you move' : 'they move'} him into the lineup count.` : 'No games left this week: he can’t add anything from here.';
    return `<div class="gm-call gm-${left ? 'plan' : 'none'}">
      <div class="gm-call-top">
        <span class="cm-slot">${where === 'ir' ? 'IR' : 'BN'}</span>
        <div class="gm-who"><b>${esc(p.name)}</b> ${injuryTag(p)}<small>${esc([p.pos, p.team || 'No team', p.perGame ? `about ${num(p.perGame * LOCK_CAL)} a game` : ''].filter(Boolean).join(' · '))}</small></div>
        <span class="gm-badge">${left ? `${left} left` : 'No games'}</span>
      </div>
      ${sched.length ? `<div class="gm-games">${sched.map(g => game({}, g)).join('')}</div>` : ''}
      <p class="gm-text">${esc(text)}</p>
    </div>`;
  };
  const detail = (key, html) => `<div class="mb-detail mb-d${key[0]}" data-for="${esc(key)}"${MB_OPEN.has(key) ? '' : ' hidden'}><p class="mb-whose">${esc(key[0] === 'l' ? teamName(w.me, w.season) : teamName(opp, w.season))}</p>${html}</div>`;
  const side = (owner, t) => `<div class="mb-team"><small>${esc(owner ? teamName(owner, w.season) : 'No opponent')}</small>${owner ? `<b>${num(t.locked)}<span>(${t.left})</span></b><em title="If every unlocked score were locked now">${num(t.ifLocked)} (${t.ifLeft})</em>` : ''}</div>`;
  // Bench or IR section: both teams side by side, each row followed by its (hidden) cards.
  const section = (label, mineList, theirList, where) => {
    if (!mineList.length && !theirList.length) return '';
    const rows = Array.from({ length: Math.max(mineList.length, theirList.length) }, (_, i) => {
      const a = mineList[i], b = theirList[i];
      return `<div class="mb-row mb-rrow">${reserve(a, 'l', where)}<span class="mb-slot"></span>${reserve(b, 'r', where)}</div>
        ${a ? detail(`l-${where}-${a.pid}`, reserveCard(a, where, true)) : ''}${b ? detail(`r-${where}-${b.pid}`, reserveCard(b, where, false)) : ''}`;
    }).join('');
    return `<div class="mb-sec"><span>${label}</span><span class="mb-slot"></span><span>${opp ? label : ''}</span></div><div class="mb-rows">${rows}</div>`;
  };
  const oppTeam = coach.oppCoach?.team;
  const board = `
    <div class="mb-head">${side(w.me, tally(coach.rows))}<span class="mb-vs">vs</span>${side(opp, tally(oppRows))}</div>
    <p class="mb-key">Locked points <span>(starters left to lock)</span><br>Small number: if every unlocked score were locked now · tap a player for his card</p>
    <div class="mb-rows">${coach.rows.map((r, i) => {
      const o = oppRows[i];
      return `<div class="mb-row">${who(r, 'l')}<span class="mb-slot">${esc(r.slot)}</span>${who(o, 'r')}</div>
        ${r.empty ? '' : detail(`l-${r.pid}`, card(r, true, i))}${o && !o.empty ? detail(`r-${o.pid}`, card(o, false, i)) : ''}`;
    }).join('')}</div>
    ${section('Bench', coach.team.bench ?? [], oppTeam?.bench ?? [], 'bn')}
    ${section('IR', coach.team.ir ?? [], oppTeam?.ir ?? [], 'ir')}`;

  body.innerHTML = `<div class="gm-page">
    <div class="cm-pickers gm-tools">
      ${gmTeamPick(w.me, w.season, 'coach')}
      <div class="st-stage gm-risk" role="group" aria-label="Coach mode">${riskBtns}</div>
    </div>
    <section class="card gm-head">
      <div class="card-head"><h2>Week ${w.week}</h2><span class="card-sub">${w.started ? `updated ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : 'before tip-off'}</span></div>
      <div class="gm-counts">${summary.map(([n, t]) => `<span><b>${n}</b> ${t}</span>`).join('')}</div>
      ${coach.calls.length ? `<p class="gm-alert">Lock now: ${coach.calls.map(r => `<b>${esc(r.name)}</b> (${num(r.score)}${r.lockSlot ? ` in ${esc(r.lockSlot)}` : ''})`).join(', ')}.</p>` : ''}
      ${whatIfBanner(w)}
      ${board}
      ${opp || w.medianOn ? gmOdds(w, coach.now) : ''}
      ${opp ? `<p class="cm-rule gm-center">Expected final: you ${num(coach.now.avg[w.me])}, ${esc(teamName(opp, w.season))} ${num(coach.now.avg[opp])}.</p>` : ''}
    </section>
    <div class="cm-races">
      <section class="card">
        <div class="card-head"><h2>Bench players to start</h2></div>
        <p class="cm-rule">Only his games after you move him in count, and a locked starter can’t come out. Benching a starter loses his score.</p>
        ${swapList(w, coach.swaps)}
      </section>
      ${opp ? `<section class="card">
        <div class="card-head"><h2>Their best lineup</h2><span class="card-sub">${esc(teamName(opp, w.season))}</span></div>
        <p class="cm-rule">The coach assumes they’ll play smart: their best healthy players from here on, not just today’s lineup. Locked players stay, anyone listed Out or Doubtful keeps only what he already has, and healthy bench players with games left move in. In the simulation they also lock with the same spot-aware bars as yours, and their games score like real managers’ did in past seasons.</p>
        <ol class="aw-race">${coach.oppBest.lineup.map(oppRow).join('')}</ol>
        ${benchedOpp.length ? `<p class="cm-rule">Assumed out of their lineup: ${benchedOpp.map(r => `${esc(r.name)}${r.injury ? ` (${esc(r.injury)})` : ''}`).join(', ')}.</p>` : ''}
      </section>` : ''}
    </div>
    <section class="card">
      <div class="card-head"><h2>How the coach decides</h2></div>
      <p class="cm-rule">Each starter counts one game a week: the one you lock, or else his last game. <b>Play to win</b> (Beta, recalibrated Oct 2026: see the test below) plays out the rest of the week a few thousand times, every team’s remaining games, both ways (lock his score now, or keep playing), and picks whichever gives the better chance of beating your opponent plus the chance of beating the league median. It knows which of their players are already locked or done, and assumes every other team plays smart too: its best healthy players from here on (not just today’s lineup), planned the same way as yours. Ahead, it locks more to protect the lead; behind, it waits for a bigger night.</p>
      <p class="cm-rule">The coach plans your <b>whole roster against the 9 spots</b>, not each player alone. A lock takes a spot for good, so a score’s lock bar is what that spot is worth: his own games left, or any bench player who fits it and still plays. A depth player’s 25 isn’t a lock while a better bench player with games left could use the spot; a 45 is. Late in the week, as the better players run out of games, the bars come back down. When it says lock, it names the spot: the one the fewest other players could use, so the open spots stay with the players still to play. Bench tips say when to move a bench player in (before his first game) and whether the starter he replaces gets a game first.</p>
      <p class="cm-rule"><b>Safe</b>, <b>Balanced</b> and <b>Bold</b> ignore the matchup and chase points: after each game they compare his score with a <b>lock bar</b>, what waiting is worth on average. Balanced scores the most points; Safe locks more often, Bold chases big games.</p>
      <p class="cm-rule">Tested on two full regular seasons, 2024–25 and 2025–26 (every team-week, against opponents’ real scores; wins = head-to-head plus median, out of 336). The real locked scores come from this site’s saved records, because Sleeper’s own data for old weeks has lost many locks. Settings were fitted on 2024–25 and checked on 2025–26. Play to win won 161 and 145 when spots with no game that day are filled with a bench player who plays (Balanced: 155 and 143), and 152 and 137 with the lineup set once (Balanced: 145 and 135), with the same points. Before the Oct 2026 recalibration it won 151 and 143: its simulation had other teams about 20 a week too strong. The spot-aware bars beat plain bars by 4–5 wins when spots are filled day by day. Each test week starts from the lineup the projections picked, so managers’ real seasons aren’t a fair comparison: their final lineups include news and moves the test can’t see.</p>
      <p class="cm-rule">“About N a game” is Sleeper’s projection for this week under league scoring, for games he’s expected to play, plus 4% (the test’s best fit). Sleeper doesn’t share which game a manager locked: the coach can tell once a later game replaces the score that counts, and otherwise you can tap <b>I locked him</b> (saved on this device). Opponents are read the same way, so one of their players may show as open until a later game shows the lock: if you know he's locked, open his card and tap <b>They locked him</b> (or pick their team above and tap I locked him). Those marks count in the board, the odds, the Briefing and the live scores on this device.</p>
    </section></div>`;

  bindTeamPick(body);
  body.querySelectorAll('[data-risk]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    gmSave('gm-mode', a.dataset.risk);
    renderCoach(body, params).catch(() => {});
  }));
  // Tap a player on the board: open or close his card below the row.
  const toggle = el => {
    const key = el.dataset.key;
    const box = [...body.querySelectorAll('.mb-detail')].find(d => d.dataset.for === key);
    if (!box) return;
    const open = box.hidden;
    box.hidden = !open;
    el.setAttribute('aria-expanded', String(open));
    if (open) MB_OPEN.add(key); else MB_OPEN.delete(key);
  };
  body.querySelectorAll('.mb-p[data-key]').forEach(el => {
    el.addEventListener('click', e => { if (!e.target.closest('a')) toggle(el); });
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(el); } });
  });
  // Real lock marks (this device): "I locked him" = his latest game; a tapped game chip = that game.
  const setMark = (pid, date, toggleSame) => {
    const m = gmLoad(w.marksKey, {});
    const cur = m[pid];
    if (cur != null && (!toggleSame || (typeof cur === 'object' && cur.date === date))) delete m[pid];
    else m[pid] = { date };
    gmSave(w.marksKey, m);
    for (const k of Object.keys(LIVE)) delete LIVE[k]; // live locked points pick up the mark right away
    renderCoach(body, params).catch(() => {});
  };
  body.querySelectorAll('.gm-mark').forEach(b => b.addEventListener('click', () => setMark(b.dataset.pid, b.dataset.date, false)));
  body.querySelectorAll('.gm-pick').forEach(b => b.addEventListener('click', () => setMark(b.dataset.pid, b.dataset.date, true)));
  bindWhatIfs(body, w, () => renderCoach(body, params).catch(() => {}));
  gmAutoRefresh(body, params, renderCoach, w);
}

async function renderBriefing(body, params) {
  const w = await gmWeek(params);
  if (!w) {
    body.innerHTML = '<section class="card soon-card"><p>The season is over. The daily briefing returns when next season’s schedule is set.</p></section>';
    return;
  }
  const extra = await loadWaivers(w.season, w.week, w.started);
  if (route().page !== 'commish') return;
  const { season, week, me, ctx } = w;
  const coach = w.coach;
  if (!coach) {
    body.innerHTML = `${gmTeamPick(me, season, 'brief')}<section class="card soon-card"><p>No roster found for this team.</p></section>`;
    bindTeamPick(body);
    return;
  }
  const team = coach.team;

  // This week's matchup: the coach's played-out week (locks and finished games included).
  const opp = coach.opp;
  const oppTeam = coach.oppCoach?.team;
  const live = ctx.live && team.liveScore != null;
  const lockedNow = live ? (await liveWeek(season, week, { locked: true }).catch(() => null))?.locked ?? null : null;
  const duelSide = (o, t) => `<div><small>${esc(teamName(o, season))}</small><b>${num(live ? lockedNow?.[o] ?? t.liveScore : coach.now.avg[o])}</b><small>${live ? `${lockedNow ? `locked · live ${num(t.liveScore)}` : 'live'} · expected ${num(coach.now.avg[o])}` : 'expected'}</small></div>`;

  // Tonight: every player on the roster with an NBA game today.
  const all = [...team.starters.filter(p => !p.empty).map(p => ({ ...p, starter: true })), ...team.bench];
  // Games by day (owner, Oct 2026, for streaming): every day of this week with games, today first
  // selected; each day lists the active roster's players who play, in tip-off order (Central time).
  const weekDays = [...new Set(Object.values(w.slate).flat().map(g => g.date))].sort();
  const dayStart = weekDays.includes(GM_DAY) ? GM_DAY : weekDays.includes(ctx.today) ? ctx.today : weekDays.find(d => d > ctx.today) ?? weekDays.at(-1);
  const playsOn = d => all.map(p => ({ p, g: (w.slate[p.team] ?? []).find(g => g.date === d) })).filter(x => x.g)
    .sort((a, b) => (a.g.tip ?? '9') < (b.g.tip ?? '9') ? -1 : (a.g.tip ?? '9') > (b.g.tip ?? '9') ? 1 : (b.p.starter ? 1 : 0) - (a.p.starter ? 1 : 0));
  const boxOn = (pid, d) => (w.boxes[pid] ?? []).find(b => b.date === d);
  const dayLabel = d => `${d === ctx.today ? 'Today' : shortDay(d)} ${Number(d.slice(8))}`;
  const dayPanel = d => {
    const list = playsOn(d);
    const st = list.filter(x => x.p.starter).length;
    return `<div class="gm-day" data-day="${d}"${d === dayStart ? '' : ' hidden'}>
      <p class="cm-rule">${esc(longDay(d))}: ${list.length ? `${list.length} of your players (${st} starting, ${list.length - st} on the bench).` : 'none of your players play.'} Times are Central.</p>
      ${list.length ? `<ol class="aw-race">${list.map(({ p, g }) => {
        const bx = boxOn(p.pid, d);
        const live = ['in_progress', 'in_game'].includes(g.status);
        const right = bx && !live ? num(bx.pts) : live ? `Live${bx ? ` ${num(bx.pts)}` : ''}` : g.status === 'complete' || d < ctx.today ? 'DNP' : tipShort(g) || '–';
        return `<li><span>${esc(p.name)} ${injuryTag(p)}<small>${p.starter ? esc(p.slot) : 'Bench'} · ${esc(p.team)} ${g.home ? 'vs' : '@'} ${esc(g.opp ?? '')}${tipTime(g) && right !== tipShort(g) ? ` · ${esc(tipTime(g))}` : ''}</small></span><b>${right}</b></li>`;
      }).join('')}</ol>` : ''}
    </div>`;
  };

  // Injury news since the day before: the snapshot rolls over once a day, so news stays up all day.
  const injKey = `gm-inj-${me}`;
  const saved = gmLoad(injKey, null);
  const base = saved?.date === ctx.today ? saved.base : saved?.now ?? {};
  const inj = injuryNews(team, base);
  gmSave(injKey, { date: ctx.today, base, now: inj.now });

  // Waiver risers, same rule as the Waiver wire tab.
  const risers = w.started ? waiverWire(DATA, ctx, extra).filter(p => !p.out && p.recentGames >= 2 && p.recent >= 20 && p.jump >= 5).sort((a, b) => b.jump - a.jump).slice(0, 3) : [];

  let callsLine = coach.calls.length
    ? `<p class="gm-alert">Lock now: ${coach.calls.map(r => `<b>${esc(r.name)}</b> (${num(r.score)}${r.lockSlot ? ` in ${esc(r.lockSlot)}` : ''})`).join(', ')}.</p>`
    : '';
  const otherCalls = coach.rows.filter(r => ['lock', 'live', 'wait', 'none'].includes(r.call));
  const planned = coach.rows.filter(r => r.call === 'plan').length;
  if (planned) callsLine += `<p class="cm-rule">${planned === coach.rows.filter(r => !r.empty).length ? 'No games played yet this week.' : `${planned} more starter${planned === 1 ? ' hasn’t' : 's haven’t'} played yet.`} Each one’s lock bar for his first game is on the Lock-in coach.</p>`;
  const link = (tab, text) => `<a class="gm-more" href="#/commish?${new URLSearchParams({ tab, ...(me === COMMISH ? {} : { team: me }) })}">${text} →</a>`;

  body.innerHTML = `<div class="gm-page">
    ${gmTeamPick(me, season, 'brief')}
    <section class="card gm-hello">
      <div class="eyebrow">Daily briefing</div>
      <h2>${esc(longDay(ctx.today))}</h2>
      <p class="card-sub">${esc(teamName(me, season))} · Week ${week}${w.started ? '' : ` starts ${esc(longDay(Object.values(w.slate).flat().map(g => g.date).sort()[0] ?? ctx.today))}`}</p>
    </section>
    ${(() => {
      const seenTs = trackerSeen(me);
      const fresh = movesOf(me).filter(x => (x.ts ?? 0) > seenTs);
      return fresh.length ? `<section class="card tk-alert"><div class="card-head"><h2>Team tracker</h2>${link('tracker', 'See the effect')}</div><p><b class="tk-new">${fresh.length} new roster move${fresh.length === 1 ? '' : 's'}</b> since you last looked: ${fresh.slice(0, 3).map(x => esc(MOVE_KIND[x.type] ?? x.type)).join(', ')}${fresh.length > 3 ? '…' : ''}. The Team tracker shows how each one changed your strength, value, age and positions.</p></section>` : '';
    })()}
    <div class="cm-races gm-brief">
      <section class="card">
        <div class="card-head"><h2>Lock calls</h2>${link('coach', 'Lock-in coach')}</div>
        ${whatIfBanner(w)}
        ${callsLine}
        ${otherCalls.length ? `<ol class="aw-race">${otherCalls.map(r => `<li><span>${esc(r.name)}<small>${esc(r.text)}</small></span><b class="gm-badge-s gm-${r.call}">${CALL_LABEL[r.call]}</b></li>`).join('')}</ol>` : coach.calls.length || planned ? '' : '<p class="empty">Nothing to decide right now.</p>'}
      </section>
      <section class="card">
        <div class="card-head"><h2>This week</h2>${link('scout', 'Scouting report')}</div>
        ${opp ? `
          <div class="gm-duel">
            ${duelSide(me, team)}
            <i>vs</i>
            ${duelSide(opp, oppTeam)}
          </div>
          ${gmOdds(w, coach.now)}`
        : '<p class="empty">No matchup this week.</p>'}
        <p class="cm-rule">The rest of the week played out 2,000 times, day by day: your roster following the coach (its lock calls and bench moves), every other team planned the same way (best healthy players in the 9 slots, smart locks), locks and finished games counted.</p>
      </section>
      <section class="card">
        <div class="card-head"><h2>Lineup tips</h2>${link('coach', 'Lock-in coach')}</div>
        ${swapList(w, coach.swaps)}
      </section>
      <section class="card">
        <div class="card-head"><h2>Games by day</h2><span class="card-sub">This week</span></div>
        ${weekDays.length ? `<div class="gm-days" role="tablist">${weekDays.map(d => `<button type="button" role="tab" data-day="${d}" class="${d === dayStart ? 'on' : ''}" aria-selected="${d === dayStart}">${esc(dayLabel(d))}<small>${playsOn(d).length}</small></button>`).join('')}</div>
          ${weekDays.map(dayPanel).join('')}` : '<p class="empty">No NBA games scheduled this week.</p>'}
      </section>
      <section class="card">
        <div class="card-head"><h2>Injury news</h2></div>
        <p class="cm-rule">${inj.first ? 'Everyone on your roster with an injury tag right now. From tomorrow, only changes show here.' : 'Changes on your roster since yesterday (Sleeper’s injury report).'}</p>
        ${inj.news.length ? `<ol class="aw-race">${inj.news.map(p => `<li><span>${esc(p.name)}<small>${p.starter ? 'Starter' : 'Not starting'}${inj.first ? '' : ` · was ${esc(p.was || 'healthy')}`}</small></span><b>${p.injury ? injuryTag(p) : '<span class="cm-pill good">Healthy</span>'}</b></li>`).join('')}</ol>` : '<p class="empty">No injury news.</p>'}
      </section>
      <section class="card">
        <div class="card-head"><h2>Waiver risers</h2>${link('waivers', 'Waiver wire')}</div>
        ${w.started ? (risers.length ? `<ol class="aw-race">${risers.map(p => `<li><span>${esc(p.name)}<small>${esc([p.pos, p.team].join(' · '))} · ${num(p.recent)} a game lately vs ${num(p.fpg)}</small></span><b>+${num(p.jump)}</b></li>`).join('')}</ol>` : '<p class="empty">No big risers on the wire.</p>') : '<p class="empty">Risers show up after the first week of games.</p>'}
      </section>
    </div></div>`;
  bindTeamPick(body);
  bindWhatIfs(body, w, () => renderBriefing(body, params).catch(() => {}));
  body.querySelectorAll('.gm-days button').forEach(b => b.addEventListener('click', () => {
    GM_DAY = b.dataset.day;
    body.querySelectorAll('.gm-days button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); });
    body.querySelectorAll('.gm-day').forEach(p => { p.hidden = p.dataset.day !== GM_DAY; });
  }));
  const dayRow = body.querySelector('.gm-days');
  const dayOn = dayRow?.querySelector('.on');
  if (dayOn) dayRow.scrollLeft = dayOn.offsetLeft - dayRow.offsetLeft - (dayRow.clientWidth - dayOn.offsetWidth) / 2; // row only, never the page
  gmAutoRefresh(body, params, renderBriefing, w);
}
let GM_DAY = null; // the Briefing's chosen day in "Games by day" (kept across its auto-refresh)

// ---- My GM: Dynasty and Managers (dynasty values in assets/dynasty.js) ----

// Prospect grade tag (players 24 and under), shared by Dynasty and the Waiver wire.
const prospectChip = p => (p?.prospect ? `<span class="pg pg-${p.prospect.grade[0]}" title="Prospect grade">${p.prospect.grade}</span>` : '');
// Dynasty tier tag from a 0-100 score (tiers and their meaning: SCORE_TIERS, shown in the guide).
const TIER_SHORT = ['Cornerstone', 'Star', 'High-end starter', 'Starter', 'Flex', 'Depth', 'Stash', 'Replaceable'];
const tierTag = score => { const i = SCORE_TIERS.findIndex(([min]) => score >= min); return i < 0 ? '' : `<span class="tier tier-${i}" title="Dynasty tier: ${SCORE_TIERS[i][1]}">${TIER_SHORT[i]}</span>`; };

// Smoothed projection states saved nightly (dynasty.js PROJ_SMOOTH); missing file = raw projections.
let DYN_PROJ = null;
async function loadDynProj() {
  if (DYN_PROJ) return DYN_PROJ;
  try {
    const res = await fetch(`data/dynasty-proj.json?t=${Date.now()}`, { cache: 'no-store' });
    const file = res.ok ? await res.json() : {};
    DYN_PROJ = file.states ?? [];
    DYN_PRESEASON = file.preseason ?? null;
    DYN_ACTUAL = file.actual?.season === DATA.seasons.at(-1)?.season ? file.actual.games : null;
  } catch { DYN_PROJ = []; }
  return DYN_PROJ;
}
let DYN_PRESEASON = null; // frozen preseason projections (dynasty.js seasonFeedOk)
let DYN_ACTUAL = null; // this season's games of 10+ minutes, saved nightly (dynasty.js seasonActuals)
// Draft Scout classes (data/draft-scout.json, built weekly); missing file = no class strength.
let SCOUT_DATA;
async function loadScout() {
  if (SCOUT_DATA !== undefined) return SCOUT_DATA;
  try {
    const res = await fetch(`data/draft-scout.json?t=${Date.now()}`, { cache: 'no-store' });
    SCOUT_DATA = res.ok ? await res.json() : null;
  } catch { SCOUT_DATA = null; }
  return SCOUT_DATA;
}
// NBA contracts (data/contracts.json, read weekly from Basketball-Reference by the nightly job,
// assets/contracts.js). Information only: never part of a score. Missing file = no contract lines.
let CONTRACTS;
async function loadContracts() {
  if (CONTRACTS !== undefined) return CONTRACTS;
  try {
    const res = await fetch(`data/contracts.json?t=${Date.now()}`, { cache: 'no-store' });
    CONTRACTS = res.ok ? await res.json() : null;
  } catch { CONTRACTS = null; }
  return CONTRACTS;
}
// Contract line under a player row (Dynasty roster, Waiver wire, Trade finder), e.g.
// "$12.4M · 2 more yrs · team option 2028-29" + flags (tap/hover a flag for what it means).
// p = a dynastyValues player (pid, team, nbaSeasons).
const contractLine = p => {
  if (!CONTRACTS?.players || !p) return '';
  const season = DATA.seasons.at(-1).season;
  const c = CONTRACTS.players[p.pid];
  if (!c) return p.team ? '<small class="dy-contract ct-none">No standard NBA contract (two-way, Exhibit 10 or unsigned)</small>' : '';
  const r = readContract(c, season, p.nbaSeasons);
  return `<small class="dy-contract"><span class="ct-label">Contract</span> ${esc(contractText(c, season, p.nbaSeasons))}${p.team && c.team !== p.team ? ` <span class="ct-team">(listed with ${esc(c.team)})</span>` : ''}${r.flags.map(f => ` <span class="ct-flag ct-${f.id}" title="${esc(f.why)}">${esc(f.label)}</span>`).join('')}</small>`;
};
// Team card on the Dynasty tab: how much of the roster's dynasty value has a contract that ends
// (or can end) after this season, and who.
const CT_ENDS = new Set(['contract-year', 'rookie-end']);
const CT_MAYBE = new Set(['opt-out', 'team-option', 'rookie-option']);
function contractsCard(v, rosters, me) {
  if (!CONTRACTS?.players) return '';
  const season = DATA.seasons.at(-1).season;
  const teamOf = o => Object.values(v.players).filter(p => p.owner === o || (rosters.find(r => r.owner_id === o)?.taxi ?? []).includes(p.pid));
  const flagsOf = p => (CONTRACTS.players[p.pid] ? readContract(CONTRACTS.players[p.pid], season, p.nbaSeasons)?.flags ?? [] : []);
  const has = (p, set) => flagsOf(p).some(f => set.has(f.id));
  const shareOf = (players, set) => { const all = players.reduce((a, p) => a + p.score, 0); return all ? players.filter(p => has(p, set)).reduce((a, p) => a + p.score, 0) / all : 0; };
  const owners = rosters.map(r => r.owner_id).filter(Boolean);
  const league = owners.map(o => ({ o, ends: shareOf(teamOf(o), CT_ENDS), maybe: shareOf(teamOf(o), CT_MAYBE) })).sort((a, b) => b.ends - a.ends);
  const mine = league.find(x => x.o === me);
  if (!mine) return '';
  const roster = teamOf(me).sort((a, b) => b.score - a.score);
  const avg = league.reduce((a, x) => a + x.ends, 0) / league.length;
  const group = (title, list, note) => (list.length ? `<div class="tf-side-head">${title} <small>${list.length}</small></div><ol class="aw-race ct-list">${list.map(p => `<li><span>${esc(p.name)} ${tierTag(p.score)}<small>${esc(contractText(CONTRACTS.players[p.pid], season, p.nbaSeasons) ?? '')}${note ? ` · ${esc(note(p))}` : ''}</small></span><b>${p.score}</b></li>`).join('')}</ol>` : '');
  const by = id => roster.filter(p => flagsOf(p).some(f => f.id === id));
  const none = roster.filter(p => !CONTRACTS.players[p.pid] && p.team);
  const read = CONTRACTS.source?.read ?? CONTRACTS.at;
  return `<section class="card" id="dy-contracts">
    <div class="card-head"><h2>Contracts</h2><span class="card-sub">NBA deals · ${esc(CONTRACTS_SOURCE)}, read ${esc(shortMd(read))}</span></div>
    <p class="ct-share"><b>${pctOf(mine.ends)}</b> of your roster’s dynasty value is in a contract year <small>(league average ${pctOf(avg)}; No. ${league.indexOf(mine) + 1} of ${league.length}, most first)</small>${mine.maybe ? `<br><b>${pctOf(mine.maybe)}</b> more has an option after this season <small>(he or his team can end the deal)</small>` : ''}</p>
    ${group('Contract year', by('contract-year'))}
    ${group('Rookie deal ends', by('rookie-end'))}
    ${group('Extension next summer', by('rookie-ext'))}
    ${group('Option after this season', roster.filter(p => has(p, CT_MAYBE)), p => flagsOf(p).find(f => CT_MAYBE.has(f.id)).label)}
    ${group('Easy to waive', by('waivable'))}
    ${none.length ? `<div class="tf-side-head">No standard contract <small>${none.length}</small></div><p class="cm-rule">${none.map(p => esc(p.name)).join(', ')}: on a two-way or Exhibit 10 deal (not on the contracts page), or unsigned.</p>` : ''}
    <details class="cm-group"><summary>Every team</summary>
      <div class="cm-scroll"><table class="cm-table"><thead><tr><th>Team</th><th>Contract year</th><th>Option after</th></tr></thead>
      <tbody>${league.map(x => `<tr class="${x.o === me ? 'cm-me' : ''}"><td>${esc(name(x.o))}</td><td>${pctOf(x.ends)}</td><td>${pctOf(x.maybe)}</td></tr>`).join('')}</tbody></table></div>
    </details>
    <p class="cm-rule">Share of dynasty value = his dynasty score over the team’s total (taxi and IR included). <b>Contract year</b>: his NBA deal ends after this season, so he may change teams or roles. <b>Rookie deal ends</b>: his first contract ends; his team can extend him or match offers as a restricted free agent. <b>Extension next summer</b>: one rookie year left after this one. <b>Easy to waive</b>: a near-minimum or not fully guaranteed deal, so his team can cut him cheaply. On a computer, hover a flag for details. Contracts are information only: they don’t change dynasty scores or prospect grades.</p>
  </section>`;
}
// Draft night snapshots (owner, Oct 2026): a finished draft graded once as Draft Scout would have on
// draft night (assets/draft-night-{year}.json, built by scout.js buildDraftNight; never rebuilt).
const DRAFT_NIGHTS = [2026];
let DRAFT_NIGHT_DATA;
async function loadDraftNights() {
  if (DRAFT_NIGHT_DATA) return DRAFT_NIGHT_DATA;
  const got = await Promise.all(DRAFT_NIGHTS.map(async y => {
    try {
      const res = await fetch(`assets/draft-night-${y}.json?t=${Date.now()}`, { cache: 'no-store' });
      return res.ok ? [String(y), await res.json()] : null;
    } catch { return null; }
  }));
  DRAFT_NIGHT_DATA = Object.fromEntries(got.filter(Boolean));
  return DRAFT_NIGHT_DATA;
}
const loadDynastyFeeds = async () => loadDynasty(DATA, { projStates: await loadDynProj(), preseason: DYN_PRESEASON, actual: DYN_ACTUAL, scout: await loadScout() });
async function gmDynasty(params) {
  const cur = DATA.seasons.at(-1);
  const me = cur.teams.some(t => t.owner === params.get('team')) ? params.get('team') : COMMISH;
  const [f] = await Promise.all([loadDynastyFeeds(), loadContracts()]);
  return { season: cur.season, me, f, v: dynastyValues(DATA, f, { fullInjured: gmLoad('gm-dyn-full', false) }) };
}
const scoreBar = s => `<span class="dy-bar" aria-hidden="true"><i style="width:${s}%"></i></span><b class="dy-score">${s}</b>`;
const trendOf = p => {
  // Compare with his real per-game level (the injury discount only cuts this season's value).
  const base = p.outCut ? p.v[0] * 2 : p.v[0];
  if (!base) return '';
  const pct = Math.round((p.v[2] / base - 1) * 100);
  return pct >= 5 ? `<span class="dy-up">↑ ${pct}%</span>` : pct <= -5 ? `<span class="dy-down">↓ ${-pct}%</span>` : '<span class="dy-flat">steady</span>';
};
const LABEL_CLS = { Contender: 'good', 'Win now': 'good', Rising: 'good', Fading: 'bad', Rebuilding: 'bad' };
// Positions (Dynasty roster + Waiver wire filters): main Sleeper position -> G/F/C group, plus
// the other groups his fantasy_positions let him fill ("secondary position").
const POS_GROUP = { PG: 'G', SG: 'G', G: 'G', SF: 'F', PF: 'F', F: 'F', C: 'C' };
const POS_WORD = { G: ['guard', 'guards'], F: ['forward', 'forwards'], C: ['center', 'centers'] };
const posGroups = p => {
  const main = POS_GROUP[p.pos] ?? '';
  return { main, sec: [...new Set((p.fpos ?? []).map(x => POS_GROUP[x]).filter(g => g && g !== main))] };
};
const posText = p => [p.pos, ...(p.fpos ?? []).filter(x => x !== p.pos)].filter(Boolean).join('/');
const pctOf = x => `${Math.round(x * 100)}%`;
const chances = q => `Rotation ${pctOf(q.rotation)} · Starter ${pctOf(q.starter)} · Star ${pctOf(q.star)}`;
// Smoothing note: Sleeper's projection moved and the score is still catching up.
const projNote = p => (p?.projRaw != null ? ` · <span class="dy-catch" title="This season's projection is smoothed, so one overnight update can't swing the score">${p.projRaw > p.projUsed ? '↗' : '↘'} catching up: Sleeper ${num(p.projRaw)} a game, counted ${num(p.projUsed)}</span>` : '');

// ---- Dynasty score over time (tap a player on the Dynasty tab) ----
// data/dynasty-history.json is written by the nightly update: { days: { date: { pid: score,
// or [score, fullValueScore] when he's listed Out } } }. Today's live score is added at the end.
let DYN_HISTORY = null;
async function loadDynHistory() {
  if (DYN_HISTORY) return DYN_HISTORY;
  try {
    const res = await fetch(`data/dynasty-history.json?t=${Date.now()}`, { cache: 'no-store' });
    DYN_HISTORY = res.ok ? await res.json() : { days: {} };
  } catch { DYN_HISTORY = { days: {} }; }
  return DYN_HISTORY;
}
const ctDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date());
// Month and day, plus the year when it isn't this year ("Mar 15 '26").
const shortMd = d => { const t = new Date(`${d}T12:00:00`); const md = t.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); return t.getFullYear() === new Date().getFullYear() ? md : `${md} '${String(t.getFullYear()).slice(2)}`; };

function scoreSeries(hist, p, full, v = null) {
  const pts = Object.entries(hist.days ?? {}).sort(([a], [b]) => (a < b ? -1 : 1)).map(([d, day]) => {
    const x = day[p.pid];
    return { d, s: x == null ? 0 : Array.isArray(x) ? (full ? x[1] : x[0]) : x, pr: hist.proj?.[d]?.[p.pid] ?? null, out: Array.isArray(x), lg: hist.league?.[d] ?? null };
  });
  const today = ctDate();
  if (pts.at(-1)?.d === today) pts.pop();
  pts.push({ d: today, s: p.score, live: true, pr: p.projUsed ?? null, out: Boolean(p.out), lg: v ? { floor: v.floor, top: v.top } : null });
  return pts;
}

// Why a point moved from the one before: his projection, his Out status, or the league anchors
// (waiver line = 0, the most valuable player = 100). Saved nightly from Oct 2026 (hist.proj/league).
function scoreWhy(prev, x, full) {
  if (!prev) return '';
  const parts = [];
  if (prev.pr != null && x.pr != null && Math.abs(x.pr - prev.pr) >= 0.05) parts.push(`projection ${num(prev.pr)} → ${num(x.pr)} a game`);
  if (prev.out !== x.out) parts.push(x.out ? `listed Out${full ? ' (counted at full value)' : ' (this season counted at half)'}` : 'no longer listed Out');
  if (prev.lg && x.lg && Math.abs(x.lg.floor - prev.lg.floor) >= 0.1) parts.push(`waiver line ${num(prev.lg.floor)} → ${num(x.lg.floor)} a game (${x.lg.floor > prev.lg.floor ? 'higher line = lower scores' : 'lower line = higher scores'})`);
  if (prev.lg && x.lg && Math.abs(x.lg.top / prev.lg.top - 1) >= 0.01) parts.push(`the top player’s value ${x.lg.top > prev.lg.top ? 'rose, so every score shifts down a little' : 'fell, so every score shifts up a little'}`);
  const ch = x.s - prev.s;
  const head = `${ch > 0 ? '+' : ''}${ch} since ${shortMd(prev.d)}`;
  if (parts.length) return `${head}: ${parts.join('; ')}.`;
  if (prev.pr == null || x.pr == null || !prev.lg || !x.lg) return `${head}${ch ? ' (no saved projection for that day, so the cause isn’t known)' : ''}.`;
  return ch ? `${head}: nothing he or the league changed was saved, so it’s rounding.` : `${head}: no change.`;
}
function scoreInfo(x, prev, full) {
  const bits = [`${shortMd(x.d)}${x.live ? ' (now)' : ''}: score ${x.s}`];
  if (x.pr != null) bits.push(`projected ${num(x.pr)} a game`);
  if (x.out) bits.push('listed Out');
  if (x.lg) bits.push(`waiver line ${num(x.lg.floor)}`);
  const why = scoreWhy(prev, x, full);
  return `${bits.join(' · ')}.${why ? ` ${why}` : ''}`;
}

const CHART_TIER = ['Cornerstone', 'Star', 'High-end', 'Starter', 'Flex', 'Depth', 'Stash', 'Waiver'];
// NBA season a date belongs to: from August on it's that year's season ("2025" = 2025-26).
const seasonOfDate = d => { const [y, m] = d.split('-').map(Number); return String(m >= 8 ? y : y - 1); };

// One season's chart. range = { lo, hi }: the same for every season of a player, so seasons compare.
function scoreChart(p, pts, range) {
  const W = 380, H = 170, P = { l: 26, r: 84, t: 14, b: 24 };
  const { lo, hi } = range;
  const day = d => new Date(`${d}T12:00:00`).getTime() / 864e5;
  const d0 = day(pts[0].d), d1 = Math.max(day(pts.at(-1).d), d0 + 1);
  const X = d => (pts.length < 2 ? (P.l + W - P.r) / 2 : P.l + (day(d) - d0) / (d1 - d0) * (W - P.l - P.r));
  const Y = s => H - P.b - (s - lo) / (hi - lo) * (H - P.t - P.b);
  // Tier lines inside the range give the numbers meaning (same tiers as the guide).
  const tiers = SCORE_TIERS.filter(([min]) => min > lo && min < hi).map(([min]) => {
    const idx = SCORE_TIERS.findIndex(t => t[0] === min);
    return `<line class="sc-tier" x1="${P.l}" x2="${W - P.r}" y1="${Y(min)}" y2="${Y(min)}"/><text class="sc-tier-l" x="${W - P.r + 6}" y="${Y(min) + 3}">${CHART_TIER[idx]} ${min}</text>`;
  }).join('');
  const path = pts.map((x, i) => `${i ? 'L' : 'M'}${X(x.d).toFixed(1)},${Y(x.s).toFixed(1)}`).join(' ');
  const dots = pts.map((x, i) => `<g class="sc-pt${x.live ? ' now' : ''}" data-info="${esc(x.info ?? '')}"><title>${esc(x.info ?? `${shortMd(x.d)}: ${x.s}`)}</title><circle cx="${X(x.d)}" cy="${Y(x.s)}" r="12" class="sc-hit"/><circle cx="${X(x.d)}" cy="${Y(x.s)}" r="${x.live ? 5 : 3}"/></g>`).join('');
  // ▲ / ▼ under a point where his projection moved 0.5+ a game since the point before.
  const marks = pts.map((x, i) => {
    const prev = pts[i - 1];
    if (!prev || prev.pr == null || x.pr == null || Math.abs(x.pr - prev.pr) < 0.5) return '';
    const up = x.pr > prev.pr;
    return `<text class="sc-mk ${up ? 'up' : 'down'}" x="${X(x.d)}" y="${Math.min(H - P.b - 2, Y(x.s) + 15)}" text-anchor="middle">${up ? '▲' : '▼'}</text>`;
  }).join('');
  const last = pts.at(-1);
  return `<svg class="sc-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(p.name)} dynasty score, ${seasonSpan(seasonOfDate(last.d))}">
    <text class="sc-ax" x="${P.l - 6}" y="${Y(hi) + 4}" text-anchor="end">${hi}</text>
    <text class="sc-ax" x="${P.l - 6}" y="${Y(lo) + 4}" text-anchor="end">${lo}</text>
    <line class="sc-base" x1="${P.l}" x2="${W - P.r}" y1="${Y(lo)}" y2="${Y(lo)}"/>
    ${tiers}
    ${pts.length > 1 ? `<path class="sc-line" d="${path}"/>` : ''}
    ${marks}
    ${dots}
    <text class="sc-val" x="${X(last.d) - 8}" y="${Y(last.s) - 9}" text-anchor="end">${last.s}</text>
    <text class="sc-ax" x="${P.l}" y="${H - 6}">${pts.length > 1 ? shortMd(pts[0].d) : ''}</text>
    <text class="sc-ax" x="${pts.length > 1 ? W - P.r : X(last.d)}" y="${H - 6}" text-anchor="${pts.length > 1 ? 'end' : 'middle'}">${shortMd(last.d)}</text>
  </svg>`;
}

function scoreSummary(pts, current) {
  // Weekly points (a rebuilt past season) are 5+ days apart; nightly points are 1 day apart.
  const weekly = pts.slice(1).some((x, i) => (new Date(x.d) - new Date(pts[i].d)) / 864e5 >= 5);
  const how = weekly
    ? 'One point a week, rebuilt from each week’s Sleeper projections (within about 3 points of the nightly method); “projected” here is the running blend of those weekly projections.'
    : 'One point a night.';
  if (pts.length < 2) return current ? 'This season’s history starts with tonight’s nightly update, then adds a point every night. The gold dot is today.' : how;
  const first = pts[0], last = pts.at(-1);
  const hi = pts.reduce((a, x) => (x.s > a.s ? x : a)), lo = pts.reduce((a, x) => (x.s < a.s ? x : a));
  const ch = last.s - first.s;
  return `${shortMd(first.d)} → ${shortMd(last.d)}: ${first.s} → ${last.s} (${ch > 0 ? '+' : ''}${ch}). High ${hi.s} (${shortMd(hi.d)}), low ${lo.s} (${shortMd(lo.d)}). ${how}${current ? ' The gold dot is now.' : ''}`;
}

// The charts, one season per panel: swipe on phones, arrows with a mouse. Opens on this season.
function scoreSeasons(p, pts, full = false) {
  pts.forEach((x, i) => { x.info = scoreInfo(x, pts[i - 1], full); });
  const bySeason = {};
  for (const x of pts) (bySeason[seasonOfDate(x.d)] ??= []).push(x);
  const seasons = Object.keys(bySeason).sort();
  const vals = pts.map(x => x.s);
  let lo = Math.max(0, Math.floor(Math.min(...vals) - 6));
  let hi = Math.min(100, Math.ceil(Math.max(...vals) + 6));
  if (hi - lo < 12) { const mid = (hi + lo) / 2; lo = Math.max(0, Math.round(mid - 6)); hi = Math.min(100, lo + 12); }
  const cur = seasons.at(-1);
  return `
    <div class="sc-head"><b>${esc(p.name)}</b> · dynasty score by season</div>
    <div class="sc-nav">
      <button type="button" class="sc-arrow sc-prev" aria-label="Previous season">‹</button>
      <span class="sc-label">${seasonSpan(cur)}</span>
      <button type="button" class="sc-arrow sc-next" aria-label="Next season">›</button>
    </div>
    <div class="sc-strip">${seasons.map(s => `
      <div class="sc-slide" data-season="${s}">
        ${scoreChart(p, bySeason[s], { lo, hi })}
        <p class="sc-info" aria-live="polite">${esc(bySeason[s].at(-1).info)}</p>
        <p class="cm-rule">${esc(scoreSummary(bySeason[s], s === cur))} Tap a dot for that day’s projection and what moved the score; ▲▼ = his projection moved 0.5+ a game.</p>
        <p class="cm-rule"><b>Projected</b> = the fantasy points (your league’s scoring) Sleeper expects in his <i>average</i> game this season, not every game: real games swing around it (about 2 games in 3 land between 70% and 130% of it), and since you lock his best game of the week, a starter’s weekly score usually beats it. <b>Waiver line</b> = what you could get for free: the value of roughly the 160th- to 175th-best players in the NBA (about where the best free agents sit), in fantasy points per game blended over 3 seasons the same way as the score (this season 50%, next 30%, the one after 20%). A player at or below the line scores about 0 (young players keep a little for their upside); the further above it, the higher the score.</p>
      </div>`).join('')}</div>
    ${seasons.length > 1 ? `<div class="sc-dots">${seasons.map(s => `<i data-season="${s}"></i>`).join('')}<span class="sc-swipe">Swipe for other seasons</span></div>` : ''}`;
}

function bindSeasonStrip(box) {
  const strip = $('.sc-strip', box);
  const slides = [...box.querySelectorAll('.sc-slide')];
  const at = () => Math.round(strip.scrollLeft / Math.max(1, strip.clientWidth));
  const show = () => {
    const i = Math.min(slides.length - 1, Math.max(0, at()));
    $('.sc-label', box).textContent = seasonSpan(slides[i].dataset.season);
    $('.sc-prev', box).disabled = i === 0;
    $('.sc-next', box).disabled = i === slides.length - 1;
    box.querySelectorAll('.sc-dots i').forEach((d, j) => d.classList.toggle('on', j === i));
  };
  const go = step => strip.scrollTo({ left: (at() + step) * strip.clientWidth, behavior: 'smooth' });
  $('.sc-prev', box).addEventListener('click', e => { e.stopPropagation(); go(-1); });
  $('.sc-next', box).addEventListener('click', e => { e.stopPropagation(); go(1); });
  strip.addEventListener('scroll', () => requestAnimationFrame(show), { passive: true });
  strip.scrollLeft = strip.scrollWidth; // open on this season
  show();
}

// ---- Position strength (Dynasty tab): every team's G / F / C vs the league average = 100 ----
// Same numbers as the trade evaluator (positionStrength in tradefinder.js).
// A team's needs (Managers cards and the Position strength table): weak positions this season
// (under 95) and in 2 years (under 90), what its outlook says it's shopping for, a full taxi
// squad, and no 1st-round pick in the next draft. Returns short labels, most important first.
const NEED_NAME = { G: 'Guard', F: 'Forward', C: 'Center' };
function teamNeeds(v, rosters, o, psNow = positionStrength(v, rosters, 'now'), psLater = positionStrength(v, rosters, 'later')) {
  const out = [];
  const now = psNow.ratio[o] ?? {};
  const later = psLater.ratio[o] ?? {};
  for (const g of ['G', 'F', 'C'].filter(x => (now[x] ?? 1) < 0.95).sort((a, b) => now[a] - now[b])) out.push({ kind: 'pos', text: `${NEED_NAME[g]} (${Math.round(now[g] * 100)})` });
  for (const g of ['G', 'F', 'C'].filter(x => (later[x] ?? 1) < 0.9 && !((now[x] ?? 1) < 0.95)).sort((a, b) => later[a] - later[b])) out.push({ kind: 'later', text: `${NEED_NAME[g]} in 2 yrs (${Math.round(later[g] * 100)})` });
  const label = v.outlook[o]?.label;
  if (label === 'Contender' || label === 'Win now') out.push({ kind: 'style', text: 'Proven starters now' });
  else if (label === 'Rising' || label === 'Rebuilding') out.push({ kind: 'style', text: 'Youth + picks' });
  else if (label === 'Fading') out.push({ kind: 'style', text: 'Younger core' });
  const r = (rosters ?? []).find(x => x.owner_id === o);
  if ((r?.taxi ?? []).length >= 15) out.push({ kind: 'limit', text: 'Taxi full (15)' });
  const next = v.nextDraft;
  if (next && !v.picks.some(p => p.owner === o && p.season === next && p.round === 1)) out.push({ kind: 'limit', text: `No ${next} 1st` });
  return out;
}
const needChips = list => (list.length ? list.map(n => `<span class="need need-${n.kind}">${esc(n.text)}</span>`).join(' ') : '<span class="need need-ok">No clear holes</span>');

function drawPositions(card, v, rosters, me) {
  if (!card) return;
  let when = 'now';
  const cls = x => (x >= 1.1 ? 'pos-hi' : x <= 0.9 ? 'pos-lo' : '');
  const draw = () => {
    const ps = positionStrength(v, rosters, when);
    const rows = Object.entries(ps.ratio).map(([o, r]) => ({ o, r, all: (r.G + r.F + r.C) / 3 })).sort((a, b) => b.all - a.all);
    const mine = ps.top[me] ?? {};
    const k = when === 'later' ? 2 : 0;
    const groupName = { G: 'Guards (best 3)', F: 'Forwards (best 3)', C: 'Centers (best 2)' };
    const zero = { active: 0, ir: 0, taxi: 0 };
    const cnt = (o, g) => { const c = ps.count?.[o]?.[g] ?? zero; return `${c.active}${c.ir ? ` <span class="pos-ir">${c.ir}</span>` : ''}${c.taxi ? ` (${c.taxi})` : ''}`; };
    const cntText = g => { const c = ps.count?.[me]?.[g] ?? zero; return [`${c.active} active`, c.ir ? `<span class="pos-ir">${c.ir} on IR</span>` : '', c.taxi ? `${c.taxi} on taxi` : ''].filter(Boolean).join(' · '); };
    card.innerHTML = `
      <div class="card-head"><h2>Position strength</h2><span class="card-sub">100 = league average</span></div>
      <div class="st-stage dy-mv-chips pos-when" role="group">${[['now', 'This season'], ['later', 'In 2 years']].map(([id, l]) => `<a href="#" data-when="${id}" class="${id === when ? 'on' : ''}">${l}</a>`).join('')}</div>
      <div class="cm-scroll"><table class="cm-table pos-table"><thead><tr><th>Team</th><th>G</th><th>F</th><th>C</th><th>Avg</th><th>Needs</th></tr></thead><tbody>
        ${rows.map(x => `<tr class="${x.o === me ? 'cm-me' : ''}"><td>${esc(name(x.o))}</td>${['G', 'F', 'C'].map(g => `<td class="${cls(x.r[g])}">${Math.round(x.r[g] * 100)}<small class="pos-n" title="Players whose main position is ${POS_WORD[g][0]}: active, on IR (red), on taxi (in parentheses)">${cnt(x.o, g)}</small></td>`).join('')}<td><b>${Math.round(x.all * 100)}</b></td><td class="pos-need">${['G', 'F', 'C'].filter(g => x.r[g] < (when === 'later' ? 0.9 : 0.95)).sort((a, b) => x.r[a] - x.r[b]).map(g => NEED_NAME[g]).join(', ') || '–'}</td></tr>`).join('')}
      </tbody></table></div>
      <div class="pos-mine">
        <div class="tf-side-head">${esc(teamName(me, DATA.seasons.at(-1).season))}: who counts</div>
        ${['G', 'F', 'C'].map(g => `<p><b>${groupName[g]} · ${Math.round((ps.ratio[me]?.[g] ?? 0) * 100)}</b> <span class="pos-cnt">${cntText(g)}</span><small>${(mine[g] ?? []).map(p => `${esc(p.name)} ${num(p.v[k])}`).join(' · ') || 'nobody'}</small></p>`).join('')}
      </div>
      <p class="cm-rule">${when === 'now'
        ? 'Each team’s best guards (PG/SG), forwards (SF/PF) and centers this season by projected fantasy points per game, taxi players left out, compared with the league average. Above 110 is a strength (green), under 90 a weak spot (red).'
        : 'The same two seasons from now: points per game carried forward on the age curve, taxi players included (they’ll be up by then). Picks aren’t counted here.'} Players listed Out follow the injury setting at the top. Positions are Sleeper’s main position for each player; the small numbers under each score count the team’s players whose main position that is: active, <span class="pos-ir">on IR</span>, (on taxi).</p>`;
    card.querySelectorAll('[data-when]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); when = a.dataset.when; draw(); }));
  };
  draw();
}

// ---- Risers & fallers: biggest dynasty score changes over a season (Dynasty tab) ----
// From data/dynasty-history.json. A past season runs from its first saved point to its last; the
// current season ends with today's live scores and can be narrowed to the last 30 or 7 days.
// Players missing from a saved day count as 0 (not rostered and no value).
async function fillMovers(card, v, me) {
  if (!card) return;
  const hist = await loadDynHistory();
  if (!card.isConnected) return;
  const full = Boolean(gmLoad('gm-dyn-full', false));
  const val = x => (x == null ? 0 : Array.isArray(x) ? (full ? x[1] : x[0]) : x);
  const today = ctDate();
  const cur = seasonOfDate(today);
  const days = Object.keys(hist.days ?? {}).sort().filter(d => d < today);
  const seasons = [...new Set([...days.map(seasonOfDate), cur])].sort().reverse();
  const st = { season: cur, period: 'season', scope: 'league' };
  const pname = pid => v.players[pid]?.name ?? DATA.players?.[pid]?.n ?? `Player ${pid}`;
  const chips = (key, opts) => `<div class="st-stage dy-mv-chips" role="group">${opts.map(([id, l]) => `<a href="#" data-k="${key}" data-v="${id}" class="${st[key] === id ? 'on' : ''}">${l}</a>`).join('')}</div>`;
  const row = r => `<li><span>${esc(pname(r.pid))} ${tierTag(r.b)}<small>${esc(v.players[r.pid]?.owner ? `now ${name(v.players[r.pid].owner)}` : 'not on a roster')} · ${r.a} → ${r.b}</small></span><b class="${r.d > 0 ? 'dy-up' : 'dy-down'}">${r.d > 0 ? '+' : ''}${r.d}</b></li>`;

  const draw = () => {
    const inSeason = days.filter(d => seasonOfDate(d) === st.season);
    const live = st.season === cur;
    let start = inSeason[0];
    if (live && st.period !== 'season') {
      const back = new Date(`${today}T12:00:00`); back.setDate(back.getDate() - (st.period === 'd7' ? 7 : 30));
      const cutoff = back.toISOString().slice(0, 10);
      start = inSeason.find(d => d >= cutoff) ?? inSeason[0];
    }
    const end = live ? null : inSeason.at(-1);
    const endScore = pid => (live ? v.players[pid]?.score ?? 0 : val(hist.days[end]?.[pid]));
    let body = '';
    if (!start || (!live && start === end)) {
      body = `<p class="empty">${live ? 'This season’s movement shows once a few nights of history are saved (the nightly update adds one a night).' : 'Not enough saved points for this season.'}</p>`;
    } else {
      const pids = new Set([...Object.keys(hist.days[start] ?? {}), ...(live ? Object.values(v.players).filter(p => p.owner || p.score > 0).map(p => p.pid) : Object.keys(hist.days[end] ?? {}))]);
      let rows = [...pids].map(pid => { const a = val(hist.days[start]?.[pid]); const b = endScore(pid); return { pid, a, b, d: b - a }; }).filter(r => r.d);
      if (st.scope === 'mine') rows = rows.filter(r => v.players[r.pid]?.owner === me);
      const up = [...rows].filter(r => r.d > 0).sort((x, y) => y.d - x.d).slice(0, 10);
      const down = [...rows].filter(r => r.d < 0).sort((x, y) => x.d - y.d).slice(0, 10);
      body = `
        <p class="cm-rule">${shortMd(start)} → ${live ? 'today' : shortMd(end)}${st.scope === 'mine' ? ` · ${esc(teamName(me, DATA.seasons.at(-1).season))} only` : ''}. Team shown is where the player is now.</p>
        <div class="cm-races dy-mv-cols">
          <div><div class="tf-side-head">Biggest risers</div>${up.length ? `<ol class="aw-race">${up.map(row).join('')}</ol>` : '<p class="empty">Nobody rose.</p>'}</div>
          <div><div class="tf-side-head">Biggest fallers</div>${down.length ? `<ol class="aw-race">${down.map(row).join('')}</ol>` : '<p class="empty">Nobody fell.</p>'}</div>
        </div>`;
    }
    card.innerHTML = `
      <div class="card-head"><h2>Risers &amp; fallers</h2><span class="card-sub">Dynasty score change</span></div>
      <div class="dy-mv-bar">
        ${chips('season', seasons.map(s => [s, seasonSpan(s)]))}
        ${st.season === cur ? chips('period', [['season', 'Season'], ['d30', '30 days'], ['d7', '7 days']]) : ''}
        ${chips('scope', [['league', 'League'], ['mine', 'My team']])}
      </div>
      ${body}`;
    card.querySelectorAll('[data-k]').forEach(a => a.addEventListener('click', e => {
      e.preventDefault();
      st[a.dataset.k] = a.dataset.v;
      if (a.dataset.k === 'season') st.period = 'season';
      draw();
    }));
  };
  draw();
}


// ▲/▼ next to each roster score: his move over the last 7 days (nightly history; the base is the
// newest saved night at least 7 days back, or the season's first saved night), plus a team line.
async function fillWeekArrows(body, v, me) {
  const hist = await loadDynHistory();
  const full = Boolean(gmLoad('gm-dyn-full', false));
  const today = ctDate();
  const start = `${seasonOfDate(today)}-08-01`;
  const dates = Object.keys(hist.days ?? {}).filter(d => d >= start && d < today).sort();
  if (!dates.length || !body.isConnected) return;
  const back = new Date(`${today}T12:00:00`); back.setDate(back.getDate() - 7);
  const target = back.toISOString().slice(0, 10);
  const base = [...dates].reverse().find(d => d <= target) ?? dates[0];
  const day = hist.days[base];
  const at = pid => { const x = day[pid]; return x == null ? 0 : Array.isArray(x) ? (full ? x[1] : x[0]) : x; };
  let up = 0, down = 0, net = 0;
  body.querySelectorAll('.dy-list > .dy-row').forEach(li => {
    const p = v.players[li.dataset.pid];
    if (!p) return;
    const d = p.score - at(p.pid);
    net += d;
    if (d > 0) up++; else if (d < 0) down++;
    if (d) $('.dy-val', li)?.insertAdjacentHTML('afterbegin', `<span class="dy-wk ${d > 0 ? 'up' : 'down'}" title="${d > 0 ? '+' : ''}${d} since ${shortMd(base)}">${d > 0 ? '▲' : '▼'}${Math.abs(d)}</span>`);
  });
  const days = Math.round((new Date(`${today}T12:00:00`) - new Date(`${base}T12:00:00`)) / 864e5);
  const box = $('#dy-week', body);
  if (box) box.innerHTML = `Since ${esc(shortMd(base))}${days < 7 ? ` (${days} day${days === 1 ? '' : 's'} of history)` : ''}: <span class="dy-up">${up} ▲</span> · <span class="dy-down">${down} ▼</span> · team net <b class="${net > 0 ? 'dy-up' : net < 0 ? 'dy-down' : ''}">${net > 0 ? '+' : ''}${net}</b>`;
}

// Prospect grade changes for this roster (update.mjs saves a grade only when it changes).
const GRADE_ORDER = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'];
async function fillGradeLog(box, v, me) {
  const hist = await loadDynHistory();
  if (!box?.isConnected) return;
  const log = hist.grades ?? {};
  const mine = Object.values(v.players).filter(p => p.owner === me && log[p.pid]);
  const changes = mine.flatMap(p => log[p.pid].slice(1).map(([d, g], i) => ({ p, d, from: log[p.pid][i][1], to: g })))
    .sort((a, b) => (a.d < b.d ? 1 : -1)).slice(0, 15);
  const first = Object.values(log).map(x => x[0]?.[0]).filter(Boolean).sort()[0];
  box.innerHTML = `<div class="card-head"><h2>Prospect grade changes</h2><span class="card-sub">Your players · only when a grade moves</span></div>
    ${changes.length ? `<ol class="aw-race">${changes.map(c => {
      const up = GRADE_ORDER.indexOf(c.to) < GRADE_ORDER.indexOf(c.from);
      return `<li><span>${esc(c.p.name)}<small>${esc(shortMd(c.d))}</small></span><span class="dy-grade-move"><span class="pg pg-${esc(c.from[0])}">${esc(c.from)}</span><span class="${up ? 'dy-up' : 'dy-down'}">${up ? '▲' : '▼'}</span><span class="pg pg-${esc(c.to[0])}">${esc(c.to)}</span></span></li>`;
    }).join('')}</ol>` : `<p class="empty">No grade changes yet.</p>`}
    <p class="cm-rule">Each night the prospect grade of every saved player is checked; a line appears only when a grade moves${first ? ` (tracking since ${esc(shortMd(first))})` : ' (tracking starts with the next nightly update)'}.</p>`;
}

// ---- Top 100 prospects, league-wide (My GM → Prospects; ranking in dynasty.js prospectRanking) ----
// Arrows compare today's rank with the saved order from about a week ago (dynasty-history.json
// prospectRanks: the newest saved night at least 7 days back, or the earliest one).
function prospectMoves(hist, list) {
  const ranks = hist.prospectRanks ?? {};
  const today = ctDate();
  const dates = Object.keys(ranks).filter(d => d < today).sort();
  if (!dates.length) return { base: null, move: () => null };
  const back = new Date(`${today}T12:00:00`); back.setDate(back.getDate() - 7);
  const base = [...dates].reverse().find(d => d <= back.toISOString().slice(0, 10)) ?? dates[0];
  const was = Object.fromEntries(ranks[base].map((pid, i) => [pid, i + 1]));
  return { base, move: (pid, rank) => (was[pid] ? was[pid] - rank : 'new') };
}
const moveTag = m => (m == null || m === 0 ? '' : m === 'new' ? '<span class="pr-mv new">NEW</span>' : `<span class="pr-mv ${m > 0 ? 'up' : 'down'}">${m > 0 ? '▲' : '▼'}${Math.abs(m)}</span>`);

async function renderProspects(body, params) {
  const { season, me, f, v } = await gmDynasty(params);
  if (route().page !== 'commish') return;
  const list = prospectRanking(v);
  const hist = await loadDynHistory();
  if (route().page !== 'commish') return;
  const { base, move } = prospectMoves(hist, list);
  const show = ['rostered', 'free', 'mine'].includes(params.get('show')) ? params.get('show') : 'all';
  const rows = list.map((p, i) => ({ p, rank: i + 1, m: move(p.pid, i + 1) }));
  const shown = rows.filter(({ p }) => show === 'all' || (show === 'rostered' ? p.owner : show === 'free' ? !p.owner : p.owner === me));
  const moved = rows.filter(r => typeof r.m === 'number' && r.m);
  const risers = [...moved].sort((a, b) => b.m - a.m).filter(r => r.m > 0).slice(0, 3);
  const fallers = [...moved].sort((a, b) => a.m - b.m).filter(r => r.m < 0).slice(0, 3);
  const link = s => `#/commish?${new URLSearchParams({ tab: 'prospects', ...(me === COMMISH ? {} : { team: me }), ...(s === 'all' ? {} : { show: s }) })}`;
  const mineCount = rows.filter(r => r.p.owner === me).length;
  // Grade changes, league-wide (dynasty-history.json grades: a line only when a grade moves).
  const glog = hist.grades ?? {};
  const rankOf = Object.fromEntries(rows.map(r => [r.p.pid, r.rank]));
  const gchanges = Object.entries(glog).flatMap(([pid, list]) => list.slice(1).map(([d, g], i) => ({ pid, d, from: list[i][1], to: g })))
    .filter(c => v.players[c.pid]).sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : (rankOf[a.pid] ?? 999) - (rankOf[b.pid] ?? 999)));
  const trackedSince = Object.values(glog).map(x => x[0]?.[0]).filter(Boolean).sort()[0];
  const gRow = c => {
    const p = v.players[c.pid];
    const up = GRADE_ORDER.indexOf(c.to) < GRADE_ORDER.indexOf(c.from);
    return `<li class="${p.owner === me ? 'cm-me' : ''}"><span>${rankOf[c.pid] ? `<span class="pr-chip">#${rankOf[c.pid]}</span> ` : ''}${esc(p.name)}<small>${esc(shortMd(c.d))} · ${p.owner ? esc(name(p.owner)) : 'Free agent'}${p.where === 'taxi' ? ' (taxi)' : ''}</small></span><span class="dy-grade-move"><span class="pg pg-${esc(c.from[0])}">${esc(c.from)}</span><span class="${up ? 'dy-up' : 'dy-down'}">${up ? '▲' : '▼'}</span><span class="pg pg-${esc(c.to[0])}">${esc(c.to)}</span></span></li>`;
  };
  const gradeCard = `
    <section class="card">
      <div class="card-head"><h2>Grade changes</h2><span class="card-sub">League-wide · newest first</span></div>
      ${gchanges.length ? `<ol class="aw-race">${gchanges.slice(0, 12).map(gRow).join('')}</ol>
        ${gchanges.length > 12 ? `<details class="cm-group"><summary>${gchanges.length - 12} more</summary><ol class="aw-race">${gchanges.slice(12).map(gRow).join('')}</ol></details>` : ''}`
        : '<p class="empty">No grade changes yet.</p>'}
      <p class="cm-rule">Every prospect’s grade is checked each night; a line appears only when the letter moves${trackedSince ? ` (tracked since ${esc(shortMd(trackedSince))})` : ' (tracking starts with the next nightly update)'}. #N = his place in the Top ${PROSPECT_LIST} now.</p>
    </section>`;
  body.innerHTML = `<div class="gm-page">
    ${gmTeamPick(me, season, 'prospects')}
    ${gradeCard}
    <section class="card">
      <div class="card-head"><h2>Top ${PROSPECT_LIST} prospects</h2><span class="card-sub">League-wide · ${esc(name(me))} has ${mineCount}</span></div>
      <div class="st-stage tf-filter dy-filter" role="group">${[['all', 'All'], ['rostered', 'On rosters'], ['free', 'Free agents'], ['mine', 'My team']].map(([id, l]) => `<a href="${link(id)}" class="${id === show ? 'on' : ''}">${l}</a>`).join('')}</div>
      ${base && (risers.length || fallers.length) ? `<p class="pr-movers">Since ${esc(shortMd(base))}: ${risers.length ? `<b class="dy-up">Up</b> ${risers.map(r => `${esc(r.p.name)} ${moveTag(r.m)}`).join(', ')}` : ''}${risers.length && fallers.length ? ' · ' : ''}${fallers.length ? `<b class="dy-down">Down</b> ${fallers.map(r => `${esc(r.p.name)} ${moveTag(r.m)}`).join(', ')}` : ''}</p>` : ''}
      ${shown.length ? `<ol class="aw-race pr-list">${shown.map(({ p, rank, m }) => `
        <li class="dy-row${p.owner === me ? ' cm-me' : ''}" data-pid="${esc(p.pid)}" tabindex="0" role="button" aria-expanded="false">
          <span class="pr-rank">${rank}</span>
          <span class="pr-main">${esc(p.name)} ${prospectChip(p)} ${moveTag(m)}
            <small>${esc([posText(p), p.team || 'No NBA team', p.age != null ? `age ${p.age}` : ''].filter(Boolean).join(' · '))} · ${p.owner ? esc(name(p.owner)) : '<b>Free agent</b>'}${p.where === 'taxi' ? ' (taxi)' : ''}</small>
            <small class="dy-chances">Star ${pctOf(p.prospect.star)} · Starter ${pctOf(p.prospect.starter)} · Rotation ${pctOf(p.prospect.rotation)}</small></span>
          <span class="dy-val">${scoreBar(p.score)}</span>
        </li>`).join('')}</ol>` : '<p class="empty">Nobody here.</p>'}
      <p class="cm-rule">Every player ${PROSPECT_MAX_AGE} and under, on a roster or not, ranked by prospect grade (A+ first), then within a grade by his chance of being a <b>star</b> (top 24) three seasons from now, then a <b>starter</b> (top 72), then a <b>rotation</b> player (top 120). It updates whenever Sleeper’s projections move the chances. ${base ? `▲/▼ = places moved since ${esc(shortMd(base))}; NEW = not in the top ${PROSPECT_LIST} then.` : 'Arrows start after the next nightly update saves today’s order.'} The bar is his dynasty score (value now and the next two seasons); tap a player for his score over time.</p>
    </section></div>`;
  bindTeamPick(body);
  bindScoreCharts(body, v);
}
// ---- Draft Scout (My GM, owner Oct 2026): the next 3 NBA draft classes, graded for this league ----
// data/draft-scout.json is built once a week (Sundays) by assets/scout.js in the nightly job; this tab
// only reads it. The team's own picks come from the dynasty values (class strength included).
const DS_POS = [['all', 'All'], ['G', 'Guards'], ['W', 'Wings'], ['B', 'Bigs']];
const DS_GROUP = { PG: 'G', SG: 'G', G: 'G', SF: 'W', F: 'W', W: 'W', PF: 'B', C: 'B' };
const dsGroup = p => DS_GROUP[String(p.pos ?? '').split(/[/ ,]/)[0].toUpperCase()] ?? 'W';
const feetIn = h => (h ? `${Math.floor(h / 12)}'${h % 12}"` : '');
const SRC_SHORT = { tankBoard: 'Tankathon', tankMock: 'Tankathon mock', cbs: 'CBS', hs: 'High school rank', fr: 'Recruit rank' };
// Scouting notes: [top-quarter wording, bottom-quarter wording] (scout.js TRAITS ids).
const TRAIT_WORDS = {
  size: ['Big for his position', 'Small for his position'], passing: ['Playmaker', 'Limited passer'], steals: ['Active hands (steals)', 'Few steals'],
  blocks: ['Rim protector', 'Few blocks'], touch: ['Shooting touch (FT%)', 'Shaky free throws'], range: ['Lots of threes', 'Rarely shoots threes'],
  efficiency: ['Efficient scorer', 'Inefficient scorer'], impact: ['High impact (BPM)', 'Low impact (BPM)'], youth: ['Young for the class', 'Old for the class'],
};
// Weekly projection history (draft-scout.json weeks: { date, p: { key: [year, rank, grade, starter %,
// star %, rotation %] } }), one point per week, oldest first.
const scoutSeries = (sc, key) => (sc.weeks ?? []).filter(h => h.p[key]).map(h => {
  const [year, rank, grade, starter, star, rotation] = h.p[key];
  return { d: h.date, year, rank, grade, starter, star, rotation };
});
// Starter-chance lines where the grade letter changes (the same tests as the grade; star chance can
// lift a grade too, so a point can sit a little under its letter's line).
const GRADE_LINES = [[85, 'A'], [70, 'A-'], [55, 'B+'], [40, 'B'], [25, 'B-'], [15, 'C+']];
function scoutChart(pts, hi) {
  const W = 380, H = 170, P = { l: 30, r: 34, t: 12, b: 24 };
  const day = d => new Date(`${d}T12:00:00`).getTime() / 864e5;
  const d0 = day(pts[0].d), d1 = Math.max(day(pts.at(-1).d), d0 + 1);
  const X = d => (pts.length < 2 ? (P.l + W - P.r) / 2 : P.l + (day(d) - d0) / (d1 - d0) * (W - P.l - P.r));
  const Y = v => H - P.b - v / hi * (H - P.t - P.b);
  const lines = GRADE_LINES.filter(([v]) => v < hi).map(([v, g]) => `<line class="sc-tier" x1="${P.l}" x2="${W - P.r}" y1="${Y(v)}" y2="${Y(v)}"/><text class="sc-tier-l" x="${W - P.r + 4}" y="${Y(v) + 3}">${g}</text>`).join('');
  const path = k => pts.map((x, i) => `${i ? 'L' : 'M'}${X(x.d).toFixed(1)},${Y(x[k]).toFixed(1)}`).join(' ');
  const info = x => `Week of ${shortMd(x.d)}: grade ${x.grade} · No. ${x.rank} in the ${x.year} class · Starter ${x.starter}% · Star ${x.star}% · Rotation ${x.rotation}%`;
  const dots = pts.map((x, i) => `<g class="sc-pt${i === pts.length - 1 ? ' now' : ''}" data-info="${esc(info(x))}"><title>${esc(info(x))}</title><circle cx="${X(x.d)}" cy="${Y(x.starter)}" r="12" class="sc-hit"/><circle cx="${X(x.d)}" cy="${Y(x.starter)}" r="${i === pts.length - 1 ? 5 : 3}"/></g>`).join('');
  // The letter above a point where the grade changed (and the first one).
  const letters = pts.map((x, i) => (i && pts[i - 1].grade === x.grade ? '' : `<text class="ds-ch-g" x="${X(x.d)}" y="${Math.max(10, Y(x.starter) - 9)}" text-anchor="middle">${esc(x.grade)}</text>`)).join('');
  const last = pts.at(-1);
  return `<svg class="sc-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Weekly projection">
    <text class="sc-ax" x="${P.l - 6}" y="${Y(hi) + 4}" text-anchor="end">${hi}%</text>
    <text class="sc-ax" x="${P.l - 6}" y="${Y(0) + 4}" text-anchor="end">0</text>
    <line class="sc-base" x1="${P.l}" x2="${W - P.r}" y1="${Y(0)}" y2="${Y(0)}"/>
    ${lines}
    ${pts.length > 1 ? `<path class="ds-ch-star" d="${path('star')}"/><path class="sc-line" d="${path('starter')}"/>` : `<circle class="ds-ch-stardot" cx="${X(last.d)}" cy="${Y(last.star)}" r="3"/>`}
    ${letters}${dots}
    <text class="sc-ax" x="${P.l}" y="${H - 6}">${pts.length > 1 ? shortMd(pts[0].d) : ''}</text>
    <text class="sc-ax" x="${pts.length > 1 ? W - P.r : X(last.d)}" y="${H - 6}" text-anchor="${pts.length > 1 ? 'end' : 'middle'}">${shortMd(last.d)}</text>
  </svg>`;
}
// One panel per NBA season (Aug-Jul): a 2029 prospect followed from now gets three. Same scale in
// every panel. Swipe on phones, arrows with a mouse (bindSeasonStrip).
function scoutSeasons(p, pts) {
  const bySeason = {};
  for (const x of pts) (bySeason[seasonOfDate(x.d)] ??= []).push(x);
  const seasons = Object.keys(bySeason).sort();
  const hi = Math.min(100, Math.max(20, Math.ceil(Math.max(...pts.map(x => Math.max(x.starter, x.star))) * 1.25 / 10) * 10));
  const moved = pts.some((x, i) => i && x.year !== pts[i - 1].year);
  const summary = list => {
    if (list.length < 2) return 'History starts this week; a point is added every Sunday.';
    const a = list[0], b = list.at(-1);
    return `${shortMd(a.d)} → ${shortMd(b.d)}: grade ${a.grade} → ${b.grade}, starter chance ${a.starter}% → ${b.starter}%, No. ${a.rank} → No. ${b.rank}.`;
  };
  return `
    <div class="sc-head"><b>${esc(p.name)}</b> · projection by week</div>
    <div class="sc-nav">
      <button type="button" class="sc-arrow sc-prev" aria-label="Previous season">‹</button>
      <span class="sc-label">${seasonSpan(seasons.at(-1))}</span>
      <button type="button" class="sc-arrow sc-next" aria-label="Next season">›</button>
    </div>
    <div class="sc-strip">${seasons.map(s => `
      <div class="sc-slide" data-season="${s}">
        ${scoutChart(bySeason[s], hi)}
        <p class="sc-info" aria-live="polite">${esc(`Week of ${shortMd(bySeason[s].at(-1).d)}: grade ${bySeason[s].at(-1).grade} · No. ${bySeason[s].at(-1).rank} · Starter ${bySeason[s].at(-1).starter}% · Star ${bySeason[s].at(-1).star}%`)}</p>
        <p class="cm-rule">${esc(summary(bySeason[s]))} Solid line = his chance of being a <b>starter</b> here in his 3rd NBA season, dashed = <b>star</b>; the letters on the right mark where the grade changes. Tap a dot for that week.${moved ? ' He has moved between draft classes (stayed in school or reclassified): the chart follows him.' : ''}</p>
      </div>`).join('')}</div>
    ${seasons.length > 1 ? `<div class="sc-dots">${seasons.map(s => `<i data-season="${s}"></i>`).join('')}<span class="sc-swipe">Swipe for other seasons</span></div>` : ''}`;
}
// Grade changes in one class, newest first: [{ key, d, from, to, name }].
function scoutGradeChanges(sc, cls) {
  const out = [];
  for (const p of cls.prospects) {
    const pts = scoutSeries(sc, p.key);
    for (let i = 1; i < pts.length; i++) if (pts[i].grade !== pts[i - 1].grade) out.push({ key: p.key, name: p.name, d: pts[i].d, from: pts[i - 1].grade, to: pts[i].grade, rank: p.rank });
  }
  return out.sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : a.rank - b.rank));
}

async function renderDraftScout(body, params) {
  const [{ season, me, v, f }, sc, nights] = await Promise.all([gmDynasty(params), loadScout(), loadDraftNights()]);
  if (route().page !== 'commish') return;
  if (!sc?.classes || !Object.keys(sc.classes).length) {
    body.innerHTML = `<div class="gm-page">${gmTeamPick(me, season, 'draftscout')}<section class="card"><div class="card-head"><h2>Draft Scout</h2></div>
      <p class="empty">The draft classes haven’t been built yet. They’re built by the update once a week (Sundays), and right away by the first update after this page was added: tap <b>Run nightly update</b> above, wait 5–10 minutes, then reload.</p></section></div>`;
    bindTeamPick(body);
    return;
  }
  const years = Object.keys(sc.classes).sort();
  const nightYears = Object.keys(nights).filter(y => !sc.classes[y]).sort();
  const year = [...nightYears, ...years].includes(params.get('year')) ? params.get('year') : years[0];
  const pos = DS_POS.some(([id]) => id === params.get('pos')) ? params.get('pos') : 'all';
  const night = nights[year] ?? null;
  const cls = sc.classes[year] ?? night;
  const link = (o = {}) => `#/commish?${new URLSearchParams(Object.entries({ tab: 'draftscout', ...(me === COMMISH ? {} : { team: me }), year, ...(pos === 'all' ? {} : { pos }), ...o }).filter(([, x]) => x))}`;
  // This league drafts the best fantasy rookies first: expected value (college class) or rank (high school).
  const leagueOrder = c => [...c.prospects].sort((a, b) => (c.kind === 'college' ? b.value - a.value || a.rank - b.rank : a.rank - b.rank));
  const teams = DATA.seasons.at(-1).teams.length || 8;
  const gradeChip = p => `<span class="pg pg-${esc(p.grade[0])}" title="Projected prospect grade">${esc(p.grade)}</span>`;
  const strengthText = c => {
    const pct = Math.round((c.strength - 1) * 100);
    return c.kind === 'hs' ? 'Too early to tell: valued as an average class' : pct >= 2 ? `${pct}% stronger than an average class` : pct <= -2 ? `${-pct}% weaker than an average class` : 'About an average class';
  };

  // Your picks in these drafts: where each one is likely to land and who is likely there.
  const mine = v.picks.filter(p => p.owner === me && sc.classes[p.season]).sort((a, b) => a.season - b.season || a.round - b.round || (a.slot ?? 99) - (b.slot ?? 99));
  const pickRow = p => {
    const c = sc.classes[p.season];
    const order = leagueOrder(c);
    const lo = (p.round - 1) * teams + (p.slot ?? 1), hi = (p.round - 1) * teams + (p.slot ?? teams);
    const around = p.slot ? order.slice(Math.max(0, lo - 2), lo + 1) : order.slice(lo - 1, hi);
    const diff = p.score - p.avgScore;
    return `<li><span>${esc(p.label)}${p.orig !== me ? ` <small class="ds-from">from ${esc(name(p.orig))}</small>` : ''}
        <small>${p.slot ? `League pick ${lo} overall` : `Picks ${lo}–${hi} overall (slot not set yet)`} · ${c.kind === 'hs' && p.round > 1 ? 'too early: the high school top 30 doesn’t reach this far yet' : `likely there: ${around.slice(0, 3).map(x => `<a href="${link({ year: p.season, pos: '', p: x.key })}" class="ds-jump" data-year="${esc(p.season)}" data-key="${esc(x.key)}">${esc(x.name)}</a> ${gradeChip(x)}`).join(', ') || '—'}`}</small>
        ${diff ? `<small>Class strength ${diff > 0 ? '+' : ''}${diff} on the dynasty score (${esc(strengthText(c).toLowerCase())})</small>` : ''}</span>
      <span class="dy-val" title="Dynasty score of this pick">${scoreBar(p.score)}</span></li>`;
  };
  const picksCard = `
    <section class="card">
      <div class="card-head"><h2>${me === COMMISH ? 'Your' : `${esc(name(me))}’s`} picks</h2><span class="card-sub">Next ${years.length} drafts</span></div>
      ${mine.length ? `<ol class="aw-race ds-picks">${mine.map(pickRow).join('')}</ol>` : '<p class="empty">No rookie picks in these drafts.</p>'}
      <p class="cm-rule">“Likely there” = the prospects this league would usually take at that spot: everyone in the class ordered by expected fantasy value (the grade below), best first. Next year’s slots follow the projected draft order (Draft Kit → Future drafts); later years show the whole round.</p>
    </section>`;

  // Class outlook.
  const counts = ['A', 'B', 'C', 'D', 'F'].map(g => [g, cls.prospects.filter(p => p.grade[0] === g).length]).filter(([, n]) => n);
  const srcs = (sc.sources ?? []).filter(s => cls.kind === 'hs' ? (s.id === `hs${year}` || (s.id === 'freshmen' && cls.holdovers?.length)) : s.year === Number(year) && s.id !== 'torvik');
  const torvik = (sc.sources ?? []).find(s => s.id === 'torvik');
  const outlook = `
    <section class="card">
      <div class="card-head"><h2>${year} class outlook</h2><span class="card-sub">${cls.kind === 'hs' ? `Early look · high school class of ${cls.hsClass}${cls.holdovers?.length ? ` + ${cls.holdovers.length} college freshm${cls.holdovers.length === 1 ? 'an' : 'en'} waiting a year` : ''}` : `${cls.prospects.length} prospects · draft in June ${year}`}</span></div>
      <div class="ds-outlook">
        <div><b class="ds-big">${esc(strengthText(cls))}</b>
          <small>${cls.kind === 'hs'
            ? 'High school rankings say who’s best, not how good a whole class is.'
            : `${cls.statsTop24} of the top 24 have college numbers so far. Classes 2011–2023 only differed by about ±2% on what can be seen before the draft, so this moves pick values a little at most.`}</small></div>
        <div class="ds-grades">${counts.map(([g, n]) => `<span><span class="pg pg-${g}">${g}</span> ${n}</span>`).join('')}</div>
      </div>
      <p class="cm-rule">Sources: ${srcs.map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>${s.updated ? ` (updated ${esc(shortMd(s.updated.slice(0, 10)))})` : ''}${s.ok ? '' : ` <b class="dy-down">(couldn’t be read this week: copy from ${s.read ? esc(shortMd(s.read)) : 'earlier'})</b>`}`).join(' · ') || 'none'}${cls.kind === 'college' ? ` · college stats: ${torvik?.ok ? '<a href="https://barttorvik.com/" target="_blank" rel="noopener">Bart Torvik</a>' : 'Tankathon (Bart Torvik turned the update away this week)'}` : ''}. Built ${esc(shortMd(sc.built))}; rebuilt every Sunday.</p>
    </section>`;
  // Grade changes, week to week (weekly history).
  const changes = scoutGradeChanges(sc, cls);
  const tracked = sc.weeks?.[0]?.date;
  const chRow = c => {
    const up = GRADE_ORDER.indexOf(c.to) < GRADE_ORDER.indexOf(c.from);
    return `<li><span><a href="${link({ p: c.key, pos: '' })}" class="ds-jump" data-year="${esc(year)}" data-key="${esc(c.key)}">${esc(c.name)}</a><small>Week of ${esc(shortMd(c.d))} · now No. ${c.rank}</small></span><span class="dy-grade-move"><span class="pg pg-${esc(c.from[0])}">${esc(c.from)}</span><span class="${up ? 'dy-up' : 'dy-down'}">${up ? '▲' : '▼'}</span><span class="pg pg-${esc(c.to[0])}">${esc(c.to)}</span></span></li>`;
  };
  const changesCard = `
    <section class="card">
      <div class="card-head"><h2>Grade changes</h2><span class="card-sub">${year} class · week to week</span></div>
      ${changes.length ? `<ol class="aw-race">${changes.slice(0, 10).map(chRow).join('')}</ol>
        ${changes.length > 10 ? `<details class="cm-group"><summary>${changes.length - 10} more</summary><ol class="aw-race">${changes.slice(10).map(chRow).join('')}</ol></details>` : ''}`
        : `<p class="empty">No grade changes yet${(sc.weeks?.length ?? 0) < 2 ? ': tracking started the week of ' + esc(shortMd(tracked ?? sc.built)) + ', and changes show from next Sunday on' : ''}.</p>`}
      <p class="cm-rule">Every prospect’s grade, rank and chances are saved each Sunday. Tap a prospect below for his chart by week.</p>
    </section>`;

  // The board.
  const shown = cls.prospects.filter(p => pos === 'all' || dsGroup(p) === pos);
  const leagueSlot = Object.fromEntries(leagueOrder(cls).map((p, i) => [p.key, i + 1]));
  const statLine = s => {
    const when = s.from === 'tank' ? 'College numbers (Tankathon)' : night && s.from === 'this' ? `Final college season (${year - 1}–${String(year).slice(2)})` : s.from === 'this' ? 'This season' : `Last season (${s.season - 1}–${String(s.season).slice(2)})`;
    const bits = [s.gp != null ? `${s.gp} games` : '', s.mpg != null ? `${num(s.mpg)} min` : '', s.ppg != null ? `${num(s.ppg)} pts` : '', s.rpg != null ? `${num(s.rpg)} reb` : '', s.apg != null ? `${num(s.apg)} ast` : '',
      s.spg != null ? `${num(s.spg)} stl` : '', s.bpg != null ? `${num(s.bpg)} blk` : '', s.ts != null ? `${Math.round(s.ts)}% TS` : '', s.tpa ? `${Math.round((s.tpp ?? 0) * 100)}% from 3 (${s.tpa} att.)` : '', s.ftp != null ? `${Math.round(s.ftp * 100)}% FT` : '', s.usg != null && s.from === 'tank' ? `${num(s.usg)}% usage` : '', s.bpm != null ? `BPM ${num(s.bpm)}` : ''].filter(Boolean);
    return `<p class="ds-stats"><b>${when}${s.from === 'tank' ? '' : ` at ${esc(s.team)}`}:</b> ${bits.join(' · ')}${s.role ? ` · plays as a <i>${esc(s.role)}</i>` : ''}</p>`;
  };
  const traitChips = p => {
    const good = p.traits.filter(t => t.pct >= 75), bad = p.traits.filter(t => t.pct <= 25);
    if (!good.length && !bad.length) return '';
    return `<p class="ds-traits">${good.map(t => `<span class="ds-t good" title="${t.pct}th percentile among recent first-round picks">${esc(TRAIT_WORDS[t.id]?.[0] ?? t.label)}</span>`).join('')}${bad.map(t => `<span class="ds-t bad" title="${t.pct}th percentile among recent first-round picks">${esc(TRAIT_WORDS[t.id]?.[1] ?? t.label)}</span>`).join('')}</p>`;
  };
  const gradeWhy = p => {
    if (cls.kind === 'hs') {
      const rr = p.recruitRank ?? p.rank;
      if (p.holdover) return `<p class="ds-why"><b>Waiting a year:</b> No. ${rr} in the class of ${p.holdover.hsClass} (${esc(p.holdover.from ?? 'recruiting rankings')}), now in college, but on no ${years[0]} big board or mock, so he’s too young for that draft (reclassified players must wait) or expected to stay in school. Projected for ${year}. Graded from his recruiting rank like the high school seniors; his college numbers count once big boards for ${year} appear.</p>`;
      return `<p class="ds-why">No. ${rr} in the high school class of ${cls.hsClass} (${esc(p.ranks?.hs != null ? (sc.raw?.[`hs${year}`]?.from ?? 'composite') : 'composite')} ranking)${p.rating ? ` (rating ${p.rating})` : ''}. Graded from how recruits ranked around him turned out in their 3rd season after high school${rr > 10 ? ' (most recruits ranked this low stay in college longer, which keeps the grade low; if he stays, he moves to a later class)' : ''}.</p>`;
    }
    const move = p.rank - p.effPick;
    const w = p.weight ?? (p.stats?.gp >= 12 ? 1 : p.stats ? 0.5 : 0);
    const shownBy = w >= 0.99 ? 'his college numbers and age' : w > 0 ? 'his age and his first college games' : 'his age (no college numbers yet)';
    return `<p class="ds-why">Consensus No. ${p.rank}${p.range[0] !== p.range[1] ? ` (sources: ${Object.entries(p.ranks).map(([id, r]) => `${esc(SRC_SHORT[id] ?? id)} ${r}`).join(', ')})` : ''}. ${Math.abs(move) >= 1 ? `By ${shownBy} he projects like a typical No. ${Math.round(p.effPick)} pick (${move > 0 ? 'better' : 'worse'} than his slot).` : `By ${shownBy} he projects right at his slot.`} Expected in year 3: about ${num(p.fpg)} fantasy points a game.</p>`;
  };
  const compList = p => {
    if (!p.comps.length) return `<p class="ds-comps-none">${cls.kind === 'hs' ? 'Comps come once he has college numbers.' : p.intl || !p.stats ? 'Comps come once he has college numbers (international players: none, the comps are built from college stats).' : 'Not enough games for comps yet.'}</p>`;
    return `<div class="ds-comps"><b>Player comps</b><ol>${p.comps.map(c => `<li><span>${esc(c.name)} <small>${c.D} No. ${c.pk} · ${esc(c.school)}</small></span><span class="ds-comp-out"><span class="ds-tier ds-tier-${esc(c.tier.split(' ')[0].toLowerCase())}">${esc(c.tier)}</span>${c.best != null ? `<small>best ${num(c.best)} FP/G (${c.bestSeason}–${String(c.bestSeason + 1).slice(2)})</small>` : ''}<small>${c.sim}% similar</small></span></li>`).join('')}</ol></div>`;
  };
  const row = p => `
    <li id="ds-${esc(p.key)}">
      <details class="ds-row">
        <summary>
          <span class="pr-rank">${p.rank}</span>
          <span class="pr-main">${esc(p.name)} ${gradeChip(p)} ${moveTag(p.move)}${p.holdover ? ' <span class="ds-hold" title="In college now, on no ' + years[0] + ' board: projected for ' + year + '">Waiting a year</span>' : ''}
            <small>${esc([p.pos, p.school, p.cls, p.age != null ? `age ${p.age}` : '', feetIn(p.ht)].filter(Boolean).join(' · '))}</small>
            <small class="dy-chances">Star ${pctOf(p.chances.star)} · Starter ${pctOf(p.chances.starter)} · Rotation ${pctOf(p.chances.rotation)}</small></span>
          <span class="ds-lg" title="Where this league would usually take him">${leagueSlot[p.key] <= teams * 3 ? `League<br><b>~${leagueSlot[p.key]}</b>` : ''}</span>
        </summary>
        <div class="ds-body">${gradeWhy(p)}${p.stats ? statLine(p.stats) : ''}${traitChips(p)}${compList(p)}<div class="ds-chart" data-key="${esc(p.key)}"></div></div>
      </details>
    </li>`;
  const board = night ? '' : `
    <section class="card">
      <div class="card-head"><h2>${year} prospects</h2><span class="card-sub">${cls.kind === 'hs' ? '247Sports top 30' : 'Consensus of the sources'}${cls.since ? ` · ▲▼ since ${esc(shortMd(cls.since))}` : ''}</span></div>
      <div class="st-stage tf-filter dy-filter" role="group">${DS_POS.map(([id, l]) => `<a href="${link({ pos: id === 'all' ? '' : id })}" class="${id === pos ? 'on' : ''}">${l}</a>`).join('')}</div>
      ${shown.length ? `<ol class="aw-race pr-list ds-list">${shown.map(row).join('')}</ol>` : '<p class="empty">Nobody here.</p>'}
      <p class="cm-rule">Tap a prospect for why he grades where he does, his college numbers, what translates and his player comps. “League ~N” = where this league would usually take him (24 picks a year).</p>
    </section>`;

  const finePrint = `
    <section class="card ds-fine">
      <div class="card-head"><h2>How Draft Scout works</h2></div>
      <p><b>The grade</b> is the same A+ to F as the Prospect grade on the Dynasty tab, so a draft prospect lines up with young players already in the league. It comes from his chances in his <b>3rd NBA season</b> of being a <b>rotation</b> player (top 120 in fantasy points per game with this league’s scoring, 20+ games), a <b>starter</b> (top 72) or a <b>star</b> (top 24).</p>
      <p><b>Where the chances come from.</b> ${num(sc.poolSize ?? 0)}+ drafted college players from the 2011–2023 drafts were matched to their real NBA results on Sleeper. The strongest signal by far is where a player is drafted: a No. 1 pick became a weekly starter by year 3 about 65% of the time, a No. 10 about 21%, a No. 30 about 4%. Before the draft, the slot is the consensus of the big boards and mocks (each source counts less once it’s more than 2 months old), and the chances allow for the board being wrong. A ranking in October misses by more than one in June, and players the sources disagree on get a wider range.</p>
      <p><b>What college numbers add.</b> Each class was predicted from the others to see which numbers help beyond the draft slot. Three did: <b>Box Plus-Minus</b> (overall impact), <b>assist rate</b> (passing creates fantasy points) and <b>age</b> (younger is better). Together they move a prospect’s slot a few spots either way (“projects like a typical No. 8”). Size for his position, steals, blocks, shooting, usage and recruiting rank added nothing measurable once the slot was known (scouts already price them in), so they appear as scouting notes (green = top quarter of recent first-round picks, red = bottom quarter) but don’t change the grade. Numbers count fully after 12 college games; before that, unknown numbers count as typical for his slot. Freshmen’s numbers start showing once they play (early November).</p>
      <p><b>Player comps</b> are the 3 drafted college players since 2011, with NBA careers, whose college profiles are closest: height, assists, steals, blocks, rebounds and points per 36 minutes, shooting efficiency, usage, BPM, three-point volume and free throws (when Torvik can be read), age and draft range, always within his position group (guard, wing or big). Each shows how that player turned out in this league’s scoring (best season). International and high school players get comps once they have college numbers.</p>
      <p><b>The ${years.length > 1 ? `${years[1]} and ${years[2] ?? years[1]}` : 'later'} classes</b> are early looks: the composite high school rankings (247Sports, or On3’s industry ranking when 247Sports can’t be read), top 30, graded from how recruits at each rank turned out (1,950 top-150 recruits, 2011–2023). College players who stay in school join those classes once big boards for that year appear (after the ${years[0]} draft).</p>
      <p><b>Class strength and pick values.</b> Rookie pick values (Dynasty, Trade finder, Managers) now include how strong the class looks: the 24 best expected values, which is what this league drafts each year, compared with an average class. Honest limit: across 2011–2023, what could be seen before the draft separated strong and weak classes by only about ±2%, so this moves a pick’s value a little, never a lot. How the class actually turns out varied more (about ±12%), but nobody can see that ahead of time.</p>
      <p><b>How well it works.</b> Trained on the 2011–2018 drafts and checked on 2019–2023: players given about a 46% chance of becoming a starter did 35% of the time, about 18% did 13%, about 4% did 2%. That’s close, but slightly optimistic for the middle of the first round in recent classes. Treat a grade as a starting point, not a verdict: injuries, team fit and development aren’t in any of the data.</p>
      <p><b>Players waiting a year.</b> Some top recruits are already in college but can’t or won’t enter the next draft: reclassified players who are too young (like Joaquim Boumtje-Boumtje, a Duke freshman who must play two seasons) or freshmen expected to stay. Every week the update checks last year’s top 25 recruits (now college freshmen; On3’s industry ranking first, since it ranks reclassified players by their original class) against every ${years[0]} big board and mock. Anyone on none of them is moved to the ${years[1] ?? 'next'} class, marked “Waiting a year”. Once big boards for that year appear (after the ${years[0]} draft), they take over.</p>
      <p><b>Week-to-week tracking.</b> Every Sunday each prospect’s grade, rank and chances are saved. “Grade changes” lists every letter that moved, and each prospect’s chart shows his projection week by week, one panel per season (a 2029 prospect followed from now gets a chart for each year until his draft). If he moves to another class (stays in school longer), his chart follows him.</p>
      <p><b>Updates.</b> Rebuilt every Sunday by the nightly update: rankings, college stats and comps refresh on their own. A source that can’t be read keeps its last good copy and is marked above (the update tries once more on Monday). Bart Torvik’s college stats and the high school rankings sometimes turn GitHub’s servers away; then Tankathon’s college numbers are used (per 36 minutes, true shooting, usage, BPM; assist rate estimated from assists per 36), and the high school lists keep their last copy. Sources are read once a week as a labeled bot; sites that block bots aren’t used. Sources: Tankathon, CBS Sports, 247Sports, On3, Bart Torvik (barttorvik.com), Sleeper.</p>
    </section>`;

  // Draft night (owner, Oct 2026): a finished class as graded on draft night (never changes), next to
  // how each player is doing now (today's dynasty values) and the live board's next class.
  let nightCards = '';
  if (night) {
    const scoring = f.league?.scoring_settings ?? {};
    const rows = await get(`/stats/nba/${season}?season_type=regular`, []);
    if (route().page !== 'commish') return;
    const fp = st => Object.entries(scoring).reduce((a, [k, w]) => a + (Number(st?.[k]) || 0) * w, 0);
    const games = Object.fromEntries((rows ?? []).filter(x => x.stats?.gp).map(x => [x.player_id, { gp: x.stats.gp, fpg: fp(x.stats) / x.stats.gp }]));
    // Today: his prospect grade (24 and under) or the veteran chances, graded with the same letters.
    const now = Object.fromEntries(night.prospects.map(p => {
      const d = p.sid ? v.players[p.sid] ?? null : null;
      const q = d?.prospect ?? d?.chances ?? null;
      return [p.key, { d, q, grade: d?.prospect?.grade ?? (q ? gradeOf(q) : null), g: games[p.sid] ?? null }];
    }));
    const pgChip = (g, title) => `<span class="pg pg-${esc(g[0])}" title="${esc(title)}">${esc(g)}</span>`;
    const ownerText = d => (d?.owner ? `${teamName(d.owner, season)}${d.where === 'taxi' ? ' (taxi)' : d.where === 'ir' ? ' (IR)' : ''}` : 'Free agent');
    const yy = y => `${y}–${String(Number(y) + 1).slice(2)}`;
    const maxGp = Math.max(0, ...night.prospects.map(p => now[p.key].g?.gp ?? 0));

    // Then vs now: the top 5 picks on draft night next to the top 5 on the live board.
    const next = sc.classes[years[0]];
    const side = p => (p ? `<span><b>${esc(p.name)}</b> ${gradeChip(p)}<small>Starter ${pctOf(p.chances.starter)} · Star ${pctOf(p.chances.star)}</small></span>` : '<span></span>');
    const cmpRows = Array.from({ length: 5 }, (_, i) => `<li><span class="pr-rank">${i + 1}</span>${side(night.prospects[i])}${side(next?.prospects[i])}</li>`).join('');
    // How the draft-night grades are holding up (early: one preseason + a few games).
    const both = night.prospects.filter(p => now[p.key].grade);
    const at = g => GRADE_ORDER.indexOf(g);
    const higher = both.filter(p => at(now[p.key].grade) < at(p.grade)), lower = both.filter(p => at(now[p.key].grade) > at(p.grade));
    const moved = both.map(p => ({ p, d: now[p.key].q.starter - p.chances.starter })).sort((a, b) => b.d - a.d);
    const jump = p => `<a href="${link({ p: p.key, pos: '' })}" class="ds-jump" data-year="${esc(year)}" data-key="${esc(p.key)}">${esc(p.name)}</a> (${esc(p.grade)} → ${esc(now[p.key].grade)})`;
    const ups = moved.filter(x => higher.includes(x.p)).slice(0, 3).map(x => jump(x.p)), downs = moved.filter(x => lower.includes(x.p)).slice(-3).reverse().map(x => jump(x.p));
    const no1 = night.prospects[0], n1 = now[no1.key];
    const compare = `
      <section class="card">
        <div class="card-head"><h2>Then vs now</h2><span class="card-sub">${year} on draft night · ${years[0]} board today</span></div>
        <ol class="aw-race dn-cmp"><li class="dn-cmp-head"><span class="pr-rank">No.</span><span>${year} draft night</span><span>${years[0]} today</span></li>${cmpRows}</ol>
        <p class="cm-rule">On draft night ${esc(no1.name)} went No. 1 graded ${esc(no1.grade)} (starter ${pctOf(no1.chances.starter)}, star ${pctOf(no1.chances.star)}); the ${years[0]} No. 1${next?.prospects[0] ? `, ${esc(next.prospects[0].name)}, is ${esc(next.prospects[0].grade)} today (starter ${pctOf(next.prospects[0].chances.starter)}, star ${pctOf(next.prospects[0].chances.star)})` : ' isn’t known yet'}. A board ${next?.months != null ? `${Math.max(0, Math.round(next.months))} months` : 'months'} before the draft can still be wrong about who goes where, so its chances are spread wider; on draft night the slot is known.${n1.grade ? ` Today ${esc(no1.name)} grades ${esc(n1.grade)} in this league.` : ''}</p>
        <p class="cm-rule"><b>How the draft-night grades are holding up:</b> of the ${both.length} player${both.length === 1 ? '' : 's'} with a grade today${both.length < night.prospects.length ? ` (${night.prospects.length - both.length} have no Sleeper season projection right now, so no grade)` : ''}, ${higher.length} grade higher, ${both.length - higher.length - lower.length} the same and ${lower.length} lower.${ups.length ? ` Biggest risers: ${ups.join(', ')}.` : ''}${downs.length ? ` Biggest drops: ${downs.join(', ')}.` : ''} Early read only: today’s grades come mostly from Sleeper’s season projections (${maxGp ? `${maxGp} NBA game${maxGp === 1 ? '' : 's'} at most so far` : 'no NBA games yet'}); the real test is their 3rd season (${yy(Number(year) + 2)}).</p>
      </section>`;

    const nightWhy = p => {
      const move = p.rank - p.effPick;
      const shownBy = p.intl || !p.stats ? 'his age (no college numbers: international)' : p.weight >= 0.99 ? 'his college numbers and age' : 'his age and his few college games';
      return `<p class="ds-why">Picked No. ${p.pick}${p.nba ? ` by ${esc(p.nba)}` : ''}. ${Math.abs(move) >= 1 ? `By ${shownBy} he projected like a typical No. ${Math.round(p.effPick)} pick (${move > 0 ? 'better' : 'worse'} than his slot).` : `By ${shownBy} he projected right at his slot.`} Expected in year 3: about ${num(p.fpg)} fantasy points a game.</p>`;
    };
    const nowBlock = p => {
      const { d, q, grade, g } = now[p.key];
      if (!d) return '<div class="dn-now"><b>How he’s doing now</b><p>Not in Sleeper’s projections or on a roster in this league yet.</p></div>';
      const ch = k => `${pctOf(p.chances[k])} → ${q ? pctOf(q[k]) : '–'}`;
      return `<div class="dn-now"><b>How he’s doing now</b>
        <p>${pgChip(p.grade, 'Draft-night grade')} on draft night → ${grade ? `${pgChip(grade, 'Grade today')} today` : 'no grade today: Sleeper has no season projection for him right now, so his dynasty score is 0 until it does'}</p>
        ${q ? `<p class="dy-chances">Starter ${ch('starter')} · Star ${ch('star')} · Rotation ${ch('rotation')}</p>` : ''}
        <p>Dynasty score <b>${d.score}</b> ${tierTag(d.score)} · ${g ? `${g.gp} NBA game${g.gp === 1 ? '' : 's'}, ${num(g.fpg)} fantasy pts a game` : 'no NBA games yet'}${d.projUsed != null ? ` · Sleeper projects ${num(d.projUsed)} a game` : ''}</p>
        <p>${d.owner ? `On <b>${esc(ownerText(d))}</b>` : '<b>Free agent</b> in this league'} · NBA: ${esc(d.team || 'no team')}</p></div>`;
    };
    const nightRow = p => {
      const n = now[p.key];
      return `
      <li id="ds-${esc(p.key)}">
        <details class="ds-row">
          <summary>
            <span class="pr-rank">${p.pick}</span>
            <span class="pr-main">${esc(p.name)} ${gradeChip(p)}${n.grade ? ` <span class="dn-to" aria-label="today">→</span> ${pgChip(n.grade, 'Grade today')}` : ''}
              <small>${esc([p.nba, p.pos, p.school, p.cls, p.age != null ? `age ${p.age}` : '', feetIn(p.ht)].filter(Boolean).join(' · '))}</small>
              <small class="dy-chances">Draft night: Star ${pctOf(p.chances.star)} · Starter ${pctOf(p.chances.starter)} · Rotation ${pctOf(p.chances.rotation)}</small>
              <small class="dn-own">Now: ${esc(ownerText(n.d))}</small></span>
            <span class="ds-lg" title="Dynasty score today">${n.d ? `Score<br><b>${n.d.score}</b>` : ''}</span>
          </summary>
          <div class="ds-body">${nightWhy(p)}${p.stats ? statLine(p.stats) : ''}${traitChips(p)}${compList(p)}${nowBlock(p)}</div>
        </details>
      </li>`;
    };
    nightCards = `
      <section class="card">
        <div class="card-head"><h2>${year} draft night</h2><span class="card-sub">Frozen snapshot · graded as of June 25, ${year}</span></div>
        <div class="ds-outlook">
          <div><b class="ds-big">${esc(strengthText(cls))}</b>
            <small>Graded the way Draft Scout grades the live board, as if on draft night: slot = his real pick, his final college season, nothing left to guess about where he goes. This snapshot never changes; only the “now” parts update.</small></div>
          <div class="ds-grades">${counts.map(([g, n]) => `<span><span class="pg pg-${g}">${g}</span> ${n}</span>`).join('')}</div>
        </div>
      </section>
      ${compare}
      <section class="card">
        <div class="card-head"><h2>${year} draft</h2><span class="card-sub">Real picks 1–${night.prospects.length} · grade on draft night → today</span></div>
        <div class="st-stage tf-filter dy-filter" role="group">${DS_POS.map(([id, l]) => `<a href="${link({ pos: id === 'all' ? '' : id })}" class="${id === pos ? 'on' : ''}">${l}</a>`).join('')}</div>
        ${shown.length ? `<ol class="aw-race pr-list ds-list">${shown.map(nightRow).join('')}</ol>` : '<p class="empty">Nobody here.</p>'}
        <p class="cm-rule">First letter = his grade on draft night, the second = his grade in this league today (Dynasty tab). “Score” = his dynasty score today. Tap a player for why he graded where he did, his last college season, what translates, his comps and how he’s doing now.</p>
      </section>
      <section class="card ds-fine">
        <div class="card-head"><h2>How the draft-night view works</h2></div>
        <p><b>Draft night.</b> The same model as the live board, run once with what was known on draft night: his <b>real pick</b> as the slot (one source, so no disagreement and no months of guessing: the narrowest spread the model uses), his <b>final college season</b> (Bart Torvik; international players have no college numbers, same as on the live board), his age at the draft, the same scouting notes, and comps only from the ${night.poolSize}+ drafted players before ${year}, with NBA results through ${yy(Number(year) - 1)}. Built ${esc(shortMd(night.built))}; it never changes.</p>
        <p><b>Now.</b> Today’s grade is the Prospect grade from the Dynasty tab (players 24 and under; older players get the same letters from the veteran chances). It comes from Sleeper’s season projection for him, so early in his first season it says more about how the NBA sees him than how he has played. Fantasy points a game = his NBA games this season with this league’s scoring. Both update every time the page opens.</p>
        <p><b>Then vs now</b> lines up the top 5 picks on draft night with the top 5 on the ${years[0]} board today. The ${years[0]} board is still ${next?.months != null ? `${Math.max(0, Math.round(next.months))} months` : 'months'} away from its draft, so its chances are spread wider (where a player goes can still change); that alone keeps its top grades a little lower than a No. 1 pick’s on draft night.</p>
      </section>`;
  }

  const chipYears = [...nightYears, ...years];
  body.innerHTML = `<div class="gm-page">
    ${gmTeamPick(me, season, 'draftscout')}
    <div class="st-stage ds-years" role="tablist" style="grid-template-columns: repeat(${chipYears.length}, 1fr)">${chipYears.map(y => `<a role="tab" href="${link({ year: y, pos: '' })}" class="${y === year ? 'on' : ''}">${y}${nights[y] && !sc.classes[y] ? ' <small>draft night</small>' : sc.classes[y].kind === 'hs' ? ' <small>early</small>' : ''}</a>`).join('')}</div>
    ${night ? nightCards : `${picksCard}${outlook}${changesCard}${board}${finePrint}`}</div>`;
  bindTeamPick(body);
  // His weekly chart, drawn the first time his row opens (the strip needs its width).
  body.querySelectorAll('.ds-row').forEach(d => d.addEventListener('toggle', () => {
    const box = $('.ds-chart', d);
    if (!d.open || !box || box.dataset.done) return;
    box.dataset.done = '1';
    const p = cls.prospects.find(x => x.key === box.dataset.key);
    const pts = scoutSeries(sc, box.dataset.key);
    if (!p || !pts.length) { box.innerHTML = '<p class="cm-rule">His weekly chart starts with the next Sunday update.</p>'; return; }
    box.innerHTML = scoutSeasons(p, pts);
    bindSeasonStrip(box);
    box.querySelectorAll('.sc-pt').forEach(g => g.addEventListener('click', e => {
      e.stopPropagation();
      const slide = g.closest('.sc-slide');
      slide.querySelectorAll('.sc-pt.sel').forEach(x => x.classList.remove('sel'));
      g.classList.add('sel');
      $('.sc-info', slide).textContent = g.dataset.info;
    }));
  }));
  // Links to a prospect (#ds-key): open and scroll to his row.
  const open = k => { const li = document.getElementById(`ds-${k}`); if (!li) return; $('details', li).open = true; li.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
  body.querySelectorAll('.ds-jump').forEach(a => a.addEventListener('click', e => {
    if (a.dataset.year === year && pos === 'all') { e.preventDefault(); open(a.dataset.key); }
  }));
  if (params.get('p')) open(params.get('p'));
}

function bindScoreCharts(body, v) {
  const toggle = async li => {
    const next = li.nextElementSibling;
    if (next?.classList.contains('sc-row')) { next.remove(); li.setAttribute('aria-expanded', 'false'); return; }
    const p = v.players[li.dataset.pid];
    if (!p) return;
    const row = document.createElement('li');
    row.className = 'sc-row';
    row.innerHTML = '<div class="sc-box"><p class="cm-rule">Loading history…</p></div>';
    li.after(row);
    li.setAttribute('aria-expanded', 'true');
    const full = Boolean(gmLoad('gm-dyn-full', false));
    const pts = scoreSeries(await loadDynHistory(), p, full, v);
    const box = $('.sc-box', row);
    box.innerHTML = scoreSeasons(p, pts, full);
    bindSeasonStrip(box);
    // Tap (or click) a dot: that day's projection and what moved the score, under the chart.
    box.querySelectorAll('.sc-pt').forEach(g => g.addEventListener('click', e => {
      e.stopPropagation();
      const slide = g.closest('.sc-slide');
      slide.querySelectorAll('.sc-pt.sel').forEach(x => x.classList.remove('sel'));
      g.classList.add('sel');
      $('.sc-info', slide).textContent = g.dataset.info;
    }));
  };
  body.querySelectorAll('.dy-row').forEach(li => {
    li.addEventListener('click', () => toggle(li));
    li.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(li); } });
  });
}

// League map: every team's strength now (x) vs in 2 years (y), lines at the league average.
function dynastyMap(v, me, season) {
  const list = Object.values(v.outlook);
  const W = 440, H = 320, P = { l: 30, r: 12, t: 20, b: 34 };
  const xs = list.map(t => t.now), ys = list.map(t => t.later);
  const pad = (lo, hi) => [lo - (hi - lo) * 0.12, hi + (hi - lo) * 0.12];
  const [x0, x1] = pad(Math.min(...xs), Math.max(...xs));
  const [y0, y1] = pad(Math.min(...ys), Math.max(...ys));
  const X = x => P.l + (x - x0) / (x1 - x0) * (W - P.l - P.r);
  const Y = y => H - P.b - (y - y0) / (y1 - y0) * (H - P.t - P.b);
  const ax = xs.reduce((a, b) => a + b, 0) / xs.length, ay = ys.reduce((a, b) => a + b, 0) / ys.length;
  // Labels: right of the dot (left near the right edge), nudged down or up when two would overlap.
  // Every dot is an obstacle too.
  const placed = list.map(t => ({ x0: X(t.now) - 8, x1: X(t.now) + 8, y: Y(t.later) + 4 }));
  const labelW = s => s.length * 7.4;
  const dots = [...list].sort((a, b) => Y(a.later) - Y(b.later)).map(t => {
    const x = X(t.now), y = Y(t.later), label = name(t.owner);
    const right = x + 10 + labelW(label) < W - 2;
    const box = ly => ({ x0: right ? x + 10 : x - 10 - labelW(label), x1: right ? x + 10 + labelW(label) : x - 10, y: ly });
    let ly = y + 5;
    for (const step of [0, 15, -15, 30, -30]) {
      const b = box(y + 5 + step);
      if (!placed.some(p => Math.abs(p.y - b.y) < 14 && b.x0 < p.x1 && p.x0 < b.x1)) { ly = b.y; break; }
    }
    placed.push(box(ly));
    return `<g class="dy-dot${t.owner === me ? ' me' : ''}" tabindex="0">
      <title>${esc(label)}: ${esc(t.label)}. Now ${num(t.now)} (No. ${t.nowRank}), in 2 years ${num(t.later)} (No. ${t.laterRank})</title>
      <circle cx="${x}" cy="${y}" r="14" class="dy-hit"/><circle cx="${x}" cy="${y}" r="6"/>
      <text x="${right ? x + 10 : x - 10}" y="${ly}" text-anchor="${right ? 'start' : 'end'}">${esc(label)}</text></g>`;
  }).join('');
  return `<svg class="dy-map" viewBox="0 0 ${W} ${H}" role="img" aria-label="Team strength now versus in two years">
    <line class="dy-avg" x1="${X(ax)}" x2="${X(ax)}" y1="${P.t}" y2="${H - P.b}"/><line class="dy-avg" x1="${P.l}" x2="${W - P.r}" y1="${Y(ay)}" y2="${Y(ay)}"/>
    <text class="dy-q" x="${W - P.r - 4}" y="${P.t + 12}" text-anchor="end">Strong now and later</text>
    <text class="dy-q" x="${P.l + 4}" y="${P.t + 12}">Built for later</text>
    <text class="dy-q" x="${W - P.r - 4}" y="${H - P.b - 6}" text-anchor="end">Win now</text>
    <text class="dy-q" x="${P.l + 4}" y="${H - P.b - 6}">Rebuild</text>
    <text class="dy-axis" x="${(P.l + W - P.r) / 2}" y="${H - 10}" text-anchor="middle">Stronger this season →</text>
    <text class="dy-axis" transform="translate(14 ${(P.t + H - P.b) / 2}) rotate(-90)" text-anchor="middle">Stronger in 2 years →</text>
    ${dots}</svg>`;
}

async function renderDynasty(body, params) {
  const { season, me, f, v } = await gmDynasty(params);
  if (route().page !== 'commish') return;
  const t = v.outlook[me];
  if (!t) {
    body.innerHTML = `<div class="gm-page">${gmTeamPick(me, season, 'dynasty')}<section class="card soon-card"><p>No roster found for this team.</p></section></div>`;
    bindTeamPick(body);
    return;
  }
  const roster = Object.values(v.players).filter(p => p.owner === me || (f.rosters.find(r => r.owner_id === me)?.taxi ?? []).includes(p.pid)).sort((a, b) => b.worth - a.worth);
  const taxi = roster.filter(p => p.where === 'taxi').sort((a, b) => taxiLeft(a) - taxiLeft(b) || b.worth - a.worth);
  const picks = v.picks.filter(p => p.owner === me).sort((a, b) => a.season - b.season || a.round - b.round);
  const tag = p => (p.where === 'taxi' ? '<span class="cm-pill">Taxi</span>' : p.where === 'ir' ? '<span class="cm-pill bad">IR</span>' : '');
  const grade = prospectChip;
  const pct = x => `${Math.round(x * 100)}%`;
  const pRank = Object.fromEntries(prospectRanking(v).map((p, i) => [p.pid, i + 1]));
  // Same order as the league list (unranked ones after, by their chances).
  const prospects = roster.filter(p => p.prospect).sort((a, b) => (pRank[a.pid] ?? 999) - (pRank[b.pid] ?? 999) || (b.prospect.star + b.prospect.starter + b.prospect.rotation) - (a.prospect.star + a.prospect.starter + a.prospect.rotation));
  // Roster filters (kept on this device): G/F/C by main Sleeper position + secondary ones, hide taxi.
  const rosterPos = ['G', 'F', 'C'].includes(gmLoad('gm-dyn-pos', '')) ? gmLoad('gm-dyn-pos', '') : '';
  const hideTaxi = Boolean(gmLoad('gm-dyn-hidetaxi', false));
  const taxiText = n => (n < 0 ? 'Over the limit' : n === 0 ? 'Last year' : `${n} more yr${n === 1 ? '' : 's'}`);
  const list = Object.values(v.outlook).sort((a, b) => b.total - a.total);
  const meter = Math.round((t.lean + 1) * 50);

  body.innerHTML = `<div class="gm-page">
    <div class="cm-pickers gm-tools">
      ${gmTeamPick(me, season, 'dynasty')}
      <div class="st-stage dy-inj" role="group" aria-label="Injured players">${[['cut', 'Injured: discounted'], ['full', 'Injured: full value']].map(([id, l]) => `<a href="#" data-inj="${id}" class="${(id === 'full') === Boolean(gmLoad('gm-dyn-full', false)) ? 'on' : ''}">${l}</a>`).join('')}</div>
    </div>
    <section class="card dy-head">
      <div class="card-head"><h2>${esc(teamName(me, season))}</h2><span class="cm-pill ${LABEL_CLS[t.label] ?? ''}">${esc(t.label)}</span></div>
      <div class="dy-meter" aria-label="Win now versus built for later"><span>Win now</span><div><i style="left:${meter}%"></i></div><span>Built for later</span></div>
      <div class="dy-stats">
        <span><b>No. ${t.nowRank}</b> strength now</span>
        <span><b>No. ${t.laterRank}</b> in 2 years</span>
        <span><b>No. ${t.totalRank}</b> total dynasty value</span>
        <span><b>${t.age ?? '–'}</b> avg age (by value)</span>
      </div>
    </section>
    <section class="card">
      <div class="card-head"><h2>League map</h2><span class="card-sub">Best 9 players now vs in 2 years (with the next two drafts’ picks)</span></div>
      ${dynastyMap(v, me, season)}
      <details class="cm-group"><summary>As a table</summary>
        <div class="cm-scroll"><table class="cm-table dy-table"><thead><tr><th>Team</th><th>Now</th><th>In 2 yrs</th><th>Total</th><th>Outlook</th></tr></thead>
        <tbody>${list.map(x => `<tr class="${x.owner === me ? 'cm-me' : ''}"><td>${esc(name(x.owner))}</td><td>No. ${x.nowRank}</td><td>No. ${x.laterRank}</td><td>${x.total}</td><td>${esc(x.label)}</td></tr>`).join('')}</tbody></table></div>
      </details>
    </section>
    <section class="card" id="dy-pos"></section>
    <section class="card" id="dy-movers"><div class="card-head"><h2>Risers &amp; fallers</h2></div><p class="cm-rule">Loading score history…</p></section>
    <div class="cm-races">
      <section class="card">
        <div class="card-head"><h2>Roster by dynasty score</h2><span class="card-sub" id="dy-count">${roster.length} players · tap one for his score over time</span></div>
        <div class="st-stage tf-filter dy-filter" role="group" aria-label="Position">${[['', 'All'], ['G', 'Guards'], ['F', 'Forwards'], ['C', 'Centers']].map(([id, l]) => `<a href="#" data-pos="${id}" class="${id === rosterPos ? 'on' : ''}">${l}</a>`).join('')}</div>
        <div class="dy-toggles"><label class="dy-taxi-toggle"><input type="checkbox"${hideTaxi ? ' checked' : ''}> Hide taxi (${taxi.length})</label><label class="dy-taxi-toggle dy-sec-toggle"><input type="checkbox"${gmLoad('gm-dyn-sec', true) !== false ? ' checked' : ''}> Include secondary positions</label></div>
        <p class="dy-week" id="dy-week"></p>
        <ol class="aw-race dy-list">${roster.map(p => `<li class="dy-row" data-pid="${esc(p.pid)}" data-pos="${posGroups(p).main}" data-sec="${posGroups(p).sec.join(' ')}" data-taxi="${p.where === 'taxi' ? 1 : 0}" tabindex="0" role="button" aria-expanded="false"><span>${esc(p.name)} ${tierTag(p.score)} ${grade(p)} ${tag(p)} ${injuryTag(p)}<small>${esc([posText(p), p.team || 'No team', p.age != null ? `age ${p.age}` : ''].filter(Boolean).join(' · '))}<span class="dy-sec-note"></span> · ${trendOf(p)}${projNote(p)}${p.out ? ` · <span class="${p.outCut ? 'dy-down' : 'dy-flat'}">listed Out: ${p.outCut ? 'this season at half' : 'full value'}</span>` : ''}${p.source !== 'projection' ? ` · ${p.source === 'none' ? 'no projection' : 'from last season'}` : ''}</small>${p.chances ? `<small class="dy-chances">In 3 seasons: ${chances(p.chances)}</small>` : ''}${contractLine(p)}</span><span class="dy-val">${scoreBar(p.score)}</span></li>`).join('')}</ol>
        <p class="cm-rule"><b>▲/▼ next to the score</b> = how much his score moved over the last 7 days (the line above the list adds up your whole team); the ↑/↓ % after his age is different: his value in 2 seasons vs this one. Filters use each player’s main Sleeper position; with <b>Include secondary positions</b> on, players who can also play there (another position Sleeper lists for him) show too, marked “secondary position”. <b>In 3 seasons</b>: his chances of being a rotation player (top 120), a weekly starter (top 72) or a star (top 24) by points per game three seasons from now; players ${PROSPECT_MAX_AGE} and under use the prospect model, older players a model fitted the same way on 2,453 NBA veterans (2013–2022), which counts players who decline or retire.${CONTRACTS?.players ? ' <b>Contract</b>: his NBA deal from this season on (see the Contracts card).' : ''}</p>
      </section>
      <div class="dy-side">
        <section class="card">
          <div class="card-head"><h2>Prospects</h2><a class="gm-more" href="#/commish?tab=prospects${me === COMMISH ? '' : `&team=${me}`}">Top ${PROSPECT_LIST} →</a></div>
          <p class="card-sub">Age ${PROSPECT_MAX_AGE} and under · in 3 seasons · #N = league prospect rank · bar = dynasty score</p>
          ${prospects.length ? `<ol class="aw-race dy-pros">${prospects.map(p => `<li><span>${pRank[p.pid] ? `<a class="pr-chip" href="#/commish?tab=prospects${me === COMMISH ? '' : `&team=${me}`}" title="League prospect rank">#${pRank[p.pid]}</a> ` : ''}${esc(p.name)} ${tag(p)}<small>${esc([p.pos, `age ${p.age}`].join(' · '))} · ${chances(p.prospect)}</small></span><span class="dy-val dy-pro-score" title="Dynasty score">${scoreBar(p.score)}</span>${grade(p)}</li>`).join('')}</ol>` : '<p class="empty">No players 24 or younger.</p>'}
          <p class="cm-rule">Chances he’s a <b>rotation</b> player (top 120, about bench level here), a weekly <b>starter</b> (top 72) or a <b>star</b> (top 24) three seasons from now.</p>
        </section>
        <section class="card" id="dy-grades"><div class="card-head"><h2>Prospect grade changes</h2></div><p class="cm-rule">Loading…</p></section>
        <section class="card">
          <div class="card-head"><h2>Taxi clock</h2><span class="card-sub">${taxi.length} of 15</span></div>
          ${taxi.length ? `<ol class="aw-race">${taxi.map(p => `<li><span>${esc(p.name)} ${tierTag(p.score)} ${grade(p)}<small>${p.nbaSeasons} NBA season${p.nbaSeasons === 1 ? '' : 's'} before this one · score ${p.score}${p.prospect ? ` · starter ${pct(p.prospect.starter)}` : ''}</small></span><b class="cm-pill ${taxiLeft(p) <= 0 ? 'bad' : ''}">${esc(taxiText(taxiLeft(p)))}</b></li>`).join('')}</ol>` : '<p class="empty">Nobody on taxi.</p>'}
          <p class="cm-rule">A player can stay on taxi through his 3rd NBA season (seasons counted from real games). <b>Last year</b> = this is his last season on taxi; <b>1 more yr</b> = he can stay one more season after this.${taxi.length > 15 ? ` <b>${taxi.length - 15} over the 15-player limit.</b>` : ''}</p>
        </section>
        ${contractsCard(v, f.rosters, me)}
        <section class="card">
          <div class="card-head"><h2>Picks</h2><span class="card-sub">Next 3 drafts</span></div>
          ${picks.length ? `<ol class="aw-race">${picks.map(p => `<li><span>${esc(p.label)}<small>${p.orig === me ? 'Own pick' : `From ${esc(name(p.orig))}`}</small></span><span class="dy-val">${scoreBar(p.score)}</span></li>`).join('')}</ol>` : '<p class="empty">No picks in the next 3 drafts.</p>'}
          <p class="cm-rule">${v.orderKnown ? `${v.nextDraft} slots are projected from the standings.` : `Slots aren’t known until games are played, so each pick is valued as the middle of its round.`}</p>
        </section>
      </div>
    </div>
    ${dynastyGuide(v, params.get('guide') === '1')}
    <section class="card">
      <div class="card-head"><h2>How dynasty scores work</h2></div>
      <p class="cm-rule"><b>0–100</b>: 0 is what you could pick up off waivers (the <b>waiver line</b>: the average value, at full health, of the 158th- to 177th-best players in the NBA, about where the best free agents sit, measured the same 3-season way; pickups, drops and injuries don’t move it, only projections do; at or below it ≈ 0), 100 is the league’s most valuable player (now ${esc(Object.values(v.players).sort((a, b) => b.worth - a.worth)[0]?.name ?? '')}). It blends three seasons of fantasy points per game, ${SEASON_WEIGHTS.map(w => `${w * 100}%`).join(' / ')}: this season is Sleeper’s projection under league scoring (his <i>average</i> game, not every game; players listed Out count half for this season; since the score measures value above waiver level, that can cut a mid-level player’s score a lot, e.g. 35 to 11; the “Injured: full value” switch at the top turns that off, and the setting also applies to the Trade finder, Managers and Waiver wire), and the next two follow an age curve fitted on 10 seasons of NBA stats: players improve about 10–15% a year up to 22, level off around 24–25, and lose about 5% a year by 29 and 10% by 31. The arrow is his value in 2 seasons vs this one. Sleeper updates season projections every morning, so a role change shows up overnight (and can move a player near waiver level a lot).</p>
      <p class="cm-rule">Each value carries some uncertainty, so a young player just below waiver level keeps a little value for his upside. <b>Picks</b>: what a rookie at that spot has produced in this league’s drafts (Draft Grades), with the same upside, 10% off per year until the draft. Picks only count their first 3 seasons, so dynasty markets that look further ahead value them higher.</p>
      <p class="cm-rule"><b>Prospect grade</b> (players ${PROSPECT_MAX_AGE} and under, A+ to F): the score above looks 3 seasons ahead, which undersells young players, so the grade asks where he’ll be in 3 seasons. His points per game are carried forward on the age curve and compared with how ${'1,777'} young NBA players since 2012 actually turned out (counting the ones who fell out of the league). Checked on players the model never saw (2019–2022): when it said about 21% would become starters, 15% did; about 59%, 67% did; about 83%, 86% did. A+ = 50%+ star chance; A = 30%+ star or 85%+ starter; A– to B– = 70% down to 25% starter; C+ to D = mostly his rotation chance; F = under 12% to even be a rotation player.</p>
    </section></div>`;
  bindTeamPick(body);
  if (params.get('guide') === '1') $('#dy-guide', body)?.scrollIntoView({ block: 'start' });
  bindScoreCharts(body, v);
  const filterRoster = () => {
    const pos = gmLoad('gm-dyn-pos', '');
    const noTaxi = Boolean(gmLoad('gm-dyn-hidetaxi', false));
    const withSec = gmLoad('gm-dyn-sec', true) !== false;
    let main = 0, sec = 0;
    body.querySelectorAll('.dy-list > .dy-row').forEach(li => {
      const isSec = withSec && Boolean(pos) && li.dataset.pos !== pos && li.dataset.sec.split(' ').includes(pos);
      const show = (!pos || li.dataset.pos === pos || isSec) && !(noTaxi && li.dataset.taxi === '1');
      li.hidden = !show;
      if (!show && li.nextElementSibling?.classList.contains('sc-row')) { li.nextElementSibling.remove(); li.setAttribute('aria-expanded', 'false'); }
      $('.dy-sec-note', li).innerHTML = isSec ? ` · <span class="dy-sec">secondary position: ${POS_WORD[pos][0]}</span>` : '';
      if (show) { if (isSec) sec++; else main++; }
    });
    $('#dy-count', body).textContent = pos
      ? `${main} ${POS_WORD[pos][main === 1 ? 0 : 1]}${sec ? ` + ${sec} secondary` : ''}${noTaxi ? ', taxi hidden' : ''}`
      : `${main} players${noTaxi ? ' (taxi hidden)' : ''} · tap one for his score over time`;
    body.querySelectorAll('.dy-filter a').forEach(a => a.classList.toggle('on', a.dataset.pos === pos));
  };
  body.querySelectorAll('.dy-filter a').forEach(a => a.addEventListener('click', e => { e.preventDefault(); gmSave('gm-dyn-pos', a.dataset.pos); filterRoster(); }));
  $('.dy-taxi-toggle input', body).addEventListener('change', e => { gmSave('gm-dyn-hidetaxi', e.target.checked); filterRoster(); });
  $('.dy-sec-toggle input', body)?.addEventListener('change', e => { gmSave('gm-dyn-sec', e.target.checked); filterRoster(); });
  fillWeekArrows(body, v, me).catch(() => {});
  fillGradeLog($('#dy-grades', body), v, me).catch(() => {});
  filterRoster();
  fillMovers($('#dy-movers', body), v, me).catch(() => {});
  drawPositions($('#dy-pos', body), v, f.rosters, me);
  body.querySelectorAll('[data-inj]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    gmSave('gm-dyn-full', a.dataset.inj === 'full');
    renderDynasty(body, params).catch(() => {});
  }));
}

// Guide to the dynasty numbers (Dynasty tab, linked from the Trade finder and Waiver wire):
// score tiers with how many players are in each right now and league examples.
const SCORE_TIERS = [
  [90, 'Franchise cornerstone', 'The rare build-around player. Almost never worth trading.'],
  [70, 'Star', 'A top-10 type asset: only for a huge return.'],
  [50, 'High-end starter', 'Locks in big numbers most weeks.'],
  [30, 'Starter', 'A solid weekly starter (roughly the top 70).'],
  [15, 'Flex / bench starter', 'Starts some weeks; good depth.'],
  [5, 'Depth', 'Bench piece or a reasonable dart throw.'],
  [1, 'Stash', 'About waiver level now, with a little upside.'],
  [0, 'Replaceable', 'No better than what’s on the waiver wire.'],
];
function dynastyGuide(v, open = false) {
  const all = Object.values(v.players).filter(p => p.team || p.owner);
  const tierOf = s => SCORE_TIERS.find(([min]) => s >= min);
  const rows = SCORE_TIERS.map(([min, label, text], i) => {
    const max = i ? SCORE_TIERS[i - 1][0] - 1 : 100;
    const inTier = all.filter(p => tierOf(p.score) === SCORE_TIERS[i]).sort((a, b) => b.score - a.score);
    const ex = inTier.filter(p => p.owner).slice(0, 2).map(p => `${p.name} ${p.score}`).join(', ');
    return `<tr><td><b>${min === 0 ? '0' : `${min}–${max}`}</b></td><td>${tierTag(min)} <b>${label}</b><small>${text}${ex ? ` E.g. ${esc(ex)}.` : ''}</small></td><td>${inTier.length}</td></tr>`;
  }).join('');
  const pick = r => { const ps = v.picks.filter(p => p.round === r); return ps.length ? Math.round(ps.reduce((a, p) => a + p.score, 0) / ps.length) : 0; };
  return `
    <section class="card" id="dy-guide">
      <details${open ? ' open' : ''}><summary class="dy-guide-sum"><h2>Guide: what the numbers mean</h2><span class="card-sub">Tap to open or close</span></summary>
        <table class="cm-table dy-tiers"><thead><tr><th>Score</th><th>What it means</th><th>Players</th></tr></thead><tbody>${rows}</tbody></table>
        <ul class="cm-list dy-guide-list">
          <li><b>Dynasty score (0–100)</b>: value over the next 3 seasons (50% this season, 30% next, 20% the one after). 0 = waiver level, 100 = the league’s most valuable player. Scores compare players across positions and ages.</li>
          <li><b>Arrow (↑ / ↓)</b>: his value two seasons from now vs this season, from the age curve. “Steady” = within 5%.</li>
          <li><b>Prospect grade (A+ to F)</b>: players 24 and under. His chances in 3 seasons of being a rotation player (top 120), a starter (top 72) or a star (top 24). A score says what he’s worth now; the grade says where he’s headed.</li>
          <li><b>Picks</b>: an average 1st is worth about ${pick(1)}, a 2nd about ${pick(2)}, a 3rd about ${pick(3)} (10% less for each year until the draft).</li>
          <li><b>Adding up a trade</b>: scores don’t simply add. Two 30s are worth about one ${Math.round(packageValue([30, 30]))}, three 20s about one ${Math.round(packageValue([20, 20, 20]))}, so one star beats a pile of role players.</li>
          <li><b>Outlook labels</b> (Contender, Win now, Rising, Fading, Rebuilding, Middle): from a team’s rank now vs in 2 years on the Dynasty tab. Win-now teams value this season more; building teams value later seasons and picks more.</li>
        </ul>
      </details>
    </section>`;
}

// ---- Trade finder (logic in assets/tradefinder.js) ----

// ---- Team tracker (My GM): roster-move alerts, drift and charts (owner's design, Oct 2026) ----
// Moves: moveImpacts() in tradefinder.js (each team just before vs just after a move, at today's
// values). Drift: change over the last 7 days not explained by moves. Charts: nightly team
// snapshots (dynasty-history.json "teams", rebuilt weekly for last season) + today live.
const TRACK_METRICS = [
  ['now', 'This season', 'pts/game (best 9)'], ['later', 'In 2 years', 'pts/game (best 9)'], ['total', 'Total value', 'dynasty points'],
  ['age', 'Avg age', 'years, by value'], ['G', 'Guards', '100 = league avg'], ['F', 'Forwards', '100 = league avg'], ['C', 'Centers', '100 = league avg'],
];
const MOVE_KIND = { trade: 'Trade', waiver: 'Waiver', free_agent: 'Free agent', commissioner: 'Commish' };
const trackerSeenKey = o => `gm-tracker-seen-${o}`;
// When a team was last looked at; on a first visit, moves from the last 7 days count as new.
const trackerSeen = o => Number(gmLoad(trackerSeenKey(o), 0)) || Date.now() - 7 * 864e5;
// This season's moves involving a team, newest first (for the Briefing's heads-up too).
const movesOf = o => (DATA.transactions ?? []).filter(x => x.s === DATA.seasons.at(-1).season && (x.owners ?? []).includes(o)).sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0));

function deltaChip(label, a, b, { digits = 1, better = 'up', rankA, rankB } = {}) {
  if (a == null || b == null) return '';
  const d = Math.round((b - a) * 10 ** digits) / 10 ** digits;
  const rank = rankA != null && rankA !== rankB ? ` · No. ${rankA} → ${rankB}` : '';
  if (!d && !rank) return '';
  const good = better === 'up' ? d > 0 || (rankB < rankA) : d < 0;
  return `<span class="tk-d ${d === 0 ? '' : good ? 'up' : 'down'}"><small>${label}</small> ${d > 0 ? '+' : ''}${num(d)}${rank}</span>`;
}
function moveCard(m, o, v, seen) {
  const x = m.x, b = m.before[o], a = m.after[o];
  const pname = pid => v.players[pid]?.name ?? DATA.players?.[pid]?.n ?? `Player ${pid}`;
  const pickName = p => `${p.season} ${['1st', '2nd', '3rd'][p.round - 1] ?? `R${p.round}`}`;
  const ins = [...Object.entries(x.adds ?? {}).filter(([, w]) => w === o).map(([p]) => `${esc(pname(p))} ${v.players[p] ? tierTag(v.players[p].score) : ''}`), ...(x.picks ?? []).filter(p => p.to === o).map(p => esc(pickName(p)))];
  const outs = [...Object.entries(x.drops ?? {}).filter(([, w]) => w === o).map(([p]) => `${esc(pname(p))} ${v.players[p] ? tierTag(v.players[p].score) : ''}`), ...(x.picks ?? []).filter(p => p.from === o).map(p => esc(pickName(p)))];
  const chips = [
    deltaChip('Now', b.now, a.now, { rankA: b.nowRank, rankB: a.nowRank }),
    deltaChip('2 yrs', b.later, a.later, { rankA: b.laterRank, rankB: a.laterRank }),
    deltaChip('Total', b.total, a.total, { digits: 0, rankA: b.totalRank, rankB: a.totalRank }),
    deltaChip('Age', b.age, a.age, { better: 'down' }),
    ...['G', 'F', 'C'].map(g => deltaChip(g, b[g], a[g], { digits: 0 })),
  ].filter(Boolean);
  const big = b.nowRank !== a.nowRank || b.laterRank !== a.laterRank || b.totalRank !== a.totalRank || ['G', 'F', 'C'].some(g => Math.abs(a[g] - b[g]) >= 5) || Math.abs(a.total - b.total) >= 10 || Math.abs(a.now - b.now) >= 5;
  const kind = x.type === 'free_agent' && !ins.length ? 'Drop' : MOVE_KIND[x.type] ?? x.type;
  const others = x.type === 'trade' ? [...new Set(x.owners)].filter(w => w !== o).map(w => name(w)).join(' & ') : '';
  return `
    <li class="tk-move${big ? ' big' : ''}${(x.ts ?? 0) > seen ? ' new' : ''}">
      <div class="tk-top"><span class="cm-pill ${x.type === 'trade' ? 'good' : ''}">${esc(kind)}</span>${others ? `<small>with ${esc(others)}</small>` : ''}${(x.ts ?? 0) > seen ? '<span class="tk-new">New</span>' : ''}<span class="tk-date">${shortMd(new Date(x.ts).toISOString().slice(0, 10))}</span></div>
      ${ins.length ? `<p class="tk-io"><b class="dy-up">In</b> ${ins.join(', ')}</p>` : ''}
      ${outs.length ? `<p class="tk-io"><b class="dy-down">Out</b> ${outs.join(', ')}</p>` : ''}
      <div class="tk-chips">${chips.length ? chips.join('') : '<span class="tk-d"><small>No change to strength, value or positions</small></span>'}</div>
    </li>`;
}

// Line chart for one team metric: the team (solid) and the league average (dashed), one panel
// per season (swipe / arrows, same strip as the player charts), move markers along the bottom.
function trackerSeasons(pts, metric, markers, fmt) {
  const bySeason = {};
  for (const x of pts) (bySeason[seasonOfDate(x.d)] ??= []).push(x);
  const seasons = Object.keys(bySeason).sort();
  const vals = pts.flatMap(x => [x.me, x.avg]).filter(n => n != null);
  const pad = Math.max(1, (Math.max(...vals) - Math.min(...vals)) * 0.12);
  const lo = Math.floor(Math.min(...vals) - pad), hi = Math.ceil(Math.max(...vals) + pad);
  const chart = list => {
    const W = 380, H = 170, P = { l: 34, r: 14, t: 14, b: 26 };
    const day = d => new Date(`${d}T12:00:00`).getTime() / 864e5;
    const d0 = day(list[0].d), d1 = Math.max(day(list.at(-1).d), d0 + 1);
    const X = d => (list.length < 2 ? (P.l + W - P.r) / 2 : P.l + (day(d) - d0) / (d1 - d0) * (W - P.l - P.r));
    const Y = s => H - P.b - (s - lo) / ((hi - lo) || 1) * (H - P.t - P.b);
    const line = (key, cls) => list.length > 1 ? `<path class="${cls}" d="${list.map((x, i) => `${i ? 'L' : 'M'}${X(x.d).toFixed(1)},${Y(x[key]).toFixed(1)}`).join(' ')}"/>` : '';
    const dots = list.map(x => `<g class="sc-pt${x.live ? ' now' : ''}"><title>${shortMd(x.d)}${x.live ? ' (now)' : ''}: ${fmt(x.me)} (league avg ${fmt(x.avg)})</title><circle cx="${X(x.d)}" cy="${Y(x.me)}" r="10" class="sc-hit"/><circle cx="${X(x.d)}" cy="${Y(x.me)}" r="${x.live ? 5 : 2.5}"/></g>`).join('');
    const marks = markers.filter(mk => mk.d >= list[0].d && mk.d <= list.at(-1).d)
      .map(mk => `<g class="tk-mark"><title>${esc(mk.title)}</title><path d="M${X(mk.d)},${H - P.b + 2} l4,7 h-8 z"/></g>`).join('');
    const last = list.at(-1);
    return `<svg class="sc-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(metric)} over time">
      <text class="sc-ax" x="${P.l - 6}" y="${Y(hi) + 4}" text-anchor="end">${fmt(hi)}</text>
      <text class="sc-ax" x="${P.l - 6}" y="${Y(lo) + 4}" text-anchor="end">${fmt(lo)}</text>
      <line class="sc-base" x1="${P.l}" x2="${W - P.r}" y1="${Y(lo)}" y2="${Y(lo)}"/>
      ${line('avg', 'tk-avg')}${line('me', 'sc-line')}${dots}${marks}
      <text class="sc-val" x="${X(last.d) - 8}" y="${Y(last.me) - 9}" text-anchor="end">${fmt(last.me)}</text>
      <text class="sc-ax" x="${P.l}" y="${H - 6}">${list.length > 1 ? shortMd(list[0].d) : ''}</text>
      <text class="sc-ax" x="${list.length > 1 ? W - P.r : X(last.d)}" y="${H - 6}" text-anchor="${list.length > 1 ? 'end' : 'middle'}">${shortMd(last.d)}</text>
    </svg>`;
  };
  const cur = seasons.at(-1);
  return `
    <div class="sc-nav"><button type="button" class="sc-arrow sc-prev" aria-label="Previous season">‹</button><span class="sc-label">${seasonSpan(cur)}</span><button type="button" class="sc-arrow sc-next" aria-label="Next season">›</button></div>
    <div class="sc-strip">${seasons.map(s => `<div class="sc-slide" data-season="${s}">${chart(bySeason[s])}</div>`).join('')}</div>
    ${seasons.length > 1 ? `<div class="sc-dots">${seasons.map(s => `<i data-season="${s}"></i>`).join('')}<span class="sc-swipe">Swipe for other seasons</span></div>` : ''}
    <p class="cm-rule"><span class="tk-key me"></span> your team · <span class="tk-key avg"></span> league average · ▲ roster moves (trades, and moves that changed something this season). ${pts.length < 3 ? 'Daily points start with tonight’s nightly update; last season is rebuilt weekly.' : ''}</p>`;
}

async function renderTracker(body, params) {
  const { season, me, f, v } = await gmDynasty(params);
  const hist = await loadDynHistory();
  if (route().page !== 'commish') return;
  const full = Boolean(gmLoad('gm-dyn-full', false));
  const pick = rec => unpackTeam(rec?.[full ? 'f' : 'c'] ?? null);
  const impacts = moveImpacts(DATA, v, f.rosters);
  const mine = impacts.filter(m => (m.x.owners ?? []).includes(me) && m.before[me] && m.after[me]);
  const seen = trackerSeen(me);
  const liveArr = teamSnapshot(v, f.rosters);
  const live = unpackTeam(liveArr[me]);
  const today = ctDate();
  const fresh = mine.filter(m => (m.x.ts ?? 0) > seen);

  // Drift: last 7 days, minus what moves explain.
  const tdays = Object.keys(hist.teams ?? {}).filter(d => d < today && seasonOfDate(d) === seasonOfDate(today)).sort();
  const back = new Date(`${today}T12:00:00`); back.setDate(back.getDate() - 7);
  const cutoff = back.toISOString().slice(0, 10);
  const base = [...tdays].reverse().find(d => d <= cutoff) ?? null;
  let drift = '';
  if (!base) {
    drift = `<p class="empty">Drift shows once a week of nightly snapshots is saved${tdays[0] ? ` (first: ${shortMd(tdays[0])})` : ' (the first is saved tonight)'}.</p>`;
  } else {
    const old = pick(hist.teams[base]?.[me]);
    const since = mine.filter(m => new Date(m.x.ts).toISOString().slice(0, 10) > base);
    const moved = k => since.reduce((s, m) => s + (m.after[me][k] - m.before[me][k]), 0);
    const chips = [['now', 'Now', 1], ['later', '2 yrs', 1], ['total', 'Total', 0], ['G', 'G', 0], ['F', 'F', 0], ['C', 'C', 0]]
      .map(([k, l, dg]) => old ? deltaChip(l, 0, (live[k] - old[k]) - moved(k), { digits: dg }) : '').filter(Boolean);
    const oldDay = hist.days?.[base] ?? null; // player scores saved the same night
    const sv = x => (x == null ? 0 : Array.isArray(x) ? (full ? x[1] : x[0]) : x);
    const roster = [...new Set((f.rosters.find(r => r.owner_id === me)?.players ?? []))];
    const movers = !oldDay ? [] : roster.map(pid => ({ p: v.players[pid], d: (v.players[pid]?.score ?? 0) - sv(oldDay[pid]) })).filter(x => x.p && x.d).sort((a, b) => Math.abs(b.d) - Math.abs(a.d)).slice(0, 4);
    drift = `<p class="cm-rule">Since ${shortMd(base)}, with roster moves taken out: what changed from projections, injuries and age alone.</p>
      <div class="tk-chips">${chips.length ? chips.join('') : '<span class="tk-d"><small>No drift: steady</small></span>'}</div>
      ${movers.length ? `<ol class="aw-race">${movers.map(x => `<li><span>${esc(x.p.name)} ${tierTag(x.p.score)} ${injuryTag(x.p)}<small>dynasty score ${sv(oldDay[x.p.pid])} → ${x.p.score}</small></span><b class="${x.d > 0 ? 'dy-up' : 'dy-down'}">${x.d > 0 ? '+' : ''}${x.d}</b></li>`).join('')}</ol>` : ''}`;
  }

  // Chart series: saved team snapshots + today live.
  const series = metric => {
    const pts = Object.keys(hist.teams ?? {}).filter(d => d < today).sort().map(d => {
      const day = hist.teams[d];
      const all = Object.values(day).map(pick).filter(Boolean).map(t => t[metric]).filter(n => n != null);
      const m = pick(day[me]);
      return m ? { d, me: m[metric], avg: all.reduce((a, b) => a + b, 0) / (all.length || 1) } : null;
    }).filter(Boolean);
    const allLive = Object.values(liveArr).map(unpackTeam).map(t => t[metric]).filter(n => n != null);
    pts.push({ d: today, me: live[metric], avg: allLive.reduce((a, b) => a + b, 0) / (allLive.length || 1), live: true });
    return pts;
  };
  const markers = [
    ...(DATA.transactions ?? []).filter(x => x.type === 'trade' && (x.owners ?? []).includes(me) && x.ts).map(x => ({ d: new Date(x.ts).toISOString().slice(0, 10), title: `Trade with ${[...new Set(x.owners)].filter(w => w !== me).map(name).join(' & ')}` })),
    ...mine.filter(m => m.x.type !== 'trade' && Math.abs(m.after[me].total - m.before[me].total) >= 5).map(m => ({ d: new Date(m.x.ts).toISOString().slice(0, 10), title: `${MOVE_KIND[m.x.type] ?? 'Move'}: total ${m.after[me].total - m.before[me].total > 0 ? '+' : ''}${m.after[me].total - m.before[me].total}` })),
  ];
  let metric = 'now';
  const fmtOf = k => (k === 'age' ? x => num(Math.round(x * 10) / 10) : k === 'now' || k === 'later' ? x => num(Math.round(x)) : x => num(Math.round(x)));

  const withEffect = mine.filter(m => ['now', 'later', 'total', 'G', 'F', 'C'].some(k => m.after[me][k] !== m.before[me][k]) || m.before[me].nowRank !== m.after[me].nowRank);
  const noEffect = mine.length - withEffect.length;
  body.innerHTML = `<div class="gm-page">
    ${gmTeamPick(me, season, 'tracker')}
    <section class="card tk-now">
      <div class="card-head"><h2>${esc(teamName(me, season))} today</h2><span class="card-sub">${fresh.length ? `<b class="tk-new">${fresh.length} new move${fresh.length === 1 ? '' : 's'}</b> since you last looked` : 'No new moves since you last looked'}</span></div>
      <div class="dy-stats">
        <span><b>${num(live.now)}</b> this season · No. ${v.outlook[me]?.nowRank}</span>
        <span><b>${num(live.later)}</b> in 2 yrs · No. ${v.outlook[me]?.laterRank}</span>
        <span><b>${live.total}</b> total value · No. ${v.outlook[me]?.totalRank}</span>
        <span><b>${live.age ?? '–'}</b> avg age</span>
      </div>
      <div class="tk-pos">${['G', 'F', 'C'].map(g => `<span class="${live[g] >= 110 ? 'dy-up' : live[g] <= 90 ? 'dy-down' : ''}">${NEED_NAME[g]}s <b>${live[g]}</b> <small>→ ${live[`${g}l`]} in 2 yrs</small></span>`).join('')}</div>
    </section>
    <section class="card">
      <div class="card-head"><h2>Roster moves</h2><span class="card-sub">${seasonSpan(season)} · effect at today’s values</span></div>
      ${withEffect.length ? `<ol class="tk-list">${withEffect.slice(0, 12).map(m => moveCard(m, me, v, seen)).join('')}</ol>` : '<p class="empty">No moves that changed anything yet this season.</p>'}
      ${withEffect.length > 12 ? `<details class="cm-group"><summary>Older moves <small>${withEffect.length - 12}</small></summary><ol class="tk-list">${withEffect.slice(12).map(m => moveCard(m, me, v, seen)).join('')}</ol></details>` : ''}
      ${noEffect ? `<details class="cm-group"><summary>Moves with no effect <small>${noEffect}</small></summary><ol class="tk-list">${mine.filter(m => !withEffect.includes(m)).map(m => moveCard(m, me, v, seen)).join('')}</ol></details>` : ''}
      <p class="cm-rule">Each move compares the team just before and just after it, valued at today’s dynasty scores, so a move’s effect isn’t mixed with later injuries or projection changes. Highlighted: a rank changes, a position moves 5+, or total value moves 10+.</p>
    </section>
    <section class="card">
      <div class="card-head"><h2>Drift</h2><span class="card-sub">Last 7 days, no moves</span></div>
      ${drift}
    </section>
    <section class="card" id="tk-chart">
      <div class="card-head"><h2>Over time</h2><span class="card-sub" id="tk-unit"></span></div>
      <div class="st-stage dy-mv-chips tk-metrics" role="group">${TRACK_METRICS.map(([k, l]) => `<a href="#" data-metric="${k}" class="${k === metric ? 'on' : ''}">${l}</a>`).join('')}</div>
      <div id="tk-plot"></div>
    </section>
  </div>`;
  bindTeamPick(body);
  const drawChart = () => {
    const [, l, unit] = TRACK_METRICS.find(([k]) => k === metric);
    $('#tk-unit', body).textContent = `${l}: ${unit}`;
    const box = $('#tk-plot', body);
    box.innerHTML = trackerSeasons(series(metric), l, markers, fmtOf(metric));
    bindSeasonStrip(box);
    body.querySelectorAll('[data-metric]').forEach(a => a.classList.toggle('on', a.dataset.metric === metric));
  };
  body.querySelectorAll('[data-metric]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); metric = a.dataset.metric; drawChart(); }));
  drawChart();
  // Mark this team's moves as seen.
  const latest = movesOf(me)[0]?.ts ?? 0;
  if (latest > seen) gmSave(trackerSeenKey(me), latest);
}

// ---- Trade evaluator (Trade finder → "Evaluate a trade"; logic in tradefinder.js evaluateTrade) ----
// Enter any offer: 2 or 3 teams, each team's outgoing players and picks (3 teams: pick where
// each goes). The draft is kept on this device until cleared.
function renderEvaluator(box, { season, me, f, v }) {
  const owners = DATA.seasons.at(-1).teams.map(t => t.owner);
  const all = teamAssets(v, f.rosters, { all: true });
  const assetOf = Object.fromEntries(Object.values(all).flat().map(a => [a.id, a]));
  const key = 'gm-eval';
  const saved = gmLoad(key, null);
  const st = saved && Array.isArray(saved.legs) ? saved : { n: 2, teams: [me, owners.find(o => o !== me)], legs: [] };
  const fix = () => {
    st.n = st.n === 3 ? 3 : 2;
    st.teams = st.teams.slice(0, st.n);
    while (st.teams.length < st.n) st.teams.push(owners.find(o => !st.teams.includes(o)));
    // Keep legs that still make sense: their team is in the trade and still owns the asset.
    st.legs = st.legs.filter(l => st.teams.includes(l.from) && assetOf[l.id] && (all[l.from] ?? []).some(a => a.id === l.id));
    for (const l of st.legs) if (!st.teams.includes(l.to) || l.to === l.from) l.to = st.teams.find(o => o !== l.from);
    gmSave(key, st);
  };
  const teamSelect = (i) => `<span class="ed-select"><span class="hy-pick-val">${esc(teamName(st.teams[i], season))}</span>
    <svg class="caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5l3-3"/></svg>
    <select data-team="${i}" aria-label="Team ${i + 1}">${owners.map(o => `<option value="${esc(o)}"${o === st.teams[i] ? ' selected' : ''}${st.teams.includes(o) && o !== st.teams[i] ? ' disabled' : ''}>${esc(teamName(o, season))} (${esc(name(o))})</option>`).join('')}</select></span>`;
  const assetLine = a => `${esc(a.name)} ${a.kind === 'player' ? tierTag(a.score) : ''} ${a.prospect ? prospectChip({ prospect: a.prospect }) : ''}${a.injury ? ` ${injuryTag(a)}` : ''}${a.where === 'taxi' ? ' <span class="cm-pill">Taxi</span>' : ''}`;
  const sideCard = (o, i) => {
    const mine = st.legs.filter(l => l.from === o);
    const used = new Set(st.legs.map(l => l.id));
    const options = (all[o] ?? []).filter(a => !used.has(a.id));
    return `
      <section class="card ev-team">
        <div class="ev-team-head"><span class="hy-pick-label">Team ${'ABC'[i]}</span>${teamSelect(i)}</div>
        <div class="tf-side-head">Sends</div>
        ${mine.length ? `<ol class="aw-race">${mine.map(l => { const a = assetOf[l.id]; return `<li><span>${assetLine(a)}<small>${a.kind === 'pick' ? 'Rookie pick' : esc([a.pos, a.team, a.age != null ? `age ${a.age}` : ''].filter(Boolean).join(' · '))}${st.n === 3 ? '' : ` · to ${esc(name(l.to))}`}</small>
          ${st.n === 3 ? `<span class="ev-to">to <select data-to="${esc(l.id)}">${st.teams.filter(x => x !== o).map(x => `<option value="${esc(x)}"${x === l.to ? ' selected' : ''}>${esc(name(x))}</option>`).join('')}</select></span>` : ''}</span>
          <span class="ev-right"><b>${a.score}</b><button type="button" class="ev-x" data-remove="${esc(l.id)}" aria-label="Remove ${esc(a.name)}">×</button></span></li>`; }).join('')}</ol>` : '<p class="empty">Nothing yet.</p>'}
        <label class="ev-add"><span>+ Add player or pick</span><select data-add="${esc(o)}"><option value="">Add a player or pick…</option>
          <optgroup label="Players">${options.filter(a => a.kind === 'player').map(a => `<option value="${esc(a.id)}">${esc(a.name)} · ${a.score}</option>`).join('')}</optgroup>
          <optgroup label="Picks">${options.filter(a => a.kind === 'pick').map(a => `<option value="${esc(a.id)}">${esc(a.name)} · ${a.score}</option>`).join('')}</optgroup></select></label>
      </section>`;
  };
  const arrow = (a, b, better = 'up') => {
    if (a === b) return `<span class="dy-flat">${a}</span>`;
    const good = better === 'up' ? b > a : b < a;
    return `${a} → <b class="${good ? 'dy-up' : 'dy-down'}">${b}</b>`;
  };
  const rankArrow = (a, b) => (a === b ? `No. ${a}` : `No. ${a} → <b class="${b < a ? 'dy-up' : 'dy-down'}">No. ${b}</b>`);
  const pctArrow = (a, b) => arrow(Math.round(a * 100), Math.round(b * 100));

  const results = () => {
    if (!st.legs.length) return '<p class="filter-note">Add what each team sends to see the evaluation.</p>';
    const ev = evaluateTrade(DATA, v, f.rosters, st.legs);
    const verdictText = s => (s.verdict === 'wins' ? 'Comes out ahead' : s.verdict === 'loses' ? 'Comes out behind' : 'About even');
    const sides = ev.sides.map(s => `
      <section class="card ev-side ev-${s.verdict}">
        <div class="card-head"><h2>${esc(name(s.owner))}</h2><span class="cm-pill ${s.verdict === 'wins' ? 'good' : s.verdict === 'loses' ? 'bad' : ''}">${verdictText(s)}</span></div>
        <div class="tf-sides">
          <div><div class="tf-side-head">Gives <b>${Math.round(s.giveTV)}</b></div>${s.give.length ? `<ol class="aw-race">${s.give.map(a => `<li><span>${assetLine(a)}</span><b>${a.score}</b></li>`).join('')}</ol>` : '<p class="empty">Nothing.</p>'}</div>
          <div><div class="tf-side-head">Gets <b>${Math.round(s.getTV)}</b></div>${s.get.length ? `<ol class="aw-race">${s.get.map(a => `<li><span>${assetLine(a)}</span><b>${a.score}</b></li>`).join('')}</ol>` : '<p class="empty">Nothing.</p>'}</div>
        </div>
        <div class="tf-balance"><i style="width:${Math.round(100 * s.giveTV / ((s.giveTV + s.getTV) || 1))}%"></i></div>
        <dl class="mg-stats ev-stats">
          <div><dt>Net value</dt><dd><span class="${s.net >= 0 ? 'dy-up' : 'dy-down'}">${s.net >= 0 ? '+' : ''}${num(s.net)}</span> <small>standard timeline · on theirs (${esc(s.label)}): ${s.theirNet >= 0 ? '+' : ''}${num(s.theirNet)}</small></dd></div>
          <div><dt>This season</dt><dd>${rankArrow(s.before.nowRank, s.after.nowRank)} <small>best 9 this season (not taxi): ${arrow(num(s.before.now), num(s.after.now))} pts/game</small></dd></div>
          <div><dt>In 2 years</dt><dd>${rankArrow(s.before.laterRank, s.after.laterRank)} <small>${arrow(num(s.before.later), num(s.after.later))}</small></dd></div>
          <div><dt>Dynasty total</dt><dd>${rankArrow(s.before.totalRank, s.after.totalRank)} <small>${arrow(s.before.total, s.after.total)}</small></dd></div>
          <div><dt>Outlook</dt><dd>${s.before.label === s.after.label ? esc(s.after.label) : `${esc(s.before.label)} → <b>${esc(s.after.label)}</b>`} <small>avg age (by value) ${arrow(s.before.age ?? '–', s.after.age ?? '–', 'down')}</small></dd></div>
          <div><dt>Positions</dt><dd class="ev-pos">${['G', 'F', 'C'].map(g => `<span>${g} ${pctArrow(s.posBefore?.[g] ?? 0, s.posAfter?.[g] ?? 0)}</span>`).join('')} <small>this season’s best ${'guards (3), forwards (3), centers (2)'} vs league average = 100</small></dd></div>
          <div><dt>Roster</dt><dd>${s.spots ? `${s.spots > 0 ? '+' : ''}${s.spots} player${Math.abs(s.spots) === 1 ? '' : 's'}` : 'Same size'} <small>${s.spots > 0 ? `needs ${s.spots} open spot${s.spots === 1 ? '' : 's'} · ` : ''}taxi ${s.taxiAfter} of 15${s.taxiAfter > 15 ? ' (over the limit)' : ''}</small></dd></div>
        </dl>
      </section>`).join('');
    const involved = new Set(ev.teams);
    const league = Object.values(ev.after).sort((a, b) => a.nowRank - b.nowRank).map(t => {
      const b = ev.before[t.owner];
      return `<tr class="${involved.has(t.owner) ? 'cm-me' : ''}"><td>${esc(name(t.owner))}</td><td>${rankArrow(b.nowRank, t.nowRank)}</td><td>${rankArrow(b.laterRank, t.laterRank)}</td><td>${rankArrow(b.totalRank, t.totalRank)}</td><td>${b.label === t.label ? esc(t.label) : `${esc(b.label)} → <b>${esc(t.label)}</b>`}</td></tr>`;
    }).join('');
    const moved = Object.values(ev.after).filter(t => ['nowRank', 'laterRank', 'totalRank'].some(k => t[k] !== ev.before[t.owner][k]) || t.label !== ev.before[t.owner].label);
    const pastNet = {};
    const fo = ledger();
    for (const x of fo.trades.filter(t => ev.history.some(h => h.ts === t.ts))) for (const sd of x.sides) if (involved.has(sd.o)) pastNet[sd.o] = (pastNet[sd.o] ?? 0) + sd.net;
    return `
      <div class="mg-grid ev-sides">${sides}</div>
      <section class="card">
        <div class="card-head"><h2>How it shifts the league</h2><span class="card-sub">Dynasty ranks before → after</span></div>
        <p class="cm-rule">${moved.length ? `${moved.length} team${moved.length === 1 ? '' : 's'} move${moved.length === 1 ? 's' : ''} in at least one ranking or outlook.` : 'No team changes rank: a small move.'} Teams in the trade are highlighted.</p>
        <div class="cm-scroll"><table class="cm-table dy-table ev-league"><thead><tr><th>Team</th><th>This season</th><th>In 2 yrs</th><th>Total</th><th>Outlook</th></tr></thead><tbody>${league}</tbody></table></div>
      </section>
      <section class="card">
        <div class="card-head"><h2>Between these teams</h2></div>
        <p class="cm-rule">${ev.history.length ? `${ev.history.length} past trade${ev.history.length === 1 ? '' : 's'}. Front Office net from them (locked points since): ${ev.teams.map(o => `${esc(name(o))} ${pastNet[o] >= 0 ? '+' : ''}${num(pastNet[o] ?? 0)}`).join(' · ')}.` : 'They’ve never traded with each other.'}</p>
      </section>
      <p class="filter-note">Values are dynasty scores (0–100) added up the way trades work: a package is worth less than its total (two 30s ≈ one ${Math.round(packageValue([30, 30]))}). “About even” = within 10%. “On theirs” uses each team’s own timeline: win-now teams count this season more, building teams the later seasons. Rankings use each team’s best 9 healthy players this season and best 9 in two years (with picks). The injury setting on the Dynasty tab applies.</p>`;
  };

  const draw = () => {
    fix();
    box.innerHTML = `
      <div class="ev-bar">
        <div class="st-stage ev-n">${[2, 3].map(n => `<a href="#" data-n="${n}" class="${st.n === n ? 'on' : ''}">${n} teams</a>`).join('')}</div>
        <button type="button" class="ev-clear">Clear trade</button>
      </div>
      <div class="ev-teams ev-n${st.n}">${st.teams.map(sideCard).join('')}</div>
      ${results()}`;
    box.querySelectorAll('[data-n]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); st.n = Number(a.dataset.n); draw(); }));
    $('.ev-clear', box).addEventListener('click', () => { st.legs = []; draw(); });
    box.querySelectorAll('[data-team]').forEach(sel => sel.addEventListener('change', () => { st.teams[Number(sel.dataset.team)] = sel.value; draw(); }));
    box.querySelectorAll('[data-add]').forEach(sel => sel.addEventListener('change', () => {
      if (!sel.value) return;
      const from = sel.dataset.add;
      st.legs.push({ id: sel.value, from, to: st.teams.find(o => o !== from) });
      draw();
    }));
    box.querySelectorAll('[data-to]').forEach(sel => sel.addEventListener('change', () => { const l = st.legs.find(x => x.id === sel.dataset.to); if (l) l.to = sel.value; draw(); }));
    box.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', () => { st.legs = st.legs.filter(l => l.id !== b.dataset.remove); draw(); }));
  };
  draw();
}

async function renderTrades(body, params) {
  const { season, me, f, v } = await gmDynasty(params);
  if (route().page !== 'commish') return;
  const c = tradeContext(DATA, v, f.rosters, me);
  if (!c.assets[me]) {
    body.innerHTML = `<div class="gm-page">${gmTeamPick(me, season, 'trades')}<section class="card soon-card"><p>No roster found for this team.</p></section></div>`;
    bindTeamPick(body);
    return;
  }
  const blockKey = `gm-block-${me}`;
  const block = gmLoad(blockKey, []);
  const mode = ['get', 'need', 'sell', 'eval'].includes(params.get('mode')) ? params.get('mode') : 'get';
  const modeChips = `<div class="st-stage tf-modes">${[['get', 'Get a player'], ['need', 'Fill a need'], ['sell', 'Sell a player'], ['eval', 'Evaluate a trade']].map(([id, l]) => `<a href="#/commish?${new URLSearchParams({ tab: 'trades', ...(me === COMMISH ? {} : { team: me }), mode: id })}" class="${id === mode ? 'on' : ''}">${l}</a>`).join('')}</div>`;
  if (mode === 'eval') {
    body.innerHTML = `<div class="gm-page">${gmTeamPick(me, season, 'trades')}${modeChips}<div id="tf-eval"></div></div>`;
    bindTeamPick(body);
    renderEvaluator($('#tf-eval', body), { season, me, f, v });
    return;
  }
  const hash = extra => `#/commish?${new URLSearchParams({ tab: 'trades', ...(me === COMMISH ? {} : { team: me }), mode, ...extra })}`;
  const owners = Object.keys(c.assets).filter(o => o !== me).sort((a, b) => name(a).localeCompare(name(b)));
  const assetName = a => `${a.name} · ${a.score}`;
  const findAsset = id => Object.values(c.allAssets).flat().find(a => a.id === id);
  // Filters (Get a player / Fill a need): leave your picks out, and (Fill a need) a target tier.
  const noPicks = params.get('picks') === 'no';
  const pickChips = keep => `<div class="st-stage tf-filter"><span class="tf-filter-l">Your picks</span>${[['', 'Can be used'], ['no', 'Keep my picks']].map(([id, l]) => `<a href="${hash({ ...keep, ...(id ? { picks: id } : {}) })}" class="${(id === 'no') === noPicks ? 'on' : ''}">${l}</a>`).join('')}</div>`;

  // Pickers for each mode.
  let picker = '';
  let offers = [];
  let note = '';
  if (mode === 'get') {
    const target = findAsset(params.get('target'));
    picker = `<label class="hy-pick cm-pick"><span class="hy-pick-label">Get</span><span class="ed-select"><span class="hy-pick-val">${target ? esc(target.name) : 'Choose a player'}</span>
      <svg class="caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5l3-3"/></svg>
      <select class="tf-select" data-key="target"><option value="">Choose a player…</option>${owners.map(o => `<optgroup label="${esc(name(o))}">${c.allAssets[o].map(a => `<option value="${esc(a.id)}"${target?.id === a.id ? ' selected' : ''}>${esc(assetName(a))}</option>`).join('')}</optgroup>`).join('')}</select></span></label>`;
    picker += pickChips(target ? { target: target.id } : {});
    if (target) offers = offersFor(c, target, { block, limit: 4, noPicks });
    const tierName = target?.kind === 'player' ? `, ${TIER_SHORT[SCORE_TIERS.findIndex(([min]) => target.score >= min)]}` : '';
    note = target ? (offers.length ? `Offers from your roster for ${esc(target.name)} (${target.score}${tierName})${noPicks ? ', without your picks' : ''}.` : `No fair offer from your roster for ${esc(target.name)}${noPicks ? ' without your picks' : ''}: you’d have to give more than 3 pieces, ${target.score >= CENTERPIECE.at(-1)[0] ? 'you have no single piece big enough to headline it, ' : ''}or he’s worth more than your best package.`) : 'Pick any player (or pick) on another team to see what it would take.';
  } else if (mode === 'need') {
    const pos = ['G', 'F', 'C'].includes(params.get('pos')) ? params.get('pos') : 'G';
    // Tier = index into SCORE_TIERS (Replaceable left out); range = [its min, next tier up's min).
    const ti = Number(params.get('tier'));
    const tierIdx = params.get('tier') != null && Number.isInteger(ti) && ti >= 0 && ti < SCORE_TIERS.length - 1 ? ti : null;
    const tier = tierIdx == null ? null : [SCORE_TIERS[tierIdx][0], tierIdx ? SCORE_TIERS[tierIdx - 1][0] - 0.01 : 100];
    const tierKeep = tierIdx == null ? {} : { tier: tierIdx };
    const picksKeep = noPicks ? { picks: 'no' } : {};
    picker = `<div class="st-stage tf-pos">${[['G', 'Guard'], ['F', 'Forward'], ['C', 'Center']].map(([id, l]) => `<a href="${hash({ pos: id, ...tierKeep, ...picksKeep })}" class="${id === pos ? 'on' : ''}">${l}</a>`).join('')}</div>
      <div class="st-stage tf-filter tf-tiers"><span class="tf-filter-l">Target</span><a href="${hash({ pos, ...picksKeep })}" class="${tierIdx == null ? 'on' : ''}">Any upgrade</a>${TIER_SHORT.slice(0, -1).map((l, i) => `<a href="${hash({ pos, tier: i, ...picksKeep })}" class="${i === tierIdx ? 'on' : ''}">${l}</a>`).join('')}</div>
      ${pickChips({ pos, ...tierKeep })}`;
    const r = offersForNeed(c, pos, { block, noPicks, tier });
    offers = r.offers;
    const posName = pos === 'G' ? 'guard' : pos === 'F' ? 'forward' : 'center';
    note = tier
      ? `${TIER_SHORT[tierIdx]} ${posName}s (score ${SCORE_TIERS[tierIdx][0]}${tierIdx ? `–${SCORE_TIERS[tierIdx - 1][0] - 1}` : '+'}) on other teams, each with its best fair offer${noPicks ? ' without your picks' : ''}, best for you first. At a chosen level they don’t have to beat your weakest starter (${num(r.bar)} a game); “+N a game” shows when one would.${offers.length ? '' : ` None found${tierIdx < 2 ? ': nobody at this level, or no piece on your roster big enough to headline the deal' : ''}.`}`
      : `Players on other teams who’d start for you at ${posName} (better this season than your weakest starter there, ${num(r.bar)} a game), each with its best fair offer${noPicks ? ' without your picks' : ''}, best for you first.${offers.length ? '' : ' None found.'}`;
  } else {
    const sell = c.assets[me].find(a => a.id === params.get('sell'));
    picker = `<label class="hy-pick cm-pick"><span class="hy-pick-label">Sell</span><span class="ed-select"><span class="hy-pick-val">${sell ? esc(sell.name) : 'Choose one of yours'}</span>
      <svg class="caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5l3-3"/></svg>
      <select class="tf-select" data-key="sell"><option value="">Choose one of yours…</option>${c.assets[me].map(a => `<option value="${esc(a.id)}"${sell?.id === a.id ? ' selected' : ''}>${esc(assetName(a))}</option>`).join('')}</select></span></label>`;
    if (sell) offers = offersToSell(c, sell).slice(0, 8);
    note = sell ? (offers.length ? `The best fair returns for ${esc(sell.name)} (${sell.score}) from each team, best for your timeline first.` : `No fair return found for ${esc(sell.name)}.`) : 'Pick one of your players (or picks) to see what other teams could give.';
  }

  const assetRow = a => `<li><span>${esc(a.name)} ${a.kind === 'player' ? tierTag(a.score) : ''} ${a.prospect ? prospectChip({ prospect: a.prospect }) : ''}${a.where === 'taxi' ? ' <span class="cm-pill">Taxi</span>' : ''}<small>${a.kind === 'pick' ? 'Rookie pick' : esc([a.pos, a.age != null ? `age ${a.age}` : ''].filter(Boolean).join(' · '))}</small>${a.kind === 'player' ? contractLine(v.players[a.id]) : ''}</span><b>${a.score}</b></li>`;
  const card = o => {
    const share = Math.round(100 * o.giveTV / (o.giveTV + o.getTV));
    return `
    <section class="card tf-offer">
      <div class="card-head"><h2>${esc(name(o.partner))}</h2><span class="cm-pill ${LABEL_CLS[o.lab] ?? ''}">${esc(o.lab)}</span>${o.upgrade > 0 ? `<span class="card-sub">+${o.upgrade} a game at the spot</span>` : ''}</div>
      <div class="tf-sides">
        <div><div class="tf-side-head">You give <b>${Math.round(o.giveTV)}</b></div><ol class="aw-race">${o.give.map(assetRow).join('')}</ol></div>
        <div><div class="tf-side-head">You get <b>${Math.round(o.getTV)}</b></div><ol class="aw-race">${o.get.map(assetRow).join('')}</ol></div>
      </div>
      <div class="tf-balance" aria-label="Value given vs received"><i style="width:${share}%"></i></div>
      <ul class="tf-why">${o.why.map(w => `<li>${esc(w)}</li>`).join('')}</ul>
      <p class="tf-mine">On your timeline: <b class="${o.myGain >= 0 ? 'dy-up' : 'dy-down'}">${o.myGain >= 0 ? '+' : ''}${num(o.myGain)}</b>${o.onBlock ? ` · uses ${o.onBlock} player${o.onBlock === 1 ? '' : 's'} from your trade block` : ''}</p>
      <button type="button" class="tf-eval-btn" data-i="${offers.indexOf(o)}">Open in Evaluate a trade ›</button>
    </section>`;
  };
  const blockList = c.assets[me].filter(a => a.kind === 'player').slice(0, 30);

  body.innerHTML = `<div class="gm-page">
    ${gmTeamPick(me, season, 'trades')}
    ${modeChips}
    ${picker}
    <p class="filter-note">${note} <a href="#/commish?tab=dynasty&guide=1${me === COMMISH ? '' : `&team=${me}`}">What do the scores mean?</a></p>
    ${offers.length ? `<div class="mg-grid tf-grid">${offers.map(card).join('')}</div>` : ''}
    <section class="card">
      <details${block.length ? '' : ' open'}><summary class="dy-guide-sum"><h2>Your trade block</h2><span class="card-sub">${block.length} player${block.length === 1 ? '' : 's'} · saved on this device</span></summary>
        <p class="cm-rule">Sleeper’s trade block isn’t public, so keep yours here. Offers use these players first.</p>
        <div class="tf-block">${blockList.map(a => `<label class="${block.includes(a.id) ? 'on' : ''}"><input type="checkbox" value="${esc(a.id)}"${block.includes(a.id) ? ' checked' : ''}> ${esc(a.name)} <b>${a.score}</b></label>`).join('')}</div>
      </details>
    </section>
    <section class="card">
      <div class="card-head"><h2>How offers are built</h2></div>
      <p class="cm-rule">Each offer is fair on the standard dynasty value (within about 5–20%), counting that scores don’t simply add: a package is worth less than its total (two 30s ≈ one ${Math.round(packageValue([30, 30]))}), and a team taking on extra players needs 5% more per player. It also has to work for the other team on <b>their</b> timeline: a win-now team counts this season 70%, a building team counts the later seasons 80%. That gap is where trades both sides like come from. Up to 3 pieces a side, from each team’s ${28} most valuable assets.</p>
      <p class="cm-rule">Big targets need a real headliner: one piece you give must be worth at least ${CENTERPIECE.map(([min, share]) => `${Math.round(share * 100)}% of a ${TIER_SHORT[SCORE_TIERS.findIndex(t => t[0] === min)]} (${min}+)`).join(', ')}, so a pile of bench players never buys a star. “Keep my picks” builds offers from players only. “Open in Evaluate a trade” loads an offer into the evaluator to see how it changes both teams and the league.</p>
      <p class="cm-rule">“On your timeline” is the same check from your side (${esc(v.outlook[me]?.label ?? '')}). These are starting points: injuries, roster spots and personalities still matter.</p>
    </section></div>`;

  bindTeamPick(body);
  body.querySelectorAll('.tf-select').forEach(sel => sel.addEventListener('change', () => { location.hash = hash({ [sel.dataset.key]: sel.value }); }));
  // Hand an offer to the evaluator (same asset ids), then switch modes.
  body.querySelectorAll('.tf-eval-btn').forEach(b => b.addEventListener('click', () => {
    const o = offers[Number(b.dataset.i)];
    if (!o) return;
    gmSave('gm-eval', { n: 2, teams: [me, o.partner], legs: [
      ...o.give.map(a => ({ id: a.id, from: me, to: o.partner })),
      ...o.get.map(a => ({ id: a.id, from: o.partner, to: me })),
    ] });
    location.hash = `#/commish?${new URLSearchParams({ tab: 'trades', ...(me === COMMISH ? {} : { team: me }), mode: 'eval' })}`;
    window.scrollTo(0, 0);
  }));
  body.querySelectorAll('.tf-block input').forEach(cb => cb.addEventListener('change', () => {
    const now = [...body.querySelectorAll('.tf-block input:checked')].map(x => x.value);
    gmSave(blockKey, now);
    renderTrades(body, params).catch(() => {});
  }));
}

async function renderManagers(body, params) {
  const { season, me, f, v } = await gmDynasty(params);
  if (route().page !== 'commish') return;
  const fo = ledger();
  const psNow = positionStrength(v, f.rosters, 'now');
  const psLater = positionStrength(v, f.rosters, 'later');
  const grades = draftGrades(DATA);
  const owners = DATA.seasons.at(-1).teams.map(t => t.owner);
  const cards = reportCards(grades, owners);
  const acts = Object.fromEntries(activity(DATA).map(a => [a.owner, a]));
  const birth = f.birth ?? {};
  const stats = owners.map(o => {
    const trades = fo.trades.filter(x => x.owners.includes(o));
    const sides = trades.map(x => x.sides.find(sd => sd.o === o)).filter(Boolean);
    const net = sides.reduce((a, sd) => a + sd.net, 0);
    const won = sides.filter(sd => sd.net > 0).length;
    const partners = {};
    for (const x of trades) for (const p of new Set(x.owners)) if (p !== o) partners[p] = (partners[p] ?? 0) + 1;
    const withMe = trades.filter(x => x.owners.includes(me) && o !== me).map(x => x.sides.find(sd => sd.o === o)?.net ?? 0);
    const moves = (DATA.transactions ?? []).filter(x => ['waiver', 'free_agent'].includes(x.type) && Object.values(x.adds ?? {}).includes(o));
    const faab = moves.filter(x => x.s === season && x.bid != null).reduce((a, x) => a + x.bid, 0);
    const myPicks = grades.picks.filter(p => p.kind === 'rookie' && p.o === o);
    const pos = {};
    for (const p of myPicks) { const g = (DATA.players?.[p.pid]?.pos ?? '').replace(/^(PG|SG)$/, 'G').replace(/^(SF|PF)$/, 'F'); if (g) pos[g] = (pos[g] ?? 0) + 1; }
    const ages = myPicks.map(p => (birth[p.pid] ? (new Date(`${p.s}-06-25`) - new Date(birth[p.pid])) / (365.25 * 864e5) : null)).filter(x => x != null);
    const games = DATA.games.filter(g => (g.a === o && g.b === me) || (g.a === me && g.b === o));
    const h2h = games.reduce((r, g) => { const mine = g.a === o ? g.ap : g.bp; const theirs = g.a === o ? g.bp : g.ap; r[mine > theirs ? 0 : mine < theirs ? 1 : 2]++; return r; }, [0, 0, 0]);
    return {
      o, trades: trades.length, tradesNow: trades.filter(x => x.s === season).length, net: Math.round(net), won, lost: sides.filter(sd => sd.net < 0).length,
      partners: Object.entries(partners).sort((a, b) => b[1] - a[1]), withMe: Math.round(withMe.reduce((a, b) => a + b, 0)), withMeN: withMe.length,
      moves: moves.length, movesNow: moves.filter(x => x.s === season).length, faab,
      card: cards.find(c => c.owner === o), pos, draftAge: ages.length ? ages.reduce((a, b) => a + b, 0) / ages.length : null,
      act: acts[o], out: v.outlook[o], h2h,
    };
  });
  const rankOf = (key, o) => [...stats].sort((a, b) => b[key] - a[key]).findIndex(s => s.o === o) + 1;

  // Startup draft: how many of each manager's own startup picks are on his roster today
  // (taxi and IR count). "Came back" = he traded or dropped the player at some point.
  const startup = (DATA.drafts ?? []).find(d => d.kind === 'startup');
  const onRoster = Object.fromEntries((f.rosters ?? []).map(r => [r.owner_id, new Set([...(r.players ?? []), ...(r.taxi ?? []), ...(r.reserve ?? [])])]));
  const holderOf = pid => (f.rosters ?? []).find(r => onRoster[r.owner_id].has(pid))?.owner_id ?? null;
  const pname = pid => v.players[pid]?.name ?? DATA.players?.[pid]?.n ?? `Player ${pid}`;
  const loyalty = startup ? owners.map(o => {
    const picks = startup.picks.filter(p => p.o === o).sort((a, b) => a.no - b.no);
    const kept = picks.filter(p => onRoster[o]?.has(p.pid)).map(p => ({ ...p, back: (DATA.transactions ?? []).some(x => x.drops?.[p.pid] === o) }));
    const gone = picks.filter(p => !onRoster[o]?.has(p.pid)).map(p => ({ ...p, now: holderOf(p.pid) }));
    return { o, picks: picks.length, kept, gone, pct: picks.length ? kept.length / picks.length : 0 };
  }).sort((a, b) => b.pct - a.pct || b.kept.length - a.kept.length) : [];
  const loyaltyOf = Object.fromEntries(loyalty.map(l => [l.o, l]));
  const leagueKept = loyalty.reduce((a, l) => a + l.kept.length, 0);
  const leaguePicks = loyalty.reduce((a, l) => a + l.picks, 0);
  const pctText = x => `${Math.round(x * 100)}%`;
  const loyaltyCard = startup ? `
    <section class="card">
      <div class="card-head"><h2>Startup draft: still on the team</h2><span class="card-sub">${startup.s} startup · league: ${leagueKept} of ${leaguePicks} (${pctText(leagueKept / (leaguePicks || 1))})</span></div>
      <ol class="aw-race mg-loyal">${loyalty.map(l => `
        <li class="${l.o === me ? 'cm-me' : ''}">
          <details>
            <summary><span><b>${esc(name(l.o))}</b><small>${l.kept.length} of ${l.picks} startup picks still on his roster</small></span><span class="dy-val"><span class="dy-bar" aria-hidden="true"><i style="width:${Math.round(l.pct * 100)}%"></i></span><b class="dy-score">${pctText(l.pct)}</b></span></summary>
            <p class="mg-kept"><b>Still there:</b> ${l.kept.length ? l.kept.map(p => `${esc(pname(p.pid))} <small>(${p.round}.${String(p.no - (p.round - 1) * 8).padStart(2, '0')}${p.back ? ', came back' : ''})</small>`).join(', ') : 'nobody'}</p>
            <p class="mg-kept"><b>Gone:</b> ${l.gone.length ? l.gone.map(p => `${esc(pname(p.pid))} <small>(${p.now ? `now ${esc(name(p.now))}` : 'not on a roster'})</small>`).join(', ') : 'nobody'}</p>
          </details>
        </li>`).join('')}</ol>
      <p class="cm-rule">Each manager’s own picks in the ${startup.s} startup draft (picks traded during the draft go with whoever made them) that are on his roster today, taxi and IR included. “Came back” = he moved the player at some point and got him back. Tap a manager for the list.</p>
    </section>` : '';

  // Blunt one-liners (the owner asked for blunt).
  const summary = s => {
    const bits = [];
    if (!s.trades) bits.push('Has never made a trade.');
    else {
      const busy = rankOf('trades', s.o);
      bits.push(`${busy === 1 ? 'The league’s busiest trader' : busy <= 3 ? 'Trades a lot' : busy >= 7 ? 'Barely trades' : 'Trades now and then'} (${s.trades})${s.partners[0] ? `, mostly with ${name(s.partners[0][0])}` : ''}.`);
      bits.push(s.net > 150 ? `Usually wins trades on value (+${num(s.net)} locked points).` : s.net < -150 ? `Usually loses trades on value (${num(s.net)} locked points).` : 'Breaks about even on trades.');
    }
    const wire = rankOf('moves', s.o);
    if (wire <= 2) bits.push('Lives on the waiver wire.');
    else if (wire >= 7) bits.push('Rarely touches the waiver wire.');
    if (s.card?.grade) bits.push(`Draft report card: ${s.card.grade}.`);
    const lab = s.out?.label;
    if (lab === 'Contender' || lab === 'Win now') bits.push('Built to win now: a buyer for proven players, will pay in picks and prospects.');
    else if (lab === 'Rising' || lab === 'Rebuilding') bits.push('Building for later: likely to sell veterans for picks and young players.');
    else if (lab === 'Fading') bits.push('Roster is aging out: could cash in veterans before they slide.');
    if (DATA.seasons.at(-1).weeksPlayed && s.act?.days != null && s.act.days > 21) bits.push(`Hasn’t made a move in ${s.act.days} days.`); // in season only
    return bits.join(' ');
  };
  const card = s => `
    <section class="card mg-card${s.o === me ? ' mg-me' : ''}">
      <div class="card-head"><h2>${esc(name(s.o))}${s.o === me ? ' <small>(you)</small>' : ''}</h2><span class="cm-pill ${LABEL_CLS[s.out?.label] ?? ''}">${esc(s.out?.label ?? '')}</span></div>
      <p class="card-sub">${esc(teamName(s.o, season))}</p>
      <p class="mg-sum">${esc(summary(s))}</p>
      <dl class="mg-stats">
        <div><dt>Trades</dt><dd>${s.trades} <small>${s.tradesNow} this season · ${s.won} won, ${s.lost} lost on value</small></dd></div>
        <div><dt>Trade value</dt><dd>${s.net > 0 ? '+' : ''}${num(s.net)} <small>locked points, all trades</small></dd></div>
        ${s.o !== me ? `<div><dt>With you</dt><dd>${s.withMeN ? `${s.withMe > 0 ? '+' : ''}${num(s.withMe)}` : '–'} <small>${s.withMeN ? `their net in ${s.withMeN} trade${s.withMeN === 1 ? '' : 's'} with you` : 'never traded with you'}</small></dd></div>` : ''}
        <div><dt>Waiver/FA adds</dt><dd>${s.moves} <small>${s.movesNow} this season${s.faab ? ` · $${s.faab} FAAB spent` : ''}</small></dd></div>
        <div><dt>Drafting</dt><dd>${s.card?.grade ?? '–'} <small>${Object.entries(s.pos).sort((a, b) => b[1] - a[1]).map(([p, n]) => `${n} ${p}`).join(', ') || 'no rookie picks'}${s.draftAge ? ` · avg age ${num(s.draftAge)} at the draft` : ''}</small></dd></div>
        ${loyaltyOf[s.o] ? `<div><dt>Startup picks</dt><dd>${pctText(loyaltyOf[s.o].pct)} <small>${loyaltyOf[s.o].kept.length} of ${loyaltyOf[s.o].picks} still on the team · No. ${loyalty.indexOf(loyaltyOf[s.o]) + 1} in the league</small></dd></div>` : ''}
        <div><dt>Needs</dt><dd class="mg-needs">${needChips(teamNeeds(v, f.rosters, s.o, psNow, psLater))}</dd></div>
        <div><dt>Roster</dt><dd>No. ${s.out?.totalRank ?? '–'} <small>dynasty value · avg age ${s.out?.age ?? '–'} · now No. ${s.out?.nowRank ?? '–'}, in 2 yrs No. ${s.out?.laterRank ?? '–'}</small></dd></div>
        ${s.o !== me ? `<div><dt>Vs you</dt><dd>${s.h2h[0]}–${s.h2h[1]}${s.h2h[2] ? `–${s.h2h[2]}` : ''} <small>their record against you, all games</small></dd></div>` : ''}
        <div><dt>Last move</dt><dd>${s.act?.days == null ? '–' : s.act.days === 0 ? 'Today' : `${s.act.days} day${s.act.days === 1 ? '' : 's'} ago`}${s.act?.days == null ? ' <small>no moves yet</small>' : ''}</dd></div>
      </dl>
    </section>`;
  const order = [...stats].sort((a, b) => (a.o === me) - (b.o === me) || (b.out?.total ?? 0) - (a.out?.total ?? 0));
  body.innerHTML = `<div class="gm-page">
    ${gmTeamPick(me, season, 'managers')}
    ${loyaltyCard}
    <div class="mg-grid">${order.map(card).join('')}</div>
    <p class="filter-note">Trade value is the Front Office’s: locked points each side got from the players (and picks) in a trade, so recent trades are still changing. Waiver numbers count adds through waivers and free agency. FAAB spending shows once Sleeper records waiver bids (saved from 2026–27 on). Outlook labels and roster ranks come from the Dynasty tab.</p>
  </div>`;
  bindTeamPick(body);
}

// ---- Waiver wire: players on no roster worth a look ----

async function renderWaivers(body, params) {
  const at = (await scoutWeek()) ?? { season: DATA.seasons.at(-1).season, week: 1, started: false };
  const [ctx, extra, dyn] = await Promise.all([
    loadWeek(DATA, at.season, at.week), loadWaivers(at.season, at.week, at.started),
    loadDynastyFeeds().then(f => dynastyValues(DATA, f, { fullInjured: gmLoad('gm-dyn-full', false) })).catch(() => null),
    loadContracts(),
  ]);
  if (route().page !== 'commish') return;
  const pos = ['G', 'F', 'C'].includes(params.get('pos')) ? params.get('pos') : 'all';
  const size = params.get('n') === '30' ? 30 : 10;
  const dy = p => dyn?.players[p.pid];
  // Position filter: main Sleeper position, plus players who can also play there (marked).
  const groupsOf = p => posGroups({ pos: p.pos, fpos: dy(p)?.fpos ?? p.fpos });
  const isSec = p => pos !== 'all' && groupsOf(p).main !== pos && groupsOf(p).sec.includes(pos);
  const fits = p => pos === 'all' || groupsOf(p).main === pos || isSec(p);
  const all = waiverWire(DATA, ctx, extra).filter(p => !p.out && fits(p));
  // Dynasty pickups and prospects: every unrostered player (Out ones too: they can be stashed).
  const free = dyn ? Object.values(dyn.players).filter(p => !p.owner && fits(p)) : [];
  const stash = free.filter(p => p.team).sort((a, b) => b.raw - a.raw).slice(0, size);
  const chanceSum = q => q.rotation + q.starter + q.star;
  // League top-100 prospect ranks (Prospects tab); the wire list follows the same order.
  const pRank = dyn ? Object.fromEntries(prospectRanking(dyn).map((p, i) => [p.pid, i + 1])) : {};
  const rankChip = pid => (pRank[pid] ? `<a class="pr-chip" href="#/commish?tab=prospects&show=free" title="League prospect rank">#${pRank[pid]}</a> ` : '');
  const prospects = free.filter(p => p.prospect).sort((a, b) => (pRank[a.pid] ?? 999) - (pRank[b.pid] ?? 999) || chanceSum(b.prospect) - chanceSum(a.prospect)).slice(0, size);
  const top = rows => rows.slice(0, size);
  const risers = top(all.filter(p => p.recentGames >= 2 && p.recent >= 20 && p.jump >= 5).sort((a, b) => b.jump - a.jump));
  const trending = top(all.filter(p => p.adds > 0).sort((a, b) => b.adds - a.adds));
  const best = top(all.filter(p => (p.gp >= 5 ? p.fpg : p.fpgLast) != null).sort((a, b) => (b.gp >= 5 ? b.fpg : b.fpgLast) - (a.gp >= 5 ? a.fpg : a.fpgLast)));
  const streams = top(all.filter(p => p.proj > 0).sort((a, b) => b.proj - a.proj));
  // Same read as the Dynasty roster: every position he can play, age, dynasty score + trend,
  // and his rotation / starter / star chances 3 seasons out.
  const secNote = p => (isSec(p) ? ` · <span class="dy-sec">secondary position: ${POS_WORD[pos][0]}</span>` : '');
  const dynLine = d => (d ? ` · dynasty ${d.score} ${trendOf(d)}${projNote(d)}` : '');
  const chanceLine = d => (d?.chances ? `<small class="dy-chances">In 3 seasons: ${chances(d.chances)}</small>` : '') + contractLine(d);
  const meta = p => esc([posText({ pos: p.pos, fpos: dy(p)?.fpos }), p.team || 'No team', dy(p)?.age != null ? `age ${dy(p).age}` : '', p.games ? `${p.games} game${p.games === 1 ? '' : 's'} this week` : 'no games this week'].filter(Boolean).join(' · ')) + secNote(p);
  // Tap a player (one with a dynasty value) for his score chart, same as the Dynasty roster.
  const chartAttrs = d => (d ? ` class="dy-row" data-pid="${esc(d.pid)}" tabindex="0" role="button" aria-expanded="false"` : '');
  const rows = (list, value, extraLine) => (list.length ? `<ol class="aw-race">${list.map((p, i) => `
    <li${chartAttrs(dy(p))}><span>${i + 1}. ${rankChip(p.pid)}${esc(p.name)} ${dy(p) ? tierTag(dy(p).score) : ''} ${prospectChip(dy(p))} ${injuryTag(p)}<small>${meta(p)}${extraLine ? ` · ${esc(extraLine(p))}` : ''}${dynLine(dy(p))}</small>${chanceLine(dy(p))}</span><b>${value(p)}</b></li>`).join('')}</ol>`
    : '<p class="empty">Nobody fits right now.</p>');
  const dynRows = (list, value, line) => (list.length ? `<ol class="aw-race">${list.map((p, i) => `
    <li${chartAttrs(p)}><span>${i + 1}. ${rankChip(p.pid)}${esc(p.name)} ${tierTag(p.score)} ${prospectChip(p)} ${injuryTag(p)}<small>${esc([posText(p), p.team || 'No NBA team', p.age != null ? `age ${p.age}` : ''].filter(Boolean).join(' · '))}${secNote(p)} · ${line(p)}${projNote(p)}</small>${chanceLine(p)}</span>${value(p)}</li>`).join('')}</ol>`
    : `<p class="empty">${dyn ? 'Nobody fits right now.' : 'Couldn’t load dynasty values.'}</p>`);
  const link = (p, n) => `#/commish?${new URLSearchParams({ tab: 'waivers', ...(p === 'all' ? {} : { pos: p }), ...(n === 30 ? { n: 30 } : {}) })}`;
  const chips = [['all', 'All'], ['G', 'Guards'], ['F', 'Forwards'], ['C', 'Centers']].map(([id, label]) =>
    `<a class="${id === pos ? 'on' : ''}" href="${link(id, size)}">${label}</a>`).join('');
  const sizeChips = [10, 30].map(n => `<a class="${n === size ? 'on' : ''}" href="${link(pos, n)}">Top ${n}</a>`).join('');

  body.innerHTML = `
    <div class="cm-pickers"><div class="st-stage cm-pos">${chips}</div><div class="st-stage cm-pos cm-size">${sizeChips}</div></div>
    <p class="filter-note">Players on no roster in this league, ${at.started ? `week ${at.week}` : `before week ${at.week}`}. Players listed Out are hidden (except in the two dynasty lists). Position filters use his main Sleeper position plus anyone who can also play there, marked “secondary position”. Each player shows his dynasty score, its 2-season trend and his chances 3 seasons from now of being a rotation player (top 120), a starter (top 72) or a star (top 24), same as the Dynasty roster; tap a player for his dynasty score over time. Recently dropped players stay on waivers for ${ctx.league?.settings?.waiver_clear_days ?? 2} days before they’re free agents.</p>
    <div class="cm-races">
      <section class="card"><div class="card-head"><h2>Dynasty pickups</h2><a class="gm-more" href="#/commish?tab=dynasty">Dynasty →</a></div>
        <p class="cm-rule">Best unrostered players by 3-season value (this season 50%, next 30%, the one after 20%; players listed Out included, they can be stashed). Big number = dynasty score.</p>
        ${dynRows(stash, p => `<span class="dy-val">${scoreBar(p.score)}</span>`, p => `${num(p.raw)} a game over 3 seasons · ${trendOf(p) || 'no projection'}`)}
      </section>
      <section class="card"><div class="card-head"><h2>Prospects on the wire</h2></div>
        <p class="cm-rule">Unrostered players 24 and under in league prospect order (<b>#N</b> = rank in the league-wide Top ${PROSPECT_LIST}, on every list here): grade first, then their chances 3 seasons from now of being a rotation player (top 120), a starter (top 72) or a star (top 24). Taxi-eligible: worth a look when you clear a spot.</p>
        ${dynRows(prospects, p => prospectChip(p), p => `dynasty ${p.score} ${trendOf(p)}`)}
      </section>
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
  if (dyn) bindScoreCharts(body, dyn);
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
  // Views (owner, Oct 2026): the summary, or the real Matchup Hype page / Home page drawn as
  // they'll look once the week starts (same code as the public pages, no live scores).
  const view = ['page', 'home'].includes(params.get('view')) ? params.get('view') : 'summary';
  const go = (w, v) => `#/commish?${new URLSearchParams({ tab: 'hype', week: w, ...(v === 'summary' ? {} : { view: v }) })}`;
  const controls = `
    <div class="cm-pickers">
      <label class="hy-pick cm-pick">
        <span class="hy-pick-label">Week</span>
        <span class="ed-select"><span class="hy-pick-val">Week ${week}</span>
          <svg class="caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5l3-3"/></svg>
          <select id="cm-week" aria-label="Week">${future.map(w => `<option value="${w}"${w === week ? ' selected' : ''}>Week ${w}${w === future[0] ? ' (next to be revealed)' : ''}</option>`).join('')}</select>
        </span>
      </label>
      <div class="st-stage cm-preview-tabs">${[['summary', 'Summary'], ['page', 'Hype page'], ['home', 'Home']].map(([id, l]) => `<a href="${go(week, id)}" class="${id === view ? 'on' : ''}">${l}</a>`).join('')}</div>
    </div>`;
  const notPublic = `<p class="hy-banner">${icon('lock')}<span><b>Not public yet.</b> Week ${week} is revealed to everyone ${week === 1 && HYPE_NOW.reveal ? `on ${esc(prettyDate(HYPE_NOW.reveal))}` : 'when it starts'}. ${weeksAway > 1 ? `This preview uses only the results so far; ${weeksAway - 1} more week${weeksAway - 1 === 1 ? '' : 's'} will be played first, so the hype can change by then.` : 'It uses the same results the announcement will, so this is very likely what everyone will see.'}</span></p>`;
  if (view !== 'summary') {
    body.innerHTML = `${controls}${notPublic}
      <p class="filter-note">${view === 'page' ? 'Exactly the Matchup Hype page as it will open in week ' + week + ', with scores at 0 until tip-off. Pick any matchup below.' : 'The Home page as it will look in week ' + week + ': the Main event is that week’s; the other cards show today’s numbers.'}</p>
      <div class="cm-preview" id="cm-prev"></div>`;
    $('#cm-week', body)?.addEventListener('change', e => { location.hash = go(e.target.value, view); });
    const box = $('#cm-prev', body);
    if (view === 'page') await renderHype(box, params, week);
    else renderHome(box, week);
    return;
  }

  body.innerHTML = `
    ${controls}
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
            <span class="cm-parts">${HYPE_PARTS.map(p => `${p.name} ${Math.round(x.parts[p.id])}`).join(' · ')}${x.rivalry ? ` · ${esc(x.rivalry.name)} +${x.rivalry.bonus}` : ''}</span></span>
          <span class="hy-g-hype"><b>${x.hype}</b><small>Hype</small></span>
        </div>`).join('')}
    </section>`;
  $('#cm-week', body)?.addEventListener('change', e => { location.hash = go(e.target.value, view); });
}

// Projection log (data/projection-log.json, written by every nightly run): how often Sleeper's
// season projections (from Rotowire) really change, and who moved most.
function projectionLogCard(log, when) {
  const runs = (log?.runs ?? []).filter(r => r.changed != null);
  const head = '<div class="card-head"><h2>Projection updates</h2><span class="card-sub">Sleeper’s season projections, checked every nightly run</span></div>';
  if (!runs.length) return `<section class="card">${head}<p class="empty">${log ? 'The first run saved a starting point; changes show from the next run.' : 'Starts with the next nightly run.'}</p></section>`;
  const days = new Set(runs.map(r => when(r.at).split(',')[0]));
  const changedDays = new Set(runs.filter(r => r.changed).map(r => when(r.at).split(',')[0]));
  const stamps = [...new Set(runs.map(r => r.stamp).filter(Boolean))].slice(-3).map(s => esc(when(s))).join(', ');
  const fmt = x => num(x);
  return `<section class="card">${head}
    <p class="cm-rule">Changes found on <b>${changedDays.size} of ${days.size} day${days.size === 1 ? '' : 's'}</b> logged (${runs.length} run${runs.length === 1 ? '' : 's'}). Sleeper’s latest batch times: ${stamps || 'unknown'} CT. A change = a player’s projected fantasy points per game moved by 0.05 or more since the run before.</p>
    <ul class="cm-checks">${runs.slice(-12).reverse().map(r => `<li><b>${esc(when(r.at))}</b> <small>${r.changed ? `${r.changed} of ${r.total} changed (avg ${fmt(r.avg)} a game)` : `no changes (${r.total} players)`}${r.added ? ` · ${r.added} new` : ''}${r.removed ? ` · ${r.removed} gone` : ''}</small>${r.movers?.length ? `<span class="cm-issues">${r.movers.slice(0, 5).map(([, n, a, b]) => `${esc(n)} ${fmt(a)} → ${fmt(b)}`).join(' · ')}</span>` : ''}</li>`).join('')}</ul>
  </section>`;
}

// Draft Scout (data/draft-scout.json, built weekly on Sundays): is the build fresh, did every source
// read, which college stats were used, are all 3 classes there, and is the weekly history growing.
function scoutHealthCard(sc, ok) {
  const head = '<div class="card-head"><h2>Draft Scout</h2><span class="card-sub">Built weekly (Sundays) · <a href="#/commish?tab=draftscout">open</a></span></div>';
  if (!sc?.classes) return `<section class="card">${head}<ul class="cm-checks"><li>${ok(false, '<b>Not built yet.</b> <small>The next update builds it (any day, since the file is missing).</small>')}</li></ul></section>`;
  const info = text => `<span class="cm-status">i</span>${text}`;
  const today = ctDate();
  const age = Math.max(0, Math.round((new Date(`${today}T12:00:00`) - new Date(`${sc.built}T12:00:00`)) / 864e5));
  const next = new Date(`${today}T12:00:00`); next.setDate(next.getDate() + ((7 - next.getDay()) % 7 || 7));
  const nextSun = next.toISOString().slice(0, 10);
  const years = [0, 1, 2].map(i => String(sc.draftYear + i));
  const days = d => (d ? Math.round((new Date(`${today}T12:00:00`) - new Date(d)) / 864e5) : null);
  const srcLine = s => {
    if (s.id === 'torvik') {
      return s.ok ? ok(true, `<b>College stats: Bart Torvik</b> <small>read ${esc(shortMd(s.read))} · ${num(s.count)} players</small>`)
        : info(`<b>College stats: Tankathon instead of Bart Torvik</b> <small>Torvik turned the update away (${esc(s.error?.split(' (')[0] ?? 'error')}). Grades and comps still work; free-throw and three-point notes are left out.</small>`);
    }
    const stale = days(s.updated);
    const age = stale != null && stale > 60 ? ` <span class="cm-issues" style="color:var(--muted)">The site itself last updated this list ${esc(shortMd(s.updated.slice(0, 10)))} (${stale} days ago); it counts less in the consensus until it's refreshed.</span>` : '';
    return s.ok
      ? ok(true, `<b>${esc(s.name)}</b> <small>read ${esc(shortMd(s.read))} · ${s.count} players${s.updated ? ` · list updated ${esc(shortMd(s.updated.slice(0, 10)))}` : ''}${s.note ? ` · first choice failed (${esc(s.note)})` : ''}</small>${age}`)
      : ok(false, `<b>${esc(s.name)} couldn't be read</b> <small>${s.count ? `using the copy from ${s.read ? esc(shortMd(s.read)) : 'earlier'} (${s.count} players)` : 'no copy to fall back on'}</small><span class="cm-issues">${esc(s.error ?? '')}</span>`);
  };
  const weeks = sc.weeks ?? [];
  return `<section class="card">${head}
    <ul class="cm-checks">
      <li>${ok(age <= 8, `<b>Built ${esc(shortMd(sc.built))}</b> <small>${age === 0 ? 'today' : `${age} day${age === 1 ? '' : 's'} ago`} · next build Sunday ${esc(shortMd(nextSun))}${age > 8 ? ' · older than a week: check the latest nightly run' : ''}</small>`)}</li>
      ${years.map(y => { const c = sc.classes[y]; return `<li>${ok(Boolean(c?.prospects?.length), c ? `<b>${y} class</b> <small>${c.prospects.length} prospects · ${c.kind === 'hs' ? `high school rankings (class of ${c.hsClass})${c.holdovers?.length ? ` + ${c.holdovers.length} college freshmen waiting a year` : ''}` : `big boards · ${c.statsTop24} of the top 24 with college numbers · strength ${num((c.strength - 1) * 100)}%`}</small>` : `<b>${y} class missing</b> <small>no source for it could be read and there was no saved copy</small>`)}</li>`; }).join('')}
      ${(sc.sources ?? []).map(s => `<li>${srcLine(s)}</li>`).join('')}
      ${(() => { const c = sc.classes[years[1]]; const fr = (sc.sources ?? []).find(s => s.id === 'freshmen'); return c?.kind === 'hs' ? `<li>${ok(Boolean(fr && (fr.ok || fr.count)), `<b>Holdover check</b> <small>top ${25} recruits now in college who are on no ${years[0]} board, moved to ${years[1]}: ${c.holdovers?.length ? esc(c.holdovers.join(', ')) : 'none'}${fr && !fr.ok ? ` · freshmen list from ${fr.count ? 'an older copy' : 'nowhere'}` : ''}</small>`)}</li>` : ''; })()}
      <li>${ok((sc.poolSize ?? 0) >= 300, `<b>Comps pool</b> <small>${num(sc.poolSize ?? 0)} drafted college players with NBA careers</small>`)}</li>
      <li>${ok(weeks.length > 0, `<b>Weekly history</b> <small>${weeks.length} week${weeks.length === 1 ? '' : 's'} saved${weeks.length ? ` since ${esc(shortMd(weeks[0].date))}` : ''} (grade changes + charts)</small>`)}</li>
    </ul>
    <p class="cm-rule">A source that can’t be read keeps its last good copy, and the update tries once more on Monday. Red = something to look at: a missing class, or a list the page is showing from an older copy (or not at all).</p>
  </section>`;
}

// NBA contracts (data/contracts.json, read weekly on Sundays from Basketball-Reference): was the
// page read, or is the Dynasty tab showing an older copy; which names didn't match a Sleeper player.
function contractsHealthCard(ct, ok) {
  const head = '<div class="card-head"><h2>NBA contracts</h2><span class="card-sub">Read weekly (Sundays) · <a href="#/commish?tab=dynasty">Dynasty</a></span></div>';
  if (!ct?.players) return `<section class="card">${head}<ul class="cm-checks"><li>${ok(false, '<b>Not built yet.</b> <small>The next update builds it (any day, since the file is missing).</small>')}</li></ul></section>`;
  const today = ctDate();
  const age = Math.max(0, Math.round((new Date(`${today}T12:00:00`) - new Date(`${ct.at}T12:00:00`)) / 864e5));
  const s = ct.source ?? {};
  const copy = s.fallback === 'seed' ? `the copy saved from a home PC (${esc(shortMd(s.read))})` : `the last good copy (${esc(shortMd(s.read))})`;
  return `<section class="card">${head}
    <ul class="cm-checks">
      <li>${ok(age <= 8, `<b>Built ${esc(shortMd(ct.at))}</b> <small>${age === 0 ? 'today' : `${age} day${age === 1 ? '' : 's'} ago`}${age > 8 ? ' · older than a week: check the latest nightly run' : ''}</small>`)}</li>
      <li>${s.ok ? ok(true, `<b>${esc(s.name)} read</b> <small>${esc(shortMd(s.read))} · ${num(s.count)} contracts</small>`)
        : ok(false, `<b>${esc(s.name ?? 'Contracts page')} couldn’t be read</b> <small>using ${copy}, ${num(s.count ?? 0)} contracts; the update tries again Monday, then next Sunday</small><span class="cm-issues">${esc(s.error ?? '')}</span>`)}</li>
      <li>${ok(!ct.unmatched?.length, `<b>${num(Object.keys(ct.players).length)} matched to Sleeper players</b> <small>${ct.unmatched?.length ? `not matched: ${esc(ct.unmatched.map(u => `${u.name} (${u.team})`).join(', '))} · add them to CONTRACT_IDS in assets/contracts.js` : 'every contract matched'}</small>`)}</li>
      <li><span class="cm-status">i</span><b>Rostered players with no contract row: ${ct.missing?.length ?? 0}</b> <small>${ct.missing?.length ? esc(ct.missing.map(m => `${m.name} (${m.team})`).join(', ')) : 'none'} · usually two-way or Exhibit 10 deals, which the page doesn’t list</small></li>
    </ul>
    <p class="cm-rule">One page, read once a week by the site’s labeled bot (Sports Reference asks bots to go easy). A failed read keeps the last good copy. Contracts are information only.</p>
  </section>`;
}

async function renderHealth(body) {
  const fo = ledger();
  const at = await scoutWeek().catch(() => null);
  const [runs, check, guard, ctx, projLog, scoutData, taxiLog, contracts] = await Promise.all([
    fetch('https://api.github.com/repos/debugburkhart/seis-dynasty-hoops/actions/runs?per_page=5').then(r => (r.ok ? r.json() : null)).catch(() => null),
    fetch(`data/scoring-check.txt?t=${Date.now()}`).then(r => (r.ok ? r.text() : null)).catch(() => null),
    fetch(`data/week-guard.json?t=${Date.now()}`).then(r => (r.ok ? r.json() : null)).catch(() => null),
    at ? loadWeek(DATA, at.season, at.week).catch(() => null) : null,
    fetch(`data/projection-log.json?t=${Date.now()}`).then(r => (r.ok ? r.json() : null)).catch(() => null),
    loadScout().catch(() => null),
    fetch(`data/taxi-log.json?t=${Date.now()}`).then(r => (r.ok ? r.json() : null)).catch(() => null),
    loadContracts().catch(() => null),
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

    ${projectionLogCard(projLog, when)}

    ${scoutHealthCard(scoutData, ok)}

    ${contractsHealthCard(contracts, ok)}

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
      <div class="card-head"><h2>Taxi squad size</h2><span class="card-sub">${taxi ? `Limit: ${taxi.size} players` : ''}</span></div>
      ${!taxi ? '<p class="empty">Couldn’t load taxi squads from Sleeper.</p>'
        : `<ul class="cm-checks">${taxi.sizes.map(t => `<li>${ok(t.n <= taxi.size, `<b>${esc(teamName(t.owner, at.season))}</b> <small>${esc(name(t.owner))} · ${t.n} on taxi${t.n > taxi.size ? `: ${t.n - taxi.size} over the limit` : ''}</small>`)}</li>`).join('')}</ul>`}
      <p class="cm-rule">League rule (from 2026–27, was 30): a taxi squad holds at most ${taxi?.size ?? 15} players. Counts come from Sleeper’s current rosters.</p>
    </section>

    <section class="card">
      <div class="card-head"><h2>Taxi moves</h2><span class="card-sub">${taxiLog?.since ? `Logged since ${esc(when(taxiLog.since))} CT` : 'Starts with the next nightly update'}</span></div>
      ${taxiLog?.events?.length ? `<ul class="cm-checks">${taxiLog.events.slice(-25).reverse().map(e => `<li>${ok(e.move !== 'out', `<b>${esc(e.name)}</b> <small>${esc(when(e.at))} · ${esc(name(e.owner))} · ${e.move === 'on' ? 'put on taxi' : e.move === 'up' ? 'activated from taxi' : 'left the roster while on taxi (dropped or traded)'}</small>`)}</li>`).join('')}</ul>` : `<p class="empty">${taxiLog ? 'No taxi moves since logging began.' : 'No log yet.'}</p>`}
      <p class="cm-rule">Sleeper keeps no history of taxi moves, so every nightly update compares each team’s taxi squad with the last one and logs who went on or off. A move shows with the time of the update that first saw it, so the real move happened between that update and the one before.</p>
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
async function homeHypeWeek(preview = null) {
  HYPE_NOW ??= await hypeNow();
  const now = HYPE_NOW;
  const cur = DATA.seasons.at(-1);
  // Commish preview (Early hype tab): show week `preview` as it will look once it starts.
  if (preview) return { season: cur.season, week: preview, live: true, preview: true, now: { ...now, pre: preview === 1 && now.pre, done: false, week: preview } };
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
async function homeHype(box, refresh = false, preview = null) {
  let pick;
  try { pick = await homeHypeWeek(preview); } catch { pick = {}; }
  if (!box.isConnected) return false;
  const { season, week, live, now, preview: isPreview } = pick;
  const cur = DATA.seasons.at(-1);
  if (!season || !week) {
    box.innerHTML = '<a class="card hm-card hm-link" href="#/hype"><p class="empty">Matchup Hype starts with week 1 of the season.</p></a>';
    return false;
  }
  let liveData = null;
  if (live && !isPreview) {
    try { liveData = await liveWeek(season, week); } catch { /* scores just won't be live */ }
    if (!box.isConnected || (refresh && !liveData)) return live;
  }
  const pairs = liveData?.pairs ?? weekPairs(DATA, season, week);
  const slate = hypeSlate(DATA, season, week, pairs);
  if (!slate.games.length) {
    box.innerHTML = `<a class="card hm-card hm-link" href="#/hype"><p class="empty">Week ${week}’s matchups show up once Sleeper sets them.</p></a>`;
    return live;
  }
  const waiting = !(now.done || now.week >= 1) && now.tipoff && cur.season !== season;
  const when = waiting ? `Last Main event · ${season} Week ${week}` : live && now.pre ? `Opening week${now.tipoff ? ` · tips off ${prettyDate(now.tipoff)}` : ''}` : live ? `This week · Week ${week}` : `${season} · Week ${week}`;
  // Every game of the week, Main event first (owner, Oct 2026): desktop cycles through them, phones
  // use the arrows (bindHomeSlides). The shown slide survives the minute-by-minute score refresh.
  const n = slate.games.length;
  const at = Math.min(Number(box.dataset.slide) || 0, n - 1);
  box.innerHTML = `
    <div class="hm-slides" aria-roledescription="carousel" aria-label="This week’s games">
      ${slate.games.map((g, i) => homeSlide(g, i, n, { season, week, live, liveData, when, isPreview, on: i === at })).join('')}
      ${n > 1 ? `<div class="hm-nav">
        <button type="button" class="hm-arrow" data-step="-1" aria-label="Previous game">‹</button>
        <span class="hm-dots">${slate.games.map((_, i) => `<button type="button" class="hm-dot${i === at ? ' on' : ''}" data-go="${i}" aria-label="Game ${i + 1} of ${n}"></button>`).join('')}</span>
        <button type="button" class="hm-arrow" data-step="1" aria-label="Next game">›</button>
      </div>` : ''}
    </div>
    ${waiting ? `<p class="hm-note">${icon('clock')}<span>The ${esc(cur.season)} season tips off ${esc(prettyDate(now.tipoff))}. Week 1’s Main event appears once Sleeper sets the schedule.</span></p>` : ''}`;
  box.dataset.slide = at;
  bindHomeSlides(box);
  return live && !now.pre && !isPreview; // no point refreshing scores before tip-off (or in a preview)
}

// Desktop (a mouse): the games change every HM_CYCLE_MS, paused while the pointer is over them (owner
// asked for cycling; with Reduce Motion on it still cycles, just without the fade: CSS). Phones: arrows
// (and dots) only, no auto-advance.
const HM_CYCLE_MS = 8000;
function bindHomeSlides(box) {
  const slides = [...box.querySelectorAll('.hm-slide')];
  if (slides.length < 2) return;
  const show = i => {
    const k = (i + slides.length) % slides.length;
    slides.forEach((s, j) => { s.classList.toggle('on', j === k); s.setAttribute('aria-hidden', j === k ? 'false' : 'true'); s.tabIndex = j === k ? 0 : -1; });
    box.querySelectorAll('.hm-dot').forEach((d, j) => d.classList.toggle('on', j === k));
    box.dataset.slide = k;
  };
  const cur = () => Number(box.dataset.slide) || 0;
  box.querySelectorAll('.hm-arrow').forEach(b => b.addEventListener('click', () => show(cur() + Number(b.dataset.step))));
  box.querySelectorAll('.hm-dot').forEach(b => b.addEventListener('click', () => show(Number(b.dataset.go))));
  clearInterval(box._cycle);
  const desktop = matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!desktop) return;
  let paused = false;
  const wrap = box.querySelector('.hm-slides');
  wrap.addEventListener('mouseenter', () => { paused = true; });
  wrap.addEventListener('mouseleave', () => { paused = false; });
  wrap.addEventListener('focusin', () => { paused = true; });
  wrap.addEventListener('focusout', () => { paused = false; });
  box._cycle = setInterval(() => {
    if (!box.isConnected) return clearInterval(box._cycle);
    if (!paused && !document.hidden) show(cur() + 1);
  }, HM_CYCLE_MS);
}

// One game's slide on Home (the first is the week's Main event).
function homeSlide(g, i, n, { season, week, live, liveData, when, isPreview, on }) {
  // Mid-week: Sleeper's live total (every starter's latest game, locked or not), labeled live.
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
  const status = g.final ? 'Final · locked scores' : live && hasScore ? `Live · updated ${new Date(liveData.at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : live ? 'Tip-off pending' : '';
  const why = g.labels.find(l => l.id === 'main')?.why ?? g.labels[0]?.why;
  return `
    <a class="hm-main hm-slide${on ? ' on' : ''}" aria-hidden="${on ? 'false' : 'true'}" tabindex="${on ? 0 : -1}" aria-label="Game ${i + 1} of ${n}" href="${isPreview ? `#/commish?${new URLSearchParams({ tab: 'hype', view: 'page', week, m: g.a })}` : `#/hype?${new URLSearchParams({ season, week, m: g.a })}`}">
      <div class="hm-main-top">
        <span class="hm-kicker">${icon('bolt')} ${esc(when)}${g.label ? ` · ${esc(g.label)}` : ''}${n > 1 ? ` · ${i === 0 ? 'Main event' : `Game ${i + 1} of ${n}`}` : ''}</span>
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
      ${trophyOf(g.a, g.b) && Number(season) >= Number(RIVALRIES_FROM) ? `<p class="hm-trophy">${trophyPic(trophyOf(g.a, g.b), 'mini')}<span>Playing for the <b>${esc(trophyOf(g.a, g.b)[2].replace(/^The /, ''))}</b> trophy · ${esc(seriesLine(seasonSeries(DATA, season, g.a, g.b, week)))}</span></p>` : ''}
      <span class="hm-go">Full matchup ${icon('arrow')}</span>
    </a>`;
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
      <a class="hm-tk-label" href="#/records">${icon('flame')}<span>Record <br>watch</span></a>
      <div class="hm-tk-view">
        <div class="hm-tk-track" style="--hm-dur:${items.length * 5}s">${list}<span class="hm-tk-copy">${items.map(e => item(e, true)).join('')}</span></div>
      </div>
      <div class="hm-tk-nav" aria-hidden="true">
        <span class="hm-tk-dots">${items.map((_, i) => `<i${i ? '' : ' class="on"'}></i>`).join('')}</span>
        <span class="hm-tk-count"><b>1</b> of ${items.length} · Swipe ${icon('arrow')}</span>
      </div>
    </section>`;
}

// Phones: Record watch is a swipeable row of cards, one at a time; the dots and
// counter follow the swipe. (Desktop keeps the auto-scrolling strip.)
function bindTicker(main) {
  const view = $('.hm-tk-view', main);
  if (!view) return;
  const items = [...view.querySelectorAll('.hm-tk-track > .hm-tk-item')];
  const dots = [...main.querySelectorAll('.hm-tk-dots i')];
  const count = $('.hm-tk-count b', main);
  let shown = 0;
  view.addEventListener('scroll', () => {
    const step = items[1] ? items[1].offsetLeft - items[0].offsetLeft : view.clientWidth;
    const i = Math.max(0, Math.min(items.length - 1, Math.round(view.scrollLeft / step)));
    if (i === shown) return;
    dots[shown]?.classList.remove('on');
    dots[i]?.classList.add('on');
    if (count) count.textContent = i + 1;
    shown = i;
  }, { passive: true });
}

function homePower() {
  const all = powerSeasons(DATA);
  const latest = all.at(-1);
  // Before the newest season's first week: its preseason edition, if saved.
  const pre = latest && !latest.weeks.length ? preseasonRankings(DATA, latest.season) : null;
  const withWeeks = all.filter(s => s.weeks.length);
  const pick = pre ? latest : withWeeks.at(-1);
  if (!pick) return '';
  const week = pre ? 0 : pick.weeks.at(-1);
  const ed = pre ?? powerRankings(DATA, pick.season, week);
  const href = `#/power?season=${pick.season}&week=${week}`;
  const edition = pre ? `${pick.season} · Preseason edition` : pick.complete ? `${pick.season} · Final edition` : `${pick.season} · After week ${week}`;
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
            <span class="hm-name"><b>${esc(r.team)}</b><small>${esc(name(r.owner))} · ${pre ? `~${Math.round(r.proj)} pts/week projected` : `${rec(r.w, r.l, r.t)} ${move(r.move)}`}</small></span>
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

// ---- Wager Weeks tracker (Rulebook rule 9; settings in config.js WAGER) ----

// Who pays each Wager Week: the lowest score, unless he has already paid `cap` times,
// then the next-lowest manager under the cap. A tie for that spot is left to the
// commissioner (nobody is charged until it's settled). `live` = { week, scores } for a
// week being played, to show who's on the hook right now.
function wagerWeeks(live) {
  const s = DATA.seasons.find(x => x.season === WAGER.season);
  if (!s) return null;
  const paid = Object.fromEntries(s.teams.map(t => [t.owner, 0]));
  const weeks = [];
  for (let w = WAGER.from; w <= WAGER.to; w++) {
    const games = DATA.games.filter(g => g.s === WAGER.season && g.w === w && g.t === 'R');
    const final = games.length > 0;
    const scores = final ? Object.fromEntries(games.flatMap(g => [[g.a, g.ap], [g.b, g.bp]])) : live?.week === w ? live.scores : null;
    if (!scores || !Object.keys(scores).length) { weeks.push({ w, state: 'upcoming' }); continue; }
    const order = Object.entries(scores).sort((a, b) => a[1] - b[1]);
    const lowest = order[0];
    const eligible = order.filter(([o]) => paid[o] < WAGER.cap);
    const pick = eligible[0];
    const tied = pick ? eligible.filter(([, p]) => p === pick[1]).map(([o]) => o) : [];
    const row = { w, state: final ? 'final' : 'live', payer: pick?.[0], score: pick?.[1], lowest: lowest[0], lowScore: lowest[1], tied: tied.length > 1 ? tied : null };
    if (final && row.payer && !row.tied) paid[row.payer]++;
    weeks.push(row);
  }
  const lastWeek = s.weeksPlayed ?? 0;
  // Bet results entered by the commissioner (wager.json): { week: { result, amount } }.
  const managers = s.teams.length;
  for (const r of weeks) {
    const x = WAGER_RESULTS?.[r.w];
    if (x?.result === 'won' || x?.result === 'lost') r.bet = { result: x.result, amount: Number(x.amount) || 0, each: (Number(x.amount) || 0) / managers };
  }
  const won = weeks.filter(r => r.bet?.result === 'won');
  const total = won.reduce((a, r) => a + r.bet.amount, 0);
  // Stays up after week 14 until every paid week's bet has a result (and a week has passed).
  const unsettled = weeks.some(r => r.state === 'final' && !r.bet);
  return {
    weeks, paid, managers, pot: weeks.filter(r => r.state === 'final' && r.payer && !r.tied).length * WAGER.stake,
    won: won.length, lost: weeks.filter(r => r.bet?.result === 'lost').length, total, each: total / managers,
    over: lastWeek > WAGER.to + 1 && !unsettled,
  };
}

// The commissioner's bet results, from wager.json in the repo (edited on GitHub).
let WAGER_RESULTS = null;
async function loadWagerResults() {
  try {
    const res = await fetch(`wager.json?t=${Date.now()}`, { cache: 'no-store' });
    WAGER_RESULTS = res.ok ? (await res.json()).parlays ?? {} : {};
  } catch { WAGER_RESULTS = {}; }
  return WAGER_RESULTS;
}
const money = n => `$${(Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, '')}`;

function homeWager(live) {
  const t = wagerWeeks(live);
  if (!t || t.over || DATA.seasons.at(-1).season !== WAGER.season) return '';
  const started = t.weeks.some(r => r.state !== 'upcoming');
  const row = r => {
    if (r.state === 'upcoming') return `<li class="wg-row wg-up"><span class="wg-wk">Wk ${r.w}</span><span class="wg-who"><small>Not played yet</small></span><b>–</b></li>`;
    const who = r.tied ? `Tie: ${r.tied.map(o => esc(name(o))).join(' & ')}` : esc(name(r.payer));
    const note = r.tied ? 'Tied for lowest: commish decides' : r.payer !== r.lowest ? `${esc(name(r.lowest))} had the low score but already paid ${WAGER.cap} times` : r.state === 'live' ? 'Lowest score right now' : 'Lowest score';
    const bet = r.bet ? (r.bet.result === 'won'
      ? `<span class="wg-bet won">Parlay hit: ${money(r.bet.amount)} · ${money(r.bet.each)} each</span>`
      : '<span class="wg-bet lost">Parlay missed</span>') : '';
    return `<li class="wg-row${r.state === 'live' ? ' wg-live' : ''}"><span class="wg-wk">Wk ${r.w}</span><span class="wg-who"><b>${who}</b><small>${r.state === 'live' ? '<i class="wg-dot"></i>Live · ' : ''}${note}</small>${bet}</span><b>${num(r.score)}</b></li>`;
  };
  const payers = Object.entries(t.paid).filter(([, n]) => n).sort((a, b) => b[1] - a[1]);
  return `
    <section class="card hm-card wg">
      <div class="hm-head"><h2>${icon('ticket')} Wager Weeks</h2><a class="hm-all" href="#/rules">Rule 9 ${icon('arrow')}</a></div>
      <p class="wg-sub">${started ? `Weeks ${WAGER.from}–${WAGER.to}: the lowest score each week puts up $${WAGER.stake} for the league parlay. Max ${WAGER.cap} times per manager.` : `<b>Starts in Week ${WAGER.from}.</b> In weeks ${WAGER.from}–${WAGER.to}, the lowest score each week puts up $${WAGER.stake} for an NBA parlay; every manager picks a leg and a winning ticket is split evenly. Nobody pays more than ${WAGER.cap} times.`}</p>
      <ol class="wg-list">${t.weeks.map(row).join('')}</ol>
      ${payers.length ? `<div class="wg-tally">${payers.map(([o, n]) => `<span class="${n >= WAGER.cap ? 'max' : ''}">${esc(name(o))} <b>${'●'.repeat(n)}${'○'.repeat(WAGER.cap - n)}</b>${n >= WAGER.cap ? ' maxed out' : ''}</span>`).join('')}</div>` : ''}
      ${t.pot || t.won || t.lost ? `<p class="wg-sub">${[t.pot ? `Put up so far: ${money(t.pot)}` : '', t.won || t.lost ? `Parlays: ${t.won} hit, ${t.lost} missed` : '', t.won ? `<b>won ${money(t.total)}, ${money(t.each)} per manager</b>` : ''].filter(Boolean).join(' · ')}.</p>` : ''}
    </section>`;
}

// Commissioner's office → Wager Weeks: mark each week's parlay won or lost and enter the
// winnings. The site has no server, so saving = copy the new wager.json and paste it
// into GitHub's editor; the upload redeploys the site (about 3-5 minutes).
const WAGER_EDIT_URL = 'https://github.com/debugburkhart/seis-dynasty-hoops/edit/main/wager.json';
async function renderWagerAdmin(body) {
  const live = await loadWagerResults();
  if (route().page !== 'commish') return;
  // A save that GitHub hasn't published yet: start from it (for 20 minutes).
  const pending = gmLoad('wager-saved', null);
  const usePending = pending && Date.now() - pending.at < 20 * 60_000 && JSON.stringify(pending.parlays) !== JSON.stringify(live);
  const draft = structuredClone(usePending ? pending.parlays : live);
  const t = wagerWeeks();
  if (!t) {
    body.innerHTML = '<section class="card soon-card"><p>Wager Weeks are for the 2026-27 season.</p></section>';
    return;
  }
  const fileText = () => `${JSON.stringify({ parlays: Object.fromEntries(Object.entries(draft).sort((a, b) => a[0] - b[0])) }, null, 2)}\n`;
  const row = r => {
    const d = draft[r.w] ?? {};
    const who = r.state === 'upcoming' ? 'Not played yet' : r.tied ? `Tie: ${r.tied.map(o => name(o)).join(' & ')}` : `${name(r.payer)} paid`;
    return `
      <div class="wa-row" data-w="${r.w}">
        <div class="wa-wk"><b>Week ${r.w}</b><small>${esc(who)}</small></div>
        <div class="st-stage wa-result" role="group" aria-label="Week ${r.w} result">
          ${[['', 'Pending'], ['won', 'Won'], ['lost', 'Lost']].map(([v, l]) => `<a href="#" data-v="${v}" class="${(d.result ?? '') === v ? 'on' : ''}">${l}</a>`).join('')}
        </div>
        <label class="wa-amount${d.result === 'won' ? '' : ' off'}"><span>$</span><input type="number" inputmode="decimal" min="0" step="0.01" placeholder="Total won" value="${d.result === 'won' && d.amount ? d.amount : ''}" aria-label="Week ${r.w} total won"></label>
        <div class="wa-each">${d.result === 'won' && d.amount ? `${money(d.amount / t.managers)} each` : ''}</div>
      </div>`;
  };
  const draw = () => {
    body.innerHTML = `
      <section class="card">
        <div class="card-head"><h2>Wager Weeks results</h2></div>
        ${usePending ? '<p class="gm-alert">Showing your last save: GitHub hasn’t published it yet (it takes about 3–5 minutes).</p>' : ''}
        <p class="cm-rule">Mark each week’s parlay. For a win, enter the total the ticket paid out; the site divides it by ${t.managers} for each manager’s share.</p>
        <div class="wa-rows">${t.weeks.map(row).join('')}</div>
      </section>
      <section class="card">
        <div class="card-head"><h2>Save to the site</h2></div>
        <ol class="wa-steps">
          <li><button class="btn" type="button" id="wa-copy">Copy results</button> <span class="cm-copy" id="wa-copied" hidden>Copied ✓</span></li>
          <li><a class="btn" href="${WAGER_EDIT_URL}" target="_blank" rel="noopener">Open wager.json on GitHub</a></li>
          <li>On GitHub, select all the text in the file (tap in it, then Select All), paste, and tap <b>Commit changes</b> (then <b>Commit changes</b> again).</li>
        </ol>
        <p class="cm-rule">Home shows the results about 3–5 minutes later. If copying doesn’t work on your phone, copy the text below instead.</p>
        <textarea class="cm-recap wa-text" rows="6" readonly>${esc(fileText())}</textarea>
      </section>`;
    body.querySelectorAll('.wa-row').forEach(el => {
      const w = el.dataset.w;
      el.querySelectorAll('.wa-result a').forEach(a => a.addEventListener('click', e => {
        e.preventDefault();
        if (!a.dataset.v) delete draft[w];
        else draft[w] = { result: a.dataset.v, ...(a.dataset.v === 'won' ? { amount: draft[w]?.amount ?? 0 } : {}) };
        draw();
        if (a.dataset.v === 'won') $(`.wa-row[data-w="${w}"] input`, body)?.focus();
      }));
      const input = $('input', el);
      input.addEventListener('input', () => {
        if (draft[w]?.result !== 'won') return;
        draft[w].amount = Math.max(0, Math.round((Number(input.value) || 0) * 100) / 100);
        $('.wa-each', el).textContent = draft[w].amount ? `${money(draft[w].amount / t.managers)} each` : '';
        $('.wa-text', body).value = fileText();
      });
    });
    $('#wa-copy', body).addEventListener('click', async () => {
      const text = fileText();
      try { await navigator.clipboard.writeText(text); } catch {
        const ta = $('.wa-text', body);
        ta.select();
        document.execCommand('copy');
      }
      gmSave('wager-saved', { at: Date.now(), parlays: JSON.parse(text).parlays });
      $('#wa-copied', body).hidden = false;
    });
  };
  draw();
}

// During a Wager Week, refresh the tracker with live scores.
async function homeWagerLive(main) {
  const box = $('#hm-wager', main);
  if (!box) return;
  await loadWagerResults();
  if (box.isConnected) box.innerHTML = homeWager();
  try {
    HYPE_NOW ??= await hypeNow();
    const w = HYPE_NOW.week;
    if (HYPE_NOW.pre || HYPE_NOW.season !== WAGER.season || w < WAGER.from || w > WAGER.to) return;
    if (DATA.games.some(g => g.s === WAGER.season && g.w === w)) return; // already final in the data
    const d = await liveWeek(WAGER.season, w);
    if (box.isConnected && Object.values(d.scores).some(p => p > 0)) box.innerHTML = homeWager({ week: w, scores: d.scores });
  } catch { /* keep the nightly version */ }
}

// preview: a future week number (commish Early hype tab) to show that week's Main event.
function renderHome(main, preview = null) {
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
      <section class="card hm-card hm-trophies">
        <div class="hm-head"><h2>${icon('swords')} Rivalry trophies</h2><a class="hm-all" href="#/rivalry">Rivalries ${icon('arrow')}</a></div>
        <p class="card-sub">Season series and who holds each traveling trophy</p>
        ${trophyCase(true)}
      </section>
      <div id="hm-wager">${homeWager()}</div>
      ${homeWire()}
    </div>`;
  homeWagerLive(main);

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
  bindTicker(main);
  homeHype(box, false, preview).then(live => {
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

// ---------- Timeline ----------
// Every season's story, newest first (assets/timeline.js).

function renderTimeline(main) {
  const seasons = buildTimeline(DATA, { rules: RULES, leagueStart: LEAGUE_START, name });
  const event = e => {
    const body = `
      <span class="tl-icon">${icon(e.icon)}</span>
      <span class="tl-text">
        <span class="tl-title">${e.who ? `<b>${esc(name(e.who))}</b> ${esc(e.title)}` : `<b>${esc(e.title)}</b>`}</span>
        ${e.note ? `<small>${esc(e.note)}</small>` : ''}
      </span>`;
    return e.link ? `<a class="tl-event tl-k-${e.kind}" href="${e.link}">${body}</a>` : `<div class="tl-event tl-k-${e.kind}">${body}</div>`;
  };
  main.innerHTML = `
    <div class="page">
      <div class="page-head">
        <div class="page-icon">${icon('clock')}</div>
        <div><div class="eyebrow">${esc(DATA.name)}</div><h1>League Timeline</h1></div>
      </div>
      <p class="page-desc">Every season’s story: champions, new rules, league changes and drafts, newest first.</p>
      <section class="card tl-card">
        ${seasons.map(s => `
          <div class="tl-season">
            <div class="tl-when">
              <b>${seasonSpan(s.season)}</b>
              <small>Sleeper · ${s.teams} teams${s.current ? ' · in progress' : ''}</small>
            </div>
            <div class="tl-rail"><span class="tl-dot${s.current ? ' now' : ''}"></span></div>
            <div class="tl-events">
              ${s.events.length ? s.events.map(event).join('') : '<p class="empty">Nothing new this season.</p>'}
            </div>
          </div>`).join('')}
      </section>
      <p class="pw-foot">Rules come from the Rulebook, league changes from each season’s Sleeper settings, and the champion from the title game. Tap a champion, rule or draft to open it.</p>
    </div>`;
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
    // The startup draft isn't graded (owner): plain squares, and the hover card only says what he produced.
    const tone = startup ? 'dk-plain' : `t-${p.tier ?? (p.limited ? 'limited' : 'none')}`;
    const tip = startup ? tipLines(p).filter(l => !/Expected|vs the spot/.test(l)) : tipLines(p);
    return `
      <td class="${tone}${hl}"><a class="dk-cell" href="${playerLink(p.pid)}" data-tip="${esc(tip.join('|'))}">
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
      ? `The ${d.s} startup draft that built the league: ${rounds} rounds, snake order. Startup picks aren’t graded (grades are for rookie drafts). Tap a pick to open the player.`
      : `The ${d.s} rookie draft: ${rounds} rounds, ${picks.length} picks. Tap a pick to open the player.`}</p>
    ${startup ? '' : `<div class="dk-legend">
      ${TIERS.map(t => `<span class="dk-key t-${t.id}">${t.label}</span>`).join('')}
      <span class="dk-key t-limited">Barely played</span>
      <span class="dk-key t-none">Not graded yet</span>
    </div>`}
    ${graded || startup ? '' : `<p class="filter-note">The ${d.s} class hasn’t played enough NBA games yet. Colors start once a player has a season of ${MIN_GAMES}+ games.</p>`}
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
  if (page !== 'commish') { COMMISH_OPEN = false; cmFlag(false); } // leaving the section locks it again
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
  else if (page === 'timeline') renderTimeline(main);
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

// Pull to refresh (owner, Oct 2026): on touch screens, pulling down from the top of any page
// reloads it (the home-screen app has no refresh button). The arrow follows the finger and
// spins once it's far enough; let go there to reload.
function pullToRefresh() {
  if (!('ontouchstart' in window)) return;
  document.documentElement.classList.add('ptr-on');
  const el = document.createElement('div');
  el.className = 'ptr';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<svg viewBox="0 0 20 20"><path d="M16 10a6 6 0 1 1-1.8-4.3M16 3.5v3.2h-3.2"/></svg>';
  document.body.append(el);
  const TRIGGER = 64;
  const MAX = 96;
  let y0 = null;
  let x0 = 0;
  let pull = 0;
  let active = false;
  const show = px => {
    el.style.transform = `translate(-50%, ${px - 48}px) rotate(${px * 4}deg)`;
    el.style.opacity = Math.min(1, px / TRIGGER);
    el.classList.toggle('ready', px >= TRIGGER);
  };
  const reset = () => {
    el.classList.add('back');
    show(0);
    setTimeout(() => el.classList.remove('back'), 200);
    y0 = null; active = false; pull = 0;
  };
  window.addEventListener('touchstart', e => {
    y0 = null;
    if (el.classList.contains('go') || window.scrollY > 0 || e.touches.length > 1 || document.body.classList.contains('nav-open')) return;
    y0 = e.touches[0].clientY;
    x0 = e.touches[0].clientX;
    pull = 0;
    active = false;
  }, { passive: true });
  window.addEventListener('touchmove', e => {
    if (y0 == null) return;
    const dy = e.touches[0].clientY - y0;
    const dx = e.touches[0].clientX - x0;
    if (!active) {
      // Sideways swipes (tickers, chart strips) and scrolling down never start a pull.
      if (Math.abs(dx) > 10 && Math.abs(dx) > dy) { y0 = null; return; }
      if (dy < -4 || window.scrollY > 0) { y0 = null; return; }
      if (dy < 10) return;
      active = true;
    }
    pull = Math.max(0, Math.min(MAX, (dy - 10) * 0.55));
    show(pull);
  }, { passive: true });
  const end = () => {
    if (!active) { y0 = null; return; }
    if (pull >= TRIGGER) {
      el.classList.add('go');
      el.style.transform = `translate(-50%, ${TRIGGER - 48}px)`;
      setTimeout(() => location.reload(), 450);
    } else reset();
  };
  window.addEventListener('touchend', end, { passive: true });
  window.addEventListener('touchcancel', reset, { passive: true });
}
pullToRefresh();

$('.menu-btn').addEventListener('click', () => document.body.classList.toggle('nav-open'));
$('.scrim').addEventListener('click', () => document.body.classList.remove('nav-open'));

try {
  DATA = await loadData();
  window.addEventListener('hashchange', render);
  render();
} catch (err) {
  $('#main').innerHTML = `<div class="page"><section class="card"><h2>Couldn't load the league</h2><p class="empty">${esc(err.message)}</p></section></div>`;
}
