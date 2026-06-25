import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import "chart.js/auto";
import { Line } from "react-chartjs-2";

import statsService from "../../../services/stats";
import color from "../../../lib/color";
import config from "../../../lib/config";
import filter from "../../../lib/filter";
import type theme from "../../../lib/theme";
import {
  useFiltersStore,
  useEvolutionGranularityStore,
  useWireNumericRanges,
} from "../../../stores";

type ActiveTheme = ReturnType<(typeof theme)["setTheme"]>;

// Client uses kebab-case category keys; server's EVOLUTION_BUCKETERS
// keys are camelCase. Categories absent from this map don't render
// the chart (the category modal opens without it).
const CATEGORY_KEY_TO_SERVER: Record<string, string> = {
  author: "author",
  country: "country",
  weekday: "weekday",
  hour: "hour",
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
const Header = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin: 0 0 8px;
  flex-wrap: wrap;
`;
const Title = styled.h3`
  font-size: 0.85em;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--inactive-color);
  margin: 0;
`;
const Toggle = styled.div`
  display: inline-flex;
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  overflow: hidden;
`;
const ToggleButton = styled.button<{ active: boolean }>`
  font: inherit;
  font-size: 0.8em;
  padding: 2px 8px;
  border: none;
  cursor: pointer;
  background: ${({ active }) =>
    active ? "var(--header-background)" : "var(--primary-background)"};
  color: ${({ active }) =>
    active ? "var(--header-color)" : "var(--inactive-color)"};
  &:hover {
    color: var(--primary-color);
  }
`;
const Notice = styled.div`
  font-size: 0.85em;
  color: var(--inactive-color);
  padding: 8px 0;
