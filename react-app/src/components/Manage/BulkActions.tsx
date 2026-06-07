import React from "react";
import { useTranslation } from "react-i18next";
import styled from "@emotion/styled";

import photosService, { type PhotoUpdatePatch } from "../../services/photos";
import galleryPhotosService from "../../services/gallery-photos";

interface Gallery {
  id: string;
  title?: string;
}

interface Props {
  selectedIds: string[];
  galleries: Gallery[];
  scopedGalleryId?: string;
  onDone: () => void;
  onCancel: () => void;
}

const Bar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--tile-background);
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  margin-bottom: 8px;
`;
const Count = styled.span`
  font-weight: bold;
`;
const Spacer = styled.span`
  flex: 1 1 auto;
`;
const ActionButton = styled.button<{ $danger?: boolean }>`
  padding: 4px 10px;
  border: 1px solid
    ${({ $danger }) =>
      $danger ? "var(--alert-color, #c33)" : "var(--inactive-color)"};
  background: transparent;
  color: ${({ $danger }) => ($danger ? "var(--alert-color, #c33)" : "var(--primary-color)")};
  font: inherit;
  cursor: pointer;
  &:disabled {
    color: var(--inactive-color);
    border-color: var(--inactive-color);
    cursor: default;
  }
  &:hover:not(:disabled) {
    border-color: ${({ $danger }) =>
      $danger ? "var(--alert-color, #c33)" : "var(--primary-color)"};
  }
`;
const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;
const ModalBox = styled.div`
  background: var(--primary-background);
  color: var(--primary-color);
  border: 1px solid var(--inactive-color);
  border-radius: 6px;
  padding: 20px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
`;
const ModalTitle = styled.h2`
  margin: 0 0 12px;
  font-size: 1.1em;
`;
const ModalBody = styled.div`
  margin-bottom: 16px;
  line-height: 1.4;
`;
const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;
const Select = styled.select`
  font: inherit;
  padding: 4px 6px;
  background: var(--primary-background);
  color: var(--primary-color);
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  width: 100%;
  margin-top: 8px;
`;
const Input = styled.input`
  font: inherit;
  padding: 4px 6px;
  background: var(--primary-background);
  color: var(--primary-color);
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  width: 100%;
  margin-top: 8px;
  box-sizing: border-box;
