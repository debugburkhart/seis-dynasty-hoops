// WEEKLY START PLANNER (WSP; owner, Nov 15 2026, MyGM + MyGM+, Beta). No DOM here; app.js draws it (wspCard).
// For each day of a fantasy week: who goes in the 9 lineup slots, filled from the team's Depth Chart designations.
// Owner's rules:
// - fill order = category order (Starting 9 -> Rotation -> Stream -> Development -> Hold, custom categories in their saved
//   order; IR and taxi never), then best FP/G inside a category. Players without a category come last.
// - slot eligibility = Sleeper fantasy positions (gm.js fits). The set of players is picked greedily in that order with an
//   augmenting-path check (a player gets in only if everyone already in still fits), so a higher-ranked player is never
//   left out for a lower one; then the slots are laid out with gm.js bestFit (pickier slots first, current slot kept).
// - DOUBLING UP: two players whose games tip DOUBLE_GAP (90) minutes or more apart can share a slot that day. The early
//   one plays; after his game the manager decides: sub in the later one, or keep the early score. Shown as a decision,
//   never automatic.
// - slim days are FLAGGED (open slots), no free agents are listed.
// - lock-in: a locked starter keeps his slot all week (slot closed); bench games never count; a player can only be moved
//   in before his game tips (today: a starter whose game has tipped stays where he is, a bench player whose game has
//   tipped can't come in for it).

export const DOUBLE_GAP = 90 * 60e3;
export const GAME_LEN = 2.25 * 3600e3; // about when a game ends (same as gm.js)
const SITS = /^(out|ir|suspension|inactive)$/i;
const STARTED = ['in_progress', 'in_game', 'complete'];
// Slot preference when laying out a lineup: exact positions first, then G / F, UTIL last (so an open spot is the most
// flexible one: any streamer fits it); his current slot breaks ties.
const SLOT_PREF = { PG: 4, SG: 4, SF: 4, PF: 4, C: 4, G: 2, F: 2 };
const SLOT_FITS = { PG: ['PG'], SG: ['SG'], G: ['PG', 'SG'], SF: ['SF'], PF: ['PF'], F: ['SF', 'PF'], C: ['C'] };
const fitsSlot = (slot, positions) => !SLOT_FITS[slot] || (positions ?? []).some(p => SLOT_FITS[slot].includes(p));

const tipMs = g => (g?.tip ? Date.parse(g.tip) : null);

// Is player p's game on day d already under way (or over)? Only today can be.
function tipped(g, today, now) {
  if (!g || g.date !== today) return g ? g.date < today : false;
  if (STARTED.includes(g.status)) return true;
  const t = tipMs(g);
  return t != null && t <= now;
}

// Max matching check: can every player in `set` (+ cand) get a slot of `open`? Kuhn's algorithm (9 slots, quick).
function place(open, set, slots) {
  const match = new Map(); // slot index -> player
  const tryP = (p, seen) => {
    for (const s of open) {
      if (seen.has(s) || !fitsSlot(slots[s], p.elig)) continue;
      seen.add(s);
      if (!match.has(s) || tryP(match.get(s), seen)) { match.set(s, p); return true; }
    }
    return false;
  };
  for (const p of set) if (!tryP(p, new Set())) return null;
  return match;
}

