import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";

import format from "../../../lib/format";
import type {
  PeakShape,
  StatsCategory,
  SummaryExtras,
} from "../../../lib/stats";

interface CountryData {
  getName(code: string, lang: string): string | undefined;
  isValid(code: string): boolean;
}

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;
const ModalBox = styled.div`
  background: var(--primary-background);
  color: var(--primary-color);
  border: 1px solid var(--inactive-color);
  border-radius: 6px;
  padding: 20px;
  width: 100%;
  max-width: 720px;
  max-height: calc(100vh - 40px);
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
`;
const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
`;
const Title = styled.h2`
  margin: 0;
  font-size: 1.1em;
`;
const CloseButton = styled.button`
  border: none;
  background: none;
  color: var(--inactive-color);
  font-size: 1.2em;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
  &:hover {
    color: var(--primary-color);
  }
`;
const ScrollArea = styled.div`
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1 1 auto;
`;
const Section = styled.section`
  margin-bottom: 18px;
  &:last-child {
    margin-bottom: 0;
  }
`;
const SectionTitle = styled.h3`
  margin: 0 0 6px;
  font-size: 0.85em;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--inactive-color);
`;
const KvList = styled.dl`
  margin: 0;
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 4px 12px;
`;
const Key = styled.dt`
  font-weight: bold;
  margin: 0;
`;
const Val = styled.dd`
  margin: 0;
  overflow-wrap: anywhere;
`;
const VarietyGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 6px;
`;
const VarietyItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 6px 10px;
  background: var(--tile-background);
  border: 1px solid var(--inactive-color);
  border-radius: 4px;
`;
const VarietyLabel = styled.span`
  color: var(--inactive-color);
  font-size: 0.9em;
`;
const VarietyCount = styled.span`
  font-weight: bold;
  font-size: 1.1em;
