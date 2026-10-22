// NBA contracts (commish → My GM → Dynasty: a contract line on every player row, plus a team card).
// Source: Basketball-Reference's player contracts page (one page, read once a week on Sundays by
// scripts/update.mjs with a labeled bot; Spotrac and HoopsHype turn bots away, so they aren't used).
// The job writes data/contracts.json; if the page can't be read it keeps the last good copy, or
// scripts/contracts-seed.json (the same page read from a home PC) when there is none.
// Information only: contracts never change dynasty scores or prospect grades.
// No DOM or Node APIs here: the same code runs in the nightly job and in a browser for testing.

import { decode, normName } from './scout.js';

export const CONTRACTS_VERSION = 1; // bump when the build changes: the next run rebuilds any day
export const CONTRACTS_URL = 'https://www.basketball-reference.com/contracts/players.html';
export const CONTRACTS_SOURCE = 'Basketball-Reference';

// Basketball-Reference player id -> Sleeper id, for names that don't match.
export const CONTRACT_IDS = {
  hollaro01: '2836', // "Ron Holland" there, "Ronald Holland II" on Sleeper (DRAFT_CORRECTIONS uses the same id)
};
// Basketball-Reference team codes that differ from Sleeper's.
const TEAM = { BRK: 'BKN', CHO: 'CHA', PHO: 'PHX' };
const OPTION = { pl: 'player', tm: 'team', et: 'early' };

// Deals at or under this are near the league minimum: cheap to cut.
export const MIN_DEAL = 3.5e6;

const text = html => decode(String(html ?? '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const cell = (row, stat) => new RegExp(`<t[dh]([^>]*data-stat="${stat}"[^>]*)>([\\s\\S]*?)</t[dh]>`).exec(row);

// The table -> { seasons: [2026, ...], rows: [{ id, name, team, y: [[salary, option] | null], gtd }] }.
// Season = the year it starts (2026-27 -> 2026, like Sleeper). Empty cells = no salary that year.
export function parseContracts(html) {
  const table = /<table[^>]*id="player-contracts"[\s\S]*?<\/table>/.exec(html)?.[0];
  if (!table) throw new Error('contracts table not found');
  const head = /<thead>[\s\S]*?<\/thead>/.exec(table)?.[0] ?? ''; // header rows repeat inside the body
  const seasons = [...head.matchAll(/data-stat="y(\d)"[^>]*>(\d{4})-\d{2}</g)].map(m => Number(m[2]));
  if (!seasons.length) throw new Error('no season columns');
  const body = /<tbody>([\s\S]*?)(?:<\/tbody>|<\/table>)/.exec(table)?.[1] ?? ''; // the page leaves </tbody> out
  const rows = [];
  for (const tr of body.split(/<tr\b/).slice(1)) {
    if (/^[^>]*class="[^"]*thead/.test(tr)) continue; // repeated header rows
    const id = /data-append-csv="([^"]+)"/.exec(tr)?.[1];
    const name = text(cell(tr, 'player')?.[2]);
    if (!id || !name) continue;
    const y = seasons.map((s, i) => {
      const c = cell(tr, `y${i + 1}`);
      const amt = Number(/csk="(\d+)"/.exec(c?.[1] ?? '')?.[1] ?? (text(c?.[2]).replace(/[$,]/g, '') || NaN));
      if (!amt) return null;
      const code = /salary-(\w+)/.exec(c[1])?.[1];
      return [amt, code ? OPTION[code] ?? code : null];
    });
    const g = cell(tr, 'remain_gtd');
    const gtd = Number(/csk="(\d+)"/.exec(g?.[1] ?? '')?.[1]) || null;
    rows.push({ id, name, team: text(cell(tr, 'team_id')?.[2]), y, gtd });
  }
  if (rows.length < 300) throw new Error(`only ${rows.length} rows`);
  return { seasons, rows };
}

