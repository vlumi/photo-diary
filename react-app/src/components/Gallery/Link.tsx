import React from "react";
import { Link as ReactLink } from "react-router-dom";

import type { Gallery } from "../../models/GalleryModel";
import type { Photo } from "../../models/PhotoModel";

interface Props {
  children: React.ReactNode;
  className?: string;
  gallery?: Gallery;
  year?: number;
  month?: number;
  day?: number;
  photo?: Photo;
  context?: string;
  state?: Record<string, unknown>;
  "aria-label"?: string;
  title?: string;
}

const Link = ({
  children,
  className,
  gallery,
  year,
  month,
  photo,
  day,
  context,
  state,
  "aria-label": ariaLabel,
  title,
}: Props): React.ReactElement => {
  const passthrough = { "aria-label": ariaLabel, title };
  if (gallery && context === "stats") {
    return (
      <ReactLink
        className={className}
        to={gallery.statsPath()}
        state={state}
        {...passthrough}
      >
        {children}
      </ReactLink>
    );
  }
  if (photo && gallery) {
    return (
      <ReactLink
        className={className}
        to={photo.path(gallery)}
        state={state}
        {...passthrough}
      >
        {children}
      </ReactLink>
    );
  }
  if (!gallery) {
    return (
      <ReactLink className={className} to="/g" state={state} {...passthrough}>
        {children}
      </ReactLink>
    );
  }
  const path = gallery.path(year, month, day);
  return (
    <ReactLink className={className} to={path} state={state} {...passthrough}>
      {children}
    </ReactLink>
  );
};

export default Link;
