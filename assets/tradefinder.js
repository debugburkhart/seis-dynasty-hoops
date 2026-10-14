// Trade finder (commish office → My GM). Builds fair trade offers from dynasty values
// (assets/dynasty.js) three ways: get a player, fill a position, or sell a player.
// "Fair" uses the standard value; whether the other team would say yes uses how THEY see
// value (a win-now team counts this season more, a building team the later seasons).

import { VIEWS, teamOutlook } from './dynasty.js';

// A package is worth less than the sum of its parts: value = (sum of score^1.6)^(1/1.6).
// One player = his score; two 30s = about one 46; three 20s = about one 40. So a star
// can't be had for a pile of role players.
export const CONSOLIDATION = 1.6;
// Each extra player a team has to take on (and cut someone for) costs 5% more value.
const EXTRA_PLAYER = 0.05;
export const packageValue = scores => scores.reduce((a, s) => a + Math.max(0, s) ** CONSOLIDATION, 0) ** (1 / CONSOLIDATION);
// Offer windows: what you give vs what you get, standard value.
const GET_WINDOW = [0.95, 1.2]; // getting a player: give at least 95% (they won't take less), at most 120%
const SELL_WINDOW = [0.9, 1.15]; // selling: take back 90-115% of his value
const THEIR_MIN_GAIN = -2; // on their timeline they can't lose more than this
const POOL = 28; // each side's most valuable assets considered
const MAX_PIECES = 3;

const GROUP = pos => (/^(PG|SG|G)/.test(pos ?? '') ? 'G' : /^(SF|PF|F)/.test(pos ?? '') ? 'F' : /^C/.test(pos ?? '') ? 'C' : null);
const STARTERS = { G: 3, F: 3, C: 2 }; // PG/SG/G, SF/PF/F, C + a UTIL each for C-heavy builds
export const viewFor = label => (label === 'Contender' || label === 'Win now' ? 'now' : label === 'Rising' || label === 'Rebuilding' ? 'later' : 'std');
const TIMELINE = { now: 'built to win now (this season counts most)', later: 'building for later (future seasons count most)', std: 'in the middle (standard timeline)' };
const r0 = n => Math.round(n);

// Every tradeable asset per team: players (taxi and IR too) and future picks.
export function teamAssets(v, rosters, { all = false } = {}) {
  const out = {};
  for (const r of rosters ?? []) {
    const pids = [...new Set([...(r.players ?? []), ...(r.taxi ?? []), ...(r.reserve ?? [])])];
    const players = pids.map(pid => v.players[pid]).filter(p => p && (all || p.score >= 1)).map(p => ({
      id: p.pid, kind: 'player', name: p.name, score: p.score, view: p.view, group: GROUP(p.pos), pos: p.pos, age: p.age,
      now: p.v[0], prospect: p.prospect, where: p.where, injury: p.injury, team: p.team,
    }));
    const picks = v.picks.filter(p => p.owner === r.owner_id && (all || p.score >= 1)).map(p => ({
      id: `pick-${p.season}-${p.round}-${p.orig}`, kind: 'pick', name: `${p.label}${p.orig !== r.owner_id ? ' (via trade)' : ''}`, score: p.score, view: p.view, group: null,
      season: p.season, round: p.round, orig: p.orig,
    }));
    out[r.owner_id] = [...players, ...picks].sort((a, b) => b.score - a.score);
  }
  return out;
}

// Each team's strength by position (best G/F/C this season vs the league average).
function positionNeeds(assets) {
  const sums = {};
  for (const [o, list] of Object.entries(assets)) {
    sums[o] = {};
    for (const g of ['G', 'F', 'C']) sums[o][g] = list.filter(a => a.group === g && a.where !== 'taxi').map(a => a.now ?? 0).sort((a, b) => b - a).slice(0, STARTERS[g]).reduce((a, b) => a + b, 0);
  }
  const owners = Object.keys(sums);
  const avg = Object.fromEntries(['G', 'F', 'C'].map(g => [g, owners.reduce((a, o) => a + sums[o][g], 0) / (owners.length || 1)]));
  const out = {};
  for (const o of owners) out[o] = Object.fromEntries(['G', 'F', 'C'].map(g => [g, sums[o][g] / (avg[g] || 1)]));
  return out; // 1 = league average; under 0.9 = thin, over 1.1 = deep
}

function* combos(pool, max) {
  const n = pool.length;
  for (let i = 0; i < n; i++) {
    yield [pool[i]];
    if (max < 2) continue;
    for (let j = i + 1; j < n; j++) {
      yield [pool[i], pool[j]];
      if (max < 3) continue;
      for (let k = j + 1; k < n; k++) yield [pool[i], pool[j], pool[k]];
    }
  }
}