// One day. players = active roster (starters + bench, no IR spot / taxi) as
// { pid, name, elig, team, fpg, cat (index in the category order; Infinity = none), catId, start (slot index | -1),
//   injury, missDates, locked (bool), held: { pts, date } | null }.
export function planDay({ date, slots, players, slate, today, now = Date.now(), bad = SITS, bestFit }) {
  const gameOf = p => (slate[p.team] ?? []).find(g => g.date === date) ?? null;
  const closed = new Map(); // slot index -> locked player
  const fixed = new Map(); // slot index -> starter whose game today already tipped (he plays there)
  const out = [], lateBench = [], cands = [];
  for (const p of players) {
    if (p.locked && p.start >= 0) { closed.set(p.start, p); continue; }
    const g = gameOf(p);
    if (!g) continue;
    if (bad.test(p.injury ?? '') || (p.missDates ?? []).includes(date)) { out.push({ p, g }); continue; }
    if (tipped(g, today, now)) {
      if (p.start >= 0) fixed.set(p.start, { p, g });
      else lateBench.push({ p, g }); // his game started while he sat on the bench: it can't count
      continue;
    }
    cands.push({ p, g });
  }
  // A tipped starter's slot is taken by him. (A bench player could still double up behind him: see below.)
  const open = slots.map((_, i) => i).filter(i => !closed.has(i) && !fixed.has(i));
  cands.sort((a, b) => a.p.cat - b.p.cat || (b.p.fpg ?? 0) - (a.p.fpg ?? 0) || a.p.name.localeCompare(b.p.name));
  const chosen = [];
  for (const c of cands) if (place(open, [...chosen.map(x => x.p), c.p], slots)) chosen.push(c);
  // Lay the chosen players out: everyone in (a big base value), exact slots preferred, a starter keeps his own slot.
  const at = new Map();
  if (chosen.length) {
    const val = (ci, si) => {
      const p = chosen[ci].p, s = open[si];
      if (!fitsSlot(slots[s], p.elig)) return null;
      return 1000 + (SLOT_PREF[slots[s]] ?? 0) + (p.start === s ? 1 : 0);
    };
    const { slotOf } = bestFit(open.length, chosen.length, val);
    chosen.forEach((c, ci) => { if (slotOf[ci] >= 0) at.set(open[slotOf[ci]], c); });
    // bestFit can't fail to place them (the matching above exists), but keep anyone it missed on the list.
    const miss = chosen.filter(c => ![...at.values()].includes(c));
    const m = miss.length ? place(open.filter(s => !at.has(s)), miss.map(c => c.p), slots) : null;
    if (m) for (const [s, p] of m) at.set(s, miss.find(c => c.p === p));
  }
  const rows = slots.map((slot, i) => {
    if (closed.has(i)) return { slot, i, kind: 'locked', p: closed.get(i) };
    if (fixed.has(i)) return { slot, i, kind: 'tipped', ...fixed.get(i) };
    if (at.has(i)) return { slot, i, kind: 'start', ...at.get(i) };
    return { slot, i, kind: 'open' };
  });
  // DOUBLE UP: everyone with a game that didn't make the lineup, best first, may share a slot with a player whose game tips
  // 90+ minutes apart (either way round), when he fits that slot. Weakest occupant first, so the decision is about the
  // least valuable start. One double per slot.
  const used = new Set(rows.filter(r => r.p && r.kind !== 'locked').map(r => r.p.pid));
  const left = cands.filter(c => !used.has(c.p.pid));
  const rankOf = p => [p.cat, -(p.fpg ?? 0)];
  const weaker = (a, b) => { const x = rankOf(a), y = rankOf(b); return x[0] - y[0] || x[1] - y[1]; };
  const extra = [];
  for (const c of left) {
    const t = tipMs(c.g);
    const fit = rows.filter(r => ['start', 'tipped'].includes(r.kind) && !r.dbl && fitsSlot(r.slot, c.p.elig) && t != null && tipMs(r.g) != null
      && Math.abs(t - tipMs(r.g)) >= DOUBLE_GAP
      // A tipped starter can only be the EARLY one (it's too late to put anyone in before him).
      && (r.kind !== 'tipped' || t > tipMs(r.g)))
      .sort((a, b) => weaker(b.p, a.p));
    const r = fit[0];
    if (!r) { extra.push(c); continue; }
    const early = tipMs(r.g) < t ? { p: r.p, g: r.g } : { p: c.p, g: c.g };
    const late = early.p === r.p ? { p: c.p, g: c.g } : { p: r.p, g: r.g };
    r.dbl = { early, late, ends: tipMs(early.g) + GAME_LEN, added: c.p };
  }
  const openN = rows.filter(r => r.kind === 'open').length;
  return { date, rows, open: openN, doubles: rows.filter(r => r.dbl).length, bench: extra, out, lateBench, closed: closed.size };
}

// Every day of the week still to plan: days with at least one game, from today on (today only while one of its games
// hasn't started).
export function planWeek({ slots, players, slate, today, now = Date.now(), bestFit }) {
  const all = Object.values(slate).flat();
  const days = [...new Set(all.map(g => g.date))].filter(d => d > today || (d === today && all.some(g => g.date === d && !tipped(g, today, now)))).sort();
  return days.map(date => planDay({ date, slots, players, slate, today, now, bestFit }));
}
