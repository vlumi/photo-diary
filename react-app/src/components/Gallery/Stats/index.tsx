import React from "react";
import { useTranslation } from "react-i18next";
import styled from "@emotion/styled";

import Topic from "./Topic";
import MapContainer from "../../MapContainer";

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
}: Props): React.ReactElement => {
  const [data, setData] = React.useState<any>(undefined);

  const { t } = useTranslation();

  React.useEffect(() => {
    stats.generate(photos, uniqueValues).then((stats) => setData(stats));
  }, [photos, uniqueValues, t]);

  if (!data) {
    return (
      <>
        <div>{t("loading")}</div>
      </>
    );
  }

  const renderMap = (positions: Photo[]) => {
    if (!positions) {
      return "";
    }
    return <MapContainer positions={positions} height={800} maxZoom={18} />;
  };
  const mapPhotos = photos.filter((photo) => photo.hasCoordinates());

  return (
    <>
      {children}
      <Root>
        {stats
          .collectTopics(data, lang, t, countryData, theme)
          .map((topic) => (
            <Topic
              key={topic.key}
              topic={topic}
              filters={filters}
              setFilters={setFilters}
              theme={theme}
            />
          ))}
        {renderMap(mapPhotos)}
      </Root>
    </>
  );
};
export default Stats;
