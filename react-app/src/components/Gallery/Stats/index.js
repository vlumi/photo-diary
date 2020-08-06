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
  filters,
  setFilters,
  lang,
  countryData,
}) => {
  const [data, setData] = React.useState(undefined);

  const { t } = useTranslation();

  React.useEffect(() => {
    stats.generate(photos, t("stats-unknown")).then((stats) => setData(stats));
  }, [photos, t]);

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
        {stats.collectTopics(data, lang, t, countryData).map((topic) => (
          <Topic
            key={topic.key}
            topic={topic}
            filters={filters}
            setFilters={setFilters}
          />
        ))}
      </Root>
    </>
  );
};
Stats.propTypes = {
  children: PropTypes.any,
  photos: PropTypes.array.isRequired,
  filters: PropTypes.object.isRequired,
  setFilters: PropTypes.func.isRequired,
  lang: PropTypes.string.isRequired,
  countryData: PropTypes.object.isRequired,
};
export default Stats;
