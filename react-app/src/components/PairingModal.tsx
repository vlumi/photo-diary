import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";

import tokenService from "../services/tokens";
import { formatRemaining, pairingUrl } from "../lib/pairing";
import { usePairingModalStore } from "../stores";

// Native <dialog> in the top layer — same shell as ThemePickerModal.
// Chrome-only content (a monochrome QR, a link, buttons), so no inset
// monochrome overlay is needed on the grayscale theme.
const Dialog = styled.dialog`
  position: fixed;
  inset: 0;
  width: auto;
  height: auto;
  max-width: none;
  max-height: none;
  margin: 0;
  padding: 20px;
  border: none;
  background: transparent;
  color: inherit;
  overflow: auto;
  &[open] {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  &::backdrop {
    background: rgba(0, 0, 0, 0.55);
  }
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
const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
`;
const Title = styled.h2`
  margin: 0;
  font-size: 1.1em;
`;
const CloseButton = styled.button`
  border: none;
  background: none;
  color: var(--inactive-color);
  font-size: 1.2em;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
  &:hover {
    color: var(--primary-color);
  }
`;
const Hint = styled.p`
  margin: 0 0 14px;
  font-size: 0.9em;
  color: var(--inactive-color);
`;
const QrFrame = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 240px;
  margin-bottom: 10px;
`;
// The quiet zone comes from the encoder's `margin` option, so the
// image is the full white tile — nothing to pad here.
const QrImage = styled.img`
  display: block;
  width: 240px;
  height: 240px;
  border-radius: 6px;
`;
const Countdown = styled.p`
  margin: 0 0 14px;
  text-align: center;
  font-variant-numeric: tabular-nums;
`;
const Notice = styled.p`
  margin: 0 0 14px;
  text-align: center;
  color: var(--inactive-color);
`;
const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-bottom: 14px;
`;
const ActionButton = styled.button`
  font: inherit;
  padding: 6px 12px;
  border-radius: 4px;
  border: 1px solid var(--primary-color);
  background: var(--header-background);
  color: var(--header-color);
  cursor: pointer;
  text-decoration: none;
  &:hover,
  &:focus-visible {
    filter: brightness(1.15);
  }
  &:disabled {
    cursor: default;
    opacity: 0.5;
  }
`;
const SecondaryButton = styled(ActionButton)`
  background: transparent;
  color: var(--primary-color);
`;
const OpenInApp = ActionButton.withComponent("a");
const LinkRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;
const LinkInput = styled.input`
  flex: 1;
  min-width: 0;
  font: inherit;
  font-size: 0.8em;
  padding: 6px 8px;
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
  background: var(--tile-background);
  color: var(--primary-color);
`;

interface Ticket {
  token: string;
  host: string;
  expiresAt: number;
}

// Mints a one-shot pairing ticket on open and shows it three ways —
// QR, "Open in app" link, pastable string — all the same
// photodiary:// URL. A once-a-second tick drives the countdown; at
// expiry the QR and link give way to a "new code" prompt so a stale
// code can't be scanned by mistake. Regenerating is always allowed.
const PairingModal = (): React.ReactElement | null => {
  const isOpen = usePairingModalStore((s) => s.isOpen);
  const close = usePairingModalStore((s) => s.close);
  const { t } = useTranslation();
  const dialogRef = React.useRef<HTMLDialogElement>(null);

  const [ticket, setTicket] = React.useState<Ticket | null>(null);
  const [qr, setQr] = React.useState<string | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [now, setNow] = React.useState(() => Date.now());

  const mint = React.useCallback(async () => {
    setFailed(false);
    setTicket(null);
    setQr(null);
    setCopied(false);
    try {
      setTicket(await tokenService.pairing());
    } catch {
      setFailed(true);
    }
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      dialogRef.current?.showModal();
      void mint();
      return;
    }
    setTicket(null);
    setQr(null);
    setFailed(false);
    setCopied(false);
  }, [isOpen, mint]);

  const url = ticket ? pairingUrl(ticket.host, ticket.token) : null;

  React.useEffect(() => {
    if (!url) return;
    let cancelled = false;
    // The encoder is only needed here; a dynamic import keeps it out
    // of the main bundle.
    import("qrcode")
      .then(({ toDataURL }) =>
        toDataURL(url, { margin: 2, width: 240, errorCorrectionLevel: "M" })
      )
      .then((dataUrl) => {
        if (!cancelled) setQr(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  React.useEffect(() => {
    if (!isOpen || !ticket) return;
    setNow(Date.now());
    const handle = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(handle);
  }, [isOpen, ticket]);

  React.useEffect(() => {
    if (!isOpen) return;
    // Capture-phase + stopImmediatePropagation: see LoginModal.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      close();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [isOpen, close]);

  if (!isOpen) return null;

  const remainingMs = ticket ? ticket.expiresAt - now : 0;
  const expired = ticket !== null && remainingMs <= 0;

  const onBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) close();
  };
  const onCancel = (event: React.SyntheticEvent) => {
    event.preventDefault();
    close();
  };
  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (insecure context / permission) — the
      // field is still selectable by hand.
    }
  };

  const regenerate = (
    <ActionButton type="button" onClick={() => void mint()}>
      {t("pairing-regenerate")}
    </ActionButton>
  );

  return (
    <Dialog
      ref={dialogRef}
      onClick={onBackdropClick}
      onCancel={onCancel}
      aria-labelledby="pairing-modal-title"
    >
      <ModalBox>
        <Header>
          <Title id="pairing-modal-title">{t("pairing-title")}</Title>
          <CloseButton
            type="button"
            onClick={close}
            aria-label={String(t("close"))}
          >
            ╳
          </CloseButton>
        </Header>
        <Hint>{t("pairing-hint")}</Hint>
        {failed ? (
          <>
            <Notice role="alert">{t("pairing-failed")}</Notice>
            <Actions>{regenerate}</Actions>
          </>
        ) : expired ? (
          <>
            <Notice role="status">{t("pairing-expired")}</Notice>
            <Actions>{regenerate}</Actions>
          </>
        ) : (
          <>
            <QrFrame>
              {qr ? (
                <QrImage src={qr} alt={String(t("pairing-qr-alt"))} />
              ) : (
                <Notice>{t("loading")}</Notice>
              )}
            </QrFrame>
            <Countdown>
              {ticket
                ? t("pairing-expires-in", { time: formatRemaining(remainingMs) })
                : " "}
            </Countdown>
            <Actions>
              {url && <OpenInApp href={url}>{t("pairing-open-in-app")}</OpenInApp>}
              <SecondaryButton
                type="button"
                disabled={!ticket}
                onClick={() => void mint()}
              >
                {t("pairing-regenerate")}
              </SecondaryButton>
            </Actions>
            {url && (
              <LinkRow>
                <LinkInput
                  readOnly
                  value={url}
                  aria-label={String(t("pairing-link-label"))}
                  onFocus={(e) => e.currentTarget.select()}
                />
                <SecondaryButton type="button" onClick={() => void copy()}>
                  {copied ? t("pairing-copied") : t("pairing-copy")}
                </SecondaryButton>
              </LinkRow>
            )}
          </>
        )}
      </ModalBox>
    </Dialog>
  );
};
export default PairingModal;
