# AGENTS.md

Guidance for AI coding agents (Claude Code, Cursor, Cline, Aider, …) and humans alike. User-facing setup lives in [README.md](README.md); this file is about how to work inside the repo.

## Layout

Monorepo with three workspaces:

- `react-app/` — front-end SPA. React 19, TypeScript, Vite, Emotion (styled), TanStack Query, Zustand, react-i18next, vitest.
- `server/` — Fastify backend. TypeScript, `@fastify/type-provider-typebox`, SQLite by default, vitest + supertest.
- `converter/` — back-end worker that pre-processes incoming photos (sharp, EXIF extraction). Less active.

Top-level `bin/` has the bootstrap script `instance.ts` (creates / doctors / upgrades a per-instance dir) and the `sync-versions.mjs` helper used by the release flow. Per-instance dirs (created by `bin/instance.ts`) live outside the repo at `<base>/<name>/`; their own `bin/` carries symlinks back into `server/bin/` (`photo`, `photo-rename`, `photo-geocode`, `photo-rerender`, `gallery`, `user`, `group`, `meta`).

## Commands

Run inside the relevant subtree.

| Subtree | Typecheck | Tests | Build | Dev |
|---|---|---|---|---|
| `react-app/` | `npm run typecheck` | `npm test` | `npm run build` | `npm run dev` (Vite, proxies `/api/*`) |
| `server/` | `npm run typecheck` | `npm test` | (no build — tsx runtime) | `npm run dev` (tsx watch, SQLite at `server/db.sqlite3`) |
| `converter/` | `npm run typecheck` | `npm test` | (no build — tsx runtime) | `npm run dev` |

Server tests run against an in-memory SQLite (`DB_DRIVER=sqlite3`, `DB_OPTS=:memory:`) seeded by `tests/api/fixture.ts`, so no on-disk database is touched.

Run `npm test`, `npm run typecheck`, and `npm run lint` (all three subtrees) before pushing — CI runs them all. The react-app build step rolls up bundle sizes — worth running for visual changes that might touch chunking.

## Cutting a release

The mechanical parts of a release are automated by `bin/release.ts`. Before running it, hand-write the release-theme summary paragraph in `[Unreleased]` and any Version History entry in `README.md` for themed releases — the script only handles the strictly-mechanical work. Milestone hygiene is manual too (verify open issues on the milestone, close it via `gh api repos/vlumi/photo-diary/milestones/<n> -X PATCH -f state=closed`).

Run:

```shell
npm run release           # prompts for major/minor/patch
npm run release -- patch  # same, skipping the prompt
```

What the script does:

