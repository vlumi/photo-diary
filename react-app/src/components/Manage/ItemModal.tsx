import React from "react";
import styled from "@emotion/styled";
import { useNavigate } from "react-router-dom";

import { useTranslation } from "react-i18next";
import { BsXLg } from "react-icons/bs";

import { useModalStackStore } from "../../stores/modal-stack";

interface Props {
  // Where Esc / backdrop-click / close-button navigate to.
  closeTo: string;
  subModalOpen?: boolean;
  // True when the body is dirty — close needs a confirm prompt.
  // For self-wrap cases (e.g. UserEdit owns its modal). The
  // context-based hook below adds to this OR-ily for outlet bodies
  // inside a shell.
  dirty?: boolean;
  // For self-wrap cases: parent's Esc-walk-up. Return true to
  // swallow (switched edit→view); false to fall through to close.
  // Outlet bodies use `useModalEscape` instead.
  onEscape?: () => boolean;
  // Bodies that render their own close affordance (e.g. PhotoDrawer
  // groups its close button with prev/next arrows) hide the modal's
  // default floating X to avoid two close buttons stacked.
  noCloseButton?: boolean;
  children: (helpers: { close: () => void }) => React.ReactNode;
}

// Outlet bodies (e.g. GalleryEdit inside GalleryItemShell's modal)
// register their own Esc handler / dirty flag / sub-modal flag via
// context so the shell doesn't have to thread them through props.
type EscHandler = () => boolean;
const ItemModalContext = React.createContext<{
  registerEscape: (handler: EscHandler) => () => void;
  setDirty: (dirty: boolean) => void;
  setSubModalOpen: (open: boolean) => void;
  effectiveDirty: boolean;
  safeNavigate: (to: string) => void;
}>({
  registerEscape: () => () => {},
  setDirty: () => {},
  setSubModalOpen: () => {},
  effectiveDirty: false,
  safeNavigate: () => {},
});

// Read by tab buttons inside the shell so a tab switch confirms
// before discarding form state.
export const useItemModalContext = () => React.useContext(ItemModalContext);

export const useModalEscape = (
  handler: EscHandler | null,
  deps: React.DependencyList
): void => {
  const ctx = React.useContext(ItemModalContext);
  React.useEffect(() => {
    if (!handler) return;
    return ctx.registerEscape(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};

export const useModalDirty = (dirty: boolean): void => {
  const ctx = React.useContext(ItemModalContext);
  React.useEffect(() => {
    ctx.setDirty(dirty);
    return () => ctx.setDirty(false);
  }, [ctx, dirty]);
};

export const useModalSubModalOpen = (open: boolean): void => {
  const ctx = React.useContext(ItemModalContext);
  React.useEffect(() => {
    ctx.setSubModalOpen(open);
    return () => ctx.setSubModalOpen(false);
  }, [ctx, open]);
};

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  height: 100dvh;
  background: rgba(0, 0, 0, 0.55);
  z-index: 1500;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  box-sizing: border-box;
`;
const Frame = styled.div`
  /* Frame is the modal's "page" surface — the panels inside it use
     --tile-background so they read as cards on this surface, the
     same way /g/'s calendar tiles sit on the gallery page. */
  background: var(--primary-background);
  color: var(--primary-color);
  border: 1px solid var(--inactive-color);
  border-radius: 6px;
  width: 100%;
  max-width: min(900px, calc(100vw - 40px));
  /* Frame caps at viewport height; scrolling happens inside the
     Body slot. That way the body's first / last children can use
     position: sticky to pin titles + footer relative to the
     scrolling region instead of the viewport. */
  max-height: calc(100dvh - 64px);
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  position: relative;
  overflow: hidden;
`;
const Body = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
`;
const CloseButton = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--inactive-color);
  background: var(--primary-background);
  color: var(--primary-color);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  /* Above the sticky TabBar (z-index: 2) so it's clickable from
     any scroll position. */
  z-index: 3;
  &:hover {
    background: var(--inactive-color);
  }
`;

const ItemModal = ({
  closeTo,
  subModalOpen = false,
  dirty = false,
  onEscape,
  noCloseButton = false,
  children,
}: Props): React.ReactElement => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const escHandlerRef = React.useRef<EscHandler | null>(null);
  const [bodyDirty, setBodyDirty] = React.useState(false);
  const [bodySubModalOpen, setBodySubModalOpen] = React.useState(false);
  const effectiveDirty = dirty || bodyDirty;
  const effectiveSubModalOpen = subModalOpen || bodySubModalOpen;

  const pushModal = useModalStackStore((s) => s.push);
  const popModal = useModalStackStore((s) => s.pop);
  React.useEffect(() => {
    pushModal();
    return popModal;
  }, [pushModal, popModal]);

  const safeNavigate = React.useCallback(
    (to: string) => {
      if (effectiveDirty) {
        const confirmed = window.confirm(
          String(t("manage-modal-confirm-discard"))
        );
        if (!confirmed) return;
      }
      navigate(to);
    },
    [effectiveDirty, t, navigate]
  );
  const close = React.useCallback(() => {
    safeNavigate(closeTo);
  }, [safeNavigate, closeTo]);

  const ctxValue = React.useMemo(
    () => ({
      registerEscape: (handler: EscHandler) => {
        escHandlerRef.current = handler;
        return () => {
          if (escHandlerRef.current === handler) {
            escHandlerRef.current = null;
          }
        };
      },
      setDirty: setBodyDirty,
      setSubModalOpen: setBodySubModalOpen,
      effectiveDirty,
      safeNavigate,
    }),
    [effectiveDirty, safeNavigate]
  );

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (effectiveSubModalOpen) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (onEscape && onEscape()) return;
      if (escHandlerRef.current && escHandlerRef.current()) return;
      close();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [close, effectiveSubModalOpen, onEscape]);

  const onBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) close();
  };

  return (
    <Backdrop onClick={onBackdropClick} role="dialog" aria-modal="true">
      <Frame onClick={(e) => e.stopPropagation()}>
        {!noCloseButton && (
          <CloseButton
            type="button"
            onClick={close}
            aria-label={String(t("close"))}
            title={String(t("close"))}
          >
            <BsXLg />
          </CloseButton>
        )}
        <ItemModalContext.Provider value={ctxValue}>
          <Body>{children({ close })}</Body>
        </ItemModalContext.Provider>
      </Frame>
    </Backdrop>
  );
};

export default ItemModal;
