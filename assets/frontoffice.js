// Front office ledger: every draft pick, trade, waiver claim and free-agent move,
// valued by the locked points it actually produced.
//
// A "stint" is a player's time on one team: it starts when the team acquires
// him (draft, trade, waiver or free agent) and ends when he leaves (trade or
// drop). A stint's value is the locked points he scored in that team's lineups
// during it. A stint still running is marked active, since its value is still growing.
// Values also carry the weeks they came from ({ k: season*100+week, p }), so
// awards can count a single season.
//
// Draft picks are valued by who they became: the drafted player's stint with the
// team that used the pick. In a trade, a pick is worth that value to whoever
// receives it and costs it to whoever sends it, so a pick flipped through several
// teams nets out along the way. Picks not used yet (future drafts, or a draft
// whose season hasn't started) count as 0 for now and mark the deal as an estimate.

const r1 = n => Math.round(n * 10) / 10;
const key = (s, w) => Number(s) * 100 + Number(w);

// season: only moves made in that season are listed, but each is still valued by
// everything it has produced since (a trade's value doesn't stop at season's end).
export function frontOffice(DATA, season = 'all') {
  const inSeason = s => season === 'all' || s === season;
  const seasonsWithGames = new Set((DATA.games ?? []).map(g => g.s));

  // Locked points by player and team, for summing stints.
  const pts = {};
  for (const x of DATA.playerWeeks ?? []) (pts[`${x.pid}|${x.o}`] ??= []).push({ k: key(x.s, x.w), p: x.p });

  // Sleeper sometimes drafts a duplicate player entry ("Name DUPLICATE") that
  // never scores; the commissioner then adds the real player to the same team.
  // Treat the pick as the real player, and that commissioner add as part of it.
  const plainName = pid => (DATA.players?.[pid]?.n ?? '').replace(/\s*duplicate\s*/i, ' ').trim().toLowerCase();
  const isDuplicate = pid => /duplicate/i.test(DATA.players?.[pid]?.n ?? '');
  const fixedAdds = new Set(); // "transaction index|player" commissioner adds folded into a pick
  const draftPid = {}; // pick -> the player it really became
  for (const d of DATA.drafts ?? []) {
    for (const p of d.picks) {
      draftPid[`${d.s}|${p.no}`] = p.pid;
      if (!isDuplicate(p.pid)) continue;
      (DATA.transactions ?? []).some((x, i) => {
        if (x.type !== 'commissioner') return false;
        // Same name, or same last name ("Ron Holland" vs "Ronald Holland"), added to the drafting team.
        const lastName = pid => plainName(pid).split(' ').at(-1);
        const real = Object.entries(x.adds).find(([pid, o]) => o === p.o && !isDuplicate(pid)
          && (plainName(pid) === plainName(p.pid) || lastName(pid) === lastName(p.pid)));
        if (!real) return false;
        draftPid[`${d.s}|${p.no}`] = real[0];
        fixedAdds.add(`${i}|${real[0]}`);
        return true;
      });
    }
  }

  // Every roster event, oldest first. Drafts come before that season's week-1 moves.
  const events = [];
  for (const d of DATA.drafts ?? []) {
    for (const p of d.picks) events.push({ pid: draftPid[`${d.s}|${p.no}`], o: p.o, dir: 'in', k: key(d.s, 0), ts: d.ts ?? 0, src: 'draft', ref: p });
  }
  (DATA.transactions ?? []).forEach((x, i) => {
    if (x.type === 'commissioner' && !Object.keys(x.adds).length && !Object.keys(x.drops).length) return;
    for (const [pid, o] of Object.entries(x.drops)) events.push({ pid, o, dir: 'out', k: key(x.s, x.w), ts: x.ts ?? 0, seq: 0, src: x.type, tx: i });
    for (const [pid, o] of Object.entries(x.adds)) {
      if (fixedAdds.has(`${i}|${pid}`)) continue; // already counted as the draft pick
      events.push({ pid, o, dir: 'in', k: key(x.s, x.w), ts: x.ts ?? 0, seq: 1, src: x.type, tx: i });
    }
  });
  const unusedDuplicates = [];
  for (const d of DATA.drafts ?? []) for (const p of d.picks) if (isDuplicate(draftPid[`${d.s}|${p.no}`])) unusedDuplicates.push({ s: d.s, no: p.no, o: p.o, pid: p.pid });
  events.sort((a, b) => a.k - b.k || a.ts - b.ts || (a.seq ?? 0) - (b.seq ?? 0));

  // Build stints: each "in" runs until the same team's next "out" for that player.
  // A week is credited to only one stint, so a same-week drop and re-add can't double count.
  const byPlayer = {};
  for (const e of events) (byPlayer[e.pid] ??= []).push(e);
  const stintOf = new Map(); // "in" event -> stint
  for (const list of Object.values(byPlayer)) {
    const open = {};
    for (const e of list) {
      if (e.dir === 'in') {
        if (open[e.o]) open[e.o].end = e.k; // re-acquired without a recorded drop
        open[e.o] = { pid: e.pid, o: e.o, start: e.k, end: null, event: e };
        stintOf.set(e, open[e.o]);
      } else if (open[e.o]) {
        open[e.o].end = e.k;
        open[e.o].endSrc = e.src;
        delete open[e.o];
      }
    }
  }
  const byTeam = {};
  for (const st of stintOf.values()) (byTeam[`${st.pid}|${st.o}`] ??= []).push(st);
  for (const [k, list] of Object.entries(byTeam)) {
    list.sort((a, b) => a.start - b.start);
    for (const st of list) { st.value = 0; st.weeks = []; }
    for (const w of pts[k] ?? []) {
      // The latest stint that started on or before this week and hadn't ended before it.
      const st = list.filter(s => s.start <= w.k && (s.end == null || s.end >= w.k)).at(-1);
      if (st) { st.value += w.p; st.weeks.push(w); }
    }
    for (const st of list) { st.value = r1(st.value); st.active = st.end == null; }
  }
  const stint = e => (e ? stintOf.get(e) : null);

  // Draft picks. Two values:
  //   value:  locked points for the team that drafted him, while he was theirs
  //           (what the pick is worth in trades, and "points from draftees").
  //   career: locked points for any team since the draft, which judges the pick
  //           itself, so trading a star away soon after drafting him isn't a bust.
  // Each pick is compared with the average career of its round in the same draft.
  // Drafts whose season has no games yet are pending.
  const careerSince = (pid, k) => {
    let total = 0;
    for (const [pk, list] of Object.entries(pts)) if (pk.startsWith(`${pid}|`)) for (const w of list) if (w.k >= k) total += w.p;
    return r1(total);
  };
  const activeAnywhere = pid => [...stintOf.values()].some(st => st.pid === pid && st.active);
  const picks = [];
  const pickUse = {}; // "season|round|original roster" -> pick
  for (const e of events.filter(e => e.src === 'draft')) {
    const d = DATA.drafts.find(x => x.picks.includes(e.ref));
    const st = stint(e);
    const pick = {
      s: d.s, kind: d.kind, round: e.ref.round, no: e.ref.no, pid: e.pid, o: e.o,
      value: st?.value ?? 0, active: st?.active ?? false, weeks: st?.weeks ?? [],
      career: careerSince(e.pid, e.k), careerActive: activeAnywhere(e.pid),
      pending: !seasonsWithGames.has(d.s),
    };
    picks.push(pick);
    pickUse[`${d.s}|${e.ref.round}|${e.ref.orig}`] = pick;
  }
  const roundAvg = {};
  for (const p of picks.filter(p => !p.pending)) (roundAvg[`${p.s}|${p.round}`] ??= []).push(p.career);
  for (const p of picks) {
    const peers = roundAvg[`${p.s}|${p.round}`];
    p.expected = peers ? r1(peers.reduce((a, b) => a + b, 0) / peers.length) : 0;
    p.over = r1(p.career - p.expected);
  }

  // Trades, one side per team.
  const inEvent = {}; // "tx|pid" -> "in" event
  for (const e of events) if (e.dir === 'in' && e.tx != null) inEvent[`${e.tx}|${e.pid}`] = e;
  const trades = [];
  (DATA.transactions ?? []).forEach((x, i) => {
    if (x.type !== 'trade') return;
    const sides = x.owners.map(o => {
      const got = [];
      const gave = [];
      for (const [pid, to] of Object.entries(x.adds)) {
        const st = stint(inEvent[`${i}|${pid}`]);
        const asset = { pid, value: st?.value ?? 0, active: st?.active ?? false, weeks: st?.weeks ?? [] };
        if (to === o) got.push(asset);
        else if (x.drops[pid] === o) gave.push(asset);
      }
      for (const p of x.picks) {
        const used = pickUse[`${p.season}|${p.round}|${p.orig}`];
        // key identifies the pick across trades; usedBy is who drafted with it
        // (unset until the draft happens).
        const asset = {
          pick: `${p.season} round ${p.round}`, key: `${p.season}|${p.round}|${p.orig}`,
          pid: used?.pid, usedBy: used?.o, value: used && !used.pending ? used.value : 0,
          weeks: used && !used.pending ? used.weeks : [],
          active: !used || used.pending || used.active,
        };
        if (p.to === o) got.push(asset);
        else if (p.from === o) gave.push(asset);
      }
      const total = list => r1(list.reduce((a, b) => a + b.value, 0));
      return { o, got, gave, gotValue: total(got), gaveValue: total(gave), net: r1(total(got) - total(gave)), est: [...got, ...gave].some(a => a.active) };
    });
    trades.push({ s: x.s, w: x.w, ts: x.ts ?? 0, tx: i, owners: x.owners, sides });
  });

  // Waiver claims and free-agent pickups, and drops that produced elsewhere.
  const pickups = [];
  const letGo = [];
  for (const e of events) {
    if (e.dir === 'in' && (e.src === 'waiver' || e.src === 'free_agent')) {
      const st = stint(e);
      pickups.push({ s: Math.floor(e.k / 100) + '', w: e.k % 100, tx: e.tx, o: e.o, pid: e.pid, src: e.src, value: st?.value ?? 0, active: st?.active ?? false, weeks: st?.weeks ?? [] });
    }
    if (e.dir === 'out' && (e.src === 'waiver' || e.src === 'free_agent')) {
      // The next team to pick him up, before the team that dropped him gets him back.
      const later = byPlayer[e.pid].filter(n => n.dir === 'in' && (n.k > e.k || (n.k === e.k && n.ts > e.ts)));
      const back = later.find(n => n.o === e.o);
      const next = later.find(n => n.o !== e.o && (!back || n.k < back.k || (n.k === back.k && n.ts < back.ts)));
      const st = stint(next);
      if (st) letGo.push({ s: Math.floor(e.k / 100) + '', w: e.k % 100, tx: e.tx, o: e.o, pid: e.pid, to: st.o, value: st.value, active: st.active, weeks: st.weeks });
    }
  }

  // Activity counts (commissioner moves aren't a manager's decision, so they're left out).
  const activity = {};
  const tradesShown = trades.filter(t => inSeason(t.s));
  const act = o => (activity[o] ??= { trades: 0, moves: 0, claims: 0, pickups: 0 });
  for (const x of DATA.transactions ?? []) {
    if (x.type === 'commissioner' || !inSeason(x.s)) continue;
    for (const o of new Set(x.owners)) {
      act(o).moves++;
      if (x.type === 'trade') act(o).trades++;
      if (x.type === 'waiver') act(o).claims++;
      if (x.type === 'free_agent') act(o).pickups++;
    }
  }
  const partners = {};
  for (const t of tradesShown) {
    const os = [...new Set(t.owners)].sort();
    for (let i = 0; i < os.length; i++) for (let j = i + 1; j < os.length; j++) {
      const p = (partners[`${os[i]}|${os[j]}`] ??= { a: os[i], b: os[j], n: 0, seasons: new Set() });
      p.n++;
      p.seasons.add(t.s);
    }
  }

  return {
    picks: picks.filter(p => inSeason(p.s)),
    trades: tradesShown,
    pickups: pickups.filter(p => inSeason(p.s)),
    letGo: letGo.filter(p => inSeason(p.s)),
    activity,
    partners: Object.values(partners),
    unusedDuplicates,
  };
}