`;

interface Props {
  category: StatsCategory;
  lang: string;
  countryData: CountryData;
  onClose: () => void;
}

const SummaryModal = ({
  category,
  lang,
  countryData,
  onClose,
}: Props): React.ReactElement | null => {
  const { t } = useTranslation();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const extras = category.summaryExtras;
  if (!extras) return null;

  const formatNumber = format.number(lang);
  const formatExposure = format.exposure(lang, t);

  const onBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) onClose();
  };

  // Per-category label formatter for the peaks + mostUsed sections.
  // Mirrors the per-category formatters in lib/stats.tsx's collectTopics
  // so values read the same as they do in the regular Stats tables.
  const formatKey = (
    domain: keyof SummaryExtras["peaks"] | keyof SummaryExtras["mostUsed"],
    key: string | number
  ): string => {
    if (key === undefined || key === null || key === "") return "";
    switch (domain) {
      case "year":
        return String(key);
      case "month":
        return t(`month-long-${key}`);
      case "weekday":
        return t(`weekday-long-${format.dayOfWeek(Number(key))}`);
      case "hour":
        return `${format.padNumber(Number(key), 2)}:00`;
      case "country":
        return (
          format.countryName(lang, countryData)(String(key)) ?? String(key)
        );
      case "cameraLens": {
        try {
          return (JSON.parse(String(key)) as string[]).join(" + ");
        } catch {
          return String(key);
        }
      }
      case "focalLength":
        return String(formatExposure.focalLength(key as never));
      case "aperture":
        return String(formatExposure.aperture(key as never));
      case "exposureTime":
        return String(formatExposure.exposureTime(key as never));
      case "iso":
        return String(formatExposure.iso(key as never));
      default:
        return String(key);
    }
  };

  // Peak-shape → display string. Three cases match the spec: a single
  // clear leader, 2-3 tied, or 4+ near-flat / "evenly distributed".
  const renderPeak = (
    domain: keyof SummaryExtras["peaks"] | keyof SummaryExtras["mostUsed"],
    peak: PeakShape
  ): string => {
    if (peak.kind === "even") {
      return t("stats-summary-even", {
        count: formatNumber.default(peak.value),
      });
    }
    if (peak.kind === "tied") {
      return t("stats-summary-tied", {
        values: peak.entries.map((e) => formatKey(domain, e.key)).join(", "),
        count: formatNumber.default(peak.value),
      });
    }
    if (peak.entries.length === 0) return "—";
    const entry = peak.entries[0];
    return t("stats-summary-leader", {
      value: formatKey(domain, entry.key),
      count: formatNumber.default(entry.value),
    });
  };

  const period = extras.period;
  const formatDate = (d?: { year: number; month: number; day: number }) =>
    d ? format.date({ year: d.year, month: d.month, day: d.day }) ?? "" : "";

  return (
    <Backdrop
      onClick={onBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="summary-modal-title"
    >
      <ModalBox>
        <Header>
          <Title id="summary-modal-title">{category.title}</Title>
          <CloseButton type="button" onClick={onClose} aria-label={t("close")}>
            ╳
          </CloseButton>
        </Header>
        <ScrollArea>
          <Section>
            <SectionTitle>{t("stats-summary-section-period")}</SectionTitle>
            <KvList>
              <Key>{t("stats-summary-first")}</Key>
              <Val>{formatDate(period.from)}</Val>
              <Key>{t("stats-summary-last")}</Key>
              <Val>{formatDate(period.to)}</Val>
              <Key>{t("stats-summary-span")}</Key>
              <Val>
                {t("stats-summary-span-fmt", {
                  years: formatNumber.oneDecimal(period.spanYears),
                  months: formatNumber.oneDecimal(period.spanMonths),
                  days: formatNumber.default(period.totalDays),
                })}
              </Val>
              <Key>{t("stats-kpi-title-photos")}</Key>
              <Val>{formatNumber.default(period.totalPhotos)}</Val>
              <Key>{t("stats-kpi-title-average")}</Key>
              <Val>
                {t("stats-kpi-average", {
                  count: formatNumber.twoDecimal(period.averagePerDay),
                })}
              </Val>
            </KvList>
          </Section>

          <Section>
            <SectionTitle>{t("stats-summary-section-peaks")}</SectionTitle>
            <KvList>
              <Key>{t("stats-summary-busiest-year")}</Key>
              <Val>{renderPeak("year", extras.peaks.year)}</Val>
              <Key>{t("stats-summary-busiest-month")}</Key>
              <Val>{renderPeak("month", extras.peaks.month)}</Val>
              <Key>{t("stats-summary-busiest-weekday")}</Key>
              <Val>{renderPeak("weekday", extras.peaks.weekday)}</Val>
              <Key>{t("stats-summary-busiest-hour")}</Key>
              <Val>{renderPeak("hour", extras.peaks.hour)}</Val>
            </KvList>
          </Section>

          <Section>
            <SectionTitle>{t("stats-summary-section-variety")}</SectionTitle>
            <VarietyGrid>
              {(
                [
                  ["author", extras.variety.authors],
                  ["country", extras.variety.countries],
                  ["camera-make", extras.variety.cameraMakes],
                  ["camera", extras.variety.cameras],
                  ["lens", extras.variety.lenses],
                  ["camera-lens", extras.variety.cameraLenses],
                  ["focal-length", extras.variety.focalLengths],
                  ["aperture", extras.variety.apertures],
                  ["exposure-time", extras.variety.exposureTimes],
                  ["iso", extras.variety.isos],
                  ["year", extras.variety.years],
                  ["year-month", extras.variety.yearMonths],
                ] as [string, number][]
              ).map(([key, count]) => (
                <VarietyItem key={key}>
                  <VarietyLabel>{t(`stats-category-${key}`)}</VarietyLabel>
                  <VarietyCount>{formatNumber.default(count)}</VarietyCount>
                </VarietyItem>
              ))}
            </VarietyGrid>
          </Section>

          <Section>
            <SectionTitle>
              {t("stats-summary-section-most-used")}
            </SectionTitle>
            <KvList>
              <Key>{t("stats-summary-top-author")}</Key>
              <Val>{renderPeak("author", extras.mostUsed.author)}</Val>
              <Key>{t("stats-summary-top-country")}</Key>
              <Val>{renderPeak("country", extras.mostUsed.country)}</Val>
              <Key>{t("stats-summary-top-camera")}</Key>
              <Val>{renderPeak("camera", extras.mostUsed.camera)}</Val>
              <Key>{t("stats-summary-top-lens")}</Key>
              <Val>{renderPeak("lens", extras.mostUsed.lens)}</Val>
              <Key>{t("stats-summary-top-camera-lens")}</Key>
              <Val>{renderPeak("cameraLens", extras.mostUsed.cameraLens)}</Val>
              <Key>{t("stats-summary-top-focal-length")}</Key>
              <Val>
                {renderPeak("focalLength", extras.mostUsed.focalLength)}
              </Val>
              <Key>{t("stats-summary-top-aperture")}</Key>
              <Val>{renderPeak("aperture", extras.mostUsed.aperture)}</Val>
              <Key>{t("stats-summary-top-exposure-time")}</Key>
              <Val>
                {renderPeak("exposureTime", extras.mostUsed.exposureTime)}
              </Val>
              <Key>{t("stats-summary-top-iso")}</Key>
              <Val>{renderPeak("iso", extras.mostUsed.iso)}</Val>
            </KvList>
          </Section>
        </ScrollArea>
      </ModalBox>
    </Backdrop>
  );
};
export default SummaryModal;