`;

const TOOLTIP_TOP_N = 10;
// Golden-ratio conjugate — picking gradient stops at this stride
// (modulo length) puts adjacent dataset indices at maximally far
// positions in the palette, so two near-indexed bands don't end
// up indistinguishable. Coprime-clamped against the palette
// length so the stride visits every stop exactly once.
const PHI_INV = 0.6180339887498949;
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const goldenCoprimeStride = (n: number): number => {
  if (n <= 2) return 1;
  let stride = Math.max(1, Math.round(n * PHI_INV));
  while (stride > 1 && gcd(stride, n) !== 1) stride--;
  return stride;
};

interface Props {
  // Exactly one of galleryId / globalScope must be set. galleryId
  // routes the fetch through /galleries/:id/stats/evolution;
  // globalScope routes through the admin-only /stats/evolution.
  galleryId?: string;
  globalScope?: boolean;
  categoryKey: string;
  categoryTitle: string;
  theme: ActiveTheme;
  // Label resolver — categories like country need their bucket
  // keys ("jp", "fi") localized for the legend. Defaults to the
  // raw key when the category doesn't carry localized labels.
  labelFor?: (bucketKey: string) => string;
}

// Compare two bucket entries by natural order: numeric when both
// keys parse as numbers, alphabetic otherwise. `labelFor`-derived
// display label takes precedence so country chips sort by their
// localised name rather than raw "jp" / "fi" codes.
const compareByLabel = (
  a: { key: string; label: string },
  b: { key: string; label: string }
): number => {
  const na = Number(a.key);
  const nb = Number(b.key);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return a.label.localeCompare(b.label);
};

// Weekday's natural order is locale-dependent: ISO Mon-first vs
// Sun-first. Rotate the 0-6 ring by `FIRST_WEEKDAY` so the bands
// stack in the same order the year-view calendar grid uses.
export const compareByWeekday = (
  a: { key: string },
  b: { key: string }
): number => {
  const first = config.FIRST_WEEKDAY;
  const rotate = (raw: string): number => {
    const n = Number(raw);
    if (Number.isNaN(n)) return Number.MAX_SAFE_INTEGER;
    return n < first ? n + 7 : n;
  };
  return rotate(a.key) - rotate(b.key);
};

// Collapse year-month series ("2024-01", "2024-02", …) into year
// buckets ("2024", "2025", …) by summing the counts within each
// year. Server only emits the per-month shape; year view is a
// pure client-side aggregation, no extra round trip.
const aggregateByYear = (
  yearMonths: string[],
  buckets: Record<string, { counts: number[] }>
): { labels: string[]; buckets: Record<string, number[]> } => {
  const yearOrder: string[] = [];
  const yearIndex = new Map<string, number>();
  const monthToYearIdx = new Array<number>(yearMonths.length);
  for (let i = 0; i < yearMonths.length; i++) {
    const year = yearMonths[i].slice(0, 4);
    let idx = yearIndex.get(year);
    if (idx === undefined) {
      idx = yearOrder.length;
      yearIndex.set(year, idx);
      yearOrder.push(year);
    }
    monthToYearIdx[i] = idx;
  }
  const out: Record<string, number[]> = {};
  for (const [key, series] of Object.entries(buckets)) {
    const yearly = new Array<number>(yearOrder.length).fill(0);
    for (let i = 0; i < series.counts.length; i++) {
      yearly[monthToYearIdx[i]] += series.counts[i];
    }
    out[key] = yearly;
  }
  return { labels: yearOrder, buckets: out };
};

const EvolutionChart = ({
  galleryId,
  globalScope = false,
  categoryKey,
  categoryTitle,
  theme,
  labelFor,
}: Props): React.ReactElement | null => {
  const { t } = useTranslation();
  const granularity = useEvolutionGranularityStore((s) => s.granularity);
  const setGranularity = useEvolutionGranularityStore(
    (s) => s.setGranularity
  );
  const filters = useFiltersStore((s) => s.filters);
  const dateRange = useFiltersStore((s) => s.dateRange);
  const wireNumericRanges = useWireNumericRanges();
  const serverFilters = React.useMemo(
    () => filter.toServerFilters(filters),
    [filters]
  );
  const serverCategory = CATEGORY_KEY_TO_SERVER[categoryKey];
  const scopeKey = galleryId ?? (globalScope ? "__global__" : undefined);
  const { data, isLoading } = useQuery({
    queryKey: [
      "stats-evolution",
      scopeKey,
      serverCategory,
      serverFilters,
      dateRange,
      wireNumericRanges,
    ],
    queryFn: () =>
      galleryId
        ? statsService.getGalleryEvolution(
            galleryId,
            serverCategory,
            serverFilters,
            undefined,
            dateRange,
            wireNumericRanges
          )
        : statsService.getGlobalEvolution(
            serverCategory,
            serverFilters,
            undefined,
            dateRange,
            wireNumericRanges
          ),
    enabled: !!serverCategory && !!scopeKey,
    placeholderData: keepPreviousData,
  });

  if (!serverCategory) return null;
  if (isLoading || !data) {
    return (
      <Root>
        <Header>
          <Title>
            {t("stats-evolution-title", { category: categoryTitle })}
          </Title>
        </Header>
        <Notice>{t("loading")}</Notice>
      </Root>
    );
  }
  const { yearMonths, buckets } = data;
  const bucketEntries = Object.entries(buckets);
  if (yearMonths.length === 0 || bucketEntries.length === 0) {
    return (
      <Root>
        <Header>
          <Title>
            {t("stats-evolution-title", { category: categoryTitle })}
          </Title>
        </Header>
        <Notice>{t("stats-evolution-empty")}</Notice>
      </Root>
    );
  }
  const aggregated =
    granularity === "year"
      ? aggregateByYear(yearMonths, buckets)
      : {
          labels: yearMonths,
          buckets: Object.fromEntries(
            bucketEntries.map(([k, v]) => [k, v.counts])
          ),
        };
  const aggregatedEntries = Object.entries(aggregated.buckets);
  // Per-period counts (not cumulative) so a bucket's band is fat
  // when actually shot and zero outside. Sorted by natural value
  // order so adjacent bands carry adjacent values (e.g. ISO 200
  // next to 400, not next to whichever happened to have the
  // largest total). Drawn stacked so each band's height reads
  // directly as the period's count and the topmost line is the
  // overall total.
  const ordered = aggregatedEntries
    .map(([key, counts]) => ({
      key,
      label: labelFor ? labelFor(key) : key,
      counts,
    }))
    .sort(categoryKey === "weekday" ? compareByWeekday : compareByLabel);
  // Categories whose keys form a linear scale (focal length,
  // aperture, exposure time, ISO, EV, LV, …) read more naturally
  // as a hue ramp than a categorical palette — adjacent bucket =
  // adjacent colour. Same `colorGradient` helper the other Stats
  // charts use, against the same theme endpoints, for visual
  // consistency. The "unknown" bucket is excluded from the
  // numeric check (one missing-value photo would otherwise flip
  // the whole category back to categorical) and rendered grey.
  const UNKNOWN_KEY = "unknown";
  const numericKeys = ordered.filter((e) => e.key !== UNKNOWN_KEY);
  const isLinear =
    numericKeys.length > 1 &&
    numericKeys.every((entry) => !Number.isNaN(Number(entry.key)));
  // Both branches read from the same theme-driven gradient. Linear
  // categories step through it in natural order so the ramp reads
  // as a value scale; categorical hop through it at a golden-ratio
  // coprime stride so adjacent dataset indices land far apart on
  // the palette (no "two adjacent lenses look identical").
  const paletteSize = ordered.length;
  const palette =
    paletteSize > 0
      ? color.colorGradient(
          theme.get("header-background"),
          theme.get("header-color"),
          paletteSize
        )
      : [];
  const numericIndex = new Map<string, number>();
  if (isLinear) {
    numericKeys.forEach((e, idx) => numericIndex.set(e.key, idx));
  }
  const stride = isLinear ? 1 : goldenCoprimeStride(paletteSize);
  const colourFor = (entry: { key: string }, i: number): string => {
    if (entry.key === UNKNOWN_KEY) {
      return "hsl(0, 0%, 55%)";
    }
    if (palette.length === 0) return "hsl(0, 0%, 50%)";
    if (isLinear) {
      const idx = numericIndex.get(entry.key) ?? 0;
      return palette[idx];
    }
    return palette[(i * stride) % palette.length];
  };
  // Hairline between bands in --primary-color so adjacent bands
  // stay distinguishable even when the gradient endpoints land
  // close to each other / to the chart background.
  const bandStroke = theme.get("primary-color");
  const datasets = ordered.map((entry, i) => {
    const colour = colourFor(entry, i);
    return {
      label: entry.label,
      data: entry.counts,
      borderColor: bandStroke,
      backgroundColor: colour,
      fill: true,
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 3,
      borderWidth: 0.5,
    };
  });
  // Top-N rank per x cached for the current hover — filter narrows
  // the tooltip to the largest contributors at that period, and
  // the afterBody footer reports how many smaller bands were
  // hidden.
  let hiddenCount = 0;
  return (
    <Root>
      <Header>
        <Title>
          {t("stats-evolution-title", { category: categoryTitle })}
        </Title>
        <Toggle role="group" aria-label={String(t("stats-evolution-granularity-label"))}>
          <ToggleButton
            type="button"
            active={granularity === "month"}
            onClick={() => setGranularity("month")}
          >
            {t("stats-evolution-granularity-month")}
          </ToggleButton>
          <ToggleButton
            type="button"
            active={granularity === "year"}
            onClick={() => setGranularity("year")}
          >
            {t("stats-evolution-granularity-year")}
          </ToggleButton>
        </Toggle>
      </Header>
      <ChartBox>
        <Line
          data={{ labels: aggregated.labels, datasets }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                mode: "index",
                intersect: false,
                itemSort: (a, b) => (b.parsed.y ?? 0) - (a.parsed.y ?? 0),
                filter: (item, idx, items) => {
                  if (idx === 0) {
                    const nonZero = items.filter(
                      (it) => (it.parsed.y ?? 0) > 0
                    ).length;
                    hiddenCount = Math.max(0, nonZero - TOOLTIP_TOP_N);
                  }
                  if ((item.parsed.y ?? 0) <= 0) return false;
                  const rank = items
                    .map((it, i) => ({ i, y: it.parsed.y ?? 0 }))
                    .filter((r) => r.y > 0)
                    .sort((a, b) => b.y - a.y)
                    .findIndex((r) => r.i === idx);
                  return rank >= 0 && rank < TOOLTIP_TOP_N;
                },
                callbacks: {
                  afterBody: () =>
                    hiddenCount > 0
                      ? String(
                          t("stats-evolution-tooltip-more", {
                            count: hiddenCount,
                          })
                        )
                      : "",
                },
              },
            },
            scales: {
              x: {
                ticks: { maxTicksLimit: 12, autoSkip: true },
                stacked: true,
              },
              y: { beginAtZero: true, stacked: true },
            },
            interaction: { mode: "nearest", axis: "x", intersect: false },
          }}
        />
      </ChartBox>
    </Root>
  );
};
export default EvolutionChart;
