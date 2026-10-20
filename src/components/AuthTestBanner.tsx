import React from "react";
import { ShieldAlert } from "lucide-react";

export function AuthTestBanner() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full bg-[#161426] border-b border-[#D4AF37]/30 text-[#D4AF37] px-4 py-1.5 text-xs flex items-center justify-center gap-2 z-[9999] font-medium tracking-wide shadow-sm"
    >
      <ShieldAlert className="w-3.5 h-3.5 text-[#D4AF37]" aria-hidden="true" />
      <span>Ambiente de autenticação em teste com dados demonstrativos.</span>
    </div>
  );
}
