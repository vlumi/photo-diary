import React from "react";
import { Global, css } from "@emotion/react";
import { Navigate, useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import metaService from "../../services/meta";
import galleryService from "../../services/galleries";
import galleryPhotosService from "../../services/gallery-photos";

import Title from "./Title";
import Filters, { FilterModal } from "./Filters";
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
import filter from "../../lib/filter";
import format from "../../lib/format";
import { galleriesForHost } from "../../lib/host-scope";
import stats, { type UniqueValues } from "../../lib/stats";
import { buildUniqueValues } from "../../lib/uniqueValues";
import { useGalleryCalendar } from "../../lib/useFilteredCalendar";
import theme from "../../lib/theme";

import {
  useUserStore,
  useLangStore,
  useFiltersStore,
  useWireNumericRanges,
  useScrollStore,
  useThemePreferenceStore,
  useTitleMapModalStore,
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
  betaFeatures?: Record<string, string>;
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
    overflow-x: hidden;
  }
  body {
    overflow-x: hidden;
  }
`;

interface Props {
  isStats?: boolean;
  // Smart-landing routes (`/`) run a redirect ladder for the no-
  // galleryId case — single visible gallery / DEFAULT_GALLERY take
  // the visitor straight in. Picker-only routes (`/g`) skip the
  // ladder and always render the tile picker. The Home button in
  // the title bar uses `/g`; landing on the instance root via `/`
  // uses the smart variant.
  smartLanding?: boolean;
}

const Gallery = ({
  isStats = false,
  smartLanding = false,
}: Props): React.ReactElement => {
  const user = useUserStore((s) => s.user);
  const lang = useLangStore((s) => s.lang);
  const countryData = useLangStore((s) => s.countryData);
  const filters = useFiltersStore((s) => s.filters);
  const setFilters = useFiltersStore((s) => s.setFilters);
  const dateRange = useFiltersStore((s) => s.dateRange);
  const wireNumericRanges = useWireNumericRanges();
  const setScroll = useScrollStore((s) => s.set);
  const themePreference = useThemePreferenceStore((s) => s.preference);
  const loadThemePreference = useThemePreferenceStore((s) => s.load);

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

  // Photo modal mount auto-closes the title-bar map (#321) — both
  // can't compete for the screen, and the photo's own
  // MetadataPanel map is a separate, pin-centric component anyway.
  const closeTitleMap = useTitleMapModalStore((s) => s.close);
  const photoIdFromUrl = useParams().photoId;
  React.useEffect(() => {
    if (photoIdFromUrl) closeTitleMap();
  }, [photoIdFromUrl, closeTitleMap]);

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
  // Filter pill universe + filter-aware counts. Values stay the
  // unfiltered universe; counts reflect the active filter so the
  // modal's top-N sort favours values that still produce a hit.
  // Refetches whenever filter or dateRange change.
  const serverFiltersForValues = React.useMemo(
    () => filter.toServerFilters(filters),
    [filters]
  );
  const filterValuesQuery = useQuery({
    queryKey: [
      "gallery-filter-values",
      galleryId,
      user?.id ?? null,
      lang,
      serverFiltersForValues,
      dateRange,
      wireNumericRanges,
    ],
    queryFn: () =>
      galleryPhotosService.getFilterValues(galleryId as string, {
        filter: serverFiltersForValues,
        dateRange,
        numericRanges: wireNumericRanges,
        lang,
      }),
    enabled: galleryInList,
    placeholderData: keepPreviousData,
  });
  // Unfiltered gallery shape (#532): drives lastPath in the gallery
  // list, the "no photos" check below, and the calendar boundary
  // helpers that don't change with the active filter. Off /counts.
  const galleryCalendar = useGalleryCalendar(galleryId ?? "");
  // Seed for the filter modal's date-range card so the native
  // date picker opens within the gallery's photo timespan rather
  // than on today. Derived from the unfiltered calendar; recomputed
  // when the gallery's data set changes.
  const galleryDateRange = React.useMemo(() => {
    const fmt = (
      ymd: [number, number, number] | [undefined, undefined, undefined]
    ): string | undefined => {
      const [y, m, d] = ymd;
      if (y === undefined || m === undefined || d === undefined)
        return undefined;
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    };
    const from = fmt(galleryCalendar.firstDay());
    const to = fmt(galleryCalendar.lastDay());
    if (!from && !to) return undefined;
    return { from, to };
  }, [galleryCalendar]);
  // Modal photo lookup (#532 phase 2). Resolves the `photoId` URL
  // param to its metadata via the per-id endpoint; on 404, falls
  // back to the originalFilename endpoint (pre-rename / camera-
  // filename bookmarks). Both run as separate queries so the
  // common case pays for one round trip, not two.
  const photoByIdQuery = useQuery({
    queryKey: ["gallery-photo-by-id", galleryId, photoId, lang],
    queryFn: ({ signal }) =>
      galleryPhotosService.getOne(
        galleryId as string,
        photoId as string,
        lang,
        signal
      ),
    enabled: !!photoId && galleryInList,
    retry: false,
  });
  const photoByOriginalQuery = useQuery({
    queryKey: ["gallery-photo-by-original", galleryId, photoId, lang],
    queryFn: () =>
      galleryPhotosService.getByOriginalFilename(
        galleryId as string,
        photoId as string,
        lang
      ),
    enabled:
      !!photoId && galleryInList && photoByIdQuery.isError,
    retry: false,
  });
  const modalPhoto = React.useMemo<PhotoT | undefined>(() => {
    if (!photoByIdQuery.data) return undefined;
    return PhotoModel(photoByIdQuery.data) ?? undefined;
  }, [photoByIdQuery.data]);
  const modalPhotoByOriginal = React.useMemo<PhotoT | undefined>(() => {
    if (!photoByOriginalQuery.data) return undefined;
    return PhotoModel(photoByOriginalQuery.data) ?? undefined;
  }, [photoByOriginalQuery.data]);

  const meta = metaQuery.data as Meta | undefined;
  const galleries = galleriesQuery.data;
  const filterValues = filterValuesQuery.data;
  const error =
    metaQuery.error?.message ||
    galleriesQuery.error?.message ||
    filterValuesQuery.error?.message ||
    "";

  // The meta-to-config side-effect now lives in App.tsx so the
  // Manage routes pick up `cdn` / `defaultTheme` / etc. too — see
  // there.

  const selectedGallery =
    galleries && galleries.find((gallery) => gallery.id() === galleryId);

  // Recomputes on language change too — display values are localised.
  const uniqueValues = React.useMemo<UniqueValues | undefined>(() => {
    if (!filterValues || !countryData) return undefined;
    return buildUniqueValues(filterValues, lang, t, countryData);
  }, [filterValues, lang, t, countryData]);

  // No more `withPhotos`: the gallery model is metadata-only after
  // #532. Calendar shape comes from `useGalleryCalendar`; the modal's
  // current photo + neighbors come from their own queries.
  const gallery = selectedGallery;

  // Load the persisted user preference once, against the current
  // manifest so a stale localStorage entry can't survive a theme
  // rename or removal.
  React.useEffect(() => {
    loadThemePreference(new Set(theme.manifest.map((entry) => entry.id)));
  }, [loadThemePreference]);

  // Theme resolution priority: user preference → gallery theme → instance default.
  const selectedThemeName = selectedGallery?.theme();
  const activeTheme = themePreference
    ? theme.setTheme(themePreference)
    : selectedGallery && selectedGallery.hasTheme() && selectedThemeName
      ? theme.setTheme(selectedThemeName)
      : theme.setTheme(meta?.defaultTheme ?? config.DEFAULT_THEME);

  if (error) {
    return <div className="error">Loading failed</div>;
  }

  if (!meta || !galleries || !countryData) {
    return <div>{t("loading")}</div>;
  }
  // Host-scope: galleries whose `hostname` regex matches the current
  // domain. Empty = primary host (unscoped); non-empty = the only
  // galleries reachable from this hostname.
  const scopedGalleries = galleriesForHost(galleries, window.location.hostname);
  const isHostScoped = scopedGalleries.length > 0;
  // Off-scope URL on a scoped host: redirect to the first in-scope
  // gallery rather than render the unreachable view.
  if (
    galleryId &&
    isHostScoped &&
    !scopedGalleries.some((gallery) => gallery.id() === galleryId)
  ) {
    return <Navigate to={scopedGalleries[0].path()} replace />;
  }
  // On a scoped host, narrow `galleries` to the scope set so the
  // breadcrumb dropdown and landing picker can't navigate outside.
  const visibleGalleries = isHostScoped ? scopedGalleries : galleries;
  if (!galleryId) {
    if (smartLanding) {
      // Smart-landing routes (`/`) try to send the visitor straight
      // to a gallery rather than the picker; picker-only routes
      // (`/g`) skip this ladder.
      if (visibleGalleries.length === 1) {
        return <Navigate to={visibleGalleries[0].path()} replace />;
      }
      if (config.DEFAULT_GALLERY) {
        const targetGallery = visibleGalleries.find(
          (gallery) => gallery.id() === config.DEFAULT_GALLERY
        );
        if (targetGallery) {
          return <Navigate to={targetGallery.path()} replace />;
        }
      }
    }

    if (visibleGalleries.length === 0) {
      return <i>{t("empty")}</i>;
    }

    const title = meta.name ? <>{meta.name}</> : <>{t("nav-galleries")}</>;

    const description = meta.description ? <p>{meta.description}</p> : <></>;

    return (
      <>
        <h2>
          <span className="title">{title}</span>
        </h2>
        {description}
        <div id="content">
          <ListBody galleries={visibleGalleries} />
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
              galleries={visibleGalleries}
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
          galleryId={gallery.id()}
          filters={filters}
          setFilters={setFilters}
          lang={lang}
          countryData={countryData}
          theme={activeTheme}
          hideMap={gallery.hideMap()}
        >
          <Title galleries={visibleGalleries} gallery={gallery} context={context} lang={lang} />
          <Filters
            uniqueValues={uniqueValues}
            lang={lang}
            countryData={countryData}
          />
        </Stats>
      );
    }
    if (galleryCalendar.ready && !galleryCalendar.includesPhotos()) {
      return (
        <Empty gallery={gallery}>
          <Title galleries={visibleGalleries} gallery={gallery} context={context} lang={lang} />
          <Filters
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
          <Title galleries={visibleGalleries} gallery={gallery} context={context} lang={lang} />
          <Filters
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
            galleries={visibleGalleries}
            gallery={gallery}
            context={context}
            year={year}
            lang={lang}
          />
          <Filters
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
            galleries={visibleGalleries}
            gallery={gallery}
            context={context}
            year={year}
            month={month}
            day={day || undefined}
            lang={lang}
          />
          <Filters
            uniqueValues={uniqueValues}
            lang={lang}
            countryData={countryData}
          />
        </Month>
      );
    }
    // Per-id lookup pending: hold the previous Month/Photo render
    // (or render Month while the modal mounts).
    if (photoByIdQuery.isLoading) {
      return <div>{t("loading")}</div>;
    }
    const photo = modalPhoto;
    if (!photo) {
      // Per-id 404'd. originalFilename fallback in flight?
      if (photoByOriginalQuery.isLoading) {
        return <div>{t("loading")}</div>;
      }
      if (modalPhotoByOriginal) {
        return <Navigate to={modalPhotoByOriginal.path(gallery)} replace />;
      }
      return <Navigate to={gallery.path(year, month)} replace />;
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
            galleries={visibleGalleries}
            gallery={gallery}
            context={context}
            year={year}
            month={month}
            day={day || undefined}
            photo={photo}
            lang={lang}
          />
          <Filters
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
      {gallery && uniqueValues ? (
        <FilterModal
          uniqueValues={uniqueValues}
          lang={lang}
          countryData={countryData}
          hideMap={gallery.hideMap()}
          defaultDateRange={galleryDateRange}
        />
      ) : null}
    </>
  );
};
export default Gallery;
