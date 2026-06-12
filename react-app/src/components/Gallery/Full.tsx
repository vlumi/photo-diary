import React from "react";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import config from "../../lib/config";
import { useGalleryCalendar } from "../../lib/useFilteredCalendar";
import galleryPhotosService from "../../services/gallery-photos";

import type { Gallery } from "../../models/GalleryModel";

interface Props {
  // Accepted (and ignored) so callers can wrap a Title/Filters block inside <Full> — the JSX
  // is dead because Full always returns <Navigate>, but the call-site syntax matches the
  // other layout components.
  children?: React.ReactNode;
  gallery: Gallery;
}

// Lands on the gallery's most-recent view (year / month / day / photo
// per `initialView`). Calendar shape comes from /counts via the
// gallery-wide unfiltered hook so we don't need the gallery's full
// photo array in memory. For `initialView: "photo"` we additionally
// /query the last day to pick the actual last photo id — the picker
// can't afford this fetch fan-out across N gallery cards, but the
// bare gallery landing is one gallery so the cost is one round trip.
const Full = ({ gallery }: Props): React.ReactElement => {
  const cal = useGalleryCalendar(gallery.id());
  const effectiveInitialView =
    gallery.initialView() || config.INITIAL_GALLERY_VIEW;
  const wantsPhoto = effectiveInitialView === "photo";
  const [lastYear, lastMonth, lastDay] = cal.lastDay();
  const lastDayKnown =
    lastYear !== undefined &&
    lastMonth !== undefined &&
    lastDay !== undefined;
  const lastDayPhotosQuery = useQuery({
    queryKey: [
      "gallery-photos-query",
      gallery.id(),
      {
        year: lastYear,
        month: lastMonth,
        day: lastDay,
        filter: {},
        dateRange: undefined,
        lang: undefined,
      },
    ],
    queryFn: () =>
      galleryPhotosService.query(gallery.id(), {
        year: lastYear,
        month: lastMonth,
        day: lastDay,
      }),
    enabled: wantsPhoto && cal.ready && lastDayKnown,
  });
  if (!cal.ready) {
    return <></>;
  }
  if (wantsPhoto && lastDayKnown) {
    if (!lastDayPhotosQuery.data) {
      return <></>;
    }
    const photos = lastDayPhotosQuery.data as Array<{ id?: string }>;
    const lastPhoto = photos[photos.length - 1];
    const lastPhotoId =
      lastPhoto && typeof lastPhoto.id === "string"
        ? lastPhoto.id
        : undefined;
    return (
      <Navigate
        to={gallery.lastPath({
          includesPhotos: cal.includesPhotos,
          lastDay: cal.lastDay,
          lastPhotoId,
        })}
        replace
      />
    );
  }
  const path = gallery.lastPath(cal);
  return <Navigate to={path} replace />;
};

export default Full;
