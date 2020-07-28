import React from "react";
import PropTypes from "prop-types";
import { Trans, useTranslation } from "react-i18next";

import { Doughnut } from "react-chartjs-2";

import StatsTitle from "./StatsTitle";

import stats from "../../utils/stats";
import format from "../../utils/format";
import collection from "../../utils/collection";
import config from "../../utils/config";

const doughnutOptions = {
  legend: {
    display: false,
  },
};

const Stats = ({ gallery, lang, countryData }) => {
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

  const compareWithNaN = (a, b, f) => {
    if (isNaN(a) && isNaN(b)) return 0;
    if (isNaN(a)) return 1;
    if (isNaN(b)) return -1;
    return f();
  };
  const numSortByKeyDesc = (a, b) =>
    compareWithNaN(a.key, b.key, () => b.key - a.key);
  const numSortByKeyAsc = (a, b) =>
    compareWithNaN(a.key, b.key, () => a.key - b.key);
  const numSortByValueDesc = (a, b) =>
    compareWithNaN(a.value, b.value, () => b.value - a.value);

  const foldToArray = (
    data,
    fmt = format.identity,
    sort = numSortByValueDesc
  ) =>
    Object.keys(data)
      .map((key) => {
        return {
          key: key !== "undefined" ? key : t("stats-unknown"),
          value: data[key],
        };
      })
      .sort(sort)
      .map(formatKey(fmt));

  const mapToChartJs = (data, maxEntries = 10) => {
    const doMap = (data) => {
      const valueIndex = Object.fromEntries(
        data
          .map((_) => Number(_.value))
          .sort((a, b) => b - a)
          .map((value, i) => [value, i])
      );
      const colorGradients = stats.colorGradient(
        [0, 0, 68],
        [221, 221, 255],
        data.length
      );
      const colors = data
        .map((_) => Number(_.value))
        .map((value) => colorGradients[valueIndex[value]]);
      return {
        labels: data.map((_) => _.key),
        datasets: [
          {
            data: data.map((_) => _.value),
            backgroundColor: colors,
          },
        ],
      };
    };
    if (maxEntries > 0 && data.length > maxEntries) {
      const other = data
        .slice(maxEntries)
        .map((_) => _.value)
        .reduce((a, b) => a + b, 0);
      return doMap([
        ...data.slice(0, maxEntries),
        { key: t("stats-other"), value: other },
      ]);
    }
    return doMap(data);
  };

  const share = (value) => Math.floor((value / data.count.total) * 1000) / 10;

  const formatKey = (format) => (entry) => {
    return {
      key: `${format(entry.key)} (${share(entry.value)}%)`,
      value: entry.value,
    };
  };

  // console.log("data", data);

  const byAuthor = foldToArray(data.count.byAuthor);
  const byAuthorData = mapToChartJs(byAuthor);

  const byCountry = foldToArray(data.count.byCountry, (key) =>
    format.countryName(key, lang, countryData)
  );
  const byCountryData = mapToChartJs(byCountry);

  // TODO: year/month distribution, average per day, total days, ...

  const byYear = foldToArray(
    data.count.byTime.byYear,
    format.identity,
    numSortByKeyAsc
  );
  const byYearData = mapToChartJs(byYear, 0);
  const byMonthOfYear = foldToArray(
    data.count.byTime.byMonthOfYear,
    (month) => t(`month-long-${month}`),
    numSortByKeyAsc
  );
  const byMonthOfYearData = mapToChartJs(byMonthOfYear, 12);
  const byDayOfWeek = foldToArray(
    collection.transformObjectKeys(data, (dow) => {
      const key = dow < config.FIRST_WEEKDAY ? Number(dow) + 7 : dow;
      return [key, data.count.byTime.byDayOfWeek[dow]];
    }),
    (dow) => t(`weekday-long-${format.dayOfWeek(dow)}`),
    numSortByKeyAsc
  );
  const byDayOfWeekData = mapToChartJs(byDayOfWeek);
  const byHourOfDay = foldToArray(
    data.count.byTime.byHourOfDay,
    format.identity,
    numSortByKeyAsc
  );
  const byHourOfDayData = mapToChartJs(byHourOfDay, 24);

  const byCameraMake = foldToArray(data.count.byGear.byCameraMake);
  const byCameraMakeData = mapToChartJs(byCameraMake);
  const byCamera = foldToArray(data.count.byGear.byCamera);
  const byCameraData = mapToChartJs(byCamera);
  const byLens = foldToArray(data.count.byGear.byLens);
  const byLensData = mapToChartJs(byLens);
  const byCameraLens = foldToArray(data.count.byGear.byCameraLens);
  const byCameraLensData = mapToChartJs(byCameraLens);

  const byFocalLength = foldToArray(
    data.count.byExposure.byFocalLength,
    format.focalLength,
    numSortByKeyAsc
  );
  const byFocalLengthData = mapToChartJs(byFocalLength, 0);
  const byAperture = foldToArray(
    data.count.byExposure.byAperture,
    format.aperture,
    numSortByKeyAsc
  );
  const byApertureData = mapToChartJs(byAperture, 0);
  const byExposureTime = foldToArray(
    data.count.byExposure.byExposureTime,
    format.exposureTime,
    numSortByKeyDesc
  );
  const byExposureTimeData = mapToChartJs(byExposureTime, 0);
  const byIso = foldToArray(
    data.count.byExposure.byIso,
    format.iso,
    numSortByKeyAsc
  );
  const byIsoData = mapToChartJs(byIso, 0);
  const byExposureValue = foldToArray(
    data.count.byExposure.byExposureValue,
    format.identity,
    numSortByKeyAsc
  );
  const byExposureValueData = mapToChartJs(byExposureValue, 0);
  const byLightValue = foldToArray(
    data.count.byExposure.byLightValue,
    format.identity,
    numSortByKeyAsc
  );
  const byLightValueData = mapToChartJs(byLightValue, 0);

  return (
    <>
      <StatsTitle gallery={gallery} />
      <div className="stats content">
        <div>Total: {data.count.total}</div>
        <section name="general" className="category">
          <h3>
            <Trans>stats-category-general</Trans>
          </h3>
          <section className="category-content">
            <div className="chart">
              <h3>
                <Trans>stats-chart-author</Trans>
              </h3>
              <Doughnut data={byAuthorData} options={doughnutOptions} />
            </div>
            <div className="chart">
              <h3>
                <Trans>stats-chart-country</Trans>
              </h3>
              <Doughnut data={byCountryData} options={doughnutOptions} />
            </div>
          </section>
        </section>
        <section name="time" className="category">
          <h3>
            <Trans>stats-category-time</Trans>
          </h3>
          <section className="category-content">
            <div className="chart">
              <h3>
                <Trans>stats-chart-year</Trans>
              </h3>
              <Doughnut data={byYearData} options={doughnutOptions} />
            </div>
            <div className="chart">
              <h3>
                <Trans>stats-chart-month</Trans>
              </h3>
              <Doughnut data={byMonthOfYearData} options={doughnutOptions} />
            </div>
            <div className="chart">
              <h3>
                <Trans>stats-chart-weekday</Trans>
              </h3>
              <Doughnut data={byDayOfWeekData} options={doughnutOptions} />
            </div>
            <div className="chart">
              <h3>
                <Trans>stats-chart-hour</Trans>
              </h3>
              <Doughnut data={byHourOfDayData} options={doughnutOptions} />
            </div>
          </section>
        </section>
        <section name="gear" className="category">
          <h3>
            <Trans>stats-category-gear</Trans>
          </h3>
          <section className="category-content">
            <div className="chart">
              <h3>
                <Trans>stats-chart-camera-make</Trans>
              </h3>
              <Doughnut data={byCameraMakeData} options={doughnutOptions} />
            </div>
            <div className="chart">
              <h3>
                <Trans>stats-chart-camera</Trans>
              </h3>
              <Doughnut data={byCameraData} options={doughnutOptions} />
            </div>
            <div className="chart">
              <h3>
                <Trans>stats-chart-lens</Trans>
              </h3>
              <Doughnut data={byLensData} options={doughnutOptions} />
            </div>
            <div className="chart">
              <h3>
                <Trans>stats-chart-camera-lens</Trans>
              </h3>
              <Doughnut data={byCameraLensData} options={doughnutOptions} />
            </div>
          </section>
        </section>
        <section name="exposure" className="category">
          <h3>
            <Trans>stats-category-exposure</Trans>
          </h3>
          <section className="category-content">
            <div className="chart">
              <h3>
                <Trans>stats-chart-focal-length</Trans>
              </h3>
              <Doughnut data={byFocalLengthData} options={doughnutOptions} />
            </div>
            <div className="chart">
              <h3>
                <Trans>stats-chart-aperture</Trans>
              </h3>
              <Doughnut data={byApertureData} options={doughnutOptions} />
            </div>
            <div className="chart">
              <h3>
                <Trans>stats-chart-exposure-time</Trans>
              </h3>
              <Doughnut data={byExposureTimeData} options={doughnutOptions} />
            </div>
            <div className="chart">
              <h3>
                <Trans>stats-chart-iso</Trans>
              </h3>
              <Doughnut data={byIsoData} options={doughnutOptions} />
            </div>
            <div className="chart">
              <h3>
                <Trans>stats-chart-ev</Trans>
              </h3>
              <Doughnut data={byExposureValueData} options={doughnutOptions} />
            </div>
            <div className="chart">
              <h3>
                <Trans>stats-chart-lv</Trans>
              </h3>
              <Doughnut data={byLightValueData} options={doughnutOptions} />
            </div>
          </section>
        </section>
        <section id="raw-data">
          <div className="category">
            <div className="content">
              <div className="data">
                <h3>Author</h3>
                <ul>
                  {byAuthor.map((entry) => (
                    <li key={entry.key}>
                      {entry.key}: {entry.value} ({share(entry.value)}%)
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="content">
              <div className="data">
                <h3>Country</h3>
                <ul>
                  {byCountry.map((entry) => (
                    <li key={entry.key}>
                      {entry.key}: {entry.value} ({share(entry.value)}%)
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <div className="category">
            <div className="content">
              <div className="data">
                <h3>Camera Make</h3>
                <ul>
                  {byCameraMake.map((entry) => (
                    <li key={entry.key}>
                      {entry.key}: {entry.value} ({share(entry.value)}%)
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="content">
              <div className="data">
                <h3>Camera</h3>
                <ul>
                  {byCamera.map((entry) => (
                    <li key={entry.key}>
                      {entry.key}: {entry.value} ({share(entry.value)}%)
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="content">
              <div className="data">
                <h3>Lens</h3>
                <ul>
                  {byLens.map((entry) => (
                    <li key={entry.key}>
                      {entry.key}: {entry.value} ({share(entry.value)}%)
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="content">
              <div className="data">
                <h3>Camera + Lens</h3>
                <ul>
                  {byCameraLens.map((entry) => (
                    <li key={entry.key}>
                      {entry.key}: {entry.value} ({share(entry.value)}%)
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <div className="category">
            <div className="content">
              <div className="data">
                <h3>Focal Length</h3>
                <ul>
                  {byFocalLength.map((entry) => (
                    <li key={entry.key}>
                      {format.focalLength(entry.key)}: {entry.value} (
                      {share(entry.value)}%)
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="content">
              <div className="data">
                <h3>Aperture</h3>
                <ul>
                  {byAperture.map((entry) => (
                    <li key={entry.key}>
                      {format.aperture(entry.key)}: {entry.value} (
                      {share(entry.value)}%)
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="content">
              <div className="data">
                <h3>Exposure Time</h3>
                <ul>
                  {byExposureTime.map((entry) => (
                    <li key={entry.key}>
                      {format.exposureTime(entry.key)} / {entry.key}:{" "}
                      {entry.value} ({share(entry.value)}%)
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="content">
              <div className="data">
                <h3>ISO</h3>
                <ul>
                  {byIso.map((entry) => (
                    <li key={entry.key}>
                      {format.iso(entry.key)}: {entry.value} (
                      {share(entry.value)}% )
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
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
