import React from "react";

// Lock body scroll while the caller is mounted. Pads body's padding-right
// by the measured scrollbar width so the layout doesn't reflow ~15px when
// the scrollbar disappears under the lock.
export const useBodyScrollLock = (): void => {
  React.useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, []);
};
