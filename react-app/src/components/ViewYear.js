import React from "react";

import DumpPhotoNames from "./DumpPhotoNames";

const ViewYear = ({ gallery, year }) => (
  <>
    <h2>{year}</h2>
    <DumpPhotoNames gallery={gallery} year={year} />
  </>
);

export default ViewYear;
