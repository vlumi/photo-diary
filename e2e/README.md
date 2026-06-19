# Photo Diary E2E Suite

End-to-end UI tests driven by [Playwright](https://playwright.dev) against a real server + built SPA + seeded SQLite DB. Sibling to the per-workspace unit tests; targets the regression-prone seams between SPA components, stores, and the API.

## Requirements

- [Node.js](https://nodejs.org) 22 or newer; npm 10+ recommended
- Playwright browser binaries — installed via `npx playwright install chromium` after `npm install` from the repo root

## Running

```sh
npm test                          # from e2e/ — runs the full suite once
E2E_SKIP_BUILD=1 npm test         # skip the react-app build (faster on tight iteration)
npm run seed                      # re-seed the .runtime/db.sqlite3 fixture manually
npm run coverage                  # server-side v8 coverage report (e2e-only); writes to coverage/
```

`npm test` runs `playwright test`, which:

1. Builds the SPA into `react-app/build/` (skip with `E2E_SKIP_BUILD=1`).
2. Seeds a tight fixture (`e2e/.runtime/db.sqlite3`) — one admin user, one regular user, one gallery, one photo. Tables are wiped in place rather than the DB file replaced, so a reused server connection survives.
3. Starts the server under `NODE_ENV=test` (the only config branch that honours `DB_OPTS`) against the seeded DB.
4. Runs the six flow tests in `tests/` against the running stack.

## Layout

- `fixtures/data.ts` — the seed data (users, galleries, photos, access grants)
- `seed.ts` — standalone seed script (wipes + reinserts via the server's public DB surface)
- `playwright.config.ts` — runner config, webServer, coverage capture
- `global-setup.ts` — runs once before any test: builds the SPA + invokes the seed
- `tests/` — one `*.spec.ts` per regression seam:
  - `auth.spec.ts` — login/logout cycle + session expiry → re-login modal
  - `change-password.spec.ts` — correct current → new tokens; wrong current → inline error, session intact
  - `spa-routing.spec.ts` — non-existent gallery → Empty view; language switch persists across reload
- `tests/helpers.ts` — shared `login()` + `userMenuClick()` for the spec files

## Conventions

- Selectors prefer accessible roles + names (`getByRole("button", { name: "Login" })`) over `data-testid`. The translations file's `en` strings are stable enough; add `data-testid` only when role + name can't disambiguate.
- Tests are sequential (Playwright `workers: 1`) — the server is stateful, and running in parallel would race on the shared SQLite file.
- Each test that mutates persistent state (password change, gallery edit) restores the fixture at the end. Don't rely on `beforeEach` to re-seed mid-run — the suite is short, and adding a per-test seed would bloat wall clock significantly.

## Coverage

`npm run coverage` runs the suite under `NODE_V8_COVERAGE` and produces a c8 report against `server/**/*.ts`. Currently reports server-side coverage from e2e in isolation; unifying with the vitest baseline is tracked under [#658](https://github.com/vlumi/photo-diary/issues/658). Browser-side coverage (mapping minified bundle execution back to `src/*.tsx`) is filed under [#657](https://github.com/vlumi/photo-diary/issues/657).

## Why a separate workspace

The suite straddles `server` and `react-app`, so it doesn't naturally fit inside either. Putting it at the repo root as its own workspace also keeps Playwright + tsx out of the production dependency surface — the e2e suite is a developer tool, not part of any shipped artefact.
