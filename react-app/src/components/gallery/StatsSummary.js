import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import styled from "styled-components";

const Root = styled.div`
  margin: 5px;
  width: 100%;
  height: 200px;
  display: flex;
  justify-content: center;
  align-items: stretch;
  flex-wrap: nowrap;
`;

const StatsSummary = ({ category, lang }) => {
  const { t } = useTranslation();

  const numberFormatter = new Intl.NumberFormat(lang).format;

  if (!("kpi" in category) || !category.kpi) {
    return <></>;
  }
  // TODO; format through StatsKpi
  return (
    <Root>
      <ul>
        {category.kpi.map((kpi) => (
          <li key={`kpi:${kpi.key}`}>
            {t(`stats-kpi-title-${kpi.key}`)}: {numberFormatter(kpi.value)}
          </li>
        ))}
      </ul>
    </Root>
  );
};
StatsSummary.propTypes = {
  category: PropTypes.object,
  lang: PropTypes.string.isRequired,
};
export default StatsSummary;
