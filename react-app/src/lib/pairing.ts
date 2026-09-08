// The companion app registers the `photodiary://` scheme; `sso` is the
// pairing action. Host and ticket ride as query params so the app can
// show "Add <host>?" before it consumes anything.
//
// Host and scheme come from the server's pairing response, not from
// this page's location: the server points the app at the instance's
// main host (so pairing from a virtual host still yields one app
// instance for the whole server) and, when no main host is
// configured, at the host this page reached it on — port included,
// which is what a dev instance needs. `scheme=http` is added only
// for plain http so the app can allow it for local instances while
// defaulting to https everywhere else.
export const pairingUrl = (
  target: { host: string; scheme: string },
  token: string
): string => {
  const params = new URLSearchParams({ host: target.host, token });
  if (target.scheme !== "https") params.set("scheme", "http");
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
