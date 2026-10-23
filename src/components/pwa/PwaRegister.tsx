"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            if (process.env.NODE_ENV !== "production") {
              console.log("[PWA] Service Worker registrado:", registration.scope);
            }
          })
          .catch((error) => {
            console.warn("[PWA] Falha ao registrar Service Worker:", error);
          });
      });
    } else if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator
    ) {
      // Também registra em ambiente local para testes se desejado
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("[PWA] Service Worker ativo:", registration.scope);
          })
          .catch((error) => {
            console.warn("[PWA] Falha ao registrar Service Worker:", error);
          });
      });
    }
  }, []);

  return null;
}
