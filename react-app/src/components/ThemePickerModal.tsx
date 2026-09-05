import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";

import ThemePicker from "./ThemePicker";
import {
  useThemePickerModalStore,
  useThemePreferenceStore,
} from "../stores";

// A native <dialog> opened with showModal() so the picker renders in
// the top layer. The swatches are the one place the page shows other
// themes' colours, and on the grayscale theme they must paint above
// the MonochromeOverlay — the top layer is above every in-flow
// z-index in every engine, so no ladder to climb.
//
// The <dialog> itself is the full-viewport scroll container (the
// swatch grid grows with the theme count); ::backdrop paints the
// scrim. UA dialog box styles are reset to get there.
const Dialog = styled.dialog`
  position: fixed;
  inset: 0;
  width: auto;
  height: auto;
  max-width: none;
  max-height: none;
  margin: 0;
  padding: 20px;
  border: none;
  background: transparent;
  color: inherit;
  overflow: auto;
  &[open] {
    display: flex;
    align-items: flex-start;
    justify-content: center;
  }
  &::backdrop {
    background: rgba(0, 0, 0, 0.55);
  }
`;
const ModalBox = styled.div`
  background: var(--primary-background);
  color: var(--primary-color);
  border: 1px solid var(--inactive-color);
  border-radius: 6px;
  padding: 20px;
  width: 100%;
  max-width: 560px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  margin: auto 0;
`;
const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
`;
const Title = styled.h2`
  margin: 0;
  font-size: 1.1em;
`;
const CloseButton = styled.button`
  border: none;
  background: none;
  color: var(--inactive-color);
  font-size: 1.2em;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
  &:hover {
    color: var(--primary-color);
  }
`;

// Theme picker as a dedicated modal opened from the UserMenu.
// Owns the hover-preview state: open syncs `committedTheme` from the
// store; hovering a swatch live-previews via `setPreference`; clicking
// commits both; closing without a click reverts the preview. Same
// semantics the inline UserMenu picker had before, just moved out.
const ThemePickerModal = (): React.ReactElement | null => {
  const { t } = useTranslation();
  const isOpen = useThemePickerModalStore((s) => s.isOpen);
  const close = useThemePickerModalStore((s) => s.close);
  const themePreference = useThemePreferenceStore((s) => s.preference);
  const setThemePreference = useThemePreferenceStore((s) => s.setPreference);

  const [committedTheme, setCommittedTheme] = React.useState<string | null>(
    themePreference
  );
  const prevIsOpenRef = React.useRef(isOpen);
  React.useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      // Modal opening: snapshot the current preference as the
      // committed baseline. Hover preview can roam from here.
      setCommittedTheme(themePreference);
    } else if (!isOpen && prevIsOpenRef.current) {
      // Modal closing: if the active preference drifted (uncommitted
      // hover preview), restore the committed value.
      if (themePreference !== committedTheme) {
        setThemePreference(committedTheme);
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, themePreference, committedTheme, setThemePreference]);

  React.useEffect(() => {
    if (!isOpen) return;
    // Capture-phase + stopImmediatePropagation: see LoginModal.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      close();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [isOpen, close]);

  const dialogRef = React.useRef<HTMLDialogElement>(null);
  React.useEffect(() => {
    // The element only exists while open, so this runs right after
    // it mounts. Unmounting an open <dialog> drops it from the top
    // layer on its own — no close() needed on the way out.
    if (isOpen) dialogRef.current?.showModal();
  }, [isOpen]);

  if (!isOpen) return null;

  // Backdrop clicks target the <dialog> element itself; clicks inside
  // ModalBox target its descendants.
  const onBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) close();
  };
  // Native dismissal (Escape → cancel) syncs back to the store so it
  // stays the single source of truth; preventDefault keeps the
  // browser from closing the element out from under React.
  const onCancel = (event: React.SyntheticEvent) => {
    event.preventDefault();
    close();
  };
  const onPreview = (id: string | null) => {
    // null from ThemePicker means "mouse left the grid" — restore
    // committed. Otherwise live-preview the hovered theme.
    if (id === null) {
      if (themePreference !== committedTheme) {
        setThemePreference(committedTheme);
      }
      return;
    }
    setThemePreference(id);
  };
  const onChange = (id: string | null) => {
    setCommittedTheme(id);
    setThemePreference(id);
  };

  return (
    <Dialog
      ref={dialogRef}
      onClick={onBackdropClick}
      onCancel={onCancel}
      aria-labelledby="theme-picker-modal-title"
    >
      <ModalBox>
        <Header>
          <Title id="theme-picker-modal-title">{t("theme-label")}</Title>
          <CloseButton
            type="button"
            onClick={close}
            aria-label={t("close")}
          >
            ╳
          </CloseButton>
        </Header>
        <ThemePicker
          value={committedTheme}
          onChange={onChange}
          onPreview={onPreview}
          defaultLabel={String(t("theme-follow-default"))}
        />
      </ModalBox>
    </Dialog>
  );
};
export default ThemePickerModal;
