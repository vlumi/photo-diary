import React from "react";
import PropTypes from "prop-types";
import { Trans, useTranslation } from "react-i18next";
import styled from "styled-components";

import { Doughnut, Polar, HorizontalBar, Line } from "react-chartjs-2";

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

  const defaultToUnknown = (key) =>
    key && key !== "N/A" && key !== "undefined" ? key : t("stats-unknown");

  const foldToArray = (data, sorter = collection.numSortByValueDesc) =>
    Object.keys(data)
      .map((key) => {
        return {
          key: defaultToUnknown(key),
          value: data[key],
        };
      })
      .sort(sorter);

  const mapToChartData = (
    foldedData,
    formatter = format.identity,
    maxEntries = 0
  ) => {
    const encodeLabelKey = (entry) =>
      collection.transformObjectValue(entry, "key", (entry) => [
        formatter(entry.key),
        format.share(entry.value, data.count.total),
      ]);
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
        labels: data.map(encodeLabelKey).map((_) => _.key),
        datasets: [
          {
            data: data.map((_) => _.value),
            backgroundColor: colors,
            borderWidth: 0.5,
            barThickness: "flex",
            minBarLength: 3,
            barPercentage: 1,
            categoryPercentage: 1,
          },
        ],
      };
    };
    return collection.truncateAndProcess(
      foldedData,
      maxEntries,
      doMap,
      t("stats-other"),
      (data) => data.map((_) => _.value).reduce((a, b) => a + b, 0)
    );
  };

  const decodeLabelKey = (key, value) => {
    const [name, share] = key;
    return ` ${name}: ${numberFormatter(value)} (${share}%)`;
  };
  const chartOptions = {
    common: {
      legend: {
        display: false,
      },
      animation: false,
      responsive: true,
      maintainAspectRatio: false,
      tooltips: {
        mode: "label",
        callbacks: {
          title: () => "",
          label: (tooltipItem, data) =>
            decodeLabelKey(
              data.labels[tooltipItem.index],
              data.datasets[0].data[tooltipItem.index]
            ),
        },
      },
    },
  };
  Object.assign(chartOptions, {
    doughnut: {
      ...chartOptions.common,
      cutoutPercentage: 0,
    },
    polar: {
      ...chartOptions.common,
      scale: {
        ticks: {
          display: false,
        },
      },
    },
    bar: {
      ...chartOptions.common,
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
    },
    line: {
      ...chartOptions.common,
      tooltips: {},
      scales: {
        yAxes: [
          {
            stacked: true,
          },
        ],
      },
    },
  });

  // TODO: year/month distribution, average per day, total days, ...

  const collectGeneral = () => {
    const byAuthor = foldToArray(data.count.byAuthor);
    const byAuthorData = mapToChartData(byAuthor);

    const byCountry = foldToArray(data.count.byCountry);
    const byCountryData = mapToChartData(byCountry, (key) =>
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
                <Doughnut data={byAuthorData} options={chartOptions.doughnut} />
              </StyledPieContainer>
              <StyledBarContainer>
                <HorizontalBar data={byAuthorData} options={chartOptions.bar} />
              </StyledBarContainer>
            </>
          ),
          raw: byAuthor.map((entry) => [
            entry.key,
            numberFormatter(entry.value),
            `${format.share(entry.value, data.count.total)}%`,
          ]),
        },
        {
          name: "country",
          title: <Trans>stats-category-country</Trans>,
          pie: (
            <>
              <StyledPieContainer>
                <Doughnut
                  data={byCountryData}
                  options={chartOptions.doughnut}
                />
              </StyledPieContainer>
              <StyledBarContainer>
                <HorizontalBar
                  data={byCountryData}
                  options={chartOptions.bar}
                />
              </StyledBarContainer>
            </>
          ),
          raw: byCountry.map((entry) => [
            <>
              <FlagIcon code={entry.key} />{" "}
              {format.countryName(entry.key, lang, countryData)}
            </>,
            numberFormatter(entry.value),
            `${format.share(entry.value, data.count.total)}%`,
          ]),
        },
      ],
    };
  };

  const collectTime = () => {
    const byYear = foldToArray(
      data.count.byTime.byYear,
      collection.numSortByKeyAsc
    );
    const byYearData = mapToChartData(byYear, format.identity, 0);

    const byYearMonth = Object.keys(data.count.byTime.byYearMonth)
      .sort((a, b) => a - b)
      .map((year) => {
        const allMonths = collection.objectFromArray(
          [...Array(12).keys()].map((_) => _ + 1),
          0
        );
        const m = {
          ...allMonths,
          ...data.count.byTime.byYearMonth[year],
        };
        return {
          key: year,
          value: foldToArray(m, collection.numSortByKeyAsc).map((entry) =>
            collection.transformObjectValue(entry, "key", (entry) =>
              t(`month-long-${entry.key}`)
            )
          ),
        };
      });
    const mapYearMonthToChartData = (foldedData) => {
      const colorGradients = stats.colorGradient(
        // TODO: from configured theme: --header-background -> --header-color
        "#004",
        "#ddf",
        foldedData.length
      );
      return {
        labels: foldedData[0].value.map((_) => _.key),
        datasets: foldedData.map((entry, i) => {
          return {
            label: entry.key,
            backgroundColor: colorGradients[i],
            data: entry.value.map((_) => _.value),
            fill: true,
            lineTension: 0.4,
          };
        }),
      };
    };
    const byYearMonthData = mapYearMonthToChartData(byYearMonth);
    const byYearMonthFlat = byYearMonth
      .sort((a, b) => a - b)
      .flatMap((year) => {
        return year.value
          .sort((a, b) => a - b)
          .map((month) => {
            return { key: `${year.key} / ${month.key}`, value: month.value };
          });
      });

    const byMonthOfYear = foldToArray(
      data.count.byTime.byMonthOfYear,
      collection.numSortByKeyAsc
    );
    const byMonthOfYearData = mapToChartData(
      byMonthOfYear,
      (month) => t(`month-long-${month}`),
      12
    );
    const byDayOfWeek = foldToArray(
      collection.transformObjectKeys(data.count.byTime.byDayOfWeek, (dow) => {
        const key = dow < config.FIRST_WEEKDAY ? Number(dow) + 7 : dow;
        return [key, data.count.byTime.byDayOfWeek[dow]];
      }),
      collection.numSortByKeyAsc
    );
    const byDayOfWeekData = mapToChartData(byDayOfWeek, (dow) =>
      t(`weekday-long-${format.dayOfWeek(dow)}`)
    );
    const byHourOfDay = foldToArray(
      data.count.byTime.byHourOfDay,
      collection.numSortByKeyAsc
    );
    const byHourOfDayData = mapToChartData(byHourOfDay, format.identity, 24);
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
                <Doughnut data={byYearData} options={chartOptions.doughnut} />
              </StyledPieContainer>
              <StyledBarContainer>
                <HorizontalBar data={byYearData} options={chartOptions.bar} />
              </StyledBarContainer>
            </>
          ),
          raw: byYear.map((entry) => [
            entry.key,
            numberFormatter(entry.value),
            `${format.share(entry.value, data.count.total)}%`,
          ]),
        },
        {
          name: "year-month",
          title: <Trans>stats-category-year-month</Trans>,
          pie: (
            <>
              <StyledPieContainer>
                <Line data={byYearMonthData} options={chartOptions.line} />
              </StyledPieContainer>
            </>
          ),
          raw: byYearMonthFlat.map((entry) => [
            entry.key,
            numberFormatter(entry.value),
            `${format.share(entry.value, data.count.total)}%`,
          ]),
        },
        {
          name: "month",
          title: <Trans>stats-category-month</Trans>,
          pie: (
            <>
              <StyledPieContainer>
                <Polar data={byMonthOfYearData} options={chartOptions.polar} />
              </StyledPieContainer>
              <StyledBarContainer>
                <HorizontalBar
                  data={byMonthOfYearData}
                  options={chartOptions.bar}
                />
              </StyledBarContainer>
            </>
          ),
          raw: byMonthOfYear.map((entry) => [
            t(`month-long-${entry.key}`),
            numberFormatter(entry.value),
            `${format.share(entry.value, data.count.total)}%`,
          ]),
        },
        {
          name: "weekday",
          title: <Trans>stats-category-weekday</Trans>,
          pie: (
            <>
              <StyledPieContainer>
                <Polar data={byDayOfWeekData} options={chartOptions.polar} />
              </StyledPieContainer>
              <StyledBarContainer>
                <HorizontalBar
                  data={byDayOfWeekData}
                  options={chartOptions.bar}
                />
              </StyledBarContainer>
            </>
          ),
          raw: byDayOfWeek.map((entry) => [
            t(`weekday-long-${format.dayOfWeek(entry.key)}`),
            numberFormatter(entry.value),
            `${format.share(entry.value, data.count.total)}%`,
          ]),
        },
        {
          name: "hour",
          title: <Trans>stats-category-hour</Trans>,
          pie: (
            <>
              <StyledPieContainer>
                <Polar data={byHourOfDayData} options={chartOptions.polar} />
              </StyledPieContainer>
              <StyledBarContainer>
                <HorizontalBar
                  data={byHourOfDayData}
                  options={chartOptions.bar}
                />
              </StyledBarContainer>
            </>
          ),
          raw: byHourOfDay.map((entry) => [
            `${format.padNumber(entry.key, 2)}:00–`,
            numberFormatter(entry.value),
            `${format.share(entry.value, data.count.total)}%`,
          ]),
        },
      ],
    };
  };

  const collectGear = () => {
    const byCameraMake = foldToArray(data.count.byGear.byCameraMake);
    const byCameraMakeData = mapToChartData(byCameraMake);
    const byCamera = foldToArray(data.count.byGear.byCamera);
    const byCameraData = mapToChartData(byCamera);
    const byLens = foldToArray(data.count.byGear.byLens);
    const byLensData = mapToChartData(byLens);
    const byCameraLens = foldToArray(data.count.byGear.byCameraLens);
    const byCameraLensData = mapToChartData(byCameraLens, format.identity, 5);
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
                <Doughnut
                  data={byCameraMakeData}
                  options={chartOptions.doughnut}
                />
              </StyledPieContainer>
              <StyledBarContainer>
                <HorizontalBar
                  data={byCameraMakeData}
                  options={chartOptions.bar}
                />
              </StyledBarContainer>
            </>
          ),
          raw: byCameraMake.map((entry) => [
            entry.key,
            numberFormatter(entry.value),
            `${format.share(entry.value, data.count.total)}%`,
          ]),
        },
        {
          name: "camera",
          title: <Trans>stats-category-camera</Trans>,
          pie: (
            <>
              <StyledPieContainer>
                <Doughnut data={byCameraData} options={chartOptions.doughnut} />
              </StyledPieContainer>
              <StyledBarContainer>
                <HorizontalBar data={byCameraData} options={chartOptions.bar} />
              </StyledBarContainer>
            </>
          ),
          raw: byCamera.map((entry) => [
            entry.key,
            numberFormatter(entry.value),
            `${format.share(entry.value, data.count.total)}%`,
          ]),
        },
        {
          name: "lens",
          title: <Trans>stats-category-lens</Trans>,
          pie: (
            <>
              <StyledPieContainer>
                <Doughnut data={byLensData} options={chartOptions.doughnut} />
              </StyledPieContainer>
              <StyledBarContainer>
                <HorizontalBar data={byLensData} options={chartOptions.bar} />
              </StyledBarContainer>
            </>
          ),
          raw: byLens.map((entry) => [
            entry.key,
            numberFormatter(entry.value),
            `${format.share(entry.value, data.count.total)}%`,
          ]),
        },
        {
          name: "camera-lens",
          title: <Trans>stats-category-camera-lens</Trans>,
          pie: (
            <>
              <StyledPieContainer>
                <Doughnut
                  data={byCameraLensData}
                  options={chartOptions.doughnut}
                />
              </StyledPieContainer>
              <StyledBarContainer>
                <HorizontalBar
                  data={byCameraLensData}
                  options={chartOptions.bar}
                />
              </StyledBarContainer>
            </>
          ),
          raw: byCameraLens.map((entry) => [
            entry.key,
            numberFormatter(entry.value),
            `${format.share(entry.value, data.count.total)}%`,
          ]),
        },
      ],
    };
  };

  const collectExposure = () => {
    const byFocalLength = foldToArray(
      data.count.byExposure.byFocalLength,
      collection.numSortByKeyAsc
    );
    const byFocalLengthData = mapToChartData(
      byFocalLength,
      format.focalLength,
      0
    );
    const byAperture = foldToArray(
      data.count.byExposure.byAperture,
      collection.numSortByKeyAsc
    );
    const byApertureData = mapToChartData(byAperture, format.aperture, 0);
    const byExposureTime = foldToArray(
      data.count.byExposure.byExposureTime,
      collection.numSortByKeyDesc
    );
    const byExposureTimeData = mapToChartData(
      byExposureTime,
      format.exposureTime,
      0
    );
    const byIso = foldToArray(
      data.count.byExposure.byIso,
      collection.numSortByKeyAsc
    );
    const byIsoData = mapToChartData(byIso, format.iso, 0);
    const byExposureValue = foldToArray(
      data.count.byExposure.byExposureValue,
      collection.numSortByKeyAsc
    );
    const byExposureValueData = mapToChartData(
      byExposureValue,
      format.identity,
      0
    );
    const byLightValue = foldToArray(
      data.count.byExposure.byLightValue,
      collection.numSortByKeyAsc
    );
    const byLightValueData = mapToChartData(byLightValue, format.identity, 0);
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
                <Doughnut
                  data={byFocalLengthData}
                  options={chartOptions.doughnut}
                />
              </StyledPieContainer>
              <StyledBarContainer>
                <HorizontalBar
                  data={byFocalLengthData}
                  options={chartOptions.bar}
                />
              </StyledBarContainer>
            </>
          ),
          raw: byFocalLength.map((entry) => [
            defaultToUnknown(format.focalLength(entry.key)),
            numberFormatter(entry.value),
            `${format.share(entry.value, data.count.total)}%`,
          ]),
        },
        {
          name: "aperture",
          title: <Trans>stats-category-aperture</Trans>,
          pie: (
            <>
              <StyledPieContainer>
                <Doughnut
                  data={byApertureData}
                  options={chartOptions.doughnut}
                />
              </StyledPieContainer>
              <StyledBarContainer>
                <HorizontalBar
                  data={byApertureData}
                  options={chartOptions.bar}
                />
              </StyledBarContainer>
            </>
          ),
          raw: byAperture.map((entry) => [
            defaultToUnknown(format.aperture(entry.key)),
            numberFormatter(entry.value),
            `${format.share(entry.value, data.count.total)}%`,
          ]),
        },
        {
          name: "exposure-time",
          title: <Trans>stats-category-exposure-time</Trans>,
          pie: (
            <>
              <StyledPieContainer>
                <Doughnut
                  data={byExposureTimeData}
                  options={chartOptions.doughnut}
                />
              </StyledPieContainer>
              <StyledBarContainer>
                <HorizontalBar
                  data={byExposureTimeData}
                  options={chartOptions.bar}
                />
              </StyledBarContainer>
            </>
          ),
          raw: byExposureTime.map((entry) => [
            defaultToUnknown(format.exposureTime(entry.key)),
            numberFormatter(entry.value),
            `${format.share(entry.value, data.count.total)}%`,
          ]),
        },
        {
          name: "iso",
          title: <Trans>stats-category-iso</Trans>,
          pie: (
            <>
              <StyledPieContainer>
                <Doughnut data={byIsoData} options={chartOptions.doughnut} />
              </StyledPieContainer>
              <StyledBarContainer>
                <HorizontalBar data={byIsoData} options={chartOptions.bar} />
              </StyledBarContainer>
            </>
          ),
          raw: byIso.map((entry) => [
            defaultToUnknown(format.iso(entry.key)),
            numberFormatter(entry.value),
            `${format.share(entry.value, data.count.total)}%`,
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
                  options={chartOptions.doughnut}
                />
              </StyledPieContainer>
              <StyledBarContainer>
                <HorizontalBar
                  data={byExposureValueData}
                  options={chartOptions.bar}
                />
              </StyledBarContainer>
            </>
          ),
          raw: byExposureValue.map((entry) => [
            defaultToUnknown(entry.key),
            numberFormatter(entry.value),
            `${format.share(entry.value, data.count.total)}%`,
          ]),
        },
        {
          name: "lv",
          title: <Trans>stats-category-lv</Trans>,
          pie: (
            <>
              <StyledPieContainer>
                <Doughnut
                  data={byLightValueData}
                  options={chartOptions.doughnut}
                />
              </StyledPieContainer>
              <StyledBarContainer>
                <HorizontalBar
                  data={byLightValueData}
                  options={chartOptions.bar}
                />
              </StyledBarContainer>
            </>
          ),
          raw: byLightValue.map((entry) => [
            defaultToUnknown(entry.key),
            numberFormatter(entry.value),
            `${format.share(entry.value, data.count.total)}%`,
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
