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

The release step touches several files that need to stay in lockstep. Miss one and CI fails (the openapi-version check, the version-string assertions in the docs).

1. **Close the milestone.** Verify all open issues in `<version>` are merged or moved out, then `gh api repos/vlumi/photo-diary/milestones/<n> -X PATCH -f state=closed`.
2. **Branch.** `git checkout -b release/<version>` off main.
3. **Bump `version`** in all four `package.json` files: root, `server/`, `react-app/`, `converter/`. Same value everywhere.
4. **Regenerate the OpenAPI dump.** `cd server && npm run docs:dump` writes `server/openapi.json` with `info.version` from `server/package.json`. Then `cd ../react-app && npm run api:codegen` regenerates `src/lib/api-schema.ts` from the new dump. Both must be committed — CI rejects a version bump without the matching regen.
5. **Stamp CHANGELOG.** Rename `[Unreleased]` to `[<version>] - <YYYY-MM-DD>`; add a fresh empty `[Unreleased]` heading above it. Add a diff-link entry at the footer: `[<version>]: https://github.com/vlumi/photo-diary/compare/v<prev>...v<version>`.
6. **README + SETUP.** Bump the install / upgrade `0.x.y` examples (in `SETUP.md`, since Setup lives there) to the new version — `grep` the prior version string to catch every site. In `README.md`, add a one-line entry to the Version History list with the release theme, and update the "what's in flight after 0.x" footer pointer. The Roadmap section only lists upcoming major milestones (1.0 / 2.0) now, no per-version reorg needed.
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
- **Trust but verify.** If the user reports a bug, reproduce / read the failing code path before patching. Several recent fixes (map centering arc, Backdrop box-sizing, filter modal viewport overflow) went through multiple wrong attempts because the symptom didn't match the actual root cause.

## Code conventions

