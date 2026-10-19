// Draft Scout (commish office → My GM → Draft Scout; owner, Oct 2026): the next 3 NBA draft
// classes graded for this league, with player comps and how strong each class looks.
// Built once a week (Sundays, scripts/update.mjs) into data/draft-scout.json; the page only reads
// it, and dynasty.js uses each class's strength for rookie pick values. No DOM and no Node APIs
// here, so the same code runs in the nightly job and in a browser (for testing).
//
// Sources (read once a week, as a labeled bot; sites that block bots, like NBADraftRoom, are left
// out): Tankathon big board + mock draft, CBS Sports prospect rankings, 247Sports composite high school
// rankings (classes 2 and 3 years out), Bart Torvik college stats (barttorvik.com), Sleeper NBA
// stats (comps' NBA results). A source that fails keeps last week's copy.

export const SCOUT_VERSION = 2;
const POOL_VERSION = 2; // comps pool layout (per-36 numbers)
export const SCOUT_LIST = 60; // prospects kept per class

// ---------- The model (fitted Oct 2026 in the browser on the data below) ----------
// Outcome, same as the Prospect grade (dynasty.js): his 3rd NBA season, a ROTATION player (top 120
// in fantasy points per game under this league's scoring, 20+ games), STARTER (top 72) or STAR
// (top 24). Out of the NBA or under 20 games = no.
// Draft classes: 618 drafted college players, 2011-2023 drafts (Torvik's final college season +
// NBA pick; NBA results from Sleeper, 2013-2025 seasons). Logistic fits on x = ln(pick):
// chance = 1 / (1 + e^-(a + b x + c x^2)). Checked year by year (each class predicted from the
// others): adding college stats to these did NOT improve the yes/no chances, so they come from the
// draft slot; the stats move the slot instead (TRAIT_FIT below).
const DRAFT_FIT = { rotation: [1.2912, -0.0917, -0.2751], starter: [0.5977, -0.2145, -0.2675], star: [-0.6479, -0.5813, -0.3593] };
// High school classes (2 and 3 drafts out): 1,950 top-150 freshmen by recruiting score (Torvik),
// 2011-2023, same outcome in the 3rd season after his freshman year. x = ln(national rank).
const HS_FIT = { rotation: [1.0577, -1.2723], starter: [0.5727, -1.4028], star: [-1.3355, -1.2966] };
// Production beyond the slot: least squares on y = his best fantasy points per game in NBA seasons
// 2-3 divided by that season's starter line (72nd best; 0 if out of the NBA). With college Box
// Plus-Minus, assist rate and age at the draft it beat the slot alone when each class was predicted
// from the others (squared error 0.0846 vs 0.0856); size, steals, blocks, shooting, usage and
// recruiting rank added nothing once the slot was known. VALUE_BASE = slot only.
const VALUE_BASE = [1.1718, -0.06752, -0.04385]; // 1, x, x^2
const VALUE_FULL = [1.41326, -0.05357, -0.0406, 0.01382, 0.00196, -0.02111]; // 1, x, x^2, BPM, AST%, age
// Class strength: the 24 best expected values (this league drafts 24 rookies a year). The slot curve
// alone sums to 18.245 (CLASS_BASE_SUM); with each class's college numbers, classes 2011-2023
// averaged 18.284 (CLASS_LIFT = the 0.039 difference) and ranged 17.95-18.69, about +-2%.
// A drafted player's usual numbers at slot x (same players, straight-line fits): with these the
// shift is about 0, so unknown numbers neither help nor hurt.
const TYPICAL = x => ({ bpm: 10.153 - 1.05 * x, ast: 15.9, age: 18.811 + 0.738 * x });
const CLASS_BASE_SUM = 18.245;
const CLASS_LIFT = 0.039;
const LEAGUE_ROOKIE_PICKS = 24;
// Average height (inches) of drafted players by role, for "size for his position".
const HEIGHT_BY_GROUP = { G: 75.37, W: 78.41, B: 81.71 };
// Torvik roles -> guard / wing / big.
const ROLE_GROUP = { 'Pure PG': 'G', 'Scoring PG': 'G', 'Combo G': 'G', 'Wing G': 'W', 'Wing F': 'W', 'Stretch 4': 'B', 'PF/C': 'B', C: 'B' };
const POS_GROUP = { PG: 'G', SG: 'G', G: 'G', SF: 'W', F: 'W', W: 'W', PF: 'B', C: 'B', 'PF/C': 'B', CG: 'G' };
// Grade letters: the same tests as dynasty.js GRADES, so a draft prospect lines up with players
// already in the league.
const GRADES = [
  ['A+', (st, sr) => sr >= 0.5], ['A', (st, sr) => sr >= 0.3 || st >= 0.85], ['A-', st => st >= 0.7],
  ['B+', st => st >= 0.55], ['B', st => st >= 0.4], ['B-', st => st >= 0.25],
  ['C+', (st, sr, ro) => st >= 0.15 || ro >= 0.6], ['C', (st, sr, ro) => ro >= 0.4], ['C-', (st, sr, ro) => ro >= 0.25],
  ['D', (st, sr, ro) => ro >= 0.12], ['F', () => true],
];
export const gradeOf = (q) => GRADES.find(([, t]) => t(q.starter, q.star, q.rotation))[0];

// Where a mock or board ranking can be off by the draft: spread on ln(pick) by months to the
// draft (0.25 in June, ~0.65 in October), plus how much the sources disagree.
const spreadFor = months => Math.min(0.75, 0.25 + 0.05 * Math.max(0, months));
// High school classes: the top 30 (deeper recruits rarely leave college after one year).
const HS_LIST = 30;
const HS_SPREAD = { 1: 0.3, 2: 0.5 }; // high school classes: 2nd and 3rd draft out
// Stats count fully after 12 games, less before (a freshman's first week says little).
const FULL_STATS_GAMES = 12;