// Shared context for one run.
export function tradeContext(DATA, v, rosters, me) {
  const assets = teamAssets(v, rosters);
  const needs = positionNeeds(assets);
  const label = o => v.outlook[o]?.label ?? 'Middle of the pack';
  const tradesWith = o => (DATA.transactions ?? []).filter(x => x.type === 'trade' && x.owners.includes(me) && x.owners.includes(o)).length;
  const tradesAll = o => (DATA.transactions ?? []).filter(x => x.type === 'trade' && x.owners.includes(o)).length;
  return { DATA, v, me, assets, needs, label, tradesWith, tradesAll };
}

// Why the other team might say yes (and anything that could get in the way).
function reasons(c, partner, give, get, theirView, theirGain, giveTV, getTV) {
  const why = [];
  why.push(`Fair on standard value: you give ${r0(giveTV)}, you get ${r0(getTV)}.`);
  const lab = c.label(partner);
  if (theirView !== 'std') why.push(`They’re ${TIMELINE[theirView]}: on their timeline they come out ${theirGain >= 0 ? '+' : ''}${r0(theirGain)}.`);
  const n = c.needs[partner];
  for (const g of new Set(give.map(a => a.group).filter(Boolean))) if (n?.[g] < 0.9) why.push(`They’re thin at ${g === 'G' ? 'guard' : g === 'F' ? 'forward' : 'center'}, and this adds ${give.filter(a => a.group === g).map(a => a.name).join(' and ')}.`);
  for (const g of new Set(get.map(a => a.group).filter(Boolean))) {
    const spare = get.filter(a => a.group === g);
    if (n?.[g] > 1.1) why.push(`They’re deep at ${g === 'G' ? 'guard' : g === 'F' ? 'forward' : 'center'}, so ${spare.map(a => a.name).join(' and ')} ${spare.length === 1 ? 'is' : 'are'} easier to part with.`);
  }
  if (give.some(a => a.kind === 'pick') && theirView === 'later') why.push('Picks fit a team building for later.');
  if (give.some(a => a.prospect && ['A+', 'A', 'A-', 'B+', 'B'].includes(a.prospect.grade)) && theirView !== 'now') why.push(`Young upside: ${give.filter(a => a.prospect && ['A+', 'A', 'A-', 'B+', 'B'].includes(a.prospect.grade)).map(a => `${a.name} (prospect ${a.prospect.grade})`).join(', ')}.`);
  const w = c.tradesWith(partner);
  why.push(w ? `You’ve traded with them ${w} time${w === 1 ? '' : 's'} before.` : c.tradesAll(partner) >= 20 ? 'One of the league’s busiest traders.' : c.tradesAll(partner) <= 9 ? 'Heads up: rarely trades.' : 'You’ve never traded with them.');
  const spots = give.filter(a => a.kind === 'player').length - get.filter(a => a.kind === 'player').length;
  if (spots > 0) why.push(`They’d need ${spots} open roster spot${spots === 1 ? '' : 's'}.`);
  if (spots < 0) why.push(`You’d need ${-spots} open roster spot${spots === -1 ? '' : 's'}.`);
  return { why, lab };
}

// Get one player (or pick) from another team: offers from your assets.
export function offersFor(c, target, { block = [], limit = 3 } = {}) {
  const partner = Object.entries(c.assets).find(([, list]) => list.some(a => a.id === target.id))?.[0];
  if (!partner || partner === c.me) return [];
  const theirView = viewFor(c.label(partner));
  const myView = viewFor(c.label(c.me));
  const getTV = packageValue([target.score]);
  const blocked = new Set(block);
  const pool = c.assets[c.me].slice(0, POOL);
  const found = [];
  for (const give of combos(pool, MAX_PIECES)) {
    const giveTV = packageValue(give.map(a => a.score));
    const extra = Math.max(0, give.filter(a => a.kind === 'player').length - 1); // players they must make room for
    if (giveTV < GET_WINDOW[0] * getTV * (1 + EXTRA_PLAYER * extra) || giveTV > GET_WINDOW[1] * getTV * (1 + EXTRA_PLAYER * extra)) continue;
    const theirGain = packageValue(give.map(a => a.view[theirView])) - packageValue([target.view[theirView]]);
    if (theirGain < THEIR_MIN_GAIN) continue;
    const myGain = packageValue([target.view[myView]]) - packageValue(give.map(a => a.view[myView]));
    const onBlock = give.filter(a => blocked.has(a.id)).length;
    const rank = -Math.abs(giveTV / getTV - 1) * 60 + onBlock * 15 + Math.min(theirGain, 10) * 0.4 + myGain * 0.5 - (give.length - 1) * 1.5; // trade-block players first
    found.push({ partner, give, get: [target], giveTV, getTV, theirGain, myGain, onBlock, rank, theirView });
  }
  return pickDistinct(found, limit).map(o => ({ ...o, ...reasons(c, partner, o.give, o.get, theirView, o.theirGain, o.giveTV, o.getTV) }));
}

