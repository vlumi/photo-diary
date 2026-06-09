import React from "react";

// Subscribe to a CSS media query, returning whether it currently
// matches. SSR-safe (returns `false` until hydration). Mirrors the
// shape Web platform offers via `matchMedia` — the hook is just a
// thin React adapter so component renders stay declarative.
const useMediaQuery = (query: string): boolean => {
  const subscribe = React.useCallback(
    (callback: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", callback);
      return () => mql.removeEventListener("change", callback);
    },
    [query]
  );
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  );
};

export default useMediaQuery;
