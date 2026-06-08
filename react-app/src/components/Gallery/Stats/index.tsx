import React from "react";
import { useTranslation } from "react-i18next";
import styled from "@emotion/styled";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import Topic from "./Topic";

import stats, { type UniqueValues } from "../../../lib/stats";
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
  // Optional — when provided, stats come from the gallery-scoped
  // server endpoint (single bucket aggregation, server cache).
  // When absent (GlobalStats / cross-gallery views), falls back to
  // the in-memory `collectStatistics` walk over `photos`.
  galleryId?: string;
  photos: Photo[];
  uniqueValues: UniqueValues;
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
  photos,
  uniqueValues,
  filters,
  setFilters,
  lang,
  countryData,
  theme,
  hideMap,
}: Props): React.ReactElement => {
  const enabled = useBetaStore((s) => s.enabled);

  const { t } = useTranslation();

  // Gallery-scoped path: server computes the buckets; client only
  // renders. Filter + language flow into the query key so a chip
  // toggle or language switch refetches (filtered combos bypass the
  // server-side cache by design; unfiltered shares the per-gallery
  // cache entry).
  const serverFilters = React.useMemo(
    () => filter.toServerFilters(filters),
    [filters]
  );
  const { data: serverStats } = useQuery({
    queryKey: ["stats", galleryId, serverFilters, lang],
    queryFn: () =>
      statsService.getGalleryStats(galleryId!, serverFilters, lang),
    enabled: !!galleryId,
    // Hold the prior render while the new filter combo fetches —
    // a chip toggle gets an in-place update instead of unmounting
    // the whole topic tree behind a "Loading" placeholder.
    placeholderData: keepPreviousData,
  });

  // Cross-gallery fallback (GlobalStats has no gallery context yet).
  // Drops once a global-stats endpoint lands.
  const [clientStats, setClientStats] = React.useState<unknown>(undefined);
  React.useEffect(() => {
    if (galleryId) return;
    stats
      .generate(photos, uniqueValues)
      .then((d: unknown) => setClientStats(d));
  }, [galleryId, photos, uniqueValues]);

  const data = React.useMemo(() => {
    if (galleryId) {
      return serverStats ? adaptServerStats(serverStats) : undefined;
    }
    return clientStats;
  }, [galleryId, serverStats, clientStats]);

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
