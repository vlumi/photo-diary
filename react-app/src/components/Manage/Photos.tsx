import React from "react";
import {
  Outlet,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BsCheck } from "react-icons/bs";

import photosService, {
  type MissingField,
  type PhotoFilter,
} from "../../services/photos";
import galleriesService from "../../services/galleries";
import useKeyPress from "../../lib/keypress";
import config from "../../lib/config";
import BulkActions from "./BulkActions";

const Root = styled.div`
  display: flex;
  gap: 16px;
  padding: 16px 8px;
  align-items: flex-start;
  @media (max-width: 700px) {
    flex-direction: column;
  }
`;
// One sidebar, two modes: filters (default) and edit (when a photo
// is open via `/m/photos/<id>` or `/m/g/<g>/photos/<id>`). Widened
// from the filter-only 220px so the edit form fits without
// cramping; the extra width reads as comfortable padding in filter
// mode rather than wasted real estate.
const Sidebar = styled.aside`
  flex: 0 0 360px;
  // Belt-and-suspenders width pin so a stray min-content from any
  // inner element (long photo id, unbroken Title text, etc.) can't
  // push the flex item wider than 360px when the edit form mounts.
  min-width: 360px;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  @media (max-width: 700px) {
    flex: 0 0 auto;
    min-width: 0;
    max-width: none;
    width: 100%;
  }
`;
const Body = styled.section`
  flex: 1 1 auto;
  min-width: 0;
  /* Root's align-items: flex-start means flex items keep their
     intrinsic width on the cross axis. In column mode that left the
     Body shrink-wrapped to its widest child — the grid (auto-fill
     minmax(120px, 1fr)) collapsed to a single 120px column, and only
     stretched once the BulkActions bar mounted and forced the
     parent's content width up. Pin the width in column mode so the
     grid always fills the viewport. */
  @media (max-width: 700px) {
    width: 100%;
  }
`;
const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;
const FilterTitle = styled.h3`
  margin: 0 0 4px;
  font-size: 0.85em;
  text-transform: uppercase;
  color: var(--inactive-color);
  letter-spacing: 0.05em;
`;
const Chip = styled.button<{ $active: boolean }>`
  display: inline-block;
  margin: 0 4px 4px 0;
  padding: 3px 8px;
  border-radius: 12px;
  border: 1px solid var(--inactive-color);
  background: ${({ $active }) =>
    $active ? "var(--header-background)" : "transparent"};
  color: ${({ $active }) =>
    $active ? "var(--header-color)" : "var(--primary-color)"};
  font: inherit;
  font-size: 0.85em;
  cursor: pointer;
  &:hover {
    border-color: var(--primary-color);
  }
`;
const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
`;
const TextInput = styled.input`
  font: inherit;
  padding: 4px 6px;
  background: var(--primary-background);
  color: var(--primary-color);
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  width: 100%;
  box-sizing: border-box;
`;
const DateRow = styled.div`
  display: flex;
  gap: 6px;
  & > input {
    flex: 1 1 0;
    min-width: 0;
  }
`;
const ResultSummary = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 0.9em;
  color: var(--inactive-color);
`;
const SummaryActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;
const SelectButton = styled.button`
  font: inherit;
  font-size: 0.95em;
  padding: 3px 10px;
  background: transparent;
  color: var(--primary-color);
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    border-color: var(--primary-color);
  }
`;
const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
`;
const Tile = styled.button<{ $focused?: boolean; $selected?: boolean }>`
  display: flex;
  flex-direction: column;
  background: var(--tile-background);
  border: ${({ $focused, $selected }) =>
    $selected
      ? "2px solid var(--header-background)"
      : $focused
        ? "2px solid var(--header-background)"
        : "1px solid transparent"};
  border-radius: 2px;
  padding: 0;
  overflow: hidden;
  cursor: pointer;
  font: inherit;
  text-align: left;
  box-shadow: ${({ $focused, $selected }) =>
    $focused || $selected ? "0 0 0 2px var(--header-background)" : "none"};
  position: relative;
  &:hover,
  &:focus-visible {
    border-color: var(--primary-color);
  }
