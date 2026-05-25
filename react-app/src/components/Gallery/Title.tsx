import React from "react";
import { Navigate } from "react-router-dom";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { BsFillHouseFill, BsChevronRight, BsMap } from "react-icons/bs";

import Link from "./Link";
import MapModal from "../MapModal";

import type { Gallery } from "../../models/GalleryModel";
import type { Photo } from "../../models/PhotoModel";

const Root = styled.div`
  display: flex;
  flex-wrap: nowrap;
  justify-content: space-between;
  align-items: center;
  padding: 0 5px;
  gap: 6px;
  /* 44px iOS HIG tap target. */
  min-height: 44px;
`;
const Path = styled.nav`
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 6px;
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
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
const ContextSelect = styled(TitleSelect)`
  text-align-last: right;
`;
const TitleOption = styled.option``;
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
  const [redirect, setRedirect] = React.useState<string | undefined>(undefined);
  const [mapOpen, setMapOpen] = React.useState(false);

  const { t } = useTranslation();

  // Map scope: month if URL identifies a month (or a photo within one),
  // year if only year, none for gallery-list level. Empty array hides
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
    return [];
  }, [gallery, year, month]);

  React.useEffect(() => {
    if (redirect) {
      const handle = setTimeout(() => setRedirect(""), 0);
      return () => {
        setRedirect("");
        clearTimeout(handle);
      };
    }
  }, [redirect]);
  if (redirect) {
    return <Navigate to={redirect} replace />;
  }

  const getRedirectPath = (gallery: Gallery, context: string): string => {
    switch (context) {
      default:
      case "gallery":
        return gallery.path(year, month, day);
      case "stats":
        return gallery.statsPath();
    }
  };

  const renderGalleryCrumb = () => {
    const changeHandler = (event: React.ChangeEvent<HTMLSelectElement>) => {
      const targetGallery = galleries.find(
        (gallery) => gallery.id() === event.target.value
      );
      if (targetGallery && gallery.id() !== targetGallery.id()) {
        window.history.pushState({}, "");
        setRedirect(getRedirectPath(targetGallery, context));
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

  const renderContext = () => {
    const changeHandler = (event: React.ChangeEvent<HTMLSelectElement>) => {
      const targetContext = event.target.value;
      if (targetContext && context !== targetContext) {
        window.history.pushState({}, "");
        setRedirect(getRedirectPath(gallery, targetContext));
      }
    };
    return (
      <ContextSelect value={context} onChange={changeHandler}>
        {["gallery", "stats"].map((context) => (
          <TitleOption key={context} value={context}>
            {t(`nav-${context}`)}
          </TitleOption>
        ))}
      </ContextSelect>
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
      {mapPhotos.length > 0 && (
        <MapButton
          type="button"
          onClick={() => setMapOpen(true)}
          aria-label={String(t("stats-location-see-on-map"))}
        >
          <BsMap />
        </MapButton>
      )}
      {renderContext()}
      {mapOpen && (
        <MapModal
          title={String(t("stats-category-location"))}
          photos={mapPhotos}
          drawLine
          onClose={() => setMapOpen(false)}
        />
      )}
    </Root>
  );
};
export default Title;
