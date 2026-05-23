import React from "react";
import styled from "@emotion/styled";

import { useNotificationsStore } from "../stores";
import type { NotificationType } from "../stores/notifications";

// Anchored top of viewport. On a phone (narrow viewport) the strip spans
// edge-to-edge with small margins so messages are readable without forcing
// the user to reach for a corner; on a wider screen it tucks into the
// top-right and caps at a comfortable reading width. `pointer-events: none`
// on the container lets clicks through the gaps between toasts; each toast
// re-enables them on itself so click-to-dismiss still works.
const Container = styled.div`
  position: fixed;
  top: 10px;
  left: 10px;
  right: 10px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 6px;
  pointer-events: none;

  @media (min-width: 640px) {
    left: auto;
    width: min(400px, calc(100vw - 20px));
  }
`;

const colorByType: Record<
  NotificationType,
  { background: string; color: string; border: string }
> = {
  error: {
    background: "#7a1a1a",
    color: "#fee",
    border: "#a02020",
  },
  warning: {
    background: "#6b4a00",
    color: "#fef6e0",
    border: "#9b6c00",
  },
  success: {
    background: "#1a5a2a",
    color: "#e6f7ea",
    border: "#2a8a3a",
  },
  info: {
    background: "#1a3a6a",
    color: "#e0eaf7",
    border: "#2a5598",
  },
};

const Toast = styled("button", {
  shouldForwardProp: (prop) => prop !== "$type",
})<{ $type: NotificationType }>`
  pointer-events: auto;
  text-align: left;
  font: inherit;
  font-size: 0.9em;
  padding: 10px 14px;
  border-radius: 4px;
  border: 1px solid ${(props) => colorByType[props.$type].border};
  background: ${(props) => colorByType[props.$type].background};
  color: ${(props) => colorByType[props.$type].color};
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  /* Keep the message wrappable so long text doesn't overflow on narrow
     viewports; the toast still has a max width via the container above. */
  white-space: normal;
  word-wrap: break-word;
`;

const Notifications = (): React.ReactElement => {
  const notifications = useNotificationsStore((s) => s.notifications);
  const dismiss = useNotificationsStore((s) => s.dismiss);

  return (
    <Container role="status" aria-live="polite">
      {notifications.map((n) => (
        <Toast
          key={n.id}
          $type={n.type}
          type="button"
          aria-label={`${n.type} notification (click to dismiss)`}
          onClick={() => dismiss(n.id)}
        >
          {n.message}
        </Toast>
      ))}
    </Container>
  );
};
export default Notifications;
