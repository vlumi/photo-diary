import React from "react";

import DumpPhotoNames from "./DumpPhotoNames";

const ViewMonth = ({ gallery, year, month }) => (
  <>
    <h2>
      {year}-{month}
    </h2>
    <DumpPhotoNames gallery={gallery} year={year} month={month} />
  </>
);

export default ViewMonth;
