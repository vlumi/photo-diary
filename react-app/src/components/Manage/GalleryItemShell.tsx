import React from "react";
import { Outlet, useLocation, useParams } from "react-router-dom";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";

import ItemModal, { useItemModalContext } from "./ItemModal";

// Wraps the gallery item routes (`/m/g/<id>`, `/m/g/<id>/access`)
// in a single shared modal with a tab header. Properties and Access
// are tabs within the modal, not separate pages, so the breadcrumb
// reads `Galleries > <id>` regardless of which tab is active and
// the modal stays mounted across tab switches.

const TabBar = styled.nav`
  display: flex;
  gap: 0;
  margin: 0;
  /* Stick at the Frame's top while the body scrolls. Hardcoded
     min-height so per-surface sticky titles can clear it (top: 48px)
     without measuring. Right padding leaves room for the close
     button. */
  position: sticky;
  top: 0;
  min-height: 48px;
  padding: 0 48px 0 16px;
  align-items: center;
  background: var(--primary-background);
  border-bottom: 1px solid var(--inactive-color);
  z-index: 2;
`;
const TabGroup = styled.div`
  display: inline-flex;
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  overflow: hidden;
`;
const Tab = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
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

const isAccessPath = (pathname: string): boolean =>
  /^\/m\/g\/[^/]+\/access\/?$/.test(pathname);

const TabHeader = ({
  galleryId,
  tab,
}: {
  galleryId: string;
  tab: "properties" | "access";
}): React.ReactElement => {
  const { t } = useTranslation();
  const { safeNavigate } = useItemModalContext();
  return (
    <TabBar role="tablist" aria-label={String(t("manage-gallery-tabs"))}>
      <TabGroup>
        <Tab
          type="button"
          role="tab"
          aria-selected={tab === "properties"}
          $active={tab === "properties"}
          onClick={() => safeNavigate(`/m/g/${galleryId}`)}
        >
          {t("manage-gallery-tab-properties")}
        </Tab>
        <Tab
          type="button"
          role="tab"
          aria-selected={tab === "access"}
          $active={tab === "access"}
          onClick={() => safeNavigate(`/m/g/${galleryId}/access`)}
        >
          {t("manage-gallery-tab-access")}
        </Tab>
      </TabGroup>
    </TabBar>
  );
};

const GalleryItemShell = (): React.ReactElement => {
  const params = useParams();
  const location = useLocation();
  const galleryId = params.galleryId as string;
  const tab: "properties" | "access" = isAccessPath(location.pathname)
    ? "access"
    : "properties";

  return (
    <ItemModal closeTo="/m/galleries">
      {() => (
        <>
          <TabHeader galleryId={galleryId} tab={tab} />
          <Outlet />
        </>
      )}
    </ItemModal>
  );
};

export default GalleryItemShell;
