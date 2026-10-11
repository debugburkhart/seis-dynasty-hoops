// League Timeline (Hall of Fame → Timeline): every season's story, newest first.
// Most entries are found automatically: champions, rules added or changed in the
// Rulebook (rules.js), league settings that changed in Sleeper (saved nightly per
// season), each season's draft and the league's founding.
//
// To ADD A MILESTONE by hand, add a line to MILESTONES:
//   { season: '2026', title: 'First in-person draft', note: 'Held in Iowa City', icon: 'flag' }
// season = the year the season starts ('2026' = 2026-27). icon is optional:
// trophy, flag, scale, pencil, grid, users, cap, star, calc.

export const MILESTONES = [];

const SCORING_NAMES = {
  pts: 'Points', reb: 'Rebounds', ast: 'Assists', stl: 'Steals', blk: 'Blocks', to: 'Turnovers',
  tpm: '3-pointers made', dd: 'Double-double', td: 'Triple-double', ff: 'Flagrant foul', tf: 'Technical foul',
  bonus_pt_40p: '40+ point bonus', bonus_pt_50p: '50+ point bonus', bonus_ast_15p: '15+ assist bonus',
  bonus_reb_20p: '20+ rebound bonus',
};
const scoringName = k => SCORING_NAMES[k] ?? k.replace(/_/g, ' ');
const n = x => (Number.isInteger(x) ? String(x) : String(Math.round(x * 100) / 100));

// What changed in Sleeper's settings from one season to the next.
function settingChanges(before, now) {
  if (!before || !now) return [];
  const out = [];
  const count = list => list.reduce((m, p) => ({ ...m, [p]: (m[p] ?? 0) + 1 }), {});
  const sa = count(before.starters ?? []);
  const sb = count(now.starters ?? []);
  const slotDiff = [...new Set([...Object.keys(sa), ...Object.keys(sb)])]
    .filter(p => (sa[p] ?? 0) !== (sb[p] ?? 0)).map(p => `${p} ${sa[p] ?? 0} → ${sb[p] ?? 0}`);
  const roster = [
    ...slotDiff,
    ...(before.bench !== now.bench ? [`Bench ${before.bench} → ${now.bench}`] : []),
    ...(before.taxi !== now.taxi ? [`Taxi ${before.taxi} → ${now.taxi}`] : []),
    ...(before.ir !== now.ir ? [`IR ${before.ir} → ${now.ir}`] : []),
  ];
  if (roster.length) out.push({ key: 'roster', icon: 'grid', title: 'Roster slots changed', note: roster.join(' · ') });

  const keys = [...new Set([...Object.keys(before.scoring ?? {}), ...Object.keys(now.scoring ?? {})])];
  const scoring = keys.filter(k => (before.scoring?.[k] ?? 0) !== (now.scoring?.[k] ?? 0)).map(k => {
    const a = before.scoring?.[k] ?? 0;
    const b = now.scoring?.[k] ?? 0;
    if (!a) return `added ${scoringName(k)} (${b > 0 ? '+' : ''}${n(b)})`;
    if (!b) return `dropped ${scoringName(k)}`;
    return `${scoringName(k)} ${n(a)} → ${n(b)}`;
  });
  if (scoring.length) out.push({ key: 'scoring', icon: 'calc', title: 'Scoring changed', note: scoring.join(' · ') });

  if (before.teams && now.teams && before.teams !== now.teams) {
    out.push({ key: 'teams', icon: 'users', title: `League ${now.teams > before.teams ? 'expanded' : 'shrank'}`, note: `${before.teams} → ${now.teams} teams` });
  }
  if (before.playoffTeams && now.playoffTeams && before.playoffTeams !== now.playoffTeams) {
    out.push({ key: 'playoffs', icon: 'trophy', title: 'Playoff field changed', note: `${before.playoffTeams} → ${now.playoffTeams} teams` });
  }
  if (!before.median && now.median) out.push({ key: 'median', icon: 'scale', title: 'Added the extra game vs the league median' });
  if (before.median && !now.median) out.push({ key: 'median', icon: 'scale', title: 'Dropped the league median game' });
  return out;
}

// One line about a rule for its timeline entry. A rule made of named parts (like
// Awards) lists the names; otherwise its first point, with any sub-points after it.
const textOf = p => (typeof p === 'string' ? p : p?.text ?? '');
function ruleSummary(r) {
  const items = r.items ?? [];
  const named = items.length > 2 && items.every(p => typeof p !== 'string' && p.items?.length && textOf(p).length < 40);
  if (named) {
    const names = items.map(textOf);
    return names.length > 5 ? `${names.slice(0, 5).join(', ')} and ${names.length - 5} more` : names.join(', ');
  }
  const first = items[0];
  const subs = typeof first === 'string' ? [] : (first?.items ?? []).map(textOf);
  const lead = textOf(first).replace(/:$/, '');
  if (!subs.length) return lead;
  return lead.split(' ').length <= 2 ? subs.join(' → ').replace(/\.(?= →)/g, '') : lead;
}

