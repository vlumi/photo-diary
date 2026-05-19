import React from "react";
import { useSwipeable, type SwipeableProps } from "react-swipeable";

interface Props extends SwipeableProps {
  children?: React.ReactNode;
}

const Swipeable = ({ children, ...props }: Props): React.ReactElement => {
  const handlers = useSwipeable(props);
  return <div {...handlers}>{children}</div>;
};
export default Swipeable;
