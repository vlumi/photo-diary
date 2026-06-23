// Inline typeahead for the country field, shared between
// PhotoDrawer (single-row edit) and BulkActions (multi-row edit).
// Reuses the lang store's `countryData` (the same
// i18n-iso-countries instance the public viewer uses for flag
// rendering) — no extra network call, no new dependency. Stores
// the alpha-2 code on the form; the dropdown renders localised
// names. Empty filter shows all countries alphabetised; typing
// narrows by name or code. Pins a "No country" option (the
// `xx` sentinel) at the top so an operator can mark photos
// taken in international waters without typing the raw code.
import React from "react";
import { createPortal } from "react-dom";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";

import { useLangStore } from "../../stores";
import {
  COUNTRY_SENTINEL,
  isCountrySentinel,
} from "../../lib/country-sentinel";

const Root = styled.div`
  position: relative;
`;
const TypeaheadInput = styled.input<{ $highlight?: boolean }>`
  font: inherit;
  padding: 6px 8px;
  background: var(--primary-background);
  color: var(--primary-color);
  border: 1px solid
    ${({ $highlight }) =>
      $highlight ? "var(--header-color)" : "var(--inactive-color)"};
  border-radius: 4px;
  width: 100%;
  box-sizing: border-box;
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;
// position: fixed so we can escape any `overflow: auto` ancestor
// (e.g. the bulk-action modal's ModalBody) — clipping would
// otherwise hide the dropdown behind subsequent input rows.
// The component portals the dropdown to <body> for the same
// reason; z-index 2100 keeps it above modal backdrops (2000)
// without painting over an open <select> menu native chrome.
const Dropdown = styled.div`
  position: fixed;
  z-index: 2100;
  max-height: 240px;
  overflow-y: auto;
  background: var(--primary-background);
  color: var(--primary-color);
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
`;
const Option = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 10px;
  background: ${({ $active }) =>
    $active ? "var(--header-background)" : "transparent"};
  color: ${({ $active }) =>
    $active ? "var(--header-color)" : "var(--primary-color)"};
  border: none;
  text-align: left;
  font: inherit;
  font-size: 0.9em;
  cursor: pointer;
  &:hover {
    background: var(--header-background);
    color: var(--header-color);
  }
`;
const Code = styled.span`
  margin-left: auto;
  font-family: monospace;
  font-size: 0.85em;
  color: var(--inactive-color);
`;

interface Props {
  value: string;
  onChange: (code: string) => void;
  highlight?: boolean;
  disabled?: boolean;
  placeholder?: string;
  // Render names in this language instead of the user's UI lang.
  // PhotoDrawer / BulkActions pass the instance's primary language
  // (from `/api/v1/meta`) so the canonical country label stays
  // stable across operator-language switches. Falls back to the
  // lang store's active lang when omitted.
  lang?: string;
}

const CountrySelect = ({
  value,
  onChange,
  highlight,
  disabled,
  placeholder,
  lang: langProp,
}: Props): React.ReactElement => {
  const { t } = useTranslation();
  const storeLang = useLangStore((s) => s.lang);
  const lang = langProp ?? storeLang;
  const countryData = useLangStore((s) => s.countryData);
  const [filter, setFilter] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const [rect, setRect] = React.useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  // Re-position the portalled dropdown whenever the input moves —
  // covers initial open, modal scroll, window resize, etc. Uses
  // capture so scroll events bubble from inside `overflow: auto`
  // ancestors too.
  React.useLayoutEffect(() => {
    if (!open) return;
    const reposition = () => {
      const node = rootRef.current;
      if (!node) return;
      const r = node.getBoundingClientRect();
      setRect({ top: r.bottom + 2, left: r.left, width: r.width });
    };
    reposition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      const insideRoot = rootRef.current?.contains(target);
      const insideDropdown = dropdownRef.current?.contains(target);
      if (!insideRoot && !insideDropdown) {
        setOpen(false);
      }
    };
    // Capture-phase + stopImmediatePropagation so the dropdown
    // intercepts Esc before the Manage shell's Esc-up handler
    // navigates the user out of /m/users/<id>/etc. when
    // they were just trying to close this dropdown.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const names = React.useMemo(() => {
    if (!countryData) return {} as Record<string, string>;
    return countryData.getNames(lang) as Record<string, string>;
  }, [countryData, lang]);

  const matches = React.useMemo(() => {
    const needle = filter.trim().toLowerCase();
    const entries = Object.entries(names).map(([code, name]) => ({
      code: code.toLowerCase(),
      name,
    }));
    entries.sort((a, b) => a.name.localeCompare(b.name));
    if (!needle) return entries;
    return entries.filter(
      (e) =>
        e.name.toLowerCase().includes(needle) ||
        e.code.toLowerCase().includes(needle)
    );
  }, [names, filter]);

  const sentinelLabel = String(
    langProp ? t("country-sentinel-label", { lng: lang }) : t("country-sentinel-label")
  );

  const display = React.useMemo(() => {
    if (!value) return "";
    if (isCountrySentinel(value)) return sentinelLabel;
    const upper = value.toUpperCase();
    const name = names[upper];
    return name ? `${name} (${upper.toUpperCase()})` : upper.toUpperCase();
  }, [value, names, sentinelLabel]);
  const sentinelMatches = React.useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return true;
    return (
      sentinelLabel.toLowerCase().includes(needle) ||
      "xx".includes(needle)
    );
  }, [filter, sentinelLabel]);

  const choose = (code: string) => {
    onChange(code);
    setFilter("");
    setOpen(false);
  };

  const openDropdown = () => {
    if (value) {
      if (isCountrySentinel(value)) {
        setFilter(sentinelLabel);
      } else {
        const upper = value.toUpperCase();
        setFilter(names[upper] ?? upper);
      }
    }
    setOpen(true);
  };

  return (
    <Root ref={rootRef}>
      <TypeaheadInput
        type="text"
        value={open ? filter : display}
        placeholder={
          placeholder ?? String(t("manage-photo-country-filter-placeholder"))
        }
        onFocus={openDropdown}
        onChange={(e) => {
          setFilter(e.target.value);
          if (!open) setOpen(true);
        }}
        $highlight={!!highlight}
        disabled={disabled}
      />
      {open &&
        rect &&
        createPortal(
          <Dropdown
            ref={dropdownRef}
            role="listbox"
            style={{ top: rect.top, left: rect.left, width: rect.width }}
          >
            {value && (
              <Option
                type="button"
                $active={false}
                onClick={() => choose("")}
                title={String(t("manage-photo-country-clear"))}
              >
                <span>—</span>
                <span>{t("manage-photo-country-clear")}</span>
              </Option>
            )}
            {sentinelMatches && (
              <Option
                type="button"
                $active={isCountrySentinel(value)}
                onClick={() => choose(COUNTRY_SENTINEL)}
                title={sentinelLabel}
              >
                <span>{sentinelLabel}</span>
                <Code>XX</Code>
              </Option>
            )}
            {matches.length === 0 && !sentinelMatches && (
              <Option type="button" $active={false} disabled>
                <span>{t("manage-photo-country-no-match")}</span>
              </Option>
            )}
            {matches.map((entry) => {
              const codeUpper = entry.code.toUpperCase();
              const selected = value && value.toUpperCase() === codeUpper;
              return (
                <Option
                  key={entry.code}
                  type="button"
                  $active={!!selected}
                  onClick={() => choose(entry.code)}
                >
                  <span>{entry.name}</span>
                  <Code>{codeUpper}</Code>
                </Option>
              );
            })}
          </Dropdown>,
          document.body
        )}
    </Root>
  );
};

export default CountrySelect;
