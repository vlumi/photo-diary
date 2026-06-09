import React from "react";
import { Navigate } from "react-router-dom";

import { useGalleryCalendar } from "../../lib/useFilteredCalendar";

import type { Gallery } from "../../models/GalleryModel";

interface Props {
  // Accepted (and ignored) so callers can wrap a Title/Filters block inside <Full> — the JSX
  // is dead because Full always returns <Navigate>, but the call-site syntax matches the
  // other layout components.
  children?: React.ReactNode;
  gallery: Gallery;
}

// Lands on the gallery's most-recent view (year / month / day per
// `initialView`). Calendar shape comes from /counts via the
// gallery-wide unfiltered hook so we don't need the gallery's full
// photo array in memory.
const Full = ({ gallery }: Props): React.ReactElement => {
  const cal = useGalleryCalendar(gallery.id());
  if (!cal.ready) {
    return <></>;
  }
  const path = gallery.lastPath(cal);
  return <Navigate to={path} replace />;
};

export default Full;