// Rows -> Sleeper ids. A player waived with money still owed has a row per team: the row for his
// current (Sleeper) team is used and the others are listed as `waived`. Returns { players, unmatched }.
export function matchContracts(raw, sleeperPlayers, ids = CONTRACT_IDS) {
  const byName = {};
  for (const [pid, p] of Object.entries(sleeperPlayers ?? {})) {
    if (!/^\d+$/.test(pid) || !p?.first_name) continue;
    (byName[normName(`${p.first_name} ${p.last_name}`)] ??= []).push(pid);
  }
  const groups = new Map();
  for (const r of raw.rows) (groups.get(r.id) ?? groups.set(r.id, []).get(r.id)).push(r);
  const players = {};
  const unmatched = [];
  for (const [id, rows] of groups) {
    const teamOf = r => TEAM[r.team] ?? r.team;
    let pid = ids[id];
    if (!pid) {
      const cands = byName[normName(rows[0].name)] ?? [];
      const onTeam = cands.filter(c => rows.some(r => teamOf(r) === sleeperPlayers[c].team));
      const active = cands.filter(c => sleeperPlayers[c].active);
      pid = cands.length === 1 ? cands[0] : onTeam.length === 1 ? onTeam[0] : active.length === 1 ? active[0] : null;
    }
    if (!pid) { unmatched.push({ id, name: rows[0].name, team: rows.map(teamOf).join('/') }); continue; }
    const sp = sleeperPlayers?.[pid];
    const row = rows.find(r => teamOf(r) === sp?.team) ?? rows[0];
    players[pid] = {
      team: teamOf(row),
      seasons: raw.seasons.map((season, i) => row.y[i] && { season, salary: row.y[i][0], option: row.y[i][1] }).filter(Boolean),
      guaranteed: row.gtd,
      // Sleeper's years in the NBA when this was read (tells a 4th-year player from a veteran).
      ...(sp?.years_exp != null ? { exp: sp.years_exp } : {}),
      ...(rows.length > 1 ? { waived: rows.filter(r => r !== row).map(teamOf) } : {}),
    };
  }
  return { players, unmatched };
}

// Weekly build. getText(url) fetches a page; prev = last saved file (its `raw` is the fallback);
// seed = scripts/contracts-seed.json ({ read, seasons, rows }) when there's no saved copy.
export async function runContracts({ getText, sleeperPlayers, prev = null, seed = null, today, rostered = [] }) {
  let raw, source;
  try {
    raw = { ...parseContracts(await getText(CONTRACTS_URL)), read: today };
    source = { name: CONTRACTS_SOURCE, url: CONTRACTS_URL, ok: true, read: today, count: raw.rows.length };
  } catch (e) {
    raw = prev?.raw ?? seed;
    if (!raw?.rows) throw new Error(`${e.message}; no saved copy`);
    source = { name: CONTRACTS_SOURCE, url: CONTRACTS_URL, ok: false, error: e.message, read: raw.read, count: raw.rows.length, fallback: prev?.raw ? 'saved' : 'seed' };
  }
  const { players, unmatched } = matchContracts(raw, sleeperPlayers);
  // Rostered players with an NBA team but no contract row: usually two-way or Exhibit 10 deals,
  // sometimes a name the matcher missed (then add him to CONTRACT_IDS).
  const missing = rostered.filter(pid => !players[pid] && sleeperPlayers?.[pid]?.team)
    .map(pid => ({ pid, name: `${sleeperPlayers[pid].first_name} ${sleeperPlayers[pid].last_name}`, team: sleeperPlayers[pid].team }));
  return { version: CONTRACTS_VERSION, at: today, source, players, unmatched, missing, raw };
}

// ---------- Reading a contract (shared by the pages) ----------

export const money = x => (x >= 1e6 ? `$${(x / 1e6).toFixed(1)}M` : `$${Math.round(x / 1e3)}K`);
const span = s => `${s}-${String((s + 1) % 100).padStart(2, '0')}`;

