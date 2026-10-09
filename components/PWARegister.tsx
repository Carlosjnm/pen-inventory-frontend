"use client";

import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    if (
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      navigator.serviceWorker
        .register("/sw.js", {
          scope: "/",
        })
        .catch((error) => {
          console.error(
            "Não foi possível registar a PWA PEN:",
            error
          );
        });
    }
  }, []);

  return null;
}