- **Default to no comments.** Code with well-named identifiers reads itself. One short line max if needed. Never restate what the code says (`// increment counter` above `counter++` is noise).
- **Comments explain *why*, never *what*.** If a comment describes the behaviour the next line obviously does, delete it. Comments earn their keep by capturing non-obvious constraints, workarounds for specific bugs, or invariants a reader would otherwise miss.
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
- **Admin surface** lives under `Manage/` (`/m/*` routes), gated by `user.is_admin`. Lazy-loaded out of the main bundle. Item routes open as centred modals over their list page — `ItemModal.tsx` is the shared shell (Frame + dirty-state confirm + Esc walk-up + close handling), each item form mounts inside it. Notable: `GalleryEdit.tsx` / `UserEdit.tsx` / `GroupEdit.tsx` own the form state, `GalleryItemShell.tsx` carries the Properties / Access tab nav inside the gallery item modal, `GallerySourcesSection.tsx` edits hybrid sources, `VirtualGalleryFilterSection.tsx` owns the saved-filter editor on a virtual gallery's own edit page, `SavedFiltersSection.tsx` is the parent gallery's directory of child virtual galleries, `Section.tsx` exports the shared `Section` / `SectionTitle` / `SectionHint` / `ModalHeader` primitives, `PhotoDrawer.tsx` opens as a routed modal via `<Outlet />`. Body scroll while any modal is open is locked via `stores/modal-stack.ts` (ItemModal pushes on mount, pops on unmount; `App.tsx`'s `BodyScrollLock` toggles `document.body.style.overflow`).

### Server

- Fastify routes under `server/controllers/*-v1.ts`, models under `server/models/`, typed errors in `server/lib/errors.ts` (don't return plain strings). Layout is flat — no `src/` subdirectory.
- Pluggable DB via `DB_DRIVER` env (currently only `sqlite3`; tests run against `:memory:`). Driver implementation in `server/db/sqlite3/`; the public surface is `server/db/index.ts`.
- **Access control.** Two columns carry the model: `user.is_admin` (global admin bypasses every per-gallery check) and `is_editor` on `user_gallery` / `group_gallery` (gallery-editor tier). A `user_gallery` or `group_gallery` row with `is_editor=0` is a view-only grant. The effective access is `MAX(is_editor)` across the union of direct user rows, group-derived rows, and `:guest`'s rows — individual rows can only broaden the `:guest` baseline, never narrow it. No wildcard gallery sentinels: migration 012 dropped `:all` and `:public` (the former promoted to `user.is_admin = 1`, the latter fanned out to a per-real-gallery row before delete).
- **Gallery types.** `gallery.type` is `real` (default), `hybrid` (union of source galleries via `virtual_gallery_source` — sources must be real, no chained virtuals), or `saved_filter` (one source + a stored `{filter, dateRange, numericRanges}` baseline in `gallery_saved_filter`). The driver's `resolveGalleryRef` does the dispatch — every read path (load photos / counts / neighbors / filter values) routes through it.
- **Filter wire shape.** `filter` (discrete FilterShape), `dateRange`, and `numericRanges` are the three predicates threaded through every read body. Evaluated by `matchesFilter` / `matchesDateRange` / `matchesNumericRanges` in `server/lib/photo-filter-eval.ts`. Saved-filter galleries apply the same predicates as a baseline before the request-side ones.
- JWT auth via `jose`; sessions are 90 days. Rotating a user's `secret` invalidates all their tokens.

## Footguns (from recent debug arcs)

- **Backticks inside Emotion `css\`\`` template literals** close the string prematurely. Use plain CSS comments (`/* ... */`) without backtick references.
- **`position: fixed; inset: 0` with explicit `height: 100dvh` + `padding`** needs `box-sizing: border-box` — otherwise the explicit height + padding stack and the element extends past viewport (caused the InfoButton "4px below screen" bug).
- **react-leaflet's `<MapContainer>` props (`center`, `zoom`, `bounds`) are initial-setup-only.** Subsequent prop changes don't move the view. Use `useMap()` + `setView`/`fitBounds` (with `animate: false` to avoid panning surprises).
- **`useKeyPress` fires per registration on `window`.** If multiple mounted components handle the same key, both fire. Capture phase + `stopImmediatePropagation` is the escape hatch — and when both listeners use capture phase, the earlier-registered one wins, so a stacked modal needs an explicit "is the inner modal open" check to defer (see `FilterModal` ↔ Builder's `subModalKey`).
- **Locking `document.body.style.overflow = "hidden"`** removes the scrollbar gutter — content under the lock reflows ~15px wider. `html { scrollbar-gutter: stable; }` reserves the space.
- **Modal content that intrinsically demands width** (a long unbreakable chip label, an inline-flex value chunk) pushes flex items past `max-width: 100%` because `min-width: auto` is the default. Cap modal `<Frame>` with `max-width: min(<px>, calc(100vw - 40px))`, set `overflow-x: hidden` on the frame, and use `overflow-wrap: anywhere` + `white-space: normal` + `display: inline-block` on chips so the text actually wraps.
- **Server tests need every supertest call awaited.** Unawaited requests linger past the test, race with `afterAll(close)`, and surface as intermittent `ECONNRESET` / "Parse Error: Expected HTTP/, RTSP/ or ICE/" in CI.
- **TypeBox schemas with `additionalProperties: false`** reject unknown fields. Client-only state (like the filter widget's `numericRanges[cat].anchor`) must be stripped before serialising to the wire — see `toWireNumericRanges`.
- **`react-app` eslint is pinned to major 9.** `eslint-plugin-react` (7.37.5, latest as of 2026-07) caps its eslint peer at `^9.7`; bumping react-app to eslint 10 crashes the plugin at load time. Server + converter don't use `eslint-plugin-react` and are already on eslint 10. See the header comment in [`react-app/eslint.config.js`](react-app/eslint.config.js).

## When in doubt

Reach for `git log --oneline`, `git blame`, and the PR descriptions on GitHub. The PR bodies are the canonical "why we did it this way" record.
