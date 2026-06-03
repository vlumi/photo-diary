import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";

import "./App.css";

import ScrollToPosition from "./components/ScrollToPosition";
import TopMenu from "./components/TopMenu";
import Gallery from "./components/Gallery";
import Manage from "./components/Manage";
import ManagePlaceholder from "./components/Manage/Placeholder";
import ManagePhotos from "./components/Manage/Photos";
import ManageGalleryPhotos from "./components/Manage/GalleryPhotos";
import ManagePhotoDrawer from "./components/Manage/PhotoDrawer";
import ManageGalleries from "./components/Manage/Galleries";
import ManageGalleryEdit from "./components/Manage/GalleryEdit";
import ManageGalleryCreate from "./components/Manage/GalleryCreate";
import Notifications from "./components/Notifications";
import LoginModal from "./components/LoginModal";
import ChangePasswordModal from "./components/ChangePasswordModal";

import config from "./lib/config";
import metaService from "./services/meta";
import { useBetaStore, useLangStore } from "./stores";
import { BETA_FEATURES, type BetaFeature, type BetaMode } from "./stores/beta";

interface Meta {
  cdn?: string;
  name?: string;
  description?: string;
  defaultGallery?: string;
  defaultTheme?: string;
  initialGalleryView?: string;
  firstWeekday?: string | number;
  betaFeatures?: Record<string, string>;
}

const Footer = styled.div`
  width: 100%;
  text-align: right;
  font-size: x-small;
  margin: 0;
  padding: 0;
  color: var(--inactive-color);
`;

const App = (): React.ReactElement => {
  const { t } = useTranslation();

  // Wait for the country-name dictionary to be loaded before rendering the
  // gallery routes — they pass `countryData` deep into the Stats / Filters
  // subviews and rendering with `undefined` would cause runtime errors. The
  // lang store loads the active language's dictionary at module load.
  const countryDataReady = useLangStore((s) => s.countryData !== undefined);

  // Boot-side: fetch /meta and push the runtime-tunable bits into the
  // SPA's config singleton. Has to live here (not in Gallery) so the
  // Manage routes get correct PHOTO_ROOT_URL etc. when an admin lands
  // directly on /m/... — Gallery doesn't mount on those routes. The
  // react-query cache key is shared with Gallery's own ["meta"]
  // query, so it's still one network call.
  const metaQuery = useQuery({
    queryKey: ["meta"],
    queryFn: () => metaService.getAll(),
  });
  const meta = metaQuery.data as Meta | undefined;
  const setBetaModes = useBetaStore((s) => s.setModes);
  React.useEffect(() => {
    if (!meta) return;
    config.PHOTO_ROOT_URL = meta.cdn || config.PHOTO_ROOT_URL;
    if (meta.defaultGallery) config.DEFAULT_GALLERY = meta.defaultGallery;
    if (meta.defaultTheme) config.DEFAULT_THEME = meta.defaultTheme;
    if (meta.initialGalleryView)
      config.INITIAL_GALLERY_VIEW = meta.initialGalleryView;
    if (meta.firstWeekday !== undefined)
      config.FIRST_WEEKDAY = Number(meta.firstWeekday);
    if (meta.betaFeatures) {
      const next: Partial<Record<BetaFeature, BetaMode>> = {};
      for (const f of BETA_FEATURES) {
        const v = meta.betaFeatures[f];
        if (v === "on" || v === "off" || v === "user") next[f] = v;
      }
      if (Object.keys(next).length > 0) setBetaModes(next);
    }
  }, [meta, setBetaModes]);

  return (
    <>
      <title>Photo diary</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="robots" content="noindex" />
      <Notifications />
      <LoginModal />
      <ChangePasswordModal />
      <Router>
        <TopMenu />
        <ScrollToPosition>
          {!countryDataReady ? (
            <div>{t("loading")}</div>
          ) : (
            <Routes>
              <Route
                path="/s/:galleryId"
                element={<Gallery isStats={true} />}
              />
              <Route
                path="/g/:galleryId/:year/:month/:day/:photoId"
                element={<Gallery />}
              />
              <Route
                path="/g/:galleryId/:year?/:month?/:day?"
                element={<Gallery />}
              />
              <Route path="/g" element={<Gallery />} />
              <Route path="/m" element={<Manage />}>
                <Route
                  index
                  element={
                    <ManagePlaceholder
                      titleKey="manage-page-dashboard-title"
                      blurbKey="manage-page-dashboard-blurb"
                    />
                  }
                />
                <Route
                  path="users"
                  element={
                    <ManagePlaceholder
                      titleKey="manage-page-users-title"
                      blurbKey="manage-page-users-blurb"
                    />
                  }
                />
                <Route path="galleries" element={<ManageGalleries />} />
                <Route
                  path="galleries/new"
                  element={<ManageGalleryCreate />}
                />
                <Route path="photos" element={<ManagePhotos />}>
                  <Route path=":photoId" element={<ManagePhotoDrawer />} />
                </Route>
                <Route path="g/:galleryId">
                  <Route index element={<ManageGalleryEdit />} />
                  <Route path="photos" element={<ManageGalleryPhotos />}>
                    <Route path=":photoId" element={<ManagePhotoDrawer />} />
                  </Route>
                  <Route
                    path="access"
                    element={
                      <ManagePlaceholder
                        titleKey="manage-page-gallery-access-title"
                        blurbKey="manage-page-gallery-access-blurb"
                      />
                    }
                  />
                </Route>
              </Route>
              <Route path="/" element={<Navigate to="/g" replace />} />
            </Routes>
          )}
        </ScrollToPosition>
        <Footer>
          Generated by{" "}
          <a href="https://github.com/vlumi/photo-diary">Photo Diary</a> © Ville
          Misaki
        </Footer>
      </Router>
    </>
  );
};
export default App;
