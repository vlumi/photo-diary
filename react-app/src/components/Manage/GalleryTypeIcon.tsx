import React from "react";
import styled from "@emotion/styled";
import { useTranslation } from "react-i18next";
import { BsLayersFill, BsFunnelFill } from "react-icons/bs";

// Tiny visual discriminator for the three gallery kinds. Used in
// the /m/galleries list row and the GalleryEdit header so operators
// can tell real vs hybrid vs saved-filter at a glance without
// parsing labels.
//
// Real galleries get no icon — they're the implicit baseline; the
// other two are the "explain yourself" cases.

const Slot = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.1em;
  min-width: 1.1em;
  height: 1.1em;
  color: var(--inactive-color);
`;

interface Props {
  type: string | undefined;
  className?: string;
}
const GalleryTypeIcon = ({ type, className }: Props): React.ReactElement => {
  const { t } = useTranslation();
  if (type === "hybrid") {
    return (
      <Slot
        className={className}
        title={String(t("manage-gallery-type-hybrid"))}
        aria-label={String(t("manage-gallery-type-hybrid"))}
      >
        <BsLayersFill />
      </Slot>
    );
  }
  if (type === "saved_filter") {
    return (
      <Slot
        className={className}
        title={String(t("manage-gallery-type-saved-filter"))}
        aria-label={String(t("manage-gallery-type-saved-filter"))}
      >
        <BsFunnelFill />
      </Slot>
    );
  }
  // Real (default): empty placeholder so adjacent rows keep their
  // text alignment without a per-row conditional in the parent.
  return <Slot className={className} aria-hidden />;
};
export default GalleryTypeIcon;
