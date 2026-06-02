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
const CrumbLink = styled.a`
  color: inherit;
  text-decoration: none;
  cursor: pointer;
  &:hover {
    text-decoration: underline;
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
const Manage = (): React.ReactElement => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams();
  const user = useUserStore((s) => s.user);
  const galleryId = params.galleryId;

  const body = !user ? (
    <NoticeBody>{t("manage-not-logged-in")}</NoticeBody>
  ) : !user.isAdmin() ? (
    <NoticeBody>{t("manage-not-admin")}</NoticeBody>
  ) : (
    <Outlet />
  );

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
          <Separator />
          <Crumb>
            <CrumbLink
              onClick={(e) => {
                e.preventDefault();
                navigate("/m");
              }}
              role="link"
              tabIndex={0}
            >
              {t("manage-root")}
            </CrumbLink>
          </Crumb>
          {galleryId && (
            <>
              <Separator />
              <Crumb>{galleryId}</Crumb>
            </>
          )}
        </Crumbs>
      </Header>
      {body}
    </Root>
  );
};

export default Manage;
