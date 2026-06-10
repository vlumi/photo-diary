import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import "chart.js/auto";
import { Line } from "react-chartjs-2";

import statsService from "../../../services/stats";
import filter from "../../../lib/filter";
import { useFiltersStore } from "../../../stores";

// Client uses kebab-case category keys; server's EVOLUTION_BUCKETERS
// keys are camelCase. Categories absent from this map don't render
// the chart (the category modal opens without it).
const CATEGORY_KEY_TO_SERVER: Record<string, string> = {
  author: "author",
  country: "country",
  "camera-make": "cameraMake",
  camera: "camera",
  lens: "lens",
  "camera-lens": "cameraLens",
  "focal-length": "focalLength",
  "focal-length-eq": "focalLength35mmEquiv",
  aperture: "aperture",
  "exposure-time": "exposureTime",
  iso: "iso",
  ev: "ev",
  lv: "lv",
  resolution: "resolution",
  orientation: "orientation",
  "aspect-ratio": "aspectRatio",
};
export const isTrendable = (categoryKey: string): boolean =>
  categoryKey in CATEGORY_KEY_TO_SERVER;

const Root = styled.div`
  margin: 12px 0 18px;
`;
// Fixed-height wrapper so chart.js's `responsive: true` +
// `maintainAspectRatio: false` has a bound to size into. Without
// it, the canvas natural-sizes, drives its parent's height up,
// triggers a re-render, and grows the chart unboundedly.
const ChartBox = styled.div`
  position: relative;
  height: 280px;
  width: 100%;
`;
const Title = styled.h3`
  font-size: 0.85em;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--inactive-color);
  margin: 0 0 8px;
`;
const Notice = styled.div`
  font-size: 0.85em;
  color: var(--inactive-color);
  padding: 8px 0;
`;

// Distinct hues for up to 15 lines. Beyond `MAX_LINES` (the long
// tail) is dropped rather than aggregated — for high-cardinality
// continuous variables (shutter, focal, aperture) an "other"
// bucket would dominate without saying anything useful. 15 keeps
// the tooltip readable inside the chart's vertical bound; the
// full distribution lives in the donut + table above.
const COLOURS = [
  "#1f77b4",
  "#ff7f0e",
  "#2ca02c",
  "#d62728",
  "#9467bd",
  "#8c564b",
  "#e377c2",
  "#7f7f7f",
  "#bcbd22",
  "#17becf",
  "#aec7e8",
  "#ffbb78",
  "#98df8a",
  "#ff9896",
  "#c5b0d5",
];
const MAX_LINES = COLOURS.length;

interface Props {
  galleryId: string;
  categoryKey: string;
  categoryTitle: string;
  // Label resolver — categories like country need their bucket
  // keys ("jp", "fi") localized for the legend. Defaults to the
  // raw key when the category doesn't carry localized labels.
  labelFor?: (bucketKey: string) => string;
}

const EvolutionChart = ({
  galleryId,
  categoryKey,
  categoryTitle,
  labelFor,
}: Props): React.ReactElement | null => {
  const { t } = useTranslation();
  const filters = useFiltersStore((s) => s.filters);
  const serverFilters = React.useMemo(
    () => filter.toServerFilters(filters),
    [filters]
  );
  const serverCategory = CATEGORY_KEY_TO_SERVER[categoryKey];
  const { data, isLoading } = useQuery({
    queryKey: [
      "gallery-stats-evolution",
      galleryId,
      serverCategory,
      serverFilters,
    ],
    queryFn: () =>
      statsService.getGalleryEvolution(galleryId, serverCategory, serverFilters),
    enabled: !!serverCategory,
    placeholderData: keepPreviousData,
  });

  if (!serverCategory) return null;
  if (isLoading || !data) {
    return (
      <Root>
        <Title>
          {t("stats-evolution-title", { category: categoryTitle })}
        </Title>
        <Notice>{t("loading")}</Notice>
      </Root>
    );
  }
  const { yearMonths, buckets } = data;
  const bucketEntries = Object.entries(buckets);
  if (yearMonths.length === 0 || bucketEntries.length === 0) {
    return (
      <Root>
        <Title>
          {t("stats-evolution-title", { category: categoryTitle })}
        </Title>
        <Notice>{t("stats-evolution-empty")}</Notice>
      </Root>
    );
  }
  // Rank buckets by their final cumulative — the "biggest at the
  // end" buckets are the most readable lines. Anything past
  // MAX_LINES folds into "other".
  const ranked = bucketEntries
    .map(([key, series]) => ({
      key,
      series,
      total: series.cumulative[series.cumulative.length - 1] ?? 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, MAX_LINES);
  const datasets = ranked.map((entry, i) => ({
    label: labelFor ? labelFor(entry.key) : entry.key,
    data: entry.series.cumulative,
    borderColor: COLOURS[i],
    backgroundColor: COLOURS[i],
    tension: 0,
    stepped: "after" as const,
    pointRadius: 0,
    pointHoverRadius: 4,
    borderWidth: 2,
  }));
  return (
    <Root>
      <Title>{t("stats-evolution-title", { category: categoryTitle })}</Title>
      <ChartBox>
        <Line
          data={{ labels: yearMonths, datasets }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
              legend: { position: "bottom", labels: { boxWidth: 12 } },
              tooltip: { mode: "index", intersect: false },
            },
            scales: {
              x: { ticks: { maxTicksLimit: 12, autoSkip: true } },
              y: { beginAtZero: true },
            },
            interaction: { mode: "nearest", axis: "x", intersect: false },
          }}
        />
      </ChartBox>
    </Root>
  );
};
export default EvolutionChart;
