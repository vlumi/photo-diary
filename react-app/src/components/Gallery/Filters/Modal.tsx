import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";

import Builder from "./Builder";
import type { UniqueValues } from "../../../lib/stats";
import { useFilterModalStore, useFiltersStore } from "../../../stores";

interface CountryData {
  getName(code: string, lang: string): string | undefined;
  isValid(code: string): boolean;
}

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 2000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 20px;
  overflow: auto;
`;
const Frame = styled.div`
  background: var(--primary-background);
  color: var(--primary-color);
  border: 1px solid var(--inactive-color);
  border-radius: 8px;
  padding: 18px 20px;
  width: 100%;
  max-width: min(1100px, calc(100vw - 40px));
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  margin: auto 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-x: hidden;
`;
const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;
const Title = styled.h2`
  margin: 0;
  font-size: 1.15em;
`;
const CloseButton = styled.button`
  border: none;
  background: none;
  color: var(--inactive-color);
  font-size: 1.2em;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
  &:hover {
    color: var(--primary-color);
  }
`;
const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;
const ClearAllButton = styled.button`
  border: none;
  background: none;
  color: var(--inactive-color);
  font: inherit;
  font-size: 0.85em;
  font-style: italic;
  cursor: pointer;
  padding: 0;
  &:hover {
    color: var(--primary-color);
    text-decoration: underline;
  }
`;

interface Props {
  uniqueValues: UniqueValues;
  lang: string;
  countryData: CountryData;
  hideMap: boolean;
}

const FilterModal = ({
  uniqueValues,
  lang,
  countryData,
  hideMap,
}: Props): React.ReactElement | null => {
  const { t } = useTranslation();
  const isOpen = useFilterModalStore((s) => s.isOpen);
  const close = useFilterModalStore((s) => s.close);
  const filters = useFiltersStore((s) => s.filters);
  const setFilters = useFiltersStore((s) => s.setFilters);
  const dateRange = useFiltersStore((s) => s.dateRange);
  const setDateRange = useFiltersStore((s) => s.setDateRange);
  const numericRanges = useFiltersStore((s) => s.numericRanges);
  const setNumericRanges = useFiltersStore((s) => s.setNumericRanges);
  const hasFilters =
    Object.keys(filters).length > 0 ||
    dateRange !== undefined ||
    Object.keys(numericRanges).length > 0;
  const clearAll = () => {
    setFilters({});
    setDateRange(undefined);
    setNumericRanges({});
  };

  React.useEffect(() => {
    if (!isOpen) return;
    // Capture-phase listener with stopImmediatePropagation so the
    // Esc that closes the modal doesn't also fire the underlying
    // Month/Year nav's swipe handler (which treats Esc / arrow keys
    // as navigation). See the `useKeyPress` footgun in AGENTS.md.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [isOpen, close]);

  if (!isOpen) return null;

  const onBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) close();
  };

  return (
    <Backdrop
      onClick={onBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="filter-modal-title"
    >
      <Frame>
        <Header>
          <Title id="filter-modal-title">{t("filters-title")}</Title>
          <HeaderActions>
            {hasFilters ? (
              <ClearAllButton type="button" onClick={clearAll}>
                ╳ {t("filters-clear-all")}
              </ClearAllButton>
            ) : null}
            <CloseButton
              type="button"
              onClick={close}
              aria-label={String(t("close"))}
            >
              ╳
            </CloseButton>
          </HeaderActions>
        </Header>
        <Builder
          uniqueValues={uniqueValues}
          lang={lang}
          countryData={countryData}
          hideMap={hideMap}
        />
      </Frame>
    </Backdrop>
  );
};

export default FilterModal;
