import React from "react";
import { Navigate } from "react-router-dom";

import type { Gallery } from "../../models/GalleryModel";

interface Props {
  // Accepted (and ignored) so callers can wrap a Title/Filters block inside <Full> — the JSX
  // is dead because Full always returns <Navigate>, but the call-site syntax matches the
  // other layout components.
  children?: React.ReactNode;
  gallery: Gallery;
}

const Full = ({ gallery }: Props): React.ReactElement => {
  const path = gallery.lastPath();
  return <Navigate to={path} replace />;
};

export default Full;
