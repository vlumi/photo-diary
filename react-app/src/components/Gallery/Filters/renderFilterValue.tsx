import React from "react";
import type { TFunction } from "i18next";

import FlagIcon from "../../FlagIcon";
import format from "../../../lib/format";
import stats from "../../../lib/stats";

interface CountryData {
  getName(code: string, lang: string): string | undefined;
  isValid(code: string): boolean;
}

const renderFilterValue = (
  category: string,
  rawKey: string,
  fallbackLabel: string,
  lang: string,
  t: TFunction,
  countryData: CountryData
): React.ReactNode => {
  if (rawKey === stats.UNKNOWN) {
    return String(t("stats-unknown"));
  }
  if (category === "country" && countryData.isValid(rawKey)) {
    return (
      <>
        <FlagIcon code={rawKey} /> {fallbackLabel}
      </>
    );
  }
  if (category === "state") {
    const country = rawKey.slice(0, 2).toLowerCase();
    return (
      <>
        {countryData.isValid(country) ? (
          <>
            <FlagIcon code={country} />{" "}
          </>
        ) : null}
        {format.subdivisionName(lang, rawKey)}
      </>
    );
  }
  if (category === "city") {
    // `fallbackLabel` is the deduped display label built by
    // `format.buildCityLabels` in `buildUniqueValues` — no
    // qualifier when the display is unique, localised region
    // (or country) qualifier when it isn't. Use it verbatim;
    // only prepend the country flag.
    const parsed = format.parseCityKey(rawKey);
    return (
      <>
        {parsed.country && countryData.isValid(parsed.country) ? (
          <>
            <FlagIcon code={parsed.country} />{" "}
          </>
        ) : null}
        {fallbackLabel}
      </>
    );
  }
  return fallbackLabel;
};

export default renderFilterValue;
