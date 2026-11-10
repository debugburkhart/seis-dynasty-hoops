// Test features: brand-new tools the commish tries out in his office before anyone else sees
// them. Every tab here and every card inside it carries a "Beta" tag until the owner says the
// feature goes live; then it moves to its real place on the site and the tags come off (see
// CLAUDE.md, "Test features").

// One entry per feature: tab id (#/commish?tab=id), tab label, the day it was added.
// Moved to MyGM (owner, Nov 8 2026): 2K breakdown (now "Rosters"), Assistant Coach, Depth Chart. Contracts came back Nov 9 2026.
export const TEST_FEATURES = [
  { id: 'injuries', label: 'Injury Report', since: '2026-10-26' },
  // Reports (owner, Oct 28 2026): one-off questions answered from live data; each report is a title that opens.
  { id: 'reports', label: 'Reports', since: '2026-10-28' },
  // Dev Dashboard (owner, Nov 1 2026): every starter's lock per matchup, every uncertainty, the commish's picks = law.
  { id: 'devdash', label: 'Dev Dashboard', since: '2026-11-01' },
  // Defense vs Position (owner, Nov 2 2026): FP each NBA team allows per position, this week's matchup grades.
  { id: 'defense', label: 'Defense vs Position', since: '2026-11-02' },
  // Lock Report Card (owner, Nov 2 2026): each manager's locks graded vs "never lock, last lineup game counts".
  { id: 'lockcard', label: 'Lock Report Card', since: '2026-11-02' },
  // Trade Trees (owner, Nov 2 2026): a trade's every branch (what each team got, then what that became), by locked points.
  { id: 'tradetree', label: 'Trade Trees', since: '2026-11-02' },
  // Advanced Stats (owner, Nov 4 2026): charts comparing players and NBA / fantasy teams in depth (advstats.js + advstats-ui.js).
  { id: 'advanced', label: 'Advanced Stats', since: '2026-11-04' },
  // Sleeper Insider (owner, Nov 8 2026): Sleeper's private GraphQL API, read-only, his own token in this browser only.
  { id: 'sleeper', label: 'Sleeper Insider', since: '2026-11-08' },
  // Contract Sandbox (owner, Nov 7 2026): was MyGM's first tab Nov 8-9 2026, moved back here ("we won't worry about it now").
  { id: 'contracts', label: 'Contract Sandbox', since: '2026-11-07' },
];

export const BETA = '<span class="gm-beta">Beta</span>';

export const isTestTab = id => TEST_FEATURES.some(f => f.id === id);

// Tab bar entries for the commish office, labels already tagged.
export const testTabs = () => TEST_FEATURES.map(f => [f.id, `${f.label} ${BETA}`]);

// A card with the Beta tag in its title. Use it for EVERY card a test feature draws.
// opts: sub (small text on the right of the title), cls (extra classes), id.
export function betaCard(title, body, opts = {}) {
  return `
    <section class="card tf-card${opts.cls ? ` ${opts.cls}` : ''}"${opts.id ? ` id="${opts.id}"` : ''}>
      <div class="card-head"><h2>${title} ${BETA}</h2>${opts.sub ? `<span class="card-sub">${opts.sub}</span>` : ''}</div>
      ${body}
    </section>`;
}

// MyGM+ (owner, Nov 9 2026): the commish's full-featured copy of MyGM (#/mygmplus). MyGM (#/mygm) will be trimmed for
// release to every manager; both run the same tabs. Links inside the tabs use mygmBase() so they stay on the page
// that's open. isMyGMPlus() lets a tab show extra things only in MyGM+ later.
export const isMyGMPlus = () => location.hash.startsWith('#/mygmplus');
export const mygmBase = () => (isMyGMPlus() ? '#/mygmplus' : '#/mygm');
