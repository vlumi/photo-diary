import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { BsArrowRight, BsPlusLg } from "react-icons/bs";

import savedFiltersService, {
  type SavedFilter,
} from "../../services/saved-filters";
import { Section, SectionTitle } from "./Section";

// Virtual-gallery directory under the source gallery's manage page.
// Each saved filter IS a virtual gallery with this gallery as its
// source — list rows link to the child's own edit page, where the
// filter and gallery metadata get edited together. "Create" here is
// just "make a new virtual gallery with this as source": id + initial
// title, then the operator finishes the rest on the child's edit page.

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
const Row = styled(RouterLink)`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  text-decoration: none;
  color: inherit;
  &:hover {
    border-color: var(--primary-color);
  }
`;
const RowMain = styled.div`
  flex: 1 1 auto;
  min-width: 0;
`;
const RowTitle = styled.div`
  font-size: 0.95em;
`;
const RowId = styled.div`
  font-family: monospace;
  font-size: 0.8em;
  color: var(--inactive-color);
`;
const RowDesc = styled.div`
  font-size: 0.85em;
  color: var(--inactive-color);
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

interface Props {
  galleryId: string;
}
const SavedFiltersSection = ({
  galleryId,
}: Props): React.ReactElement => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [creating, setCreating] = React.useState(false);
  const [newId, setNewId] = React.useState("");
  const [newTitle, setNewTitle] = React.useState("");
  const [formError, setFormError] = React.useState<string | null>(null);

  const filtersQuery = useQuery({
    queryKey: ["gallery-saved-filters", galleryId],
    queryFn: () => savedFiltersService.list(galleryId),
    placeholderData: keepPreviousData,
  });
  const filters = (filtersQuery.data ?? []) as SavedFilter[];

  const createMutation = useMutation({
    mutationFn: () =>
      savedFiltersService.create(galleryId, {
        id: newId.trim(),
        title: newTitle.trim(),
        definition: {},
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["gallery-saved-filters", galleryId],
      });
      queryClient.invalidateQueries({ queryKey: ["manage-galleries"] });
      queryClient.invalidateQueries({ queryKey: ["galleries"] });
      const target = newId.trim();
      setCreating(false);
      setNewId("");
      setNewTitle("");
      // The new virtual gallery's edit page is where the operator
      // shapes the filter — bounce there.
      navigate(`/m/g/${encodeURIComponent(target)}`);
    },
    onError: (err: Error) => setFormError(err.message),
  });
  const onCreate = () => {
    setFormError(null);
    if (!newId.trim()) {
      setFormError(t("manage-saved-filter-id-required"));
      return;
    }
    createMutation.mutate();
  };

  return (
    <Section>
      <SectionTitle>{t("manage-saved-filter-section-title")}</SectionTitle>
      {filtersQuery.isError ? (
        <ErrorBanner>{t("manage-saved-filter-list-error")}</ErrorBanner>
      ) : filters.length === 0 ? (
        <Notice>{t("manage-saved-filter-empty")}</Notice>
      ) : (
        <List>
          {filters.map((f) => (
            <Row
              key={f.id}
              to={`/m/g/${encodeURIComponent(f.id)}`}
              aria-label={f.title || f.id}
            >
              <RowMain>
                <RowTitle>{f.title || f.id}</RowTitle>
                {f.title ? <RowId>{f.id}</RowId> : null}
                {f.description ? <RowDesc>{f.description}</RowDesc> : null}
              </RowMain>
              <BsArrowRight aria-hidden />
            </Row>
          ))}
        </List>
      )}
      {!creating ? (
        <AddRow>
          <AddButton type="button" onClick={() => setCreating(true)}>
            <BsPlusLg aria-hidden />
            {t("manage-saved-filter-add")}
          </AddButton>
        </AddRow>
      ) : (
        <Form onSubmit={(e) => e.preventDefault()}>
          <Field>
            <FieldLabel>{t("manage-saved-filter-field-id")}</FieldLabel>
            <Input
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoFocus
            />
            <FieldHint>{t("manage-saved-filter-field-id-hint")}</FieldHint>
          </Field>
          <Field>
            <FieldLabel>{t("manage-saved-filter-field-title")}</FieldLabel>
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
          </Field>
          {formError ? <ErrorBanner>{formError}</ErrorBanner> : null}
          <FormFooter>
            <ButtonSecondary
              type="button"
              onClick={() => {
                setCreating(false);
                setFormError(null);
                setNewId("");
                setNewTitle("");
              }}
            >
              {t("manage-saved-filter-button-cancel")}
            </ButtonSecondary>
            <ButtonPrimary
              type="button"
              onClick={onCreate}
              disabled={createMutation.isPending}
            >
              {t("manage-saved-filter-button-save")}
            </ButtonPrimary>
          </FormFooter>
        </Form>
      )}
    </Section>
  );
};

export default SavedFiltersSection;
