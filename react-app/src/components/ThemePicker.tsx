import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { BsCheck } from "react-icons/bs";

import theme, { THEME_CATEGORIES, type ThemeCategory } from "../lib/theme";

interface Props {
  value: string | null;
  onChange: (id: string | null) => void;
  // Optional hover-preview hook. When provided, the picker calls
  // onPreview(id) on tile mouseEnter and onPreview(null) on grid
  // mouseLeave / unmount. The caller decides how to apply the
  // preview (e.g. UserMenu writes it straight to the
  // ThemePreference store; gallery editor leaves it absent for
  // a form-state-only experience).
  onPreview?: (id: string | null) => void;
  // Label for the "no theme override" option. Differs by context:
  //   UserMenu  — "Follow gallery default"
  //   Gallery editor — "Use instance default"
  defaultLabel?: string;
}

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;
const DefaultRow = styled.button<{ $active: boolean }>`
  align-self: flex-start;
  font: inherit;
  font-size: 0.85em;
  padding: 3px 10px;
  border: 2px solid
    ${({ $active }) =>
      $active ? "var(--primary-color)" : "var(--inactive-color)"};
  border-radius: 12px;
  background: ${({ $active }) =>
    $active ? "var(--header-background)" : "transparent"};
  color: ${({ $active }) =>
    $active ? "var(--header-color)" : "var(--primary-color)"};
  cursor: pointer;
  &:hover,
  &:focus-visible {
    border-color: var(--primary-color);
  }
`;
const CategoryBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;
const CategoryLabel = styled.span`
  font-size: 0.75em;
  text-transform: uppercase;
  color: var(--inactive-color);
  letter-spacing: 0.05em;
`;
const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
  gap: 6px;
`;
const Cell = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 2px;
  min-width: 0;
`;
const Swatch = styled.button<{
  $bg: string;
  $fg: string;
  $active: boolean;
}>`
  position: relative;
  height: 40px;
  border-radius: 4px;
  padding: 0;
  cursor: pointer;
  background: ${({ $bg }) => $bg};
  color: ${({ $fg }) => $fg};
  border: ${({ $active }) =>
    $active
      ? "3px solid var(--primary-color)"
      : "1px solid var(--inactive-color)"};
  display: flex;
  flex-direction: column;
  align-items: stretch;
  overflow: hidden;
  font: inherit;
  font-weight: bold;
  font-size: 0.85em;
  outline: ${({ $active }) =>
    $active ? "1px solid var(--header-background)" : "none"};
  outline-offset: 1px;
  &:hover,
  &:focus-visible {
    border-color: var(--primary-color);
  }
`;
const SwatchHeader = styled.span<{ $header: string }>`
  display: block;
  height: 12px;
  background: ${({ $header }) => $header};
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
`;
const SwatchBody = styled.span`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
`;
const SwatchCheck = styled.span`
  position: absolute;
  top: 1px;
  right: 1px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--primary-color);
  color: var(--primary-background);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1em;
  pointer-events: none;
`;
const SwatchLabel = styled.span<{ $active: boolean }>`
  font-size: 0.7em;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: ${({ $active }) =>
    $active ? "var(--primary-color)" : "var(--inactive-color)"};
  font-weight: ${({ $active }) => ($active ? "bold" : "normal")};
`;

const ThemePicker = ({
  value,
  onChange,
  onPreview,
  defaultLabel,
}: Props): React.ReactElement => {
  const { t } = useTranslation();
  const handleEnter = (id: string | null) => onPreview?.(id);
  const handleLeave = () => onPreview?.(null);

  React.useEffect(() => {
    // If the consumer wired a preview hook, restore on unmount so a
    // closed dropdown / unmounted form doesn't strand the preview
    // active on the page.
    return () => onPreview?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Root onMouseLeave={handleLeave}>
      {defaultLabel !== undefined && (
        <DefaultRow
          type="button"
          $active={value === null}
          onMouseEnter={() => handleEnter(null)}
          onClick={() => onChange(null)}
        >
          {defaultLabel}
        </DefaultRow>
      )}
      {THEME_CATEGORIES.map((category: ThemeCategory) => {
        const entries = theme.manifest.filter(
          (entry) => entry.category === category
        );
        if (entries.length === 0) return null;
        return (
          <CategoryBlock key={category}>
            <CategoryLabel>{t(`theme-group-${category}`)}</CategoryLabel>
            <Grid>
              {entries.map((entry) => {
                const colors = theme.setTheme(entry.id);
                const active = value === entry.id;
                return (
                  <Cell key={entry.id}>
                    <Swatch
                      type="button"
                      title={entry.displayName}
                      aria-label={entry.displayName}
                      aria-pressed={active}
                      $bg={colors.get("primary-background")}
                      $fg={colors.get("primary-color")}
                      $active={active}
                      onMouseEnter={() => handleEnter(entry.id)}
                      onClick={() => onChange(entry.id)}
                    >
                      <SwatchHeader $header={colors.get("header-background")} />
                      <SwatchBody>T</SwatchBody>
                      {active && (
                        <SwatchCheck aria-hidden>
                          <BsCheck />
                        </SwatchCheck>
                      )}
                    </Swatch>
                    <SwatchLabel $active={active}>
                      {entry.displayName}
                    </SwatchLabel>
                  </Cell>
                );
              })}
            </Grid>
          </CategoryBlock>
        );
      })}
    </Root>
  );
};

export default ThemePicker;
