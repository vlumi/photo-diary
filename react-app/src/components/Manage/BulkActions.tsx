import React from "react";
import { useTranslation } from "react-i18next";
import styled from "@emotion/styled";

import photosService from "../../services/photos";
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
const ErrorText = styled.div`
  color: var(--alert-color, #c33);
  font-size: 0.9em;
  margin-top: 8px;
`;

type Pending =
  | { kind: "none" }
  | { kind: "confirm-delete" }
  | { kind: "pick-link" }
  | { kind: "pick-unlink" };

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

  const closeModal = React.useCallback(() => {
    if (busy) return;
    setPending({ kind: "none" });
    setError(null);
  }, [busy]);

  React.useEffect(() => {
    if (pending.kind === "none") return;
    setGalleryPick(scopedGalleryId ?? galleries[0]?.id ?? "");
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

  return (
    <>
      <Bar>
        <Count>{t("manage-photos-bulk-selected", { count })}</Count>
        <ActionButton
          type="button"
          disabled={busy || count === 0}
          onClick={() => setPending({ kind: "pick-link" })}
        >
          {t("manage-photos-bulk-link")}
        </ActionButton>
        <ActionButton
          type="button"
          disabled={busy || count === 0}
          onClick={() => setPending({ kind: "pick-unlink" })}
        >
          {t("manage-photos-bulk-unlink")}
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
