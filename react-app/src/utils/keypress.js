import React from "react";

export default (targetKey, handler) => {
  const downHandler = (event) => {
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
