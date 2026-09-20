import React from "react";
import { BsClipboard, BsClipboardCheck } from "react-icons/bs";
import { CopyIconButton, EmptyValue } from "./styles";

// Maritime address keys Nominatim emits when reverse-geocoding
// open water. Falling back to the first populated one lets the
// drawer show "Atlantic Ocean" / "Gulf of Finland" for photos
// taken on the water, instead of "Not geocoded yet".
export const MARITIME_ADDRESS_KEYS = [
  "ocean",
  "sea",
  "bay",
  "strait",
  "gulf",
] as const;

// Render the geocoded-row summary as one of four states:
//  1. city set → existing `countryCode / state / city` join
//  2. maritime field set → that name verbatim
//  3. noData = true → "no data" empty-state
//  4. otherwise → existing "not geocoded yet" empty-state
export const renderGeocodedSummary = (
  geocoded:
    | {
        countryCode?: string;
        state?: string;
        city?: string;
        address?: Record<string, unknown>;
        noData?: boolean;
      }
    | undefined,
  t: (key: string) => string
): React.ReactNode => {
  if (geocoded?.city) {
    return [geocoded.countryCode, geocoded.state, geocoded.city]
      .filter(Boolean)
      .join(" / ");
  }
  const address = geocoded?.address ?? {};
  for (const key of MARITIME_ADDRESS_KEYS) {
    const value = address[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return (
    <EmptyValue>
      {t(
        geocoded?.noData
          ? "manage-photo-geocoded-no-data"
          : "manage-photo-geocoded-empty"
      )}
    </EmptyValue>
  );
};

// Small inline copy-to-clipboard button used in the read-only meta
// rows (id, original filename). Falls back to hidden when the
// clipboard API isn't available (non-HTTPS dev origins). Flashes
// a check icon for 1.5s after a successful copy so the operator
// sees the action register without needing a separate toast.
export const CopyButton = ({
  value,
  label,
}: {
  value: string;
  label: string;
}): React.ReactElement | null => {
  const [copied, setCopied] = React.useState(false);
  const hasClipboard =
    typeof navigator !== "undefined" &&
    typeof navigator.clipboard?.writeText === "function";
  React.useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);
  if (!hasClipboard) return null;
  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    void navigator.clipboard.writeText(value).then(
      () => setCopied(true),
      () => undefined
    );
  };
  return (
    <CopyIconButton
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      {copied ? <BsClipboardCheck aria-hidden /> : <BsClipboard aria-hidden />}
    </CopyIconButton>
  );
};
