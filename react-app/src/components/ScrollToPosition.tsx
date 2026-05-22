import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { useScrollStore } from "../stores";

interface Props {
  children?: React.ReactNode;
}

const ScrollToPosition = ({ children }: Props): React.ReactElement => {
  const location = useLocation();
  const get = useScrollStore((s) => s.get);
  useEffect(() => {
    const y = get(location.pathname);
    setTimeout(() => window.scrollTo(0, y), 0);
  }, [location, get]);
  return <>{children}</>;
};
export default ScrollToPosition;
