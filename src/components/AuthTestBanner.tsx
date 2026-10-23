"use client";

import React, { useState, useEffect } from "react";
import { ShieldAlert, X } from "lucide-react";

export function AuthTestBanner() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        if (sessionStorage.getItem("mtd_auth_banner_dismissed") === "true") {
          setVisible(false);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  if (!visible) return null;

  const handleDismiss = () => {
    setVisible(false);
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        sessionStorage.setItem("mtd_auth_banner_dismissed", "true");
      }
    } catch {
      // ignore
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full bg-[#161426] border-b border-[#D4AF37]/30 text-[#D4AF37] px-3 sm:px-4 py-1 text-[11px] sm:text-xs flex items-center justify-between z-[40] font-medium tracking-wide shadow-sm"
    >
      <div className="flex-1 flex items-center justify-center gap-1.5 text-center px-1">
        <ShieldAlert className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" aria-hidden="true" />
        <span className="line-clamp-1">Ambiente de teste com dados demonstrativos.</span>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dispensar aviso de teste"
        className="text-[#D4AF37]/70 hover:text-[#D4AF37] p-0.5 rounded-md hover:bg-white/10 transition-colors shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