`;
// Always-visible checkbox affordance per tile. Selecting the first
// photo flips the grid into "selection mode" implicitly — subsequent
// tile clicks then toggle selection instead of opening the drawer.
// Tap target is sized for mobile (28px); button styling matches a
// native-feeling checkbox more than the SelectBadge it replaced.
const CheckBox = styled.button<{ $selected: boolean }>`
  position: absolute;
  top: 6px;
  left: 6px;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 2px solid
    ${({ $selected }) =>
      $selected ? "var(--header-background)" : "rgba(255, 255, 255, 0.85)"};
  background: ${({ $selected }) =>
    $selected ? "var(--header-background)" : "rgba(0, 0, 0, 0.35)"};
  color: ${({ $selected }) =>
    $selected ? "var(--header-color)" : "rgba(255, 255, 255, 0.85)"};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1em;
  padding: 0;
  cursor: pointer;
  &:hover,
  &:focus-visible {
    border-color: var(--primary-color);
  }
`;
// Square wrap reserves the box before the image loads, so the grid
// doesn't reflow as thumbs come in. Portrait and landscape captures
// of the same aspect ratio occupy equal area inside the square
// (a 3:2 landscape and a 2:3 portrait both at 100% × 67% / 67% × 100%).
//
// `position: relative` so the absolutely-positioned <img> below
// resolves against this box.
const ThumbWrap = styled.div`
  position: relative;
  aspect-ratio: 1 / 1;
  background: var(--tile-background);
`;
// Absolute + inset: 0 sidesteps a Chromium quirk where `height:
// 100%` on a replaced element (img/video) doesn't resolve when the
// parent's height comes from `aspect-ratio` rather than an explicit
// dimension. Chrome falls back to the img's intrinsic ratio and
// portraits overflow vertically; Firefox honours the percentage and
// renders correctly. Absolute positioning forces the box to the
// wrap's resolved rect in both engines.
const Thumb = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  display: block;
`;
const TileMeta = styled.div`
  padding: 2px 4px;
  font-size: 0.7em;
  color: var(--inactive-color);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
const EmptyState = styled.div`
  padding: 32px 8px;
  text-align: center;
  color: var(--inactive-color);
  font-style: italic;
`;
const Pager = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
`;
const PagerButton = styled.button`
  padding: 4px 10px;
  border: 1px solid var(--inactive-color);
  background: transparent;
  color: var(--primary-color);
  font: inherit;
  cursor: pointer;
  &:disabled {
    color: var(--inactive-color);
    cursor: default;
  }
