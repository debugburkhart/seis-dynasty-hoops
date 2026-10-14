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
  No preseason editions for 2023-2025 (no saved projections). `assets/freeze.js`: frozen seasons + week guard.
- `assets/hype.js`: Matchup Hype (hype score, Main event, labels, moments). TUNING (owner chose
  "V5", Oct 2026, so 100 is reachable): Quality relative to that week's league (top-2 pair =
  100, average pair = 50), Closeness free within 2 Power pts then -3.5/pt, History x1.5
  (capped). 2025 final went 81 -> 91. League rivalries (RIVALRIES + RIVALRIES_FROM in config.js,
  owner IDs; owner chose 2026+ only, earlier seasons untouched): "Rivalry" tag (red) and
  +25 History after the boost, capped (= up to +5 hype); a regular week where every game is
  a rivalry gets a "Rivalry Week" banner (2026: weeks 7, 14, 21). Public "How hype works"
  lists the rivalries (owner made them public Oct 2026).
  Uses only games
  before the week. The page (app.js) fetches Sleeper state + live scores in the browser and
  reveals a week only once it's under way, except week 1, which shows as soon as the season's
  schedule is saved (owner, Oct 2026: every season; HYPE_NOW.pre = preseason, labeled "Opening
  week", no live refresh before tip-off). Live scores
  refresh every minute while the page is open (Home's Main event card too); the nightly
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
  workflow; no token is stored, the repo is public). Passcode asked every time (in-memory flag, reset when leaving the route); only its
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
  completes his 3rd NBA season (TAXI_SEASONS = 3 in commish.js; Sleeper's taxi_years=2
  setting is NOT the league rule). Flagged once he played 3 NBA seasons before this one,
  counted from real games. Taxi SIZE check (owner, Oct 2026): TAXI_SIZE = 15 in commish.js
  (rule 2.3), "Taxi squad size" card lists every team's count, flags any over 15.
  Rule 9 Wager Weeks (rules.js, 2026-27 only, weeks 8-14): lowest score funds a $5 parlay, max 2
  times per manager, then next-lowest manager not at the limit (owner's wording made official).
  Tabs: Scouting report, Waiver wire (unrostered players with an NBA team, Out hidden:
  risers = last-14-day FP/G vs season, Sleeper trending adds 48h, best available,
  streamers by projected locked pts), Draft picks (future rookie picks from
  /league/{id}/traded_picks + trade paths from DATA.transactions; next 3 drafts), Award races (season picker; live season totals + rookies from
  Sleeper via seasonTotals(); every award in banner order 01-09 + Championship MVP; finished
  seasons match the Awards page), Early hype (unrevealed
  regular weeks' hypeSlate, default = next week to be revealed), Health report.
  Health report: GitHub runs, scoring-check.txt, week-guard.json, warnings, corrections,
  lineup check, activity (flag >21 days in season), trade review (750+ net, 4+ trades/pair).
- `assets/gm.js` + "My GM" tabs in the commish office (Assistant GM, owner's plan Oct 2026).
  The commish tab bar has two groups: My GM (Briefing = default tab, Lock-in coach) and League
  office (the 8 older tabs; Scouting now needs ?tab=scout). Every GM tab has a team picker
  (default COMMISH). Planned next, in order (owner agreed): dynasty value model (3 seasons,
  this one weighted most) -> Dynasty + Managers tabs, Trade finder (Sleeper's trade block is NOT
  in the public API; owner keeps his own block in localStorage), Playoff odds INSIDE the Playoff
  picture tab (Monte Carlo + "root for"), Draft helper last (before the 2027 rookie draft).
  Lock-in coach: optimal stopping per starter. One game ~ normal(mu = Sleeper per-game projection
  over games it projects > 0 (loadWeek perPlay) x LOCK_CAL 1.04, sd = 0.30 mu); lock bar with k
  games left: V1 = mu, Vk = E[max(X, V(k-1))]; risk Safe/Balanced/Bold shifts bars -0.25/0/+0.25 sd
  (owner chose Balanced default; saved in localStorage gm-risk). Backtest 2025-26, all starts:
  coach 65,348 vs managers' real 62,199 (last game 53,052, hindsight 68,250); bigdaddyburk 8,707 vs
  8,402, flips weeks 6 and 18 losses + week 12 tie to wins. Sleeper's public API doesn't show
  locks: players_points = score counting now; if it differs from his latest game and equals an
  earlier one, he's locked; else the "I locked him" button (localStorage gm-locks-{season}-{week}).
  Box scores per game from /stats/nba/{season}/{week}. Assumes a DNP doesn't replace the counted
  score (not verified yet: check in week 1 of 2026, along with the schedule's in-game status name).
  Modes (localStorage gm-risk): "Play to win" = DEFAULT (owner asked for opponent-aware calls),
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
  Briefing: lock calls, this week (gameCoach's expected finals + win/median chances), lineup tips
  (swaps), tonight's games, injury news (localStorage gm-inj-{owner}, rolls over daily), top 3
  waiver risers.
  scoutWeek().started is false in preseason (HYPE_NOW.pre), fixed Oct 2026.
  STEP 2 (built Oct 2026): `assets/dynasty.js` dynasty values (owner: weights 50/30/20, 0-100 score,
  blunt Managers tone). Per player: v1 = Sleeper season per-game projection (league scoring;
  Out = x0.5; no projection -> last season 10+ gp), v2/v3 = AGE_CURVE (fitted 2015-2025, 3,017
  player pairs, centered; beat flat on 2019-23 checks). worth = E[max(0, raw - floor)] with
  uncertainty 4 (6 if age <= 22), floor = 5th-best free agent; score = 100 x worth / top. Injury
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
  shown as chips in the roster + taxi clock and a Prospects card. Waiver wire tab (owner asked)
  also loads dynasty values: "Dynasty pickups" (unrostered with an NBA team, by 3-season raw,
  Out included) and "Prospects on the wire" (unrostered <= 24 by chances), plus grade chips +
  "dynasty N" on every waiver row (prospectChip shared). Role test (owner asked, Oct 2026): adding
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
  In 2 years, >=110 green, <=90 red, plus "who counts" for the viewed team. Team needs (owner):
  teamNeeds() in app.js = positions under 95 now (red chips) or under 90 in 2 yrs (gold), outlook
  shopping style (Proven starters now / Youth + picks / Younger core), Taxi full (15), No {next} 1st;
  shown as a "Needs" row on every Managers card and a Needs column in the Position strength table.
  Guide: dynastyGuide() on the Dynasty tab (#dy-guide, opened/scrolled by ?guide=1, linked from the
  Trade finder): SCORE_TIERS with live counts + examples, arrows, prospect grade, picks, trade math.
  Tier tags (owner asked): tierTag(score) in app.js = SCORE_TIERS short names (Cornerstone, Star,
  High-end starter, Starter, Flex, Depth, Stash, Replaceable; classes .tier-0..7) next to player
  names in the Dynasty roster + taxi clock, Trade finder offers and Waiver wire rows; also on each
  guide row.
  Next: step 4 Playoff odds (after 3-4 weeks of games), step 5 Draft helper.
- `assets/corrections.js`: manual fixes (team scores, player locked points, draft picks,
  All-Star positions, PHOTO_CORRECTIONS: name -> NBA.com ID for headshots Sleeper has
  wrong; Sleeper's LeBron James photo (id 1362) is Bronny). All player photos go through
  playerPhoto() in records.js. Checked Oct 2026: no duplicate photos among league players;
  families/twins (Thompson, Murray, Champagnie, Lopez, Ball, Holiday...) are correct.
- `scripts/update.mjs`: nightly job (Node 22 in Actions): build, guard, freeze, record
  history, snapshots, and checks that fail the run (= email) on any mismatch.
- `data/` is written only by the Action (league.json, frozen/, snapshots/, week-guard.json).
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
