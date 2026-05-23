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

  // Three server queries, one for each independent data source. TanStack
  // Query handles caching, dedup, refetch-on-focus, and (via the keyed
  // `gallery-photos` query) automatic invalidation when `galleryId` changes
  // — replaces five `useEffect` + `useState` pairs and the manual
  // stale-gallery reset that used to sit inline in the render body.
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
  // Only fire the photos query once we know the gallery is in the LIST
  // the requester can see — for an unknown / private gallery the SPA
  // skips the API call entirely and renders the empty-gallery view
  // synthesized from the URL params.
  const galleryInList =
    !!galleryId &&
    !!galleriesQuery.data &&
    galleriesQuery.data.some((g) => g.id() === galleryId);
  const photosQuery = useQuery({
    queryKey: ["gallery-photos", galleryId, user?.id ?? null],
    queryFn: async () => {
      const data = await galleryPhotosService.get(galleryId as string);
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

  // Sync the runtime-tunable config bits the SPA reads from `meta`. Side
  // effect lives next to the query that produced it; the assignments stay
  // identical to the pre-TanStack code.
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

  // `uniqueValues` is derived from photos + i18n bits — the displayed
  // values depend on `lang` and `t`, so the memo recomputes on language
  // changes as well as data changes.
  const uniqueValues = React.useMemo<UniqueValues | undefined>(() => {
    if (!photos || !countryData) return undefined;
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

  // The requested gallery isn't in the LIST the requester can see — could
  // be a non-existent ID, a private gallery they don't have access to, or
  // one their session was revoked from. Render the same empty-gallery view
  // a real-but-empty gallery would use (so the difference doesn't leak),
  // and skip the photos API call. The Title bar's gallery dropdown gives
  // the user a way back to a gallery they can actually see.
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
    // Month renders the same view whether or not a `day` is in the URL.
    // When `day` is set, it scrolls that day's thumbnails into view and
    // visually highlights the DayTitle; the per-day standalone view from
    // pre-0.10 was merged in here (closes #274).
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