// Sell one of your players: the best return from each team.
export function offersToSell(c, asset, { perTeam = 2 } = {}) {
  const myView = viewFor(c.label(c.me));
  const giveTV = packageValue([asset.score]);
  const out = [];
  for (const [partner, list] of Object.entries(c.assets)) {
    if (partner === c.me) continue;
    const theirView = viewFor(c.label(partner));
    const found = [];
    for (const get of combos(list.slice(0, POOL), MAX_PIECES)) {
      const getTV = packageValue(get.map(a => a.score));
      const extra = Math.max(0, get.filter(a => a.kind === 'player').length - 1); // you make room, so you ask a bit more
      if (getTV < SELL_WINDOW[0] * giveTV * (1 + EXTRA_PLAYER * extra) || getTV > SELL_WINDOW[1] * giveTV * (1 + EXTRA_PLAYER * extra)) continue;
      const theirGain = packageValue([asset.view[theirView]]) - packageValue(get.map(a => a.view[theirView]));
      if (theirGain < THEIR_MIN_GAIN) continue;
      const myGain = packageValue(get.map(a => a.view[myView])) - packageValue([asset.view[myView]]);
      const rank = myGain * 1.2 + (getTV / giveTV - 1) * 30 + Math.min(theirGain, 10) * 0.3 - (get.length - 1) * 1.5;
      found.push({ partner, give: [asset], get, giveTV, getTV, theirGain, myGain, rank, theirView });
    }
    out.push(...pickDistinct(found, perTeam).map(o => ({ ...o, ...reasons(c, partner, o.give, o.get, theirView, o.theirGain, o.giveTV, o.getTV) })));
  }
  // Each team's best offer first (best for you first), then the second-best ones.
  const first = new Set();
  const tier = o => (first.has(o.partner) ? 1 : (first.add(o.partner), 0));
  return out.sort((a, b) => b.rank - a.rank).map(o => ({ o, t: tier(o) })).sort((a, b) => a.t - b.t).map(x => x.o);
}

// Fill a position: players on other teams who'd start for you there, each with its best offer.
export function offersForNeed(c, group, { block = [], limit = 6 } = {}) {
  const mine = c.assets[c.me].filter(a => a.group === group && a.where !== 'taxi').map(a => a.now ?? 0).sort((a, b) => b - a);
  const bar = mine[STARTERS[group] - 1] ?? 0; // your weakest starter there, this season
  const myBest = packageValue(c.assets[c.me].slice(0, MAX_PIECES).map(a => a.score));
  const targets = Object.entries(c.assets).filter(([o]) => o !== c.me).flatMap(([, list]) => list)
    .filter(a => a.kind === 'player' && a.group === group && (a.now ?? 0) > bar + 1 && a.score <= myBest / GET_WINDOW[0])
    .sort((a, b) => b.score - a.score).slice(0, 14);
  const out = [];
  for (const t of targets) {
    const best = offersFor(c, t, { block, limit: 1 })[0];
    if (best) out.push({ ...best, upgrade: r0((t.now ?? 0) - bar) });
    if (out.length >= limit) break;
  }
  // Best for you first (on your timeline), not just the biggest names.
  return { bar, offers: out.sort((a, b) => b.myGain - a.myGain) };
}

// Keep offers that aren't near-copies (each must differ by at least one asset from the ones kept).
function pickDistinct(found, limit) {
  const kept = [];
  // Two picks from the same draft and round count as the same piece here.
  const sig = o => [...o.give, ...o.get].map(a => (a.kind === 'pick' ? a.id.split('-').slice(0, 3).join('-') : a.id)).sort().join('|');
  for (const o of found.sort((a, b) => b.rank - a.rank)) {
    if (kept.some(k => sig(k) === sig(o))) continue;
    // Don't repeat the same lead asset more than twice.
    const lead = (o.give[0]?.id === o.get[0]?.id ? null : o.give[0]?.id);
    if (kept.filter(k => k.give[0]?.id === lead).length >= 2 && o.give.length > 1) continue;
    kept.push(o);
    if (kept.length >= limit) break;
  }
  return kept;
}

// ---------- Trade evaluator ----------

