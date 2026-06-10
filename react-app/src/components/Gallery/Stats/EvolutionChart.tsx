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

// Distinct hues for up to ~10 lines. Buckets beyond `MAX_LINES`
// merge into one "other" line so a 200-lens catalogue doesn't
// render an unreadable rainbow.
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
];
const OTHER_COLOUR = "#999";
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
    .sort((a, b) => b.total - a.total);
  const top = ranked.slice(0, MAX_LINES);
  const rest = ranked.slice(MAX_LINES);
  const otherCumulative =
    rest.length > 0
      ? yearMonths.map((_, i) =>
          rest.reduce((sum, r) => sum + (r.series.cumulative[i] ?? 0), 0)
        )
      : null;
  const datasets = [
    ...top.map((entry, i) => ({
      label: labelFor ? labelFor(entry.key) : entry.key,
      data: entry.series.cumulative,
      borderColor: COLOURS[i],
      backgroundColor: COLOURS[i],
      tension: 0,
      stepped: "after" as const,
      pointRadius: 0,
      pointHoverRadius: 4,
      borderWidth: 2,
    })),
    ...(otherCumulative
      ? [
          {
            label: t("stats-evolution-other", { count: rest.length }),
            data: otherCumulative,
            borderColor: OTHER_COLOUR,
            backgroundColor: OTHER_COLOUR,
            tension: 0,
            stepped: "after" as const,
            pointRadius: 0,
            pointHoverRadius: 4,
            borderWidth: 2,
            borderDash: [4, 4],
          },
        ]
      : []),
  ];
  return (
    <Root>
      <Title>{t("stats-evolution-title", { category: categoryTitle })}</Title>
      <ChartBox>
        <Line
          data={{ labels: yearMonths, datasets }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
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
