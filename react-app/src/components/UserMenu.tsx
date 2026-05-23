import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { BsPersonFill, BsPerson } from "react-icons/bs";

import token from "../lib/token";
import {
  useUserStore,
  useLoginModalStore,
  useChangePasswordModalStore,
} from "../stores";

const Root = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;
// 40px wide so the tap target meets the usual accessibility floor on
// mobile (the top menu's 25px height caps the vertical dimension; the
// extra horizontal padding gives thumbs room). 1.4em font-size makes the
// icon glyph itself larger so it's easier to see and aim for. Hover and
// keyboard-focus paint a `--header-sub-color` background instead of
// shifting the icon colour — the previous `color: var(--primary-color)`
// hover blended into the header background on most themes and the icon
// effectively disappeared.
const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 25px;
  padding: 0;
  border: none;
  background: none;
  color: var(--header-color);
  font-size: 1.4em;
  cursor: pointer;
  transition: background 0.1s;
  &:hover,
  &:focus-visible {
    background: var(--header-sub-color);
  }
`;
const Dropdown = styled.div`
  position: absolute;
  top: 100%;
  right: 0;
  min-width: 180px;
  background: var(--primary-background);
  color: var(--primary-color);
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 1500;
  display: flex;
  flex-direction: column;
  padding: 4px 0;
`;
const UserLabel = styled.div`
  padding: 6px 14px;
  font-weight: bold;
  border-bottom: 1px solid var(--inactive-color);
  margin-bottom: 4px;
`;
const MenuItem = styled.button`
  padding: 8px 14px;
  border: none;
  background: none;
  color: var(--primary-color);
  text-align: left;
  font: inherit;
  cursor: pointer;
  &:hover {
    background: var(--header-background);
    color: var(--header-color);
  }
`;

// Profile icon in the top-right of the top menu. Anonymous (outlined) when
// not logged in — clicking opens the login modal. Filled when logged in —
// clicking opens a dropdown with the username, "Change password", and
// "Log out". Click outside or Escape closes the dropdown.
const UserMenu = (): React.ReactElement => {
  const { t } = useTranslation();
  const user = useUserStore((s) => s.user);
  const openLoginModal = useLoginModalStore((s) => s.open);
  const openChangePasswordModal = useChangePasswordModalStore((s) => s.open);
  const setUser = useUserStore((s) => s.setUser);

  const [isOpen, setIsOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);

  const handleLogout = () => {
    setIsOpen(false);
    // Order matters: clear the bearer before `setUser` so the React
    // re-render's queries don't fire with the just-revoked token. Same
    // sequence as `Logout.tsx`. localStorage is narrowed to the `user`
    // key so the `lang` preference survives.
    token.clearToken();
    window.localStorage.removeItem("user");
    setUser(undefined);
  };

  if (!user) {
    return (
      <Root>
        <IconButton
          type="button"
          aria-label={t("login")}
          onClick={() => openLoginModal()}
        >
          <BsPerson />
        </IconButton>
      </Root>
    );
  }

  return (
    <Root ref={rootRef}>
      <IconButton
        type="button"
        aria-label={String(user.id())}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <BsPersonFill />
      </IconButton>
      {isOpen && (
        <Dropdown role="menu">
          <UserLabel>{user.id()}</UserLabel>
          <MenuItem
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              openChangePasswordModal();
            }}
          >
            {t("change-password-title")}
          </MenuItem>
          <MenuItem type="button" role="menuitem" onClick={handleLogout}>
            {t("logout")}
          </MenuItem>
        </Dropdown>
      )}
    </Root>
  );
};
export default UserMenu;
