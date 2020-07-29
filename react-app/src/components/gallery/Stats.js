import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import styled from "styled-components";

import StatsTitle from "./StatsTitle";
import StatsTopic from "./StatsTopic";

import stats from "../../utils/stats";

const Root = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-items: flex-start;
`;

const Stats = ({ gallery, lang, countryData }) => {
  const [data, setData] = React.useState(undefined);

  const { t } = useTranslation();

  React.useEffect(() => {
    stats.generate(gallery, t("stats-unknown")).then((stats) => setData(stats));
  }, [gallery, t]);

  if (!data) {
    return (
      <>
        <div>{t("loading")}</div>
      </>
    );
  }

  return (
    <>
      <StatsTitle gallery={gallery} />
      <Root>
        {stats.collectTopics(data, lang, t, countryData).map((topic) => (
          <StatsTopic key={topic.name} topic={topic} />
        ))}
      </Root>
    </>
  );
};
Stats.propTypes = {
  gallery: PropTypes.object.isRequired,
  lang: PropTypes.string.isRequired,
  countryData: PropTypes.object.isRequired,
};
export default Stats;
