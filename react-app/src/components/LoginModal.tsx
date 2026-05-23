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

// Floating login modal. Opens via the `useLoginModalStore` — either from
// the explicit "Log in" button in the top menu, or automatically when the
// global 401 handler in `lib/api.ts` catches a mid-session expiry.
// Dismissable in both cases: clicking the backdrop, pressing Escape, or
// clicking the close button all close it. After dismissal the URL is
// preserved, and the SPA's gallery routing already renders an empty view
// for galleries the (now-guest) user can't see, so degradation is graceful.
const LoginModal = (): React.ReactElement | null => {
  const isOpen = useLoginModalStore((s) => s.isOpen);
  const close = useLoginModalStore((s) => s.close);
  const { t } = useTranslation();

  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
        <Login onSuccess={close} />
      </ModalBox>
    </Backdrop>
  );
};
export default LoginModal;
