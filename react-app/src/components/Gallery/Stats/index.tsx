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
  position: relative;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-items: flex-start;
`;
// Overlay only the Stats content area (charts + tables + map) while
// chart.js is busy rebuilding — the top menu / nav / Title above this
// component stay responsive. `pointer-events: none` so the user can
// still hover/click underlying chrome while the overlay is up.
const UpdatingOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  pointer-events: none;
  background: color-mix(
    in srgb,
    var(--photo-frame-mat) 60%,
    transparent
  );
  font-size: 1.2em;
  color: var(--primary-color);
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
  // that don't touch data/lang/theme) don't re-run the topic build.
  const topics = React.useMemo(
    () => (data ? stats.collectTopics(data, lang, t, countryData, theme) : []),
    [data, lang, t, countryData, theme]
  );
  // `useDeferredValue` keeps rendering the previous topics while React
  // schedules the heavy re-render (chart.js's ~30-chart rebuild). The
  // overlay paints on the first commit (deferredTopics still pointing
  // at the old value, isPending=true), the browser yields, then the
  // second commit lands the new topics and chart.js does its work.
  // Without this the language switch freezes the page for the whole
  // duration. Real fix is #286 (server-side stats); this is the
  // perception-layer bandage until then.
  const deferredTopics = React.useDeferredValue(topics);
  const isPending = deferredTopics !== topics;

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
        {deferredTopics.map((topic) => (
          <Topic
            key={topic.key}
            topic={topic}
            filters={filters}
            setFilters={setFilters}
            theme={theme}
          />
        ))}
        {renderMap(mapPhotos)}
        {isPending && <UpdatingOverlay>{t("updating")}</UpdatingOverlay>}
      </Root>
    </>
  );
};
export default Stats;
