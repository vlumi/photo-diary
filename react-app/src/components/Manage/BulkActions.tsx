import React from "react";
import { useTranslation } from "react-i18next";
import styled from "@emotion/styled";

import photosService, {
  type PhotoRow,
  type PhotoUpdatePatch,
} from "../../services/photos";
import galleryPhotosService from "../../services/gallery-photos";
import { useUserStore } from "../../stores";
import CountrySelect from "./CountrySelect";

interface Gallery {
  id: string;
  title?: string;
}

interface Props {
  selectedIds: string[];
  galleries: Gallery[];
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
  max-width: 560px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
`;
const ModalTitle = styled.h2`
  margin: 0 0 12px;
  font-size: 1.1em;
`;
const ModalBody = styled.div`
  margin-bottom: 16px;
  line-height: 1.4;
  overflow-y: auto;
  min-height: 0;
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
const FieldRow = styled.label<{ $active: boolean }>`
  display: grid;
  grid-template-columns: auto 130px 1fr;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  cursor: pointer;
  opacity: ${({ $active }) => ($active ? 1 : 0.7)};
`;
const FieldLabelText = styled.span`
  font-size: 0.85em;
  color: var(--inactive-color);
`;
const FieldInput = styled.input<{ $mixed?: boolean }>`
  font: inherit;
  padding: 4px 6px;
  background: var(--primary-background);
  color: var(--primary-color);
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  width: 100%;
  box-sizing: border-box;
  &::placeholder {
    font-style: ${({ $mixed }) => ($mixed ? "italic" : "normal")};
    opacity: ${({ $mixed }) => ($mixed ? 0.65 : 0.45)};
  }
`;
const Notice = styled.p`
  margin: 0 0 12px;
  color: var(--inactive-color);
  font-style: italic;
`;
const ErrorText = styled.div`
  color: var(--alert-color, #c33);
  font-size: 0.9em;
  margin-top: 8px;
`;

type Pending =
  | { kind: "none" }
  | { kind: "confirm-delete" }
  | { kind: "confirm-regeocode" }
  | { kind: "pick-link" }
  | { kind: "pick-unlink" }
  | { kind: "edit-fields" };

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

// Pull one writable field out of a photo row as a string, so the
// mixed-vs-shared check across the selection is a plain
// string-equality comparison.
const readField = (p: PhotoRow, key: FieldKey): string => {
  const taken = (p.taken ?? {}) as {
    author?: string;
    location?: { country?: string; place?: string };
  };
  const location = taken.location ?? {};
  const camera = (p.camera ?? {}) as { make?: string; model?: string };
  const lens = (p.lens ?? {}) as { make?: string; model?: string };
  const exposure = (p.exposure ?? {}) as {
    focalLength?: number;
    focalLength35mmEquiv?: number;
    aperture?: number;
  };
  const numToStr = (v: number | undefined): string =>
    v !== undefined && v !== null ? String(v) : "";
  switch (key) {
    case "title":
      return ((p.title as string | undefined) ?? "").trim();
    case "description":
      return ((p.description as string | undefined) ?? "").trim();
    case "author":
      return (taken.author ?? "").trim();
    case "country":
      return (location.country ?? "").trim();
    case "place":
      return (location.place ?? "").trim();
    case "cameraMake":
      return (camera.make ?? "").trim();
    case "cameraModel":
      return (camera.model ?? "").trim();
    case "lensMake":
      return (lens.make ?? "").trim();
    case "lensModel":
      return (lens.model ?? "").trim();
    case "focalLength":
      return numToStr(exposure.focalLength);
    case "focalLength35mmEquiv":
      return numToStr(exposure.focalLength35mmEquiv);
    case "aperture":
      return numToStr(exposure.aperture);
  }
};

// Per-field "what does this field look like across the selection"
// — a single shared value, mixed, or universally empty.
type FieldSummary =
  | { kind: "shared"; value: string }
  | { kind: "mixed" }
  | { kind: "empty" };

const summarize = (rows: PhotoRow[], key: FieldKey): FieldSummary => {
  if (rows.length === 0) return { kind: "empty" };
  const first = readField(rows[0], key);
  for (let i = 1; i < rows.length; i++) {
    if (readField(rows[i], key) !== first) return { kind: "mixed" };
  }
  return first === "" ? { kind: "empty" } : { kind: "shared", value: first };
};

// Fold the checked rows into one PhotoUpdatePatch shaped to the
// PUT /photos/<id> body. Strings allow "" = clear override;
// numeric fields drop when parseFloat yields NaN.
const buildPatch = (
  values: Partial<Record<FieldKey, string>>
): PhotoUpdatePatch => {
  const patch: PhotoUpdatePatch = {};
  const taken: NonNullable<PhotoUpdatePatch["taken"]> = {};
  const location: NonNullable<
    NonNullable<PhotoUpdatePatch["taken"]>["location"]
  > = {};
  const camera: NonNullable<PhotoUpdatePatch["camera"]> = {};
  const lens: NonNullable<PhotoUpdatePatch["lens"]> = {};
  const exposure: NonNullable<PhotoUpdatePatch["exposure"]> = {};
  const setNum = (key: "focalLength" | "focalLength35mmEquiv" | "aperture") => {
    const raw = values[key];
    if (raw === undefined) return;
    const v = parseFloat(raw.trim());
    if (!Number.isNaN(v)) exposure[key] = v;
  };
  if (values.title !== undefined) patch.title = values.title.trim();
  if (values.description !== undefined) patch.description = values.description.trim();
  if (values.author !== undefined) taken.author = values.author.trim();
  if (values.country !== undefined) location.country = values.country.trim();
  if (values.place !== undefined) location.place = values.place.trim();
  if (values.cameraMake !== undefined) camera.make = values.cameraMake.trim();
  if (values.cameraModel !== undefined) camera.model = values.cameraModel.trim();
  if (values.lensMake !== undefined) lens.make = values.lensMake.trim();
  if (values.lensModel !== undefined) lens.model = values.lensModel.trim();
  setNum("focalLength");
  setNum("focalLength35mmEquiv");
  setNum("aperture");
  if (Object.keys(location).length > 0) taken.location = location;
  if (Object.keys(taken).length > 0) patch.taken = taken;
  if (Object.keys(camera).length > 0) patch.camera = camera;
  if (Object.keys(lens).length > 0) patch.lens = lens;
  if (Object.keys(exposure).length > 0) patch.exposure = exposure;
  return patch;
};

const BulkActions = ({
  selectedIds,
  galleries,
  onDone,
  onCancel,
}: Props): React.ReactElement => {
  const { t } = useTranslation();
  const user = useUserStore((s) => s.user);
  const isAdmin = !!user?.isAdmin();
  const [pending, setPending] = React.useState<Pending>({ kind: "none" });
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [galleryPick, setGalleryPick] = React.useState<string>(
    galleries[0]?.id ?? ""
  );

  // Edit-fields modal state. `values` holds only the fields the
  // operator has actively touched (or pre-checked) — anything not
  // in the map is "leave alone" regardless of how the UI rendered
  // the original.
  const [rows, setRows] = React.useState<PhotoRow[] | null>(null);
  const [loadingRows, setLoadingRows] = React.useState(false);
  const [values, setValues] = React.useState<Partial<Record<FieldKey, string>>>(
    {}
  );

  const closeModal = React.useCallback(() => {
    if (busy) return;
    setPending({ kind: "none" });
    setError(null);
  }, [busy]);

  React.useEffect(() => {
    if (pending.kind === "none") return;
    setGalleryPick(galleries[0]?.id ?? "");
    setError(null);
    if (pending.kind !== "edit-fields") {
      setRows(null);
      setValues({});
    }
  }, [pending.kind, galleries]);

  // Load the selection's current values whenever the edit modal opens.
  React.useEffect(() => {
    if (pending.kind !== "edit-fields") return;
    let cancelled = false;
    setLoadingRows(true);
    setValues({});
    setRows(null);
    photosService
      .getByIds(selectedIds)
      .then((result) => {
        if (cancelled) return;
        setRows(result);
        setLoadingRows(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadingRows(false);
        setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [pending.kind, selectedIds]);

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
  const doRegeocode = () =>
    runSequentially((id) => photosService.regeocode(id));
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
  const doApplyFields = () => {
    const patch = buildPatch(values);
    if (Object.keys(patch).length === 0) {
      setPending({ kind: "none" });
      onDone();
      return;
    }
    return runSequentially((id) => photosService.update(id, patch));
  };

  const count = selectedIds.length;
  const onBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) closeModal();
  };

  const setFieldValue = (key: FieldKey, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };
  const toggleField = (key: FieldKey, checked: boolean) => {
    setValues((prev) => {
      const next = { ...prev };
      if (checked) {
        // Default to the shared value when one exists, blank
        // otherwise. Operator can still type a different value.
        const summary = rows ? summarize(rows, key) : { kind: "empty" as const };
        next[key] =
          summary.kind === "shared" ? summary.value : prev[key] ?? "";
      } else {
        delete next[key];
      }
      return next;
    });
  };

  const renderEditFieldsModal = () => {
    const checkedCount = Object.keys(values).length;
    return (
      <Backdrop
        onClick={onBackdropClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-modal-title"
      >
        <ModalBox>
          <ModalTitle id="bulk-modal-title">
            {t("manage-photos-bulk-edit-fields")}
          </ModalTitle>
          <ModalBody>
            {loadingRows || !rows ? (
              <Notice>{t("loading")}</Notice>
            ) : (
              <>
                <Notice>
                  {t("manage-photos-bulk-edit-fields-intro", { count })}
                </Notice>
                {FIELD_KEYS.map((key) => {
                  const summary = summarize(rows, key);
                  const checked = values[key] !== undefined;
                  const isString = STRING_FIELDS.has(key);
                  const inputValue = checked
                    ? (values[key] ?? "")
                    : summary.kind === "shared"
                      ? summary.value
                      : "";
                  const placeholder =
                    summary.kind === "mixed"
                      ? `<${String(t("manage-photos-bulk-mixed"))}>`
                      : "";
                  // Country gets the shared typeahead so the sentinel
                  // (`xx` = no country) is one click away here too,
                  // matching the single-row drawer. Ticks the checkbox
                  // on first pick.
                  const renderInput = () => {
                    if (key === "country") {
                      return (
                        <CountrySelect
                          value={inputValue}
                          disabled={busy}
                          placeholder={placeholder}
                          onChange={(code) => {
                            setFieldValue(key, code);
                          }}
                        />
                      );
                    }
                    return (
                      <FieldInput
                        type={isString ? "text" : "number"}
                        step={isString ? undefined : "any"}
                        value={inputValue}
                        disabled={busy}
                        placeholder={placeholder}
                        $mixed={summary.kind === "mixed"}
                        onChange={(e) => {
                          setFieldValue(key, e.target.value);
                        }}
                      />
                    );
                  };
                  return (
                    <FieldRow key={key} $active={checked}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={busy}
                        onChange={(e) => toggleField(key, e.target.checked)}
                      />
                      <FieldLabelText>{t(FIELD_LABEL_KEY[key])}</FieldLabelText>
                      {renderInput()}
                    </FieldRow>
                  );
                })}
              </>
            )}
          </ModalBody>
          <ModalFooter>
            <ActionButton type="button" disabled={busy} onClick={closeModal}>
              {t("manage-user-button-cancel")}
            </ActionButton>
            <ActionButton
              type="button"
              disabled={busy || loadingRows || checkedCount === 0}
              onClick={() => void doApplyFields()}
            >
              {busy
                ? t("manage-photos-bulk-applying")
                : t("manage-photos-bulk-edit-fields-apply", {
                    count: checkedCount,
                  })}
            </ActionButton>
          </ModalFooter>
          {error ? <ErrorText>{error}</ErrorText> : null}
        </ModalBox>
      </Backdrop>
    );
  };

  const renderModal = () => {
    if (pending.kind === "none") return null;
    if (pending.kind === "edit-fields") return renderEditFieldsModal();
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
    if (pending.kind === "confirm-regeocode") {
      return (
        <Backdrop
          onClick={onBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-modal-title"
        >
          <ModalBox>
            <ModalTitle id="bulk-modal-title">
              {t("manage-photos-bulk-regeocode")}
            </ModalTitle>
            <ModalBody>
              {t("manage-photos-bulk-confirm-regeocode", { count })}
            </ModalBody>
            <ModalFooter>
              <ActionButton type="button" disabled={busy} onClick={closeModal}>
                {t("manage-user-button-cancel")}
              </ActionButton>
              <ActionButton
                type="button"
                disabled={busy}
                onClick={() => void doRegeocode()}
              >
                {busy
                  ? t("manage-photos-bulk-applying")
                  : t("manage-photos-bulk-confirm-regeocode-button")}
              </ActionButton>
            </ModalFooter>
            {error ? <ErrorText>{error}</ErrorText> : null}
          </ModalBox>
        </Backdrop>
      );
    }
    const isLink = pending.kind === "pick-link";
    const choices = galleries;
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

  // Link + Delete stay global-admin-only. Editor can't see
  // photos outside their galleries (no candidates for Link) and
  // delete is a destructive admin operation — the matrix puts
  // both with global admin. Edit fields / Regeocode / Unlink
  // run for both global-admin and gallery-editor; the server
  // gate authorizes per-photo / per-gallery.
  return (
    <>
      <Bar>
        <Count>{t("manage-photos-bulk-selected", { count })}</Count>
        {isAdmin && (
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
          onClick={() => setPending({ kind: "edit-fields" })}
        >
          {t("manage-photos-bulk-edit-fields")}
        </ActionButton>
        <ActionButton
          type="button"
          disabled={busy || count === 0}
          onClick={() => setPending({ kind: "confirm-regeocode" })}
        >
          {t("manage-photos-bulk-regeocode")}
        </ActionButton>
        {isAdmin && (
          <ActionButton
            type="button"
            $danger
            disabled={busy || count === 0}
            onClick={() => setPending({ kind: "confirm-delete" })}
          >
            {t("manage-photos-bulk-delete")}
          </ActionButton>
        )}
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
