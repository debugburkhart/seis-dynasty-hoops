// Test features: brand-new tools the commish tries out in his office before anyone else sees
// them. Every tab here and every card inside it carries a "Beta" tag until the owner says the
// feature goes live; then it moves to its real place on the site and the tags come off (see
// CLAUDE.md, "Test features").

// One entry per feature: tab id (#/commish?tab=id), tab label, the day it was added.
export const TEST_FEATURES = [
  { id: 'breakdown', label: '2K breakdown', since: '2026-10-25' },
  { id: 'injuries', label: 'Injury Report', since: '2026-10-26' },
  // Moved here from My GM by the owner (Oct 26 2026; was the Lock-in coach). Tab id stays 'coach' so old links work.
  { id: 'coach', label: 'Assistant Coach', since: '2026-10-26' },
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
