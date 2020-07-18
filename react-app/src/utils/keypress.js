import React from "react";

export default (targetKey, handler) => {

  const downHandler = ({ key }) => {
    if (key === targetKey) {
      if (typeof handler === "function") {
        handler();
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
