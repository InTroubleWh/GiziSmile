"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("Service Worker GiziSmile terdaftar:", reg.scope);
          })
          .catch((err) => {
            console.warn("Gagal mendaftarkan Service Worker:", err);
          });
      });
    }
  }, []);

  return null;
}
