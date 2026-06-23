import React from "react";
import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { useIsFetching } from "@tanstack/react-query";

// Top-of-viewport progress bar shown while any TanStack Query is
// fetching. Pairs with the `keepPreviousData` sweep — the
// page no longer unmounts to a loader, but the operator still
// wants feedback that a refetch is in flight after a chip toggle
// or drawer open. 2px bar slides a gradient horizontally; hides
// completely when nothing's fetching.
//
// Mounted once in App.tsx so the signal works across every route.

const slide = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
`;
const Bar = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  z-index: 2500;
  overflow: hidden;
  background: transparent;
  pointer-events: none;
`;
const Pulse = styled.div`
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    var(--primary-color) 50%,
    transparent 100%
  );
  animation: ${slide} 1.2s linear infinite;
`;

// Tiny anti-flicker debounce — render the bar only when a fetch
// has been in flight for ≥ ~120 ms. Cached responses resolve
// faster than the eye can register, and rendering the bar for
// 50 ms feels like noise.
const SHOW_AFTER_MS = 120;

const GlobalFetchIndicator = (): React.ReactElement | null => {
  const fetching = useIsFetching();
  const [show, setShow] = React.useState(false);
  React.useEffect(() => {
    if (fetching === 0) {
      setShow(false);
      return;
    }
    const handle = window.setTimeout(() => setShow(true), SHOW_AFTER_MS);
    return () => window.clearTimeout(handle);
  }, [fetching]);
  if (!show) return null;
  return (
    <Bar role="status" aria-live="polite" aria-label="Loading">
      <Pulse />
    </Bar>
  );
};
export default GlobalFetchIndicator;
