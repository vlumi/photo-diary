import React from "react";
import {
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { BsFillHouseFill, BsChevronRight } from "react-icons/bs";

import useKeyPress from "../../lib/keypress";
import galleriesService from "../../services/galleries";
import { useHostScope } from "../../lib/use-host-scope";
import { useLastGalleryPathStore, useUserStore } from "../../stores";

// Routes whose endpoints reject with 404 on hostname-bound
// instances (server-side `requireUnscoped`). Visiting them when
// scoped is a dead end; redirect to `/m` so the Dashboard's
// scope-aware tile set takes over.
const GLOBAL_MANAGE_PATHS = [
  "/m/photos",
  "/m/galleries",
  "/m/users",
  "/m/groups",
  "/m/access",
];

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

interface ResolvedLabels {
  galleryTitle?: string;
}

const buildCrumbs = (
  pathname: string,
  t: (key: string) => string,
  resolved: ResolvedLabels
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
    const galleryLabel = resolved.galleryTitle ?? galleryId;
    pushLinkOrLeaf(!sub, `/m/g/${galleryId}`, galleryLabel);
    if (sub === "photos") {
      // The photoId tail segment drives the drawer-open state on
      // the Photos page (so deep-linking still works), but it
      // isn't a navigation level — Photos is always the deepest
      // breadcrumb leaf whether or not a drawer is open. The
      // drawer's own header names the photo.
      out.push({ kind: "leaf", label: t("manage-crumb-photos") });
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
    // Same as the gallery-scoped photos branch above: photoId
    // drives the drawer, not the crumb trail.
    out.push({ kind: "leaf", label: t("manage-page-photos-title") });
  } else if (page === "galleries") {
    const sub = tail[1];
    pushLinkOrLeaf(!sub, "/m/galleries", t("manage-page-galleries-title"));
    if (sub === "new") {
      out.push({ kind: "leaf", label: t("manage-gallery-create-title") });
    } else if (sub) {
      out.push({ kind: "leaf", label: sub });
    }
  } else if (page === "users") {
    const sub = tail[1];
    pushLinkOrLeaf(!sub, "/m/users", t("manage-page-users-title"));
    if (sub === "new") {
      out.push({ kind: "leaf", label: t("manage-user-create-title") });
    } else if (sub) {
      out.push({ kind: "leaf", label: sub });
    }
  } else if (page === "groups") {
    const sub = tail[1];
    pushLinkOrLeaf(!sub, "/m/groups", t("manage-page-groups-title"));
    if (sub === "new") {
      out.push({ kind: "leaf", label: t("manage-group-create-title") });
    } else if (sub) {
      out.push({ kind: "leaf", label: sub });
    }
  } else if (page === "access") {
    out.push({ kind: "leaf", label: t("manage-page-access-title") });
  } else if (page === "inbox") {
    out.push({ kind: "leaf", label: t("manage-page-inbox-title") });
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
  const { isReady: hostScopeReady, isHostScoped } = useHostScope();
  const onGlobalManagePath = GLOBAL_MANAGE_PATHS.some(
    (p) => location.pathname === p || location.pathname.startsWith(`${p}/`)
  );
  const shouldBounceToDashboard =
    hostScopeReady && isHostScoped && onGlobalManagePath;

  // Resolve the gallery's raw id to its title via a shared-cache
  // useQuery (same key shape as the rest of the app, so this
  // doesn't double-fetch). While the query resolves the breadcrumb
  // falls back to the raw id — visible briefly on cold
  // navigations, never permanent.
  const galleryQuery = useQuery({
    queryKey: ["gallery", galleryId, user?.id ?? null],
    queryFn: () => galleriesService.get(galleryId as string),
    enabled: !!galleryId && !!user?.isAdmin(),
  });
  const resolved = React.useMemo<ResolvedLabels>(() => {
    const galleryData = galleryQuery.data as
      | { title?: string }
      | undefined;
    return {
      galleryTitle: galleryData?.title || undefined,
    };
  }, [galleryQuery.data]);

  const crumbs = React.useMemo(
    () => buildCrumbs(location.pathname, t, resolved),
    [location.pathname, t, resolved]
  );

  const body = !user ? (
    <NoticeBody>{t("manage-not-logged-in")}</NoticeBody>
  ) : !user.isAdmin() ? (
    <NoticeBody>{t("manage-not-admin")}</NoticeBody>
  ) : shouldBounceToDashboard ? (
    <Navigate to="/m" replace />
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
            onClick={() => navigate("/g")}
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
