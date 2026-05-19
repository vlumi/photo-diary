import React from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import "./lib/i18n";
import App from "./App";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Missing #root element");
}
createRoot(rootElement).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);
