// Sleeper's PRIVATE GraphQL API (the one sleeper.com and the app use), READ-ONLY. Test features "Sleeper Insider"
// (owner, Nov 8 2026). No DOM here; the page is assets/sleeperpriv-ui.js. Nothing else on the site depends on this.
//
// Unofficial and undocumented: Sleeper can rename / remove things or lock it down at any time. Every call goes to
// GQL_URL only. The owner's token (when he pastes one) lives ONLY in this browser's localStorage under TOKEN_KEY:
// never gmSave (so never synced to Firestore), never in the repo or data/, never sent anywhere but sleeper.com.
//
// Found Nov 8 2026 (sleeper.com's league app bundle + live calls, no token):
// - matchup_legs_raw(league_id, round) { starters starters_games ... } answers WITHOUT a login. starters_games =
//   { player_id: Sleeper game_id } = the game each starter is LOCKED on (Lock-In mode; the app's lock button writes it
//   with the update_matchup_leg mutation). Unlocked starters have no entry. game_id = the public
//   /schedule/nba/regular/{season} rows' game_id. Checked vs the owner's Dev Dashboard picks, weeks 2-3: 64 of 65 the
//   same (the one miss: Peterson week 3, Sleeper says locked Fri Nov 6, the pick says not locked). 12 reads in a row
//   were byte-identical (the public matchups feed flips between server copies; this one didn't).
// - matchup_legs (same, plus points / players / subs) needs a login.
// - league_players(league_id) answers without a login: settings.otb = roster_id that put him on the TRADE BLOCK
//   (+ otb_added_at), metadata.note / likes, last_substituted_as_starter:regular:{season}:{week} = ms timestamp.
// - league_transactions_filtered (pending waivers / proposed trades), league_transactions_by_player,
//   league_event_logs, me: need a login.

export const GQL_URL = 'https://sleeper.com/graphql';
export const TOKEN_KEY = 'slp-token';

// ---- token (this browser only) -------------------------------------------------------------------------------
export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
}
export function saveToken(t) {
  try { localStorage.setItem(TOKEN_KEY, t); return true; } catch { return false; }
}
export function forgetToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* nothing saved */ }
}

// What a pasted value becomes: trimmed, no "Bearer ", no wrapping quotes. Returns '' if it doesn't look like a token.
export function cleanToken(raw) {
  let t = String(raw ?? '').trim().replace(/^authorization\s*:\s*/i, '').replace(/^bearer\s+/i, '').trim();
  t = t.replace(/^["']|["']$/g, '').trim();
  return /^[A-Za-z0-9._~+/=-]{20,4096}$/.test(t) ? t : '';
}

// A JWT's payload (exp / iat are seconds). Read locally only, to show when the token expires. null = not a JWT.
export function tokenInfo(t) {
  const parts = String(t || '').split('.');
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const p = JSON.parse(decodeURIComponent(escape(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)))));
    const exp = Number(p.exp) ? Number(p.exp) * 1000 : null;
    return { exp, iat: Number(p.iat) ? Number(p.iat) * 1000 : null, expired: exp != null && exp < Date.now(), user: p.user_id ?? p.sub ?? null };
  } catch {
    return null;
  }
}

