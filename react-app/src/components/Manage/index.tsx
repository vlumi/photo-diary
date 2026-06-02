import React from "react";
import {
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { BsFillHouseFill, BsChevronRight } from "react-icons/bs";

import useKeyPress from "../../lib/keypress";
import { useLastGalleryPathStore, useUserStore } from "../../stores";

const Root = styled.div`
  padding: 0 5px;
`;
const Header = styled.div`
  display: flex;
  flex-wrap: nowrap;
  justify-content: space-between;
  align-items: center;
  padding: 0 5px;
  gap: 6px;
  min-height: 44px;
`;
const Crumbs = styled.nav`
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 6px;
  flex: 1 1 auto;
  min-width: 0;
`;
const Separator = styled(BsChevronRight)`
  flex: 0 0 auto;
  font-size: 0.85em;
  color: currentColor;
  opacity: 0.55;
`;
const Crumb = styled.span`
  flex: 0 0 auto;
  white-space: nowrap;
`;
const HomeLink = styled.a`
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  color: inherit;
  text-decoration: none;
`;
const CrumbLink = styled.a`
  color: inherit;
  text-decoration: none;
  cursor: pointer;
  &:hover {
    text-decoration: underline;
  }
`;
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
const NoticeBody = styled.div`
  padding: 16px;
  font-style: italic;
  color: var(--inactive-color);
`;

// Top-level frame for /m/* and /m/g/<gallery>/* admin routes. Renders
// a minimal breadcrumb header on every render (so non-admins still
// have the Home link out), then either the matched sub-route via
// <Outlet> or a permission-denied notice. Server-side endpoints gate
// data access; the UI just surfaces that.
// Parse a /m/... pathname into the trail of breadcrumb steps the
// header renders. Each step is either { kind: 'link', path, label }
// (clickable) or { kind: 'leaf', label } (current location).
type Crumb =
  | { kind: "link"; path: string; label: string }
  | { kind: "leaf"; label: string };

const buildCrumbs = (
  pathname: string,
  t: (key: string) => string
): Crumb[] => {
  const parts = pathname.split("/").filter(Boolean);
  // parts[0] === "m"
  const tail = parts.slice(1);
  const out: Crumb[] = [];
  const pushLinkOrLeaf = (
    isLast: boolean,
    path: string,
    label: string
  ): void => {
    out.push(isLast ? { kind: "leaf", label } : { kind: "link", path, label });
  };

  if (tail.length === 0) {
    // /m
    out.push({ kind: "leaf", label: t("manage-root") });
    return out;
  }

  out.push({ kind: "link", path: "/m", label: t("manage-root") });

  if (tail[0] === "g") {
    // /m/g/<id>[/sub[/photoId]]
    out.push({ kind: "link", path: "/m/galleries", label: t("manage-page-galleries-title") });
    const galleryId = tail[1];
    if (!galleryId) return out;
    const sub = tail[2];
    pushLinkOrLeaf(!sub, `/m/g/${galleryId}`, galleryId);
    if (sub === "photos") {
      const photoId = tail[3];
      pushLinkOrLeaf(
        !photoId,
        `/m/g/${galleryId}/photos`,
        t("manage-page-gallery-photos-title")
      );
      if (photoId) {
        out.push({ kind: "leaf", label: photoId });
      }
    } else if (sub === "access") {
      out.push({ kind: "leaf", label: t("manage-page-gallery-access-title") });
    } else if (sub) {
      out.push({ kind: "leaf", label: sub });
    }
    return out;
  }

  // /m/<page>[/<photoId>]
  const page = tail[0];
  if (page === "photos") {
    const photoId = tail[1];
    pushLinkOrLeaf(!photoId, "/m/photos", t("manage-page-photos-title"));
    if (photoId) out.push({ kind: "leaf", label: photoId });
  } else if (page === "galleries") {
    out.push({ kind: "leaf", label: t("manage-page-galleries-title") });
  } else if (page === "users") {
    out.push({ kind: "leaf", label: t("manage-page-users-title") });
  } else {
    out.push({ kind: "leaf", label: page });
  }
  return out;
};

const Manage = (): React.ReactElement => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const user = useUserStore((s) => s.user);
  const lookupGalleryPath = useLastGalleryPathStore((s) => s.get);
  const galleryId = params.galleryId;
  const crumbs = React.useMemo(
    () => buildCrumbs(location.pathname, t),
    [location.pathname, t]
  );

  const body = !user ? (
    <NoticeBody>{t("manage-not-logged-in")}</NoticeBody>
  ) : !user.isAdmin() ? (
    <NoticeBody>{t("manage-not-admin")}</NoticeBody>
  ) : (
    <Outlet />
  );

  // When the URL targets a specific gallery, render the same
  // Gallery / Stats / Manage segmented control the public gallery
  // shows in its title bar — switching modes is one click in either
  // direction. Gallery jumps to the most recently visited path for
  // this gallery (year / month / day / photo) when remembered.
  const goToGallery = () => {
    if (!galleryId) {
      navigate("/g");
      return;
    }
    const remembered = lookupGalleryPath(galleryId);
    navigate(remembered ?? `/g/${galleryId}`);
  };
  const goToStats = () => {
    if (!galleryId) return;
    navigate(`/s/${galleryId}`);
  };
  // Mirror Title.tsx's pill shortcuts. 1 / 2 / 3 match pill
  // position; g / s are kept for muscle memory. `m` is
  // intentionally skipped — already bound to the map toggle in
  // the gallery view, and 3 is the alternative for Manage.
  useKeyPress("g", goToGallery);
  useKeyPress("s", goToStats);
  useKeyPress("1", goToGallery);
  useKeyPress("2", goToStats);

  const renderContextSwitch = () => {
    if (!galleryId) return null;
    return (
      <ContextGroup
        role="group"
        aria-label={String(t("nav-context-group"))}
      >
        <ContextButton
          type="button"
          $active={false}
          onClick={goToGallery}
          title={`${t("nav-gallery")} (1 · g)`}
        >
          {t("nav-gallery")}
        </ContextButton>
        <ContextButton
          type="button"
          $active={false}
          onClick={goToStats}
          title={`${t("nav-stats")} (2 · s)`}
        >
          {t("nav-stats")}
        </ContextButton>
        <ContextButton
          type="button"
          $active={true}
          aria-pressed
          title={`${t("nav-manage")} (3)`}
        >
          {t("nav-manage")}
        </ContextButton>
      </ContextGroup>
    );
  };

  return (
    <Root>
      <Header>
        <Crumbs aria-label={String(t("manage-nav-group"))}>
          <HomeLink
            onClick={() => navigate("/")}
            title={String(t("home"))}
            role="link"
            tabIndex={0}
          >
            <BsFillHouseFill aria-hidden />
          </HomeLink>
          {crumbs.map((c, i) => (
            <React.Fragment key={`${i}-${c.label}`}>
              <Separator />
              <Crumb>
                {c.kind === "link" ? (
                  <CrumbLink
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(c.path);
                    }}
                    role="link"
                    tabIndex={0}
                  >
                    {c.label}
                  </CrumbLink>
                ) : (
                  c.label
                )}
              </Crumb>
            </React.Fragment>
          ))}
        </Crumbs>
        {renderContextSwitch()}
      </Header>
      {body}
    </Root>
  );
};

export default Manage;
