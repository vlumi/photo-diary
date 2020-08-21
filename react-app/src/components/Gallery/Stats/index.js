import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import styled from "styled-components";

import Topic from "./Topic";

import stats from "../../../lib/stats";

const Root = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-items: flex-start;
`;

const Stats = ({
  children,
  photos,
  uniqueValues,
  filters,
  setFilters,
  lang,
  countryData,
  theme,
}) => {
  const [data, setData] = React.useState(undefined);

  const { t } = useTranslation();

  React.useEffect(() => {
    stats
      .generate(photos, uniqueValues)
      .then((stats) => setData(stats));
  }, [photos, uniqueValues, t]);

  if (!data) {
    return (
      <>
        <div>{t("loading")}</div>
      </>
    );
  }

  return (
    <>
      {children}
      <Root>
        {stats.collectTopics(data, lang, t, countryData, theme).map((topic) => (
          <Topic
            key={topic.key}
            topic={topic}
            filters={filters}
            setFilters={setFilters}
            theme={theme}
          />
        ))}
      </Root>
    </>
  );
};
Stats.propTypes = {
  children: PropTypes.any,
  photos: PropTypes.array.isRequired,
  uniqueValues: PropTypes.object.isRequired,
  filters: PropTypes.object.isRequired,
  setFilters: PropTypes.func.isRequired,
  lang: PropTypes.string.isRequired,
  countryData: PropTypes.object.isRequired,
  theme: PropTypes.object.isRequired,
};
export default Stats;
