import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Builder from "../Gallery/Filters/Builder";
import galleryPhotosService from "../../services/gallery-photos";
import savedFiltersService, {
  type SavedFilterDefinition,
} from "../../services/saved-filters";
import filter, { type Filters as FiltersT, type ServerFilters } from "../../lib/filter";
import { buildUniqueValues } from "../../lib/uniqueValues";
import { useLangStore } from "../../stores";
import {
  toWireNumericRanges,
  type DateRange,
  type NumericRange,
  type NumericRanges,
} from "../../stores/filters";

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
`;
const SectionTitle = styled.h3`
  margin: 12px 0 4px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--inactive-color);
  font-size: 1.05em;
  font-weight: 600;
  color: var(--primary-color);
`;
const ParentLine = styled.div`
  font-size: 0.9em;
  color: var(--primary-color);
  a {
    color: inherit;
  }
`;
const ErrorBanner = styled.div`
  background: var(--header-background);
  color: var(--header-color);
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 0.9em;
`;
const FooterRow = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
`;
const ButtonPrimary = styled.button`
  font: inherit;
  font-size: 0.9em;
  padding: 4px 12px;
  border-radius: 4px;
  border: 1px solid var(--primary-color);
  background: var(--primary-color);
  color: var(--primary-background);
  cursor: pointer;
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;
const ButtonSecondary = styled.button`
  font: inherit;
  font-size: 0.9em;
  padding: 4px 12px;
  border-radius: 4px;
  border: 1px solid var(--inactive-color);
  background: var(--primary-background);
  color: var(--primary-color);
  cursor: pointer;
`;
const Hint = styled.div`
  font-size: 0.85em;
  color: var(--inactive-color);
  font-style: italic;
