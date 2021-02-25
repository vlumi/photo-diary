import React from "react";
import PropTypes from "prop-types";
import { useSwipeable } from "react-swipeable";

const Swipeable = ({ children, ...props }) => {
  const handlers = useSwipeable(props);
  return <div {...handlers}>{children}</div>;
};
Swipeable.propTypes = {
  children: PropTypes.object,
  props: PropTypes.func,
};
export default Swipeable;
