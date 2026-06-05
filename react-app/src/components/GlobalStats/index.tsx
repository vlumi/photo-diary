import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import styled from "@emotion/styled";
import { Global, css } from "@emotion/react";
import { useQuery } from "@tanstack/react-query";
import { BsHouseFill, BsBarChartLine } from "react-icons/bs";

import Filters from "../Gallery/Filters";
import Stats from "../Gallery/Stats";
import PhotoModel, { type Photo as PhotoT } from "../../models/PhotoModel";
import photosService from "../../services/photos";
import theme from "../../lib/theme";
import { type UniqueValues } from "../../lib/stats";
import { buildUniqueValues } from "../../lib/uniqueValues";
import config from "../../lib/config";
import {
  useFiltersStore,
  useLangStore,
  useThemePreferenceStore,
  useUserStore,
} from "../../stores";

type ActiveTheme = ReturnType<typeof theme.setTheme>;

const globalStyles = (active: ActiveTheme) => css`
  html {
    --primary-color: ${active.get("primary-color")};
    --primary-background: ${active.get("primary-background")};
    --inactive-color: ${active.get("inactive-color")};
    --header-color: ${active.get("header-color")};
    --header-sub-color: ${active.get("header-sub-color")};
    --header-background: ${active.get("header-background")};
    --tile-background: ${active.get("tile-background")};
    --photo-frame-mat: ${active.get("photo-frame-mat")};
    --photo-frame-border: ${active.get("photo-frame-border")};
    filter: ${active.get("filter")};
  }
`;

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

// All-photos fetch is paginated under /api/v1/photos's existing
// admin endpoint. pageSize is the server's maximum (500). The
// queryFn loops over pages until the full set is in hand — fine
// for current catalogue sizes; if the global instance ever grows
// past tens of thousands the server-side stats aggregation in
// #286 supersedes this.
const PAGE_SIZE = 500;

const fetchAllPhotos = async (): Promise<PhotoT[]> => {
  const first = await photosService.list({}, 1, PAGE_SIZE);
  const raw = [...first.photos];
  const totalPages = Math.max(1, Math.ceil(first.total / PAGE_SIZE));
  for (let page = 2; page <= totalPages; page++) {
    const next = await photosService.list({}, page, PAGE_SIZE);
    raw.push(...next.photos);
  }
  return raw
    .map((photo) => PhotoModel(photo))
    .filter((p): p is PhotoT => !!p);
};

const GlobalStats = (): React.ReactElement => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useUserStore((s) => s.user);
  const lang = useLangStore((s) => s.lang);
  const countryData = useLangStore((s) => s.countryData);
  const filters = useFiltersStore((s) => s.filters);
  const setFilters = useFiltersStore((s) => s.setFilters);
  const themePreference = useThemePreferenceStore((s) => s.preference);

  const activeTheme = themePreference
    ? theme.setTheme(themePreference)
    : theme.setTheme(config.DEFAULT_THEME);

  const photosQuery = useQuery({
    queryKey: ["global-stats-photos", user?.id ?? null],
    queryFn: fetchAllPhotos,
    enabled: !!user?.isAdmin(),
  });

  const photos = photosQuery.data;
  const uniqueValues = React.useMemo<UniqueValues | undefined>(() => {
    if (!photos || !countryData) return undefined;
    return buildUniqueValues(photos, lang, t, countryData);
  }, [photos, lang, t, countryData]);

  const frame = (body: React.ReactNode): React.ReactElement => (
    <>
      <Global styles={globalStyles(activeTheme)} />
      <Header aria-label={String(t("stats-global-nav-group"))}>
        <HomeLink
          onClick={() => navigate("/")}
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
  if (!countryData || photosQuery.isLoading || !photos || !uniqueValues) {
    return frame(<Notice>{t("loading")}</Notice>);
  }
  if (photosQuery.isError) {
    return frame(<Notice>{t("stats-global-load-error")}</Notice>);
  }
  if (photos.length === 0) {
    return frame(<Notice>{t("stats-global-empty")}</Notice>);
  }

  return frame(
    <Stats
      photos={photos}
      uniqueValues={uniqueValues}
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
  );
};

export default GlobalStats;
