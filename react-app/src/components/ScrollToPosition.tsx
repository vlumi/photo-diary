import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { useScrollStore } from "../stores";

interface Props {
  children?: React.ReactNode;
}

// Callers that handle scroll themselves (e.g. Month's day-highlight
// scroll-into-view) pass `state: { skipScrollRestore: true }` on their
// `<Link>`. Without that opt-out, the default `setTimeout(0)` here would
// race against the caller's own scroll logic — for the Day URL case,
// jumping the page to 0 first and then forcing the caller to scroll
// back, producing a visible flash to top.
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