// Fair band for the verdict: within 10% either way on standard value is "fair".
const FAIR_BAND = 0.1;
const GROUPS = ['G', 'F', 'C'];

// Evaluate a trade someone offers, 2 or 3 teams. legs = [{ id, from, to }] with asset ids from
// teamAssets(v, rosters, { all: true }) (players by Sleeper ID, picks as pick-season-round-orig).
// Returns each team's side (value given and received, on the standard timeline and their own)
// and the league before and after (dynasty outlook ranks, position strength, age, roster size).
export function evaluateTrade(DATA, v, rosters, legs) {
  const all = teamAssets(v, rosters, { all: true });
  const assetOf = Object.fromEntries(Object.values(all).flat().map(a => [a.id, a]));
  const label = o => v.outlook[o]?.label ?? 'Middle of the pack';
  const teams = [...new Set(legs.flatMap(l => [l.from, l.to]))];

  // Rosters and pick owners after the trade (taxi players stay on taxi).
  const after = (rosters ?? []).map(r => ({ ...r, players: [...(r.players ?? [])], taxi: [...(r.taxi ?? [])], reserve: [...(r.reserve ?? [])] }));
  const rosterOf = o => after.find(r => r.owner_id === o);
  const picksAfter = v.picks.map(p => ({ ...p }));
  for (const l of legs) {
    const a = assetOf[l.id];
    if (!a) continue;
    if (a.kind === 'player') {
      const from = rosterOf(l.from), to = rosterOf(l.to);
      for (const key of ['players', 'taxi', 'reserve']) {
        if (!from[key].includes(a.id)) continue;
        from[key] = from[key].filter(x => x !== a.id);
        if (key === 'taxi') to.taxi.push(a.id);
        if (key === 'reserve') to.reserve.push(a.id);
      }
      to.players.push(a.id); // Sleeper lists taxi and IR players in players too
    } else {
      const p = picksAfter.find(x => x.season === a.season && x.round === a.round && x.orig === a.orig);
      if (p) p.owner = l.to;
    }
  }
  const season = DATA.seasons.at(-1).season;
  const before = v.outlook;
  const afterOutlook = teamOutlook(v.players, picksAfter, after, season);

  // Position strength before and after (this season, 100 = league average).
  const posBefore = positionStrength(v, rosters ?? []).ratio;
  const posAfter = positionStrength(v, after).ratio;

  const sides = teams.map(o => {
    const give = legs.filter(l => l.from === o).map(l => assetOf[l.id]).filter(Boolean);
    const get = legs.filter(l => l.to === o).map(l => assetOf[l.id]).filter(Boolean);
    const view = viewFor(label(o));
    const giveTV = packageValue(give.map(a => a.score));
    const getTV = packageValue(get.map(a => a.score));
    const theirNet = packageValue(get.map(a => a.view?.[view] ?? a.score)) - packageValue(give.map(a => a.view?.[view] ?? a.score));
    const ratio = giveTV ? getTV / giveTV : getTV ? 9 : 1;
    const verdict = ratio > 1 + FAIR_BAND ? 'wins' : ratio < 1 - FAIR_BAND ? 'loses' : 'fair';
    const roster = rosterOf(o);
    return {
      owner: o, give, get, giveTV, getTV, net: getTV - giveTV, theirNet, view, verdict, label: label(o),
      before: before[o], after: afterOutlook[o], posBefore: posBefore[o], posAfter: posAfter[o],
      taxiAfter: roster?.taxi.length ?? 0,
      spots: get.filter(a => a.kind === 'player').length - give.filter(a => a.kind === 'player').length,
    };
  });
  // Past trades between these teams.
  const history = (DATA.transactions ?? []).filter(x => x.type === 'trade' && teams.filter(o => x.owners.includes(o)).length >= 2);
  return { teams, sides, before, after: afterOutlook, history };
}

