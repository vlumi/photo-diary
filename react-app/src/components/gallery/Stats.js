import React from "react";
import PropTypes from "prop-types";
import { Trans, useTranslation } from "react-i18next";
import styled from "styled-components";

import { Doughnut } from "react-chartjs-2";

import StatsTitle from "./StatsTitle";
import FlagIcon from "../FlagIcon";

import stats from "../../utils/stats";
import format from "../../utils/format";
import collection from "../../utils/collection";
import config from "../../utils/config";

const StyledRoot = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-items: flex-start;
`;
const StyledCategory = styled.section`
  width: 100%;
  display: flex;
  flex-wrap: nowrap;
  justify-content: flex-start;
`;
const StyledCategoryTitle = styled.h3`
  text-align: left;
  writing-mode: vertical-rl;
`;
const StyledCharts = styled.section`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
`;
const StyledChart = styled.div`
  width: 300px;
`;
const StyledChartTitle = styled.h3``;
const StyledPieContainer = styled.div`
  margin: 5px 0;
`;
const StyledRawContainer = styled.table`
  width: 100%;
  text-align: left;
  margin: 0;
  padding: 0;
  font-size: xx-small;
  border-spacing: 0;
  border-collapse: collapse;
`;
const StyledRawBlock = styled.tbody``;
const StyledRawRow = styled.tr`
  &:hover {
    color: var(--header-color);
    background-color: var(--header-background);
  }
`;
const StyledRawCol = styled.td`
  padding: 0 10px;
  vertical-align: top;
  text-align: ${(props) => (props.col === 0 ? "left" : "right")};
  overflow: hidden;