const logistic = z => 1 / (1 + Math.exp(-z));
const poly = (w, x) => w.reduce((a, c, i) => a + c * x ** i, 0);
const r1 = n => Math.round(n * 10) / 10;
const r2 = n => Math.round(n * 100) / 100;
// Average of f over a bell curve around m (spread s): 21 points, 3 spreads either way.
function smooth(f, m, s) {
  if (!(s > 0)) return f(m);
  let tot = 0, wt = 0;
  for (let i = -10; i <= 10; i++) {
    const z = i * 0.3;
    const w = Math.exp(-z * z / 2);
    tot += w * f(m + z * s); wt += w;
  }
  return tot / wt;
}
const draftChances = (x, s) => {
  const at = k => xx => logistic(poly(DRAFT_FIT[k], Math.max(0, xx))); // no better than pick 1
  const q = { rotation: smooth(at('rotation'), x, s), starter: smooth(at('starter'), x, s), star: smooth(at('star'), x, s) };
  q.starter = Math.min(q.starter, q.rotation); q.star = Math.min(q.star, q.starter);
  return q;
};
const hsChances = (x, s) => {
  const at = k => xx => logistic(poly(HS_FIT[k], Math.max(0, xx)));
  const q = { rotation: smooth(at('rotation'), x, s), starter: smooth(at('starter'), x, s), star: smooth(at('star'), x, s) };
  q.starter = Math.min(q.starter, q.rotation); q.star = Math.min(q.star, q.starter);
  return q;
};
// Expected value (share of a starter's points per game in seasons 2-3) at slot x, and the shift
// his college numbers add (0 without stats).
const baseValue = x => poly(VALUE_BASE, Math.max(0, x));
const traitShift = (x, s) => (VALUE_FULL[0] - VALUE_BASE[0]) + (VALUE_FULL[1] - VALUE_BASE[1]) * x + (VALUE_FULL[2] - VALUE_BASE[2]) * x * x
  + VALUE_FULL[3] * s.bpm + VALUE_FULL[4] * s.ast + VALUE_FULL[5] * s.age;
// The slot whose usual value equals value v (the slot-only curve falls as x grows).
function slotFor(v) {
  const [a, b, c] = VALUE_BASE; // c x^2 + b x + (a - v) = 0
  const d = b * b - 4 * c * (a - v);
  if (d < 0) return 0;
  const x = (-b - Math.sqrt(d)) / (2 * c);
  return Math.max(0, Math.min(Math.log(80), x));
}

