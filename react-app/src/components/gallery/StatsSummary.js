import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import styled from "styled-components";

const Root = styled.div`
  margin: 0;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: stretch;
  flex-wrap: nowrap;
`;
const List = styled.ul`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  margin: 0;
  padding: 0;
`;
const Kpi = styled.li`
  display: flex;
  flex-wrap: wrap;
  border: solid black 1px;
  align-items: flex-start;
  margin: 5px;
  padding: 0;
`;
const Title = styled.h3`
  color: var(--header-color);
  background-color: var(--header-background);
  flex-grow: 1;
  flex-shrink: 1;
  width: 100%;
  margin: auto;
  padding: 0;
  text-align: center;
`;
const Box = styled.span`
  flex-grow: 1;
  width: 100%;
  height: 80px;
  padding: 0;
  display: flex;
  flex-wrap: nowrap;
  justify-content: center;
  align-items: center;
  text-align: center;
  font-weight: bold;
`;
const Value = styled.span`
  margin: auto;
  padding: 0;
  font-size: xx-large;
  text-align: center;
  vertical-align: middle;
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
      <List>
        {category.kpi.map((kpi) => (
          <Kpi key={`kpi:${kpi.key}`}>
            <Title>{t(`stats-kpi-title-${kpi.key}`)}</Title>
            <Value>
              <Box>
                {t(`stats-kpi-${kpi.key}`, {
                  count: numberFormatter(kpi.value),
                })}
              </Box>
            </Value>
          </Kpi>
        ))}
      </List>
    </Root>
  );
};
StatsSummary.propTypes = {
  category: PropTypes.object,
  lang: PropTypes.string.isRequired,
};
export default StatsSummary;
