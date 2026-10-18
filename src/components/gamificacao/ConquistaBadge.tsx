import React from "react";
import {
  Compass,
  Clock,
  Flame,
  Layers,
  CheckCircle2,
  Award,
  MessageSquare,
  ShieldCheck,
  Trophy,
  Star,
  Target,
} from "lucide-react";

interface ConquistaBadgeProps {
  icone?: string;
  desbloqueada?: boolean;
  tamanho?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function ConquistaBadge({
  icone = "Award",
  desbloqueada = true,
  tamanho = "md",
  className = "",
}: ConquistaBadgeProps) {
  const iconesMap: Record<string, React.ElementType> = {
    Compass,
    Clock,
    Flame,
    Layers,
    CheckCircle: CheckCircle2,
    CheckCircle2,
    Award,
    MessageSquare,
    ShieldCheck,
    Trophy,
    Sparkles: Star,
    Star,
    Target,
  };

  const IconComponent = iconesMap[icone] || Award;

  const tamanhosMap = {
    sm: "w-8 h-8 p-1.5",
    md: "w-12 h-12 p-2.5",
    lg: "w-16 h-16 p-3.5",
    xl: "w-24 h-24 p-5",
  };

  const iconSizeMap = {
    sm: "w-5 h-5",
    md: "w-7 h-7",
    lg: "w-9 h-9",
    xl: "w-14 h-14",
  };

  if (!desbloqueada) {
    return (
      <div
        className={`${tamanhosMap[tamanho]} rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center shrink-0 grayscale opacity-60 ${className}`}
        title="Conquista ainda bloqueada"
      >
        <IconComponent className={iconSizeMap[tamanho]} />
      </div>
    );
  }

  return (
    <div
      className={`${tamanhosMap[tamanho]} rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/20 flex items-center justify-center shrink-0 ring-2 ring-amber-300/60 ${className}`}
    >
      <IconComponent className={iconSizeMap[tamanho]} />
    </div>
  );
}