`;

interface Props {
  galleryId: string;
  sourceGalleryId: string;
  // The raw `definition` shape on the gallery row — same envelope
  // as `SavedFilterDefinition` but typed loose because the gallery
  // response uses `additionalProperties: true`. We trust the
  // server's `filter` / `numericRanges` payload to match the
  // SavedFilterDefinition shape.
  definition:
    | {
        filter?: Record<string, unknown>;
        dateRange?: { from?: string; to?: string };
        numericRanges?: Record<string, { min?: number; max?: number }>;
      }
    | undefined;
}

// Edit surface for the saved filter that defines a virtual gallery
// (#563). Shows the parent (source) gallery as a link so the
// operator can see where the gallery's photos come from, plus the
// shared `<Builder>` against the same `{filter, dateRange}` shape
// the public filter widget produces. Saves back through the
// existing saved-filter PUT endpoint keyed by (sourceGalleryId,
// virtualGalleryId).
const VirtualGalleryFilterSection = ({
  galleryId,
  sourceGalleryId,
  definition,
}: Props): React.ReactElement => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const lang = useLangStore((s) => s.lang);
  const countryData = useLangStore((s) => s.countryData);

  const initialFilters = React.useMemo(
    () =>
      filter.fromServerFilters(
        (definition?.filter as ServerFilters | undefined) ?? undefined
      ),
    [definition]
  );
  const initialDateRange = React.useMemo<DateRange | undefined>(() => {
    const r = definition?.dateRange;
    if (!r || (!r.from && !r.to)) return undefined;
    return { from: r.from, to: r.to };
  }, [definition]);
  const initialNumericRanges = React.useMemo<NumericRanges>(() => {
    const ranges = definition?.numericRanges ?? {};
    const out: NumericRanges = {};
    for (const [cat, r] of Object.entries(ranges)) {
      if (!r) continue;
      if (r.min !== undefined || r.max !== undefined) {
        out[cat] = { min: r.min, max: r.max };
      }
    }
    return out;
  }, [definition]);

  const [filters, setFilters] = React.useState<FiltersT>(initialFilters);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(
    initialDateRange
  );
  const [numericRanges, setNumericRanges] = React.useState<NumericRanges>(
    initialNumericRanges
  );
  const setNumericRange = (
    category: string,
    range: NumericRange | undefined
  ) =>
    setNumericRanges((prev) => {
      const next = { ...prev };
      if (range === undefined) delete next[category];
      else next[category] = range;
      return next;
    });
  const [error, setError] = React.useState<string | null>(null);

  // Reset local state when the server-side definition changes (e.g.
  // a save flushed React-Query cache and we got fresh data).
  React.useEffect(() => {
    setFilters(initialFilters);
    setDateRange(initialDateRange);
    setNumericRanges(initialNumericRanges);
  }, [initialFilters, initialDateRange, initialNumericRanges]);

  const filterValuesQuery = useQuery({
    queryKey: ["virtual-gallery-filter-universe", sourceGalleryId, lang],
    queryFn: () =>
      galleryPhotosService.getFilterValues(sourceGalleryId, { lang }),
  });
  const uniqueValues = React.useMemo(() => {
    if (!filterValuesQuery.data || !countryData) return undefined;
    return buildUniqueValues(filterValuesQuery.data, lang, t, countryData);
  }, [filterValuesQuery.data, lang, t, countryData]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const built: SavedFilterDefinition = {};
      const server = filter.toServerFilters(filters);
      if (Object.keys(server).length > 0) built.filter = server;
      if (dateRange && (dateRange.from || dateRange.to)) {
        built.dateRange = {};
        if (dateRange.from) built.dateRange.from = dateRange.from;
        if (dateRange.to) built.dateRange.to = dateRange.to;
      }
      const wireRanges = toWireNumericRanges(numericRanges);
      if (Object.keys(wireRanges).length > 0) {
        built.numericRanges = wireRanges;
      }
      return savedFiltersService.update(sourceGalleryId, galleryId, {
        definition: built,
      });
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["manage-gallery", galleryId] });
      queryClient.invalidateQueries({
        queryKey: ["gallery-saved-filters", sourceGalleryId],
      });
    },
    onError: (err) => {
      setError(
        err instanceof Error ? err.message : String(err ?? "Save failed")
      );
    },
  });
  const handleReset = () => {
    setFilters(initialFilters);
    setDateRange(initialDateRange);
    setNumericRanges(initialNumericRanges);
    setError(null);
  };
  const dirty =
    JSON.stringify(filter.toServerFilters(filters)) !==
      JSON.stringify(filter.toServerFilters(initialFilters)) ||
    JSON.stringify(dateRange ?? null) !==
      JSON.stringify(initialDateRange ?? null) ||
    JSON.stringify(toWireNumericRanges(numericRanges)) !==
      JSON.stringify(toWireNumericRanges(initialNumericRanges));

  return (
    <Section>
      <SectionTitle>{t("manage-virtual-gallery-filter-title")}</SectionTitle>
      <ParentLine>
        {t("manage-virtual-gallery-source")}{" "}
        <RouterLink to={`/g/${sourceGalleryId}`}>{sourceGalleryId}</RouterLink>
      </ParentLine>
      <Hint>{t("manage-virtual-gallery-filter-hint")}</Hint>
      {uniqueValues && countryData ? (
        <Builder
          uniqueValues={uniqueValues}
          lang={lang}
          countryData={countryData}
          hideMap={false}
          filters={filters}
          setFilters={setFilters}
          dateRange={dateRange}
          setDateRange={setDateRange}
          numericRanges={numericRanges}
          setNumericRange={setNumericRange}
        />
      ) : (
        <Hint>{t("loading")}</Hint>
      )}
      {error ? <ErrorBanner>{error}</ErrorBanner> : null}
      <FooterRow>
        <ButtonSecondary
          type="button"
          onClick={handleReset}
          disabled={!dirty || saveMutation.isPending}
        >
          {t("manage-saved-filter-button-cancel")}
        </ButtonSecondary>
        <ButtonPrimary
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={!dirty || saveMutation.isPending}
        >
          {t("manage-saved-filter-button-save")}
        </ButtonPrimary>
      </FooterRow>
    </Section>
  );
};

export default VirtualGalleryFilterSection;
