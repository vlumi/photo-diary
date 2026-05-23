import React from "react";
import { Navigate } from "react-router-dom";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { BsFillHouseFill } from "react-icons/bs";

import Link from "./Link";

import type { Gallery } from "../../models/GalleryModel";

const Root = styled.div`
  display: flex;
  flex-wrap: nowrap;
  justify-content: space-between;
  align-items: center;
  padding: 0 5px;
`;
const MainTitle = styled.h1`
  margin: 0;
`;
const TitleSelect = styled.select`
  font-size: 1em;
  background: none;
  border: none;
  font-weight: bold;
  text-align-last: right;
`;
const GallerySelect = styled(TitleSelect)`
  text-align-last: right;
`;
const UnavailableOption = styled.option`
  font-style: italic;
  color: var(--inactive-color);
`;
const ContextSelect = styled(TitleSelect)`
  text-align-last: left;
`;
const TitleOption = styled.option``;

interface Props {
  galleries: Gallery[];
  gallery: Gallery;
  context: string;
  year?: number;
  month?: number;
  day?: number;
}

const Title = ({
  galleries,
  gallery,
  context,
  year,
  month,
  day,
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

  const renderTitle = () => {
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
    return <>{gallery.title()}</>;
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

  return (
    <Root>
      <Link>
        <BsFillHouseFill />
      </Link>
      <MainTitle>{renderTitle()}</MainTitle>
      {renderContext()}
    </Root>
  );
};
export default Title;
