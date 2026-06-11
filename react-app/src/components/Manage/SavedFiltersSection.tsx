import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { BsPencil, BsPlusLg, BsTrash } from "react-icons/bs";

import LocalizedInputs, { SUPPORTED_LANGS } from "./LocalizedInputs";
import savedFiltersService, {
  type SavedFilter,
  type SavedFilterDefinition,
  type SavedFilterUpdatePatch,
} from "../../services/saved-filters";
import type { ServerFilters } from "../../lib/filter";
import { useGalleryCalendar } from "../../lib/useFilteredCalendar";

// Format a [year, month, day] tuple from useGalleryCalendar into a
// YYYY-MM-DD string for the native <input type="date"> value. Returns
// "" when the day is unknown (gallery is empty or not loaded).
const formatYmd = (
  day: [number, number, number] | [undefined, undefined, undefined]
): string => {
  const [y, m, d] = day;
  if (y === undefined || m === undefined || d === undefined) return "";
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};

// One section under the Gallery edit page that lists / creates /
// edits saved filters (#285). Date range gets its own from / to
// inputs since it's the obvious axis; FilterShape goes through a
// JSON textarea for v1 — a visual filter builder is a future
// concern (composes with #560's filter widget redesign).

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
`;
const SectionTitle = styled.h3`
  margin: 0 0 4px;
  font-size: 0.75em;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--inactive-color);
`;
const Notice = styled.p`
  margin: 0;
  color: var(--inactive-color);
  font-style: italic;
  font-size: 0.9em;
`;
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
const RowMain = styled.div`
  flex: 1 1 auto;
  min-width: 0;
`;
const RowId = styled.div`
  font-family: monospace;
  font-size: 0.8em;
  color: var(--inactive-color);
`;
const RowTitle = styled.div`
  font-size: 0.95em;
`;
const RowDesc = styled.div`
  font-size: 0.85em;
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
  &:hover {
    border-color: var(--primary-color);
  }
`;
const AddRow = styled.div`
  display: flex;
  justify-content: flex-end;
`;
const AddButton = styled.button`
  font: inherit;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: transparent;
  color: var(--primary-color);
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    border-color: var(--primary-color);
  }
`;
const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
`;
const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;
const FieldLabel = styled.span`
  font-size: 0.8em;
  color: var(--inactive-color);
`;
const FieldHint = styled.span`
  font-size: 0.75em;
  color: var(--inactive-color);
  font-style: italic;
`;
const FieldRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`;
const Input = styled.input`
  font: inherit;
  padding: 6px 8px;
  background: var(--primary-background);
  color: var(--primary-color);
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  width: 100%;
  box-sizing: border-box;
`;
const TextArea = styled.textarea`
  font: inherit;
  padding: 6px 8px;
  background: var(--primary-background);
  color: var(--primary-color);
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  width: 100%;
  min-height: 60px;
  box-sizing: border-box;
  resize: vertical;
`;
const FormFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;
const ButtonPrimary = styled.button`
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
const ButtonSecondary = styled.button`
  font: inherit;
  padding: 6px 14px;
  background: transparent;
  color: var(--primary-color);
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  cursor: pointer;
`;
const ErrorBanner = styled.div`
  padding: 8px 12px;
  background: rgba(220, 60, 60, 0.15);
  color: var(--primary-color);
  border-radius: 4px;
  font-size: 0.85em;
`;

interface FormState {
  id: string;
  title: string;
  description: string;
  titleLocalized: Record<string, string>;
  descriptionLocalized: Record<string, string>;
  dateFrom: string;
  dateTo: string;
  filterJson: string;
  ordinal: string;
}

const emptyLocalized = (): Record<string, string> =>
  Object.fromEntries(SUPPORTED_LANGS.map((l) => [l, ""]));

const blankForm = (
  galleryExtremes?: { from: string; to: string }
): FormState => ({
  id: "",
  title: "",
  description: "",
  titleLocalized: emptyLocalized(),
  descriptionLocalized: emptyLocalized(),
  dateFrom: galleryExtremes?.from ?? "",
  dateTo: galleryExtremes?.to ?? "",
  filterJson: "",
  ordinal: "0",
});

const formFromSaved = (f: SavedFilter): FormState => {
  const localizedFrom = (
    map: Record<string, string> | undefined
  ): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const lang of SUPPORTED_LANGS) out[lang] = map?.[lang] ?? "";
    return out;
  };
  const filter = (f.definition?.filter ?? {}) as Record<string, unknown>;
  const filterJson = Object.keys(filter).length > 0
    ? JSON.stringify(filter, null, 2)
    : "";
  return {
    id: f.id,
    title: f.title,
    description: f.description,
    titleLocalized: localizedFrom(f.titleLocalized),
    descriptionLocalized: localizedFrom(f.descriptionLocalized),
    dateFrom: f.definition?.dateRange?.from ?? "",
    dateTo: f.definition?.dateRange?.to ?? "",
    filterJson,
    ordinal: String(f.ordinal ?? 0),
  };
};

