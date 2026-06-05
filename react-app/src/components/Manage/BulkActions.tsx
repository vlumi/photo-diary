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
const Confirm = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--tile-background);
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  margin-bottom: 8px;
`;
const ConfirmText = styled.span`
  flex: 1 1 auto;
  min-width: 0;
`;
const Select = styled.select`
  font: inherit;
  padding: 3px 6px;
  background: var(--primary-background);
  color: var(--primary-color);
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
`;
const ErrorText = styled.div`
  color: var(--alert-color, #c33);
  font-size: 0.9em;
  padding: 0 12px 4px;
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

  React.useEffect(() => {
    if (pending.kind === "none") return;
    setGalleryPick(scopedGalleryId ?? galleries[0]?.id ?? "");
  }, [pending.kind, scopedGalleryId, galleries]);

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

  if (pending.kind === "confirm-delete") {
    return (
      <>
        <Confirm>
          <ConfirmText>
            {t("manage-photos-bulk-confirm-delete", { count })}
          </ConfirmText>
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
          <ActionButton
            type="button"
            disabled={busy}
            onClick={() => setPending({ kind: "none" })}
          >
            {t("manage-user-button-cancel")}
          </ActionButton>
        </Confirm>
        {error ? <ErrorText>{error}</ErrorText> : null}
      </>
    );
  }
  if (pending.kind === "pick-link" || pending.kind === "pick-unlink") {
    const isLink = pending.kind === "pick-link";
    const choices =
      isLink || !scopedGalleryId
        ? galleries
        : galleries.filter((g) => g.id === scopedGalleryId);
    return (
      <>
        <Confirm>
          <ConfirmText>
            {isLink
              ? t("manage-photos-bulk-pick-link", { count })
              : t("manage-photos-bulk-pick-unlink", { count })}
          </ConfirmText>
          <Select
            value={galleryPick}
            disabled={busy}
            onChange={(e) => setGalleryPick(e.target.value)}
          >
            {choices.length === 0 ? (
              <option value="">{t("manage-photos-bulk-no-galleries")}</option>
            ) : (
              choices.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title || g.id}
                </option>
              ))
            )}
          </Select>
          <ActionButton
            type="button"
            disabled={busy || !galleryPick}
            onClick={() => void (isLink ? doLink() : doUnlink())}
          >
            {busy
              ? t("manage-photos-bulk-applying")
              : isLink
                ? t("manage-photos-bulk-link-button")
                : t("manage-photos-bulk-unlink-button")}
          </ActionButton>
          <ActionButton
            type="button"
            disabled={busy}
            onClick={() => setPending({ kind: "none" })}
          >
            {t("manage-user-button-cancel")}
          </ActionButton>
        </Confirm>
        {error ? <ErrorText>{error}</ErrorText> : null}
      </>
    );
  }

  return (
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
  );
};

export default BulkActions;
