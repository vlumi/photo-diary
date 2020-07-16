import React from "react";
import PropTypes from "prop-types";

const Stats = ({ stats }) => {
  return (
    <>
      <h2>Statistics</h2>
      <div>TODO: implement</div>
      {console.log(stats)}
    </>
  );
};
Stats.propTypes = {
  stats: PropTypes.object,
};

export default Stats;