// Position strength (Dynasty tab card and the trade evaluator): each team's best guards (3),
// forwards (3) and centers (2) in fantasy points per game, vs the league average = 1.
// when 'now' = this season (taxi can't play); 'later' = two seasons from now on the age curve,
// taxi included (they'll be up by then). Returns { ratio: {owner: {G,F,C}}, sums, top: {owner:
// {G: [players counted]}}, avg }.
export function positionStrength(v, rosters, when = 'now') {
  const k = when === 'later' ? 2 : 0;
  const sums = {};
  const top = {};
  for (const r of rosters ?? []) {
    const mine = [...new Set([...(r.players ?? []), ...(r.taxi ?? []), ...(r.reserve ?? [])])].map(pid => v.players[pid]).filter(Boolean);
    sums[r.owner_id] = {};
    top[r.owner_id] = {};
    for (const g of GROUPS) {
      const best = mine.filter(p => GROUP(p.pos) === g && (k || p.where !== 'taxi')).sort((a, b) => b.v[k] - a.v[k]).slice(0, STARTERS[g]);
      top[r.owner_id][g] = best;
      sums[r.owner_id][g] = best.reduce((a, p) => a + p.v[k], 0);
    }
  }
  const owners = Object.keys(sums);
  const avg = Object.fromEntries(GROUPS.map(g => [g, owners.reduce((a, o) => a + sums[o][g], 0) / (owners.length || 1)]));
  const ratio = Object.fromEntries(owners.map(o => [o, Object.fromEntries(GROUPS.map(g => [g, sums[o][g] / (avg[g] || 1)]))]));
  return { ratio, sums, top, avg };
}

// ---------- Team tracker ----------

// One team snapshot per owner, as a compact array (saved nightly in dynasty-history.json):
// [strength now, strength in 2 yrs, total value, avg age, G, F, C now, G, F, C in 2 yrs]
// (positions x100, league average = 100). TEAM_KEYS names them.
export const TEAM_KEYS = ['now', 'later', 'total', 'age', 'G', 'F', 'C', 'Gl', 'Fl', 'Cl'];
export function teamSnapshot(v, rosters) {
  const pn = positionStrength(v, rosters, 'now').ratio;
  const pl = positionStrength(v, rosters, 'later').ratio;
  const out = {};
  for (const [o, t] of Object.entries(v.outlook)) {
    const r = x => Math.round(x * 10) / 10;
    out[o] = [r(t.now), r(t.later), t.total, t.age ?? null, ...['G', 'F', 'C'].map(g => Math.round((pn[o]?.[g] ?? 0) * 100)), ...['G', 'F', 'C'].map(g => Math.round((pl[o]?.[g] ?? 0) * 100))];
  }
  return out;
}
export const unpackTeam = a => (a ? Object.fromEntries(TEAM_KEYS.map((k, i) => [k, a[i]])) : null);

// A snapshot with ranks for any rosters and pick owners (outlook redone for them).
function snapshotFor(v, rosters, picks, season) {
  const outlook = teamOutlook(v.players, picks, rosters, season);
  const arr = teamSnapshot({ ...v, outlook }, rosters);
  return Object.fromEntries(Object.keys(arr).map(o => [o, { ...unpackTeam(arr[o]), nowRank: outlook[o].nowRank, laterRank: outlook[o].laterRank, totalRank: outlook[o].totalRank, label: outlook[o].label }]));
}

// Every roster move this season and its effect on each team in it: rosters are rolled back
// through the transactions, newest first, and each team is compared just before and just after
// the move, at today's dynasty values (so a move's effect isn't mixed with later value changes).
// Returns [{ x (the transaction), before: { owner: snapshot }, after: { owner: snapshot } }], newest first.
export function moveImpacts(DATA, v, rosters) {
  const cur = DATA.seasons.at(-1);
  const season = cur.season;
  const ownerOfRid = Object.fromEntries(cur.teams.map(t => [t.rosterId, t.owner]));
  const state = (rosters ?? []).map(r => ({ owner_id: r.owner_id, players: [...(r.players ?? [])], taxi: [...(r.taxi ?? [])], reserve: [...(r.reserve ?? [])] }));
  const picks = v.picks.map(p => ({ ...p }));
  const of = o => state.find(r => r.owner_id === o);
  const moves = (DATA.transactions ?? [])
    .filter(x => x.s === season && (Object.keys(x.adds ?? {}).length || Object.keys(x.drops ?? {}).length || (x.picks ?? []).length))
    .sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0));
  const out = [];
  let after = snapshotFor(v, state, picks, season);
  for (const x of moves) {
    // Undo: players added go back off, players dropped come back, picks return to the sender.
    for (const [pid, o] of Object.entries(x.adds ?? {})) {
      const r = of(o);
      if (r) for (const k of ['players', 'taxi', 'reserve']) r[k] = r[k].filter(p => p !== pid);
    }
    for (const [pid, o] of Object.entries(x.drops ?? {})) {
      const r = of(o);
      if (r && !r.players.includes(pid)) r.players.push(pid);
    }
    for (const p of x.picks ?? []) {
      const pk = picks.find(y => y.season === p.season && y.round === p.round && y.orig === ownerOfRid[p.orig]);
      if (pk && p.from) pk.owner = p.from;
    }
    const before = snapshotFor(v, state, picks, season);
    out.push({ x, before, after });
    after = before;
  }
  return out;
}
