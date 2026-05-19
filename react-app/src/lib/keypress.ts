import React from "react";

export default (
  targetKey: string,
  handler: (event: KeyboardEvent) => void
): void => {
  const downHandler = (event: KeyboardEvent) => {
    if (event.key === targetKey) {
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
