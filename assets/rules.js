// The league rulebook (Now → Rulebook). Edit the text here; the page lays it out.
//
// Each rule has a number, a title, the season it was added (the year the season
// starts: '2026' = the 2026-27 season) and its points. A point is plain text, or
// { text, items: [...] } for sub-points.
//
// To CHANGE a rule: edit its text to the new rule and add when it changed and what
// it used to say. The page shows the new rule with a "Changed in 2027-28 · was 30
// players" note, and lists the change under "Rule changes" at the bottom:
//   { text: 'Taxi squad size is 15 players.', changed: { season: '2027', was: '30 players' } }
//
// To ADD a rule: add it at the end with the next number and the season it starts.
// To add a point to an existing rule, give that point its own `added: '2027'`.

export const LEAGUE_START = '2023';

export const RULES = [
  {
    n: 1, title: 'Trades & Trade Deadline', added: '2023',
    items: [
      'The Trade Deadline coincides with the NBA All-Star Game.',
      {
        text: 'The Trade Deadline also invokes Taxi forgiveness, where rookies can be assigned to the taxi squad. Taxi forgiveness starts with custom waivers:',
        items: [
          'Sunday before trade deadline week (after games): everyone is set to waivers.',
          'Monday (the first day of trade deadline week): everyone comes off waivers at 5 pm, or any time before the first game of the week.',
        ],
      },
      'Once a trade has been made during the week, if a player involved in the trade has already been locked for his previous team that week, he cannot play for his new team until the next week.',
    ],
  },
  {
    n: 2, title: 'Taxi Squad', added: '2023',
    items: [
      // Wording matches the league's Sleeper setting "Taxi squad duration: 2 Years" (owner, Oct 2026).
      'Duration is 2 years: players with more than 2 years of experience in the NBA must be activated from the taxi squad.',
      'The taxi squad deadline is the start of the regular season.',
      // covers: the Timeline shows this change instead of Sleeper's "Taxi 30 → 15" setting change.
      { text: 'Taxi squad size is 15 players.', changed: { season: '2026', was: '30 players' }, covers: 'taxi' },
      // An original rule, written down Oct 2026 (owner).
      'A player traded from a taxi squad may remain on the taxi squad of his new team.',
    ],
  },
  {
    n: 3, title: 'League Dues', added: '2023',
    items: ['League dues are $10 per season.'],
  },
  {
    n: 4, title: 'Awards', added: '2025',
    items: [
      { text: 'League MVP', items: ['Most fantasy points in the league.'] },
      { text: 'Championship MVP', items: ['Most fantasy points in the championship game.'] },
      { text: 'All-Fantasy Team', items: ['Top 10 fantasy players.', 'Must be on a playoff team.'] },
      { text: 'Rookie of the Year', items: ['Most fantasy points as a rookie.'] },
      { text: 'All-Rookie Team', items: ['Top 5 fantasy rookies.'] },
      { text: 'All-Stars', items: ['Top 5 guards, top 5 forwards and top 5 centers at the All-Star break.', 'Players fall into the category of their primary position, no duplicates.'] },
      { text: 'Rings', items: ['Awarded to every non-taxi player on the championship team.'] },
      { text: 'Coach’s Player of the Year', items: ['Each coach nominates one of their players.', 'Voted on at the off-season meetings.'] },
      { text: 'Most Improved Player', items: ['Each coach nominates one of their players.', 'Voted on at the off-season meetings.'] },
    ],
  },
  {
    n: 5, title: 'Veto System', added: '2026',
    items: [
      {
        text: 'Trades take the full 2-day period to process, unless the Approve or Deny condition is met before then.',
        items: [
          'When a trade has been confirmed by both sides, the commissioner puts a poll in the chat with three options: Approve, Deny, Non-participant. For a trade to go through sooner than the 2 days, it needs 5 approves.',
          'For a trade to be denied, it needs 5 denies. If neither happens, the trade goes through automatically after the 2-day period.',
        ],
      },
    ],
  },
  {
    n: 6, title: 'Waivers After the Draft', added: '2026',
    items: [
      { text: 'Order:', items: ['The draft.', 'Immediately after the draft, all players are set to waivers.', 'One week after the draft, waiver claims run.'] },
    ],
  },
  {
    n: 7, title: 'First Pick Coin Flip', added: '2026',
    items: ['A coin flip between the bottom 2 teams of the year decides who gets the first pick.'],
  },
  {
    n: 8, title: 'League Median Game', added: '2026', covers: 'median', // the Timeline shows this rule instead of the setting change
    items: ['Every team plays an extra game each week against the league median.'],
  },
  {
    n: 9, title: 'Wager Weeks (2026-27 Season Only)', added: '2026',
    items: [
      'During Weeks 8 through 14 of the regular season, the manager with the lowest weekly score must put up $5 to fund an NBA parlay.',
      'This is a temporary rule for the 2026-27 season only. It expires at the end of the season unless the league renews it.',
      'Every manager in the league selects one leg of the parlay.',
      'If the parlay hits, the winnings are split evenly among all managers.',
      {
        text: 'Funding limit:',
        items: [
          'No manager is required to fund the parlay more than 2 times.',
          'If a manager who has already funded it 2 times has the lowest score again, the obligation passes to the manager with the next-lowest score who has not yet reached the limit.',
        ],
      },
    ],
  },
];
