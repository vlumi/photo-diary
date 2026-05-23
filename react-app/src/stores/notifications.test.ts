import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { useNotificationsStore } from "./notifications";

beforeEach(() => {
  vi.useFakeTimers();
  useNotificationsStore.getState().clear();
});

afterEach(() => {
  vi.useRealTimers();
});

test("notify() adds a notification with a unique id and returns it", () => {
  const id = useNotificationsStore.getState().notify("info", "hello");
  const { notifications } = useNotificationsStore.getState();
  expect(notifications).toHaveLength(1);
  expect(notifications[0].id).toBe(id);
  expect(notifications[0].type).toBe("info");
  expect(notifications[0].message).toBe("hello");
});

test("multiple notifications stack in insertion order", () => {
  const { notify } = useNotificationsStore.getState();
  notify("error", "first");
  notify("warning", "second");
  notify("success", "third");
  const messages = useNotificationsStore
    .getState()
    .notifications.map((n) => n.message);
  expect(messages).toEqual(["first", "second", "third"]);
});

test("dismiss() removes only the matching notification", () => {
  const { notify } = useNotificationsStore.getState();
  notify("info", "keep1");
  const target = notify("info", "drop me");
  notify("info", "keep2");
  useNotificationsStore.getState().dismiss(target);
  const messages = useNotificationsStore
    .getState()
    .notifications.map((n) => n.message);
  expect(messages).toEqual(["keep1", "keep2"]);
});

describe("auto-dismiss", () => {
  test("dismisses after the configured timeout", () => {
    useNotificationsStore.getState().notify("info", "bye", { timeoutMs: 1000 });
    expect(useNotificationsStore.getState().notifications).toHaveLength(1);
    vi.advanceTimersByTime(1000);
    expect(useNotificationsStore.getState().notifications).toHaveLength(0);
  });

  test("timeoutMs=0 disables auto-dismiss", () => {
    useNotificationsStore.getState().notify("info", "stay", { timeoutMs: 0 });
    vi.advanceTimersByTime(60_000);
    expect(useNotificationsStore.getState().notifications).toHaveLength(1);
  });

  test("default timeout differs by type (error > info)", () => {
    const { notify } = useNotificationsStore.getState();
    notify("info", "i");
    notify("error", "e");
    // Info defaults to 4s, error to 8s.
    vi.advanceTimersByTime(4000);
    const remaining = useNotificationsStore
      .getState()
      .notifications.map((n) => n.message);
    expect(remaining).toEqual(["e"]);
  });

  test("manual dismiss cancels the pending auto-dismiss timer", () => {
    const id = useNotificationsStore
      .getState()
      .notify("info", "x", { timeoutMs: 5000 });
    useNotificationsStore.getState().dismiss(id);
    // The store should not error or re-add the notification when the
    // timer would have fired.
    vi.advanceTimersByTime(10_000);
    expect(useNotificationsStore.getState().notifications).toHaveLength(0);
  });
});
