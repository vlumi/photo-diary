import React from "react";
import { useSwipeable, type SwipeableProps } from "react-swipeable";

interface Props extends SwipeableProps {
  children?: React.ReactNode;
  className?: string;
}

const Swipeable = ({
  children,
  className,
  ...props
}: Props): React.ReactElement => {
  const handlers = useSwipeable(props);
  return (
    <div className={className} {...handlers}>
      {children}
    </div>
  );
};
export default Swipeable;
