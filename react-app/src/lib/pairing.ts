// The companion app registers the `photodiary://` scheme; `sso` is the
// pairing action. Host and ticket ride as query params so the app can
// show "Add <host>?" before it consumes anything.
export const pairingUrl = (host: string, token: string): string =>
  `photodiary://sso?host=${encodeURIComponent(host)}&token=${encodeURIComponent(token)}`;

// m:ss for the countdown, clamped at 0:00. Ceil so the display hits
// 0:00 exactly when the ticket expires rather than a second early.
export const formatRemaining = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};
