import React from "react";
import { useNavigate } from "react-router-dom";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BsPersonFill, BsPerson } from "react-icons/bs";

import theme from "../lib/theme";
import { translatePathForHost } from "../lib/cross-host-path";
import { useHostScope } from "../lib/use-host-scope";
import metaService from "../services/meta";
import tokenService from "../services/tokens";
import {
  useUserStore,
  useLoginModalStore,
  useChangePasswordModalStore,
  useNotificationsStore,
  useBetaStore,
  useThemePreferenceStore,
  useThemePickerModalStore,
} from "../stores";
import { BETA_FEATURES } from "../stores/beta";

interface KnownHost {
  hostname: string;
  label?: string;
  isMain?: boolean;
}

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
const ThemeMenuItem = styled(MenuItem)`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
`;
const ThemeMenuValue = styled.span`
  color: var(--inactive-color);
  font-size: 0.9em;
`;
// Host-switcher block (#664). Separator above so the operator can
// tell at a glance "this is the cross-host nav, not just another
// menu item". Heading label is the kind of muted overline `cdn` /
// `defaultTheme` would carry if those had headings — same family.
const SectionDivider = styled.div`
  border-top: 1px solid var(--inactive-color);
  margin: 4px 0;
`;
const SectionHeading = styled.div`
  padding: 4px 14px 2px;
  font-size: 0.7em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--inactive-color);
`;
const HostMenuItem = styled(MenuItem)<{ $current: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  cursor: ${({ $current }) => ($current ? "default" : "pointer")};
  ${({ $current }) =>
    $current
      ? `
        color: var(--inactive-color);
        &:hover { background: none; color: var(--inactive-color); }
      `
      : ""}
`;
const HostMenuHostname = styled.span`
  font-size: 0.85em;
  color: var(--inactive-color);
`;

// Profile icon in the top-right of the top menu. Anonymous (outlined) when
// not logged in — clicking opens the login modal. Filled when logged in —
// clicking opens a dropdown with the username, "Change password", and
// "Log out". Click outside or Escape closes the dropdown.
const UserMenu = (): React.ReactElement => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useUserStore((s) => s.user);
  const { isHostScoped } = useHostScope();
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
  const openThemeModal = useThemePickerModalStore((s) => s.open);
  const notify = useNotificationsStore((s) => s.notify);

  // knownHosts drives the cross-host switcher (#664). Shared cache
  // key with /m/instance so the form's edits update the dropdown
  // without a separate fetch.
  const metaQuery = useQuery({
    queryKey: ["meta"],
    queryFn: () => metaService.getAll(),
    enabled: !!user,
  });
  const knownHosts = (() => {
    const raw = (metaQuery.data as { knownHosts?: unknown } | undefined)
      ?.knownHosts;
    if (!Array.isArray(raw)) return [] as KnownHost[];
    return raw.filter(
      (h): h is KnownHost =>
        !!h && typeof (h as { hostname?: unknown }).hostname === "string"
    );
  })();
  const currentHostname = typeof window !== "undefined"
    ? window.location.hostname.toLowerCase()
    : "";

  const switchToHost = async (target: string) => {
    setIsOpen(false);
    if (target.toLowerCase() === currentHostname) return;
    try {
      const data = await tokenService.crossHost(
        target,
        translatePathForHost(window.location.pathname)
      );
      window.location.href = data.redirectUrl;
    } catch (err) {
      notify(
        "error",
        err instanceof Error ? err.message : t("user-menu-switch-failed")
      );
    }
  };
  // Resolve the committed theme's display name for the menu item's
  // value suffix. `null` means "Follow gallery default" — fall back to
  // the i18n label. An unknown id (renamed / removed theme) falls back
  // to the raw id rather than blanking the menu item.
  const themeLabel = (() => {
    if (themePreference === null) return t("theme-follow-default");
    const entry = theme.manifest.find((e) => e.id === themePreference);
    return entry?.displayName ?? themePreference;
  })();

  const [isOpen, setIsOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    // Capture-phase + stopImmediatePropagation so closing this
    // dropdown doesn't also trigger the Manage shell's Esc-up
    // navigation (#612) when opened from /m/*.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      setIsOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [isOpen]);

  const handleLogout = () => {
    setIsOpen(false);
    // Server-side revoke first so the session row is gone before we
    // throw away local state. The server identifies the session via
    // the refresh cookie and clears both auth cookies in the response.
    // Fire-and-forget — local state is cleared regardless of whether
    // the network call succeeds, so a user offline can still log out
    // locally.
    tokenService.logout().catch(() => {});
    // localStorage is narrowed to the `user` key so the `lang`
    // preference survives.
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
          {user.isAdmin() && (
            <MenuItem
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                navigate("/m");
              }}
            >
              {t("manage-menu-entry")}
            </MenuItem>
          )}
          {user.isAdmin() && !isHostScoped && (
            <MenuItem
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                navigate("/s");
              }}
            >
              {t("stats-menu-entry")}
            </MenuItem>
          )}
          <ThemeMenuItem
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              openThemeModal();
            }}
          >
            <span>{t("theme-label")}</span>
            <ThemeMenuValue>{themeLabel}</ThemeMenuValue>
          </ThemeMenuItem>
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
          {knownHosts.length > 0 && (
            <>
              <SectionDivider />
              <SectionHeading>{t("user-menu-other-hosts")}</SectionHeading>
              {knownHosts.map((h) => {
                const isCurrent = h.hostname.toLowerCase() === currentHostname;
                return (
                  <HostMenuItem
                    key={h.hostname}
                    type="button"
                    role="menuitem"
                    aria-current={isCurrent ? "true" : undefined}
                    $current={isCurrent}
                    disabled={isCurrent}
                    onClick={isCurrent ? undefined : () => void switchToHost(h.hostname)}
                  >
                    <span>{h.label || h.hostname}</span>
                    {h.label && (
                      <HostMenuHostname>{h.hostname}</HostMenuHostname>
                    )}
                  </HostMenuItem>
                );
              })}
            </>
          )}
          <SectionDivider />
          <MenuItem type="button" role="menuitem" onClick={handleLogout}>
            {t("logout")}
          </MenuItem>
        </Dropdown>
      )}
    </Root>
  );
};
export default UserMenu;
