# Seis Dynasty Basketball Hall of Fame

League history site for the Seis Dynasty Basketball league on Sleeper (8 teams, NBA,
dynasty). Static site on GitHub Pages; a GitHub Action rebuilds the data nightly.

- Live site: https://debugburkhart.github.io/seis-dynasty-hoops/
- Repo: https://github.com/debugburkhart/seis-dynasty-hoops (public)
- Owner is not a developer: explain in plain language, give exact upload steps.

## How the owner deploys (important)
- No git/Node locally. The owner uploads files through GitHub's web UI:
  from the repo's **main page**, Add file → Upload files, drag the `assets` folder
  (and/or `scripts`, `index.html`) in **one batch**. Never tell them to upload from
  inside `assets` (that once created `assets/assets/`).
- `.github/workflows/update.yml` can't be uploaded (hidden folder): the owner edits it on
  GitHub with the pencil and pastes. Put the new content on their clipboard with
  PowerShell `Get-Content -Raw ... | Set-Clipboard`.
- Always end a change with the exact list of files to upload.
- The repo is public: check runs/files with `curl` against api.github.com,
  raw.githubusercontent.com and the live site (github.io is blocked in the Browser pane).

## Architecture (all plain ES modules, no build step)
- League logo (owner chose the "Hex Ball", Oct 2026): assets/logo.svg (sidebar, top bar,
  favicon), assets/icon-180.png (iPhone home screen) and icon-512.png, all drawn from the same
  shapes; downloadable copies in brand/ (SVG, 512/1024 PNG, 1024 avatar on navy). PNGs are
  drawn with PowerShell System.Drawing (no Node locally), matching the SVG geometry.
- `index.html`: shell + import map. Every module in `assets/` must be listed in the
  import map with `?v=dev` (the Action replaces it with a version fingerprint).
