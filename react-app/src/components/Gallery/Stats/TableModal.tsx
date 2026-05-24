import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";

import Charts from "./Charts";
import Table from "./Table";

import type { Filters as FiltersT } from "../../../lib/filter";
import type { StatsTopic, StatsCategory } from "../../../lib/stats";

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
  max-width: 480px;
  max-height: calc(100vh - 40px);
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
`;
const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
`;
const Title = styled.h2`
  margin: 0;
  font-size: 1.1em;
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

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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
          <Title id={`stats-modal-${topic.key}-${category.key}-title`}>
            {category.title}
          </Title>
          <CloseButton type="button" onClick={onClose} aria-label={t("close")}>
            ╳
          </CloseButton>
        </Header>
        <ScrollArea>
          <Charts category={category} />
          <Table
            topic={topic}
            category={category}
            filters={filters}
            setFilters={setFilters}
            theme={theme}
          />
        </ScrollArea>
      </ModalBox>
    </Backdrop>
  );
};
export default TableModal;
