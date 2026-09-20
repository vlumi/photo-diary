import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BsEyeSlashFill, BsPencilSquare } from "react-icons/bs";
import { Section, SectionTitle } from "../Section";
import config from "../../../lib/config";
import type { PhotoData } from "./form";
import {
  EmptyValue,
  GalleryChip,
  GalleryChipPrimary,
  GalleryChipRow,
  GalleryChipSecondary,
  OverviewMeta,
  OverviewMetaLabel,
  OverviewMetaRow,
  OverviewMetaValue,
  RenditionChip,
  RenditionChips,
  RenditionHero,
  RenditionHeroImg,
  RenditionRowLayout,
} from "./styles";

interface Props {
  data: PhotoData;
  // Gallery titles for the jump-link chips.
  galleryById: Map<string, { id: string; title?: string }>;
  isPrivate: boolean;
  onPrivateChange: (isPrivate: boolean) => void;
}

// The top of the drawer: the photo itself, its renditions, the
// galleries it is in, and the visibility switch.
const OverviewSection = ({
  data,
  galleryById,
  isPrivate,
  onPrivateChange,
}: Props): React.ReactElement => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <Section>
      <SectionTitle>{t("manage-photo-section-overview")}</SectionTitle>
      {(() => {
        const renditions = (data?.renditions ?? []) as number[];
        const sorted = [...renditions].sort((a, b) => a - b);
        // Thumbnail URL doubles as the hero — it always exists
        // (one-off per photo, not part of the rendition ladder),
        // so the panel works even on instances that haven't run
        // bin/photo-rerender.ts to populate the display ladder
        // yet. Clicking opens the largest registered rendition.
        const thumbUrl = `${config.PHOTO_ROOT_URL}thumbnail/${data.id}`;
        const largest =
          sorted.length > 0 ? sorted[sorted.length - 1] : null;
        const heroHref =
          largest !== null
            ? `${config.PHOTO_ROOT_URL}display/${largest}/${data.id}`
            : thumbUrl;
        return (
          <RenditionRowLayout>
            <RenditionHero
              href={heroHref}
              target="_blank"
              rel="noreferrer"
              title={largest !== null ? `${largest} px` : undefined}
            >
              <RenditionHeroImg src={thumbUrl} alt={data.id} />
            </RenditionHero>
            <OverviewMeta>
              <OverviewMetaRow>
                <OverviewMetaLabel>
                  {t("manage-photo-field-renditions")}
                </OverviewMetaLabel>
                <OverviewMetaValue>
                  {sorted.length === 0 ? (
                    <EmptyValue>
                      {t("manage-photo-renditions-empty")}
                    </EmptyValue>
                  ) : (
                    <RenditionChips>
                      {sorted.map((dim) => {
                        const url = `${config.PHOTO_ROOT_URL}display/${dim}/${data.id}`;
                        return (
                          <RenditionChip
                            key={dim}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {dim} px
                          </RenditionChip>
                        );
                      })}
                    </RenditionChips>
                  )}
                </OverviewMetaValue>
              </OverviewMetaRow>
              <OverviewMetaRow>
                <OverviewMetaLabel>
                  {t("manage-photo-field-galleries")}
                </OverviewMetaLabel>
                <OverviewMetaValue>
                  {data.galleries && data.galleries.length > 0 ? (
                    <GalleryChipRow>
                      {data.galleries.map((gid) => {
                        const meta = galleryById.get(gid);
                        const label = meta?.title || gid;
                        const ts = data.taken?.instant?.timestamp;
                        const ymd =
                          ts && /^\d{4}-\d{2}-\d{2}/.test(ts)
                            ? [
                                Number(ts.slice(0, 4)),
                                Number(ts.slice(5, 7)),
                                Number(ts.slice(8, 10)),
                              ]
                            : null;
                        const viewHref = ymd
                          ? `/g/${gid}/${ymd[0]}/${ymd[1]}/${ymd[2]}/${data.id}`
                          : `/g/${gid}`;
                        const editHref = `/m/g/${gid}`;
                        return (
                          <GalleryChip key={gid}>
                            <GalleryChipPrimary
                              href={viewHref}
                              onClick={(e) => {
                                e.preventDefault();
                                navigate(viewHref);
                              }}
                              title={String(
                                t("manage-photo-galleries-jump-view", {
                                  label,
                                })
                              )}
                            >
                              {label}
                            </GalleryChipPrimary>
                            <GalleryChipSecondary
                              href={editHref}
                              onClick={(e) => {
                                e.preventDefault();
                                navigate(editHref);
                              }}
                              title={String(
                                t("manage-photo-galleries-jump-edit", {
                                  label,
                                })
                              )}
                              aria-label={String(
                                t("manage-photo-galleries-jump-edit", {
                                  label,
                                })
                              )}
                            >
                              <BsPencilSquare aria-hidden />
                            </GalleryChipSecondary>
                          </GalleryChip>
                        );
                      })}
                    </GalleryChipRow>
                  ) : (
                    <EmptyValue>
                      {t("manage-photo-galleries-orphan")}
                    </EmptyValue>
                  )}
                </OverviewMetaValue>
              </OverviewMetaRow>
              <OverviewMetaRow>
                <OverviewMetaLabel>
                  {t("manage-photo-field-privacy")}
                </OverviewMetaLabel>
                <OverviewMetaValue>
                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isPrivate}
                      onChange={(e) =>
                        onPrivateChange(e.target.checked)
                      }
                    />
                    <BsEyeSlashFill aria-hidden />
                    {t("manage-photo-privacy-toggle")}
                  </label>
                </OverviewMetaValue>
              </OverviewMetaRow>
            </OverviewMeta>
          </RenditionRowLayout>
        );
      })()}
    </Section>
  );
};

export default OverviewSection;
