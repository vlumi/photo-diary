import React from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { BsFillHouseFill, BsChevronRight, BsMap } from "react-icons/bs";

import Link from "./Link";
import MapModal from "../MapModal";

import useKeyPress from "../../lib/keypress";
import { useLastGalleryPathStore, useUserStore } from "../../stores";
import type { Gallery } from "../../models/GalleryModel";
import type { Photo } from "../../models/PhotoModel";

const Root = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  padding: 8px 5px;
  gap: 6px;
  row-gap: 8px;
  /* 44px iOS HIG tap target. */
  min-height: 44px;
  box-sizing: border-box;
`;
const Path = styled.nav`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  flex: 1 1 auto;
  min-width: 0;
`;
const Separator = styled(BsChevronRight)`
  flex: 0 0 auto;
  font-size: 0.85em;
  /* currentColor + opacity so the chevron stays visible across
     every theme — --inactive-color is near-invisible on some. */
  color: currentColor;
  opacity: 0.55;
`;
// Default crumb: doesn't shrink. The gallery name is the only
// crumb that's allowed to ellipsis when room runs out — see
// GalleryCrumb / GallerySelect below.
const Crumb = styled.span`
  flex: 0 0 auto;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
const CurrentCrumb = styled(Crumb)`
  font-weight: bold;
`;
const LinkCrumb = styled(Crumb)`
  & a {
    text-decoration: none;
  }
  & a:hover {
    text-decoration: underline;
  }
`;
const GalleryCrumb = styled(Crumb)`
  font-weight: bold;
  flex: 0 1 auto;
`;
const HomeLink = styled(Link)`
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
`;
// Theme-aware colour so the dropdown is readable on dark themes
// (browser default is black) and option popup respects the theme.
const TitleSelect = styled.select`
  font-size: 1em;
  background: none;
  border: none;
  font-weight: bold;
  color: var(--primary-color);
  flex: 0 0 auto;
  max-width: 50%;
  & option {
    background: var(--primary-background);
    color: var(--primary-color);
  }
`;
const GallerySelect = styled(TitleSelect)`
  text-align-last: left;
  /* Truncates first when room runs out — see Crumb above. */
  flex: 0 1 auto;
  min-width: 0;
`;
const UnavailableOption = styled.option`
  font-style: italic;
  color: var(--inactive-color);
`;
const TitleOption = styled.option``;
// Two-pill segmented control for Gallery / Statistics. Both labels are
// always visible so the alternate view is a one-click affordance rather
// than a dropdown affordance. Active pill takes the header-background
// colour; inactive sits in `inactive-color` and brightens to
// `primary-color` on hover. Mirrors the SortToggle in `Stats/TableModal`
// so segmented controls feel uniform across the app.
const ContextGroup = styled.div`
  flex: 0 0 auto;
  display: inline-flex;
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  overflow: hidden;
`;
const ContextButton = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: ${({ $active }) =>
    $active ? "var(--header-background)" : "transparent"};
  color: ${({ $active }) =>
    $active ? "var(--header-color)" : "var(--inactive-color)"};
  border: none;
  font: inherit;
  font-size: 0.85em;
  font-weight: bold;
  cursor: ${({ $active }) => ($active ? "default" : "pointer")};
  & + & {
    border-left: 1px solid var(--inactive-color);
  }
  &:hover {
    color: ${({ $active }) =>
      $active ? "var(--header-color)" : "var(--primary-color)"};
  }
`;
// Wraps the map button + context segmented control as a single
// flex item so they stay together when the path above wraps onto
// its own line. `margin-left: auto` (justify-self) makes the
// cluster stick to the right edge.
const RightCluster = styled.div`
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
`;
const MapButton = styled.button`
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  background: none;
  border: none;
  padding: 0 4px;
  margin: 0;
  cursor: pointer;
  color: var(--primary-color);
  font: inherit;
  line-height: 1;
  &:hover {
    color: var(--inactive-color);
  }
