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
import { useQuery } from "@tanstack/react-query";

import photosService, {
  type MissingField,
  type PhotoFilter,
} from "../../services/photos";
import galleriesService from "../../services/galleries";
import useKeyPress from "../../lib/keypress";
import config from "../../lib/config";

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
  margin-bottom: 8px;
  font-size: 0.9em;
  color: var(--inactive-color);
`;
const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
`;
const Tile = styled.button`
  display: flex;
  flex-direction: column;
  background: var(--tile-background);
  border: 1px solid transparent;
  border-radius: 2px;
  padding: 0;
  overflow: hidden;
  cursor: pointer;
  font: inherit;
  text-align: left;
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

const MISSING_FIELDS: MissingField[] = [
  "taken",
  "coords",
  "place",
  "country",
  "author",
  "title",
  "description",
  "state-code",
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

  const { data, isLoading, isError } = useQuery({
    queryKey: ["manage-photos", filter, page, PAGE_SIZE],
    queryFn: () => photosService.list(filter, page, PAGE_SIZE),
  });

  // Galleries list for the gallery-membership facet. Skipped in
  // gallery-scoped mode where the gallery is fixed.
  const galleriesQuery = useQuery({
    queryKey: ["galleries"],
    queryFn: galleriesService.getAll,
    enabled: !galleryId,
  });
  const galleries = (galleriesQuery.data as Array<{ id: string; title?: string }> | undefined) ?? [];

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
  const goToPage = (target: number) => {
    if (target < 1 || target > pageCount) return;
    setSearchParam("page", target > 1 ? String(target) : null);
  };
  useKeyPress("ArrowLeft", () => goToPage(page - 1));
  useKeyPress("ArrowRight", () => goToPage(page + 1));
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

  const renderBody = () => {
    if (isLoading) {
      return <EmptyState>{t("loading")}</EmptyState>;
    }
    if (isError || !data) {
      return <EmptyState>{t("manage-photos-load-error")}</EmptyState>;
    }
    const { photos } = data;
    return (
      <>
        <ResultSummary>
          <span>
            {t("manage-photos-result-count", { count: total })}
          </span>
          {pageCount > 1 && (
            <span>
              {t("manage-photos-result-page", {
                page,
                pageCount,
              })}
            </span>
          )}
        </ResultSummary>
        {photos.length === 0 ? (
          <EmptyState>{t("manage-photos-empty")}</EmptyState>
        ) : (
          <Grid>
            {photos.map((p) => {
              const label = dateLabel(p);
              return (
                <Tile
                  key={p.id}
                  type="button"
                  title={p.id}
                  onClick={() => openPhoto(p.id)}
                >
                  <ThumbWrap>
                    <Thumb
                      src={`${config.PHOTO_ROOT_URL}thumbnail/${p.id}`}
                      alt={p.id}
                      loading="lazy"
                    />
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
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
            >
              {t("manage-photos-prev-page")}
            </PagerButton>
            <span>{page} / {pageCount}</span>
            <PagerButton
              type="button"
              disabled={page >= pageCount}
              onClick={() => goToPage(page + 1)}
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
  const params = useParams();
  const editing = !!params.photoId;

  return (
    <Root>
      <Sidebar>{editing ? <Outlet /> : renderSidebarContents()}</Sidebar>
      <Body>{renderBody()}</Body>
    </Root>
  );
};

export default Photos;
