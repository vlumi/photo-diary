import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { useScrollStore } from "../stores";

interface Props {
  children?: React.ReactNode;
}

// `state.skipScrollRestore` lets callers that handle scroll themselves
// opt out — otherwise our setTimeout(0) snaps to the saved position and
// undoes whatever the caller just did.
const ScrollToPosition = ({ children }: Props): React.ReactElement => {
  const location = useLocation();
  const get = useScrollStore((s) => s.get);
  useEffect(() => {
    const state = location.state as
      | { skipScrollRestore?: boolean }
      | null
      | undefined;
    if (state?.skipScrollRestore) return;
    const y = get(location.pathname);
    setTimeout(() => window.scrollTo(0, y), 0);
  }, [location, get]);
  return <>{children}</>;
};
export default ScrollToPosition;
