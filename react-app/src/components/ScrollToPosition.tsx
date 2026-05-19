import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";

interface ScrollState {
  get: (path: string) => number;
  set: (path: string, position: number) => void;
}

interface Props {
  children?: React.ReactNode;
  scrollState: ScrollState;
}

const ScrollToPosition = ({
  children,
  scrollState,
}: Props): React.ReactElement => {
  const location = useLocation();
  useEffect(() => {
    const y = scrollState.get(location.pathname);
    setTimeout(() => window.scrollTo(0, y), 0);
  }, [location, scrollState]);
  return <>{children}</>;
};
export default ScrollToPosition;