// ---- read-only guard -------------------------------------------------------------------------------------------
// Strings and comments are blanked first, then ANY "mutation" / "subscription" keyword refuses the whole text.
export function readOnlyProblem(text) {
  const src = String(text ?? '')
    .replace(/"""[\s\S]*?"""/g, '""')
    .replace(/"(?:\\.|[^"\\\n])*"/g, '""')
    .replace(/#[^\n]*/g, '');
  if (!src.trim()) return 'The query is empty.';
  if (/\b(mutation|subscription)\b/i.test(src)) return 'Refused: this tool is read-only (no mutations or subscriptions).';
  if (!/^\s*(query\b|\{)/.test(src)) return 'Refused: a read-only request must start with "query" or "{".';
  return null;
}

export const opName = text => String(text ?? '').match(/^\s*query\s+([A-Za-z_]\w*)/)?.[1] ?? null;

// One GraphQL request. Throws only when the guard refuses; network / Sleeper errors come back in the result.
// Result: { ok, status, ms, data, errors, bytes, name, authed }.
export async function gql(query, variables = {}, { token = '', fetchImpl = globalThis.fetch.bind(globalThis) } = {}) {
  const bad = readOnlyProblem(query);
  if (bad) throw new Error(bad);
  const name = opName(query);
  const headers = { 'Content-Type': 'application/json' };
  if (name) headers['X-Sleeper-GraphQL-Op'] = name;
  if (token) headers.Authorization = token;
  const body = JSON.stringify(name ? { operationName: name, variables, query } : { variables, query });
  const t0 = Date.now();
  let res;
  try {
    res = await fetchImpl(GQL_URL, { method: 'POST', headers, body, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
  } catch (e) {
    return { ok: false, status: 0, ms: Date.now() - t0, data: null, errors: [{ message: `Network / CORS error: ${e.message}` }], bytes: 0, name, authed: !!token };
  }
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not JSON */ }
  const errors = json?.errors?.length ? json.errors : (json ? null : [{ message: `HTTP ${res.status}: ${text.slice(0, 300)}` }]);
  return { ok: res.ok && !errors, status: res.status, ms: Date.now() - t0, data: json?.data ?? null, errors, bytes: text.length, name, authed: !!token };
}

export const unauthorized = r => (r?.errors ?? []).some(e => e.code === 'unauthorized' || /unauthori[sz]ed/i.test(e.message ?? ''));

// ---- the explorer's candidate queries (all read-only) -----------------------------------------------------------
// auth: false = answered without a login (checked Nov 8 2026), true = needs the token. vars(ctx) builds variables
// from ctx = { league, round, date, season, rosterId, playerId, statuses }. `use` = which ctx fields the form shows.
const S = JSON.stringify;
export const CANDIDATES = [
  {
    id: 'locks', label: 'Locks: matchup_legs_raw', auth: false, use: ['round'],
    about: 'starters_games = the game each starter is locked on (no entry = not locked). The #1 question.',
    query: `query matchup_legs_raw($leagueId: String!, $round: Int!) {
  matchup_legs_raw(league_id: $leagueId, round: $round) {
    league_id leg round matchup_id roster_id points custom_points starters starters_games subs
  }
}`,
    vars: c => ({ leagueId: c.league, round: c.round }),
  },
  {
    id: 'legs', label: 'Full matchups: matchup_legs', auth: true, use: ['round'],
    about: 'What the Sleeper app reads for a week: points, projections, max points, players, starters_games, subs.',
    query: `query get_matchup_legs($leagueId: String!, $round: Int!) {
  matchup_legs(league_id: $leagueId, round: $round) {
    league_id leg matchup_id roster_id round starters players points proj_points max_points custom_points
    starters_games picks bans subs
  }
}`,
    vars: c => ({ leagueId: c.league, round: c.round }),
  },
  {
    id: 'myweeks', label: 'One team, many weeks', auth: true, use: ['rosterId', 'round'],
    about: 'matchup_legs_related_to_roster: a roster\'s weeks 1..N in one call (lineups + locks history).',
    query: c => `query matchup_legs_related_to_roster {
  matchup_legs_related_to_roster(roster_id: ${Number(c.rosterId) || 1}, league_id: ${S(c.league)}, start_round: 1, end_round: ${Number(c.round) || 1}) {
    league_id leg matchup_id roster_id round points custom_points proj_points starters starters_games subs
  }
}`,
    vars: () => ({}),
  },
  {
    id: 'block', label: 'Trade block: league_players', auth: false, use: [],
    about: 'settings.otb = roster that put him on the block (+ otb_added_at); metadata.note / likes.',
    query: `query league_players($leagueId: String!) {
  league_players(league_id: $leagueId) { league_id player_id metadata settings }
}`,
    vars: c => ({ leagueId: c.league }),
  },
  {
    id: 'pending', label: 'Pending waivers / trade offers', auth: true, use: ['statuses'],
    about: 'league_transactions_filtered with status filters (pending = waiver claims, proposed = trade offers). Shows what Sleeper lets YOUR account see.',
    query: `query league_transactions_filtered($league_id: String!, $roster_id_filters: [Int], $type_filters: [String], $leg_filters: [Int], $status_filters: [String], $limit: Int) {
  league_transactions_filtered(league_id: $league_id, roster_id_filters: $roster_id_filters, type_filters: $type_filters, leg_filters: $leg_filters, status_filters: $status_filters, limit: $limit) {
    adds consenter_ids created creator draft_picks drops league_id leg metadata roster_ids settings status status_updated transaction_id type player_map waiver_budget
  }
}`,
    vars: c => ({ league_id: c.league, roster_id_filters: [], type_filters: [], leg_filters: [], status_filters: c.statuses, limit: 50 }),
  },
  {
    id: 'byplayer', label: 'One player\'s transactions', auth: true, use: ['playerId'],
    about: 'league_transactions_by_player: every move with him, incl. status (failed claims, rejected offers?).',
    query: c => `query league_transactions_by_player {
  league_transactions_by_player(league_id: ${S(c.league)}, player_id: ${S(String(c.playerId || ''))}) {
    adds consenter_ids created creator drops league_id leg metadata roster_ids settings status status_updated transaction_id draft_picks type player_map waiver_budget
  }
}`,
    vars: () => ({}),
  },
  {
    id: 'events', label: 'League event log', auth: true, use: [],
    about: 'league_event_logs: the league\'s activity log (newest 50). Unknown contents: maybe lineup / lock events.',
    query: `query league_event_logs($leagueId: String!, $beforeLogId: String, $limit: Int, $eventTypes: [String]) {
  league_event_logs(league_id: $leagueId, before_log_id: $beforeLogId, limit: $limit, event_types: $eventTypes) {
    league_id log_id event_type data created
  }
}`,
    vars: c => ({ leagueId: c.league, limit: 50 }),
  },
  {
    id: 'scores', label: 'NBA games of a day: scores', auth: false, use: ['date'],
    about: 'Sleeper\'s live game list (game_id, status, tip time, on-court players, box score metadata).',
    query: `query scores($date: String!, $season: String!, $seasonType: String!, $sport: String!) {
  scores(date: $date, season: $season, season_type: $seasonType, sport: $sport) { game_id status start_time metadata }
}`,
    vars: c => ({ date: c.date, season: String(c.season), seasonType: 'regular', sport: 'nba' }),
  },
  {
    id: 'me', label: 'Check the token: me', auth: true, use: [],
    about: 'Only user_id, username, display_name (email / phone / token are never asked for).',
    query: `query me {
  me { user_id username display_name }
}`,
    vars: () => ({}),
  },
];

export const queryText = (cand, ctx) => (typeof cand.query === 'function' ? cand.query(ctx) : cand.query);

// ---- locks -------------------------------------------------------------------------------------------------------
// Sleeper's locks for one week: legs (matchup_legs_raw rows) + schedule rows (public /schedule/nba/regular/{s}).
// -> { roster_id: { starters: [pid], locks: { pid: { gameId, date, team, opp, status } | { gameId, date: null } } } }
export function locksFromLegs(legs, schedule = []) {
  const games = {};
  for (const g of schedule ?? []) {
    if (g?.game_id) games[g.game_id] = { date: g.date, home: g.home?.team ?? null, away: g.away?.team ?? null, status: g.status };
  }
  const out = {};
  for (const leg of legs ?? []) {
    const locks = {};
    for (const [pid, gameId] of Object.entries(leg.starters_games ?? {})) {
      const g = games[gameId];
      locks[pid] = g ? { gameId, date: g.date, home: g.home, away: g.away, status: g.status } : { gameId, date: null };
    }
    out[leg.roster_id] = { starters: (leg.starters ?? []).filter(p => p && p !== '0'), locks, matchup: leg.matchup_id ?? null, points: leg.custom_points ?? leg.points ?? null };
  }
  return out;
}

// Compare Sleeper's locks with Dev Dashboard picks for that week (law = { pid: { k, d } } from locks.js lawFor).
// -> rows { pid, sleeper: date|null, pick: 'lock DATE' | 'last' | 'zero' | null, same }
export function compareWithPicks(locks, law) {
  const rows = [];
  for (const pid of Object.keys(law ?? {})) {
    const p = law[pid];
    const s = Object.values(locks).find(t => t.locks[pid])?.locks[pid]?.date ?? null;
    const pick = p.k === 'lock' ? p.d : p.k;
    const same = p.k === 'lock' ? s === p.d : s == null;
    rows.push({ pid, sleeper: s, pick, same });
  }
  return rows;
}

// An UNLOCKED starter's counted game (owner's rule: no lock = his LAST LINEUP game of the week counts; games played from
// the bench never count). list = his box-score games that week (locks.js weekBoxes: { date, p, done }), bench = Set of
// dates he sat on this team's bench (locks.js benchDates, from the game-day watcher), left = his NBA team's games this
// week not finished yet. -> { g: counted game | null, p: points, final: nothing can change it any more, left, sat: games
// he played from the bench }. Checked Nov 8 2026: weeks 1-2, Sleeper's locks + this for every unlocked starter = Sleeper's
// official team total in 15 of 16 team-weeks (the 16th = bigtrey5456 week 1, 3 points of later box-score corrections:
// LaVine 45 -> 44, Isaiah Stewart 26 -> 24), and all 25 unlocked starters = league.json playerWeeks.
export function countedGame(list, bench, left = 0) {
  const played = (list ?? []).filter(g => g.done !== false);
  const lineup = played.filter(g => !bench?.has(g.date));
  const g = lineup.at(-1) ?? null;
  return { g, p: g ? g.p : 0, final: left === 0, left, sat: played.length - lineup.length };
}

// One week, every starter (owner, Nov 8 2026). Player points = TODAY's box score (after any NBA stat correction); the team
// total REPORTED = Sleeper's final (t.points) once the week is over, never re-added. saved = { 'owner|pid': points } from
// league.json playerWeeks (what Sleeper counted at the time, settled by weekfix) -> a starter whose counted game's box
// score changed since gets note { kind 'corr', was, now }; if the saved value equals ANOTHER of his games, { kind 'other' }
// (records and Sleeper's lock data disagree on which game counted). explained = sum(was - now); unexplained = official -
// today's sum - explained (a bench game the watcher missed, a lock read wrong...). benchOf(pid, owner) = Set of bench dates.
const r1 = n => Math.round(n * 10) / 10;
export function weekReport({ legs, schedule, boxes, benchOf, saved = {}, ownerOf, done = false }) {
  const locks = locksFromLegs(legs, schedule);
  const gameAt = {};
  for (const g of schedule ?? []) for (const s of [g.home?.team, g.away?.team]) if (s) gameAt[`${g.date}|${s}`] = `${g.away?.team} @ ${g.home?.team}`;
  const teams = {};
  for (const [rid, t] of Object.entries(locks)) {
    const owner = ownerOf[rid];
    const rows = t.starters.map(pid => {
      const list = boxes?.games?.[pid] ?? [];
      const played = list.filter(x => x.done !== false);
      const bench = benchOf?.(pid, owner) ?? new Set();
      const l = t.locks[pid] ?? null;
      let g = null;
      let left = 0;
      let final = true;
      if (l) g = l.date ? list.find(x => x.date === l.date) ?? null : null;
      else {
        const nbaTeam = list.at(-1)?.team;
        left = nbaTeam ? (boxes?.sched?.[nbaTeam] ?? []).filter(x => !x.done).length : 0;
        const c = countedGame(list, bench, left);
        g = c.g;
        final = c.final;
      }
      const p = g ? g.p : 0;
      const sv = saved[`${owner}|${pid}`];
      let note = null;
      if (done && sv != null && Math.abs(sv - p) >= 0.05) {
        const other = played.find(x => x !== g && Math.abs(x.p - sv) < 0.05);
        note = other ? { kind: 'other', was: sv, now: p, otherDate: other.date } : { kind: 'corr', was: sv, now: p };
      }
      return { pid, lock: l, g, p, left, final, played: played.length, benchGames: played.filter(x => bench.has(x.date)), saved: sv ?? null, note, matchup: g ? gameAt[`${g.date}|${g.team}`] ?? null : null };
    });
    const today = r1(rows.reduce((s, r) => s + r.p, 0));
    const explained = r1(rows.reduce((s, r) => s + (r.note ? r.note.was - r.note.now : 0), 0));
    const official = t.points ?? null;
    const unexplained = done && official != null ? r1(official - today - explained) : null;
    teams[rid] = { rid, owner, rows, today, official, explained, unexplained, open: rows.filter(r => !r.final).length, extras: Object.keys(t.locks).filter(pid => !t.starters.includes(pid)), matchup: t.matchup, locks: t.locks };
  }
  return { locks, teams };
}

// Everything odd in one week, as plain records (cacheable): { week, owner, pid, kind, ... }.
// kinds: corr (stat corrected after the week), other (records say a different game counted), total (team total off by
// more than the corrections explain), bench (played from the bench: those games didn't count), zero (played, but only
// from the bench: 0), extra (locked, but not in the final starters: traded after his lock?), nogame (lock on a game id
// not on the schedule), pick (Sleeper's lock != your Dev Dashboard pick; added live, never cached).
export function weekOddities(week, rep) {
  const out = [];
  for (const t of Object.values(rep.teams)) {
    for (const r of t.rows) {
      const base = { week, owner: t.owner, pid: r.pid };
      if (r.note) out.push({ ...base, kind: r.note.kind, was: r.note.was, now: r.note.now, date: r.g?.date ?? null, otherDate: r.note.otherDate ?? null });
      if (r.lock && !r.lock.date) out.push({ ...base, kind: 'nogame' });
      // Only bench games that CHANGED what counts: an unlocked starter benched for games after his last lineup game (so an
      // earlier game counted), or benched for all of them (0). Bench games before he moved in, or before a lock, are routine.
      const late = r.lock ? [] : r.benchGames.filter(x => !r.g || x.date > r.g.date);
      // Only once his week is settled (no games left): a player still to play can move back into the lineup and his
      // last game counts after all (owner, Nov 8 2026: Dejounte Murray was flagged while playing his Sunday game).
      if (late.length && r.final) {
        out.push({ ...base, kind: r.g ? 'bench' : 'zero', dates: late.map(x => ({ date: x.date, p: x.p })), counted: r.g ? { date: r.g.date, p: r.g.p } : null, live: !r.final });
      }
    }
    if (t.unexplained != null && Math.abs(t.unexplained) >= 0.05) out.push({ week, owner: t.owner, pid: null, kind: 'total', official: t.official, today: t.today, explained: t.explained, diff: t.unexplained });
    for (const pid of t.extras) out.push({ week, owner: t.owner, pid, kind: 'extra', date: t.locks[pid]?.date ?? null });
  }
  return out;
}

// "Save Sleeper's locks as picks" (owner, Nov 8 2026: the solver gets Sleeper's locks ONLY when he presses the button).
// locks = locksFromLegs(), law = lawFor() picks, ownerOf = roster_id -> owner id (the MATCHUP lineup's team, so a starter
// traded after his lock stays with his old team, like the Dev Dashboard), ptsOf(pid, date) = box-score points, done =
// the week is over (only then does Sleeper's "not locked" mean "his last lineup game counts").
// -> { add: [pick], same: n, differ: [{ pid, o, sleeper, pick, save: pick | null }] }; pick = { pid, o, k, d, p }.
// Existing picks are NEVER overwritten by the bulk save: differences are listed, one button each.
export function picksToSave(locks, law, ownerOf, ptsOf, { done = false } = {}) {
  const add = [];
  const differ = [];
  let same = 0;
  for (const [rid, t] of Object.entries(locks)) {
    const o = ownerOf[rid];
    if (!o) continue;
    for (const pid of t.starters) {
      const l = t.locks[pid];
      const pick = law[pid];
      if (l && !l.date) continue; // game id not on the schedule: can't name the game
      const want = l
        ? { pid, o, k: 'lock', d: l.date, p: Number(ptsOf(pid, l.date)) || 0 }
        : (done ? { pid, o, k: 'last', d: '', p: 0 } : null);
      if (!pick) { if (l) add.push(want); continue; }
      const isSame = l ? pick.k === 'lock' && pick.d === l.date : pick.k !== 'lock';
      if (isSame) { same++; continue; }
      differ.push({ pid, o, sleeper: l ? l.date : null, pick: pick.k === 'lock' ? pick.d : pick.k, save: want });
    }
  }
  return { add, same, differ };
}

// Trade block from league_players rows -> [{ pid, roster, at, note }], newest first.
export function tradeBlock(rows) {
  return (rows ?? [])
    .filter(r => r?.settings?.otb != null && /^\d+$/.test(String(r.player_id)))
    .map(r => ({ pid: String(r.player_id), roster: Number(r.settings.otb), at: Number(r.settings.otb_added_at) || null, note: r.metadata?.note ?? '' }))
    .sort((a, b) => (b.at ?? 0) - (a.at ?? 0));
}
