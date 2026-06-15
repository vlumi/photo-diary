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
  border-bottom: 1px solid var(--inactive-color);
  margin: 0;
  /* Stick at the Frame's top while the body scrolls. Hardcoded
     min-height so per-surface sticky titles can clear it (top: 48px)
     without measuring. Right padding leaves room for the close
     button. */
  position: sticky;
  top: 0;
  min-height: 48px;
  padding-right: 48px;
  align-items: stretch;
  background: var(--primary-background);
  z-index: 2;
`;
const Tab = styled.button<{ $active: boolean }>`
  appearance: none;
  background: transparent;
  border: none;
  border-bottom: 3px solid
    ${({ $active }) => ($active ? "var(--header-background)" : "transparent")};
  padding: 10px 16px;
  font: inherit;
  color: ${({ $active }) =>
    $active ? "var(--primary-color)" : "var(--inactive-color)"};
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  cursor: pointer;
  margin-bottom: -1px;
  &:hover {
    color: var(--primary-color);
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