interface BuildResult {
  ok: true;
  definition: SavedFilterDefinition;
  ordinal: number;
}
interface BuildError {
  ok: false;
  reason: string;
}
const buildDefinition = (form: FormState): BuildResult | BuildError => {
  const definition: SavedFilterDefinition = {};
  if (form.filterJson.trim()) {
    try {
      // Trust the operator-supplied JSON shape; the server validates
      // the FilterShape envelope. If it parses, forward verbatim.
      definition.filter = JSON.parse(form.filterJson) as ServerFilters;
    } catch (err) {
      return { ok: false, reason: `Filter JSON parse error: ${(err as Error).message}` };
    }
  }
  if (form.dateFrom || form.dateTo) {
    definition.dateRange = {};
    if (form.dateFrom) definition.dateRange.from = form.dateFrom;
    if (form.dateTo) definition.dateRange.to = form.dateTo;
  }
  const ordinal = Number(form.ordinal || "0");
  if (!Number.isFinite(ordinal)) {
    return { ok: false, reason: "Ordinal must be a number" };
  }
  return { ok: true, definition, ordinal };
};

const localizedPatch = (
  original: Record<string, string>,
  current: Record<string, string>
): Record<string, string> | undefined => {
  const out: Record<string, string> = {};
  for (const lang of SUPPORTED_LANGS) {
    const o = (original[lang] ?? "").trim();
    const c = (current[lang] ?? "").trim();
    if (o !== c) out[lang] = c;
  }
  return Object.keys(out).length > 0 ? out : undefined;
};

