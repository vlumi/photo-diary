import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";

import Charts from "./Charts";
import Table from "./Table";

import { useBodyScrollLock } from "../../../lib/useBodyScrollLock";
import type { Filters as FiltersT } from "../../../lib/filter";
import type { StatsTopic, StatsCategory, SortMode } from "../../../lib/stats";

type ActiveTheme = { get: (name: string) => string };

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;
const ModalBox = styled.div`
  background: var(--primary-background);
  color: var(--primary-color);
  border: 1px solid var(--inactive-color);
  border-radius: 6px;
  padding: 20px;
  width: 100%;
  max-width: 720px;
  max-height: calc(100vh - 40px);
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
`;
const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
`;
const TitleGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1 1 auto;
  min-width: 0;
`;
const Title = styled.h2`
  margin: 0;
  font-size: 1.1em;
`;
const SortToggle = styled.div`
  display: inline-flex;
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  overflow: hidden;
`;
const SortButton = styled.button<{ $active: boolean }>`
  border: none;
  background: ${({ $active }) =>
    $active ? "var(--header-background)" : "transparent"};
  color: ${({ $active }) =>
    $active ? "var(--header-color)" : "var(--inactive-color)"};
  font-size: 0.75em;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 4px 10px;
  cursor: pointer;
  &:hover {
    color: var(--header-color);
  }
  & + & {
    border-left: 1px solid var(--inactive-color);
  }
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
const ScrollArea = styled.div`
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1 1 auto;
`;

interface Props {
  topic: StatsTopic;
  category: StatsCategory;
  filters: FiltersT;
  setFilters: (filters: FiltersT) => void;
  theme: ActiveTheme;
  onClose: () => void;
}

const TableModal = ({
  topic,
  category,
  filters,
  setFilters,
  theme,
  onClose,
}: Props): React.ReactElement => {
  const { t } = useTranslation();
  // "Top" is the default: the user typically lands here from the
  // inline view's top-10 list, so opening to the same ordering is the
  // less-jarring landing. "By value" is the alternate reading.
  const [sortMode, setSortMode] = React.useState<SortMode>("count");

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useBodyScrollLock();

  const onBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <Backdrop
      onClick={onBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`stats-modal-${topic.key}-${category.key}-title`}
    >
      <ModalBox>
        <Header>
          <TitleGroup>
            <Title id={`stats-modal-${topic.key}-${category.key}-title`}>
              {category.title}
            </Title>
            {category.valueSortable && (
              <SortToggle role="group" aria-label={t("stats-modal-sort-label")}>
                <SortButton
                  type="button"
                  $active={sortMode === "value"}
                  aria-pressed={sortMode === "value"}
                  onClick={() => setSortMode("value")}
                >
                  {t("stats-modal-sort-by-value")}
                </SortButton>
                <SortButton
                  type="button"
                  $active={sortMode === "count"}
                  aria-pressed={sortMode === "count"}
                  onClick={() => setSortMode("count")}
                >
                  {t("stats-modal-sort-by-count")}
                </SortButton>
              </SortToggle>
            )}
          </TitleGroup>
          <CloseButton type="button" onClick={onClose} aria-label={t("close")}>
            ╳
          </CloseButton>
        </Header>
        <ScrollArea>
          <Charts category={category} sortMode={sortMode} />
          <Table
            topic={topic}
            category={category}
            filters={filters}
            setFilters={setFilters}
            theme={theme}
            sortMode={sortMode}
          />
        </ScrollArea>
      </ModalBox>
    </Backdrop>
  );
};
export default TableModal;
