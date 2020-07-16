import React from "react";

import DumpPhotoNames from "./DumpPhotoNames";

const ViewFull = ({ gallery }) => (
  <>
    <h2>All</h2>
    <DumpPhotoNames gallery={gallery} />
  </>
);

export default ViewFull;