`;

interface Props {
  galleries: Gallery[];
  gallery: Gallery;
  context: string;
  year?: number;
  month?: number;
  day?: number;
  photo?: Photo;
  lang?: string;
}

const Title = ({
  galleries,
  gallery,
  context,
  year,
  month,
  day,
  photo,
  lang,
}: Props): React.ReactElement => {
  const navigate = useNavigate();
  const [mapOpen, setMapOpen] = React.useState(false);

  const { t } = useTranslation();
  const user = useUserStore((s) => s.user);
  const showManage = !!user?.isAdmin();

  // Remember the most recent Gallery URL per gallery id, so flipping to
  // Statistics and back returns to the same year/month/day (or photo)
  // instead of the gallery root.
  const rememberGalleryPath = useLastGalleryPathStore((s) => s.set);
  const lookupGalleryPath = useLastGalleryPathStore((s) => s.get);
  React.useEffect(() => {
    if (context === "gallery") {
      const path = photo
        ? photo.path(gallery)
        : gallery.path(year, month, day);
      rememberGalleryPath(gallery.id(), path);
    }
  }, [context, gallery, year, month, day, photo, rememberGalleryPath]);

  // Map scope: month if URL identifies a month (or a photo within one),
  // year if only year, whole gallery on Statistics. Empty array hides
  // the button (also when the per-gallery hideMap flag is set).
  const mapPhotos = React.useMemo(() => {
    if (gallery.hideMap()) {
      return [];
    }
    if (year !== undefined && month !== undefined) {
      return gallery
        .flatMapDays(year, month, (d) => gallery.photos(year, month, d))
        .filter(Boolean)
        .filter((p) => p.hasCoordinates());
    }
    if (year !== undefined) {
      return gallery
        .flatMapMonths(year, (m) =>
          gallery.flatMapDays(year, m, (d) => gallery.photos(year, m, d))
        )
        .filter(Boolean)
        .filter((p) => p.hasCoordinates());
    }
    if (context === "stats") {
      return gallery.photos().filter((p) => p.hasCoordinates());
    }
    return [];
  }, [gallery, year, month, context]);

  const getRedirectPath = (gallery: Gallery, context: string): string => {
    switch (context) {
      default:
      case "gallery":
        return gallery.path(year, month, day);
      case "stats":
        return gallery.statsPath();
      case "manage":
        return `/m/g/${gallery.id()}/photos`;
    }
  };

  const renderGalleryCrumb = () => {
    const changeHandler = (event: React.ChangeEvent<HTMLSelectElement>) => {
      const targetGallery = galleries.find(
        (gallery) => gallery.id() === event.target.value
      );
      if (targetGallery && gallery.id() !== targetGallery.id()) {
        navigate(getRedirectPath(targetGallery, context));
      }
    };

    // If the URL targets a gallery the user can't see, render a
    // disabled italicised placeholder for the missing id and still
    // show the dropdown so they can switch to an accessible one.
    const isUnavailable = !galleries.some((g) => g.id() === gallery.id());
    if (isUnavailable) {
      return (
        <GallerySelect value={gallery.id()} onChange={changeHandler}>
          <UnavailableOption value={gallery.id()} disabled>
            — {gallery.id()}
          </UnavailableOption>
          {galleries.map((gallery) => (
            <TitleOption key={gallery.id()} value={gallery.id()}>
              {gallery.title()}
            </TitleOption>
          ))}
        </GallerySelect>
      );
    }
    if (galleries.length > 1) {
      return (
        <GallerySelect value={gallery.id()} onChange={changeHandler}>
          {galleries.map((gallery) => (
            <TitleOption key={gallery.id()} value={gallery.id()}>
              {gallery.title()}
            </TitleOption>
          ))}
        </GallerySelect>
      );
    }
    return <GalleryCrumb>{gallery.title()}</GalleryCrumb>;
  };

  const switchTo = (target: string) => {
    if (target === context) return;
    // Stats → Gallery: prefer the remembered last-gallery URL for this
    // gallery so the user lands back on the year/month/day they left
    // from. Falls through to `getRedirectPath` if nothing's been
    // remembered yet (first visit, or store reset).
    if (target === "gallery") {
      const remembered = lookupGalleryPath(gallery.id());
      navigate(remembered ?? getRedirectPath(gallery, target));
      return;
    }
    navigate(getRedirectPath(gallery, target));
  };

  useKeyPress("m", () => {
    if (mapPhotos.length > 0) setMapOpen((o) => !o);
  });
  useKeyPress("g", () => switchTo("gallery"));
  useKeyPress("s", () => switchTo("stats"));
  // 1 / 2 / 3 match pill position; the letter shortcuts above are
  // kept for muscle memory. Manage has no letter (m is the map
  // toggle) so 3 is its only single-keystroke route.
  useKeyPress("1", () => switchTo("gallery"));
  useKeyPress("2", () => switchTo("stats"));
  useKeyPress("3", () => {
    if (showManage) switchTo("manage");
  });

  const renderContext = () => {
    const contexts = showManage
      ? ["gallery", "stats", "manage"]
      : ["gallery", "stats"];
    const shortcutFor: Record<string, string> = {
      gallery: "1 · g",
      stats: "2 · s",
      manage: "3",
    };
    return (
      <ContextGroup
        role="group"
        aria-label={String(t("nav-context-group"))}
      >
        {contexts.map((c, i) => {
          const active = c === context;
          const shortcut = shortcutFor[c] ?? String(i + 1);
          return (
            <ContextButton
              key={c}
              type="button"
              $active={active}
              aria-pressed={active}
              onClick={() => switchTo(c)}
              title={`${t(`nav-${c}`)} (${shortcut})`}
            >
              {t(`nav-${c}`)}
            </ContextButton>
          );
        })}
      </ContextGroup>
    );
  };

  // Build the path crumbs from the calendar level the URL currently
  // identifies. The deepest level is the current view (non-interactive);
  // every shallower level is a Link up to itself.
  const isPhoto = photo !== undefined;
  const isMonth = !isPhoto && month !== undefined;
  const isYear = !isPhoto && !isMonth && year !== undefined;
  const yearLabel = year !== undefined ? String(year) : "";
  const monthLabel = month !== undefined ? t(`month-long-${month}`) : "";
  const photoLabel =
    photo !== undefined
      ? `#${new Intl.NumberFormat(lang ?? "en").format(photo.index() + 1)}`
      : "";

  return (
    <Root>
      <Path aria-label={t("nav-galleries")}>
        <HomeLink>
          <BsFillHouseFill />
        </HomeLink>
        <Separator aria-hidden="true" />
        {context === "stats" && showManage && (
          <>
            <LinkCrumb>
              <RouterLink to="/s">{t("stats-global-title")}</RouterLink>
            </LinkCrumb>
            <Separator aria-hidden="true" />
          </>
        )}
        {renderGalleryCrumb()}
        {year !== undefined && (
          <>
            <Separator aria-hidden="true" />
            {isYear ? (
              <CurrentCrumb>{yearLabel}</CurrentCrumb>
            ) : (
              <LinkCrumb>
                <Link gallery={gallery} year={year}>
                  {yearLabel}
                </Link>
              </LinkCrumb>
            )}
          </>
        )}
        {month !== undefined && (
          <>
            <Separator aria-hidden="true" />
            {isMonth ? (
              <CurrentCrumb>{monthLabel}</CurrentCrumb>
            ) : (
              <LinkCrumb>
                <Link gallery={gallery} year={year} month={month}>
                  {monthLabel}
                </Link>
              </LinkCrumb>
            )}
          </>
        )}
        {isPhoto && (
          <>
            <Separator aria-hidden="true" />
            <CurrentCrumb>{photoLabel}</CurrentCrumb>
          </>
        )}
      </Path>
      <RightCluster>
        {mapPhotos.length > 0 && (
          <MapButton
            type="button"
            onClick={() => setMapOpen(true)}
            aria-label={String(t("stats-location-see-on-map"))}
            title={`${t("stats-location-see-on-map")} (m)`}
          >
            <BsMap />
          </MapButton>
        )}
        {renderContext()}
      </RightCluster>
      {mapOpen && (
        <MapModal
          title={String(t("stats-category-location"))}
          photos={mapPhotos}
          drawLine={context !== "stats"}
          onClose={() => setMapOpen(false)}
        />
      )}
    </Root>
  );
};
export default Title;