`;
const ErrorText = styled.div`
  color: var(--alert-color, #c33);
  font-size: 0.9em;
  margin-top: 8px;
`;

type Pending =
  | { kind: "none" }
  | { kind: "confirm-delete" }
  | { kind: "pick-link" }
  | { kind: "pick-unlink" }
  | { kind: "pick-set-field" };

type FieldKey =
  | "title"
  | "description"
  | "author"
  | "country"
  | "place"
  | "cameraMake"
  | "cameraModel"
  | "lensMake"
  | "lensModel"
  | "focalLength"
  | "focalLength35mmEquiv"
  | "aperture";

const STRING_FIELDS: ReadonlySet<FieldKey> = new Set([
  "title",
  "description",
  "author",
  "country",
  "place",
  "cameraMake",
  "cameraModel",
  "lensMake",
  "lensModel",
]);

const FIELD_KEYS: readonly FieldKey[] = [
  "title",
  "description",
  "author",
  "country",
  "place",
  "cameraMake",
  "cameraModel",
  "lensMake",
  "lensModel",
  "focalLength",
  "focalLength35mmEquiv",
  "aperture",
];

const FIELD_LABEL_KEY: Record<FieldKey, string> = {
  title: "manage-photo-field-title",
  description: "manage-photo-field-description",
  author: "manage-photo-field-author",
  country: "manage-photo-field-country",
  place: "manage-photo-field-place",
  cameraMake: "manage-photo-field-camera-make",
  cameraModel: "manage-photo-field-camera-model",
  lensMake: "manage-photo-field-lens-make",
  lensModel: "manage-photo-field-lens-model",
  focalLength: "manage-photo-field-focal",
  focalLength35mmEquiv: "manage-photo-field-focal-35mm",
  aperture: "manage-photo-field-aperture",
};

// Shape one selected field + value into the PhotoUpdatePatch the
// `PUT /photos/<id>` endpoint already accepts. Strings allow empty
// = clear override; numbers reject NaN so an empty input is a no-op.
const buildPatch = (field: FieldKey, value: string): PhotoUpdatePatch | null => {
  const trimmed = value.trim();
  if (!STRING_FIELDS.has(field)) {
    if (trimmed === "") return null;
    const v = parseFloat(trimmed);
    if (Number.isNaN(v)) return null;
    return { exposure: { [field]: v } as PhotoUpdatePatch["exposure"] };
  }
  switch (field) {
    case "title":
      return { title: trimmed };
    case "description":
      return { description: trimmed };
    case "author":
      return { taken: { author: trimmed } };
    case "country":
      return { taken: { location: { country: trimmed } } };
    case "place":
      return { taken: { location: { place: trimmed } } };
    case "cameraMake":
      return { camera: { make: trimmed } };
    case "cameraModel":
      return { camera: { model: trimmed } };
    case "lensMake":
      return { lens: { make: trimmed } };
    case "lensModel":
      return { lens: { model: trimmed } };
  }
  return null;
};

const BulkActions = ({
  selectedIds,
  galleries,
  scopedGalleryId,
  onDone,
  onCancel,
}: Props): React.ReactElement => {
  const { t } = useTranslation();
  const [pending, setPending] = React.useState<Pending>({ kind: "none" });
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [galleryPick, setGalleryPick] = React.useState<string>(
    scopedGalleryId ?? galleries[0]?.id ?? ""
  );
  const [fieldPick, setFieldPick] = React.useState<FieldKey>("title");
  const [fieldValue, setFieldValue] = React.useState<string>("");

  const closeModal = React.useCallback(() => {
    if (busy) return;
    setPending({ kind: "none" });
    setError(null);
  }, [busy]);

  React.useEffect(() => {
    if (pending.kind === "none") return;
    setGalleryPick(scopedGalleryId ?? galleries[0]?.id ?? "");
    setFieldPick("title");
    setFieldValue("");
    setError(null);
  }, [pending.kind, scopedGalleryId, galleries]);

  React.useEffect(() => {
    if (pending.kind === "none") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending.kind, closeModal]);

  const runSequentially = async (fn: (id: string) => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      for (const id of selectedIds) {
        await fn(id);
      }
      setPending({ kind: "none" });
      onDone();
    } catch (e) {
      const message =
        e instanceof Error ? e.message : String(t("manage-photos-bulk-error"));
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const doDelete = () => runSequentially((id) => photosService.remove(id));
  const doLink = () => {
    if (!galleryPick) return;
    return runSequentially((id) => galleryPhotosService.link(galleryPick, id));
  };
  const doUnlink = () => {
    if (!galleryPick) return;
    return runSequentially((id) =>
      galleryPhotosService.unlink(galleryPick, id)
    );
  };
  const doSetField = () => {
    const patch = buildPatch(fieldPick, fieldValue);
    if (!patch) return;
    return runSequentially((id) => photosService.update(id, patch));
  };

  const count = selectedIds.length;
  const onBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) closeModal();
  };

  const renderModal = () => {
    if (pending.kind === "none") return null;
    if (pending.kind === "confirm-delete") {
      return (
        <Backdrop
          onClick={onBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-modal-title"
        >
          <ModalBox>
            <ModalTitle id="bulk-modal-title">
              {t("manage-photos-bulk-delete")}
            </ModalTitle>
            <ModalBody>
              {t("manage-photos-bulk-confirm-delete", { count })}
            </ModalBody>
            <ModalFooter>
              <ActionButton type="button" disabled={busy} onClick={closeModal}>
                {t("manage-user-button-cancel")}
              </ActionButton>
              <ActionButton
                type="button"
                $danger
                disabled={busy}
                onClick={() => void doDelete()}
              >
                {busy
                  ? t("manage-photos-bulk-deleting")
                  : t("manage-photos-bulk-confirm-delete-button")}
              </ActionButton>
            </ModalFooter>
            {error ? <ErrorText>{error}</ErrorText> : null}
          </ModalBox>
        </Backdrop>
      );
    }
    if (pending.kind === "pick-set-field") {
      const fieldIsString = STRING_FIELDS.has(fieldPick);
      const labelText = String(t(FIELD_LABEL_KEY[fieldPick]));
      const trimmedValue = fieldValue.trim();
      const isClear = fieldIsString && trimmedValue === "";
      const parsedNumeric = fieldIsString
        ? null
        : trimmedValue === ""
          ? null
          : parseFloat(trimmedValue);
      const numericValid =
        fieldIsString || (parsedNumeric !== null && !Number.isNaN(parsedNumeric));
      const canApply = fieldIsString || numericValid;
      const previewKey = isClear
        ? "manage-photos-bulk-set-field-clear-preview"
        : "manage-photos-bulk-set-field-set-preview";
      return (
        <Backdrop
          onClick={onBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-modal-title"
        >
          <ModalBox>
            <ModalTitle id="bulk-modal-title">
              {t("manage-photos-bulk-set-field")}
            </ModalTitle>
            <ModalBody>
              {t("manage-photos-bulk-set-field-intro", { count })}
              <Select
                value={fieldPick}
                disabled={busy}
                onChange={(e) => {
                  setFieldPick(e.target.value as FieldKey);
                  setFieldValue("");
                }}
              >
                {FIELD_KEYS.map((f) => (
                  <option key={f} value={f}>
                    {t(FIELD_LABEL_KEY[f])}
                  </option>
                ))}
              </Select>
              <Input
                type={fieldIsString ? "text" : "number"}
                step={fieldIsString ? undefined : "any"}
                value={fieldValue}
                disabled={busy}
                onChange={(e) => setFieldValue(e.target.value)}
                placeholder={
                  fieldIsString
                    ? String(t("manage-photos-bulk-set-field-string-placeholder"))
                    : String(t("manage-photos-bulk-set-field-number-placeholder"))
                }
              />
              {canApply ? (
                <div style={{ marginTop: 8, opacity: 0.8 }}>
                  {t(previewKey, {
                    count,
                    label: labelText,
                    value: trimmedValue,
                  })}
                </div>
              ) : null}
            </ModalBody>
            <ModalFooter>
              <ActionButton type="button" disabled={busy} onClick={closeModal}>
                {t("manage-user-button-cancel")}
              </ActionButton>
              <ActionButton
                type="button"
                disabled={busy || !canApply}
                onClick={() => void doSetField()}
              >
                {busy
                  ? t("manage-photos-bulk-applying")
                  : t("manage-photos-bulk-set-field-button")}
              </ActionButton>
            </ModalFooter>
            {error ? <ErrorText>{error}</ErrorText> : null}
          </ModalBox>
        </Backdrop>
      );
    }
    const isLink = pending.kind === "pick-link";
    const choices =
      isLink || !scopedGalleryId
        ? galleries
        : galleries.filter((g) => g.id === scopedGalleryId);
    return (
      <Backdrop
        onClick={onBackdropClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-modal-title"
      >
        <ModalBox>
          <ModalTitle id="bulk-modal-title">
            {isLink
              ? t("manage-photos-bulk-link")
              : t("manage-photos-bulk-unlink")}
          </ModalTitle>
          <ModalBody>
            {isLink
              ? t("manage-photos-bulk-pick-link", { count })
              : t("manage-photos-bulk-pick-unlink", { count })}
            <Select
              value={galleryPick}
              disabled={busy}
              onChange={(e) => setGalleryPick(e.target.value)}
            >
              {choices.length === 0 ? (
                <option value="">
                  {t("manage-photos-bulk-no-galleries")}
                </option>
              ) : (
                choices.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title || g.id}
                  </option>
                ))
              )}
            </Select>
          </ModalBody>
          <ModalFooter>
            <ActionButton type="button" disabled={busy} onClick={closeModal}>
              {t("manage-user-button-cancel")}
            </ActionButton>
            <ActionButton
              type="button"
              $danger={!isLink}
              disabled={busy || !galleryPick}
              onClick={() => void (isLink ? doLink() : doUnlink())}
            >
              {busy
                ? t("manage-photos-bulk-applying")
                : isLink
                  ? t("manage-photos-bulk-link-button")
                  : t("manage-photos-bulk-unlink-button")}
            </ActionButton>
          </ModalFooter>
          {error ? <ErrorText>{error}</ErrorText> : null}
        </ModalBox>
      </Backdrop>
    );
  };

  // Action scoping. In gallery-scoped mode (`/m/g/<id>/photos`)
  // the operator is "inside" one gallery, so cross-gallery linking
  // belongs in `/m/photos` instead — hide the Link button. Delete
  // stays available to global admins regardless of scope (and the
  // Manage UI is currently gated on the global admin flag overall).
  // When the gallery-admin tier lands in the UI it'll also need to
  // hide Delete here.
  const showLink = !scopedGalleryId;
  return (
    <>
      <Bar>
        <Count>{t("manage-photos-bulk-selected", { count })}</Count>
        {showLink && (
          <ActionButton
            type="button"
            disabled={busy || count === 0}
            onClick={() => setPending({ kind: "pick-link" })}
          >
            {t("manage-photos-bulk-link")}
          </ActionButton>
        )}
        <ActionButton
          type="button"
          disabled={busy || count === 0}
          onClick={() => setPending({ kind: "pick-unlink" })}
        >
          {t("manage-photos-bulk-unlink")}
        </ActionButton>
        <ActionButton
          type="button"
          disabled={busy || count === 0}
          onClick={() => setPending({ kind: "pick-set-field" })}
        >
          {t("manage-photos-bulk-set-field")}
        </ActionButton>
        <ActionButton
          type="button"
          $danger
          disabled={busy || count === 0}
          onClick={() => setPending({ kind: "confirm-delete" })}
        >
          {t("manage-photos-bulk-delete")}
        </ActionButton>
        <Spacer />
        <ActionButton type="button" disabled={busy} onClick={onCancel}>
          {t("manage-photos-bulk-exit")}
        </ActionButton>
      </Bar>
      {renderModal()}
    </>
  );
};

export default BulkActions;
