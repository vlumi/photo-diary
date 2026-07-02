import { QueryClient } from "@tanstack/react-query";

// One shared client for the whole tree. Defaults are tuned for a
// personal photo gallery: galleries/photos rarely change underneath
// us, so we don't need aggressive refetching, but window-focus
// refetching stays on so the app picks up server changes when an
// admin returns to the tab.
//
// Exported as a module singleton (not just constructed inside
// index.tsx) so non-React callers — the 401 handler in `lib/api.ts`,
// the federated-login helpers — can read from the same cache.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});
