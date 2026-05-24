import React from "react";
import { useTranslation } from "react-i18next";
import styled from "@emotion/styled";

import Topic from "./Topic";
import MapContainer from "../../MapContainer.lazy";

import stats, { type UniqueValues } from "../../../lib/stats";

import type { Photo } from "../../../models/PhotoModel";
import type { Filters as FiltersT } from "../../../lib/filter";

interface CountryData {
  getName(code: string, lang: string): string | undefined;
  isValid(code: string): boolean;
}
type ActiveTheme = { get: (name: string) => string };

const Root = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-items: flex-start;
  /* Match the 5px horizontal inset that the sibling Filters bar uses
     (margin: 0 5px in Filters/index.tsx). Now that the category tiles
     fill the full row width with the responsive grid, the previous
     edge-to-edge layout made Filters' inset look misaligned. */
  margin: 0 5px;
`;

interface Props {
  children?: React.ReactNode;
  photos: Photo[];
  uniqueValues: UniqueValues;
  filters: FiltersT;
  setFilters: (filters: FiltersT) => void;
  lang: string;
  countryData: CountryData;
  theme: ActiveTheme;
  hideMap: boolean;
}

const Stats = ({
  children,
  photos,
  uniqueValues,
  filters,
  setFilters,
  lang,
  countryData,
  theme,
  hideMap,
}: Props): React.ReactElement => {
  const [data, setData] = React.useState<any>(undefined);

  const { t } = useTranslation();

  React.useEffect(() => {
    stats.generate(photos, uniqueValues).then((stats) => setData(stats));
  }, [photos, uniqueValues]);

  // Memoize so unrelated re-renders (filter UI ticks, parent prop changes
  // that don't touch data/lang/theme) don't re-run the topic build —
  // which currently fans out into ~30 chart-data objects and table-row
  // arrays. Step 1 of the #231 fix; chart-data stability across `lang`
  // switches comes in a follow-up that splits collectTopics internally.
  const topics = React.useMemo(
    () => (data ? stats.collectTopics(data, lang, t, countryData, theme) : []),
    [data, lang, t, countryData, theme]
  );

  if (!data) {
    return (
      <>
        <div>{t("loading")}</div>
      </>
    );
  }

  const renderMap = (positions: Photo[]) => {
    if (!positions || hideMap) {
      return "";
    }
    return <MapContainer positions={positions} height={800} maxZoom={18} />;
  };
  const mapPhotos = photos.filter((photo) => photo.hasCoordinates());

  return (
    <>
      {children}
      <Root>
        {topics.map((topic) => (
          <Topic
            key={topic.key}
            topic={topic}
            filters={filters}
            setFilters={setFilters}
            theme={theme}
            lang={lang}
            countryData={countryData}
          />
        ))}
        {renderMap(mapPhotos)}
      </Root>
    </>
  );
};
export default Stats;
