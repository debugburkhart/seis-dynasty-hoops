// Trade finder (commish office → My GM). Builds fair trade offers from dynasty values
// (assets/dynasty.js) three ways: get a player, fill a position, or sell a player.
// "Fair" uses the standard value; whether the other team would say yes uses how THEY see
// value (a win-now team counts this season more, a building team the later seasons).

import { VIEWS } from './dynasty.js';

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
export function teamAssets(v, rosters) {
  const out = {};
  for (const r of rosters ?? []) {
    const pids = [...new Set([...(r.players ?? []), ...(r.taxi ?? []), ...(r.reserve ?? [])])];
    const players = pids.map(pid => v.players[pid]).filter(p => p && p.score >= 1).map(p => ({
      id: p.pid, kind: 'player', name: p.name, score: p.score, view: p.view, group: GROUP(p.pos), pos: p.pos, age: p.age,
      now: p.v[0], prospect: p.prospect, where: p.where,
    }));
    const picks = v.picks.filter(p => p.owner === r.owner_id && p.score >= 1).map(p => ({
      id: `pick-${p.season}-${p.round}-${p.orig}`, kind: 'pick', name: `${p.label}${p.orig !== r.owner_id ? ' (via trade)' : ''}`, score: p.score, view: p.view, group: null,
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
