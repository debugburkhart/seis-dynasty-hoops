// Scores where Sleeper's API disagrees with the Sleeper app (stat corrections
// that never reached the weekly matchup data).
//
//   scores:  replaces a manager's team score that week (Sleeper display names).
//   players: replaces a starter's locked points that week, keyed by manager,
//            then player name as Sleeper spells it. A player missing from the
//            API's lineup is added.
//
// If the nightly Action fails with a scoring mismatch, it lists the games (and,
// for player totals, the starters) to look up in the app. Add the app's numbers here.
export const CORRECTIONS = [
  { season: '2023', week: 8,
    scores: { loganzarvell: 229.5, TRT3: 243 },
    players: { loganzarvell: { 'Anfernee Simons': 25.5 }, TRT3: { "De'Aaron Fox": 32, 'Kevin Durant': 25.5 } } },
  { season: '2023', week: 9,
    scores: { loganzarvell: 221, bigtrey5456: 286 },
    players: { loganzarvell: { 'Tyrese Haliburton': 28, 'Devin Booker': 22.5, 'Alperen Sengun': 23 } } },
  { season: '2023', week: 20,
    scores: { loganzarvell: 292.5, BenDoverPlz123: 279.5 },
    players: { loganzarvell: { 'Paolo Banchero': 28 } } },
  { season: '2024', week: 15,
    scores: { tzola13: 424, bigtrey5456: 426 },
    players: { tzola13: { 'Bam Adebayo': 45 } } },
  { season: '2024', week: 16,
    scores: { BenDoverPlz123: 367, loganzarvell: 320 },
    players: { BenDoverPlz123: { 'GG Jackson': 34 } } },
  { season: '2025', week: 4,
    scores: { BenDoverPlz123: 304, jimmycooks2: 454 },
    players: { BenDoverPlz123: { 'Mikal Bridges': 42, 'Miles Bridges': 49 } } },
  { season: '2025', week: 5,
    scores: { jimmycooks2: 361, tzola13: 394 },
    players: { jimmycooks2: { 'Isaiah Hartenstein': 37 } } },
  { season: '2025', week: 14,
    scores: { BenDoverPlz123: 274, TRT3: 374 },
    players: { BenDoverPlz123: { 'Ace Bailey': 31 } } },
];
