import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

import StatsTitle from "./StatsTitle";

import stats from "../../utils/stats";
import format from "../../utils/format";

const foldToArray = (data, sort = (a, b) => b.value - a.value) =>
  Object.keys(data)
    .map((key) => {
      return { key, value: data[key] };
    })
    .sort(sort);

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

  // TODO: time distribution -- calendar ymd, day-of-week, hour-of-day

  const byAuthor = foldToArray(data.count.byAuthor);
  const byCameraMake = foldToArray(data.count.byGear.byCameraMake);
  const byCamera = foldToArray(data.count.byGear.byCamera);
  const byLens = foldToArray(data.count.byGear.byLens);
  const byCameraLens = foldToArray(data.count.byGear.byCameraLens);

  const byFocalLength = foldToArray(
    data.count.byExposure.byFocalLength,
    (a, b) => a.key - b.key
  );
  const byAperture = foldToArray(
    data.count.byExposure.byAperture,
    (a, b) => a.key - b.key
  );
  const byExposureTime = foldToArray(
    data.count.byExposure.byExposureTime,
    (a, b) => a.key - b.key
  );
  const byIso = foldToArray(
    data.count.byExposure.byIso,
    (a, b) => a.key - b.key
  );

  const share = (value) =>
    `${Math.floor((value / data.count.total) * 1000) / 10}%`;

  return (
    <>
      <StatsTitle gallery={gallery} />
      <div className="stats content">
        <div>Total: {data.count.total}</div>
        <div className="gear">
          <div className="chart">
            <h3>By Author</h3>
            <ul>
              {byAuthor.map((entry) => (
                <li key={entry.key}>
                  {entry.key}: {entry.value} ({share(entry.value)})
                </li>
              ))}
            </ul>
          </div>
          <div className="chart">
            <h3>By Camera Make</h3>
            <ul>
              {byCameraMake.map((entry) => (
                <li key={entry.key}>
                  {entry.key}: {entry.value} ({share(entry.value)})
                </li>
              ))}
            </ul>
          </div>
          <div className="chart">
            <h3>By Camera</h3>
            <ul>
              {byCamera.map((entry) => (
                <li key={entry.key}>
                  {entry.key}: {entry.value} ({share(entry.value)})
                </li>
              ))}
            </ul>
          </div>
          <div className="chart">
            <h3>By Lens</h3>
            <ul>
              {byLens.map((entry) => (
                <li key={entry.key}>
                  {entry.key}: {entry.value} ({share(entry.value)})
                </li>
              ))}
            </ul>
          </div>
          <div className="chart">
            <h3>By Camera + Lens</h3>
            <ul>
              {byCameraLens.map((entry) => (
                <li key={entry.key}>
                  {entry.key}: {entry.value} ({share(entry.value)})
                </li>
              ))}
            </ul>
          </div>
          <div className="chart">
            <h3>By Focal Length</h3>
            <ul>
              {byFocalLength.map((entry) => (
                <li key={entry.key}>
                  {format.focalLength(entry.key)}: {entry.value} (
                  {share(entry.value)})
                </li>
              ))}
            </ul>
          </div>
          <div className="chart">
            <h3>By Aperture</h3>
            <ul>
              {byAperture.map((entry) => (
                <li key={entry.key}>
                  {format.aperture(entry.key)}: {entry.value} (
                  {share(entry.value)})
                </li>
              ))}
            </ul>
          </div>{" "}
          <div className="chart">
            <h3>By Exposure Time</h3>
            <ul>
              {byExposureTime.map((entry) => (
                <li key={entry.key}>
                  {format.exposureTime(entry.key)}: {entry.value} (
                  {share(entry.value)})
                </li>
              ))}
            </ul>
          </div>{" "}
          <div className="chart">
            <h3>By ISO</h3>
            <ul>
              {byIso.map((entry) => (
                <li key={entry.key}>
                  {format.iso(entry.key)}: {entry.value} ({share(entry.value)})
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
