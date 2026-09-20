import styled from "@emotion/styled";
import ItemModal from "../ItemModal";

// In-flow editor panel — replaces the photos sidebar's filter
// contents when a photo is open. The grid stays clickable so an
// operator can hop between photos; clicking another tile reloads
// this panel with the new photo's data. Close (back to filters)
// happens via Esc, Cancel, or the close button.
export const Drawer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  background: var(--primary-background);
  color: var(--primary-color);
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  box-sizing: border-box;
  /* No overflow:hidden — the sticky Header/Footer below need a
     scrolling ancestor without a clipping context between them.
     Routed mode scrolls at ItemModal.Body; inline mode scrolls at
     the inner Body (which has its own overflow-y: auto). */
  min-height: 0;
  flex: 1 1 auto;
`;
export const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--inactive-color);
  flex: 0 0 auto;
  position: sticky;
  top: 0;
  background: var(--primary-background);
  z-index: 2;
`;
export const Title = styled.div`
  font-weight: bold;
  font-size: 0.95em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1 1 auto;
  min-width: 0;
  text-align: center;
`;
export const HeaderIconButton = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: inherit;
  font-size: 1.1em;
  cursor: pointer;
  text-decoration: none;
  padding: 4px;
  background: none;
  border: none;
  font: inherit;
  &:hover {
    color: var(--inactive-color);
  }
  &[aria-disabled="true"] {
    opacity: 0.4;
    pointer-events: none;
  }
`;
export const HeaderActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: 0 0 auto;
`;
export const Body = styled.div`
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
`;
export const Preview = styled.img`
  width: 100%;
  max-height: 200px;
  object-fit: contain;
  background: var(--tile-background);
  border-radius: 2px;
`;
export const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;
export const FieldRow = styled.div`
  display: grid;
  /* auto-fit lets the modal pack as many columns as fit at the
     current width — 2-col on narrow screens, 3+ on wide modals. */
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 8px;
`;
export const FieldLabel = styled.span`
  font-size: 0.8em;
  color: var(--inactive-color);
`;
export const FieldHint = styled.span`
  font-size: 0.75em;
  color: var(--inactive-color);
  font-style: italic;
`;
export const Input = styled.input<{ $highlight?: boolean }>`
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
// Wraps an EXIF-derived input + the optional revert affordance so
// the input keeps its 100% width and the button slots flush on the
// right.
export const InputRow = styled.div`
  display: flex;
  align-items: stretch;
  gap: 4px;
`;
export const RevertButton = styled.button`
  flex: 0 0 auto;
  padding: 0 8px;
  background: transparent;
  color: var(--inactive-color);
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  &:hover {
    color: var(--primary-color);
  }
`;
export const UnlockRow = styled.label`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border: 1px dashed var(--inactive-color);
  border-radius: 4px;
  font-size: 0.85em;
  color: var(--inactive-color);
`;
export const TextArea = styled.textarea<{ $highlight?: boolean }>`
  font: inherit;
  padding: 6px 8px;
  background: var(--primary-background);
  color: var(--primary-color);
  border: 1px solid
    ${({ $highlight }) =>
    $highlight ? "var(--header-color)" : "var(--inactive-color)"};
  border-radius: 4px;
  width: 100%;
  min-height: 60px;
  box-sizing: border-box;
  resize: vertical;
