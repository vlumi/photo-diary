import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

import StatsTitle from "./StatsTitle";

import stats from "../../utils/stats";

const Stats = ({ gallery }) => {
  const [data, setData] = React.useState(undefined);

  const { t } = useTranslation();

  React.useEffect(() => {
    stats.generate(gallery).then((stats) => setData(stats));
  }, [gallery]);

  if (!data) {
    return (
      <>
        <div>{t("loading")}</div>
      </>
    );
  }

  // TODO: cut-off "< threshold" to others
  const byCameraMake = Object.keys(data.count.byGear.byCameraMake)
    .map((make) => {
      return { key: make, value: data.count.byGear.byCameraMake[make] };
    })
    .sort((a, b) => b.value - a.value);
  const byCamera = Object.keys(data.count.byGear.byCamera)
    .map((make) => {
      return { key: make, value: data.count.byGear.byCamera[make] };
    })
    .sort((a, b) => b.value - a.value);
  const byLens = Object.keys(data.count.byGear.byLens)
    .map((make) => {
      return { key: make, value: data.count.byGear.byLens[make] };
    })
    .sort((a, b) => b.value - a.value);
  const byCameraLens = Object.keys(data.count.byGear.byCameraLens)
    .map((make) => {
      return { key: make, value: data.count.byGear.byCameraLens[make] };
    })
    .sort((a, b) => b.value - a.value);

  return (
    <>
      <StatsTitle gallery={gallery} />
      <div className="stats content">
        <div className="gear">
          <div className="chart">
            <ul>
              {byCameraMake.map((entry) => (
                <li key={entry.key}>
                  {entry.key}: {entry.value}
                </li>
              ))}
            </ul>
          </div>
          <div className="chart">
            <ul>
              {byCamera.map((entry) => (
                <li key={entry.key}>
                  {entry.key}: {entry.value}
                </li>
              ))}
            </ul>
          </div>
          <div className="chart">
            <ul>
              {byLens.map((entry) => (
                <li key={entry.key}>
                  {entry.key}: {entry.value}
                </li>
              ))}
            </ul>
          </div>
          <div className="chart">
            <ul>
              {byCameraLens.map((entry) => (
                <li key={entry.key}>
                  {entry.key}: {entry.value}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

Stats.propTypes = {
  gallery: PropTypes.object.isRequired,
  lang: PropTypes.string.isRequired,
  countryData: PropTypes.object.isRequired,
};
export default Stats;
