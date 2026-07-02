import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import "./lib/i18n";
import App from "./App";
import { queryClient } from "./lib/query-client";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Missing #root element");
}
createRoot(rootElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
