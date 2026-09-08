// The companion app registers the `photodiary://` scheme; `sso` is the
// pairing action. Host and ticket ride as query params so the app can
// show "Add <host>?" before it consumes anything.
//
// The host is the origin the browser is on — `location.host`, port
// included — not the server's `request.hostname`: that one is the
// ticket's audience and is port-less by design, but the phone has to
// reach the same place this page did (a dev instance on :3000, a
// proxy port). `scheme=http` is added only when this page isn't on
// https, so the app can allow plain http for local instances while
// defaulting to https everywhere else.
export const pairingUrl = (
  location: { protocol: string; host: string },
  token: string
): string => {
  const params = new URLSearchParams({ host: location.host, token });
  if (location.protocol !== "https:") params.set("scheme", "http");
  return `photodiary://sso?${params.toString()}`;
};

// m:ss for the countdown, clamped at 0:00. Ceil so the display hits
// 0:00 exactly when the ticket expires rather than a second early.
export const formatRemaining = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};
