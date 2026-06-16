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
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { BsCheck, BsFunnel, BsXLg } from "react-icons/bs";

import photosService, {
  type MissingField,
  type PhotoFilter,
} from "../../services/photos";
import galleriesService from "../../services/galleries";
import useKeyPress from "../../lib/keypress";
import config from "../../lib/config";
import { useUserStore } from "../../stores";
import { Navigate } from "react-router-dom";
import BulkActions from "./BulkActions";
import TimelineStrip from "./TimelineStrip";

const Root = styled.div`
  display: flex;
  gap: 16px;
  padding: 16px 8px;
  align-items: flex-start;
  @media (max-width: 700px) {
    flex-direction: column;
  }
`;
// One sidebar, two modes: filters (default) and edit (when a
// photo is open via /m/photos/<id>). Widened from the filter-
// only 220px so the edit form fits without cramping; the extra
// width reads as comfortable padding in filter mode rather than
// wasted real estate.
const Sidebar = styled.aside<{ $hideOnMobile?: boolean }>`
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
    ${({ $hideOnMobile }) => ($hideOnMobile ? "display: none;" : "")}
  }
`;
const FilterFab = styled.button`
  display: none;
  @media (max-width: 700px) {
    display: inline-flex;
  }
  position: fixed;
  right: 16px;
  bottom: 16px;
  width: 56px;
  height: 56px;
  border-radius: 28px;
  background: var(--header-background);
  color: var(--header-color);
  border: 1px solid var(--header-background);
  align-items: center;
  justify-content: center;
  font-size: 1.4em;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
  z-index: 900;
`;
const FilterSheetBackdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 2000;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
`;
const FilterSheet = styled.div`
  background: var(--primary-background);
  color: var(--primary-color);
  width: 100%;
  max-width: 480px;
  margin-left: auto;
  display: flex;
  flex-direction: column;
  padding: 16px;
  gap: 16px;
  overflow-y: auto;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.4);
`;
const FilterSheetHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;
const FilterSheetTitle = styled.h2`
  margin: 0;
  font-size: 1.05em;
`;
const FilterSheetClose = styled.button`
  font: inherit;
  padding: 8px 10px;
  background: transparent;
  color: inherit;
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
`;
const Body = styled.section`
  flex: 1 1 auto;
  min-width: 0;
  /* Clearance for the floating BulkActions bar (fixed on every
     surface) and the mobile filter FAB so the last grid row isn't
     permanently covered when either is up. */
  padding-bottom: 88px;
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
  user-select: none;
`;
const Tile = styled.button<{
  $focused?: boolean;
  $selected?: boolean;
  $selectionMode?: boolean;
}>`
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
  touch-action: ${({ $selectionMode }) =>
    $selectionMode ? "pan-y" : "auto"};
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
  -webkit-touch-callout: none;
  -webkit-user-drag: none;
  pointer-events: none;
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
  padding: 12px 0;
