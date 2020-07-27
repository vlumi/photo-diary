import React from "react";
import PropTypes from "prop-types";

import GalleryStatsTitle from "./GalleryStatsTitle";

const GalleryStats = ({ gallery }) => {
  const [stats, setStats] = React.useState(undefined);

  React.useEffect(() => {
    // TODO: generate stats for gallery
    setStats({});
  }, [gallery]);

  if (!stats) {
    return (
      <>
        <div>Loading...</div>
      </>
    );
  }

  return (
    <>
      <GalleryStatsTitle gallery={gallery} />
      Here be stats for {gallery.id()}!!!
    </>
  );
};

GalleryStats.propTypes = {
  gallery: PropTypes.object.isRequired,
  lang: PropTypes.string.isRequired,
  countryData: PropTypes.object.isRequired,
};
export default GalleryStats;
