import React from "react";
import { Outlet, useNavigate, useParams } from "react-router-dom";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { BsFillHouseFill, BsChevronRight } from "react-icons/bs";

import { useUserStore } from "../../stores";

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
const Placeholder = styled.div`
  padding: 16px;
  font-style: italic;
  color: var(--inactive-color);
`;

// Top-level frame for /m/* and /m/g/<gallery>/* admin routes. Renders a
// minimal header (breadcrumb + home link), then an <Outlet> for the
// page-specific sub-routes. Access gating: any logged-in user can hit
// the route, but if `user.isAdmin` isn't set the page renders a
// "permission denied" placeholder rather than redirecting away — the
// admin-only API endpoints already gate the data, and the UI just
// surfaces that. Per-gallery admin (#10 PR 3+) lands when the gallery
// data flow is wired.
const Manage = (): React.ReactElement => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams();
  const user = useUserStore((s) => s.user);

  if (!user) {
    return (
      <Root>
        <Placeholder>{t("manage-not-logged-in")}</Placeholder>
      </Root>
    );
  }
  if (!user.isAdmin()) {
    return (
      <Root>
        <Placeholder>{t("manage-not-admin")}</Placeholder>
      </Root>
    );
  }

  const galleryId = params.galleryId;
  return (
    <Root>
      <Header>
        <Crumbs aria-label={String(t("manage-nav-group"))}>
          <HomeLink onClick={() => navigate("/")} title={String(t("home"))}>
            <BsFillHouseFill aria-hidden />
          </HomeLink>
          <Separator />
          <Crumb>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                navigate("/m");
              }}
              style={{ color: "inherit", textDecoration: "none" }}
            >
              {t("manage-root")}
            </a>
          </Crumb>
          {galleryId && (
            <>
              <Separator />
              <Crumb>{galleryId}</Crumb>
            </>
          )}
        </Crumbs>
      </Header>
      <Outlet />
    </Root>
  );
};

export default Manage;
