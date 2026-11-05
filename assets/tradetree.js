// Trade trees (owner, Nov 2 2026; Test features): start from one trade and follow everything each team got
// in it through every move after, as far as it goes. Owner's choices: a tree starts from a trade (both
// sides), goes all the way down, and every node shows the Front Office locked points that team got from
// it plus how it ended. No DOM or Node APIs.
//
// A branch always stays with the same team: team A got X; A later traded X in another deal, so what A got
// back there hangs under X; and so on. So a side's total = every locked point that team got from
// everything that grew out of this trade, the "who won it over time" number.
// Leaves: dropped, still on the team, an unused future pick. A pick that was used becomes the drafted
// player (Front Office's pickUse, which already maps Sleeper's 2024 DUPLICATE entries to the real player).
// Several assets leaving in the same later trade share its return: it hangs under the first one
// (tree order) and the others point to it ("see X").
//
// fo = frontOffice(DATA) (stints carry how each began and ended). rosters = live Sleeper rosters
// (optional): a player the saved data still has on the team but who's gone today says so.

const r1 = n => Math.round(n * 10) / 10;
export const pickKey = p => `${p.season}|${p.round}|${p.orig}`;
const TRADE = t => t.type === 'trade' && (t.owners ?? []).length >= 2;

export function tradeTree(DATA, fo, tx, rosters = null) {
  const t = DATA.transactions?.[tx];
  if (!t || !TRADE(t)) return null;
  const txs = DATA.transactions;
  const stints = fo.stints;
  const onRoster = {}; // pid -> owner, today (live)
  for (const r of rosters ?? []) for (const pid of [...(r.players ?? []), ...(r.taxi ?? []), ...(r.reserve ?? [])]) onRoster[pid] = r.owner_id;
  const expanded = new Map(); // "tx|owner" -> the node whose children hold that trade's return
  let nodes = 0;

  // What `o` received in trade `i` (each a fresh node), in a stable order: players, then picks.
  const returnOf = (i, o, depth, chain) => {
    const x = txs[i];
    const kids = [];
    for (const [pid, to] of Object.entries(x.adds ?? {})) if (to === o) kids.push(playerNode(pid, o, i, depth, chain));
    for (const p of (x.picks ?? []).filter(p => p.to === o).sort((a, b) => a.season - b.season || a.round - b.round)) kids.push(pickNode(p, o, i, depth, chain));
    return kids;
  };

  // A trade that ended an asset's time with `o`: its return hangs here unless another asset already took it.
  const tradedAway = (node, i, o, depth, chain) => {
    const x = txs[i];
    node.exit = { kind: 'traded', tx: i, ts: x.ts ?? 0, s: x.s, w: x.w, to: node.pid ? x.adds?.[node.pid] : (x.picks ?? []).find(p => pickKey(p) === node.key && p.from === o)?.to, three: x.owners.length > 2 };
    const k = `${i}|${o}`;
    if (expanded.has(k)) { node.exit.with = expanded.get(k); return; }
    expanded.set(k, node);
    node.children = returnOf(i, o, depth + 1, chain);
    // Everything else `o` sent in that deal, so the return isn't read as his alone.
    node.exit.alsoSent = [
      ...Object.entries(x.drops ?? {}).filter(([pid, from]) => from === o && pid !== node.pid).map(([pid]) => ({ pid })),
      ...(x.picks ?? []).filter(p => p.from === o && pickKey(p) !== node.key).map(p => ({ pick: p })),
    ];
  };

  const playerNode = (pid, o, i, depth, chain, viaDraft = null) => {
    nodes++;
    let st = viaDraft
      ? stints.find(s => s.src === 'draft' && s.pid === pid && s.o === o && s.pick?.no === viaDraft.no && Math.floor(s.start / 100) === Number(viaDraft.s))
      : stints.find(s => s.src === 'trade' && s.tx === i && s.pid === pid && s.o === o);
    // Re-added to the same team with no drop in between (e.g. the commissioner add after Ron Holland's 2024
    // DUPLICATE pick): the same stay, so follow it on and add its points.
    let value = st?.value ?? 0, weeks = st?.weeks ?? 0;
    const start = st?.start;
    while (st && st.end != null && !st.endSrc) {
      const nx = stints.find(s => s !== st && s.pid === pid && s.o === o && s.start === st.end);
      if (!nx) break;
      st = nx;
      value += st.value;
      weeks += st.weeks;
    }
    const node = {
      kind: 'player', pid, o, depth, value: r1(value), weeks, ts: viaDraft ? Math.max(DATA.drafts.find(d => d.s === viaDraft.s && d.kind === viaDraft.kind)?.ts ?? 0, viaDraft.after ?? 0) : (txs[i]?.ts ?? 0),
      start, end: st?.end, again: chain.includes(`p${pid}`), children: [],
    };
    const next = [...chain, `p${pid}`];
    if (!st) node.exit = { kind: 'unknown' };
    else if (st.endSrc === 'trade' && st.endTx != null) tradedAway(node, st.endTx, o, depth, next);
    else if (st.endSrc) node.exit = { kind: st.endSrc === 'commissioner' ? 'commish' : 'dropped', tx: st.endTx, ts: txs[st.endTx]?.ts ?? 0, s: txs[st.endTx]?.s, w: txs[st.endTx]?.w };
    else if (st.end != null) node.exit = { kind: 'left' };
    else node.exit = { kind: 'held', today: rosters ? onRoster[pid] === o : null, nowWith: rosters ? onRoster[pid] ?? null : undefined };
    return node;
  };

  const pickNode = (p, o, i, depth, chain) => {
    nodes++;
    const key = pickKey(p);
    const node = { kind: 'pick', key, season: p.season, round: p.round, orig: p.orig, o, depth, value: 0, ts: txs[i]?.ts ?? 0, children: [] };
    const after = txs[i]?.ts ?? 0;
    // Its next trade away from `o` (a pick can move several times before its draft).
    let nx = -1;
    txs.forEach((x, j) => {
      if (j === i || !TRADE(x) || !(x.picks ?? []).some(q => pickKey(q) === key && q.from === o)) return;
      if ((x.ts ?? 0) < after || ((x.ts ?? 0) === after && j < i)) return;
      if (nx < 0 || (x.ts ?? 0) < (txs[nx].ts ?? 0)) nx = j;
    });
    const used = fo.pickUse?.[key];
    if (nx >= 0) tradedAway(node, nx, o, depth, chain);
    else if (used && used.o === o) {
      // pending = drafted, but that season has no games yet.
      // A draft's ts is Sleeper's start time; slow drafts run for days and picks get traded during them
      // (2026: started Sep 7, case 072 moved a 3rd on Sep 10). during = it changed hands after the start.
      const started = DATA.drafts.find(d => d.s === used.s && d.kind === used.kind)?.ts ?? 0;
      node.exit = { kind: 'drafted', draft: used.kind, no: used.no, round: used.round, s: used.s, pid: used.pid, pending: used.pending, started, during: started < node.ts, ts: Math.max(started, node.ts) };
      node.children = [playerNode(used.pid, o, null, depth + 1, chain, { ...used, after: node.ts })];
    } else if (used) node.exit = { kind: 'elsewhere', by: used.o, pid: used.pid, no: used.no };
    else if ((DATA.drafts ?? []).some(d => d.kind !== 'startup' && d.s === p.season)) node.exit = { kind: 'missing' };
    else node.exit = { kind: 'unused' };
    return node;
  };

  // Branch totals: the node's own points + everything below it. live = still growing (held, or an unused pick).
  const sum = n => {
    n.children.forEach(sum);
    n.total = r1(n.value + n.children.reduce((a, c) => a + c.total, 0));
    n.live = n.exit.kind === 'held' || n.exit.kind === 'unused' || (n.exit.kind === 'drafted' && n.exit.pending) || n.children.some(c => c.live);
    n.count = 1 + n.children.reduce((a, c) => a + c.count, 0);
  };
  const owners = [...new Set(t.owners)];
  const sides = owners.map(o => {
    const got = returnOf(tx, o, 0, []);
    got.forEach(sum);
    return { o, got, total: r1(got.reduce((a, n) => a + n.total, 0)), live: got.some(n => n.live) };
  });
  return { tx, t, sides, nodes };
}

// Every trade that touched a player: he was in it, or a pick in it became him.
export function playerTrades(DATA, fo, pid) {
  const keys = new Set(Object.entries(fo.pickUse ?? {}).filter(([, u]) => u.pid === pid).map(([k]) => k));
  const out = [];
  (DATA.transactions ?? []).forEach((x, i) => {
    if (!TRADE(x)) return;
    const asPlayer = x.adds?.[pid] || x.drops?.[pid];
    const asPick = (x.picks ?? []).find(p => keys.has(pickKey(p)));
    if (asPlayer || asPick) out.push({ tx: i, ts: x.ts ?? 0, s: x.s, w: x.w, pick: asPlayer ? null : asPick, to: x.adds?.[pid] ?? asPick?.to, from: x.drops?.[pid] ?? asPick?.from });
  });
  return out.sort((a, b) => b.ts - a.ts);
}

// Walk a tree (side nodes, depth first).
export function* treeNodes(tree) {
  const walk = function* (n) { yield n; for (const c of n.children) yield* walk(c); };
  for (const sd of tree.sides) for (const n of sd.got) yield* walk(n);
}
