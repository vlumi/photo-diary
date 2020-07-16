import React from "react";

import DumpPhotoNames from "./DumpPhotoNames";

const ViewDay = ({ gallery, year, month, day }) => (
  <>
    <h2>
      {year}-{month}-{day}
    </h2>
    <DumpPhotoNames gallery={gallery} year={year} month={month} day={day} />
  </>
);

export default ViewDay;
