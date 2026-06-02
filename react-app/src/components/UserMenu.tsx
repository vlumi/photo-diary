import React from "react";
import { useNavigate } from "react-router-dom";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { BsPersonFill, BsPerson } from "react-icons/bs";

import theme, { THEME_CATEGORIES, type ThemeCategory } from "../lib/theme";
import token from "../lib/token";
import tokenService from "../services/tokens";
import {
  useUserStore,
  useLoginModalStore,
  useChangePasswordModalStore,
  useBetaStore,
  useThemePreferenceStore,
} from "../stores";
import { BETA_FEATURES } from "../stores/beta";

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
const BetaToggle = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  color: var(--primary-color);
  font: inherit;
  cursor: pointer;
  &:hover {
    background: var(--header-background);
    color: var(--header-color);
  }
`;
const ThemeRow = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  color: var(--primary-color);
  font: inherit;
`;
const ThemeSelect = styled.select`
  flex: 1;
  font: inherit;
  padding: 2px 4px;
`;

// Profile icon in the top-right of the top menu. Anonymous (outlined) when
// not logged in — clicking opens the login modal. Filled when logged in —
// clicking opens a dropdown with the username, "Change password", and
// "Log out". Click outside or Escape closes the dropdown.
const UserMenu = (): React.ReactElement => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useUserStore((s) => s.user);
  const openLoginModal = useLoginModalStore((s) => s.open);
  const openChangePasswordModal = useChangePasswordModalStore((s) => s.open);
  const setUser = useUserStore((s) => s.setUser);
  const queryClient = useQueryClient();
  const betaModes = useBetaStore((s) => s.modes);
  const betaStored = useBetaStore((s) => s.stored);
  const setBetaStored = useBetaStore((s) => s.setStored);
  const userBetaFeatures = BETA_FEATURES.filter(
    (f) => betaModes[f] === "user"
  );
  const themePreference = useThemePreferenceStore((s) => s.preference);
  const setThemePreference = useThemePreferenceStore((s) => s.setPreference);

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
    // Server-side revoke first so the session row is gone before we
    // throw away the refresh token. Fire-and-forget — local state is
    // cleared regardless of whether the network call succeeds, so a
    // user offline / mid-rotation can still log out locally.
    const refreshToken = token.getRefreshToken();
    if (refreshToken) {
      tokenService.logout(refreshToken).catch(() => {});
    }
    // Order matters: clear the bearer before `setUser` so the React
    // re-render's queries don't fire with the just-revoked token.
    // localStorage is narrowed to the `user` key so the `lang`
    // preference survives.
    token.clearTokens();
    window.localStorage.removeItem("user");
    setUser(undefined);
    // Drop access-derived caches so the re-render fetches the guest
    // view instead of leaving the previous user's galleries / map
    // visibility / per-photo coords on screen.
    queryClient.invalidateQueries({ queryKey: ["galleries"] });
    queryClient.invalidateQueries({ queryKey: ["gallery-photos"] });
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
          {user.isAdmin() && (
            <MenuItem
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                navigate("/m/photos");
              }}
            >
              {t("manage-menu-entry")}
            </MenuItem>
          )}
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
          <ThemeRow>
            <span>{t("theme-label")}</span>
            <ThemeSelect
              value={themePreference ?? ""}
              onChange={(e) =>
                setThemePreference(e.target.value === "" ? null : e.target.value)
              }
            >
              <option value="">{t("theme-follow-default")}</option>
              {THEME_CATEGORIES.map((category: ThemeCategory) => {
                const entries = theme.manifest.filter(
                  (entry) => entry.category === category
                );
                if (entries.length === 0) return null;
                return (
                  <optgroup
                    key={category}
                    label={String(t(`theme-group-${category}`))}
                  >
                    {entries.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.displayName}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </ThemeSelect>
          </ThemeRow>
          {userBetaFeatures.map((f) => (
            <BetaToggle key={f}>
              <input
                type="checkbox"
                checked={betaStored[f]}
                onChange={(e) => setBetaStored(f, e.target.checked)}
              />
              {t(`beta-feature-${f}`)}
            </BetaToggle>
          ))}
          <MenuItem type="button" role="menuitem" onClick={handleLogout}>
            {t("logout")}
          </MenuItem>
        </Dropdown>
      )}
    </Root>
  );
};
export default UserMenu;
