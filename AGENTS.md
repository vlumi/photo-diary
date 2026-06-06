# AGENTS.md

Guidance for AI coding agents (Claude Code, Cursor, Cline, Aider, …) and humans alike. User-facing setup lives in [README.md](README.md); this file is about how to work inside the repo.

## Layout

Monorepo with two long-lived subtrees plus a helper:

- `react-app/` — front-end SPA. React 19, TypeScript, Vite, Emotion (styled), TanStack Query, react-i18next, vitest.
- `server/` — Fastify backend. TypeScript, SQLite by default, vitest + supertest.
- `converter/` — back-end worker that pre-processes incoming photos. Less active.

Top-level `bin/` has operator scripts (`instance.ts`, `gallery.ts`, `user.ts`, `access.ts`). Per-instance dirs (created by `bin/instance.ts`) live outside the repo at `<base>/<name>/`.

## Commands

Run inside the relevant subtree.

| Subtree | Typecheck | Tests | Build | Dev |
|---|---|---|---|---|
| `react-app/` | `npm run typecheck` | `npm test` | `npm run build` | `npm run dev` (Vite, proxies `/api/*`) |
| `server/` | `npm run typecheck` | `npm test` | `npm run build` | `npm run dev` (tsx watch, SQLite at `server/db.sqlite3`) |

Server tests use `DB_DRIVER=dummy` via the npm script, so no SQLite file is touched.

Run `npm test` and `npm run typecheck` before pushing. The build step rolls up bundle sizes — worth running for visual changes that might touch chunking.

## Cutting a release

The release step touches several files that need to stay in lockstep. Miss one and CI fails (the openapi-version check, the version-string assertions in the docs).

1. **Close the milestone.** Verify all open issues in `<version>` are merged or moved out, then `gh api repos/vlumi/photo-diary/milestones/<n> -X PATCH -f state=closed`.
2. **Branch.** `git checkout -b release/<version>` off main.
3. **Bump `version`** in all four `package.json` files: root, `server/`, `react-app/`, `converter/`. Same value everywhere.
4. **Regenerate the OpenAPI dump.** `cd server && npm run docs:dump` writes `server/openapi.json` with `info.version` from `server/package.json`. Then `cd ../react-app && npm run api:codegen` regenerates `src/lib/api-schema.ts` from the new dump. Both must be committed — CI rejects a version bump without the matching regen.
5. **Stamp CHANGELOG.** Rename `[Unreleased]` to `[<version>] - <YYYY-MM-DD>`; add a fresh empty `[Unreleased]` heading above it.
6. **README.** Bump the install / upgrade `0.x.y` examples to the new version (search for the prior version string). Move the released milestone's bullet out of the Roadmap section into Version History with a one-paragraph release summary. Update the "what's in flight after 0.x" footer pointer.
7. **Validate.** `npm test`, `npm run typecheck`, `npm run lint` across all three subtrees.
8. **Open the release PR.** Title `Release <version>`. Body summarises what shipped + any milestone reorg.
9. **After merge, tag.** `git checkout main && git pull && git tag -a v<version> -m "Release <version>" && git push origin v<version>`. GitHub auto-generates the tarball that `bin/instance.ts` examples reference.
10. **Publish the GitHub Release.** The tag alone doesn't create a release object — extract the `[<version>]` section from `CHANGELOG.md` into a temp file and `gh release create v<version> --title v<version> --notes-file <file> --latest`. The release body becomes the human-readable changelog on the releases page.

## Workflow conventions

- **One PR per ticket.** Don't bundle a multi-ticket milestone into one PR; don't bundle multiple discrete bugs into one commit.
- **CHANGELOG bullets are one sentence.** Depth belongs in the commit body and the PR description, not the changelog.
- **PR body paragraphs are single long lines.** No mid-paragraph hard wraps. GitHub re-flows on render.
- **Commit messages**: short imperative title, body that explains *why* (the *what* is in the diff). Co-author trailer is fine.
- **No PR/issue references in source comments.** They leak into OpenAPI descriptions, build artefacts, and rot over time. Put them in the commit message and PR body where they belong.
- **Trust but verify.** If the user reports a bug, reproduce / read the failing code path before patching. Several recent fixes (map centering arc, Backdrop box-sizing) went through multiple wrong attempts because the symptom didn't match the actual root cause.

## Code conventions