// ---------- Text helpers ----------
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', ndash: '–', mdash: '—' };
export const decode = s => String(s ?? '').replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) => (e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ENT[e.toLowerCase()] ?? m));
const text = html => decode(String(html ?? '').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
// Names compared without accents, punctuation or Jr./III.
export const normName = n => String(n ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[.,'’`-]/g, '').replace(/\b(jr|sr|ii|iii|iv)\b/g, '').replace(/\s+/g, ' ').trim();
// College/Sleeper name differences seen in the data.
const ALIAS = {
  'moe harkless': 'maurice harkless', 'edrice adebayo': 'bam adebayo', 'mohamed bamba': 'mo bamba', 'nahshon hyland': 'bones hyland',
  'cameron thomas': 'cam thomas', 'wesley iwundu': 'wes iwundu', 'sviatoslav mykhailiuk': 'svi mykhailiuk', 'nicolas claxton': 'nic claxton',
  'gregory jackson': 'gg jackson', 'roy devyn marble': 'devyn marble', 'kahlil felder': 'kay felder',
};
const key = n => { const k = normName(n); return ALIAS[k] ?? k; };
const inches = h => { const m = /(\d)\s*['-]\s*(\d{1,2})/.exec(h ?? ''); return m ? Number(m[1]) * 12 + Number(m[2]) : null; };
const groupOfPos = pos => POS_GROUP[String(pos ?? '').split(/[/ ,]/)[0].toUpperCase()] ?? null;

// ---------- Parsers (one per source; each returns { year, updated, rows } or throws) ----------
// Tankathon big board / mock draft (the page title says which draft year).
export function parseTankathon(html) {
  const year = Number(/(\d{4}) NBA (?:Draft Big Board|Mock Draft)/.exec(html)?.[1]) || null;
  const updated = /<time datetime="([^"]+)"/.exec(html)?.[1] ?? null;
  const rows = [];
  const seen = new Set();
  for (const chunk of html.split('<div class="mock-row"').slice(1)) {
    const name = decode(/mock-row-name">([^<]+)/.exec(chunk)?.[1] ?? '').trim();
    const rank = Number(/mock-row-pick-number">(\d+)/.exec(chunk)?.[1]);
    if (!name || !rank || seen.has(key(name))) continue;
    seen.add(key(name));
    const [pos, school] = decode(/mock-row-school-position">([^<]+)/.exec(chunk)?.[1] ?? '').split('|').map(s => s.trim());
    const hw = /height-weight"><div>([^<]+)<\/div><div>(\d+)/.exec(chunk);
    const ya = /year-age[^"]*"><div>([^<]+)<\/div><div>([\d.]+) yrs/.exec(chunk);
    // His college (or pro) numbers, when Tankathon lists them: per game, per 36 minutes, advanced.
    const group = cls => {
      const g = new RegExp(`universal-stat ${cls}"[^>]*>([\\s\\S]*?)(?=<div class="universal-stat |$)`).exec(chunk)?.[1] ?? '';
      return Object.fromEntries([...g.matchAll(/class="label">([^<]+)<\/div>\s*<div class="value[^"]*">([^<]+)/g)].map(m => [m[1].trim().toLowerCase(), parseFloat(m[2])]).filter(([, v]) => Number.isFinite(v)));
    };
    const pg = group('stats-per-game'), p36 = group('stats-per-36'), adv = group('stats-advanced');
    const st = Object.keys(p36).length && adv.bpm != null ? { pg, p36, ts: adv['ts%'] != null ? r1(adv['ts%'] * (adv['ts%'] <= 1 ? 100 : 1)) : null, usg: adv.usg ?? null, bpm: adv.bpm, obpm: adv.obpm ?? null, dbpm: adv.dbpm ?? null } : null;
    rows.push({ rank, name, pos, school, ht: hw ? inches(decode(hw[1])) : null, wt: hw ? Number(hw[2]) : null, cls: ya?.[1] ?? null, age: ya ? Number(ya[2]) : null, ...(st ? { st } : {}) });
  }
  if (!year || rows.length < 10) throw new Error('page layout changed');
  return { year, updated, rows };
}
// CBS Sports prospect rankings (top 30).
export function parseCbs(html) {
  const year = Number(/NBA Draft Prospect Rankings (\d{4})/.exec(html)?.[1]) || null;
  const rows = [];
  for (const tr of html.split(/<tr\b/).slice(1)) {
    if (!/PlayerName/.test(tr)) continue;
    const cells = [...tr.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map(m => text(m[1]));
    const rank = Number(cells[0]);
    if (!rank || !cells[1]) continue;
    rows.push({ rank, name: cells[1], school: cells[2], cls: cells[3], pos: cells[4], ht: inches(cells[6]), wt: Number(cells[7]) || null });
  }
  if (!year || rows.length < 10) throw new Error('page layout changed');
  return { year, updated: null, rows };
}
// 247Sports composite rankings for one high school class (top 50).
export function parse247(html, hsClass) {
  const rows = [];
  for (const li of html.split('<li class="rankings-page__list-item"').slice(1)) {
    const rank = Number(/class="primary">\s*(\d+)/.exec(li)?.[1]);
    const name = decode(/rankings-page__name-link"[^>]*>([^<]+)/.exec(li)?.[1] ?? '').trim();
    if (!rank || !name) continue;
    const metrics = text(/class="metrics">([^<]*)/.exec(li)?.[1]);
    rows.push({
      rank, name, pos: text(/class="position">([^<]*)/.exec(li)?.[1]), school: text(/class="meta">([^<]*)/.exec(li)?.[1]),
      ht: inches(metrics.split('/')[0]), wt: Number(metrics.split('/')[1]) || null, rating: Number(/class="score">([\d.]+)/.exec(li)?.[1]) || null,
    });
  }
  if (rows.length < 10) throw new Error('page layout changed');
  return { year: hsClass + 1, hsClass, updated: null, rows, from: '247Sports' };
}
// On3 industry rankings (On3 + 247 + ESPN + Rivals consensus) for one high school class: the page's
// embedded data (__NEXT_DATA__). Used when 247Sports can't be read.
export function parseOn3(html, hsClass) {
  const json = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html)?.[1];
  const list = json ? JSON.parse(json)?.props?.pageProps?.playerData?.list ?? [] : [];
  const rows = list.map(x => {
    const p = x.person ?? {};
    const r = p.rating ?? {};
    return { rank: r.consensusNationalRank ?? r.nationalRank, name: p.name, pos: p.positionAbbreviation ?? '', school: p.highSchoolName ?? '', ht: p.height || null, wt: p.weight || null, rating: r.consensusRating ? r1(r.consensusRating) : null };
  }).filter(r => r.rank && r.name).sort((a, b) => a.rank - b.rank);
  if (rows.length < 10) throw new Error('page layout changed');
  return { year: hsClass + 1, hsClass, updated: null, rows, from: 'On3' };
}
// Bart Torvik's player stats CSV (no header; column numbers checked Oct 2026).
const T = { name: 0, team: 1, conf: 2, gp: 3, minp: 4, usg: 6, ts: 8, orb: 9, drb: 10, ast: 11, tov: 12, fta: 14, ftp: 15, fga2: 17, tpa: 20, tpp: 21, blk: 22, stl: 23, yr: 25, ht: 26, year: 31, pid: 32, rec: 34, pick: 45, bpm: 50, mpg: 54, rpg: 59, apg: 60, spg: 61, bpg: 62, ppg: 63, role: 64, dob: 66 };
export function parseTorvik(csv) {
  const out = [];
  for (const line of String(csv ?? '').split('\n')) {
    if (!line.trim()) continue;
    const r = [];
    let cur = '', q = false;
    for (const ch of line) {
      if (ch === '"') q = !q;
      else if (ch === ',' && !q) { r.push(cur); cur = ''; } else cur += ch;
    }
    r.push(cur.replace(/\r$/, ''));
    const n = k => { const v = parseFloat(r[T[k]]); return Number.isFinite(v) ? v : null; };
    const fga = (n('fga2') ?? 0) + (n('tpa') ?? 0);
    out.push({
      name: r[T.name], team: r[T.team], conf: r[T.conf], gp: n('gp'), minp: n('minp'), usg: n('usg'), ts: n('ts'), orb: n('orb'), drb: n('drb'),
      ast: n('ast'), tov: n('tov'), ftp: (n('fta') ?? 0) >= 20 ? n('ftp') : null, tpr: fga ? (n('tpa') ?? 0) / fga : null, tpp: n('tpp'), tpa: n('tpa'),
      blk: n('blk'), stl: n('stl'), cls: r[T.yr], ht: inches(r[T.ht]), year: n('year'), pid: r[T.pid], rec: n('rec'), pick: n('pick'), bpm: n('bpm'),
      mpg: n('mpg'), rpg: n('rpg'), apg: n('apg'), spg: n('spg'), bpg: n('bpg'), ppg: n('ppg'), role: r[T.role], dob: /^\d{4}-\d\d-\d\d$/.test(r[T.dob] ?? '') ? r[T.dob] : null,
    });
  }
  return out;
}

// ---------- Fetching ----------
const TORVIK = y => `https://barttorvik.com/getadvstats.php?year=${y}&csv=1`;
export const SOURCES = {
  tankBoard: { name: 'Tankathon big board', url: () => 'https://www.tankathon.com/big-board' },
  tankMock: { name: 'Tankathon mock draft', url: () => 'https://www.tankathon.com/mock-draft' },
  cbs: { name: 'CBS Sports prospect rankings', url: () => 'https://www.cbssports.com/nba/draft/prospect-rankings/' },
  hs: { name: '247Sports composite (high school)', url: c => `https://247sports.com/season/${c}-basketball/compositerecruitrankings/` },
  on3: { name: 'On3 industry rankings (high school)', url: c => `https://www.on3.com/db/rankings/industry-player/basketball/${c}/` },
  torvik: { name: 'Bart Torvik college stats', url: TORVIK },
};
const sleeperStats = s => `https://api.sleeper.com/stats/nba/${s}?season_type=regular`;
const fantasy = (st, scoring) => Object.entries(scoring).reduce((a, [k, v]) => a + (Number(st?.[k]) || 0) * v, 0);
const CHI = d => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(d);
// The next draft: this year's until July, then next year's.
export const nextDraftYear = (d = new Date()) => { const t = CHI(d); return Number(t.slice(0, 4)) + (Number(t.slice(5, 7)) >= 7 ? 1 : 0); };

// NBA seasons from Sleeper (comps' results): per season { pid: { ppg, gp, rank } } + name index.
async function nbaSeasons(getJson, first, last, scoring, log) {
  const seasons = {}, names = {}, display = {};
  for (let s = first; s <= last; s++) {
    const rows = await getJson(sleeperStats(s)).catch(e => { log(`Sleeper ${s} stats: ${e.message}`); return []; });
    const m = {};
    for (const x of rows ?? []) {
      if (!/^\d+$/.test(x.player_id) || !x.stats?.gp) continue;
      m[x.player_id] = { gp: x.stats.gp, ppg: fantasy(x.stats, scoring) / x.stats.gp };
      if (x.player) { display[x.player_id] = `${x.player.first_name} ${x.player.last_name}`; (names[key(display[x.player_id])] ??= new Set()).add(x.player_id); }
    }
    const ranked = Object.entries(m).filter(([, v]) => v.gp >= 20).sort((a, b) => b[1].ppg - a[1].ppg);
    ranked.forEach(([pid], i) => { m[pid].rank = i + 1; });
    if (ranked.length >= 120) seasons[s] = { players: m, line: ranked[71][1].ppg };
  }
  return { seasons, names, display };
}

// Drafted college players with NBA careers (the comps pool): built once from Torvik's files
// (2011 on) and topped up each year with the newest draft. { years: [], players: [...] }.
// seed = scripts/scout-pool.json (built Oct 2026 from a home computer, because Torvik turns GitHub's
// servers away): used when the saved pool is missing or older.
async function updatePool(pool, seed, getText, nba, sleeperPlayers, draftYear, log) {
  const fresh = p => (p?.version === POOL_VERSION ? p : null);
  pool = fresh(pool) ?? (fresh(seed) ? JSON.parse(JSON.stringify(seed)) : null) ?? { version: POOL_VERSION, years: [], players: [] };
  const need = [];
  for (let y = 2011; y < draftYear; y++) if (!pool.years.includes(y)) need.push(y);
  // Torvik files list a drafted player's pick on every college season; years go oldest first, so his
  // last college season (the draft year) replaces the earlier ones.
  const names = { ...nba.names };
  for (const [pid, p] of Object.entries(sleeperPlayers ?? {})) if (p?.first_name && /^\d+$/.test(pid)) (names[key(`${p.first_name} ${p.last_name}`)] ??= new Set()).add(pid);
  const playedBefore = (pid, y) => Object.entries(nba.seasons).some(([s, x]) => Number(s) < y && x.players[pid]);
  for (const y of need) {
    let rows;
    try { rows = parseTorvik(await getText(TORVIK(y))); } catch (e) { log(`Torvik ${y}: ${e.message}`); continue; }
    if (rows.length < 1000) { log(`Torvik ${y}: only ${rows.length} rows`); continue; }
    const drafted = rows.filter(r => r.pick > 0 && r.year === y);
    let added = 0;
    for (const r of drafted) {
      let c = [...(names[key(r.name)] ?? [])].filter(pid => !playedBefore(pid, y));
      if (c.length > 1) c = c.filter(pid => [0, 1, 2, 3].some(k => nba.seasons[y + k]?.players[pid]));
      if (c.length !== 1) continue;
      // Earlier seasons of the same player (drafted later) are replaced by this one.
      pool.players = pool.players.filter(p => !(p.sid === c[0]));
      pool.players.push({ n: r.name, D: y, pk: r.pick, sid: c[0], school: r.team, ...profileOf(r), age: ageAt(r.dob, y) });
      added++;
    }
    pool.years.push(y);
    log(`Comps pool: ${y} draft, ${added} drafted college players matched to Sleeper.`);
  }
  pool.years.sort();
  return pool;
}
const ageAt = (dob, y) => (dob ? r2((new Date(`${y}-06-25`) - new Date(dob)) / (365.25 * 864e5)) : null);
// A college season as the numbers comps and traits use: per 36 minutes (Torvik and Tankathon both
// have them), true shooting %, usage, BPM, assist rate; three-point volume and free throws only
// from Torvik.
const per36 = (x, mpg) => (x != null && mpg > 0 ? r2(x / mpg * 36) : null);
function profileOf(r) {
  return {
    role: r.role, ht: r.ht, pts36: per36(r.ppg, r.mpg), reb36: per36(r.rpg, r.mpg), ast36: per36(r.apg, r.mpg), stl36: per36(r.spg, r.mpg), blk36: per36(r.bpg, r.mpg),
    ts: r.ts, usg: r.usg, bpm: r.bpm == null ? null : r2(r.bpm), ast: r.ast, tpr: r.tpr == null ? null : r2(r.tpr), ftp: r.ftp,
  };
}
// Tankathon lists assists per 36, not assist rate: fitted on Torvik 2022-2026 (12,978 player
// seasons with 15+ games and minutes), assist rate = 0.357 + 5.247 x assists per 36 (off by ~1.7).
const astRateFrom36 = a36 => (a36 == null ? null : r1(0.357 + 5.247 * a36));
function profileOfTank(st) {
  const p = st.p36 ?? {};
  return { pts36: p.pts ?? null, reb36: p.reb ?? null, ast36: p.ast ?? null, stl36: p.stl ?? null, blk36: p.blk ?? null, ts: st.ts, usg: st.usg, bpm: st.bpm, ast: astRateFrom36(p.ast), tpr: null, ftp: null };
}

// ---------- Traits and comps ----------
// What carries over (shown as scouting notes; only BPM, assist rate and age move the grade).
// Per-36 numbers, so Torvik and Tankathon seasons compare; free throws and three-point volume only
// when Torvik could be read.
const TRAITS = [
  ['size', 'Size for his position', s => (s.ht && s.group ? s.ht - HEIGHT_BY_GROUP[s.group] : null)],
  ['passing', 'Playmaking (assists per 36)', s => s.ast36],
  ['steals', 'Steals per 36', s => s.stl36],
  ['blocks', 'Blocks per 36', s => s.blk36],
  ['touch', 'Shooting touch (free throws)', s => s.ftp],
  ['range', 'Three-point volume', s => s.tpr],
  ['efficiency', 'Scoring efficiency (true shooting)', s => s.ts],
  ['impact', 'All-around impact (BPM)', s => s.bpm],
  ['youth', 'Young for the class', s => (s.age == null ? null : -s.age)],
];
const pctRank = (arr, v) => (v == null || !arr.length ? null : arr.filter(x => x < v).length / arr.length);
function traitTable(pool) {
  const top = pool.filter(p => p.pk <= 30);
  const ref = {};
  for (const [id, , f] of TRAITS) ref[id] = top.map(p => f({ ...p, group: ROLE_GROUP[p.role] })).filter(x => x != null).sort((a, b) => a - b);
  return ref;
}
function traitsOf(s, ref, hasStats) {
  const out = [];
  for (const [id, label, f] of TRAITS) {
    if (!hasStats && id !== 'size' && id !== 'youth') continue;
    const p = pctRank(ref[id], f(s));
    if (p != null) out.push({ id, label, pct: Math.round(p * 100) });
  }
  return out;
}
// Comps: nearest drafted college players with NBA careers, on standardized style numbers (weights =
// how much each says about HOW he plays), plus draft slot so a #3 isn't matched to a #55. A number
// one side lacks is left out (and the rest scaled up), always within his position group.
const COMP_KEYS = [['ht', 1.4], ['ast36', 1.1], ['stl36', 0.9], ['blk36', 1], ['reb36', 0.8], ['pts36', 0.6], ['tpr', 0.8], ['ftp', 0.5], ['usg', 0.8], ['ts', 0.6], ['bpm', 0.8], ['age', 0.6], ['lp', 1]];
const COMP_TOTAL = COMP_KEYS.reduce((a, [, w]) => a + w, 0);
const compVal = (p, k) => (k === 'lp' ? Math.log(p.pk) : k === 'blk36' ? (p.blk36 == null ? null : Math.log1p(p.blk36)) : p[k]);
function compScaler(pool) {
  const stat = {};
  for (const [k] of COMP_KEYS) {
    const v = pool.map(p => compVal(p, k)).filter(x => x != null);
    const m = v.reduce((a, b) => a + b, 0) / v.length;
    stat[k] = [m, Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length) || 1];
  }
  return stat;
}
function comps(s, pool, scale, n = 3) {
  const me = { ...s, pk: Math.exp(s.lp) };
  return pool.filter(p => p.nba && ROLE_GROUP[p.role] === s.group).map(p => {
    let d = 0, used = 0;
    for (const [k, w] of COMP_KEYS) {
      const a = compVal(me, k), b = compVal(p, k);
      if (a == null || b == null) continue;
      d += w * ((a - b) / scale[k][1]) ** 2; used += w;
    }
    return { p, d: used ? d * COMP_TOTAL / used : 99 };
  }).sort((a, b) => a.d - b.d).slice(0, n).map(({ p, d }) => ({
    name: p.nm ?? p.n, sid: p.sid, D: p.D, pk: p.pk, school: p.school, sim: Math.max(0, Math.round(100 * Math.exp(-d / 12))), ...p.nba,
  }));
}
// A comp's NBA career under this league's scoring.
function careerOf(sid, nba) {
  let best = null, seasons = 0, last = null;
  for (const [s, x] of Object.entries(nba.seasons)) {
    const p = x.players[sid];
    if (!p) continue;
    seasons++; last = Number(s);
    if (p.gp >= 20 && (!best || p.ppg > best.ppg)) best = { ppg: p.ppg, rank: p.rank, season: Number(s) };
  }
  if (!seasons) return null;
  const tier = !best ? 'Barely played' : best.rank <= 24 ? 'Star' : best.rank <= 72 ? 'Starter' : best.rank <= 120 ? 'Rotation' : 'Bench';
  return { best: best ? r1(best.ppg) : null, bestRank: best?.rank ?? null, bestSeason: best?.season ?? null, seasons, last, tier };
}

// ---------- One class ----------
// boards: parsed sources for that draft year, [{ id, weight, rows }]. Consensus = weighted average
// of ln(rank); a player missing from a list that covers his range counts as just past its end.
function consensus(boards) {
  const players = {};
  for (const b of boards) for (const r of b.rows) {
    const k = key(r.name);
    const p = (players[k] ??= { key: k, name: r.name, ranks: {}, info: {} });
    p.ranks[b.id] = r.rank;
    for (const f of ['pos', 'school', 'ht', 'wt', 'cls', 'age']) if (p.info[f] == null && r[f] != null && r[f] !== '') p.info[f] = r[f];
    if (b.id === 'tankBoard') p.name = r.name; // Tankathon's spelling first
    if (r.st && !p.st) p.st = r.st;
  }
  for (const p of Object.values(players)) {
    let tot = 0, wt = 0;
    const logs = [];
    for (const b of boards) {
      const r = p.ranks[b.id] ?? b.rows.length + 8;
      tot += b.weight * Math.log(r); wt += b.weight; logs.push(Math.log(r));
    }
    p.score = tot / wt;
    const m = logs.reduce((a, b) => a + b, 0) / logs.length;
    p.disagree = logs.length > 1 ? Math.sqrt(logs.reduce((a, b) => a + (b - m) ** 2, 0) / (logs.length - 1)) : 0.3;
    const listed = Object.values(p.ranks);
    p.range = [Math.min(...listed), Math.max(...listed)];
  }
  return Object.values(players).sort((a, b) => a.score - b.score).slice(0, SCOUT_LIST);
}

function collegeClass(year, boards, torvik, pool, scale, ref, today, line) {
  const months = (new Date(`${year}-06-25`) - new Date(`${today}T12:00:00`)) / (30.4 * 864e5);
  const list = consensus(boards);
  // College stats: this season's when he has played, else last season's.
  const index = rows => { const m = {}; for (const r of rows ?? []) (m[key(r.name)] ??= []).push(r); return m; };
  const cur = index(torvik.cur), prev = index(torvik.prev);
  // Same name: the one at his school, else (one candidate) the one his height. Freshmen have no
  // college season before this one, so a same-name player from last season isn't him.
  const near = (a, b) => a == null || b == null || Math.abs(a - b) <= 2;
  const pickRow = (cands, info) => {
    const list = (cands ?? []).filter(r => near(r.ht, info.ht));
    const school = normName(info.school ?? '').split(' ')[0];
    return list.find(r => school && normName(r.team).includes(school)) ?? (list.length === 1 ? list[0] : null);
  };
  const prospects = list.map((p, i) => {
    const slot = i + 1;
    const c = pickRow(cur[p.key], p.info);
    const l = /^fr/i.test(p.info.cls ?? '') ? null : pickRow(prev[p.key], p.info);
    // Before games start, Torvik's new-season file repeats last season's numbers (without the
    // per-game columns): same games, minutes and usage = last season.
    const sameAsLast = c && l && c.gp === l.gp && c.minp === l.minp && c.usg === l.usg;
    const fresh = c && !sameAsLast && c.gp >= 1;
    const row = fresh ? { ...c, role: c.role || l?.role, dob: c.dob ?? l?.dob ?? null } : l;
    const statsFrom = row ? (fresh ? 'this' : 'last') : null;
    // No Torvik row (Torvik turns GitHub's servers away, or he isn't in it): Tankathon's numbers. They
    // don't say how many games, so a freshman's count fully only from mid-December (his first games
    // in early November count a little); international numbers are pro leagues, not college: skipped.
    const intl = /international|int/i.test(p.info.cls ?? '');
    const tank = !row && p.st && !intl ? p.st : null;
    const group = ROLE_GROUP[row?.role] ?? groupOfPos(p.info.pos) ?? 'W';
    const ageNow = p.info.age;
    const age = row?.dob ? ageAt(row.dob, year) : ageNow != null ? r2(ageNow + Math.max(0, months) / 12) : null;
    const x = Math.log(slot);
    const stats = row ? profileOf(row) : tank ? profileOfTank(tank) : null;
    // Numbers he hasn't shown yet (no college games, or only a few) count as typical for his slot;
    // his age always counts.
    const freshRamp = Math.min(1, Math.max(0, (new Date(`${today}T12:00:00`) - new Date(`${year - 1}-11-05T12:00:00`)) / (40 * 864e5)));
    const weight = !stats || stats.bpm == null || stats.ast == null ? 0
      : row ? Math.min(1, (row.gp ?? 0) / FULL_STATS_GAMES) : /^fr/i.test(p.info.cls ?? '') ? freshRamp : 1;
    const t = TYPICAL(x);
    const s = { bpm: weight * (stats?.bpm ?? 0) + (1 - weight) * t.bpm, ast: weight * (stats?.ast ?? 0) + (1 - weight) * t.ast, age: age ?? t.age };
    const shift = traitShift(x, s);
    const xe = slotFor(baseValue(x) + shift);
    const spread = Math.sqrt(spreadFor(months) ** 2 + (p.disagree * 0.7) ** 2);
    const q = draftChances(xe, spread);
    const prof = { ...(stats ?? {}), ht: p.info.ht ?? row?.ht ?? null, age, group, lp: xe };
    const hasStats = Boolean(stats && (row ? row.gp >= 5 : weight >= 0.4));
    const tg = tank?.pg ?? {};
    return {
      key: p.key, name: p.name, rank: slot, ranks: p.ranks, range: p.range,
      pos: p.info.pos ?? '', school: p.info.school ?? row?.team ?? '', cls: p.info.cls ?? row?.cls ?? '', ht: prof.ht, wt: p.info.wt ?? null, age: age == null ? null : r1(age),
      intl: intl && !row,
      stats: row ? { from: statsFrom, season: row.year, team: row.team, gp: row.gp, mpg: row.mpg, ppg: row.ppg, rpg: row.rpg, apg: row.apg, spg: row.spg, bpg: row.bpg, ts: row.ts, tpp: row.tpp, tpa: row.tpa, ftp: row.ftp, bpm: row.bpm, ast: row.ast, usg: row.usg, role: row.role }
        : tank ? { from: 'tank', team: p.info.school ?? '', ppg: tg.pts ?? null, rpg: tg.reb ?? null, apg: tg.ast ?? null, spg: tg.stl ?? null, bpg: tg.blk ?? null, ts: tank.ts, usg: tank.usg, bpm: tank.bpm, ast: stats.ast } : null,
      weight: r2(weight),
      shift: r2(Math.exp(x) - Math.exp(xe)), // + = his numbers play like an earlier pick
      effPick: r1(Math.exp(xe)),
      value: r2(baseValue(x) + shift),
      fpg: r1((baseValue(x) + shift) * line),
      chances: { rotation: r2(q.rotation), starter: r2(q.starter), star: r2(q.star) }, grade: gradeOf(q),
      traits: traitsOf(prof, ref, hasStats),
      comps: hasStats ? comps(prof, pool, scale) : [],
    };
  });
  // Class strength: what college numbers add to the 24 best expected values beyond the usual curve,
  // minus what an average class's numbers add (CLASS_LIFT, scaled by the share of those 24 with
  // stats, so a class of freshmen who haven't played yet reads as average).
  const top = prospects.map(p => p.value).sort((a, b) => b - a).slice(0, LEAGUE_ROOKIE_PICKS);
  const lift = top.reduce((a, v, j) => a + v - baseValue(Math.log(j + 1)), 0);
  const withStats = prospects.slice(0, LEAGUE_ROOKIE_PICKS).reduce((a, p) => a + (p.weight ?? 0), 0);
  const strength = 1 + (lift - CLASS_LIFT * withStats / LEAGUE_ROOKIE_PICKS) / CLASS_BASE_SUM;
  return { year, kind: 'college', strength: Math.round(strength * 1000) / 1000, statsTop24: Math.round(withStats), months: r1(months), prospects };
}

function hsClass(year, hs, away) {
  const s = HS_SPREAD[away] ?? 0.5;
  const prospects = hs.rows.slice(0, HS_LIST).map(r => {
    const q = hsChances(Math.log(r.rank), s);
    return {
      key: key(r.name), name: r.name, rank: r.rank, ranks: { hs: r.rank }, range: [r.rank, r.rank], pos: r.pos, school: r.school, cls: `HS ${hs.hsClass}`,
      ht: r.ht, wt: r.wt, rating: r.rating, age: null, stats: null, chances: { rotation: r2(q.rotation), starter: r2(q.starter), star: r2(q.star) }, grade: gradeOf(q),
      traits: [], comps: [],
    };
  });
  return { year, kind: 'hs', hsClass: hs.hsClass, strength: 1, prospects };
}

// ---------- The weekly run ----------
// getText(url) / getJson(url): fetchers. prev = last week's data/draft-scout.json (a source that
// fails keeps its last copy), pool = data/scout-pool.json, seed = scripts/scout-seed.json +
// scripts/scout-pool.json (starting copies from a home computer, for sources that turn GitHub away).
// The week's Sunday (Chicago date): one projection-history point per week.
export const weekOf = date => { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - d.getUTCDay()); return d.toISOString().slice(0, 10); };
export async function runScout({ getText, getJson, scoring, sleeperPlayers = null, prev = null, pool = null, seed = null, seedPool = null, now = new Date(), log = console.log }) {
  const today = CHI(now);
  const Y = nextDraftYear(now);
  const years = [Y, Y + 1, Y + 2];
  const status = [];
  const prevSrc = Object.fromEntries((prev?.sources ?? []).map(s => [s.id, s]));
  // Each source: fetch + parse (several sites tried in order); on failure, the last good copy.
  const cached = { ...(seed?.raw ?? {}), ...(prev?.raw ?? {}) };
  const raw = {};
  async function source(id, tries) {
    const errors = [];
    for (const [label, url, parse] of tries) {
      try {
        const out = parse(await getText(url));
        raw[id] = out;
        status.push({ id, name: label, url, ok: true, year: out.year, updated: out.updated, count: out.rows.length, read: today, ...(errors.length ? { note: errors.join('; ') } : {}) });
        return;
      } catch (e) { errors.push(`${label}: ${e.message}`); }
    }
    const [label, url] = tries[0];
    if (cached[id]) raw[id] = cached[id];
    const old = prevSrc[id];
    status.push({ id, name: old?.ok && cached[id] ? old.name : label, url: old?.url ?? url, ok: false, error: errors.join('; '), year: cached[id]?.year ?? null, updated: cached[id]?.updated ?? null, count: cached[id]?.rows.length ?? 0, read: old?.read ?? seed?.read ?? null });
    log(`Draft Scout: ${errors.join('; ')}${cached[id] ? ' (kept the last good copy)' : ''}.`);
  }
  await source('tankBoard', [[SOURCES.tankBoard.name, SOURCES.tankBoard.url(), parseTankathon]]);
  await source('tankMock', [[SOURCES.tankMock.name, SOURCES.tankMock.url(), parseTankathon]]);
  await source('cbs', [[SOURCES.cbs.name, SOURCES.cbs.url(), parseCbs]]);
  // High school classes (the 2 later drafts): 247Sports, else On3.
  for (const y of years.slice(1)) {
    await source(`hs${y}`, [
      [`${SOURCES.hs.name}, class of ${y - 1}`, SOURCES.hs.url(y - 1), h => parse247(h, y - 1)],
      [`${SOURCES.on3.name}, class of ${y - 1}`, SOURCES.on3.url(y - 1), h => parseOn3(h, y - 1)],
    ]);
  }

  // College stats: the draft year's season (this season) and the one before. Without them,
  // Tankathon's numbers are used.
  let torvik = { cur: [], prev: [] };
  try {
    torvik = { cur: parseTorvik(await getText(TORVIK(Y))), prev: parseTorvik(await getText(TORVIK(Y - 1))) };
    if (torvik.cur.length < 500 && torvik.prev.length < 500) throw new Error('empty file');
    status.push({ id: 'torvik', name: SOURCES.torvik.name, url: 'https://barttorvik.com/', ok: true, year: Y, count: torvik.cur.length, read: today });
  } catch (e) {
    torvik = { cur: [], prev: [] };
    status.push({ id: 'torvik', name: SOURCES.torvik.name, url: 'https://barttorvik.com/', ok: false, optional: true, error: `${e.message} (Tankathon's stats used instead)`, read: prevSrc.torvik?.read ?? null });
    log(`Draft Scout: Torvik stats failed (${e.message}); using Tankathon's.`);
  }

  // NBA results (comps) and the comps pool.
  const nba = await nbaSeasons(getJson, 2013, Y - 1, scoring, log);
  pool = await updatePool(pool, seedPool, getText, nba, sleeperPlayers, Y, log);
  for (const p of pool.players) { p.nba = careerOf(p.sid, nba); p.nm = nba.display[p.sid] ?? p.n; }
  const scale = compScaler(pool.players);
  const ref = traitTable(pool.players);
  const lastFull = Math.max(...Object.keys(nba.seasons).map(Number));
  const line = nba.seasons[lastFull]?.line ?? 27.7;

  // Freshness: a list updated within 2 months counts fully, older ones less.
  const weightOf = r => { const d = r?.updated ? (now - new Date(r.updated)) / 864e5 : 30; return d <= 60 ? 1 : d <= 180 ? 0.6 : 0.3; };
  const classes = {};
  for (const [i, y] of years.entries()) {
    const boards = ['tankBoard', 'tankMock', 'cbs'].filter(id => raw[id]?.year === y)
      .map(id => ({ id, weight: weightOf(raw[id]) * (id === 'tankMock' ? 0.5 : 1), rows: raw[id].rows }));
    if (boards.length) classes[y] = collegeClass(y, boards, torvik, pool.players, scale, ref, today, line);
    else if (raw[`hs${y}`]) classes[y] = hsClass(y, raw[`hs${y}`], i);
  }

  // Weekly projection history (the charts and grade changes on the page): one entry per week, dated
  // its Sunday; a rerun in the same week replaces it. { date, p: { key: [draft year, rank, grade,
  // starter %, star %, rotation %] } }. Players whose draft has passed are dropped.
  const week = weekOf(today);
  const weeks = (prev?.weeks ?? []).filter(h => h.date !== week).map(h => ({
    date: h.date, p: Object.fromEntries(Object.entries(h.p).filter(([, v]) => v[0] >= Y)),
  })).filter(h => Object.keys(h.p).length);
  const pct = x => Math.round(x * 100);
  const entry = {};
  for (const [y, c] of Object.entries(classes)) for (const p of c.prospects) entry[p.key] ??= [Number(y), p.rank, p.grade, pct(p.chances.starter), pct(p.chances.star), pct(p.chances.rotation)];
  weeks.push({ date: week, p: entry });
  weeks.sort((a, b) => (a.date < b.date ? -1 : 1));
  // ▲▼ = places moved in his class since the week before.
  const base = weeks.filter(h => h.date < week).at(-1);
  for (const [y, c] of Object.entries(classes)) {
    if (!base) break;
    for (const p of c.prospects) { const was = base.p[p.key]; p.move = !was || was[0] !== Number(y) ? 'new' : was[1] - p.rank; }
    c.since = base.date;
  }
  const out = {
    version: SCOUT_VERSION, built: today, builtAt: now.toISOString(), week, draftYear: Y, starterLine: r1(line), poolSize: pool.players.filter(p => p.nba).length,
    sources: status, classes, weeks, raw,
  };
  for (const p of pool.players) { delete p.nba; delete p.nm; }
  return { scout: out, pool };
}

// Rookie pick values (dynasty.js): how a class compares with an average one (1 = average).
// Only the class's college numbers can move it, so it stays close to 1 (see CLASS_BASE_SUM).
export const classStrength = (scout, season) => {
  const s = scout?.classes?.[season]?.strength;
  return Number.isFinite(s) && s > 0 ? Math.max(0.85, Math.min(1.15, s)) : 1;
};
