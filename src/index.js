import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./App.css";

const container = document.getElementById("root");

createRoot(container).render(<App />);

/*
  HearMe PWA registration

  The service worker is enabled only in production
  so local development behavior remains unchanged.
*/
if (
  process.env.NODE_ENV === "production" &&
  "serviceWorker" in navigator
) {
  window.addEventListener("load", () => {
    const publicUrl =
      process.env.PUBLIC_URL || "";

    navigator.serviceWorker
      .register(
        `${publicUrl}/service-worker.js`
      )
      .then((registration) => {
        console.log(
          "HearMe service worker registered:",
          registration.scope
        );
      })
      .catch((error) => {
        console.error(
          "HearMe service worker registration failed:",
          error
        );
      });
  });
}