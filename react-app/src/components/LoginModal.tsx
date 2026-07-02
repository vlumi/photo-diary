import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";

import Login from "./Login";

import { useLoginModalStore } from "../stores";

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
  max-width: 360px;
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
// Contextual banner used by the 401 handler (e.g. "session expired").
// Lives inside the modal so the message is visible alongside the form
// that resolves it — the toast strip sits behind the modal backdrop.
const ContextMessage = styled.div`
  margin-bottom: 12px;
  padding: 8px 12px;
  border: 1px solid #9b6c00;
  background: #6b4a00;
  color: #fef6e0;
  border-radius: 4px;
  font-size: 0.9em;
`;

// Floating login modal. Opens via the `useLoginModalStore` — either from
// the explicit "Log in" button in the top menu, or automatically when the
// global 401 handler in `lib/api.ts` catches a mid-session expiry.
// Dismissable in both cases: clicking the backdrop, pressing Escape, or
// clicking the close button all close it. After dismissal the URL is
// preserved, and the SPA's gallery routing already renders an empty view
// for galleries the (now-guest) user can't see, so degradation is graceful.
// Federated-login "redirecting" view: shown briefly while the
// browser navigates to the main host (typical: a few hundred ms
// before the page swaps). No form — the visitor's password lives
// on the main host only.
const RedirectingBody = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px 0 12px;
  color: var(--inactive-color);
`;
const Spinner = styled.div`
  width: 32px;
  height: 32px;
  border: 3px solid var(--inactive-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const LoginModal = (): React.ReactElement | null => {
  const isOpen = useLoginModalStore((s) => s.isOpen);
  const close = useLoginModalStore((s) => s.close);
  const message = useLoginModalStore((s) => s.message);
  const redirectingTo = useLoginModalStore((s) => s.redirectingTo);
  const { t } = useTranslation();

  React.useEffect(() => {
    if (!isOpen) return;
    // Capture-phase + stopImmediatePropagation so closing this
    // modal doesn't also trigger the Manage shell's Esc-up
    // navigation when it's opened from /m/*.
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

  const onBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) close();
  };

  return (
    <Backdrop
      onClick={onBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
    >
      <ModalBox>
        <Header>
          <Title id="login-modal-title">{t("login-title")}</Title>
          <CloseButton
            type="button"
            onClick={close}
            aria-label={t("login-close")}
          >
            ╳
          </CloseButton>
        </Header>
        {redirectingTo ? (
          <RedirectingBody>
            <Spinner aria-hidden />
            <div>
              {t("login-redirecting-to", { host: redirectingTo })}
            </div>
          </RedirectingBody>
        ) : (
          <>
            {message && <ContextMessage>{message}</ContextMessage>}
            <Login onSuccess={close} />
          </>
        )}
      </ModalBox>
    </Backdrop>
  );
};
export default LoginModal;
