import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";

import ThemePicker from "./ThemePicker";
import {
  useThemePickerModalStore,
  useThemePreferenceStore,
} from "../stores";

// `position: fixed; inset: 0` overlay over the rest of the app. The
// picker has a swatch grid that grows with the theme count, so the
// modal needs to scroll when it doesn't fit — `align-items: flex-
// start` + `overflow: auto` on the backdrop. z-index above
// MetadataPanel + Photo modal.
const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 2000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 20px;
  overflow: auto;
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

// Theme picker as a dedicated modal opened from the UserMenu (#576).
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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  if (!isOpen) return null;

  const onBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) close();
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
    <Backdrop
      onClick={onBackdropClick}
      role="dialog"
      aria-modal="true"
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
    </Backdrop>
  );
};
export default ThemePickerModal;
