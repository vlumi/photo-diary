import React from "react";
import { Global, css } from "@emotion/react";
import { Navigate, useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import metaService from "../../services/meta";
import galleryService from "../../services/galleries";
import galleryPhotosService from "../../services/gallery-photos";

import Title from "./Title";
import Filters from "./Filters";
import ListBody from "./ListBody";
import Empty from "./Empty";
import Full from "./Full";
import Year from "./Year";
import Month from "./Month";
import Day from "./Day";
// `Stats` and `Photo` are the two big subtrees by bundle weight (Stats pulls
// in the aggregate-charts logic; Photo pulls in `react-leaflet` for the
// per-photo map). React.lazy puts each in its own chunk so a user browsing
// the calendar never has to download the stats or single-photo code paths
// until they actually navigate to one. Suspense fallback below.
const Stats = React.lazy(() => import("./Stats"));
const Photo = React.lazy(() => import("./Photo"));

import GalleryModel, { type Gallery as GalleryT } from "../../models/GalleryModel";
import PhotoModel, { type Photo as PhotoT } from "../../models/PhotoModel";

import collection from "../../lib/collection";
import config from "../../lib/config";
import format from "../../lib/format";
import stats, {
  type UniqueValues,
  type UniqueValueEntry,
} from "../../lib/stats";
import theme from "../../lib/theme";

import type { Filters as FiltersT } from "../../lib/filter";
import type { User } from "../../models/UserModel";

interface CountryData {
  getName(code: string, lang: string): string | undefined;
  isValid(code: string): boolean;
}
interface ScrollState {
  get: (path: string) => number;
  set: (path: string, position: number) => void;
}
interface Meta {
  cdn?: string;
  name?: string;
  description?: string;
  // Optional per-instance overrides served from the server's `process.env`.
  defaultGallery?: string;
  defaultTheme?: string;
  initialGalleryView?: string;
  firstWeekday?: string | number;
}
type ActiveTheme = ReturnType<typeof theme.setTheme>;

const globalStyles = (theme: ActiveTheme) => css`
  html {
    --primary-color: ${theme.get("primary-color")};
    --primary-background: ${theme.get("primary-background")};
    --inactive-color: ${theme.get("inactive-color")};
    --header-color: ${theme.get("header-color")};
    --header-sub-color: ${theme.get("header-sub-color")};
    --header-background: ${theme.get("header-background")};
    filter: ${theme.get("filter")};
  }
`;

interface Props {
  user?: User;
  lang: string;
  countryData: CountryData;
  isStats?: boolean;
  scrollState: ScrollState;
}

const Gallery = ({
  user,
  lang,
  countryData,
  isStats = false,
  scrollState,
}: Props): React.ReactElement => {
  const [meta, setMeta] = React.useState<Meta | undefined>(undefined);
  const [galleries, setGalleries] = React.useState<GalleryT[] | undefined>(
    undefined
  );
  const [gallery, setGallery] = React.useState<GalleryT | undefined>(undefined);
  const [photos, setPhotos] = React.useState<PhotoT[] | undefined>(undefined);
  const [uniqueValues, setUniqueValues] = React.useState<
    UniqueValues | undefined
  >(undefined);
  const [filters, setFilters] = React.useState<FiltersT>({});
  const [error, setError] = React.useState("");

  const { t } = useTranslation();
  const location = useLocation();

  React.useEffect(() => {
    const handleScroll = () => {
      scrollState.set(location.pathname, window.pageYOffset);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [location, scrollState]);

  const context = isStats ? "stats" : "gallery";

  const galleryId = useParams().galleryId;
  const photoId = useParams().photoId;

  const year = Number(useParams().year || 0);
  const month = Number(useParams().month || 0);
  const day = Number(useParams().day || 0);

  const staleGallery = gallery && gallery.id() !== galleryId;

  const selectedGallery =
    galleries && galleries.find((gallery) => gallery.id() === galleryId);

  React.useEffect(() => {
    metaService
      .getAll()
      .then((returnedMeta) => {
        const m = returnedMeta as unknown as Meta;
        setMeta(m);
        config.PHOTO_ROOT_URL = m.cdn || config.PHOTO_ROOT_URL;
        if (m.defaultGallery) config.DEFAULT_GALLERY = m.defaultGallery;
        if (m.defaultTheme) config.DEFAULT_THEME = m.defaultTheme;
        if (m.initialGalleryView)
          config.INITIAL_GALLERY_VIEW = m.initialGalleryView;
        if (m.firstWeekday !== undefined)
          config.FIRST_WEEKDAY = Number(m.firstWeekday);
      })
      .catch((error: Error) => setError(error.message));
  }, []);
  React.useEffect(() => {
    galleryService
      .getAll()
      .then((returnedGalleries) => {
        const gals = (returnedGalleries as unknown as unknown[])
          .map((gallery) => GalleryModel(gallery))
          .filter((g): g is GalleryT => !!g);
        setGalleries(gals);
      })
      .catch((error: Error) => setError(error.message));
  }, [user]);
  React.useEffect(() => {
    if (!galleryId) {
      return;
    }
    galleryPhotosService
      .get(galleryId)
      .then((photos) => {
        const mappedPhotos = (photos as unknown as unknown[])
          .map((photo) => PhotoModel(photo))
          .filter((photo): photo is PhotoT => !!photo);
        setPhotos(mappedPhotos);
      })
      .catch((error: Error) => setError(error.message));
  }, [galleryId, user]);
  React.useEffect(() => {
    if (!photos) {
      return;
    }
    // The reduce builds up a `{ topic: { category: Set<unknown> } }` shape,
    // then the forEach normalizes each Set into the consumer-facing
    // `UniqueValueEntry[]`. The accumulator is typed as the loose
    // Record-of-Record-of-Set during the build and cast to `UniqueValues`
    // once the Sets have been flattened.
    const accumulator: Record<string, Record<string, Set<unknown>>> = photos
      .map((photo) => photo.uniqueValues())
      .reduce(
        collection.mergeObjects<unknown>(
          (a, b) => new Set([...a, ...b]) as Set<unknown>
        ),
        {}
      ) as Record<string, Record<string, Set<unknown>>>;
    const categoryValueFormatter = format.categoryValue(lang, t, countryData);
    const flattened: UniqueValues = {} as UniqueValues;
    Object.keys(accumulator).forEach((topic) => {
      const topicBag: Record<string, UniqueValueEntry[]> = {};
      Object.keys(accumulator[topic]).forEach((category) => {
        topicBag[category] = [...accumulator[topic][category]]
          .map((value) => {
            if (value === "" || value === undefined || value === null) {
              return {
                key: stats.UNKNOWN,
                value: String(t("stats-unknown")),
              };
            }
            return {
              key: value as string | number,
              value: categoryValueFormatter(category)(value),
            };
          })
          .sort(format.categorySorter("key", "value")(category));
      });
      (flattened as Record<string, Record<string, UniqueValueEntry[]>>)[topic] =
        topicBag;
    });
    setUniqueValues(flattened);
  }, [photos, lang, t, countryData]);
  React.useEffect(() => {
    if (!selectedGallery || !photos) {
      return;
    }
    const filteredPhotos = photos.filter((photo) =>
      Object.values(filters).every(
        (topicFilters) =>
          !Object.keys(topicFilters).length ||
          Object.values(topicFilters).every(
            (categoryFilters) =>
              !Object.keys(categoryFilters).length ||
              Object.values(categoryFilters).some((filter) => filter(photo))
          )
      )
    );
    setGallery(selectedGallery.withPhotos(filteredPhotos));
  }, [selectedGallery, photos, filters]);

  if (staleGallery) {
    setGallery(undefined);
    setPhotos(undefined);
    setUniqueValues(undefined);
  }

  const selectedThemeName = selectedGallery?.theme();
  const activeTheme =
    selectedGallery && selectedGallery.hasTheme() && selectedThemeName
      ? theme.setTheme(selectedThemeName)
      : theme.setTheme(config.DEFAULT_THEME);

  if (error) {
    return <div className="error">Loading failed</div>;
  }

  if (!meta || !galleries) {
    return <div>{t("loading")}</div>;
  }
  if (!galleryId) {
    if (galleries.length === 1) {
      return <Navigate to={galleries[0].path()} replace />;
    }

    const galleriesMatchingHostname = galleries.filter((gallery) =>
      gallery.matchesHostname(window.location.hostname)
    );
    if (galleriesMatchingHostname.length === 1) {
      return <Navigate to={galleriesMatchingHostname[0].path()} replace />;
    }
    if (config.DEFAULT_GALLERY) {
      const targetGallery = galleries.find(
        (gallery) => gallery.id() === config.DEFAULT_GALLERY
      );
      if (targetGallery) {
        return <Navigate to={targetGallery.path()} replace />;
      }
    }

    if (galleries.length === 0) {
      return <i>{t("empty")}</i>;
    }

    const escapeHTML = (str: string): string =>
      str.replace(
        /[&<>'"]/g,
        (tag) =>
          (({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "'": "&#39;",
            '"': "&quot;",
          }) as Record<string, string>)[tag]
      );

    const title = meta.name ? (
      <>{escapeHTML(meta.name)}</>
    ) : (
      <>{t("nav-galleries")}</>
    );

    const description = meta.description ? (
      <p>{escapeHTML(meta.description)}</p>
    ) : (
      <></>
    );

    return (
      <>
        <h2>
          <span className="title">{title}</span>
        </h2>
        {description}
        <div id="content">
          <ListBody galleries={galleries} />
        </div>
      </>
    );
  }

  const renderContent = () => {
    if (staleGallery || !gallery || !uniqueValues) {
      return <div>{t("loading")}</div>;
    }

    if (isStats) {
      return (
        <Stats
          photos={gallery.photos()}
          uniqueValues={uniqueValues}
          filters={filters}
          setFilters={setFilters}
          lang={lang}
          countryData={countryData}
          theme={activeTheme}
          hideMap={gallery.hideMap()}
        >
          <Title galleries={galleries} gallery={gallery} context={context} />
          <Filters
            filters={filters}
            setFilters={setFilters}
            uniqueValues={uniqueValues}
            lang={lang}
            countryData={countryData}
          />
        </Stats>
      );
    }
    if (!gallery.includesPhotos()) {
      return (
        <Empty gallery={gallery}>
          <Title galleries={galleries} gallery={gallery} context={context} />
          <Filters
            filters={filters}
            setFilters={setFilters}
            uniqueValues={uniqueValues}
            lang={lang}
            countryData={countryData}
          />
        </Empty>
      );
    }
    if (!year) {
      return (
        <Full gallery={gallery}>
          <Title galleries={galleries} gallery={gallery} context={context} />
          <Filters
            filters={filters}
            setFilters={setFilters}
            uniqueValues={uniqueValues}
            lang={lang}
            countryData={countryData}
          />
        </Full>
      );
    }
    if (!month) {
      return (
        <Year gallery={gallery} year={year} theme={activeTheme}>
          <Title
            galleries={galleries}
            gallery={gallery}
            context={context}
            year={year}
          />
          <Filters
            filters={filters}
            setFilters={setFilters}
            uniqueValues={uniqueValues}
            lang={lang}
            countryData={countryData}
          />
        </Year>
      );
    }
    if (!day) {
      return (
        <Month
          gallery={gallery}
          year={year}
          month={month}
          lang={lang}
          countryData={countryData}
        >
          <Title
            galleries={galleries}
            gallery={gallery}
            context={context}
            year={year}
            month={month}
          />
          <Filters
            filters={filters}
            setFilters={setFilters}
            uniqueValues={uniqueValues}
            lang={lang}
            countryData={countryData}
          />
        </Month>
      );
    }
    if (!photoId) {
      return (
        <Day
          gallery={gallery}
          year={year}
          month={month}
          day={day}
          lang={lang}
          countryData={countryData}
        >
          <Title
            galleries={galleries}
            gallery={gallery}
            context={context}
            year={year}
            month={month}
            day={day}
          />
          <Filters
            filters={filters}
            setFilters={setFilters}
            uniqueValues={uniqueValues}
            lang={lang}
            countryData={countryData}
          />
        </Day>
      );
    }
    const photo = gallery.photo(year, month, day, photoId);
    if (!photo) {
      return <div>{t("loading")}</div>;
    }
    return (
      <Photo
        gallery={gallery}
        year={year}
        month={month}
        day={day}
        photo={photo}
        lang={lang}
        countryData={countryData}
      >
        <Title
          galleries={galleries}
          gallery={gallery}
          context={context}
          year={year}
          month={month}
          day={day}
        />
        <Filters
          filters={filters}
          setFilters={setFilters}
          uniqueValues={uniqueValues}
          lang={lang}
          countryData={countryData}
        />
      </Photo>
    );
  };

  return (
    <>
      <Global styles={globalStyles(activeTheme)} />
      <React.Suspense fallback={<div>{t("loading")}</div>}>
        {renderContent()}
      </React.Suspense>
    </>
  );
};
export default Gallery;