`;

const Stats = ({ gallery, lang, countryData }) => {
  const [data, setData] = React.useState(undefined);

  const { t } = useTranslation();
  const numberFormatter = new Intl.NumberFormat(lang).format;

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

  const encodePieKey = (format) => (entry) => {
    return {
      key: [format(entry.key), share(entry.value)],
      value: entry.value,
    };
  };
  const decodePieKey = (key, value) =>
    ` ${key[0]}: ${numberFormatter(value)} (${key[1]}%)`;

  const doughnutOptions = {
    legend: {
      display: false,
    },
    animation: {
      animateRotate: false,
      animateScale: false,
    },
    cutoutPercentage: 0,
    tooltips: {
      mode: "label",
      callbacks: {
        label: (tooltipItem, data) =>
          decodePieKey(
            data.labels[tooltipItem.index],
            data.datasets[0].data[tooltipItem.index]
          ),
      },
    },
  };

  const defaultToUnknown = (key) =>
    key && key !== "N/A" && key !== "undefined" ? key : t("stats-unknown");

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

  const share = (value) => Math.floor((value / data.count.total) * 1000) / 10;

  const foldToArray = (data, sorter = numSortByValueDesc) =>
    Object.keys(data)
      .map((key) => {
        return {
          key: defaultToUnknown(key),
          value: data[key],
        };
      })
      .sort(sorter);

  const mapToPieChartData = (
    data,
    formatter = format.identity,
    maxEntries = 0
  ) => {
    const doMap = (data) => {
      const valueRanks = Object.fromEntries(
        data
          .map((_) => Number(_.value))
          .sort((a, b) => b - a)
          .map((value, i) => [value, i])
      );
      const colorGradients = stats.colorGradient(
        // TODO: from configured theme: --header-background -> --header-color
        "#004",
        "#ddf",
        data.length
      );
      const borderColor = "#fff";
      const colors = data
        .map((_) => Number(_.value))
        .map((value) => colorGradients[valueRanks[value]]);
      return {
        labels: data.map(encodePieKey(formatter)).map((_) => _.key),
        datasets: [
          {
            data: data.map((_) => _.value),
            backgroundColor: colors,
            borderColor,
            borderWidth: 0.25,
            hoverBackgroundColor: "#0044",
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

  // console.log("data", data);

  const byAuthor = foldToArray(data.count.byAuthor);
  const byAuthorData = mapToPieChartData(byAuthor);

  const byCountry = foldToArray(data.count.byCountry);
  const byCountryData = mapToPieChartData(byCountry, (key) =>
    format.countryName(key, lang, countryData)
  );

  // TODO: year/month distribution, average per day, total days, ...

  const byYear = foldToArray(data.count.byTime.byYear, numSortByKeyAsc);
  const byYearData = mapToPieChartData(byYear, format.identity, 0);
  const byMonthOfYear = foldToArray(
    data.count.byTime.byMonthOfYear,
    numSortByKeyAsc
  );
  const byMonthOfYearData = mapToPieChartData(
    byMonthOfYear,
    (month) => t(`month-long-${month}`),
    12
  );
  const byDayOfWeek = foldToArray(
    collection.transformObjectKeys(data, (dow) => {
      const key = dow < config.FIRST_WEEKDAY ? Number(dow) + 7 : dow;
      return [key, data.count.byTime.byDayOfWeek[dow]];
    }),
    numSortByKeyAsc
  );
  const byDayOfWeekData = mapToPieChartData(byDayOfWeek, (dow) =>
    t(`weekday-long-${format.dayOfWeek(dow)}`)
  );
  const byHourOfDay = foldToArray(
    data.count.byTime.byHourOfDay,
    numSortByKeyAsc
  );
  const byHourOfDayData = mapToPieChartData(byHourOfDay, format.identity, 24);

  const byCameraMake = foldToArray(data.count.byGear.byCameraMake);
  const byCameraMakeData = mapToPieChartData(byCameraMake);
  const byCamera = foldToArray(data.count.byGear.byCamera);
  const byCameraData = mapToPieChartData(byCamera);
  const byLens = foldToArray(data.count.byGear.byLens);
  const byLensData = mapToPieChartData(byLens);
  const byCameraLens = foldToArray(data.count.byGear.byCameraLens);
  const byCameraLensData = mapToPieChartData(byCameraLens);

  const byFocalLength = foldToArray(
    data.count.byExposure.byFocalLength,
    numSortByKeyAsc
  );
  const byFocalLengthData = mapToPieChartData(
    byFocalLength,
    format.focalLength,
    0
  );
  const byAperture = foldToArray(
    data.count.byExposure.byAperture,
    numSortByKeyAsc
  );
  const byApertureData = mapToPieChartData(byAperture, format.aperture, 0);
  const byExposureTime = foldToArray(
    data.count.byExposure.byExposureTime,
    numSortByKeyDesc
  );
  const byExposureTimeData = mapToPieChartData(
    byExposureTime,
    format.exposureTime,
    0
  );
  const byIso = foldToArray(data.count.byExposure.byIso, numSortByKeyAsc);
  const byIsoData = mapToPieChartData(byIso, format.iso, 0);
  const byExposureValue = foldToArray(
    data.count.byExposure.byExposureValue,
    numSortByKeyAsc
  );
  const byExposureValueData = mapToPieChartData(
    byExposureValue,
    format.identity,
    0
  );
  const byLightValue = foldToArray(
    data.count.byExposure.byLightValue,
    numSortByKeyAsc
  );
  const byLightValueData = mapToPieChartData(byLightValue, format.identity, 0);

  const charts = [
    {
      name: "general",
      title: <Trans>stats-category-general</Trans>,
      charts: [
        {
          name: "author",
          title: <Trans>stats-chart-author</Trans>,
          pie: <Doughnut data={byAuthorData} options={doughnutOptions} />,
          raw: byAuthor.map((entry) => [
            entry.key,
            numberFormatter(entry.value),
            `${share(entry.value)}%`,
          ]),
        },
        {
          name: "country",
          title: <Trans>stats-chart-country</Trans>,
          pie: <Doughnut data={byCountryData} options={doughnutOptions} />,
          raw: byCountry.map((entry) => [
            <>
              <FlagIcon code={entry.key} />{" "}
              {format.countryName(entry.key, lang, countryData)}
            </>,
            numberFormatter(entry.value),
            `${share(entry.value)}%`,
          ]),
        },
      ],
    },
    {
      name: "time",
      title: <Trans>stats-category-time</Trans>,
      charts: [
        {
          name: "year",
          title: <Trans>stats-chart-year</Trans>,
          pie: <Doughnut data={byYearData} options={doughnutOptions} />,
          raw: byYear.map((entry) => [
            entry.key,
            numberFormatter(entry.value),
            `${share(entry.value)}%`,
          ]),
        },
        {
          name: "month",
          title: <Trans>stats-chart-month</Trans>,
          pie: <Doughnut data={byMonthOfYearData} options={doughnutOptions} />,
          raw: byMonthOfYear.map((entry) => [
            t(`month-long-${entry.key}`),
            numberFormatter(entry.value),
            `${share(entry.value)}%`,
          ]),
        },
        {
          name: "weekday",
          title: <Trans>stats-chart-weekday</Trans>,
          pie: <Doughnut data={byDayOfWeekData} options={doughnutOptions} />,
          raw: byDayOfWeek.map((entry) => [
            t(`weekday-long-${format.dayOfWeek(entry.key)}`),
            numberFormatter(entry.value),
            `${share(entry.value)}%`,
          ]),
        },
        {
          name: "hour",
          title: <Trans>stats-chart-hour</Trans>,
          pie: <Doughnut data={byHourOfDayData} options={doughnutOptions} />,
          raw: byHourOfDay.map((entry) => [
            `${format.padNumber(entry.key, 2)}:00–`,
            numberFormatter(entry.value),
            `${share(entry.value)}%`,
          ]),
        },
      ],
    },
    {
      name: "gear",
      title: <Trans>stats-category-gear</Trans>,
      charts: [
        {
          name: "camera-make",
          title: <Trans>stats-chart-camera-make</Trans>,
          pie: <Doughnut data={byCameraMakeData} options={doughnutOptions} />,
          raw: byCameraMake.map((entry) => [
            entry.key,
            numberFormatter(entry.value),
            `${share(entry.value)}%`,
          ]),
        },
        {
          name: "camera",
          title: <Trans>stats-chart-camera</Trans>,
          pie: <Doughnut data={byCameraData} options={doughnutOptions} />,
          raw: byCamera.map((entry) => [
            entry.key,
            numberFormatter(entry.value),
            `${share(entry.value)}%`,
          ]),
        },
        {
          name: "lens",
          title: <Trans>stats-chart-lens</Trans>,
          pie: <Doughnut data={byLensData} options={doughnutOptions} />,
          raw: byLens.map((entry) => [
            entry.key,
            numberFormatter(entry.value),
            `${share(entry.value)}%`,
          ]),
        },
        {
          name: "camera-lens",
          title: <Trans>stats-chart-camera-lens</Trans>,
          pie: <Doughnut data={byCameraLensData} options={doughnutOptions} />,
          raw: byCameraLens.map((entry) => [
            entry.key,
            numberFormatter(entry.value),
            `${share(entry.value)}%`,
          ]),
        },
      ],
    },
    {
      name: "exposure",
      title: <Trans>stats-category-exposure</Trans>,
      charts: [
        {
          name: "focal-length",
          title: <Trans>stats-chart-focal-length</Trans>,
          pie: <Doughnut data={byFocalLengthData} options={doughnutOptions} />,
          raw: byFocalLength.map((entry) => [
            defaultToUnknown(format.focalLength(entry.key)),
            numberFormatter(entry.value),
            `${share(entry.value)}%`,
          ]),
        },
        {
          name: "aperture",
          title: <Trans>stats-chart-aperture</Trans>,
          pie: <Doughnut data={byApertureData} options={doughnutOptions} />,
          raw: byAperture.map((entry) => [
            defaultToUnknown(format.aperture(entry.key)),
            numberFormatter(entry.value),
            `${share(entry.value)}%`,
          ]),
        },
        {
          name: "exposure-time",
          title: <Trans>stats-chart-exposure-time</Trans>,
          pie: <Doughnut data={byExposureTimeData} options={doughnutOptions} />,
          raw: byExposureTime.map((entry) => [
            defaultToUnknown(format.exposureTime(entry.key)),
            numberFormatter(entry.value),
            `${share(entry.value)}%`,
          ]),
        },
        {
          name: "iso",
          title: <Trans>stats-chart-iso</Trans>,
          pie: <Doughnut data={byIsoData} options={doughnutOptions} />,
          raw: byIso.map((entry) => [
            defaultToUnknown(format.iso(entry.key)),
            numberFormatter(entry.value),
            `${share(entry.value)}%`,
          ]),
        },
        {
          name: "ev",
          title: <Trans>stats-chart-ev</Trans>,
          pie: (
            <Doughnut data={byExposureValueData} options={doughnutOptions} />
          ),
          raw: byExposureValue.map((entry) => [
            defaultToUnknown(entry.key),
            numberFormatter(entry.value),
            `${share(entry.value)}%`,
          ]),
        },
        {
          name: "lv",
          title: <Trans>stats-chart-lv</Trans>,
          pie: <Doughnut data={byLightValueData} options={doughnutOptions} />,
          raw: byLightValue.map((entry) => [
            defaultToUnknown(entry.key),
            numberFormatter(entry.value),
            `${share(entry.value)}%`,
          ]),
        },
      ],
    },
  ];

  return (
    <>
      <StatsTitle gallery={gallery} />
      <StyledRoot>
        <div>Total: {data.count.total}</div>
        {charts.map((category) => (
          <StyledCategory key={category.name} name={category.name}>
            <StyledCategoryTitle>{category.title}</StyledCategoryTitle>
            <StyledCharts>
              {category.charts.map((chart) => (
                <StyledChart key={`${category.name}:${chart.name}`}>
                  <StyledChartTitle>{chart.title}</StyledChartTitle>
                  <StyledPieContainer>{chart.pie}</StyledPieContainer>
                  {chart.raw ? (
                    <StyledRawContainer>
                      <StyledRawBlock>
                        {chart.raw.map((values, i) => (
                          <StyledRawRow
                            key={`${category.name}:${chart.name}:${i}`}
                          >
                            {values.map((value, j) => (
                              <StyledRawCol
                                key={`${category.name}:${chart.name}:${i}${j}`}
                                col={j}
                              >
                                {value}
                              </StyledRawCol>
                            ))}
                          </StyledRawRow>
                        ))}
                      </StyledRawBlock>
                    </StyledRawContainer>
                  ) : (
                    <></>
                  )}
                </StyledChart>
              ))}
            </StyledCharts>
          </StyledCategory>
        ))}
      </StyledRoot>
    </>
  );
};

Stats.propTypes = {
  gallery: PropTypes.object.isRequired,
  lang: PropTypes.string.isRequired,
  countryData: PropTypes.object.isRequired,
};
export default Stats;