// The timeline, newest season first: [{ season, teams, events: [...] }].
// name(o): a manager's display name; rules: the Rulebook (rules.js).
export function buildTimeline(DATA, { rules = [], leagueStart, name }) {
  const seasons = [...DATA.seasons].sort((a, b) => Number(a.season) - Number(b.season));
  const out = [];
  seasons.forEach((s, i) => {
    const prev = seasons[i - 1];
    const events = [];
    // Champion.
    if (s.status === 'complete' && s.champion) {
      const final = DATA.games.find(g => g.s === s.season && g.label === 'Championship');
      const won = final && (final.a === s.champion ? [final.ap, final.bp, final.b] : [final.bp, final.ap, final.a]);
      events.push({
        icon: 'trophy', kind: 'title', who: s.champion, title: 'took the title',
        note: [DATA.owners[s.champion]?.teams?.[s.season], won ? `def. ${name(won[2])} ${n(won[0])}–${n(won[1])}` : ''].filter(Boolean).join(' · '),
        link: '#/awards',
      });
    }
    // Rules added or changed this season (the founding rules sit with the founding).
    const covered = new Set();
    if (s.season !== leagueStart) {
      for (const r of rules.filter(x => x.added === s.season)) {
        if (r.covers) covered.add(r.covers);
        events.push({ icon: 'scale', kind: 'rule', title: `New rule: ${r.title}`, note: ruleSummary(r), link: '#/rules' });
      }
    }
    const walk = (list, r) => {
      for (const p of list ?? []) {
        if (typeof p === 'string') continue;
        if (p.changed?.season === s.season) events.push({ icon: 'scale', kind: 'rule', title: `Rule changed: ${r.title}`, note: `Now: ${p.text} (was ${p.changed.was})`, link: '#/rules' });
        if (p.added && p.added === s.season && p.added !== r.added) events.push({ icon: 'scale', kind: 'rule', title: `Rule added: ${r.title}`, note: p.text, link: '#/rules' });
        walk(p.items, r);
      }
    };
    for (const r of rules) walk(r.items, r);
    // League renamed.
    if (prev && prev.name?.trim() && s.name?.trim() && prev.name.trim() !== s.name.trim()) {
      events.push({ icon: 'pencil', kind: 'setting', title: 'League renamed', note: `“${prev.name.trim()}” → “${s.name.trim()}”` });
    }
    // Sleeper settings that changed (a rule that covers one replaces it).
    for (const c of settingChanges(prev?.settings, s.settings)) if (!covered.has(c.key)) events.push({ ...c, kind: 'setting' });
    // The draft: who went first.
    const draft = (DATA.drafts ?? []).find(d => d.s === s.season && d.kind === 'rookie') ?? (DATA.drafts ?? []).find(d => d.s === s.season);
    const top = draft?.picks.find(p => p.no === 1);
    if (top) {
      events.push({
        icon: 'cap', kind: 'draft', title: `${draft.kind === 'startup' ? 'Startup' : 'Rookie'} draft`,
        note: `${DATA.players?.[top.pid]?.n ?? 'Player'} went 1.01 to ${name(top.o)} · ${draft.picks.length} picks`,
        link: `#/draft-history?season=${s.season}`,
      });
    }
    // Founding.
    if (i === 0) {
      const original = new Set(s.teams.map(t => t.owner));
      const allStayed = seasons.every(x => x.teams.length === original.size && x.teams.every(t => original.has(t.owner)));
      const founding = rules.filter(r => r.added === leagueStart).map(r => r.title);
      events.push({
        icon: 'flag', kind: 'founded', title: 'Founded on Sleeper',
        note: [`${s.teams.length} franchises${allStayed && seasons.length > 1 ? `, the same ${original.size} managers ever since` : ''}`, founding.length ? `original rules: ${founding.join(', ')}` : ''].filter(Boolean).join(' · '),
      });
    }
    for (const m of MILESTONES.filter(x => x.season === s.season)) events.push({ icon: m.icon ?? 'star', kind: 'milestone', title: m.title, note: m.note ?? '' });
    out.push({ season: s.season, teams: s.teams.length, current: s.status !== 'complete', events });
  });
  return out.reverse();
}
