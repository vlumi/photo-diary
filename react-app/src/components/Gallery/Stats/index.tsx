import React from "react";
import { useTranslation } from "react-i18next";
import styled from "@emotion/styled";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import Topic from "./Topic";

import stats from "../../../lib/stats";
import filter from "../../../lib/filter";
import { adaptServerStats } from "../../../lib/stats-adapter";
import statsService from "../../../services/stats";
import { useBetaStore } from "../../../stores";

import type { Photo } from "../../../models/PhotoModel";
import type { Filters as FiltersT } from "../../../lib/filter";

interface CountryData {
  getName(code: string, lang: string): string | undefined;
  isValid(code: string): boolean;
}
type ActiveTheme = { get: (name: string) => string };

const Root = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-items: flex-start;
  /* Match the 5px horizontal inset that the sibling Filters bar uses
     (margin: 0 5px in Filters/index.tsx). Now that the category tiles
     fill the full row width with the responsive grid, the previous
     edge-to-edge layout made Filters' inset look misaligned. */
  margin: 0 5px;
`;

interface Props {
  children?: React.ReactNode;
  // Scope selector. Provide `galleryId` for the gallery-scoped
  // `/galleries/:id/stats` endpoint, or `globalScope` for the
  // cross-gallery `/stats` endpoint (admin-only). Exactly one is
  // required.
  galleryId?: string;
  globalScope?: boolean;
  photos: Photo[];
  filters: FiltersT;
  setFilters: (filters: FiltersT) => void;
  lang: string;
  countryData: CountryData;
  theme: ActiveTheme;
  hideMap: boolean;
}

const Stats = ({
  children,
  galleryId,
  globalScope = false,
  photos,
  filters,
  setFilters,
  lang,
  countryData,
  theme,
  hideMap,
}: Props): React.ReactElement => {
  const enabled = useBetaStore((s) => s.enabled);

  const { t } = useTranslation();

  // Filter + language flow into the query key so a chip toggle or
  // language switch refetches (filtered combos bypass the
  // server-side cache by design; unfiltered shares the per-scope
  // cache entry — per-gallery for galleryId, single `:global` key
  // for globalScope).
  const serverFilters = React.useMemo(
    () => filter.toServerFilters(filters),
    [filters]
  );
  const scopeKey = galleryId ?? (globalScope ? "__global__" : undefined);
  const { data: serverStats } = useQuery({
    queryKey: ["stats", scopeKey, serverFilters, lang],
    queryFn: () =>
      galleryId
        ? statsService.getGalleryStats(galleryId, serverFilters, lang)
        : statsService.getGlobalStats(serverFilters, lang),
    enabled: !!scopeKey,
    // Hold the prior render while the new filter combo fetches —
    // a chip toggle gets an in-place update instead of unmounting
    // the whole topic tree behind a "Loading" placeholder.
    placeholderData: keepPreviousData,
  });

  const data = React.useMemo(
    () => (serverStats ? adaptServerStats(serverStats) : undefined),
    [serverStats]
  );

  const mapPhotos = React.useMemo(
    () => (hideMap ? [] : photos.filter((photo) => photo.hasCoordinates())),
    [photos, hideMap]
  );

  // Memoize so unrelated re-renders (filter UI ticks, etc.) don't
  // re-run the topic build — it fans out into ~30 chart-data objects
  // and table-row arrays.
  const topics = React.useMemo(
    () =>
      data
        ? stats.collectTopics(
            data,
            lang,
            t,
            countryData,
            theme,
            mapPhotos,
            hideMap,
            enabled
          )
        : [],
    [data, lang, t, countryData, theme, mapPhotos, hideMap, enabled]
  );

  if (!data) {
    return (
      <>
        <div>{t("loading")}</div>
      </>
    );
  }

  return (
    <>
      {children}
      <Root>
        {topics.map((topic) => (
          <Topic
            key={topic.key}
            topic={topic}
            filters={filters}
            setFilters={setFilters}
            theme={theme}
            lang={lang}
            countryData={countryData}
          />
        ))}
      </Root>
    </>
  );
};
export default Stats;
