import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BsArrowDown, BsArrowUp, BsXLg } from "react-icons/bs";

import galleriesService from "../../services/galleries";
import { Section, SectionTitle, SectionHint as Hint } from "./Section";
const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;
const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
`;
const RowLink = styled(RouterLink)`
  flex: 1 1 auto;
  min-width: 0;
  text-decoration: none;
  color: inherit;
  font-size: 0.95em;
  &:hover {
    text-decoration: underline;
  }
`;
const RowLabel = styled.div`
  flex: 1 1 auto;
  min-width: 0;
  font-size: 0.95em;
`;
const RowTitle = styled.div``;
const RowId = styled.div`
  font-family: monospace;
  font-size: 0.8em;
  color: var(--inactive-color);
`;
const IconButton = styled.button`
  background: none;
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  color: var(--primary-color);
  padding: 4px 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
  &:hover:not(:disabled) {
    border-color: var(--primary-color);
  }
`;
const PickerRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;
const Select = styled.select`
  font: inherit;
  padding: 6px 8px;
  background: var(--primary-background);
  color: var(--primary-color);
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  flex: 1 1 auto;
`;
const AddButton = styled.button`
  font: inherit;
  padding: 4px 10px;
  background: transparent;
  color: var(--primary-color);
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  cursor: pointer;
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;

interface GalleryListItem {
  id: string;
  title?: string;
  type?: "real" | "hybrid" | "saved_filter";
}

interface Props {
  galleryId: string;
  editing: boolean;
  sources: string[];
  setSources?: (sources: string[]) => void;
}

// View + edit surface for a gallery's hybrid sources (#22 / #568).
// View mode lists each source as a link to its own manage page;
// edit mode adds an ordered list with arrow reorder + remove and a
// dropdown picker filtered to real galleries (the model enforces
// "sources must be real" so the UI pre-empts). Saving with sources
// non-empty stamps the gallery as `type='hybrid'` server-side;
// clearing the list reverts to `'real'`.
const GallerySourcesSection = ({
  galleryId,
  editing,
  sources,
  setSources,
}: Props): React.ReactElement | null => {
  const { t } = useTranslation();

  const galleriesQuery = useQuery({
    queryKey: ["manage-galleries"],
    queryFn: () => galleriesService.getAll(),
  });
  const allGalleries = (galleriesQuery.data ?? []) as GalleryListItem[];
  const byId = React.useMemo(() => {
    const m = new Map<string, GalleryListItem>();
    for (const g of allGalleries) m.set(g.id, g);
    return m;
  }, [allGalleries]);
  // Selectable: real galleries not equal to self and not already in
  // the sources list. Hybrids and saved-filter galleries are
  // excluded — same constraint the migration enforces.
  const selectable = React.useMemo(() => {
    return allGalleries.filter(
      (g) =>
        (g.type ?? "real") === "real" &&
        g.id !== galleryId &&
        !sources.includes(g.id)
    );
  }, [allGalleries, galleryId, sources]);
  const [picker, setPicker] = React.useState("");

  if (!editing && sources.length === 0) return null;

  const move = (from: number, to: number) => {
    if (!setSources) return;
    if (to < 0 || to >= sources.length) return;
    const next = [...sources];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setSources(next);
  };
  const remove = (idx: number) => {
    if (!setSources) return;
    const next = [...sources];
    next.splice(idx, 1);
    setSources(next);
  };
  const add = () => {
    if (!setSources || !picker) return;
    if (sources.includes(picker)) return;
    setSources([...sources, picker]);
    setPicker("");
  };

  const labelFor = (id: string): string => {
    const g = byId.get(id);
    if (!g) return id;
    return g.title && g.title.length > 0 ? g.title : id;
  };

  return (
    <Section>
      <SectionTitle>{t("manage-gallery-sources-title")}</SectionTitle>
      {!editing ? (
        <List>
          {sources.map((id) => (
            <Row key={id}>
              <RowLink to={`/m/g/${encodeURIComponent(id)}`}>
                <RowTitle>{labelFor(id)}</RowTitle>
                {labelFor(id) !== id ? <RowId>{id}</RowId> : null}
              </RowLink>
            </Row>
          ))}
        </List>
      ) : (
        <>
          <Hint>{t("manage-gallery-sources-hint")}</Hint>
          {sources.length > 0 ? (
            <List>
              {sources.map((id, idx) => {
                const known = byId.has(id);
                return (
                  <Row key={id}>
                    <RowLabel>
                      <RowTitle>{labelFor(id)}</RowTitle>
                      {labelFor(id) !== id || !known ? (
                        <RowId>{id}</RowId>
                      ) : null}
                    </RowLabel>
                    <IconButton
                      type="button"
                      onClick={() => move(idx, idx - 1)}
                      disabled={idx === 0}
                      aria-label={String(t("manage-gallery-sources-up"))}
                      title={String(t("manage-gallery-sources-up"))}
                    >
                      <BsArrowUp aria-hidden />
                    </IconButton>
                    <IconButton
                      type="button"
                      onClick={() => move(idx, idx + 1)}
                      disabled={idx === sources.length - 1}
                      aria-label={String(t("manage-gallery-sources-down"))}
                      title={String(t("manage-gallery-sources-down"))}
                    >
                      <BsArrowDown aria-hidden />
                    </IconButton>
                    <IconButton
                      type="button"
                      onClick={() => remove(idx)}
                      aria-label={String(t("manage-gallery-sources-remove"))}
                      title={String(t("manage-gallery-sources-remove"))}
                    >
                      <BsXLg aria-hidden />
                    </IconButton>
                  </Row>
                );
              })}
            </List>
          ) : null}
          <PickerRow>
            <Select
              value={picker}
              onChange={(e) => setPicker(e.target.value)}
              disabled={selectable.length === 0}
            >
              <option value="">
                {selectable.length === 0
                  ? t("manage-gallery-sources-picker-empty")
                  : t("manage-gallery-sources-picker")}
              </option>
              {selectable.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title && g.title.length > 0
                    ? `${g.title} (${g.id})`
                    : g.id}
                </option>
              ))}
            </Select>
            <AddButton type="button" onClick={add} disabled={!picker}>
              {t("manage-gallery-sources-add")}
            </AddButton>
          </PickerRow>
        </>
      )}
    </Section>
  );
};

export default GallerySourcesSection;
