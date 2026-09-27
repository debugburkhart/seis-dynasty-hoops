// Pulls every season of the league from Sleeper and flattens it into one object.
// Used by the nightly GitHub Action (scripts/update.mjs) and, if data/league.json
// is missing, by the browser as a live fallback.

import { CORRECTIONS, DRAFT_CORRECTIONS } from './corrections.js';

const API = 'https://api.sleeper.com/v1';

const round1 = n => Math.round((Number(n) || 0) * 10) / 10;
const ordinal = n => n + ({ 1: 'st', 2: 'nd', 3: 'rd' }[n] || 'th');

export async function buildLeagueData(leagueId, fetchImpl = globalThis.fetch.bind(globalThis)) {
  // Sleeper's cache can serve stale matchup scores for weeks after the fact
  // (2025 week 17 came back 290-315 instead of the real 355-352), so every
  // request carries a unique value to force a fresh copy.
  const bust = Date.now();
  const get = async (path, fallback) => {
    const res = await fetchImpl(`${API}${path}?t=${bust}`);
    if (!res.ok) {
      if (fallback !== undefined) return fallback;
      throw new Error(`Sleeper returned ${res.status} for ${path}`);
    }
    return (await res.json()) ?? fallback;
  };

  const state = await get('/state/nba');
  const currentWeek = Math.max(state.week || 0, state.leg || 0);

  // Walk forward to the newest season. When the league renews, Sleeper creates
  // a new league whose previous_league_id points back at this one, so look
  // through the managers' leagues for next season to find it.
  let newest = leagueId;
  for (;;) {
    const lg = await get(`/league/${newest}`);
    const nextSeason = Number(lg.season) + 1;
    const users = await get(`/league/${newest}/users`, []);
    let renewed = null;
    for (const u of users) {
      const theirs = await get(`/user/${u.user_id}/leagues/nba/${nextSeason}`, []);
      renewed = theirs.find(l => l.previous_league_id === newest);
      if (renewed) break;
    }
    if (!renewed) break;
    newest = renewed.league_id;
  }

  // Walk back through previous seasons, oldest first.
  const chain = [];
  for (let id = newest; id && id !== '0';) {
    const lg = await get(`/league/${id}`);
    chain.unshift(lg);
    id = lg.previous_league_id;
  }

  const owners = {};
  const seasons = [];
  const games = [];
  const medianGames = [];
  const schedule = [];
  const playerWeeks = []; // { s, w, t, o, pid, p }: locked points per player per team per week
  const usedPlayers = new Set();
  const transactions = []; // { s, w, ts, type, owners, adds: {pid: owner}, drops: {pid: owner}, picks }
  const drafts = []; // { s, id, ts, kind, picks: [{ round, no, pid, o, orig }] }
  const warnings = []; // problems the nightly check should email about

  // Player names, for display and for matching player corrections by name.
  const allPlayers = await get('/players/nba', {});
  const plain = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
  const fullName = pid => [allPlayers[pid]?.first_name, allPlayers[pid]?.last_name].filter(Boolean).join(' ');
  // Prefer a player on that team's roster that week; fall back to the whole league.
  const findPlayer = (wanted, roster = []) => {
    const key = plain(wanted);
    return roster.find(pid => plain(fullName(pid)) === key)
      ?? Object.keys(allPlayers).find(pid => plain(fullName(pid)) === key);
  };

  for (const lg of chain) {
    const season = lg.season;
    const st = lg.settings || {};
    const [users, rosters, bracket, losersBracket] = await Promise.all([
      get(`/league/${lg.league_id}/users`, []),
      get(`/league/${lg.league_id}/rosters`, []),
      get(`/league/${lg.league_id}/winners_bracket`, []),
      get(`/league/${lg.league_id}/losers_bracket`, []),
    ]);

    // Owners are tracked by Sleeper user ID so they carry across seasons.
    const userById = Object.fromEntries(users.map(u => [u.user_id, u]));
    const ownerOf = {};
    for (const r of rosters) {
      const oid = r.owner_id || `open-${r.roster_id}`;
      ownerOf[r.roster_id] = oid;
      const u = userById[oid];
      const o = (owners[oid] ??= { id: oid, name: u?.display_name || `Open Team ${r.roster_id}`, avatar: null, teams: {} });
      if (u) {
        o.name = u.display_name;
        o.avatar = u.avatar || null;
      }
      o.teams[season] = u?.metadata?.team_name || o.name;
    }

    // Which weeks are final. The in-progress week is left out.
    const playoffStart = st.playoff_week_start || 99;
    let lastWeek = st.last_scored_leg || 0;
    if (lg.status !== 'complete' && season === state.league_season) {
      if (state.season_type === 'pre') lastWeek = 0;
      else if (state.season_type === 'regular') lastWeek = Math.min(st.last_scored_leg ?? currentWeek - 1, currentWeek - 1);
    }
    lastWeek = Math.max(0, lastWeek);

    const weekly = await Promise.all(
      Array.from({ length: lastWeek }, (_, i) => get(`/league/${lg.league_id}/matchups/${i + 1}`, [])),
    );

    const pts = {}; // pts[week][rosterId]
    const locked = {}; // locked[week][rosterId] = [[playerId, points], ...]
    // Save a team's locked player points for a game (t: 'R', 'P' or 'X'). Playoff
    // weeks only count for teams actually playing a bracket game that week.
    const lockIn = (t, rid, start, end) => {
      for (let w = start; w <= end; w++) {
        for (const [pid, p] of locked[w]?.[rid] ?? []) {
          playerWeeks.push({ s: season, w, t, o: ownerOf[rid], pid, p });
          usedPlayers.add(pid);
        }
      }
    };
    weekly.forEach((rows, i) => {
      const w = i + 1;
      pts[w] = {};
      locked[w] = {};
      const pairs = {};
      const fix = CORRECTIONS.find(c => c.season === season && c.week === w)?.scores ?? {};
      for (const m of rows) {
        const fixed = fix[owners[ownerOf[m.roster_id]]?.name];
        pts[w][m.roster_id] = round1(fixed ?? m.custom_points ?? m.points);
        if (m.matchup_id != null) (pairs[m.matchup_id] ??= []).push(m);
        // Locked points: what each starter scored while in the lineup. These add
        // up to the team's score; bench points never counted and are left out.
        locked[w][m.roster_id] = (m.starters ?? [])
          .map((pid, j) => [pid, round1(m.starters_points?.[j] ?? 0)])
          .filter(([pid, p]) => pid && pid !== '0' && p);
        // Player-level corrections from assets/corrections.js.
        const manager = owners[ownerOf[m.roster_id]]?.name;
        const playerFix = CORRECTIONS.find(c => c.season === season && c.week === w)?.players?.[manager] ?? {};
        for (const [wanted, p] of Object.entries(playerFix)) {
          const pid = findPlayer(wanted, m.players ?? []);
          if (!pid) {
            warnings.push(`${season} week ${w} ${manager}: corrections.js lists "${wanted}", but no Sleeper player has that name. Check the spelling.`);
            continue;
          }
          const row = locked[w][m.roster_id].find(x => x[0] === pid);
          if (row) row[1] = p;
          else locked[w][m.roster_id].push([pid, p]);
        }
      }
      if (w >= playoffStart) return; // playoff games come from the bracket below
      const playing = [];
      for (const [x, y] of Object.values(pairs)) {
        if (!y) continue;
        const ap = pts[w][x.roster_id];
        const bp = pts[w][y.roster_id];
        if (!ap && !bp) continue;
        games.push({ s: season, w, t: 'R', a: ownerOf[x.roster_id], b: ownerOf[y.roster_id], ap, bp, win: ap > bp ? 'a' : bp > ap ? 'b' : 'tie' });
        playing.push(x, y);
        lockIn('R', x.roster_id, w, w);
        lockIn('R', y.roster_id, w, w);
      }
      // League-median game: every team also plays the week's median score, so a
      // top-half score is a second win. Sleeper counts these in the standings.
      if (st.league_average_match && playing.length) {
        const ps = playing.map(m => pts[w][m.roster_id]).sort((a, b) => a - b);
        const mid = ps.length / 2;
        const median = round1(ps.length % 2 ? ps[Math.floor(mid)] : (ps[mid - 1] + ps[mid]) / 2);
        for (const m of playing) {
          const p = pts[w][m.roster_id];
          medianGames.push({ s: season, w, o: ownerOf[m.roster_id], p, median, res: p > median ? 'W' : p < median ? 'L' : 'T' });
        }
      }
    });

    // The full regular-season schedule, including weeks not played yet, for the
    // Power Rankings' schedule outlook. Sleeper sets every pairing before the season.
    if (st.playoff_week_start) {
      const future = lg.status === 'complete' ? [] : await Promise.all(
        Array.from({ length: Math.max(0, playoffStart - 1 - lastWeek) }, (_, i) =>
          get(`/league/${lg.league_id}/matchups/${lastWeek + 1 + i}`, [])),
      );
      [...weekly.slice(0, playoffStart - 1), ...future].forEach((rows, i) => {
        const pairs = {};
        for (const m of rows) if (m.matchup_id != null) (pairs[m.matchup_id] ??= []).push(m.roster_id);
        for (const [x, y] of Object.values(pairs)) {
          if (y != null) schedule.push({ s: season, w: i + 1, a: ownerOf[x], b: ownerOf[y] });
        }
      });
    }

    // Playoffs. t: 'P' = championship bracket, 'X' = placement game (3rd, 5th...).
    const maxRound = Math.max(0, ...bracket.map(g => g.r));
    const roundLen = r => (st.playoff_round_type === 2 ? 2 : st.playoff_round_type === 1 && r === maxRound ? 2 : 1);
    const roundStart = r => {
      let w = playoffStart;
      for (let i = 1; i < r; i++) w += roundLen(i);
      return w;
    };
    let champion = null;
    let runnerUp = null;
    for (const g of bracket) {
      if (typeof g.t1 !== 'number' || typeof g.t2 !== 'number' || g.w == null) continue;
      const start = roundStart(g.r);
      const end = start + roundLen(g.r) - 1;
      if (end > lastWeek) continue;
      let ap = 0;
      let bp = 0;
      for (let w = start; w <= end; w++) {
        ap += pts[w]?.[g.t1] ?? 0;
        bp += pts[w]?.[g.t2] ?? 0;
      }
      const label = g.p === 1 ? 'Championship'
        : g.p ? `${ordinal(g.p)} place game`
        : g.r === maxRound - 1 ? 'Semifinal'
        : g.r === maxRound - 2 ? 'Quarterfinal'
        : `Playoff round ${g.r}`;
      const t = g.p && g.p !== 1 ? 'X' : 'P';
      games.push({
        s: season, w: start, t, label,
        a: ownerOf[g.t1], b: ownerOf[g.t2], ap: round1(ap), bp: round1(bp),
        win: g.w === g.t1 ? 'a' : 'b',
      });
      lockIn(t, g.t1, start, end);
      lockIn(t, g.t2, start, end);
      if (g.p === 1) {
        champion = ownerOf[g.w];
        runnerUp = ownerOf[g.l];
      }
    }

    // Losers bracket (last-place game). Counts toward head-to-head, not playoff record.
    // Sleeper's bracket "winner" here can mean the loser advancing, so points decide it.
    for (const g of losersBracket) {
      if (typeof g.t1 !== 'number' || typeof g.t2 !== 'number') continue;
      const start = roundStart(g.r);
      const end = start + roundLen(g.r) - 1;
      if (end > lastWeek) continue;
      let ap = 0;
      let bp = 0;
      for (let w = start; w <= end; w++) {
        ap += pts[w]?.[g.t1] ?? 0;
        bp += pts[w]?.[g.t2] ?? 0;
      }
      if (!ap && !bp) continue;
      games.push({
        s: season, w: start, t: 'X', label: g.p === 1 ? 'Last place game' : 'Consolation',
        a: ownerOf[g.t1], b: ownerOf[g.t2], ap: round1(ap), bp: round1(bp),
        win: ap > bp ? 'a' : bp > ap ? 'b' : g.w === g.t1 ? 'a' : 'b',
      });
      lockIn('X', g.t1, start, end);
      lockIn('X', g.t2, start, end);
    }

    // ---------- Front office: transactions and drafts ----------
    // Sleeper files transactions by week ("leg"); offseason moves land in week 1
    // of the new league. Rosters are stored as owners; traded draft picks keep the
    // original team's roster ID, which is how a pick is matched to who used it.
    const maxLeg = lg.status === 'complete' ? 26 : Math.max(currentWeek, 1) + 1;
    const legs = await Promise.all(Array.from({ length: maxLeg + 1 }, (_, w) => get(`/league/${lg.league_id}/transactions/${w}`, [])));
    const toOwners = map => Object.fromEntries(Object.entries(map ?? {}).map(([pid, rid]) => {
      usedPlayers.add(pid);
      return [pid, ownerOf[rid]];
    }));
    for (const x of legs.flat()) {
      if (x?.status !== 'complete') continue;
      transactions.push({
        s: season, w: x.leg, ts: x.status_updated ?? x.created, type: x.type,
        owners: (x.roster_ids ?? []).map(r => ownerOf[r]),
        adds: toOwners(x.adds), drops: toOwners(x.drops),
        picks: (x.draft_picks ?? []).map(p => ({ season: p.season, round: p.round, orig: p.roster_id, from: ownerOf[p.previous_owner_id], to: ownerOf[p.owner_id] })),
      });
    }
    for (const d of await get(`/league/${lg.league_id}/drafts`, [])) {
      if (d.status !== 'complete') continue;
      const [detail, picks] = await Promise.all([get(`/draft/${d.draft_id}`, {}), get(`/draft/${d.draft_id}/picks`, [])]);
      const slotToRoster = detail.slot_to_roster_id ?? {};
      drafts.push({
        s: season, id: d.draft_id, ts: detail.start_time ?? d.start_time,
        kind: d.settings?.rounds > 5 ? 'startup' : 'rookie',
        picks: picks.filter(p => p.player_id && !DRAFT_CORRECTIONS.some(c => c.ignore && c.season === season && Number(c.pick) === p.pick_no)).map(p => {
          // A pick fixed in corrections.js (e.g. a duplicate player entry) becomes that player.
          const fix = DRAFT_CORRECTIONS.find(c => c.season === season && Number(c.pick) === p.pick_no);
          let pid = p.player_id;
          if (fix) {
            pid = findPlayer(fix.player) ?? pid;
            if (pid === p.player_id) warnings.push(`${season} draft pick ${p.pick_no}: corrections.js lists "${fix.player}", but no Sleeper player has that name. Check the spelling.`);
          }
          usedPlayers.add(pid);
          return { round: p.round, no: p.pick_no, pid, o: ownerOf[p.roster_id], orig: slotToRoster[p.draft_slot] ?? p.roster_id };
        }),
      });
    }

    seasons.push({
      season,
      leagueId: lg.league_id,
      name: lg.name,
      status: lg.status,
      weeksPlayed: lastWeek,
      playoffStart,
      champion,
      runnerUp,
      medianGame: Boolean(st.league_average_match),
      // Every team in the championship bracket, including first-round byes
      // (a bye team's first game has one side that didn't come from an earlier round).
      // Sleeper shows a projected bracket all season, so only once playoffs start.
      playoffTeams: lastWeek < playoffStart ? [] : [...new Set(bracket
        .filter(g => g.p == null)
        .flatMap(g => [g.t1_from ? null : g.t1, g.t2_from ? null : g.t2])
        .filter(r => typeof r === 'number'))].map(r => ownerOf[r]),
      teams: rosters.map(r => ({
        owner: ownerOf[r.roster_id],
        rosterId: r.roster_id,
        team: owners[ownerOf[r.roster_id]].teams[season],
        w: r.settings?.wins ?? 0,
        l: r.settings?.losses ?? 0,
        t: r.settings?.ties ?? 0,
        pf: round1((r.settings?.fpts ?? 0) + (r.settings?.fpts_decimal ?? 0) / 100),
        pa: round1((r.settings?.fpts_against ?? 0) + (r.settings?.fpts_against_decimal ?? 0) / 100),
      })),
    });
  }

  // Names and positions for every player who has scored locked points here.
  // Sleeper's full list is ~2.5 MB, so only those players are kept.
  const players = {};
  for (const pid of usedPlayers) {
    const p = allPlayers[pid];
    players[pid] = p
      ? { n: [p.first_name, p.last_name].filter(Boolean).join(' ') || pid, pos: p.position ?? p.fantasy_positions?.[0] ?? '' }
      : { n: `Player ${pid}`, pos: '' };
  }

  const latest = chain.at(-1);
  return {
    generatedAt: new Date().toISOString(),
    leagueId: newest,
    name: latest.name,
    currentSeason: latest.season,
    seasons,
    owners,
    games,
    medianGames,
    schedule,
    playerWeeks,
    players,
    transactions,
    drafts,
    warnings,
  };
}
