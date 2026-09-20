import React from "react";
import { useTranslation } from "react-i18next";
import { BsArrowClockwise } from "react-icons/bs";
import { Section, SectionTitle } from "../Section";
import type { PhotoData } from "./form";
import { CopyButton, renderGeocodedSummary } from "./parts";
import {
  InlineActionButton,
  MetaLabel,
  MetaTable,
  MetaValue,
  MetaValueRow,
} from "./styles";

interface Props {
  data: PhotoData;
  onRegeocode: () => void;
  isRegeocoding: boolean;
}

// What the operator can see but not edit: ids, the capture timestamp,
// and what the geocoder made of the coordinates, with a way to ask it
// again.
const ReadonlySection = ({
  data,
  onRegeocode,
  isRegeocoding,
}: Props): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <Section>
      <SectionTitle>{t("manage-photo-section-readonly")}</SectionTitle>
      <MetaTable>
        <MetaLabel>{t("manage-photo-field-id")}</MetaLabel>
        <MetaValue>
          {data.id}
          <CopyButton
            value={data.id}
            label={String(t("manage-photo-field-copy-id"))}
          />
        </MetaValue>
        {data.originalFilename && (
          <>
            <MetaLabel>{t("manage-photo-field-original-filename")}</MetaLabel>
            <MetaValue>
              {data.originalFilename}
              <CopyButton
                value={data.originalFilename}
                label={String(t("manage-photo-field-copy-original-filename"))}
              />
            </MetaValue>
          </>
        )}
        {data.taken?.instant?.timestamp && (
          <>
            <MetaLabel>{t("manage-photo-field-taken")}</MetaLabel>
            <MetaValue>{data.taken.instant.timestamp}</MetaValue>
          </>
        )}
        {!!data.taken?.location?.coordinates?.latitude &&
          !!data.taken?.location?.coordinates?.longitude && (
            <>
              <MetaLabel>{t("manage-photo-field-geocoded")}</MetaLabel>
              <MetaValue>
                <MetaValueRow>
                  <span>{renderGeocodedSummary(data.geocoded, t)}</span>
                  <InlineActionButton
                    type="button"
                    onClick={() => onRegeocode()}
                    disabled={isRegeocoding}
                    title={String(t("manage-photo-geocoded-refresh-hint"))}
                  >
                    <BsArrowClockwise aria-hidden />
                    {isRegeocoding
                      ? t("manage-photo-geocoded-refreshing")
                      : t("manage-photo-geocoded-refresh")}
                  </InlineActionButton>
                </MetaValueRow>
              </MetaValue>
            </>
          )}
      </MetaTable>
    </Section>
  );
};

export default ReadonlySection;
