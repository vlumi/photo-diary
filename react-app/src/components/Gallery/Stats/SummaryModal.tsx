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
// Tile grid used by Period, Peaks, and Most-used. Each tile has an
// uppercase label (what's being measured), a prominent value, and an
// optional muted meta line — e.g. share of total for peaks, or
// secondary span units (months · days) for the Period span tile.
const TileGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 6px;
`;
const Tile = styled.div`
  padding: 10px 12px;
  background: var(--tile-background);
  border: 1px solid var(--inactive-color);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;
const TileLabel = styled.div`
  font-size: 0.7em;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--inactive-color);
`;
const TileValue = styled.div`
  font-size: 1.05em;
  font-weight: bold;
  color: var(--primary-color);
  overflow-wrap: anywhere;
`;
const TileMeta = styled.div`
  font-size: 0.85em;
  color: var(--inactive-color);
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

type PeakDomain =
  | keyof SummaryExtras["peaks"]
  | keyof SummaryExtras["mostUsed"];

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
  const total = extras.period.totalPhotos;

  const onBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) onClose();
  };

  // Mirrors the per-category formatters in lib/stats.tsx; tiles have
  // no column header to hang the unit on, so mm/s ride along with the
  // value itself.
  const formatKey = (domain: PeakDomain, key: string | number): string => {
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
        return `${String(formatExposure.focalLength(key as never))} mm`;
      case "aperture":
        return String(formatExposure.aperture(key as never));
      case "exposureTime":
        return `${String(formatExposure.exposureTime(key as never))} s`;
      case "iso":
        return String(formatExposure.iso(key as never));
      default:
        return String(key);
    }
  };

  const formatPct = (value: number): string =>
    total > 0
      ? `${formatNumber.oneDecimal((value / total) * 100)}%`
      : "";

  // Peak → tile content. Three branches match the spec: clear leader,
  // small tie, or near-flat (`even`). Count + percentage shown as
  // meta below the value — gives the busiest-year "412" its frequency
  // context (% of all photos) without crowding the headline.
  const peakDisplay = (
    domain: PeakDomain,
    peak: PeakShape
  ): { value: string; meta: string } => {
    if (peak.kind === "even") {
      return {
        value: t("stats-summary-even-value"),
        meta: t("stats-summary-even-meta", {
          count: formatNumber.default(peak.value),
          n: peak.count,
        }),
      };
    }
    if (peak.kind === "tied") {
      return {
        value: peak.entries.map((e) => formatKey(domain, e.key)).join(", "),
        meta: t("stats-summary-tied-meta", {
          count: formatNumber.default(peak.value),
          pct: formatPct(peak.value),
        }),
      };
    }
    if (peak.entries.length === 0) {
      return { value: "—", meta: "" };
    }
    const entry = peak.entries[0];
    return {
      value: formatKey(domain, entry.key),
      meta: t("stats-summary-leader-meta", {
        count: formatNumber.default(entry.value),
        pct: formatPct(entry.value),
      }),
    };
  };

  const period = extras.period;
  const formatDate = (d?: { year: number; month: number; day: number }) =>
    d ? format.date({ year: d.year, month: d.month, day: d.day }) ?? "" : "";

  const renderPeakTile = (
    labelKey: string,
    domain: PeakDomain,
    peak: PeakShape
  ) => {
    const { value, meta } = peakDisplay(domain, peak);
    return (
      <Tile key={labelKey}>
        <TileLabel>{t(labelKey)}</TileLabel>
        <TileValue>{value}</TileValue>
        {meta && <TileMeta>{meta}</TileMeta>}
      </Tile>
    );
  };

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
            <TileGrid>
              <Tile>
                <TileLabel>{t("stats-summary-first")}</TileLabel>
                <TileValue>{formatDate(period.from)}</TileValue>
              </Tile>
              <Tile>
                <TileLabel>{t("stats-summary-last")}</TileLabel>
                <TileValue>{formatDate(period.to)}</TileValue>
              </Tile>
              <Tile>
                <TileLabel>{t("stats-summary-span")}</TileLabel>
                <TileValue>
                  {t("stats-summary-span-years", {
                    years: formatNumber.oneDecimal(period.spanYears),
                  })}
                </TileValue>
                <TileMeta>
                  {t("stats-summary-span-meta", {
                    months: formatNumber.oneDecimal(period.spanMonths),
                    days: formatNumber.default(period.totalDays),
                  })}
                </TileMeta>
              </Tile>
              <Tile>
                <TileLabel>{t("stats-kpi-title-photos")}</TileLabel>
                <TileValue>
                  {formatNumber.default(period.totalPhotos)}
                </TileValue>
              </Tile>
              <Tile>
                <TileLabel>{t("stats-kpi-title-average")}</TileLabel>
                <TileValue>
                  {t("stats-kpi-average", {
                    count: formatNumber.twoDecimal(period.averagePerDay),
                  })}
                </TileValue>
              </Tile>
            </TileGrid>
          </Section>

          <Section>
            <SectionTitle>{t("stats-summary-section-peaks")}</SectionTitle>
            <TileGrid>
              {renderPeakTile(
                "stats-summary-busiest-year",
                "year",
                extras.peaks.year
              )}
              {renderPeakTile(
                "stats-summary-busiest-month",
                "month",
                extras.peaks.month
              )}
              {renderPeakTile(
                "stats-summary-busiest-weekday",
                "weekday",
                extras.peaks.weekday
              )}
              {renderPeakTile(
                "stats-summary-busiest-hour",
                "hour",
                extras.peaks.hour
              )}
            </TileGrid>
          </Section>

          <Section>
            <SectionTitle>{t("stats-summary-section-variety")}</SectionTitle>
            <VarietyGrid>
              {(
                [
                  ["authors", extras.variety.authors],
                  ["countries", extras.variety.countries],
                  ["camera-makes", extras.variety.cameraMakes],
                  ["cameras", extras.variety.cameras],
                  ["lenses", extras.variety.lenses],
                  ["camera-lenses", extras.variety.cameraLenses],
                  ["focal-lengths", extras.variety.focalLengths],
                  ["apertures", extras.variety.apertures],
                  ["exposure-times", extras.variety.exposureTimes],
                  ["isos", extras.variety.isos],
                  ["years", extras.variety.years],
                  ["year-months", extras.variety.yearMonths],
                ] as [string, number][]
              ).map(([key, count]) => (
                <VarietyItem key={key}>
                  <VarietyLabel>
                    {t(`stats-summary-variety-${key}`)}
                  </VarietyLabel>
                  <VarietyCount>{formatNumber.default(count)}</VarietyCount>
                </VarietyItem>
              ))}
            </VarietyGrid>
          </Section>

          <Section>
            <SectionTitle>
              {t("stats-summary-section-most-used")}
            </SectionTitle>
            <TileGrid>
              {renderPeakTile(
                "stats-summary-top-author",
                "author",
                extras.mostUsed.author
              )}
              {renderPeakTile(
                "stats-summary-top-country",
                "country",
                extras.mostUsed.country
              )}
              {renderPeakTile(
                "stats-summary-top-camera",
                "camera",
                extras.mostUsed.camera
              )}
              {renderPeakTile(
                "stats-summary-top-lens",
                "lens",
                extras.mostUsed.lens
              )}
              {renderPeakTile(
                "stats-summary-top-camera-lens",
                "cameraLens",
                extras.mostUsed.cameraLens
              )}
              {renderPeakTile(
                "stats-summary-top-focal-length",
                "focalLength",
                extras.mostUsed.focalLength
              )}
              {renderPeakTile(
                "stats-summary-top-aperture",
                "aperture",
                extras.mostUsed.aperture
              )}
              {renderPeakTile(
                "stats-summary-top-exposure-time",
                "exposureTime",
                extras.mostUsed.exposureTime
              )}
              {renderPeakTile(
                "stats-summary-top-iso",
                "iso",
                extras.mostUsed.iso
              )}
            </TileGrid>
          </Section>
        </ScrollArea>
      </ModalBox>
    </Backdrop>
  );
};
export default SummaryModal;