1. Refuses to run on a dirty working tree; checks out `main`, pulls.
2. Creates `release/<next>`, bumps the version in all four `package.json` files (via `npm run version:sync`) and refreshes the lockfile.
3. Regenerates `server/openapi.json` and `react-app/src/lib/api-schema.ts`, and pins the spec as `server/openapi.released.json`.
4. Promotes `## [Unreleased]` to `## [<next>] - <today>`, adds a fresh empty `[Unreleased]` above it, and appends the diff-link entry to the footer.
5. Rewrites SETUP.md's version literals (replaces every occurrence of the previous version string).
6. Commits, pushes the branch, opens the PR (title `Release <next>`, body summarizes the promoted CHANGELOG section).
7. `gh pr merge --auto --merge` (regular merge commits, matching the repo's history), then polls until GitHub reports the PR as merged (30 min timeout, 15 s cadence). CI is authoritative on `typecheck`/`lint`/`test`/`build` — no local re-run gate here.
8. Pulls the merged main, tags `v<next>`, pushes the tag, and publishes the GitHub Release as `--latest` with the promoted CHANGELOG section as the notes file.

Any step failing exits non-zero and leaves the working tree at the failure point so you can investigate. Steps 1–5 are safe to re-run after a fix; from step 6 onward the branch / PR / tag names carry the target version, so a same-version re-run would collide — resume manually.

## Workflow conventions

- **One PR per ticket.** Don't bundle a multi-ticket milestone into one PR; don't bundle multiple discrete bugs into one commit.
- **CHANGELOG bullets are one sentence.** Depth belongs in the commit body and the PR description, not the changelog.
- **PR body paragraphs are single long lines.** No mid-paragraph hard wraps. GitHub re-flows on render.
- **Commit messages**: short imperative title, body that explains *why* (the *what* is in the diff). Co-author trailer is fine.
- **No PR/issue references in source comments.** They leak into OpenAPI descriptions, build artifacts, and rot over time. Put them in the commit message and PR body where they belong.
- **Trust but verify.** If the user reports a bug, reproduce / read the failing code path before patching. Several recent fixes (map centering arc, Backdrop box-sizing, filter modal viewport overflow) went through multiple wrong attempts because the symptom didn't match the actual root cause.

## Code conventions

- **US English everywhere.** `color`, `center`, `behavior`, `canceled`, `-ize`. In the API contract above all (field names, parameters, enum values, error messages, descriptions in the OpenAPI document), and also in identifiers, comments, UI strings, docs and the changelog. Exceptions are other people's words: the `aria-labelledby` attribute, Nominatim's `neighbourhood` key, place names such as Centre-Val de Loire.
- **Default to no comments.** Code with well-named identifiers reads itself. One short line max if needed. Never restate what the code says (`// increment counter` above `counter++` is noise).
- **Comments explain *why*, never *what*.** If a comment describes the behavior the next line obviously does, delete it. Comments earn their keep by capturing non-obvious constraints, workarounds for specific bugs, or invariants a reader would otherwise miss.
- **Don't write running commentary across iterations.** The PR description is the place for "we tried X, switched to Y". Keep only the final state's reasoning in the source.
- **Don't add error handling for impossible cases.** Validate at system boundaries (user input, external APIs). Trust internal code and framework guarantees.
- **Avoid backwards-compat shims and `// removed` placeholders.** If something is gone, delete it; don't leave a memorial.
- **i18n** lives in `react-app/src/lib/translations/{en,fi,ja}.json`. Add new keys to all three locales in the same commit.

## Architecture pointers

### Front end

- `Gallery/index.tsx` is the router/dispatch component. It picks Year / Month / Photo / Stats / Empty based on URL params (`year`, `month`, `day`, `photoId`). `Day` is not a separate view — the day slice is rendered inside Month.
- **Photo view is a modal** rendered on top of its parent Month: when the URL has a `photoId`, `Gallery/index.tsx` mounts Month + Photo together as siblings. The Photo modal lives in `Gallery/Photo/index.tsx` with a `<Backdrop>` (dark scrim, `position: fixed; inset: 0; height: 100dvh; box-sizing: border-box; z-index: 1000`) wrapping a contained `<Frame>` (`max-width: 1400px`, rounded, drop shadow).
- **Floating buttons** over the photo modal — close (`top: 8 right: 8`), fullscreen (`top: 58 left: 8` — below Navigation), info toggle (`bottom: 16 right: 16`) — all share `<FloatingButton>` style.
- **Metadata** lives in `<MetadataPanel>` at the photo's bottom-right corner. Open by default on desktop, closed on mobile. Map inside is rendered only when the panel is open.
- **Filter widget** lives in `Gallery/Filters/`. `<Strip>` is the inline italic "Category: value" chunk row mounted in every Title; `<Modal>` is the centered overlay containing `<Builder>`; `<Builder>` is prop-driven (`filters`, `setFilters`, `dateRange`, `setDateRange`, `numericRanges`, `setNumericRange`, `defaultDateRange`) so the public viewer wires it to `useFiltersStore` while the saved-filter admin form wires it to local form state. Filter state lives in `stores/filters.ts`; modal open + sub-modal + landed-category live in `stores/filter-modal.ts`. `useWireNumericRanges()` returns a memoised, anchor-stripped wire shape — every server query keys + bodies the wire shape, not the raw store value.
- **Stats logic** is in `react-app/src/lib/stats.tsx`. `collectTopics` builds the per-category data; `StatsCategory.valueSortable` / `valueSortByLabel` mark which categories show the "By value / Top" toggle in their expanded modal. `Stats/EvolutionChart.tsx` is the stacked-area trend chart with the month / year granularity toggle (`useEvolutionGranularityStore`).
- **Title bar breadcrumb** (`Gallery/Title.tsx`) shows `🏠 › Gallery › 2024 › March › #1234`. The current view's crumb is bold and non-interactive; everything else is a link.
- **`MapContainer`** is lazy-loaded via `MapContainer.lazy.tsx`. Callers pass an explicit `height` prop — the default 400px doesn't match the metadata panel's 160px clip, which is exactly the kind of mismatch that caused the "map north of pin" debug arc.
- **Admin surface** lives under `Manage/` (`/m/*` routes), gated by `user.is_admin`. Lazy-loaded out of the main bundle. Item routes open as centered modals over their list page — `ItemModal.tsx` is the shared shell (Frame + dirty-state confirm + Esc walk-up + close handling), each item form mounts inside it. Notable: `GalleryEdit.tsx` / `UserEdit.tsx` / `GroupEdit.tsx` own the form state, `GalleryItemShell.tsx` carries the Properties / Access tab nav inside the gallery item modal, `GallerySourcesSection.tsx` edits hybrid sources, `VirtualGalleryFilterSection.tsx` owns the saved-filter editor on a virtual gallery's own edit page, `SavedFiltersSection.tsx` is the parent gallery's directory of child virtual galleries, `Section.tsx` exports the shared `Section` / `SectionTitle` / `SectionHint` / `ModalHeader` primitives, `PhotoDrawer.tsx` opens as a routed modal via `<Outlet />`. Body scroll while any modal is open is locked via `stores/modal-stack.ts` (ItemModal pushes on mount, pops on unmount; `App.tsx`'s `BodyScrollLock` toggles `document.body.style.overflow`).

### Server

- Fastify routes under `server/controllers/*-v1.ts`, models under `server/models/`, typed errors in `server/lib/errors.ts` (don't return plain strings). Layout is flat — no `src/` subdirectory.
- Pluggable DB via `DB_DRIVER` env (currently only `sqlite3`; tests run against `:memory:`). Driver implementation in `server/db/sqlite3/`; the public surface is `server/db/index.ts`.
- **Access control.** Two columns carry the model: `user.is_admin` (global admin bypasses every per-gallery check) and `is_editor` on `user_gallery` / `group_gallery` (gallery-editor tier). A `user_gallery` or `group_gallery` row with `is_editor=0` is a view-only grant. The effective access is `MAX(is_editor)` across the union of direct user rows, group-derived rows, and `:guest`'s rows — individual rows can only broaden the `:guest` baseline, never narrow it. No wildcard gallery sentinels: migration 012 dropped `:all` and `:public` (the former promoted to `user.is_admin = 1`, the latter fanned out to a per-real-gallery row before delete).
- **What a viewer is sent of a photo.** Every route that sends a gallery's photos to a viewer calls `applyViewerPrivacy` (`server/lib/privacy.ts`): without editor rights on the gallery, the raw intake EXIF, the original filename and the body / lens serial numbers are removed; with the map hidden, coordinates are nulled and the geocoder's address blob removed. Place name, city and country stay. A new route that returns photos must call it too, and `tests/api/photo-privacy.test.ts` lists the routes it checks. The admin routes under `/api/v1/photos` require editor rights and send everything.
- **Gallery types.** `gallery.type` is `real` (default), `hybrid` (union of source galleries via `virtual_gallery_source` — sources must be real, no chained virtuals), or `saved_filter` (one source + a stored `{filter, dateRange, numericRanges}` baseline in `gallery_saved_filter`). The driver's `resolveGalleryRef` does the dispatch — every read path (load photos / counts / neighbors / filter values) routes through it.
- **Filter wire shape.** `filter` (discrete FilterShape), `dateRange`, and `numericRanges` are the three predicates threaded through every read body. Evaluated by `matchesFilter` / `matchesDateRange` / `matchesNumericRanges` in `server/lib/photo-filter-eval.ts`. Saved-filter galleries apply the same predicates as a baseline before the request-side ones.
- JWT auth via `jose`; sessions are 90 days. Rotating a user's `secret` invalidates all their tokens.
- **API compatibility.** The SPA ships with the server, but the iOS companion does not: an old app meets a newer server and a new app meets an older one. So between minor versions changes to `/api/v1` are additive — no response field is removed, renamed or retyped; `required` on a response field is a permanent promise, so list only what is always there; a new request field is optional. Value sets that may grow (themes, views, feature states) are plain strings with their values described, not enums, in responses; request bodies may stay strict. Open shapes clients must pass over (meta, host entries) say `additionalProperties: true`. Operator-written rows are validated on read and dropped when malformed, since a typed response would otherwise coerce them or fail.
- **Absent, not empty.** The row mappers produce `""` for text that isn't there, and grouping, filtering and the admin forms rely on it internally. Responses don't carry it: `withoutEmptyText` (`server/lib/wire-text.ts`) drops empty strings from photos and galleries on the way out, leaving operator-written blobs (raw EXIF, the geocoder's address, localized maps, saved-filter definitions) as they are. A new response with optional text should do the same.
- **Typed responses coerce, they don't fail.** Fastify serializes a response through its schema: `null` under a plain `number` goes out as `0`, under a `string` as `""`, `1.7` under an `integer` as `1`, a missing `required` field or a `NaN` is a 500. So a response schema states nullability exactly, keeps `required` to what is always there, and comes with a test that compares the route's output with `JSON.parse(JSON.stringify(modelResult))` — see `tests/lib/photo-schema.test.ts` and `tests/api/photo-wire-replay.test.ts`. The photo shape lives once in `server/lib/photo-schema.ts`, the gallery in `server/lib/gallery-schema.ts`.
- **The compatibility rule is tested.** `server/openapi.released.json` is the spec as of the last release, written by the release script and by nothing else. `tests/api/openapi.test.ts` runs `findBreakingChanges` (`server/lib/openapi-compat.ts`) from it to the live spec and fails on a removed route, a removed or retyped response field, a response field that stops being `required`, a changed success status, or a request that starts demanding, refusing or narrowing something. Additions pass. If a change trips it by accident, the change is what needs rethinking: add a new field beside the old one. A deliberate break is allowed at a minor version, because the only clients are the SPA and the companion app and both can be moved in step: put the test's exact message into `server/openapi.breaks.json` in the PR that makes the break, and say in that PR what the app needs (usually nothing, since it is written to tolerate both shapes; otherwise the app PR goes first). The release empties the file when it pins the new baseline.
- **OpenAPI.** `server/openapi.json` is generated from the route schemas by `@fastify/swagger` and committed; `react-app/src/lib/api-schema.ts` is generated from it in turn. After changing a route's schema run `npm run docs:dump` in `server/` and `npm run api:codegen` in `react-app/` — `tests/api/openapi.test.ts` fails on a stale copy. A route's `security` is documentation only (the token filter and the authorizer enforce access, and read neither): use the constants in `server/lib/api-docs.ts` — `SESSION` when a guest gets 403, `GUEST_OR_SESSION` when a guest may read. The shared 401 / 403 responses are added to the document by `documentAuthErrors`, not declared per route.

## Footguns (from recent debug arcs)

- **Backticks inside Emotion `css\`\`` template literals** close the string prematurely. Use plain CSS comments (`/* ... */`) without backtick references.
- **`position: fixed; inset: 0` with explicit `height: 100dvh` + `padding`** needs `box-sizing: border-box` — otherwise the explicit height + padding stack and the element extends past viewport (caused the InfoButton "4px below screen" bug).
- **react-leaflet's `<MapContainer>` props (`center`, `zoom`, `bounds`) are initial-setup-only.** Subsequent prop changes don't move the view. Use `useMap()` + `setView`/`fitBounds` (with `animate: false` to avoid panning surprises).
- **`useKeyPress` fires per registration on `window`.** If multiple mounted components handle the same key, both fire. Capture phase + `stopImmediatePropagation` is the escape hatch — and when both listeners use capture phase, the earlier-registered one wins, so a stacked modal needs an explicit "is the inner modal open" check to defer (see `FilterModal` ↔ Builder's `subModalKey`).
- **Locking `document.body.style.overflow = "hidden"`** removes the scrollbar gutter — content under the lock reflows ~15px wider. `html { scrollbar-gutter: stable; }` reserves the space.
- **Modal content that intrinsically demands width** (a long unbreakable chip label, an inline-flex value chunk) pushes flex items past `max-width: 100%` because `min-width: auto` is the default. Cap modal `<Frame>` with `max-width: min(<px>, calc(100vw - 40px))`, set `overflow-x: hidden` on the frame, and use `overflow-wrap: anywhere` + `white-space: normal` + `display: inline-block` on chips so the text actually wraps.
- **Server tests must go through `tests/api/helper.ts`, which keeps one listening server per file.** Handing supertest a server that isn't listening makes it `listen(0)` before every request and `close()` after, and on the shared Fastify app that close raced the next listen — the source of the intermittent `ECONNRESET` / "Parse Error: Expected HTTP/" / empty-body 400 / hung-request flakes. Still await every supertest call: an unawaited request outlives its test and trips the file's `afterAll(close)`.
- **TypeBox schemas with `additionalProperties: false`** reject unknown fields. Client-only state (like the filter widget's `numericRanges[cat].anchor`) must be stripped before serializing to the wire — see `toWireNumericRanges`.
- **`react-app` eslint is pinned to major 9.** `eslint-plugin-react` (7.37.5, latest as of 2026-07) caps its eslint peer at `^9.7`; bumping react-app to eslint 10 crashes the plugin at load time. Server + converter don't use `eslint-plugin-react` and are already on eslint 10. See the header comment in [`react-app/eslint.config.js`](react-app/eslint.config.js).
- **The top layer escapes the grayscale theme.** The monochrome effect is `MonochromeOverlay` — a `mix-blend-mode: saturation` overlay inside `#root`, not a `filter` (Gecko applies a root filter to the top layer too; a filter on any non-root element re-anchors every `position: fixed` descendant). Anything in the top layer — a `showModal()` `<dialog>`, a `popover`, a fullscreened element — paints *above* the overlay and shows in color. The theme picker relies on this on purpose. Any other modal converted to `<dialog>` that shows content (photos, flags, map, thumbnails) needs an inset saturation overlay as its last child, or it leaks color on the grayscale theme.

## When in doubt

Reach for `git log --oneline`, `git blame`, and the PR descriptions on GitHub. The PR bodies are the canonical "why we did it this way" record.
