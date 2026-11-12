// One download per week of Sleeper box scores / weekly projections, shared by every module that reads them
// (breakdown.js season tables, defense.js, advstats.js, matchup.js). Owner, Nov 12 2026: the nightly job now
// rebuilds the season in progress from week 1 every night (Sleeper corrects box scores days later), so the
// same weeks are read by 4 builders; this keeps it to one read each. No DOM / Node APIs.
// Node (nightly job): kept for the whole run (the job calls clearWeekCache() when done); browser: 2 minutes.
// Rows come back filtered (no All-Star Game rows) and SHARED: callers must not change them.
import { exhibitionRow } from './config.js';

const API = 'https://api.sleeper.com';
const NODE = typeof window === 'undefined';
const TTL = NODE ? Infinity : 120_000;
const MAX = 40; // weeks kept at once (oldest dropped first)
const MEMO = new Map();

function cached(key, url, what) {
  const hit = MEMO.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.p;
  const p = fetch(`${url}&t=${Date.now()}`).then(async res => {
    if (!res.ok) throw new Error(`Sleeper ${what}: HTTP ${res.status}`); // a failed read throws, never zeros
    return ((await res.json()) ?? []).filter(r => !exhibitionRow(r));
  });
  p.catch(() => { if (MEMO.get(key)?.p === p) MEMO.delete(key); }); // a failure is never remembered
  MEMO.delete(key);
  MEMO.set(key, { at: Date.now(), p });
  while (MEMO.size > MAX) MEMO.delete(MEMO.keys().next().value);
  return p;
}
export const boxWeek = (season, week) => cached(`box|${season}|${week}`, `${API}/stats/nba/${season}/${week}?season_type=regular`, `box scores ${season} week ${week}`);
export const projWeek = (season, week) => cached(`proj|${season}|${week}`, `${API}/projections/nba/${season}/${week}?season_type=regular`, `projections ${season} week ${week}`);
export function clearWeekCache() { MEMO.clear(); }
export const weekCacheSize = () => MEMO.size;