- `assets/rules.js`: the league Rulebook text (#/rules, under Now). Rules grouped by season
  added (LEAGUE_START 2023 = original); a changed point = today's text + changed: {season,
  was} (page shows a note + "Rule changes" history). Owner's answers: show current rule +
  change note; taxi size changed 30 -> 15 for 2026-27 (owner, Oct 2026; point has covers:
  'taxi' so the Timeline drops Sleeper's "Taxi 30 → 15" slot change); the mid-week
  trade-lock rule is an original rule (1.3); Awards rule = 2025-26 per its parentheses.
- `assets/timeline.js`: League Timeline (#/timeline, Hall of Fame; modeled on the owner's
  reference screenshot). Per season, newest first: champion (+ final score), Rulebook rules
  added/changed (rules.js; a rule with covers: 'median' replaces the auto setting entry),
  league renamed, Sleeper settings changes (DATA.seasons[].settings saved nightly by
  settingsOf() in build-data: starters, bench, taxi, IR, teams, playoff teams, median,
  scoring), the draft's 1.01, founding (+ "same N managers"), and hand-added MILESTONES.
- `assets/app.js`: all pages (hash routes: home, rules, timeline, rivalry, records, power, hype, standings,
  transactions, awards, players), sidebar.
- Home (#/home, the default page; renderHome in app.js): Main event = top of hypeSlate for
  the week the Hype page opens on (preseason: last season's final week + tip-off note);
  "Record watch" ticker (newest 8 league + 6 personal record events): desktop auto-scrolls;
  phones (<=560px, owner's request) get a swipe row, one card + next peeking, dots and
  "1 of N · Swipe" (bindTicker); plain
  swipe strip when the device has Reduce Motion on); Power top 3 (latest edition); all-time
  standings top 5 with Wins/Titles/Median %/Total points/Pts per season buttons (regular
  season, same numbers as the Standings table); 6 newest transactions. Every item links to
  its page. Wager Weeks tracker (homeWager, below the standings; WAGER in config.js): shown
  in the 2026 season until the week after week 14; per week 8-14 the payer (lowest score, or
  next-lowest under the 2-time cap), live "on the hook" during a wager week (liveWeek once on
  load), a tie for the payer spot = "commish decides" and nobody charged, tally dots + pot.
  Bet results: wager.json at the repo ROOT ({ parlays: { week: { result: won|lost, amount } } },
  amount = total ticket payout, per manager = amount / teams). Entered in Commish → League
  office → Wager Weeks (renderWagerAdmin): Copy results + "Open wager.json on GitHub" (edit
  URL), owner pastes and commits (push redeploys, ~3-5 min); last save kept 20 min in
  localStorage wager-saved so the form shows it until GitHub publishes. Card stays up after
  week 15 until every paid week has a result.
  Record links use `#/records/{cat}?rec={slug}` (+ `manager=` for personal),
  which opens and scrolls to that leaderboard.
- `assets/build-data.js`: pulls everything from Sleeper (`api.sleeper.com`, cache-busted),
  applies `corrections.js`, loads frozen seasons. Output = `data/league.json`.
- `assets/records.js`: Record Book (6 categories, filters, record-change history). Every
  category uses the grouped table layout (GROUPS = sections per category, BAD = muted
  records). Manager filter: records with many entries per manager rank his own entries
  1-10 in gold (personal records) with league rank alongside. recordHistory() also emits
  personal events ({personal, owner, order}: a manager beating his own best in a "mark"
  record; bad and schedule/luck records excluded; same performance announced once; last
  30 kept). The Record Book page shows the 6 newest under "Personal records"; league
  "Recently broken", badges and the weekly recap ignore personal events. Oct 2026 additions
  (owner): Players: Most points by a player in a season (all teams), Best points per start
  in a season (MIN_STARTS_SEASON 10) and career (MIN_STARTS_CAREER 40; Playoffs stage view:
  MIN_STARTS_CAREER_PLAYOFFS 3, owner Oct 2026; constants at the
  top of records.js, scaled down for playoff/one-season filters; owner may change them),
  Most points as a rookie (DATA.rookiePool: rookies with locked points per season, built in
  build-data with the ROY rookie rule, carried over once a season is complete, current
  season redone nightly; locked points = that season's scoring, so 2023 is 0.5/pt).
  Matchups: Beat the median by the most, Shootout week (league total, not personal).
  Streaks: Longest playoff win streak; Fastest to 25 wins removed. Win/losing streaks come in
  two versions (owner): "(head-to-head + median)" = every result as Sleeper counts it (from
  2026-27 a week is H2H then median; a 1-1 week ends it) and "head-to-head" only; same split
  for career wins/win %, season wins and worst season record (+ H2H losses). Careers "Vs the
  median": best/worst record vs the weekly league median (all seasons), most lucky H2H wins
  (won below the median) / unlucky H2H losses (lost above it). Milestones (owner): 400 and
  450-point clubs, 1st-place regular-season finishes, career points clubs (POINT_CLUBS every
  5,000 from 15,000, all-time only), 50 career H2H wins (date reached; all-time only), 2-0 and
  0-2 median-era weeks; Player milestones: 60-point club, 1,000-point club (player-season for
  one manager), 40-point playoff performances; the same three by PLAYER in Players & Lineups
  → Milestones (playerCounts(), with managerRows for the Manager filter). New Awards category
  (from awards.js/draft.js banners): manager awards won (GM, Draft of the Year, Steal),
  winners/All-Stars/All-Fantasy rostered, player All-Fantasy/All-Star/individual awards.
- `assets/frontoffice.js`: trades/waivers/drafts valued by locked points ("stints").
- `assets/standings.js`: Legacy score + standings table + final finishes.
- `assets/power.js`: Power Rankings. Preseason edition (owner, Oct 2026; week=0 in the URL):
  LINEUP 60% (best lineup from current roster: PG,SG,G,SF,PF,F,C,UTIL,UTIL, Sleeper season
  per-game projections api.sleeper.com/projections/nba/{season}?season_type=regular under
  league scoring; taxi/IR/Out excluded; pts/week = per-game sum scaled by calibrate() so the
  average team = last season's real average weekly score, owner's choice), DEPTH 10% (next 4), LAST YR
  20% (last finish), SCHED 10% (opponents' LINEUP). build-data saves DATA.preseason[season]
  nightly until week 1 is played, then update.mjs carries it over unchanged. Default edition
  while a season has no games; Home's Power card uses it too; Week 1 arrows = vs preseason.
  No preseason editions for 2023-2025 (no saved projections). Oct 21 2026: a mid-week run rebuilt the 2026
  edition from Sleeper's in-season feed (last box scores, no gp: SGA 52/game), which changed the hype scores and
  the week 1 Main event (jimmy-bigtrey 77 over tzola-burk 59). Fixed: build-data only rebuilds when the feed
  is real projections (rows with gp >= 1 are half or more; same test as dynasty.js seasonFeedOk), else keeps
  the saved edition; scripts/preseason-fix.json = the edition saved Oct 20 5:56 PM CT (before tip-off), merged
  over last night's by update.mjs (verified: slate back to tzola-burk 59, jimmy-bigtrey 47, logan-simeon 34,
  TRT3-BenDover 30). `assets/freeze.js`: frozen seasons + week guard.
- `assets/hype.js`: Matchup Hype (hype score, Main event, labels, moments). TUNING (owner chose
  "V5", Oct 2026, so 100 is reachable): Quality relative to that week's league (top-2 pair =
  100, average pair = 50), Closeness free within 2 Power pts then -3.5/pt, History x1.5
  (capped). 2025 final went 81 -> 91. League rivalries (RIVALRIES + RIVALRIES_FROM in config.js,
  owner IDs; owner chose 2026+ only, earlier seasons untouched): "Rivalry" tag (red) and
  +25 History after the boost, capped (= up to +5 hype); a regular week where every game is
  a rivalry gets a "Rivalry Week" banner (2026: weeks 7, 14, 21). Public "How hype works"
  lists the rivalries (owner made them public Oct 2026). Named rivalries (owner, Oct 2026): RIVALRIES
  entries are [a, b, name] (major: The Finals Fallout jimmy-tzola, The Crown Clash burk-TRT3, The Never
  Ending Negotiation logan-bigtrey, The Race to Relevance simeon-BenDover) + MINOR_RIVALRIES (Battle of
  Brothers TRT3-bigtrey and simeon-jimmy, Culture Clash TRT3-logan); RIVALRY_BONUS {major 10, minor 5}
  added straight to hype (capped 100; replaced the old +25 History boost); isRivalry() returns
  { name, level, bonus }; tag text = rivalry name (major red, minor gold); hype meter shows a bonus
  line; Rivalry Week = every game a MAJOR rivalry. Rivalry page: named-rivalry chips (.rv-named) +
  name banner on the fight card (.rv-title). TRAVELING TROPHIES (owner, Oct 2026): each MAJOR rivalry
  has a trophy (RIVALRIES[i][3] = assets/trophies/<slug>.webp, cut from the owner's image with real
  alpha). seasonSeries(DATA, season, A, B, beforeWeek) in hype.js: R + P (bracket) meetings that
  season (X consolation games excluded), wins, then most points in those games if level (2-2 after a
  playoff meeting, or a tie game); clinched when lead > games left (unplayed scheduled meetings + 1
  possible playoff meeting until one is out: mathematically eliminated (eliminatedBy() = commish
  playoffPicture at the last regular week played, cached), not in the bracket, or lost a P game; level
  on wins with nothing left = decided on points right away); trophyHistory(): holder = latest season
  winner incl. a clinched current season, else vacant ("first awarded this season"). UI: Rivalry page
  "Trophy case" (all 4, trophyCase()) + Minor rivalries chips + trophy in the fight-card banner +
  "The traveling trophy" card (trophyDetail: holder, series, games, still to play, past winners,
  rules); Hype page "Playing for" card (trophyStake, series before that week); Home "Rivalry trophies"
  card (trophyCase(true)) + a trophy line on the Main event card. Starting strength (owner, Oct 2026): before
  PEDIGREE_WEEKS (6) are played, strengthsBefore() blends the real Power score with the PRESEASON
  Power Rankings (preseasonPower(), DATA.preseason) instead of last season's finish, so offseason
  trades/rookies count from week 1; seasons without a saved preseason (2023-2025) still use the
  finish (unchanged). 2026 week 1 Main event went jimmycooks2-bigtrey (71) -> tzola-bigdaddyburk (58).
  Uses only games
  before the week. The page (app.js) fetches Sleeper state + live scores in the browser and
  reveals a week only once it's under way, except week 1, which shows as soon as the season's
  schedule is saved (owner, Oct 2026: every season; HYPE_NOW.pre = preseason, labeled "Opening
  week", no live refresh before tip-off). Live scores
  refresh every minute while the page is open (Home's Main event card too). LOCKED POINTS (owner, Oct 20
  2026): Sleeper's matchup score counts every starter's latest game, locked or not, so every live score
  (Hype duel + lead line + slate, Home Main event, Scouting report, Briefing) shows LOCKED points big and
  Sleeper's live total small ("Live N"). liveWeek() returns { scores, locked, pairs }; locked = gm.js
  lockedPoints(): a starter counts when his counted score is an earlier game than his latest (coach rule),
  he has no games left this week (schedule status 'complete' or past date), or "I locked him" was marked in
  this browser; null on failure -> pages fall back to the live total. Wager tracker still uses live totals.
  PULL TO REFRESH (owner, Oct 2026): pullToRefresh() in app.js, touch screens only, from the very top of
  any page: arrow follows the finger (.ptr in styles.css), spins past 64px, release = location.reload();
  sideways swipes never start it; html.ptr-on sets overscroll-behavior-y: contain. The nightly
  Action stays once a day (GitHub won't run more often than every 5 min and runs late).
- `assets/transactions.js`: Transactions page data (move kinds, Ledger totals); values come
  from frontoffice.js (trades/pickups/letGo carry `tx` = index into DATA.transactions).
  Players carry `t` = current NBA team (added Oct 2026; older data files lack it). Trade rows
  are links to #/rivalry?a=&b=&trade=<DATA.transactions index> (first two teams of a 3-team
  deal); the Rivalry trade card has id tr-<tx> and is scrolled to and highlighted.
- `assets/awards.js`: Awards page: season banners + GM of the Year (rules decided with the
  owner: moves made that season, locked points that season incl. playoffs, trade net like
  the Value Desk, pickups/drops count only if the player started 3+ weeks, rookies count,
  playoff teams only). Player of the Year = most locked points that season (all teams,
  playoffs incl.). League MVP = most fantasy points over the whole NBA regular season
  under that season's league scoring (DATA.mvp: top 10 per season, built nightly from
  Sleeper's /stats/nba/regular/{season}; team rows "TEAM_*" skipped). Not tied to the
  playoffs (the owner confirmed). Championship MVP = winning team's top locked scorer in
  the title game (winning team only). All-Stars = top 5 G (PG/SG), F (SF/PF), C by total
  fantasy points through the last game before the NBA All-Star Game (DATA.allStars,
  built by allStarPool in build-data.js from per-game box scores
  api.sleeper.com/stats/nba/{season}/{week}; computed once per season, then carried over
  by update.mjs; weekly aggregate endpoints are WRONG: they hold only the last game).
  Positions are Sleeper's current ones saved at computation time; ALL_STAR_POSITIONS in
  corrections.js overrides by season + name. All-Stars start in 2025 (ALL_STARS_FROM in
  config.js); the owner confirmed the 2025 list. All-Fantasy Team = top 10 of DATA.mvp (now top 60 kept) whose fantasy team at season's
  end made the playoffs (rulebook rule 4.3, owner chose to fix the site, Oct 2026); League
  MVP has no playoff rule. AWARD_SCORING (config.js) {2023: 2024}: 2023-24 award totals (MVP,
  All-Fantasy, ROY, All-Rookie, Commish Award races) use 2024-25 scoring (1/pt; 2023 league
  used 0.5/pt), because the owner already handed out awards that way (Brunson, not Fox).
  DATA.rookiesScoring records the scoring each saved rookie list used; update.mjs passes it
  back, and a list is redone only when that differs (once after a scoring change). Draft Kit stats
  keep each season's own scoring.
  Rookie of the Year / All-Rookie Team (top 5) = DATA.rookies: total fantasy points, rookie =
  NBA games that season and none in the 10 seasons before (Sleeper's years_exp is wrong for
  some players, e.g. Amen Thompson, Yabusele); computed once per completed season, carried
  over by update.mjs. Ties at a team's cutoff are all included. Award order on banners:
  01 GM, 02 Player of the Year, 03 League MVP, 04 Rookie of the Year, 05 All-Stars,
  06 All-Fantasy, 07 All-Rookie, 08 Draft of the Year (draftOfYear in draft.js: best class
  grade from that season's rookie draft judged on year one only, data filtered to seasons/
  drafts/draftStats <= that season so the banner never changes), 09 Steal of the Draft (own
  award since Oct 2026: that draft's pick furthest above its spot after year one, race = top 3;
  08 and 09 carry a "Year-one numbers" tag and a "Today:" line with the live Draft Grades
  numbers when they differ (owner chose to keep year-one banners, Oct 2026);
  startup-only seasons say so). Record Book draft records are locked-points based and
  were renamed "(locked points)" with a note pointing to Draft Grades (owner chose to keep
  both views). Awards lists show position only (Sleeper's NBA team is
  today's) plus the FANTASY team that had the player: season's end for season-long
  awards, the All-Star break week (allStars[s].week; Sleeper fantasy weeks = NBA stats
  weeks) for All-Stars, most-points team for Player of the Year. From awards.js ownerAt()
  over frontoffice `stints`. Coach of the Year on
  hold. frontoffice values carry `weeks` ({k: season*100+week, p}) for season-limited sums.
- `assets/draft.js` + Draft Kit in app.js (#/draft-history, #/future-drafts, #/draft-grades:
  one page with 3 tabs). History: board per draft (2023 startup = 22-round snake, shown but
  with NO tier colors at all (owner, Oct 2026: plain .dk-plain squares, no legend, hover card =
  production only; rookie boards keep colors), and
  never graded; rookie drafts 3 rounds, linear), rows = rounds, columns = draft slot, cells
  colored Steal/Hit/Fair/Miss/Bust (Barely played = light red), Rookie of the Year badge
  ("ROY '25", = DATA.rookies[season][0], also on the Grades pick list), tap -> Player Index;
  mouse hover card (bindTips, only when (hover: hover), so phone taps still open the player)
  shows produced vs expected pts/game and the tier. ?manager= highlight fades other managers'
  picks (dropdown kept across season chips). Rookie boards also render a flipped table
  (.dk-board-phone: rounds across, picks down) shown under 700px instead of the wide one;
  the startup board keeps one layout everywhere. Report cards: "See every pick" lists each class
  (pickRow, shared with Every pick); #/draft-grades?view=cards&manager=ID opens that card. Future: next 3 drafts from
  Sleeper traded_picks (live in browser) via commish pickLedger(); "Own" or holder; trade
  paths; picks held; projected next-draft order = reverse regular-season standings (win %,
  then PF, median games incl.), bottom 2 coin-flip for #1 (shown "1-2"); verified against
  the real 2025 and 2026 drafts. Grades (rules from the owner): pick value = NBA fantasy
  pts PER GAME since the draft under each season's league scoring, whoever rostered him
  (DATA.draftStats: season -> pid -> [pts, games], built nightly). Injury rule (owner,
  Oct 2026): only seasons with 20+ games (MIN_GAMES) count; a pick with none = "Barely
  played" (once a quarter of his first season is done; before that "Incomplete"), never a
  bust. Sleeper can't tell injury from benching, so both are skipped. Expected = least-
  squares a + b*ln(overall pick) per kind (rookie/startup), b <= 0; z = (value - expected)/sd;
  class grade from sum of z (letterFor thresholds); report card = GPA of class grades.
  2024 picks 5 and 11 were filed by Sleeper under "DUPLICATE" entries; fixed site-wide
  with DRAFT_CORRECTIONS (Matas Buzelis 2835, Ronald Holland 2836). Tested: no change to
  any Front Office value, record top 5 or GM of the Year, only the pick-11 name.
- `assets/players.js`: Player Index (#/players, under Hall of Fame): every player's locked
  points with season/manager filters, sort (points, weeks, per start: 5+ starts first),
  search (accent-insensitive), and a breakdown by fantasy team and by season.
- `assets/commish.js`: Commissioner's office (#/commish, lock button under the menu, not in
  NAV). Header button "Run nightly update" opens GitHub's workflow page (owner taps Run
  workflow; no token is stored, the repo is public). Passcode asked every time the office is opened (flag also in sessionStorage cm-open so a reload or pull to refresh inside the office stays unlocked, owner Oct 2026; cleared when leaving the route or closing the app); only its
  SHA-256 is stored (the owner knows the code; never write it in files). Scouting report
  (default team bigdaddyburk = Parma John Wall; any team selectable) uses live Sleeper data
  in the browser: rosters, /schedule/nba/regular/{season}, per-game projections
  /projections/nba/{season}/{week}, season stats, matchups. LEAGUE IS LOCK-IN SCORING: each
  starter counts ONE game per week (locked by the manager, else his last game), verified
  against box scores. Projection = per-game proj x lock factor (1g 1.00, 2g 1.11, 3g 1.23,
  4+ 1.25) x 1.08 calibration; backtest 2024-25: ~27 pt avg miss, picks winner 72%.
  Playoff picture tab: playoffPicture() clinch/elimination math (6 teams, top 2 byes,
  QF 3v6 and 4v5, verified against 2025's real bracket), magic numbers, season/week pickers.
  Weekly recap tab: weeklyRecap() plain text + copy button. Health report also has a taxi
  limit check. LEAGUE TAXI RULE (from the owner): a player may stay on taxi until he
  completes his 3rd NBA season (TAXI_SEASONS = 3 in commish.js). This matches Sleeper's own setting
  (owner's screenshot, Oct 2026: "2 Years: players with more than 2 years of experience in the NBA must
  be activated from the Taxi Squad"; rule 2.1 now quotes it). Flagged once he played 3 NBA seasons before this one,
  counted from real games. Taxi SIZE check (owner, Oct 2026): TAXI_SIZE = 15 in commish.js
  (rule 2.3), "Taxi squad size" card lists every team's count, flags any over 15.
  TAXI LOG (owner, Oct 2026, after the Adem Bona inquiry; Sleeper keeps no taxi history and matchup
  "players" include taxi): update.mjs saves data/taxi-log.json { since, at, last: { owner: [pid] },
  events: [{ at, owner, pid, name, move: on | up (activated) | out (left roster while on taxi) }] } on
  every run (last 1000 events); Health report "Taxi moves" card (newest 25).
  Rule 9 Wager Weeks (rules.js, 2026-27 only, weeks 8-14): lowest score funds a $5 parlay, max 2
  times per manager, then next-lowest manager not at the limit (owner's wording made official).
  Tabs: Scouting report, Waiver wire (unrostered players with an NBA team, Out hidden:
  risers = last-14-day FP/G vs season, Sleeper trending adds 48h, best available,
  streamers by projected locked pts), Draft picks (future rookie picks from
  /league/{id}/traded_picks + trade paths from DATA.transactions; next 3 drafts), Award races (season picker; live season totals + rookies from
  Sleeper via seasonTotals(); every award in banner order 01-09 + Championship MVP; finished
  seasons match the Awards page), Early hype (unrevealed
  regular weeks' hypeSlate, default = next week to be revealed; views (owner, Oct 2026): Summary /
  Hype page = renderHype(box, params, previewWeek) / Home = renderHome(box, previewWeek): the real pages
  as that week will look (now.week = preview, live labels, no live scores, "Tip-off pending", links stay in
  #/commish?tab=hype&view=page&week=&m=; other Home cards show today), Health report.
  Health report: GitHub runs, scoring-check.txt, week-guard.json, warnings, corrections,
  lineup check, activity (flag >21 days in season), trade review (750+ net, 4+ trades/pair).
- `assets/gm.js` + "My GM" tabs in the commish office (Assistant GM, owner's plan Oct 2026).
  The commish tab bar has two groups: My GM (Briefing = default tab, Lock-in coach) and League
  office (the 8 older tabs; Scouting now needs ?tab=scout). Every GM tab has a team picker
  (default COMMISH). Planned next, in order (owner agreed): dynasty value model (3 seasons,
  this one weighted most) -> Dynasty + Managers tabs, Trade finder (Sleeper's trade block is NOT
  in the public API; owner keeps his own block in localStorage), Playoff odds INSIDE the Playoff
  picture tab (Monte Carlo + "root for"), Draft helper last (before the 2027 rookie draft).
  Lock-in coach MATCHUP BOARD (owner's sketch, Oct 2026): top card shows both CURRENT starting 9s
  across from each other (you left, opponent right, slot in the middle; .mb-* in styles.css), team
  header "locked points (starters left to lock)", score boxes next to the slot (locked = navy, live =
  orange, unlocked score = outlined, none = dash), then Bench and IR sections (both teams, no
  scores); phones show "D. Fox" names. Every player (both teams, starters/bench/IR) taps open his
  card below the row (.mb-detail, open keys kept in MB_OPEN across refreshes): starters = the lock
  card (opponent's without "I locked him"), bench/IR = week's games + what he could still add. The
  separate call-card grid is gone. Each player shows a dynasty tier tag (coachDynasty(), injured at
  FULL value always, owner's choice); under each team score a small "if locked now" line = locked +
  every unlocked lock/wait score (live games not included), (left minus those players), injury tag, and a green "Today vs X" chip + green edge
  (.mb-on) when his team plays today; bench/IR players with no games left (future or today
  pre-game) are red + struck through (.mb-gone).
  Lock-in coach: optimal stopping per starter. One game ~ normal(mu = Sleeper per-game projection
  over games it projects > 0 (loadWeek perPlay) x LOCK_CAL 1.04, sd = 0.30 mu); lock bar with k
  games left: V1 = mu, Vk = E[max(X, V(k-1))]; risk Safe/Balanced/Bold shifts bars -0.25/0/+0.25 sd
  (owner chose Balanced default; saved in localStorage gm-risk). Backtest 2025-26, all starts:
  coach 65,348 vs managers' real 62,199 (last game 53,052, hindsight 68,250); bigdaddyburk 8,707 vs
  8,402, flips weeks 6 and 18 losses + week 12 tie to wins. Sleeper's public API doesn't show
  locks: players_points = score counting now; if it differs from his latest game and equals an
  earlier one, he's locked; else the "I locked him" button (localStorage gm-locks-{season}-{week}).
  Marks are per player and count for EVERY team (owner, Oct 2026): gameCoach passes them to all teams,
  so marking an opponent's player (pick his team, or "They locked him" on the opponent's card on your
  board) shows in your board, odds, Briefing and live locked points; marking clears the LIVE cache.
  Box scores per game from /stats/nba/{season}/{week}. Assumes a DNP doesn't replace the counted
  score (not verified yet: check in week 1 of 2026, along with the schedule's in-game status name).
  Modes (localStorage gm-mode, was gm-risk): "Play to win" (Beta; was the default until Oct 20, 2026, see SLOT PLANNER),
  plus Safe/Balanced/Bold points modes. gameCoach(): builds every team's lockCoach rows -> sim
  states (simState: {fixed} or {cur,k,mu,sd}); winChance() plays out the week (seeded RNG, 3,000
  runs, other unsettled players follow Balanced bars; opponents' locks inferred the same way);
  for each unlocked score compares lock vs keep playing on P(H2H win) + P(beat median) (owner's
  goal: both), diff < 1% -> keep the points call. Backtest 2025-26 regular season vs opponents'
  real scores (H2H+median wins, 168 team-weeks): managers 167, Balanced 195, Play to win 196-201
  over 4 runs (~199): small but never worse. Bench swaps (owner's Sleeper rules): a bench player
  earns only games AFTER he's moved in; locked starters can't be moved; a benched starter's score
  is lost. Swap if bench worth (Balanced value of his future games) beats the starter's keep value
  (settled score, or max(current, bars[k])) by 3+, slot eligibility via fantasy_positions
  (teamRoster `elig`), top 3, each with win chance before -> after. Opponents (owner, Oct 2026): every
  team but yours is simulated with bestLineup() = its best healthy lineup from now on (locked /
  in-progress starters stay; Out/IR/Suspension/Inactive/Doubtful starters keep only their current
  score; healthy bench players with games left fill slots they fit; greedy by value, pickiest slot
  first). Your lineup stays as set. SCORE_CAL (owner asked why Briefing ≠ Scouting, Oct 2026): the
  sim draws games around 1.082 x projection (the measured average game) while lock bars keep
  LOCK_CAL 1.04 (gameDist: mu/sd for draws, barMu/barSd for bars); before, scores ran ~6% low.
  Scouting report also shows the opponent's "Best lineup" projection (bestLineup() players scored
  with the report's projNow) + a note naming who moves in/out; now within ~3% of the Briefing.
  Coach shows "Their best lineup" (From bench tags + assumed-out
  list); Briefing odds/expected finals use the same.
  SLOT PLANNER (owner, Oct 2026; replaced per-starter bars, winChance and the greedy bestLineup in
  gameCoach): every team's roster is planned against the 9 slots. teamPlan() -> pieces (starters +
  healthy bench; games = schedule minus dates Sleeper projects at 0 = loadWeek missDates; no games
  left -> fixed, movable) -> makePlan(): plan.now = bestFit() (Hungarian, max total value, slot
  eligibility via fits/SLOT_FITS), plan.T = lockBar() per piece per game day, nowLock. lockBar(plan,
  pi, d): keep = best fit with him valued at his own W (Balanced value of his games left); lock
  value = his score + best fit of the others in the other slots; bar = keep - best rest (= own bar
  when nobody competes; better players with games left raise it; drops as they run out). Lock slot
  = best rest, ties -> fewest other players fit it, pickier slot, current slot. Text names the slot
  (+ "move him there", who shifts, "keep G open for X" when X still has games) and the rival
  (bumped). simTeam(): day by day, bench players who play today move in for the weakest starter they
  can replace (bitmask feasibility; a benched score is lost), locks at plan.T; same luck per piece
  index across versions (CRN). gameCoach: 2,000 runs, all 8 teams with the same planner (owner: assume
  opponents play smart), Play to win compares planWith(lockSlot) vs planWith(playOn); asSet = your
  starters only. lineupMoves(): swaps (bench +3 hysteresis, "before {first game}", "X plays Mon
  first: lock only at T+") + slot moves; swapList shows odds as set vs following the coach.
  ~0.6 s desktop mid-week. BACKTEST (Oct 2026, _bt harness, deleted; notes in the session notes
  folder): managers' FINAL starters carry hindsight (in-week 0.965 vs bench 0.83 of 1.082 x proj;
  labelled from the week before: 0.91 vs 0.90), so the old method (fixed final lineups) favors never
  moving; there old Balanced 198, new 185. Fair method (lineup picked from projections at week
  start), H2H+median wins of 336: old Balanced 168 / 57,721 pts, own bars + moves 178, new 176 /
  58,681; with idle slots filled day by day (bench player who plays today into a starter's slot
  with nothing at stake): own bars 178 / 58,899, NEW 185 / 59,178. Play to win BELOW Balanced in
  every version (old 166 vs 168, new 176 vs 185): the sim expects other teams ~22/week above their
  real scores (360 vs 336: SCORE_CAL fitted on hindsight lineups, real managers lock worse);
  scaled down 0.935-0.96 it reaches 182-184. Owner (Oct 20, 2026): Balanced is now the DEFAULT
  (localStorage key moved gm-risk -> gm-mode so old saved choices reset) and Play to win carries a
  "Beta" tag (.gm-beta) until it is recalibrated.
  Briefing: lock calls, this week (gameCoach's expected finals + win/median chances), lineup tips
  (swaps), tonight's games, injury news (localStorage gm-inj-{owner}, rolls over daily), top 3
  waiver risers.
  scoutWeek().started is false in preseason (HYPE_NOW.pre), fixed Oct 2026.
  STEP 2 (built Oct 2026): `assets/dynasty.js` dynasty values (owner: weights 50/30/20, 0-100 score,
  blunt Managers tone). Per player: v1 = Sleeper season per-game projection (league scoring;
  Out = x0.5; no projection -> last season 10+ gp), v2/v3 = AGE_CURVE (fitted 2015-2025, 3,017
  player pairs, centered; beat flat on 2019-23 checks). worth = E[max(0, raw - floor)] with
  uncertainty 4 (6 if age <= 22), floor = waiver line = mean FULL-HEALTH raw of the 158th-177th best
  players with an NBA team (FLOOR_BAND; owner Oct 2026: the old 5th-best free agent flipped scores by
  a point on every pickup/drop/injury; a 3rd-8th FA average was tested and was WORSE, 0.4 swings);
  roster moves and Out listings never move it; set to match the old line (20.1). One-time rebuild
  (update.mjs hist.floorV2): this season's nights via rebuildSeasonDays() (rosters rolled back through
  transactions after each day's end, that night's saved projections unless only rounding differs, saved
  Out flags; nights without saved projections shifted by the first rebuilt night's change) + last
  season's weekly rebuild re-run (backfill now keeps every earlier-projected player, at his last value);
  score = 100 x worth / top. Injury
  toggle (owner, Oct 2026): dynastyValues(DATA, f, { fullInjured }) from localStorage gm-dyn-full
  ("Injured: discounted / full value" on the Dynasty tab; applies to Dynasty, Trade finder, Managers,
  Waiver wire). Discount = Out players' v1 x0.5 (p.outCut); above-floor scoring makes it big for
  mid-level players (Ingram 35 -> 11). Rows say "listed Out: this season at half / full value";
  trend arrow compares v3 with the undiscounted v1. Score history (owner, Oct 2026): update.mjs saves
  data/dynasty-history.json nightly ({ days: { date: { pid: score | [score, fullValueScore] } } },
  rostered or score > 0, ~3 KB/night; in try/catch so it never breaks the run); tapping a Dynasty
  roster row (.dy-row) opens an SVG line chart (bindScoreCharts: nightly points + today live, tier
  lines, high/low summary). Backfill (owner chose option 2, Oct 2026): backfillSeason() in dynasty.js
  rebuilds the last finished season's regular weeks once (update.mjs, hist.backfilled; only marked
  done with 10+ weeks): per week, rosters from matchups, "this season" = running blend of that
  week's per-game projections (BACKFILL_SMOOTH 0.3; avg weekly move ~2 pts), no projection that
  week = last known value + treated as Out; dated the week's last day. Chart is one panel per NBA
  season (seasonOfDate: Aug+ = that year; scoreSeasons/bindSeasonStrip): scroll-snap strip, swipe on
  touch (hint + dots), ‹ › arrows only with a mouse (hover:hover), opens on the current season,
  same y-range across a player's seasons. Risers & fallers card (owner, Oct 2026; fillMovers): biggest
  score changes per season from the history (past season: first -> last saved point; current season:
  first saved point, or 30/7 days back, -> today's live scores), League / My team, top 10 each way,
  missing day = 0, team shown = current holder, follows the injury toggle. Same-day check vs the
  season-long method: avg 3 pts apart (median 2, 90th pct 8), no bias. Chart: offseason drawn as a
  short dashed gap, years on old dates. Scale fix: 100 = most valuable player at FULL health
  (healthy() in dynastyValues), so a star listed Out no longer shifts everyone. Picks:
  Draft Grades rookie curve expect(no) +- curve sd, x hit rate, valued as a 20-year-old, x0.9 per
  year away; unknown slot = round average (avg 1st ~12). Ages: DATA.birth (build-data saves birth
  dates for rostered + used players; fallback /v1/players/nba in the browser). Transactions now
  keep `bid` (waiver_bid) when Sleeper has it. Dynasty tab: outlook (label from now/2-yr ranks,
  meter), league map SVG (labels avoid dots/labels) + table, roster by score with 2-season
  trend, taxi clock (taxiLeft from NBA seasons in the last 3), picks. Managers tab: per manager
  trades (Front Office net, partners, net with you), waiver/FA adds (+FAAB), draft report card,
  positions, draft age, dynasty ranks, H2H vs you (all games), last move, blunt summary
  (inactivity line in season only). Prospect grade (owner asked, for low-score young guys):
  players <= 24 get chances in 3 seasons of rotation (top 120), starter (top 72), star (top 24),
  logistic fits on x = (ppg carried 3 yrs on AGE_CURVE) / last season's 72nd-best ppg, 1,777
  NBA players <= 24 with 20+ gp 2012-2022 (busts out of the NBA count as misses; TEAM_ rows in
  Sleeper stats must be skipped), holdout 2019-22 calibrated. Grade A+..F (GRADES in dynasty.js);
  shown as chips in the roster + taxi clock and a Prospects card. Every player now has p.chances
  (rotation/starter/star in 3 seasons; <= 24 = the prospect fit, 25+ = VET_*_FIT in dynasty.js,
  fitted on 2,453 vet seasons 2013-2022 with a max(0, age-33) term, ridge on it; calibrated by age
  group incl. 36+), shown as an "In 3 seasons" line on every Roster by dynasty score row. Roster
  filters (owner, Oct 2026): All/Guards/Forwards/Centers by main Sleeper position (p.pos: PG/SG/G = G,
  SF/PF/F = F, C), plus players whose fantasy_positions (p.fpos) include that group, marked
  "secondary position: guard"; "Hide taxi" checkbox; both client-side, saved in localStorage
  gm-dyn-pos / gm-dyn-hidetaxi; "Include secondary positions" toggle (gm-dyn-sec, default on). Weekly
  moves (owner, Oct 2026): fillWeekArrows() puts ▲N/▼N (.dy-wk) by each roster score = live score minus
  the newest saved night >= 7 days back (or the season's first night) + a team line (#dy-week: up,
  down, net). Prospect grade changes card (#dy-grades, fillGradeLog): update.mjs saves hist.grades
  { pid: [[date, grade]] } only when a saved player's grade changes. TOP 100 PROSPECTS (owner, Oct
  2026): My GM tab "prospects" (renderProspects): prospectRanking(v) in dynasty.js = every graded player
  (<= 24, rostered or FA with an NBA team) by grade (A+ first), then star %, starter %, rotation %;
  "Grade changes" card on top (league-wide, newest first, 12 + "N more"; hist.grades now covers EVERY
  graded player incl. free agents; rebuilt once from hist.proj back to Oct 14 (hist.gradesBackfilled),
  a night grading the same as today's ROUNDED projection counts as today's grade so 0.1 rounding on a
  grade line (Dominick Barlow, 12.0% rotation) isn't a fake change; prospectFor() in dynasty.js);
  filters All / On rosters / Free agents / My team; ▲N/▼N/NEW vs the saved order ~7 days back
  (update.mjs hist.prospectRanks[date] = top-100 pids, last 21 nights) + risers/fallers line; rows open
  the score chart. Dynasty Prospects card and every Waiver wire list show #rank chips (.pr-chip; waiver
  chips link to the list's Free agents filter); both prospect cards are sorted the same way. Waiver wire tab (owner asked)
  also loads dynasty values: "Dynasty pickups" (unrostered with an NBA team, by 3-season raw,
  Out included) and "Prospects on the wire" (unrostered <= 24 by chances), plus grade chips +
  "dynasty N" on every waiver row (prospectChip shared). Waiver rows (owner, Oct 2026) also show
  every position (posText), age, trend and the "In 3 seasons" chances line like the roster; position
  chips include secondary-position players (marked, shared posGroups/POS_WORD helpers); Top 10 / Top 30
  switch (?n=30) for every list; every waiver row with a dynasty value opens the score chart
  (bindScoreCharts, same as the roster). Projection smoothing (owner, Oct 2026, after Rui Hachimura
  went 2 -> 21 overnight on a Sleeper projection refresh): TURNED OFF by the owner Oct 14 (role was
  real; smoothing only delays news): PROJ_SMOOTH = 1 (0.25/day turns it back on) in dynasty.js
  (smoothProjections); update.mjs saves data/dynasty-proj.json { states: [{ date, pg }] } (last 3,
  Chicago dates); pages load it (loadDynastyFeeds in app.js) and step once from the newest state
  before today, so page = nightly. p.projRaw/projUsed -> "catching up" note (projNote). Backfill
  (f.projPg) is not affected. Projection log (owner, Oct 2026): every update.mjs run compares Sleeper's
  raw season per-game projections (v.projRaw) with the last run's -> data/projection-log.json { last:
  { at, pg }, runs: [{ at, stamp (Sleeper max updated_at), total, changed (>= 0.05), added, removed,
  avg, movers: [pid, name, from, to] top 10 }] } (last 500 runs); Health report card "Projection
  updates" (projectionLogCard). Sleeper stamps ~all rows in one daily batch (~6:50 AM CT seen), so
  the stamp alone doesn't mean numbers changed. Chart explanations (owner, Oct 2026): update.mjs also
  saves hist.proj[date] = { pid: projUsed } (players in that day) and hist.league[date] = { floor, top }
  (historyExtra in dynasty.js); last season redone once more for them (hist.projBackfilled; the rebuild
  reproduced all 21 saved weeks exactly). Score chart: tap a dot -> .sc-info line (scoreInfo/scoreWhy:
  score, projection, Out, waiver line + cause of the change since the point before: projection, Out
  status, waiver line, top value >= 1%); ▲▼ (.sc-mk) where the projection moved 0.5+. Projections
  are Rotowire stat lines (one average game, gp = 1) scored with league settings (bonuses/techs not
  projected); last season's = blend of weekly projections. Role test (owner asked, Oct 2026): adding
  per-minute production (per 36, overall or bench-only <20 mpg) or minutes trend to the prospect
  model did NOT help on the 2019-22 holdout (log loss / AUC equal or worse, also for low-minute
  players), so the per-game model stays. Managers tab also has "Startup draft: still on the team"
  (owner asked): each manager's own 2023 startup picks (p.o = who made the pick) on his live roster
  today incl. taxi/IR, %, league total, tap for kept (+ "came back" if he ever dropped/traded him)
  and gone (current holder or not on a roster); also a "Startup picks" line on each card.
  STEP 3 Trade finder (built Oct 2026, My GM tab "trades"; logic assets/tradefinder.js): modes
  get a player / fill a need (G/F/C: other teams' players better this season than your weakest
  starter there) / sell a player. Package value = (sum score^1.6)^(1/1.6) (two 30s ~ 46), +5% per
  extra player a side must take on; windows give 95-120% (get), take 90-115% (sell); partner must
  not lose more than 2 on THEIR timeline (VIEWS in dynasty.js: now 70/20/10 for Contender/Win now,
  later 20/30/50 for Rising/Rebuilding, else standard); up to 3 pieces from each side's top 28.
  "Why they'd say yes": fairness, their timeline gain, thin/deep positions, picks for builders,
  prospects, trade history, roster spots. Trade block in localStorage gm-block-{owner} (+15 rank
  per block player). Need offers sorted by your-timeline gain; sell shows each team's best first.
  Trade finder filters (owner, Oct 2026): ?picks=no ("Keep my picks", Get a player + Fill a need)
  = no picks on your side; Fill a need ?tier=i (SCORE_TIERS index, Replaceable excluded) targets
  that score band from every rostered player (c.allAssets) and drops the beat-your-weakest-starter
  rule ("+N a game" shown only when > 0). Get a player's list = all rostered players too. Headliner
  rule CENTERPIECE in tradefinder.js: target 90+ needs one given piece >= 70% of it, 70+ >= 60%,
  50+ >= 45% (so 3 high-end starters can't buy Jokic). Every offer card has "Open in Evaluate a
  trade" (writes gm-eval {n:2, teams, legs} and switches to mode=eval).
  Trade evaluator (owner, Oct 2026): Trade finder mode "eval" (renderEvaluator in app.js, logic
  evaluateTrade in tradefinder.js): 2 or 3 teams, each team's outgoing players/picks (teamAssets with
  { all: true }; 3 teams = pick the destination per asset), draft saved in localStorage gm-eval.
  Per team: gives/gets package value, net (standard + own timeline), verdict (within 10% = about
  even), before -> after via teamOutlook() (now moved out of dynastyValues, shared): this-season /
  2-yr / total ranks + best-9 sums, outlook label, value-weighted age, G/F/C strength vs league avg
  (=100), roster size change, taxi vs 15. League table of every team's ranks before -> after, past
  trades between the teams + Front Office net. Position strength (owner): positionStrength(v, rosters,
  when) in tradefinder.js (shared by the evaluator) = best 3 G / 3 F / 2 C per-game (now: v[0], taxi
  out; later: v[2], taxi in) / league avg; Dynasty tab card (drawPositions): all teams, This season /
  In 2 years, >=110 green, <=90 red, plus "who counts" for the viewed team; small numbers under each
  score = players whose MAIN position is in that group (positionStrength().count = { active, ir, taxi }):
  active, IR in red (.pos-ir), (taxi) in parentheses; same in both views; who counts says "8 active ·
  1 on IR · 6 on taxi" (owner, Oct 2026). Team needs (owner):
  teamNeeds() in app.js = positions under 95 now (red chips) or under 90 in 2 yrs (gold), outlook
  shopping style (Proven starters now / Youth + picks / Younger core), Taxi full (15), No {next} 1st;
  shown as a "Needs" row on every Managers card and a Needs column in the Position strength table.
  Guide: dynastyGuide() on the Dynasty tab (#dy-guide, opened/scrolled by ?guide=1, linked from the
  Trade finder): SCORE_TIERS with live counts + examples, arrows, prospect grade, picks, trade math.
  Tier tags (owner asked): tierTag(score) in app.js = SCORE_TIERS short names (Cornerstone, Star,
  High-end starter, Starter, Flex, Depth, Stash, Replaceable; classes .tier-0..7) next to player
  names in the Dynasty roster + taxi clock, Trade finder offers and Waiver wire rows; also on each
  guide row.
  Team tracker (owner, Oct 2026; My GM tab "tracker", every team, default yours): moveImpacts() in
  tradefinder.js rolls rosters + pick owners back through this season's transactions newest first and
  compares each team just before/after a move at TODAY's values (snapshotFor: teamOutlook +
  positionStrength); alerts list with chips (now/2 yrs/total with ranks, age, G/F/C), highlighted when a
  rank changes, a position moves 5+, total 10+ or now 5+; "New" since last view (localStorage
  gm-tracker-seen-{owner}; first visit = last 7 days); no-effect moves collapsed. Drift = 7-day change
  in the team snapshot minus move effects, plus the roster's biggest player-score changes. Charts per
  metric (now, 2 yrs, total, age, G, F, C) vs league average (dashed), season panels (bindSeasonStrip),
  ▲ markers for trades + moves with total 5+. Data: update.mjs saves hist.teams[date][owner] = { c, f }
  (teamSnapshot arrays, TEAM_KEYS; c = Out discounted, f = full) nightly; last season rebuilt weekly once
  via backfillSeason(onWeek) (hist.teamsBackfilled). Briefing shows a "Team tracker" card when there are
  new moves.
  DRAFT SCOUT (owner, Oct 2026; My GM tab "draftscout", replaces the planned step-5 Draft helper):
  `assets/scout.js` (no DOM/Node APIs; runs in the job and in a browser for testing). Built WEEKLY ONLY
  (owner: Sundays, Chicago) by update.mjs, or any run when data/draft-scout.json is missing or its
  version != SCOUT_VERSION (bump it when the build changes) -> data/draft-scout.json (classes, sources,
  raw parsed copies = fallback when a source fails, history = weekly consensus order for ▲▼) +
  data/scout-pool.json (comps pool: drafted college players 2011+ matched to Sleeper ids; first build
  downloads Torvik 2011..; then only new draft years). Next 3 drafts (nextDraftYear: July+ = next year).
  Sources, read as a labeled bot (UA SeisDynastyHoops; NBADraftRoom returned 403 to it, so it's NOT
  used; ESPN blocks too). FROM GITHUB ACTIONS (first live run, Oct 2026): Tankathon + CBS OK, Torvik 403
  and 247Sports 406 (they work from a home PC). So: update.mjs getText tries Node fetch then curl;
  247 -> On3 industry rankings (__NEXT_DATA__ JSON, parseOn3) -> last good copy (prev.raw, else
  scripts/scout-seed.json = HS top lists saved Oct 19 from a home PC); Torvik missing -> Tankathon's
  per-prospect stats (parseTankathon st: per game, per 36, TS%, usage, BPM; value divs carry quality
  classes; assist rate = 0.357 + 5.247 x ast/36, fitted on Torvik) with freshmen weighted by date
  (Nov 5 -> Dec 15); comps pool from scripts/scout-pool.json (seed built at home, POOL_VERSION 2,
  per-36 fields; data/scout-pool.json once saved). One Monday retry when a non-optional source failed
  Sunday. Rebuild seeds from a home PC (browser + a local POST-save helper) if they go stale.
  WEEKLY HISTORY (owner, Oct 2026): draft-scout.json weeks = [{ date (that week's Sunday, weekOf),
  p: { key: [draft year, rank, grade, starter %, star %, rotation %] } }], all weeks kept until the
  player's draft passes; rerun same week replaces. Page: "Grade changes" card per class, and each
  opened prospect draws a weekly chart (scoutSeasons: starter solid, star dashed, grade-letter lines,
  one panel per Aug-Jul season via bindSeasonStrip; follows a player who changes class).
  HOLDOVER CHECK (owner, Oct 2026: Joaquim Boumtje-Boumtje, a reclassified Duke freshman too young for
  2027, was missing from 2028): source "freshmen" = last year's HS class (On3 first: it keeps reclassified
  players in their old class, 247 had him 29 vs On3 4); findHoldovers() = top 25 of it on NO next-draft
  board/mock (sameName: last name + first initial; skipped if boards < 50 rows) -> added to the class
  after next (hsClass extras, holdover {hsClass, from}, "Waiting a year" chip, recruitRank kept; class
  ranks re-sorted by chances). Seeded in scripts/scout-seed.json (raw.freshmen). Health card line.
  Health report has a "Draft Scout" card (scoutHealthCard: build age + next Sunday, each class present,
  every source ok/failed + fallback copy date, stale lists >60 days, Torvik vs Tankathon stats, comps
  pool size, weeks of history).
  Tankathon big board + mock (page title gives the year; after a draft they flip
  to the next year automatically), CBS prospect rankings (top 30), 247Sports composite HS rankings
  (class Y-1 -> draft Y, top 30) for the 2 later classes, Bart Torvik CSV getadvstats.php?year=Y&csv=1
  (no header; column map T in scout.js; before games start the new-season file repeats last season
  without per-game columns: detected by equal gp/minp/usg), Sleeper stats (comps' NBA careers,
  starter line). Consensus = freshness-weighted mean of ln(rank) (missing = list length + 8; mock 0.5).
  Model (fitted Oct 2026 on 618 drafted college players 2011-2023, outcome = 3rd NBA season top
  120/72/24 by FP/G with 20+ gp, same as dynasty.js prospect grade + same GRADES letters):
  DRAFT_FIT logistic on ln(pick) (+ln^2); stats did NOT help the yes/no chances in leave-one-class-out
  CV, but on a continuous outcome (best FP/G in seasons 2-3 / starter line) BPM, assist rate and age
  did (others: size, stl, blk, FT, 3PA, usage, rec rank = nothing beyond slot) -> VALUE_FULL shifts the
  slot (effPick); unknown stats = TYPICAL(x) for the slot, weight gp/12. Chances averaged over slot
  uncertainty (spreadFor months to draft + source disagreement). HS classes: HS_FIT on ln(national
  rank) (1,950 top-150 freshmen). Holdout 2019-23: ~46% starter -> 35% real, slightly optimistic.
  Class strength = lift of the top-24 expected values vs the slot curve minus CLASS_LIFT; history
  says only about +-2% is visible pre-draft (owner told); classStrength() clamps 0.85-1.15 and
  dynasty.js multiplies rookie pick expectations by it (pick.strength, pick.avgScore = without);
  HS classes = 1. Comps: nearest pool players with NBA careers (COMP_KEYS weights, same position
  group), shown with best FP/G season + tier; only for players with 5+ college games (freshmen from
  ~Nov; international/HS none). Traits (green >= 75th pct of recent 1st-rounders, red <= 25th;
  wording TRAIT_WORDS in app.js) are notes only. Page: team picker, year chips (later years
  "early"), your picks (league slot -> "likely there" by expected value), class outlook + sources,
  board (position filter, tap = why/stats/traits/comps, ?p=key opens one), fine print "How Draft
  Scout works" (owner asked). Test locally by serving saved source pages through a getText stub.
  DRAFT NIGHT 2026 (owner, Oct 2026, "Option A"): year chip "2026 draft night" in Draft Scout (DRAFT_NIGHTS
  in app.js; loadDraftNights reads assets/draft-night-{year}.json, a STATIC file the owner uploads, never
  touched by the nightly job). Built once in the browser by scout.js buildDraftNight() (+ parsePastDraft for
  tankathon.com/past-drafts/{year}): collegeClass with one board = the real picks (opts.oneSource: no
  disagreement), today = {year}-06-25 (spread 0.25), Torvik {year} + {year-1} files (downloaded with curl from
  a home PC; Torvik's pick column matched all 54 college picks), comps/traits from pool players drafted
  before {year} with NBA results through {year-1}; Sleeper ids for all 60 (pool + /v1/players/nba, birth
  dates checked); picks verified against Basketball-Reference. Hand-checked: Dybantsa B+ (61/27), Peterson B,
  Boozer A (64/33), Mara C+, Philon D; class 4.7% stronger than average. Page: header (strength, grade
  counts), "Then vs now" (top 5 on draft night vs the live board's top 5 + how grades are holding up: higher/
  same/lower vs today), board by pick (draft-night grade -> today's grade, team, dynasty score, tap: why,
  final college season, traits, comps, "How he's doing now": prospect grade + chances (vets: gradeOf of
  p.chances), score + tier, NBA games/FP per game this season from /stats/nba/{season}, Sleeper projection,
  fantasy team (teamName) or free agent). Live 2027 model and weekly build unchanged. To freeze 2027 next
  June: same steps with a scratch page calling buildDraftNight, add 2027 to DRAFT_NIGHTS.
  FOUND Oct 21 2026: Sleeper's season projections (/projections/nba/2026) came back EMPTY for 55 of the 60
  2026 rookies (they had them the night before, e.g. Dybantsa 26.4), so dynastyValues gives them score 0 and
  no prospect grade everywhere (Dynasty, Trade finder, Prospects); the draft-night page says so per player.
  FIXED Oct 21 2026 (other chat, owner: "major overreactions" on day 2: Paul George 80%+ star, SGA 100,
  Dybantsa 0): once games start, Sleeper's SEASON projection feed becomes each player's LATEST box score with
  no gp (Cade's = his 22/4/8 opener; players who sat have nothing), and dynastyValues divided by gp || 1. Now
  dynasty.js seasonFeedOk(proj) (rows with gp >= 1 are at least half) decides; when false, this season =
  inSeasonProjections(): (PRESEASON projection x PRESEASON_GAMES 10 + actual FP/G this season x games) /
  (10 + games) (actual = games of 10+ min, see below); PRESEASON_GAMES was 15, set to 10 after a test (owner,
  Oct 2026: ~640 players 2023-25 predicting rest-of-season FP/G from the first N games, best 8-10, 15 ~2%
  worse; Rotowire week-1 projections as the prior did no better than last season x age curve); no preseason value -> actual
  with 5+ games, else the average of this + next week's per-game projections (f.weekProj, gp = 1, > 0).
  Frozen preseason = dynasty-proj.json `preseason` { season, at, pg }: update.mjs refreshes it while the feed
  is OK and keeps it fixed after; first run without one = the oldest saved state (preseasonOf()). Weekly
  per-game projections as the MAIN source were tested and rejected (median 0.97 of preseason, 1 in 10 players
  30%+ lower). Result vs the clean Oct 21 night: median score change 0, 2 players moved 3+ (Paul George 9 ->
  14 after a 53-FP game). Out rule: listed Out = half this season ONLY if Sleeper projects no game > 0 for him
  in this or next week's per-game projections (playsSoon); short absences (Dybantsa ankle, Knueppel, Sexton,
  Coby White...) keep full value, long ones (Butler, Beal, Porzingis, Ingram...) are still halved.
  Real games in the blend = only games of MIN_GAME_MINUTES (10)+ (owner, Oct 2026: garbage-time cameos like
  Tarris Reed's 1.2 min / 0 FP shouldn't dock a prospect; DNPs never counted): seasonActuals() sums per-game
  box scores /stats/nba/{season}/{w} for weeks 1..current -> { pid: [fp, games] }; update.mjs saves it as
  dynasty-proj.json `actual` { season, at, games }; pages pass it to loadDynasty (DYN_ACTUAL), and build it
  themselves only when no saved copy exists.
  Next: step 4 Playoff odds (after 3-4 weeks of games).
- `assets/corrections.js`: manual fixes (team scores, player locked points, draft picks,
  All-Star positions, PHOTO_CORRECTIONS: name -> NBA.com ID for headshots Sleeper has
  wrong; Sleeper's LeBron James photo (id 1362) is Bronny). All player photos go through
  playerPhoto() in records.js. Checked Oct 2026: no duplicate photos among league players;
  families/twins (Thompson, Murray, Champagnie, Lopez, Ball, Holiday...) are correct.
- `scripts/update.mjs`: nightly job (Node 22 in Actions): build, guard, freeze, record
  history, snapshots, and checks that fail the run (= email) on any mismatch.
- `data/` is written only by the Action (league.json, frozen/, snapshots/, week-guard.json, taxi-log.json,
  dynasty files, draft-scout.json + scout-pool.json weekly).
  Never have the owner upload a `data` folder.

## Data rules decided with the owner
- Only **locked points** count for players (starters_points; bench points never count).
- 2026+ has a league-median game; it counts in win-loss records like Sleeper does.
  Head-to-head (rivalry, luck) excludes it.
- Last place = loser of the last-place game (toilet bowl, lower score finishes last).
- Draft records are rookie drafts only (2023 startup excluded). 2024 pick 23 is ignored
  (duplicate Sleeper entry, player unknown).
- Completed seasons (2023–2025) are frozen in `data/frozen/`; Sleeper has served stale or
  partial old weeks before. The current season is protected by the week guard.
- Front Office / trade values: a player counts for the team that got him until he left;
  a pick counts as the player it became (flipped picks net out). "Est." = still changing.
- Colors are navy (not green); tokens at the top of `styles.css`.

## Testing
- Most visitors use phones (owner's iPhone is 402px wide). Test layouts at 320, 375,
  390, 402, 414, 430 px and desktop. Media query blocks must be closed correctly.
- Preview: `.claude/launch.json` config "hoops" serves this folder (`.claude/serve.ps1`).
  Without `data/league.json` locally, the site builds live from Sleeper (slow, ~20s) and
  WITHOUT frozen seasons, so old numbers can be wrong. For testing, download the real file
  from raw.githubusercontent.com into `data/` and delete it afterward.
- Verify numbers against the data before reporting; the owner checks things in the app.

## Not built yet (sidebar shows "Soon")
Weekly Props, Trade Court (planned with Firebase sign-in for the 8 managers; owner to decide
the open questions first). (Cheat Sheet was dropped by the owner.) The owner
shares screenshots of a football reference site (fantasyhoff.com) for each feature and
wants it adapted for basketball.
