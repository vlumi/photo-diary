import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import { BsFillXCircleFill } from "react-icons/bs";
import FlagIcon from "../FlagIcon";

import filter from "../../lib/filter";
import format from "../../lib/format";
import stats from "../../lib/stats";

const Box = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 5px;
  margin: 0 5px;
  border-radius: 10px;
  cursor: pointer;
`;
const ValueBox = styled(Box)`
  color: var(--primary-color);
  background-color: var(--primary-background);
`;
const Value = styled.div`
  padding: 0 5px;
`;

const FiltersValue = ({
  topic,
  category,
  value,
  filters,
  setFilters,
  lang,
  countryData,
}) => {
  const { t } = useTranslation();

  const formatCategoryValue = format.categoryValue(lang, t, countryData);

  const handleRemoveValueClick = (event) => {
    const topicElement = event.target.closest("[data-type=topic]");
    const categoryElement = event.target.closest("[data-type=category]");
    const valueElement = event.target.closest("[data-type=value");
    if (!categoryElement || !valueElement) {
      return;
    }
    const topic = topicElement.getAttribute("data-key");
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

  const renderValue = (category, value) => {
    if (value === stats.UNKNOWN) {
      return t("stats-unknown");
    }
    if (category === "country" && countryData.isValid(value)) {
      return (
        <Value>
          <FlagIcon code={value} /> {formatCategoryValue(category)(value)}
        </Value>
      );
    }
    return <Value>{formatCategoryValue(category)(value)}</Value>;
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
FiltersValue.propTypes = {
  topic: PropTypes.string.isRequired,
  category: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  filters: PropTypes.object.isRequired,
  setFilters: PropTypes.func.isRequired,
  lang: PropTypes.string.isRequired,
  countryData: PropTypes.object.isRequired,
};
export default FiltersValue;