- **Default to no comments.** Code with well-named identifiers reads itself. One short line max if needed. Never restate what the code says (`// increment counter` above `counter++` is noise).
- **Comments explain *why*, never *what*.** If a comment describes the behaviour the next line obviously does, delete it. Comments earn their keep by capturing non-obvious constraints, workarounds for specific bugs, or invariants a reader would otherwise miss.
- **Don't write running commentary across iterations.** The PR description is the place for "we tried X, switched to Y". Keep only the final state's reasoning in the source.
- **Don't add error handling for impossible cases.** Validate at system boundaries (user input, external APIs). Trust internal code and framework guarantees.
- **Avoid backwards-compat shims and `// removed` placeholders.** If something is gone, delete it; don't leave a memorial.
- **i18n** lives in `react-app/src/lib/translations/{en,fi,ja}.json`. Add new keys to all three locales in the same commit.

## Architecture pointers

### Front end

- `Gallery/index.tsx` is the router/dispatch component. It picks Year / Month / Photo / Stats / Empty based on URL params (`year`, `month`, `day`, `photoId`).
- **Photo view is a modal** rendered on top of its parent Month: when the URL has a `photoId`, `Gallery/index.tsx` mounts Month + Photo together as siblings. The Photo modal lives in `Gallery/Photo/index.tsx` with a `<Backdrop>` (dark scrim, `position: fixed; inset: 0; height: 100dvh; box-sizing: border-box; z-index: 1000`) wrapping a contained `<Frame>` (`max-width: 1400px`, rounded, drop shadow).
- **Floating buttons** over the modal — close (`top: 8 right: 8`), fullscreen (`top: 58 left: 8` — below Navigation), info toggle (`bottom: 16 right: 16`) — all share `<FloatingButton>` style.
- **Metadata** lives in `<MetadataPanel>` at the photo's bottom-right corner. Open by default on desktop, closed on mobile. Map inside is rendered only when the panel is open.
- **Stats logic** is in `react-app/src/lib/stats.tsx`. `collectTopics` builds the per-category data; `StatsCategory.valueSortable` / `valueSortByLabel` mark which categories show the "By value / Top" toggle in their expanded modal.
- **Title bar breadcrumb** (`Gallery/Title.tsx`) shows `🏠 › Gallery › 2024 › March › #1234`. The current view's crumb is bold and non-interactive; everything else is a link.
- **`MapContainer`** is lazy-loaded via `MapContainer.lazy.tsx`. Callers pass an explicit `height` prop — the default 400px doesn't match the metadata panel's 160px clip, which is exactly the kind of mismatch that caused the "map north of pin" debug arc.
- **`useKeyPress`** registers a `keydown` listener on `window` — when two mounted components handle the same key (Photo modal + underlying Month), both fire. Use a capture-phase listener with `stopImmediatePropagation` when one needs to win.

### Server

- Fastify routes under `server/src/routes/`, models under `server/src/models/`, typed errors in the route layer (don't return plain strings).
- Pluggable DB via `DB_DRIVER` env (`sqlite` default, `dummy` for tests). Driver implementations in `server/src/db/`.
- Access control: gallery IDs include slug pseudo-galleries `:all`, `:public`, `:private`. The `access` table grants per-user levels (`viewer`, `editor`, `admin`).
- JWT auth via `jose`; sessions are 90 days. Rotating a user's `secret` invalidates all their tokens.

## Footguns (from recent debug arcs)

- **Backticks inside Emotion `css\`\`` template literals** close the string prematurely. Use plain CSS comments (`/* ... */`) without backtick references.
- **`position: fixed; inset: 0` with explicit `height: 100dvh` + `padding`** needs `box-sizing: border-box` — otherwise the explicit height + padding stack and the element extends past viewport (caused the InfoButton "4px below screen" bug).
- **react-leaflet's `<MapContainer>` props (`center`, `zoom`, `bounds`) are initial-setup-only.** Subsequent prop changes don't move the view. Use `useMap()` + `setView`/`fitBounds` (with `animate: false` to avoid panning surprises).
- **`useKeyPress` fires per registration on `window`.** If multiple mounted components handle the same key, both fire. Capture phase + `stopImmediatePropagation` is the escape hatch.
- **Locking `document.body.style.overflow = "hidden"`** removes the scrollbar gutter — content under the lock reflows ~15px wider. `html { scrollbar-gutter: stable; }` reserves the space.
- **Server tests need every supertest call awaited.** Unawaited requests linger past the test, race with `afterAll(close)`, and surface as intermittent `ECONNRESET` in CI.

## When in doubt

Reach for `git log --oneline`, `git blame`, and the PR descriptions on GitHub. The PR bodies are the canonical "why we did it this way" record.