// What the contract says for this season on: { now, left (seasons after this one), last, options
// ([{ season, option }] after this season), rookie, flags: [{ id, label, why }] }. nbaSeasons =
// dynasty.js p.nbaSeasons (NBA seasons played before this one, counted over the last 3).
export function readContract(c, season, nbaSeasons = null) {
  if (!c?.seasons?.length) return null;
  season = Number(season); // league data stores seasons as text
  const rest = c.seasons.filter(x => x.season >= season);
  const now = rest.find(x => x.season === season) ?? null;
  if (!now) return { now: null, left: rest.length, rest, options: [], flags: [] };
  // Waived with money still owed: the page repeats the old deal on every team's row, so only the
  // guaranteed money is trusted and nothing is flagged.
  if (c.waived?.length) return { now, left: null, rest, options: [], flags: [], waived: true };
  const later = rest.filter(x => x.season > season);
  // The guaranteed amount leaves out options nobody has used yet, so an option year it still covers
  // was already picked up (e.g. Cooper Flagg's 2027-28 rookie option): no longer an option.
  let gtd = c.guaranteed;
  const pickedUp = new Set();
  for (const x of rest) {
    if (gtd == null) break;
    if (x.option && x.season > season && gtd >= x.salary - 1000) pickedUp.add(x.season);
    gtd -= x.salary;
  }
  const options = later.filter(x => x.option && !pickedUp.has(x.season)).map(x => ({ season: x.season, option: x.option }));
  const next = later[0] && { ...later[0], option: pickedUp.has(later[0].season) ? null : later[0].option };
  // Early career: under 3 seasons played, or exactly 3 and Sleeper also says 3 years in (a veteran
  // also shows 3, since only the last 3 seasons are counted).
  const played = nbaSeasons == null ? null : nbaSeasons < 3 ? nbaSeasons : (c.exp ?? 99) <= 3 ? 3 : null;
  const rookie = played != null && played + rest.length <= 4;
  const flags = [];
  if (!later.length) {
    flags.push(rookie
      ? { id: 'rookie-end', label: 'Rookie deal ends', why: 'Last year of his first NBA contract: his team can extend him, or he becomes a restricted free agent next summer (his team can match any offer).' }
      : { id: 'contract-year', label: 'Contract year', why: 'His contract ends after this season: he may change teams or roles next year.' });
  } else if (rookie && later.length === 1 && !next.option) {
    flags.push({ id: 'rookie-ext', label: 'Extension next summer', why: `His rookie deal runs through ${span(next.season)}: next summer his team can extend him; if not, he becomes a restricted free agent after that season.` });
  } else if (next?.option === 'player' || next?.option === 'early') {
    flags.push({ id: 'opt-out', label: 'Can opt out', why: `He can leave his contract after this season (${next.option === 'player' ? 'player option' : 'early termination option'} for ${span(next.season)}).` });
  } else if (next?.option === 'team') {
    flags.push(rookie
      ? { id: 'rookie-option', label: 'Rookie team option', why: `His team decides on the ${span(next.season)} year of his rookie deal (rookie options are usually picked up for good young players).` }
      : { id: 'team-option', label: 'Team option', why: `His team can decline the ${span(next.season)} year and let him go.` });
  }
  const partial = c.guaranteed != null && c.guaranteed < now.salary;
  // Rookie deals are cheap by design (teams rarely cut a first-round pick), so for them only a
  // partial guarantee counts.
  if ((now.salary <= MIN_DEAL && !rookie) || partial) {
    flags.push({ id: 'waivable', label: 'Easy to waive', why: partial ? `Only ${money(c.guaranteed)} of his deal is guaranteed, so his team can cut him cheaply.` : `A near-minimum deal (${money(now.salary)}): cheap for his team to cut if a better player comes along.` });
  }
  return { now, left: later.length, rest, options, rookie, partial, flags };
}

// One plain line, e.g. "$12.4M · 2 more yrs · team option 2028-29".
export function contractText(c, season, nbaSeasons = null) {
  const r = readContract(c, season, nbaSeasons);
  if (!r) return null;
  season = Number(season);
  if (!r.now) return r.left ? `Signed from ${span(r.rest[0].season)}` : 'Contract over';
  if (r.waived) return `${c.guaranteed ? `${money(c.guaranteed)} guaranteed with ${c.team}` : `With ${c.team}`} · ${c.waived.join('/')} still pays his old deal (waived)`;
  return [
    money(r.now.salary),
    r.left ? `${r.left} more yr${r.left === 1 ? '' : 's'}` : 'final year',
    // Options of the same kind in a row read as one: "team options 2028-29 & 2029-30".
    ...r.options.reduce((runs, o) => {
      const last = runs.at(-1);
      if (last?.option === o.option && last.seasons.at(-1) === o.season - 1) last.seasons.push(o.season);
      else runs.push({ option: o.option, seasons: [o.season] });
      return runs;
    }, []).map(o => `${o.option === 'player' ? 'player option' : o.option === 'team' ? 'team option' : o.option === 'early' ? 'early termination' : `${o.option} option`}${o.seasons.length > 1 ? 's' : ''} ${o.seasons.map(span).join(' & ')}`),
    r.partial ? `${money(c.guaranteed)} guaranteed` : '',
  ].filter(Boolean).join(' · ');
}
