import React from "react";
import { Global, css } from "@emotion/react";
import { Navigate, useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";

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
// Lazy-loaded: Stats pulls aggregate-charts logic, Photo pulls
// react-leaflet — neither ships until the user navigates there.
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

import {
  useUserStore,
  useLangStore,
  useFiltersStore,
  useScrollStore,
} from "../../stores";

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
    --tile-background: ${theme.get("tile-background")};
    --photo-frame-mat: ${theme.get("photo-frame-mat")};
    --photo-frame-border: ${theme.get("photo-frame-border")};
    filter: ${theme.get("filter")};
  }
`;

interface Props {
  isStats?: boolean;
}

const Gallery = ({ isStats = false }: Props): React.ReactElement => {
  const user = useUserStore((s) => s.user);
  const lang = useLangStore((s) => s.lang);
  const countryData = useLangStore((s) => s.countryData);
  const filters = useFiltersStore((s) => s.filters);
  const setFilters = useFiltersStore((s) => s.setFilters);
  const setScroll = useScrollStore((s) => s.set);

  const { t } = useTranslation();
  const location = useLocation();

  React.useEffect(() => {
    const handleScroll = () => {
      setScroll(location.pathname, window.pageYOffset);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [location, setScroll]);

  const context = isStats ? "stats" : "gallery";

  const galleryId = useParams().galleryId;
  const photoId = useParams().photoId;

  const year = Number(useParams().year || 0);
  const month = Number(useParams().month || 0);
  const day = Number(useParams().day || 0);

  const metaQuery = useQuery({
    queryKey: ["meta"],
    queryFn: () => metaService.getAll(),
  });
  const galleriesQuery = useQuery({
    queryKey: ["galleries", user?.id ?? null],
    queryFn: async () => {
      const data = await galleryService.getAll();
      return data
        .map((gallery) => GalleryModel(gallery))
        .filter((g): g is GalleryT => !!g);
    },
  });
  // Skip the photos query for galleries the requester can't see;
  // the empty-gallery view is synthesised from URL params instead.
  const galleryInList =
    !!galleryId &&
    !!galleriesQuery.data &&
    galleriesQuery.data.some((g) => g.id() === galleryId);
  const photosQuery = useQuery({
    queryKey: ["gallery-photos", galleryId, user?.id ?? null, lang],
    queryFn: async () => {
      const data = await galleryPhotosService.get(galleryId as string, lang);
      return data
        .map((photo) => PhotoModel(photo))
        .filter((p): p is PhotoT => !!p);
    },
    enabled: galleryInList,
  });

  const meta = metaQuery.data as Meta | undefined;
  const galleries = galleriesQuery.data;
  const photos = photosQuery.data;
  const error =
    metaQuery.error?.message ||
    galleriesQuery.error?.message ||
    photosQuery.error?.message ||
    "";

  // Push runtime-tunable bits from `meta` into the SPA's config singleton.
  React.useEffect(() => {
    if (!meta) return;
    config.PHOTO_ROOT_URL = meta.cdn || config.PHOTO_ROOT_URL;
    if (meta.defaultGallery) config.DEFAULT_GALLERY = meta.defaultGallery;
    if (meta.defaultTheme) config.DEFAULT_THEME = meta.defaultTheme;
    if (meta.initialGalleryView)
      config.INITIAL_GALLERY_VIEW = meta.initialGalleryView;
    if (meta.firstWeekday !== undefined)
      config.FIRST_WEEKDAY = Number(meta.firstWeekday);
  }, [meta]);

  const selectedGallery =
    galleries && galleries.find((gallery) => gallery.id() === galleryId);

  // Recomputes on language change too — display values are localised.
  const uniqueValues = React.useMemo<UniqueValues | undefined>(() => {
    if (!photos || !countryData) return undefined;
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
    return flattened;
  }, [photos, lang, t, countryData]);

  const gallery = React.useMemo<GalleryT | undefined>(() => {
    if (!selectedGallery || !photos) return undefined;
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
    return selectedGallery.withPhotos(filteredPhotos);
  }, [selectedGallery, photos, filters]);

  const selectedThemeName = selectedGallery?.theme();
  const activeTheme =
    selectedGallery && selectedGallery.hasTheme() && selectedThemeName
      ? theme.setTheme(selectedThemeName)
      : theme.setTheme(config.DEFAULT_THEME);

  if (error) {
    return <div className="error">Loading failed</div>;
  }

  if (!meta || !galleries || !countryData) {
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

  // Render the same empty-gallery shape for "doesn't exist" /
  // "no access" / "session revoked" so the difference doesn't
  // leak. The Title bar dropdown lets the user pick another.
  if (!galleryInList) {
    const emptyGallery = GalleryModel({ id: galleryId });
    if (emptyGallery) {
      return (
        <>
          <Global styles={globalStyles(activeTheme)} />
          <Empty gallery={emptyGallery}>
            <Title
              galleries={galleries}
              gallery={emptyGallery}
              context={context}
            />
          </Empty>
        </>
      );
    }
  }

  const renderContent = () => {
    if (!gallery || !uniqueValues) {
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
    // `day` is optional — when set, Month scrolls to and highlights
    // that day's thumbnails on initial mount.
    if (!photoId) {
      return (
        <Month
          gallery={gallery}
          year={year}
          month={month}
          day={day || undefined}
          lang={lang}
          countryData={countryData}
        >
          <Title
            galleries={galleries}
            gallery={gallery}
            context={context}
            year={year}
            month={month}
            day={day || undefined}
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
    const photo = gallery.photo(year, month, day, photoId);
    if (!photo) {
      return <div>{t("loading")}</div>;
    }
    // Photo URLs mount Month + Photo together so the modal overlays
    // a real Month underneath (closing returns there without remount).
    return (
      <>
        <Month
          gallery={gallery}
          year={year}
          month={month}
          day={day || undefined}
          lang={lang}
          countryData={countryData}
          modalActive
        >
          <Title
            galleries={galleries}
            gallery={gallery}
            context={context}
            year={year}
            month={month}
            day={day || undefined}
            photo={photo}
            lang={lang}
          />
          <Filters
            filters={filters}
            setFilters={setFilters}
            uniqueValues={uniqueValues}
            lang={lang}
            countryData={countryData}
          />
        </Month>
        <Photo
          gallery={gallery}
          year={year}
          month={month}
          day={day}
          photo={photo}
          lang={lang}
          countryData={countryData}
        />
      </>
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
