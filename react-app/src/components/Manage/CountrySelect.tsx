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
const Dropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  /* Above leaflet's internal panes (tile 200, overlay 400,
     marker 600, popup 700) AND its control containers
     (.leaflet-top / -bottom wrap the +/- zoom buttons at
     z-index: 1000). Stay below the modal layer (2000) used
     by the bulk-action backdrops. */
  z-index: 1100;
  margin-top: 2px;
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
}

const CountrySelect = ({
  value,
  onChange,
  highlight,
  disabled,
  placeholder,
}: Props): React.ReactElement => {
  const { t } = useTranslation();
  const lang = useLangStore((s) => s.lang);
  const countryData = useLangStore((s) => s.countryData);
  const [filter, setFilter] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
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

  const display = React.useMemo(() => {
    if (!value) return "";
    if (isCountrySentinel(value)) {
      return String(t("country-sentinel-label"));
    }
    const upper = value.toUpperCase();
    const name = names[upper];
    return name ? `${name} (${upper.toUpperCase()})` : upper.toUpperCase();
  }, [value, names, t]);

  const sentinelLabel = String(t("country-sentinel-label"));
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
      {open && (
        <Dropdown role="listbox">
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
        </Dropdown>
      )}
    </Root>
  );
};

export default CountrySelect;
