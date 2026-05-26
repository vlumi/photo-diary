import React from "react";

// Skip when focus is on a form element so single-letter shortcuts (m,
// g, s, i, …) don't swallow the gallery <select>'s native search-by-
// letter or hijack future text inputs.
const isFormFocus = (): boolean => {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "SELECT" ||
    tag === "TEXTAREA" ||
    el.isContentEditable
  );
};

export default (
  targetKey: string,
  handler: (event: KeyboardEvent) => void
): void => {
  const downHandler = (event: KeyboardEvent) => {
    if (event.key === targetKey) {
      if (isFormFocus()) return;
      event.preventDefault();
      if (typeof handler === "function") {
        handler(event);
      }
    }
  };

  React.useEffect(() => {
    window.addEventListener("keydown", downHandler);

    return () => {
      window.removeEventListener("keydown", downHandler);
    };
  });
};