`;

// Compact date label that fits a 120px tile. Prefers
// `taken.instant.timestamp`'s date portion; falls back to parsing the
// converter's `<YYYY-MM-DDTHH-MM-SS>-<uuid>` filename. Empty when no
// signal is available — the tile id remains accessible via the
// `title` attribute on hover.
const dateLabel = (p: Record<string, unknown> & { id: string }): string => {
  const taken = (p.taken as { instant?: { timestamp?: string } } | undefined)
    ?.instant?.timestamp;
  if (typeof taken === "string" && taken.length >= 10) {
    return taken.slice(0, 10);
  }
  const match = p.id.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  return "";
};

// `state-code` is left out of the chip list deliberately — countries
// with no ISO-3166-2 subdivisions (Luxembourg, Monaco, Vatican …)
// permanently match the predicate, and there's no field for the
// operator to edit to clear the match anyway. The CLI audit still
// surfaces it via `bin/photo.ts audit --missing state-code` for
// people who want to spot geocoder gaps in larger countries.
const MISSING_FIELDS: MissingField[] = [
  "taken",
  "coords",
  "place",
  "country",
  "author",
  "title",
  "description",
];

// Parse the searchParams into a typed PhotoFilter. Filters that aren't
// present in the URL collapse to undefined / false / [].
const filterFromSearchParams = (
  searchParams: URLSearchParams,
  galleryId: string | undefined
): PhotoFilter => {
  const filter: PhotoFilter = {};
  if (galleryId) {
    filter.galleryIds = [galleryId];
  } else {
    const galleries = searchParams.getAll("gallery");
    if (galleries.length > 0) filter.galleryIds = galleries;
  }
  if (searchParams.get("orphan") === "1") filter.orphan = true;
  const dateFrom = searchParams.get("dateFrom");
  if (dateFrom) filter.dateFrom = dateFrom;
  const dateTo = searchParams.get("dateTo");
  if (dateTo) filter.dateTo = dateTo;
  const missing = searchParams
    .getAll("missing")
    .filter((m): m is MissingField => MISSING_FIELDS.includes(m as MissingField));
  if (missing.length > 0) filter.missing = missing;
  if (searchParams.get("duplicates") === "1") filter.duplicates = true;
  if (searchParams.get("countryMismatch") === "1") filter.countryMismatch = true;
  const q = searchParams.get("q");
  if (q) filter.q = q;
  return filter;
};

const pageFromSearchParams = (searchParams: URLSearchParams): number => {
  const raw = searchParams.get("page");
  if (!raw) return 1;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
};

interface Props {
  // When set, the photos list is locked to this gallery and the
  // gallery-membership facet hides. Cross-gallery view (`/m/photos`)
  // passes undefined.
  galleryId?: string;
}

const PAGE_SIZE = 100;

const Photos = ({ galleryId }: Props): React.ReactElement => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // Selection is always-on (no mode toggle). Clicking a tile
  // toggles selection; shift-click extends a range from the last
  // toggle anchor; a per-tile pencil icon opens the edit drawer.
  // The bulk-action bar appears only when there's something to act
  // on.
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(
    () => new Set()
  );
  const [anchorId, setAnchorId] = React.useState<string | null>(null);
  const clearSelection = React.useCallback(() => {
    setSelectedIds(new Set());
    setAnchorId(null);
  }, []);
  // The drawer mounts at /m/photos/:photoId and /m/g/<g>/photos/:photoId
  // via a nested <Outlet>; this Photos page is the parent.
  const openPhoto = (id: string) => {
    // pathname is /m/photos[/<oldId>] or /m/g/<g>/photos[/<oldId>];
    // normalise to ".../photos" and append the new id, preserving
    // the filter query.
    const base = location.pathname.endsWith("/photos")
      ? location.pathname
      : location.pathname.replace(/\/[^/]+$/, "");
    navigate({ pathname: `${base}/${id}`, search: location.search });
  };

  const filter = React.useMemo(
    () => filterFromSearchParams(searchParams, galleryId),
    [searchParams, galleryId]
  );
  const page = pageFromSearchParams(searchParams);

  // When a photo is open AND the URL doesn't carry an explicit
  // ?page=, ask the server to return the page containing that
  // photo. Explicit page wins so paging via Next/Prev keeps
  // working with a drawer open.
  const params = useParams();
  const focusOpen = !!params.photoId && !searchParams.has("page");
  const photoIdFocus = focusOpen ? params.photoId : undefined;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["manage-photos", filter, page, PAGE_SIZE, photoIdFocus],
    queryFn: () => photosService.list(filter, page, PAGE_SIZE, photoIdFocus),
  });

  // After photoIdFocus resolves a non-1 page, write it back to the
  // URL. Without this the page param stays absent: closing the
  // drawer keeps the URL on `.../photos` (no ?page=), the focus
  // de-engages with no photoId left, and the list snaps back to
  // page 1 even though the operator was viewing page 2.
  React.useEffect(() => {
    if (!focusOpen) return;
    const resolved = data?.page;
    if (!resolved || resolved <= 1) return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", String(resolved));
      return next;
    });
  }, [focusOpen, data?.page, setSearchParams]);

  // Galleries list for the gallery-membership facet. Skipped in
  // gallery-scoped mode where the gallery is fixed.
  const galleriesQuery = useQuery({
    queryKey: ["galleries"],
    queryFn: galleriesService.getAll,
    enabled: !galleryId,
  });
  const galleries = React.useMemo(() => {
    const raw =
      (galleriesQuery.data as
        | Array<{ id: string; title?: string }>
        | undefined) ?? [];
    return raw.slice().sort((a, b) =>
      (a.title || a.id).localeCompare(b.title || b.id)
    );
  }, [galleriesQuery.data]);

  const setSearchParam = (
    name: string,
    value: string | string[] | null
  ) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete(name);
      if (value === null) {
        // Pure delete.
      } else if (Array.isArray(value)) {
        for (const v of value) next.append(name, v);
      } else {
        next.set(name, value);
      }
      // Any filter change drops the page back to 1 — the previous
      // pagination doesn't necessarily correspond to results in the
      // narrowed set.
      if (name !== "page") next.delete("page");
      return next;
    });
  };

  const toggleArrayParam = (name: string, value: string) => {
    const current = searchParams.getAll(name);
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    setSearchParam(name, next.length > 0 ? next : null);
  };

  const toggleBoolParam = (name: string) => {
    const isOn = searchParams.get(name) === "1";
    setSearchParam(name, isOn ? null : "1");
  };

  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // When photoIdFocus is in play the server overrides the URL's
  // (absent) page, so the effective current page is the one the
  // server returned. The pager display + Next/Prev keys read from
  // here, otherwise they'd report "1 / N" while actually showing
  // page 2 — and clicking Prev wouldn't move.
  const currentPage = data?.page ?? page;
  const goToPage = (target: number) => {
    if (target < 1 || target > pageCount) return;
    // Always write ?page= explicitly, including page 1, so the
    // photoIdFocus side-effect doesn't snap back to the focused
    // page after the operator pages away.
    setSearchParam("page", String(target));
  };
  useKeyPress("ArrowLeft", () => goToPage(currentPage - 1));
  useKeyPress("ArrowRight", () => goToPage(currentPage + 1));
  useKeyPress("Home", () => goToPage(1));
  useKeyPress("End", () => goToPage(pageCount));

  const renderSidebarContents = () => (
    <>
      <FilterGroup>
        <FilterTitle>{t("manage-photos-filter-search")}</FilterTitle>
        <TextInput
          type="search"
          placeholder={String(t("manage-photos-filter-search-placeholder"))}
          value={searchParams.get("q") ?? ""}
          onChange={(e) =>
            setSearchParam("q", e.target.value.length > 0 ? e.target.value : null)
          }
        />
      </FilterGroup>
      <FilterGroup>
        <FilterTitle>{t("manage-photos-filter-date")}</FilterTitle>
        <DateRow>
          <TextInput
            type="date"
            value={searchParams.get("dateFrom") ?? ""}
            onChange={(e) =>
              setSearchParam("dateFrom", e.target.value || null)
            }
          />
          <TextInput
            type="date"
            value={searchParams.get("dateTo") ?? ""}
            onChange={(e) =>
              setSearchParam("dateTo", e.target.value || null)
            }
          />
        </DateRow>
      </FilterGroup>
      {!galleryId && (
        <FilterGroup>
          <FilterTitle>{t("manage-photos-filter-gallery")}</FilterTitle>
          <ChipRow>
            <Chip
              type="button"
              $active={searchParams.get("orphan") === "1"}
              onClick={() => toggleBoolParam("orphan")}
            >
              {t("manage-photos-filter-orphan")}
            </Chip>
            {galleries.map((g) => {
              const active = searchParams.getAll("gallery").includes(g.id);
              return (
                <Chip
                  key={g.id}
                  type="button"
                  $active={active}
                  onClick={() => toggleArrayParam("gallery", g.id)}
                >
                  {g.title || g.id}
                </Chip>
              );
            })}
          </ChipRow>
        </FilterGroup>
      )}
      <FilterGroup>
        <FilterTitle>{t("manage-photos-filter-audit")}</FilterTitle>
        <ChipRow>
          <Chip
            type="button"
            $active={searchParams.get("duplicates") === "1"}
            onClick={() => toggleBoolParam("duplicates")}
          >
            {t("manage-photos-filter-duplicates")}
          </Chip>
          <Chip
            type="button"
            $active={searchParams.get("countryMismatch") === "1"}
            onClick={() => toggleBoolParam("countryMismatch")}
          >
            {t("manage-photos-filter-country-mismatch")}
          </Chip>
          {MISSING_FIELDS.map((field) => {
            const active = searchParams.getAll("missing").includes(field);
            return (
              <Chip
                key={field}
                type="button"
                $active={active}
                onClick={() => toggleArrayParam("missing", field)}
              >
                {t(`manage-photos-filter-missing-${field}`)}
              </Chip>
            );
          })}
        </ChipRow>
      </FilterGroup>
    </>
  );

  const toggleSelected = (photoId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
    setAnchorId(photoId);
  };

  const handleTileClick = (
    photoId: string,
    pagePhotoIds: string[],
    shift: boolean
  ) => {
    if (shift && anchorId) {
      const a = pagePhotoIds.indexOf(anchorId);
      const b = pagePhotoIds.indexOf(photoId);
      if (a >= 0 && b >= 0) {
        const [lo, hi] = a <= b ? [a, b] : [b, a];
        const range = pagePhotoIds.slice(lo, hi + 1);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          for (const id of range) next.add(id);
          return next;
        });
        return;
      }
    }
    // No selection yet → tile click opens the drawer; matches the
    // single-photo edit flow the operator expects from a gallery
    // grid. Once anything is selected the grid is implicitly in
    // selection mode and tile click toggles instead.
    if (selectedIds.size === 0) {
      openPhoto(photoId);
      return;
    }
    toggleSelected(photoId);
  };

  const renderBody = () => {
    if (isLoading) {
      return <EmptyState>{t("loading")}</EmptyState>;
    }
    if (isError || !data) {
      return <EmptyState>{t("manage-photos-load-error")}</EmptyState>;
    }
    const { photos } = data;
    const pagePhotoIds = photos.map((p) => p.id);
    const allOnPageSelected =
      pagePhotoIds.length > 0 &&
      pagePhotoIds.every((id) => selectedIds.has(id));
    const selectAllOnPage = () => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of pagePhotoIds) next.add(id);
        return next;
      });
    };
    const clearPageSelection = () => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of pagePhotoIds) next.delete(id);
        return next;
      });
      setAnchorId(null);
    };
    const refreshAfterBulk = () => {
      void queryClient.invalidateQueries({ queryKey: ["manage-photos"] });
      // Per-id drawer caches (`["manage-photo", id]`) — the Edit
      // fields action mutates per-photo content; without this the
      // drawer keeps serving the pre-bulk row until a hard reload.
      void queryClient.invalidateQueries({ queryKey: ["manage-photo"] });
      void queryClient.invalidateQueries({ queryKey: ["galleries"] });
      void queryClient.invalidateQueries({ queryKey: ["manage-audit-counts"] });
      clearSelection();
    };
    return (
      <>
        <ResultSummary>
          <span>
            {t("manage-photos-result-count", { count: total })}
          </span>
          <SummaryActions>
            {pageCount > 1 && (
              <span>
                {t("manage-photos-result-page", {
                  page: currentPage,
                  pageCount,
                })}
              </span>
            )}
            <SelectButton
              type="button"
              disabled={photos.length === 0}
              onClick={
                allOnPageSelected ? clearPageSelection : selectAllOnPage
              }
            >
              {allOnPageSelected
                ? t("manage-photos-bulk-clear-page")
                : t("manage-photos-bulk-select-page")}
            </SelectButton>
          </SummaryActions>
        </ResultSummary>
        {selectedIds.size > 0 && (
          <BulkActions
            selectedIds={[...selectedIds]}
            galleries={galleries}
            scopedGalleryId={galleryId}
            onDone={refreshAfterBulk}
            onCancel={clearSelection}
          />
        )}
        {photos.length === 0 ? (
          <EmptyState>{t("manage-photos-empty")}</EmptyState>
        ) : (
          <Grid>
            {photos.map((p) => {
              const label = dateLabel(p);
              const isSelected = selectedIds.has(p.id);
              return (
                <Tile
                  key={p.id}
                  type="button"
                  title={p.id}
                  onClick={(e) =>
                    handleTileClick(p.id, pagePhotoIds, e.shiftKey)
                  }
                  $focused={p.id === params.photoId}
                  $selected={isSelected}
                >
                  <ThumbWrap>
                    <Thumb
                      src={`${config.PHOTO_ROOT_URL}thumbnail/${p.id}`}
                      alt={p.id}
                      loading="lazy"
                    />
                    <CheckBox
                      type="button"
                      role="checkbox"
                      aria-checked={isSelected}
                      aria-label={String(
                        t(
                          isSelected
                            ? "manage-photos-tile-deselect"
                            : "manage-photos-tile-select"
                        )
                      )}
                      title={String(
                        t(
                          isSelected
                            ? "manage-photos-tile-deselect"
                            : "manage-photos-tile-select"
                        )
                      )}
                      $selected={isSelected}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelected(p.id);
                      }}
                    >
                      {isSelected ? <BsCheck aria-hidden /> : null}
                    </CheckBox>
                  </ThumbWrap>
                  <TileMeta>{label || " "}</TileMeta>
                </Tile>
              );
            })}
          </Grid>
        )}
        {pageCount > 1 && (
          <Pager>
            <PagerButton
              type="button"
              disabled={currentPage <= 1}
              onClick={() => goToPage(currentPage - 1)}
            >
              {t("manage-photos-prev-page")}
            </PagerButton>
            <span>{currentPage} / {pageCount}</span>
            <PagerButton
              type="button"
              disabled={currentPage >= pageCount}
              onClick={() => goToPage(currentPage + 1)}
            >
              {t("manage-photos-next-page")}
            </PagerButton>
          </Pager>
        )}
      </>
    );
  };

  // useParams() inside the parent <Photos> route picks up the
  // child :photoId. When a photo is open, the sidebar swaps from
  // filter controls to the edit form (rendered via <Outlet />).
  // `params` is declared earlier alongside the focus query.
  const editing = !!params.photoId;

  return (
    <Root>
      <Sidebar>{editing ? <Outlet /> : renderSidebarContents()}</Sidebar>
      <Body>{renderBody()}</Body>
    </Root>
  );
};

export default Photos;
