import React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import styled from "@emotion/styled";
import { useQuery } from "@tanstack/react-query";
import { BsHouseFill, BsBarChartLine } from "react-icons/bs";

import Filters from "../Gallery/Filters";
import Stats from "../Gallery/Stats";
import Galleries from "./Galleries";
import PhotoModel, { type Photo as PhotoT } from "../../models/PhotoModel";
import photosService from "../../services/photos";
import galleriesService from "../../services/galleries";
import metaService from "../../services/meta";
import statsService from "../../services/stats";
import theme from "../../lib/theme";
import filter from "../../lib/filter";
import { type UniqueValues } from "../../lib/stats";
import { buildUniqueValues } from "../../lib/uniqueValues";
import config from "../../lib/config";
import { useHostScope } from "../../lib/use-host-scope";
import {
  useFiltersStore,
  useLangStore,
  useThemePreferenceStore,
  useUserStore,
} from "../../stores";

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 5px;
  min-height: 44px;
`;
const HomeLink = styled.a`
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  color: inherit;
  text-decoration: none;
`;
const Separator = styled.span`
  opacity: 0.55;
`;
const Crumb = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`;
const Notice = styled.div`
  padding: 16px;
  font-style: italic;
  color: var(--inactive-color);
`;


const GlobalStats = (): React.ReactElement => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useUserStore((s) => s.user);
  const { isReady: hostScopeReady, isHostScoped } = useHostScope();
  const lang = useLangStore((s) => s.lang);
  const countryData = useLangStore((s) => s.countryData);
  const filters = useFiltersStore((s) => s.filters);
  const setFilters = useFiltersStore((s) => s.setFilters);
  const themePreference = useThemePreferenceStore((s) => s.preference);
  const metaQuery = useQuery({
    queryKey: ["meta"],
    queryFn: () => metaService.getAll(),
  });
  const meta = metaQuery.data as { defaultTheme?: string } | undefined;
  const activeTheme = themePreference
    ? theme.setTheme(themePreference)
    : theme.setTheme(meta?.defaultTheme ?? config.DEFAULT_THEME);

  // Lazy + filter-aware fetch — only needed for Stats's globalScope
  // map render now that the filter pill universe + the Galleries
  // section both consume from server endpoints. Flag flips when the
  // user expands the Stats Location modal (callback passed through
  // Stats). Body mirrors gallery-photos/<id>/query so the server
  // applies the active filter cross-gallery.
  const [mapPhotosWanted, setMapPhotosWanted] = React.useState(false);
  const serverFilters = React.useMemo(
    () => filter.toServerFilters(filters),
    [filters]
  );
  const photoQueryBody = React.useMemo(
    () => ({ filter: serverFilters, lang }),
    [serverFilters, lang]
  );
  const photosQuery = useQuery({
    queryKey: [
      "global-stats-photos",
      user?.id ?? null,
      photoQueryBody,
    ],
    queryFn: async () => {
      const raw = (await photosService.query(photoQueryBody)) as Array<
        Record<string, unknown>
      >;
      return raw
        .map((photo) => PhotoModel(photo))
        .filter((p): p is PhotoT => !!p);
    },
    enabled: !!user?.isAdmin() && mapPhotosWanted,
  });
  const filterValuesQuery = useQuery({
    queryKey: ["global-filter-values", user?.id ?? null, lang],
    queryFn: () => statsService.getGlobalFilterValues(lang),
    enabled: !!user?.isAdmin(),
  });
  const galleriesQuery = useQuery({
    queryKey: ["global-stats-galleries", user?.id ?? null],
    queryFn: () => galleriesService.getAll(),
    enabled: !!user?.isAdmin(),
  });

  const photos = photosQuery.data;
  const filterValues = filterValuesQuery.data;
  const galleries = galleriesQuery.data ?? [];
  const uniqueValues = React.useMemo<UniqueValues | undefined>(() => {
    if (!filterValues || !countryData) return undefined;
    return buildUniqueValues(filterValues, lang, t, countryData);
  }, [filterValues, lang, t, countryData]);
  const requestMapPhotos = React.useCallback(
    () => setMapPhotosWanted(true),
    []
  );
  const releaseMapPhotos = React.useCallback(
    () => setMapPhotosWanted(false),
    []
  );

  const frame = (body: React.ReactNode): React.ReactElement => (
    <>
      <Header aria-label={String(t("stats-global-nav-group"))}>
        <HomeLink
          onClick={() => navigate("/g")}
          title={String(t("home"))}
          role="link"
          tabIndex={0}
        >
          <BsHouseFill aria-hidden />
        </HomeLink>
        <Separator>›</Separator>
        <Crumb>
          <BsBarChartLine aria-hidden />
          <span>{t("stats-global-title")}</span>
        </Crumb>
      </Header>
      {body}
    </>
  );

  if (!user) {
    return frame(<Notice>{t("manage-not-logged-in")}</Notice>);
  }
  if (!user.isAdmin()) {
    return frame(<Notice>{t("manage-not-admin")}</Notice>);
  }
  // Global stats endpoint is `requireUnscoped` on the server — 404s
  // on a hostname-bound instance. Bounce to the picker instead of
  // rendering a page whose queries all fail.
  if (hostScopeReady && isHostScoped) {
    return <Navigate to="/g" replace />;
  }
  if (
    !countryData ||
    filterValuesQuery.isLoading ||
    !filterValues ||
    !uniqueValues
  ) {
    return frame(<Notice>{t("loading")}</Notice>);
  }
  if (filterValuesQuery.isError || photosQuery.isError) {
    return frame(<Notice>{t("stats-global-load-error")}</Notice>);
  }
  // Empty instance: filter universe has no years (any photo would
  // contribute one). Cheap signal without fetching the photo array.
  if ((filterValues.categoryValues.year ?? []).length === 0) {
    return frame(<Notice>{t("stats-global-empty")}</Notice>);
  }

  return frame(
    <>
      <Galleries galleries={galleries} lang={lang} />
      <Stats
        globalScope
        photos={photos}
        onRequestPhotos={requestMapPhotos}
        onClosePhotos={releaseMapPhotos}
        filters={filters}
        setFilters={setFilters}
        lang={lang}
        countryData={countryData}
        theme={activeTheme}
        hideMap={false}
      >
        <Filters
          filters={filters}
          setFilters={setFilters}
          uniqueValues={uniqueValues}
          lang={lang}
          countryData={countryData}
          hideMap={false}
        />
      </Stats>
    </>
  );
};

export default GlobalStats;
