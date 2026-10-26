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
  // 2026 week 1 (Oct 26 2026): once the week ended, Sleeper's matchup feed dropped many locks (and
  // left Kawhi Leonard at 0), so every team score was off. Scores = Sleeper's official standings
  // (roster fpts after week 1). Players = the one combination of each starter's real games (box
  // scores, league scoring) that adds up to the official score, closest to the values saved Sunday
  // night. simeoncampbell7 and BenDoverPlz123 had several combinations that fit: the owner read their
  // players in the Sleeper app.
  { season: '2026', week: 1,
    scores: { bigdaddyburk: 381, tzola13: 402, loganzarvell: 383, simeoncampbell7: 305, jimmycooks2: 390, bigtrey5456: 343, TRT3: 394, BenDoverPlz123: 305 },
    players: {
      bigdaddyburk: { 'Michael Porter Jr.': 45, 'Alperen Sengun': 42, 'Tyrese Haliburton': 41 },
      tzola13: { 'Amen Thompson': 41 },
      loganzarvell: { 'Cooper Flagg': 43, 'Jalen Smith': 34 },
      bigtrey5456: { 'Ty Jerome': 61, 'Zach LaVine': 45, 'Josh Hart': 24 },
      jimmycooks2: { 'Jaylen Brown': 35, 'Karl-Anthony Towns': 41, 'Joel Embiid': 50, 'Kawhi Leonard': 41 },
      TRT3: { 'Domantas Sabonis': 34 },
      // Read in the Sleeper app by the owner (Oct 26 2026). simeon's whole lineup is pinned: the feed kept
      // changing his players' points after the week ended (Dëmin 5 -> 31, Jones 17 -> 20).
      simeoncampbell7: { 'Jamal Murray': 57, 'Egor Demin': 31, 'Josh Giddey': 29, 'Ace Bailey': 34, 'Caleb Wilson': 54,
        'Derrick Jones Jr.': 17, 'Nikola Jokic': 67, 'Collin Murray-Boyles': 12, 'Ivica Zubac': 4 },
      // Trae Young, RJ Barrett and Wendell Carter Jr. are the values the site already had when the owner
      // checked this team in the app (only the 3 before them needed fixing); pinned Oct 26 2026 so the
      // automatic week check (assets/weekfix.js) has one answer. Change them if the app says otherwise.
      BenDoverPlz123: { 'Keyonte George': 40, 'LeBron James': 36, 'Paul Reed': 21, 'Trae Young': 36, 'RJ Barrett': 38, 'Wendell Carter Jr.': 21 },
    } },
];

// Draft picks Sleeper recorded as the wrong player, usually a duplicate player
// entry ("Name DUPLICATE") that never scores. Most fix themselves: when the
// commissioner added the real player to the same team, the site links them. If
// the nightly Action emails about a duplicate draft pick, add the real player here:
//   { season: '2024', pick: 23, player: 'Player Name' }   (pick = overall pick number)
// Add pid: 'Sleeper id' when you know it: names can change (Ronald Holland -> Ronald Holland II).
// Or, if nobody knows who was really drafted, leave the pick out of the draft records:
//   { season: '2024', pick: 23, ignore: true }
export const DRAFT_CORRECTIONS = [
  // jimmycooks2's round 3 pick was recorded as "Ron Holland DUPLICATE"; the real
  // Ron Holland went to loganzarvell, and who jimmycooks2 meant to take is unknown.
  { season: '2024', pick: 23, ignore: true },
  // loganzarvell's picks 5 and 11 were recorded as "Matas Buzelis DUPLICATE" and
  // "Ron Holland DUPLICATE" (he dropped both entries in week 1). Sleeper lists the
  // real Ron Holland as "Ronald Holland" (renamed "Ronald Holland II" on Oct 21 2026, which broke the
  // name match and failed the nightly check), so these use Sleeper's player id (pid), which never changes.
  { season: '2024', pick: 5, player: 'Matas Buzelis', pid: '2835' },
  { season: '2024', pick: 11, player: 'Ronald Holland II', pid: '2836' },
];

// Player photos Sleeper has wrong (its photo for LeBron James is Bronny James).
// These use the official NBA.com headshot instead: the number is the player's
// NBA.com ID, from his page's address (nba.com/player/2544/lebron-james -> 2544).
export const PHOTO_CORRECTIONS = {
  'LeBron James': 2544,
};

// All-Star positions. Sleeper only knows each player's position today, so a
// season's All-Stars use the position he had when that season's All-Stars were
// first worked out. If a player was listed differently that season, set it here
// by season and name: 'G' (PG/SG), 'F' (SF/PF) or 'C'.
//   '2024': { 'Karl-Anthony Towns': 'F' },
export const ALL_STAR_POSITIONS = {
};
