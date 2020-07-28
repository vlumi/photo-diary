import React from "react";
import PropTypes from "prop-types";
import { Trans, useTranslation } from "react-i18next";
import styled from "styled-components";

import { Doughnut, Polar, HorizontalBar } from "react-chartjs-2";

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
const StyledTopic = styled.section`
  width: 100%;
  display: flex;
  flex-wrap: nowrap;
  justify-content: flex-start;
`;
const StyledTopicTitle = styled.h3`
  text-align: left;
  writing-mode: vertical-rl;
`;
const StyledCategories = styled.section`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
`;
const StyledCategory = styled.div`
  width: 330px;
`;
const StyledCategoryTitle = styled.h3``;
const StyledChartsContainer = styled.div`
  margin: 5px;
  width: 100%;
  height: 200px;
  display: flex;
  justify-content: center;
  align-items: stretch;
  flex-wrap: nowrap;
`;
const StyledPieContainer = styled.div`
  width: 150px;
  flex-grow: 1;
  flex-shrink: 1;
  margin: 0 2px;
`;
const StyledBarContainer = styled.div`
  max-width: 150px;
  flex-grow: 1;
  flex-shrink: 1;
  margin: 0 2px;
`;
const StyledRawContainer = styled.table`
  width: 100%;
  text-align: left;
  margin: 0;
  padding: 0;
  font-size: x-small;
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
    responsive: true,
    maintainAspectRatio: false,
    tooltips: {
      mode: "label",
      callbacks: {
        title: () => "",
        label: (tooltipItem, data) =>
          decodePieKey(
            data.labels[tooltipItem.index],
            data.datasets[0].data[tooltipItem.index]
          ),
      },
    },
  };
  const barOptions = {
    legend: {
      display: false,
    },
    scales: {
      xAxes: [
        {
          offset: true,
          display: false,
          ticks: {
            beginAtZero: true,
          },
        },
      ],
      yAxes: [
        {
          offset: true,
          display: false,
          ticks: {
            beginAtZero: true,
          },
        },
      ],
    },
    responsive: true,
    maintainAspectRatio: false,
    tooltips: {
      mode: "label",
      callbacks: {
        title: () => "",
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

  const mapToPieData = (data, formatter = format.identity, maxEntries = 0) => {
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
      const colors = data
        .map((_) => Number(_.value))
        .map((value) => colorGradients[valueRanks[value]]);
      return {
        labels: data.map(encodePieKey(formatter)).map((_) => _.key),
        datasets: [
          {
            data: data.map((_) => _.value),
            backgroundColor: colors,
            borderWidth: 0.25,
            barThickness: "flex",
            minBarLength: 3,
            barPercentage: 1,
            categoryPercentage: 1,
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

  // TODO: year/month distribution, average per day, total days, ...

  const collectGeneral = () => {
    const byAuthor = foldToArray(data.count.byAuthor);
    const byAuthorData = mapToPieData(byAuthor);

    const byCountry = foldToArray(data.count.byCountry);
    const byCountryData = mapToPieData(byCountry, (key) =>
      format.countryName(key, lang, countryData)
    );
    return {
      name: "general",
      title: <Trans>stats-topic-general</Trans>,
      categories: [
        {
          name: "author",
          title: <Trans>stats-category-author</Trans>,
          pie: (
            <>
              <StyledPieContainer>
                <Doughnut data={byAuthorData} options={doughnutOptions} />
              </StyledPieContainer>
              <StyledBarContainer>
                <HorizontalBar data={byAuthorData} options={barOptions} />
              </StyledBarContainer>
            </>
          ),
          raw: byAuthor.map((entry) => [
            entry.key,
            numberFormatter(entry.value),
            `${share(entry.value)}%`,
          ]),
        },
        {
          name: "country",
          title: <Trans>stats-category-country</Trans>,
          pie: (
            <>
              <StyledPieContainer>
                <Doughnut data={byCountryData} options={doughnutOptions} />
              </StyledPieContainer>
              <StyledBarContainer>
                <HorizontalBar data={byCountryData} options={barOptions} />
              </StyledBarContainer>
            </>
          ),
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
    };
  };

  const collectTime = () => {
    const byYear = foldToArray(data.count.byTime.byYear, numSortByKeyAsc);
    const byYearData = mapToPieData(byYear, format.identity, 0);
    const byMonthOfYear = foldToArray(
      data.count.byTime.byMonthOfYear,
      numSortByKeyAsc
    );
    const byMonthOfYearData = mapToPieData(
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
    const byDayOfWeekData = mapToPieData(byDayOfWeek, (dow) =>
      t(`weekday-long-${format.dayOfWeek(dow)}`)
    );
    const byHourOfDay = foldToArray(
      data.count.byTime.byHourOfDay,
      numSortByKeyAsc
    );
    const byHourOfDayData = mapToPieData(byHourOfDay, format.identity, 24);
    return {
      name: "time",
      title: <Trans>stats-topic-time</Trans>,
      categories: [
        {
          name: "year",
          title: <Trans>stats-category-year</Trans>,
          pie: (
            <>
              <StyledPieContainer>
                <Doughnut data={byYearData} options={doughnutOptions} />
              </StyledPieContainer>
              <StyledBarContainer>
                <HorizontalBar data={byYearData} options={barOptions} />
              </StyledBarContainer>
            </>
          ),
          raw: byYear.map((entry) => [
            entry.key,
            numberFormatter(entry.value),
            `${share(entry.value)}%`,
          ]),
        },
        {
          name: "month",
          title: <Trans>stats-category-month</Trans>,
          pie: (
            <>
              <StyledPieContainer>
                <Polar data={byMonthOfYearData} options={doughnutOptions} />
              </StyledPieContainer>
              <StyledBarContainer>
                <HorizontalBar data={byMonthOfYearData} options={barOptions} />
              </StyledBarContainer>
            </>
          ),
          raw: byMonthOfYear.map((entry) => [
            t(`month-long-${entry.key}`),
            numberFormatter(entry.value),
            `${share(entry.value)}%`,
          ]),
        },
        {
          name: "weekday",
          title: <Trans>stats-category-weekday</Trans>,
          pie: (
            <>
              <StyledPieContainer>
                <Polar data={byDayOfWeekData} options={doughnutOptions} />
              </StyledPieContainer>
              <StyledBarContainer>
                <HorizontalBar data={byDayOfWeekData} options={barOptions} />
              </StyledBarContainer>
            </>
          ),
          raw: byDayOfWeek.map((entry) => [
            t(`weekday-long-${format.dayOfWeek(entry.key)}`),
            numberFormatter(entry.value),
            `${share(entry.value)}%`,
          ]),
        },
        {
          name: "hour",
          title: <Trans>stats-category-hour</Trans>,
          pie: (
            <>
              <StyledPieContainer>
                <Polar data={byHourOfDayData} options={doughnutOptions} />
              </StyledPieContainer>
              <StyledBarContainer>
                <HorizontalBar data={byHourOfDayData} options={barOptions} />
              </StyledBarContainer>
            </>
          ),
          raw: byHourOfDay.map((entry) => [
            `${format.padNumber(entry.key, 2)}:00–`,
            numberFormatter(entry.value),
            `${share(entry.value)}%`,
          ]),
        },
      ],
    };
  };

  const collectGear = () => {
    const byCameraMake = foldToArray(data.count.byGear.byCameraMake);
    const byCameraMakeData = mapToPieData(byCameraMake);
    const byCamera = foldToArray(data.count.byGear.byCamera);
    const byCameraData = mapToPieData(byCamera);
    const byLens = foldToArray(data.count.byGear.byLens);
    const byLensData = mapToPieData(byLens);
    const byCameraLens = foldToArray(data.count.byGear.byCameraLens);
    const byCameraLensData = mapToPieData(byCameraLens);
    return {
      name: "gear",
      title: <Trans>stats-topic-gear</Trans>,
      categories: [
        {
          name: "camera-make",
          title: <Trans>stats-category-camera-make</Trans>,
          pie: (
            <>
              <StyledPieContainer>
                <Doughnut data={byCameraMakeData} options={doughnutOptions} />
              </StyledPieContainer>
              <StyledBarContainer>
                <HorizontalBar data={byCameraMakeData} options={barOptions} />
              </StyledBarContainer>
            </>
          ),
          raw: byCameraMake.map((entry) => [
            entry.key,
            numberFormatter(entry.value),
            `${share(entry.value)}%`,
          ]),
        },
        {
          name: "camera",
          title: <Trans>stats-category-camera</Trans>,
          pie: (
            <>
              <StyledPieContainer>
                <Doughnut data={byCameraData} options={doughnutOptions} />
              </StyledPieContainer>
              <StyledBarContainer>
                <HorizontalBar data={byCameraData} options={barOptions} />
              </StyledBarContainer>
            </>
          ),
          raw: byCamera.map((entry) => [
            entry.key,
            numberFormatter(entry.value),
            `${share(entry.value)}%`,
          ]),
        },
        {
          name: "lens",
          title: <Trans>stats-category-lens</Trans>,
          pie: (
            <>
              <StyledPieContainer>
                <Doughnut data={byLensData} options={doughnutOptions} />
              </StyledPieContainer>
              <StyledBarContainer>
                <HorizontalBar data={byLensData} options={barOptions} />
              </StyledBarContainer>
            </>
          ),
          raw: byLens.map((entry) => [
            entry.key,
            numberFormatter(entry.value),
            `${share(entry.value)}%`,
          ]),
        },
        {
          name: "camera-lens",
          title: <Trans>stats-category-camera-lens</Trans>,
          pie: (
            <>
              <StyledPieContainer>
                <Doughnut data={byCameraLensData} options={doughnutOptions} />
              </StyledPieContainer>
              <StyledBarContainer>
                <HorizontalBar data={byCameraLensData} options={barOptions} />
              </StyledBarContainer>
            </>
          ),
          raw: byCameraLens.map((entry) => [
            entry.key,
            numberFormatter(entry.value),
            `${share(entry.value)}%`,
          ]),
        },
      ],
    };
  };

  const collectExposure = () => {
    const byFocalLength = foldToArray(
      data.count.byExposure.byFocalLength,
      numSortByKeyAsc
    );
    const byFocalLengthData = mapToPieData(
      byFocalLength,
      format.focalLength,
      0
    );
    const byAperture = foldToArray(
      data.count.byExposure.byAperture,
      numSortByKeyAsc
    );
    const byApertureData = mapToPieData(byAperture, format.aperture, 0);
    const byExposureTime = foldToArray(
      data.count.byExposure.byExposureTime,
      numSortByKeyDesc
    );
    const byExposureTimeData = mapToPieData(
      byExposureTime,
      format.exposureTime,
      0
    );
    const byIso = foldToArray(data.count.byExposure.byIso, numSortByKeyAsc);
    const byIsoData = mapToPieData(byIso, format.iso, 0);
    const byExposureValue = foldToArray(
      data.count.byExposure.byExposureValue,
      numSortByKeyAsc
    );
    const byExposureValueData = mapToPieData(
      byExposureValue,
      format.identity,
      0
    );
    const byLightValue = foldToArray(
      data.count.byExposure.byLightValue,
      numSortByKeyAsc
    );
    const byLightValueData = mapToPieData(byLightValue, format.identity, 0);
    return {
      name: "exposure",
      title: <Trans>stats-topic-exposure</Trans>,
      categories: [
        {
          name: "focal-length",
          title: <Trans>stats-category-focal-length</Trans>,
          pie: (
            <>
              <StyledPieContainer>
                <Doughnut data={byFocalLengthData} options={doughnutOptions} />
              </StyledPieContainer>
              <StyledBarContainer>
                <HorizontalBar data={byFocalLengthData} options={barOptions} />
              </StyledBarContainer>
            </>
          ),
          raw: byFocalLength.map((entry) => [
            defaultToUnknown(format.focalLength(entry.key)),
            numberFormatter(entry.value),
            `${share(entry.value)}%`,
          ]),
        },
        {
          name: "aperture",
          title: <Trans>stats-category-aperture</Trans>,
          pie: (
            <>
              <StyledPieContainer>
                <Doughnut data={byApertureData} options={doughnutOptions} />
              </StyledPieContainer>
              <StyledBarContainer>
                <HorizontalBar data={byApertureData} options={barOptions} />
              </StyledBarContainer>
            </>
          ),
          raw: byAperture.map((entry) => [
            defaultToUnknown(format.aperture(entry.key)),
            numberFormatter(entry.value),
            `${share(entry.value)}%`,
          ]),
        },
        {
          name: "exposure-time",
          title: <Trans>stats-category-exposure-time</Trans>,
          pie: (
            <>
              <StyledPieContainer>
                <Doughnut data={byExposureTimeData} options={doughnutOptions} />
              </StyledPieContainer>
              <StyledBarContainer>
                <HorizontalBar data={byExposureTimeData} options={barOptions} />
              </StyledBarContainer>
            </>
          ),
          raw: byExposureTime.map((entry) => [
            defaultToUnknown(format.exposureTime(entry.key)),
            numberFormatter(entry.value),
            `${share(entry.value)}%`,
          ]),
        },
        {
          name: "iso",
          title: <Trans>stats-category-iso</Trans>,
          pie: (
            <>
              <StyledPieContainer>
                <Doughnut data={byIsoData} options={doughnutOptions} />
              </StyledPieContainer>
              <StyledBarContainer>
                <HorizontalBar data={byIsoData} options={barOptions} />
              </StyledBarContainer>
            </>
          ),
          raw: byIso.map((entry) => [
            defaultToUnknown(format.iso(entry.key)),
            numberFormatter(entry.value),
            `${share(entry.value)}%`,
          ]),
        },
        {
          name: "ev",
          title: <Trans>stats-category-ev</Trans>,
          pie: (
            <>
              <StyledPieContainer>
                <Doughnut
                  data={byExposureValueData}
                  options={doughnutOptions}
                />
              </StyledPieContainer>
              <StyledBarContainer>
                <HorizontalBar
                  data={byExposureValueData}
                  options={barOptions}
                />
              </StyledBarContainer>
            </>
          ),
          raw: byExposureValue.map((entry) => [
            defaultToUnknown(entry.key),
            numberFormatter(entry.value),
            `${share(entry.value)}%`,
          ]),
        },
        {
          name: "lv",
          title: <Trans>stats-category-lv</Trans>,
          pie: (
            <>
              <StyledPieContainer>
                <Doughnut data={byLightValueData} options={doughnutOptions} />
              </StyledPieContainer>
              <StyledBarContainer>
                <HorizontalBar data={byLightValueData} options={barOptions} />
              </StyledBarContainer>
            </>
          ),
          raw: byLightValue.map((entry) => [
            defaultToUnknown(entry.key),
            numberFormatter(entry.value),
            `${share(entry.value)}%`,
          ]),
        },
      ],
    };
  };

  const topicData = [
    collectGeneral(),
    collectTime(),
    collectGear(),
    collectExposure(),
  ];

  return (
    <>
      <StatsTitle gallery={gallery} />
      <StyledRoot>
        <div>Total: {data.count.total}</div>
        {topicData.map((topic) => (
          <StyledTopic key={topic.name} name={topic.name}>
            <StyledTopicTitle>{topic.title}</StyledTopicTitle>
            <StyledCategories>
              {topic.categories.map((category) => (
                <StyledCategory key={`${topic.name}:${category.name}`}>
                  <StyledCategoryTitle>{category.title}</StyledCategoryTitle>
                  <StyledChartsContainer>{category.pie}</StyledChartsContainer>
                  {category.raw ? (
                    <StyledRawContainer>
                      <StyledRawBlock>
                        {category.raw.map((values, i) => (
                          <StyledRawRow
                            key={`${topic.name}:${category.name}:${i}`}
                          >
                            {values.map((value, j) => (
                              <StyledRawCol
                                key={`${topic.name}:${category.name}:${i}${j}`}
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
                </StyledCategory>
              ))}
            </StyledCategories>
          </StyledTopic>
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
