// Trade Court (owner, Oct 2026): every trade in league history is a "case" the managers judge.
// Rules decided with the owner: the 8 managers vote (Google sign-in + an approved team claim,
// same as Weekly Props); managers IN the trade may vote but are "party to the case" and don't
// count toward the verdict; votes are public by name; anyone can change or withdraw a vote at
// any time (no deadline). Verdict needs MIN_JURORS counted votes: a 2-team deal = the average on
// the 1-5 scale (1 = side 1 handily ... 5 = side 2 handily), rounded toward "Even" on a .5;
// a 3-team deal = the ruling with the most votes (a tie = split jury).
// No DOM or Node APIs.
//
// Firestore: court/{season}/votes/{case key}_{uid} = { k: case key, owner: voter's Sleeper owner
// id, w: owner id judged the winner or 'even', m: 'h' (handily) | 's' (slightly) | '' (even),
// t: server time }. Public read (the page reads them with Firestore's REST API, no SDK needed);
// a write must be your own doc for your approved team (firestore.rules).
// Case key = `${season}-${ts}` (Sleeper's completion time, kept in DATA.transactions and frozen
// seasons, so it never changes on a nightly rebuild).

export const MIN_JURORS = 3;
const PROJECT = 'dynasty-hof';
const API_KEY = 'AIzaSyBc3-Ejlfxj_9ul7K-2CqZxWi_QMqBJLE0'; // same public web key as sync.js

// Every trade, oldest first, numbered 1..N across all seasons.
export function tradeCases(DATA) {
  const list = [];
  (DATA.transactions ?? []).forEach((x, tx) => {
    if (x.type !== 'trade' || (x.owners ?? []).length < 2) return;
    const owners = [...new Set(x.owners)];
    list.push({
      key: `${x.s}-${x.ts}`, s: x.s, w: x.w, ts: x.ts ?? 0, tx, owners,
      sides: owners.map(o => ({
        o,
        players: Object.entries(x.adds ?? {}).filter(([, to]) => to === o).map(([pid]) => ({ pid, from: x.drops?.[pid] })),
        picks: (x.picks ?? []).filter(p => p.to === o),
      })),
    });
  });
  list.sort((a, b) => a.ts - b.ts || Number(a.s) - Number(b.s));
  list.forEach((c, i) => { c.no = i + 1; });
  return list;
}

// Ruling options in display order. 2 teams: the reference's 5-point scale; 3 teams: each team
// handily / slightly, then even.
export function rulings(c) {
  const [a, b] = c.owners;
  if (c.owners.length === 2) {
    return [{ w: a, m: 'h', n: 1 }, { w: a, m: 's', n: 2 }, { w: 'even', m: '', n: 3 }, { w: b, m: 's', n: 4 }, { w: b, m: 'h', n: 5 }];
  }
  return [...c.owners.flatMap(o => [{ w: o, m: 'h' }, { w: o, m: 's' }]), { w: 'even', m: '' }].map((r, i) => ({ ...r, n: i + 1 }));
}
export const sameRuling = (r, v) => r.w === v.w && (r.w === 'even' || r.m === v.m);

// votes: the case's vote docs. One vote per manager (newest wins if he has two accounts).
export function tally(c, votes) {
  const byOwner = new Map();
  for (const v of votes) if (v.k === c.key && (!byOwner.has(v.owner) || byOwner.get(v.owner).t < v.t)) byOwner.set(v.owner, v);
  const all = [...byOwner.values()].filter(v => v.w === 'even' || c.owners.includes(v.w));
  const party = v => c.owners.includes(v.owner);
  const opts = rulings(c).map(r => {
    const vs = all.filter(v => sameRuling(r, v));
    return { ...r, voters: vs.map(v => ({ owner: v.owner, party: party(v) })), count: vs.length };
  });
  const jurors = all.filter(v => !party(v));
  const out = { opts, votes: all.length, jurors: jurors.length, parties: all.length - jurors.length, verdict: null };
  if (jurors.length < MIN_JURORS) return out;
  if (c.owners.length === 2) {
    const avg = jurors.reduce((s, v) => s + opts.find(o => sameRuling(o, v)).n, 0) / jurors.length;
    const n = avg < 3 ? Math.floor(avg + 0.5) : Math.ceil(avg - 0.5); // a .5 rounds toward Even
    out.verdict = { ...opts[n - 1], avg };
  } else {
    const count = o => o.voters.filter(v => !v.party).length;
    const top = Math.max(...opts.map(count));
    const lead = opts.filter(o => count(o) === top);
    out.verdict = lead.length === 1 ? { ...lead[0], top } : { split: true, top, tied: lead };
  }
  return out;
}

// One season's votes through Firestore's REST API (public read; no sign-in or SDK).
export async function loadVotes(season) {
  const out = [];
  let page = '';
  for (let i = 0; i < 20; i++) {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/court/${encodeURIComponent(season)}/votes?pageSize=300&key=${API_KEY}${page ? `&pageToken=${encodeURIComponent(page)}` : ''}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(res.status === 403 ? 'the vote rules aren’t published yet' : `server said ${res.status}`);
    const body = await res.json();
    for (const d of body.documents ?? []) {
      const f = d.fields ?? {};
      const s = k => f[k]?.stringValue ?? '';
      out.push({ id: d.name.split('/').pop(), k: s('k'), owner: s('owner'), w: s('w'), m: s('m'), t: Date.parse(f.t?.timestampValue ?? '') || 0 });
    }
    if (!body.nextPageToken) break;
    page = body.nextPageToken;
  }
  return out;
}

export const voteId = (key, uid) => `${key}_${uid}`;
