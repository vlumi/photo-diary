import React from "react";
import { Navigate } from "react-router-dom";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { BsFillHouseFill, BsChevronRight } from "react-icons/bs";

import Link from "./Link";

import type { Gallery } from "../../models/GalleryModel";
import type { Photo } from "../../models/PhotoModel";

const Root = styled.div`
  display: flex;
  flex-wrap: nowrap;
  justify-content: space-between;
  align-items: center;
  padding: 0 5px;
  gap: 6px;
  /* Comfortable tap target for the breadcrumb crumbs on touch
     devices — the bar previously hugged the text height (~30px)
     which is below the 44px iOS HIG recommendation. */
  min-height: 44px;
`;
// Breadcrumb path. Each crumb segment is either a `<Link>` (parent
// level — click to navigate up) or plain text (current level —
// non-interactive). Sits between the house icon and the context
// selector; truncates the gallery name first when space gets tight.
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
  font-size: 0.7em;
  color: var(--inactive-color);
`;
const Crumb = styled.span`
  flex: 0 1 auto;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
// Active (current view) crumb — same look as link crumbs but
// non-interactive. Slightly bolder to read as "you are here".
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
// The gallery name is the longest variable-width element in the
// path. Cap its growth so the year / month / photo crumbs stay
// fully visible; the cap kicks in via `min-width: 0` + ellipsis
// when total width is tight (mobile).
const GalleryCrumb = styled(Crumb)`
  font-weight: bold;
  flex: 0 1 auto;
`;
const HomeLink = styled(Link)`
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
`;
// Explicit `color` because `background: none` lets the page background
// through, but the browser default text colour stays black — unreadable
// on dark themes. `option` rules style the native dropdown popup, which
// otherwise renders with platform defaults that ignore the theme.
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
`;
const UnavailableOption = styled.option`
  font-style: italic;
  color: var(--inactive-color);
`;
const ContextSelect = styled(TitleSelect)`
  text-align-last: right;
`;
const TitleOption = styled.option``;

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

  const { t } = useTranslation();

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

    // The current gallery isn't one the requester can see (URL points to a
    // private / non-existent gallery). Without this branch the `<select>`
    // value doesn't match any option and the browser falls back to
    // displaying the first one — making it look like the user is *in* that
    // gallery, and blocking them from navigating to it because picking it
    // wouldn't fire `onChange`. Render a disabled, italicised placeholder
    // matching the URL so the selection is honest, and always show the
    // dropdown (even when only one real gallery is accessible) so the user
    // has a way to switch.
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
      {renderContext()}
    </Root>
  );
};
export default Title;