`;
// Padding bumps the button to ~44px tall (iOS HIG touch target)
// so the pager is reachable on phones; min-width keeps Prev /
// Next consistent when one is disabled.
const PagerButton = styled.button`
  padding: 10px 18px;
  min-width: 88px;
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  background: transparent;
  color: var(--primary-color);
  font: inherit;
  cursor: pointer;
  &:hover:not(:disabled) {
    border-color: var(--primary-color);
  }
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
// Exported so the modal drawer can mirror the table's queryKey and
// read prev/next neighbours from the same cache entry.
export const filterFromSearchParams = (
  searchParams: URLSearchParams
): PhotoFilter => {
  const filter: PhotoFilter = {};
  const galleries = searchParams.getAll("gallery");
  if (galleries.length > 0) filter.galleryIds = galleries;
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

export const pageFromSearchParams = (
  searchParams: URLSearchParams
): number => {
  const raw = searchParams.get("page");
  if (!raw) return 1;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
};

export const PAGE_SIZE = 100;

// Editor-tier short-circuit: editors land here only via the
// "Manage this photo" button on the public Photo modal, which
// always carries a `:photoId` and resolves a per-photo drawer.
// The grid + bulk operations stay admin-only — render just the
// outlet so the drawer mounts under the same /m breadcrumbs.
const EditorPhotosShell = (): React.ReactElement => {
  const params = useParams();
  if (!params.photoId) {
    return <Navigate to="/m" replace />;
  }
  return <Outlet />;
};

const Photos = (): React.ReactElement => {
  const user = useUserStore((s) => s.user);
  const isAdmin = !!user?.isAdmin();
  if (!isAdmin) {
    return <EditorPhotosShell />;
  }
  return <AdminPhotos />;
};

const AdminPhotos = (): React.ReactElement => {
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

  const LONG_PRESS_MS = 400;
  const POINTER_MOVE_CANCEL_PX = 10;
  const AUTO_SCROLL_EDGE_PX = 80;
  const AUTO_SCROLL_STEP_PX = 14;
  const longPressTimer = React.useRef<number | null>(null);
  const longPressFired = React.useRef(false);
  const longPressStart = React.useRef<{ x: number; y: number } | null>(null);
  const clearLongPressTimer = () => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    longPressStart.current = null;
  };

  // Touch sweep-select (range-fill). The originating tile anchors
  // a contiguous range in the current page's DOM order; the head is
  // whichever tile lives under the finger right now. Every tile
  // between the two ends — including any the finger physically
  // skipped — adopts the paint outcome on top of a pre-sweep
  // baseline, so dragging back contracts the range.
  const pagePhotoIdsRef = React.useRef<string[]>([]);
  const pendingSweepRef = React.useRef<{
    photoId: string;
    paintSelect: boolean;
  } | null>(null);
  const sweepRef = React.useRef<{
    paintSelect: boolean;
    baseline: Set<string>;
    pageIds: string[];
    anchorIndex: number;
    headIndex: number;
    pointerX: number;
    pointerY: number;
    rafId: number | null;
  } | null>(null);
  const applyRangeFromHead = (headPhotoId: string | null) => {
    const s = sweepRef.current;
    if (!s) return;
    let headIndex = s.headIndex;
    if (headPhotoId !== null) {
      const idx = s.pageIds.indexOf(headPhotoId);
      if (idx >= 0) headIndex = idx;
    }
    if (headIndex === s.headIndex) return;
    s.headIndex = headIndex;
    const lo = Math.min(s.anchorIndex, headIndex);
    const hi = Math.max(s.anchorIndex, headIndex);
    setSelectedIds(() => {
      const next = new Set(s.baseline);
      for (let i = lo; i <= hi; i++) {
        const id = s.pageIds[i];
        if (s.paintSelect) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };
  const paintAtPoint = (clientX: number, clientY: number) => {
    const el = document.elementFromPoint(clientX, clientY);
    const tile = el?.closest("[data-photo-id]") as HTMLElement | null;
    const id = tile?.getAttribute("data-photo-id") ?? null;
    applyRangeFromHead(id);
  };
  const tickAutoScroll = () => {
    const s = sweepRef.current;
    if (!s) return;
    let dir = 0;
    if (s.pointerY < AUTO_SCROLL_EDGE_PX) dir = -1;
    else if (s.pointerY > window.innerHeight - AUTO_SCROLL_EDGE_PX) dir = 1;
    if (dir === 0) {
      s.rafId = null;
      return;
    }
    window.scrollBy(0, dir * AUTO_SCROLL_STEP_PX);
    paintAtPoint(s.pointerX, s.pointerY);
    s.rafId = requestAnimationFrame(tickAutoScroll);
  };
  const ensureAutoScrollTick = () => {
    const s = sweepRef.current;
    if (!s || s.rafId !== null) return;
    s.rafId = requestAnimationFrame(tickAutoScroll);
  };
  const beginSweep = (
    anchorPhotoId: string,
    paintSelect: boolean,
    baseline: Set<string>,
    clientX: number,
    clientY: number
  ) => {
    const pageIds = pagePhotoIdsRef.current;
    const anchorIndex = pageIds.indexOf(anchorPhotoId);
    if (anchorIndex < 0) return;
    sweepRef.current = {
      paintSelect,
      baseline,
      pageIds,
      anchorIndex,
      headIndex: -1,
      pointerX: clientX,
      pointerY: clientY,
      rafId: null,
    };
    applyRangeFromHead(anchorPhotoId);
    ensureAutoScrollTick();
  };
  const endSweep = () => {
    const s = sweepRef.current;
    if (!s) return;
    if (s.rafId !== null) cancelAnimationFrame(s.rafId);
    sweepRef.current = null;
  };
  // The drawer mounts at /m/photos/:photoId via a nested
  // <Outlet>; this Photos page is the parent.
  const openPhoto = (id: string) => {
    // pathname is /m/photos[/<oldId>]; normalise to "/m/photos"
    // and append the new id, preserving the filter query.
    const base = location.pathname.endsWith("/photos")
      ? location.pathname
      : location.pathname.replace(/\/[^/]+$/, "");
    navigate(
      { pathname: `${base}/${id}`, search: location.search },
      { state: { skipScrollRestore: true } }
    );
  };

  const filter = React.useMemo(
    () => filterFromSearchParams(searchParams),
    [searchParams]
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
    // Hold the previous grid while a chip toggle / page flip / drawer
    // open refetches under a new key — without this the whole grid
    // unmounts to "loading" between renders (#574). isLoading still
    // fires on the very first mount; from then on cache misses paint
    // the previous data + refetch in the background.
    placeholderData: keepPreviousData,
  });

  // Filter for the sidebar timeline — strip dateFrom / dateTo so
  // the buckets don't narrow themselves as the operator drills
  // into a specific month. Bucket counts recompute when any other
  // chip changes.
  const timelineFilter = React.useMemo(() => {
    const next = { ...filter };
    delete next.dateFrom;
    delete next.dateTo;
    return next;
  }, [filter]);
  const timelineQuery = useQuery({
    queryKey: ["manage-photos-year-months", timelineFilter],
    queryFn: () => photosService.getYearMonths(timelineFilter),
    placeholderData: keepPreviousData,
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
  // Galleries list for the gallery-membership facet and chips.
  const galleriesQuery = useQuery({
    queryKey: ["galleries"],
    queryFn: galleriesService.getAll,
  });
  const galleries = React.useMemo(() => {
    const raw =
      (galleriesQuery.data as
        | Array<{ id: string; title?: string; sources?: string[] }>
        | undefined) ?? [];
    return raw.slice().sort((a, b) =>
      (a.title || a.id).localeCompare(b.title || b.id)
    );
  }, [galleriesQuery.data]);
  // Virtual gallery (#22) is a membership-computed concept; the
  // /m/photos page operates on real `gallery_photo` rows and the
  // bulk actions (link/unlink/regeocode/delete) all target real
  // galleries. If the operator's filter narrows to a virtual
  // gallery we replace the photos body with a notice — the
  // operator picks a source gallery instead.
  const filteredVirtuals = React.useMemo(
    () =>
      galleries.filter(
        (g) =>
          filter.galleryIds?.includes(g.id) &&
          Array.isArray(g.sources) &&
          g.sources.length > 0
      ),
    [galleries, filter.galleryIds]
  );

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
      <FilterGroup>
        <FilterTitle>{t("manage-photos-filter-timeline")}</FilterTitle>
        <TimelineStrip
          buckets={timelineQuery.data ?? []}
          dateFrom={searchParams.get("dateFrom")}
          dateTo={searchParams.get("dateTo")}
          onPickMonth={(_yearMonth, range) => {
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              if (range) {
                next.set("dateFrom", range.dateFrom);
                next.set("dateTo", range.dateTo);
              } else {
                next.delete("dateFrom");
                next.delete("dateTo");
              }
              next.delete("page");
              return next;
            });
          }}
        />
      </FilterGroup>
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

  const onTilePointerDown = (
    e: React.PointerEvent<HTMLButtonElement>,
    photoId: string
  ) => {
    if (e.pointerType === "mouse") return;
    longPressFired.current = false;
    longPressStart.current = { x: e.clientX, y: e.clientY };
    if (selectedIds.size > 0) {
      // Already in selection mode — pending sweep. Horizontal-
      // dominant drag past the threshold promotes to active sweep;
      // vertical-dominant drag stays pending (so native pan-y
      // scroll wins) and a still finger falls through to onClick.
      pendingSweepRef.current = {
        photoId,
        paintSelect: !selectedIds.has(photoId),
      };
    } else {
      // No selection yet — long-press timer. On fire, toggle the
      // tile and immediately enter range-fill sweep so the finger
      // can extend the selection without lifting.
      longPressTimer.current = window.setTimeout(() => {
        longPressFired.current = true;
        longPressTimer.current = null;
        const wasSelected = selectedIds.has(photoId);
        setAnchorId(photoId);
        const start = longPressStart.current;
        beginSweep(
          photoId,
          !wasSelected,
          new Set(selectedIds),
          start?.x ?? e.clientX,
          start?.y ?? e.clientY
        );
      }, LONG_PRESS_MS);
    }
  };
  const onTilePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (longPressStart.current) {
      const dx = e.clientX - longPressStart.current.x;
      const dy = e.clientY - longPressStart.current.y;
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);
      if (adx > POINTER_MOVE_CANCEL_PX || ady > POINTER_MOVE_CANCEL_PX) {
        clearLongPressTimer();
        // Only promote on horizontal-dominant motion — vertical-
        // dominant motion is a scroll attempt; let touch-action:
        // pan-y handle it.
        if (
          pendingSweepRef.current &&
          !sweepRef.current &&
          adx > ady
        ) {
          const { photoId, paintSelect } = pendingSweepRef.current;
          setAnchorId(photoId);
          beginSweep(
            photoId,
            paintSelect,
            new Set(selectedIds),
            e.clientX,
            e.clientY
          );
          longPressFired.current = true;
          pendingSweepRef.current = null;
        } else {
          pendingSweepRef.current = null;
        }
      }
    }
    if (sweepRef.current) {
      sweepRef.current.pointerX = e.clientX;
      sweepRef.current.pointerY = e.clientY;
      paintAtPoint(e.clientX, e.clientY);
      ensureAutoScrollTick();
    }
  };
  const onTilePointerEnd = () => {
    clearLongPressTimer();
    pendingSweepRef.current = null;
    endSweep();
  };

  const handleTileClick = (
    photoId: string,
    pagePhotoIds: string[],
    shift: boolean
  ) => {
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
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
    if (filteredVirtuals.length > 0) {
      // Virtual gallery in the filter — no real `gallery_photo` rows
      // to operate on. Offer the operator a way to jump to a source
      // gallery instead (where bulk actions actually apply).
      return (
        <EmptyState>
          <p>{t("manage-photos-virtual-gallery-notice")}</p>
          <ul>
            {filteredVirtuals.flatMap((v) =>
              (v.sources ?? []).map((sourceId) => (
                <li key={`${v.id}->${sourceId}`}>
                  <button
                    type="button"
                    onClick={() => setSearchParam("gallery", [sourceId])}
                  >
                    {(
                      galleries.find((g) => g.id === sourceId)?.title ??
                      sourceId
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        </EmptyState>
      );
    }
    if (isLoading) {
      return <EmptyState>{t("loading")}</EmptyState>;
    }
    if (isError || !data) {
      return <EmptyState>{t("manage-photos-load-error")}</EmptyState>;
    }
    const { photos } = data;
    const pagePhotoIds = photos.map((p) => p.id);
    pagePhotoIdsRef.current = pagePhotoIds;
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
      // Bulk deletes / Edit fields touching `taken` shift the
      // year-month bucket counts; keep the sidebar timeline current.
      void queryClient.invalidateQueries({
        queryKey: ["manage-photos-year-months"],
      });
      clearSelection();
    };
    // Top-and-bottom Pager so the operator can flip pages from
    // either end of a long results page without scrolling.
    const renderPager = () =>
      pageCount > 1 ? (
        <Pager>
          <PagerButton
            type="button"
            disabled={currentPage <= 1}
            onClick={() => goToPage(currentPage - 1)}
          >
            {t("manage-photos-prev-page")}
          </PagerButton>
          <span>
            {currentPage} / {pageCount}
          </span>
          <PagerButton
            type="button"
            disabled={currentPage >= pageCount}
            onClick={() => goToPage(currentPage + 1)}
          >
            {t("manage-photos-next-page")}
          </PagerButton>
        </Pager>
      ) : null;
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
            onDone={refreshAfterBulk}
            onCancel={clearSelection}
          />
        )}
        {renderPager()}
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
                  data-photo-id={p.id}
                  onClick={(e) =>
                    handleTileClick(p.id, pagePhotoIds, e.shiftKey)
                  }
                  onPointerDown={(e) => onTilePointerDown(e, p.id)}
                  onPointerMove={onTilePointerMove}
                  onPointerUp={onTilePointerEnd}
                  onPointerCancel={onTilePointerEnd}
                  $focused={p.id === params.photoId}
                  $selected={isSelected}
                  $selectionMode={selectedIds.size > 0}
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
                      onPointerDown={(e) => e.stopPropagation()}
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
        {renderPager()}
      </>
    );
  };

  // useParams() inside the parent <Photos> route picks up the
  // child :photoId. When a photo is open, the sidebar swaps from
  // filter controls to the edit form (rendered via <Outlet />).
  // `params` is declared earlier alongside the focus query.
  const editing = !!params.photoId;
  const [filterSheetOpen, setFilterSheetOpen] = React.useState(false);
  React.useEffect(() => {
    if (editing && filterSheetOpen) setFilterSheetOpen(false);
  }, [editing, filterSheetOpen]);

  return (
    <Root>
      <Sidebar $hideOnMobile={false}>{renderSidebarContents()}</Sidebar>
      <Body>{renderBody()}</Body>
      <Outlet />
      {!editing && selectedIds.size === 0 && (
        <FilterFab
          type="button"
          aria-label={String(t("manage-photos-filters-open"))}
          title={String(t("manage-photos-filters-open"))}
          onClick={() => setFilterSheetOpen(true)}
        >
          <BsFunnel aria-hidden />
        </FilterFab>
      )}
      {!editing && filterSheetOpen && (
        <FilterSheetBackdrop
          onClick={(e) => {
            if (e.target === e.currentTarget) setFilterSheetOpen(false);
          }}
        >
          <FilterSheet>
            <FilterSheetHeader>
              <FilterSheetTitle>
                {t("manage-photos-filters-title")}
              </FilterSheetTitle>
              <FilterSheetClose
                type="button"
                aria-label={String(t("manage-photos-filters-close"))}
                onClick={() => setFilterSheetOpen(false)}
              >
                <BsXLg aria-hidden />
              </FilterSheetClose>
            </FilterSheetHeader>
            {renderSidebarContents()}
          </FilterSheet>
        </FilterSheetBackdrop>
      )}
    </Root>
  );
};

export default Photos;
