import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { BsFillXCircleFill } from "react-icons/bs";
import FlagIcon from "../../FlagIcon";

import filter, { type Filters as FiltersT } from "../../../lib/filter";
import format from "../../../lib/format";
import stats from "../../../lib/stats";

interface CountryData {
  getName(code: string, lang: string): string | undefined;
  isValid(code: string): boolean;
}

const Box = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 5px;
  margin: 1px 2px;
  border-radius: 10px;
  cursor: pointer;
`;
const ValueBox = styled(Box)`
  color: var(--primary-color);
  background-color: var(--primary-background);
`;
const Title = styled.div`
  padding: 0 5px;
`;

interface Props {
  topic: string;
  category: string;
  value: string;
  filters: FiltersT;
  setFilters: (filters: FiltersT) => void;
  lang: string;
  countryData: CountryData;
}

const Value = ({
  topic,
  category,
  value,
  filters,
  setFilters,
  lang,
  countryData,
}: Props): React.ReactElement => {
  const { t } = useTranslation();

  const formatCategoryValue = format.categoryValue(lang, t, countryData);

  const handleRemoveValueClick = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    const topicElement = target.closest("[data-type=topic]");
    const categoryElement = target.closest("[data-type=category]");
    const valueElement = target.closest("[data-type=value");
    if (!categoryElement || !valueElement) {
      return;
    }
    const topic = topicElement?.getAttribute("data-key");
    const category = categoryElement.getAttribute("data-key");
    const value = valueElement.getAttribute("data-key");
    if (!topic || !category || !value) {
      return;
    }
    const newFilters = filter.applyNewFilter(
      filters,
      topic,
      category,
      value,
      stats.UNKNOWN
    );
    setFilters(newFilters);
  };

  const renderValue = (category: string, value: string): React.ReactNode => {
    if (value === stats.UNKNOWN) {
      return t("stats-unknown");
    }
    if (category === "country" && countryData.isValid(value)) {
      return (
        <Title>
          <FlagIcon code={value} />{" "}
          {formatCategoryValue(category)(value as never)}
        </Title>
      );
    }
    if (category === "state") {
      const country = value.slice(0, 2).toLowerCase();
      return (
        <Title>
          {countryData.isValid(country) ? (
            <>
              <FlagIcon code={country} />{" "}
            </>
          ) : null}
          {format.subdivisionName(lang, value)}
        </Title>
      );
    }
    if (category === "city") {
      const parsed = format.parseCityKey(value);
      const cityLabel = format.cityName(
        lang,
        parsed.country,
        parsed.city,
        parsed.city
      );
      const qualified = parsed.state
        ? `${cityLabel}, ${parsed.state}`
        : cityLabel;
      return (
        <Title>
          {parsed.country && countryData.isValid(parsed.country) ? (
            <>
              <FlagIcon code={parsed.country} />{" "}
            </>
          ) : null}
          {qualified}
        </Title>
      );
    }
    return <Title>{formatCategoryValue(category)(value as never)}</Title>;
  };

  return (
    <ValueBox
      key={`filter:${topic}:${category}:${value}`}
      data-type="value"
      data-key={value}
      onClick={handleRemoveValueClick}
    >
      {renderValue(category, value)}
      <BsFillXCircleFill />
    </ValueBox>
  );
};
export default Value;
