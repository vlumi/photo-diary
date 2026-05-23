import { create } from "zustand";

export type NotificationType = "error" | "warning" | "success" | "info";

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  // Auto-dismiss after this many ms. `0` keeps it until the user clicks
  // it away. Defaults differ by type — errors stick longer than info.
  timeoutMs: number;
}

interface NotifyOptions {
  timeoutMs?: number;
}

interface NotificationsState {
  notifications: Notification[];
  notify: (
    type: NotificationType,
    message: string,
    options?: NotifyOptions
  ) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

const DEFAULT_TIMEOUTS: Record<NotificationType, number> = {
  error: 8000,
  warning: 6000,
  success: 3000,
  info: 4000,
};

// Tracks active toast notifications. Components push messages via the
// `notify` action; the `<Notifications>` portal renders them. The auto-
// dismiss timer lives outside the store so re-renders don't clear/reset
// timers; the store only holds data.
let counter = 0;
const dismissTimers = new Map<string, ReturnType<typeof setTimeout>>();

const scheduleAutoDismiss = (
  id: string,
  timeoutMs: number,
  dismiss: (id: string) => void
) => {
  if (timeoutMs <= 0) return;
  const handle = setTimeout(() => {
    dismissTimers.delete(id);
    dismiss(id);
  }, timeoutMs);
  dismissTimers.set(id, handle);
};

const cancelAutoDismiss = (id: string) => {
  const handle = dismissTimers.get(id);
  if (handle !== undefined) {
    clearTimeout(handle);
    dismissTimers.delete(id);
  }
};

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  notify: (type, message, options) => {
    counter += 1;
    const id = `n${counter}`;
    const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUTS[type];
    set((state) => ({
      notifications: [...state.notifications, { id, type, message, timeoutMs }],
    }));
    scheduleAutoDismiss(id, timeoutMs, get().dismiss);
    return id;
  },
  dismiss: (id) => {
    cancelAutoDismiss(id);
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },
  clear: () => {
    dismissTimers.forEach((handle) => clearTimeout(handle));
    dismissTimers.clear();
    set({ notifications: [] });
  },
}));
