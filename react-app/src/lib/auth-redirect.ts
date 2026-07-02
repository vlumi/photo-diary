// Federated login: on non-main hosts, delegate authentication to
// the main host (the `instance_knownHosts` entry with `isMain: true`)
// via the same cross-host SSO plumbing the UserMenu switcher uses.
// The main host renders the login modal, the visitor signs in, then
// the SPA hops them back to the source host with fresh cookies.
//
// Rationale: in a multi-hostname deploy, credentials live on the
// main host only. Letting a non-main host accept passwords locally
// splits the identity model and (if the operator ever separates
// instances) is a phishing surface.

import { queryClient } from "./query-client";
import { useLoginModalStore } from "../stores";

interface KnownHostEntry {
  hostname: string;
  isMain?: boolean;
}

// Read the main host from the meta cache. Returns undefined when
// meta hasn't loaded yet, no main is configured, or we're already
// on the main host (nothing to delegate to).
const findMainHostForDelegation = (): string | undefined => {
  const meta = queryClient.getQueryData<{ knownHosts?: unknown }>(["meta"]);
  const raw = meta?.knownHosts;
  if (!Array.isArray(raw)) return undefined;
  const currentHost =
    typeof window !== "undefined"
      ? window.location.hostname.toLowerCase()
      : "";
  const main = raw.find(
    (h): h is KnownHostEntry =>
      !!h &&
      typeof (h as { hostname?: unknown }).hostname === "string" &&
      (h as { isMain?: unknown }).isMain === true
  );
  if (!main) return undefined;
  if (main.hostname.toLowerCase() === currentHost) return undefined;
  return main.hostname;
};

// Build the redirect URL that ships us to the main host with enough
// context for it to bounce us back after login.
const buildFederatedLoginUrl = (mainHost: string): string => {
  const currentHost = window.location.hostname;
  const currentPath = window.location.pathname + window.location.search;
  const params = new URLSearchParams({
    login: "1",
    sso_to: currentHost,
    sso_path: currentPath.startsWith("/") ? currentPath : "/",
  });
  return `https://${mainHost}/?${params.toString()}`;
};

// Kick off a login flow. On a federated host, opens the modal in
// redirecting-mode and navigates the browser to the main host. On
// the main host (or on non-federated deploys), opens the modal
// with the local password form.
export const beginLogin = (message?: string): void => {
  const mainHost = findMainHostForDelegation();
  if (mainHost) {
    useLoginModalStore.getState().openRedirecting(mainHost);
    // Same-tick redirect. React batches state → the modal renders
    // in the same paint the browser starts navigating, so the
    // visitor sees the announced-redirect state before their tab
    // swaps hosts.
    window.location.href = buildFederatedLoginUrl(mainHost);
    return;
  }
  useLoginModalStore.getState().open(message);
};

// Read the "?login=1&sso_to=…&sso_path=…" query params the main
// host receives from a federated non-main host. Returns undefined
// if the shape doesn't match. Doesn't validate `sso_to` against
// the local knownHosts cache — `/tokens/cross-host` does that
// server-side, and requiring meta to be loaded here would gate
// the entire flow on the meta fetch completing.
export interface FederatedReturn {
  ssoTo: string;
  ssoPath: string;
}
export const readFederatedReturnFromUrl = (): FederatedReturn | undefined => {
  if (typeof window === "undefined") return undefined;
  const params = new URLSearchParams(window.location.search);
  if (params.get("login") !== "1") return undefined;
  const ssoTo = params.get("sso_to");
  const ssoPath = params.get("sso_path");
  if (!ssoTo || !ssoPath) return undefined;
  if (!ssoPath.startsWith("/")) return undefined;
  return { ssoTo, ssoPath };
};

// Strip the federated-login query params from the current URL after
// a successful hop (or when the visitor navigates elsewhere on the
// main host). Uses history.replaceState so a refresh doesn't loop
// through the redirect flow.
export const clearFederatedReturnFromUrl = (): void => {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("login");
  url.searchParams.delete("sso_to");
  url.searchParams.delete("sso_path");
  window.history.replaceState({}, "", url.toString());
};