`;
// MetadataPanel-style 2-col label/value grid for the read-only
// section: small uppercase labels, muted values, long entries wrap
// inside the value cell so they don't push the panel wider.
export const MetaTable = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  column-gap: 10px;
  row-gap: 4px;
`;
export const MetaLabel = styled.div`
  font-size: 0.7em;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--inactive-color);
  padding-top: 2px;
  text-align: right;
  white-space: nowrap;
`;
export const MetaValue = styled.div`
  font-size: 0.85em;
  color: var(--inactive-color);
  line-height: 1.4;
  text-align: left;
  word-break: break-word;
  min-width: 0;
`;
// Overview panel doubles as the photo's visual identity at the top
// of the drawer — the largest rendition acts as a hero preview on
// the left, with renditions / galleries / privacy listed on the
// right as compact rows. Saves a couple of two-row Sections worth
// of chrome at the cost of nesting.
export const RenditionRowLayout = styled.div`
  display: flex;
  gap: 16px;
  align-items: flex-start;
  /* On narrow viewports (iPhone SE etc.) the 180px hero + meta row
     leaves the meta column too narrow for chips + Private label —
     stack the hero above the meta instead. */
  @media (max-width: 480px) {
    flex-direction: column;
  }
`;
export const OverviewMeta = styled.div`
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
`;
export const OverviewMetaRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;
export const OverviewMetaLabel = styled.span`
  font-size: 0.75em;
  color: var(--inactive-color);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;
export const OverviewMetaValue = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
`;
export const RenditionHero = styled.a`
  flex: 0 0 auto;
  display: block;
  text-decoration: none;
`;
export const RenditionHeroImg = styled.img`
  width: 180px;
  height: 180px;
  object-fit: contain;
  background: var(--tile-background);
  border-radius: 4px;
  border: 1px solid var(--inactive-color);
`;
export const RenditionChips = styled.div`
  flex: 1 1 auto;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-content: flex-start;
`;
export const RenditionChip = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid var(--inactive-color);
  border-radius: 999px;
  background: var(--primary-background);
  color: var(--primary-color);
  text-decoration: none;
  font-size: 0.85em;
  &:hover {
    background: var(--tile-background);
  }
`;
export const MetaValueRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`;
export const GalleryChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;
export const GalleryChip = styled.div`
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--inactive-color);
  border-radius: 12px;
  overflow: hidden;
  font-size: 0.85em;
  background: transparent;
`;
export const GalleryChipPrimary = styled.a`
  padding: 2px 8px;
  color: var(--primary-color);
  text-decoration: none;
  cursor: pointer;
  &:hover {
    background: var(--header-background);
    color: var(--header-color);
  }
`;
export const GalleryChipSecondary = styled.a`
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  border-left: 1px solid var(--inactive-color);
  color: var(--inactive-color);
  cursor: pointer;
  &:hover {
    background: var(--header-background);
    color: var(--header-color);
  }
`;
export const InlineActionButton = styled.button`
  font: inherit;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: transparent;
  color: var(--primary-color);
  border: 1px solid var(--inactive-color);
  border-radius: 10px;
  font-size: 0.75em;
  cursor: pointer;
  white-space: nowrap;
  &:hover {
    background: var(--header-background);
    color: var(--header-color);
    border-color: var(--header-background);
  }
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;
export const CopyIconButton = styled.button`
  font: inherit;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 4px;
  margin-left: 6px;
  background: transparent;
  color: var(--inactive-color);
  border: none;
  border-radius: 3px;
  font-size: 0.85em;
  cursor: pointer;
  vertical-align: middle;
  &:hover {
    color: var(--primary-color);
  }
  &:focus-visible {
    outline: 1px solid var(--primary-color);
    outline-offset: 1px;
  }
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;
export const EmptyValue = styled.span`
  font-style: italic;
`;
export const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid var(--inactive-color);
  flex: 0 0 auto;
  position: sticky;
  bottom: 0;
  background: var(--primary-background);
  z-index: 2;
`;
export const ButtonPrimary = styled.button`
  font: inherit;
  padding: 6px 14px;
  background: var(--header-background);
  color: var(--header-color);
  border: 1px solid var(--header-background);
  border-radius: 4px;
  cursor: pointer;
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;
export const ButtonSecondary = styled.button`
  font: inherit;
  padding: 6px 14px;
  background: transparent;
  color: var(--primary-color);
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  cursor: pointer;
`;
export const ErrorBanner = styled.div`
  padding: 8px 12px;
  background: rgba(220, 60, 60, 0.15);
  color: var(--primary-color);
  border-radius: 4px;
  font-size: 0.85em;
`;
