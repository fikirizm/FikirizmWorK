import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/index.css";
import App from "@/App";

// Suppress benign "ResizeObserver loop" warnings (thrown by Recharts on resize)
// so react-scripts' dev error overlay doesn't block interactions.
const roError = /ResizeObserver loop/;
window.addEventListener("error", (e) => {
  if (e.message && roError.test(e.message)) {
    e.stopImmediatePropagation();
    e.preventDefault();
  }
});
const _consoleError = console.error;
console.error = (...args) => {
  if (typeof args[0] === "string" && roError.test(args[0])) return;
  _consoleError(...args);
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