interface Props {
  galleryId: string;
  // Gallery's `default_language` — passed to LocalizedInputs as
  // `primary` so the matching overlay row is hidden (canonical
  // input carries that language). Same pattern as the gallery
  // edit form's localized fields.
  defaultLanguage?: string;
}
const SavedFiltersSection = ({
  galleryId,
  defaultLanguage,
}: Props): React.ReactElement => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = React.useState<string | "__new__" | null>(
    null
  );
  const galleryCalendar = useGalleryCalendar(galleryId);
  // Pre-fill the date range with the gallery's earliest / latest
  // photo dates so the operator sees the maximum range as the
  // default — the native `<input type="date">` also opens its
  // calendar on the seeded month, anchoring the picker to the
  // gallery's content rather than today.
  const galleryExtremes = React.useMemo(
    () => ({
      from: formatYmd(galleryCalendar.firstDay()),
      to: formatYmd(galleryCalendar.lastDay()),
    }),
    [galleryCalendar]
  );
  const [form, setForm] = React.useState<FormState>(() => blankForm());
  const [original, setOriginal] = React.useState<FormState>(() => blankForm());
  const [formError, setFormError] = React.useState<string | null>(null);

  const filtersQuery = useQuery({
    queryKey: ["gallery-saved-filters", galleryId],
    queryFn: () => savedFiltersService.list(galleryId),
    placeholderData: keepPreviousData,
  });
  const filters = (filtersQuery.data ?? []) as SavedFilter[];

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["gallery-saved-filters", galleryId],
    });

  const createMutation = useMutation({
    mutationFn: (body: Parameters<typeof savedFiltersService.create>[1]) =>
      savedFiltersService.create(galleryId, body),
    onSuccess: () => {
      invalidate();
      setEditingId(null);
    },
    onError: (err: Error) => setFormError(err.message),
  });
  const updateMutation = useMutation({
    mutationFn: ({
      filterId,
      patch,
    }: {
      filterId: string;
      patch: SavedFilterUpdatePatch;
    }) => savedFiltersService.update(galleryId, filterId, patch),
    onSuccess: () => {
      invalidate();
      setEditingId(null);
    },
    onError: (err: Error) => setFormError(err.message),
  });
  const deleteMutation = useMutation({
    mutationFn: (filterId: string) =>
      savedFiltersService.remove(galleryId, filterId),
    onSuccess: invalidate,
  });

  const openCreate = () => {
    const fresh = blankForm(galleryExtremes);
    setForm(fresh);
    setOriginal(fresh);
    setFormError(null);
    setEditingId("__new__");
  };
  const openEdit = (filter: SavedFilter) => {
    const f = formFromSaved(filter);
    setForm(f);
    setOriginal(f);
    setFormError(null);
    setEditingId(filter.id);
  };
  const closeForm = () => {
    setEditingId(null);
    setFormError(null);
  };
  const handleSave = () => {
    setFormError(null);
    const built = buildDefinition(form);
    if (!built.ok) {
      setFormError(built.reason);
      return;
    }
    if (editingId === "__new__") {
      if (!form.id.trim()) {
        setFormError(t("manage-saved-filter-id-required"));
        return;
      }
      createMutation.mutate({
        id: form.id.trim(),
        title: form.title,
        description: form.description,
        titleLocalized: localizedPatch(emptyLocalized(), form.titleLocalized),
        descriptionLocalized: localizedPatch(
          emptyLocalized(),
          form.descriptionLocalized
        ),
        definition: built.definition,
        ordinal: built.ordinal,
      });
    } else if (editingId) {
      updateMutation.mutate({
        filterId: editingId,
        patch: {
          title: form.title !== original.title ? form.title : undefined,
          description:
            form.description !== original.description
              ? form.description
              : undefined,
          titleLocalized: localizedPatch(
            original.titleLocalized,
            form.titleLocalized
          ),
          descriptionLocalized: localizedPatch(
            original.descriptionLocalized,
            form.descriptionLocalized
          ),
          definition: built.definition,
          ordinal: built.ordinal,
        },
      });
    }
  };
  const handleDelete = (filterId: string) => {
    if (
      !window.confirm(
        String(t("manage-saved-filter-delete-confirm", { id: filterId }))
      )
    )
      return;
    deleteMutation.mutate(filterId);
  };
  const setField = <K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }));
  const setLocalized = (
    key: "titleLocalized" | "descriptionLocalized",
    lang: string,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: { ...prev[key], [lang]: value },
    }));
  };

  const renderForm = () => (
    <Form onSubmit={(e) => e.preventDefault()}>
      <Field>
        <FieldLabel>{t("manage-saved-filter-field-id")}</FieldLabel>
        <Input
          value={form.id}
          onChange={(e) => setField("id", e.target.value)}
          disabled={editingId !== "__new__"}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        <FieldHint>{t("manage-saved-filter-field-id-hint")}</FieldHint>
      </Field>
      <Field>
        <FieldLabel>{t("manage-saved-filter-field-title")}</FieldLabel>
        <Input
          value={form.title}
          onChange={(e) => setField("title", e.target.value)}
        />
        <LocalizedInputs
          value={form.titleLocalized}
          onChange={(lang, val) => setLocalized("titleLocalized", lang, val)}
          primary={defaultLanguage}
        />
      </Field>
      <Field>
        <FieldLabel>{t("manage-saved-filter-field-description")}</FieldLabel>
        <TextArea
          value={form.description}
          onChange={(e) => setField("description", e.target.value)}
        />
        <LocalizedInputs
          value={form.descriptionLocalized}
          onChange={(lang, val) =>
            setLocalized("descriptionLocalized", lang, val)
          }
          multiline
          primary={defaultLanguage}
        />
      </Field>
      <FieldRow>
        <Field>
          <FieldLabel>{t("manage-saved-filter-field-date-from")}</FieldLabel>
          <Input
            type="date"
            value={form.dateFrom}
            onChange={(e) => setField("dateFrom", e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel>{t("manage-saved-filter-field-date-to")}</FieldLabel>
          <Input
            type="date"
            value={form.dateTo}
            onChange={(e) => setField("dateTo", e.target.value)}
          />
        </Field>
      </FieldRow>
      <Field>
        <FieldLabel>{t("manage-saved-filter-field-filter-json")}</FieldLabel>
        <TextArea
          value={form.filterJson}
          onChange={(e) => setField("filterJson", e.target.value)}
          placeholder='{ "general": { "country": ["jp"] } }'
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        <FieldHint>{t("manage-saved-filter-field-filter-json-hint")}</FieldHint>
      </Field>
      <Field>
        <FieldLabel>{t("manage-saved-filter-field-ordinal")}</FieldLabel>
        <Input
          type="number"
          value={form.ordinal}
          onChange={(e) => setField("ordinal", e.target.value)}
        />
      </Field>
      {formError && <ErrorBanner>{formError}</ErrorBanner>}
      <FormFooter>
        <ButtonSecondary type="button" onClick={closeForm}>
          {t("manage-saved-filter-button-cancel")}
        </ButtonSecondary>
        <ButtonPrimary
          type="button"
          onClick={handleSave}
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          {t("manage-saved-filter-button-save")}
        </ButtonPrimary>
      </FormFooter>
    </Form>
  );

  return (
    <Section>
      <SectionTitle>{t("manage-saved-filter-section-title")}</SectionTitle>
      {filters.length === 0 && !editingId && (
        <Notice>{t("manage-saved-filter-empty")}</Notice>
      )}
      <List>
        {filters.map((f) => (
          <Row key={f.id}>
            <RowMain>
              <RowId>{f.id}</RowId>
              {f.title && <RowTitle>{f.title}</RowTitle>}
              {f.description && <RowDesc>{f.description}</RowDesc>}
            </RowMain>
            <IconButton
              type="button"
              onClick={() => openEdit(f)}
              aria-label={t("manage-saved-filter-edit")}
              title={t("manage-saved-filter-edit")}
            >
              <BsPencil />
            </IconButton>
            <IconButton
              type="button"
              onClick={() => handleDelete(f.id)}
              aria-label={t("manage-saved-filter-delete")}
              title={t("manage-saved-filter-delete")}
            >
              <BsTrash />
            </IconButton>
          </Row>
        ))}
      </List>
      {editingId && renderForm()}
      {!editingId && (
        <AddRow>
          <AddButton type="button" onClick={openCreate}>
            <BsPlusLg />
            {t("manage-saved-filter-add")}
          </AddButton>
        </AddRow>
      )}
    </Section>
  );
};

export default SavedFiltersSection;
