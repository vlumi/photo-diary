import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";

import ChangePassword from "./ChangePassword";

import { useChangePasswordModalStore } from "../stores";

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

const ChangePasswordModal = (): React.ReactElement | null => {
  const isOpen = useChangePasswordModalStore((s) => s.isOpen);
  const close = useChangePasswordModalStore((s) => s.close);
  const { t } = useTranslation();

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

  const onBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) close();
  };

  return (
    <Backdrop
      onClick={onBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-password-modal-title"
    >
      <ModalBox>
        <Header>
          <Title id="change-password-modal-title">
            {t("change-password-title")}
          </Title>
          <CloseButton
            type="button"
            onClick={close}
            aria-label={t("login-close")}
          >
            ╳
          </CloseButton>
        </Header>
        <ChangePassword onSuccess={close} />
      </ModalBox>
    </Backdrop>
  );
};
export default ChangePasswordModal;
