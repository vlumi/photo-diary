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
  const [committedTopics, setCommittedTopics] = React.useState<
    ReturnType<typeof stats.collectTopics>
  >([]);
  // Explicit state machine. `isUpdating` becomes true the moment a
  // recompute is triggered, paints (via double-RAF) BEFORE the heavy
  // setCommittedTopics → chart.js redraw blocks the main thread, and
  // stays true until a second double-RAF after the heavy paint clears
  // it. Earlier `useTransition` / `useDeferredValue` attempts left the
  // overlay invisible because React batched the two commits and the
  // browser never got a chance to paint the in-between state.
  const [isUpdating, setIsUpdating] = React.useState(false);
  // First compute after `data` lands skips the overlay — there are no
  // previous topics to leave on screen, so painting an overlay over an
  // empty stats area is just noise. Subsequent recomputes (lang
  // switch, filter change, theme switch, gallery switch) overlay.
  const isFirstUpdateRef = React.useRef(true);

  const { t } = useTranslation();

  React.useEffect(() => {
    stats.generate(photos, uniqueValues).then((stats) => setData(stats));
  }, [photos, uniqueValues]);

  React.useEffect(() => {
    if (!data) {
      setCommittedTopics([]);
      isFirstUpdateRef.current = true;
      return;
    }
    if (isFirstUpdateRef.current) {
      isFirstUpdateRef.current = false;
      setCommittedTopics(
        stats.collectTopics(data, lang, t, countryData, theme)
      );
      return;
    }
    setIsUpdating(true);
    // Double RAF: first frame schedules the second; second runs AFTER
    // the browser has painted the isUpdating=true state. Only then do
    // we trigger the heavy chart.js redraw via setCommittedTopics, so
    // the overlay is on screen for the full duration of the rebuild.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setCommittedTopics(
          stats.collectTopics(data, lang, t, countryData, theme)
        );
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
    // `t` deliberately omitted: react-i18next returns a fresh function
    // per render, which would spuriously re-fire this effect even when
    // the language hasn't changed. `lang` covers the actual change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, lang, countryData, theme]);

  // After committedTopics changes (= heavy work has committed +
  // chart.js has redrawn + browser has painted), schedule another
  // double-RAF to clear the overlay. Skipped on initial commit because
  // isUpdating is false there.
  React.useEffect(() => {
    if (!isUpdating) return;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setIsUpdating(false);
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [committedTopics, isUpdating]);

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
        {committedTopics.map((topic) => (
          <Topic
            key={topic.key}
            topic={topic}
            filters={filters}
            setFilters={setFilters}
            theme={theme}
          />
        ))}
        {renderMap(mapPhotos)}
        {isUpdating && <UpdatingOverlay>{t("updating")}</UpdatingOverlay>}
      </Root>
    </>
  );
};
export default Stats;
