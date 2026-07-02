import { create } from "zustand";

interface LoginModalState {
  isOpen: boolean;
  // Optional contextual message shown as a banner inside the modal — used
  // by the global 401 handler to say "your session expired" without
  // depending on the toast strip (which sits visually behind the modal's
  // backdrop). Explicit "Log in" clicks open the modal with no message.
  message: string | undefined;
  // Federated login mode: instead of rendering the password form,
  // the modal shows a spinner + "Signing in via <hostname>…" and the
  // caller navigates the browser to the main host. Set by
  // `beginLogin` in `lib/auth-redirect.ts` on non-main hosts that
  // have an `isMain` entry in `instance_knownHosts`.
  redirectingTo: string | undefined;
  open: (message?: string) => void;
  openRedirecting: (mainHost: string) => void;
  close: () => void;
}

export const useLoginModalStore = create<LoginModalState>((set) => ({
  isOpen: false,
  message: undefined,
  redirectingTo: undefined,
  open: (message) =>
    set({ isOpen: true, message, redirectingTo: undefined }),
  openRedirecting: (mainHost) =>
    set({ isOpen: true, message: undefined, redirectingTo: mainHost }),
  close: () =>
    set({ isOpen: false, message: undefined, redirectingTo: undefined }),
}));
