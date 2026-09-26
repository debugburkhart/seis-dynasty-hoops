# Seis Dynasty Basketball Hall of Fame

A league history site for the Seis Dynasty Basketball league on Sleeper, hosted on GitHub Pages.
A GitHub Action pulls fresh data from Sleeper every night at 2:00 AM Central.

Live site: https://debugburkhart.github.io/seis-dynasty-hoops/

## How it works

| File | What it does |
|---|---|
| `index.html`, `assets/app.js`, `assets/styles.css` | The website |
| `assets/config.js` | The Sleeper league ID (update this each new season) |
| `assets/build-data.js` | Pulls every season from the Sleeper API and builds the stats |
| `scripts/update.mjs` | Run nightly; saves `data/league.json` and a dated standings snapshot in `data/snapshots/` |
| `.github/workflows/update.yml` | The schedule: runs the update at 2 AM Central, saves the data, and publishes the site |

If `data/league.json` doesn't exist yet, the site loads live from Sleeper instead, so it works even before the first nightly run.

## Common tasks

- **Update the data right now:** Actions tab → *Daily league update* → *Run workflow*.
- **New season started in Sleeper:** copy the new league ID from the league URL into `assets/config.js`. Older seasons are found automatically.
- **Something broke:** Actions tab → click the run with the red ✕ to see the error log.
