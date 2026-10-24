"use client";

import React, { useState } from "react";
import Image from "next/image";

interface AutorAvatarProps {
  nome: string;
  avatarUrl?: string | null;
  papel?: "admin" | "professor" | "aluno" | "administrador";
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  rounded?: "full" | "squircle";
}

const MOCK_AVATARS = [
  "/teacher-avatar-hd.png",
  "/teacher-hd.jpg",
  "/professor-hero.png",
  "/mariana-avatar.png",
  "/carla-avatar.png",
  "/ana-clara.png",
  "/pedro-henrique.png",
  "/mariana-oliveira.png",
  "/lucas-almeida.png",
  "/rafael-costa.png",
  "/beatriz-lima.png",
  "/gabriel-martins.png",
  "/isabela-ferreira.png",
  "/miguel-santos.png",
];

function getInitials(nome: string): string {
  if (!nome || typeof nome !== "string") return "MT";
  const clean = nome.trim().replace(/\s+/g, " ");
  const parts = clean.split(" ");
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AutorAvatar({
  nome,
  avatarUrl,
  papel = "aluno",
  size = "md",
  className = "",
  rounded = "squircle",
}: AutorAvatarProps) {
  const [imageError, setImageError] = useState(false);

  // Considera imagem válida se existir, não tiver dado erro e não for avatar genérico demo
  const isDemoMock = avatarUrl ? MOCK_AVATARS.some((mock) => avatarUrl.includes(mock)) : true;
  const hasValidCustomImage = Boolean(avatarUrl && !imageError && !isDemoMock);

  const sizeClasses = {
    xs: "w-6 h-6 text-[10px]",
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  }[size];

  const roundedClasses = rounded === "full" ? "rounded-full" : "rounded-2xl";

  const isRoleAdmin = papel === "admin" || papel === "administrador";
  const isRoleProfessor = papel === "professor";

  let roleColorClass = "bg-indigo-900 text-indigo-100 border-indigo-700/50";
  if (isRoleAdmin) {
    roleColorClass = "bg-[#1F1B38] text-[#FCD34D] border-amber-400/30 shadow-xs";
  } else if (isRoleProfessor) {
    roleColorClass = "bg-purple-900 text-purple-200 border-purple-700/40";
  }

  const initials = getInitials(nome);

  if (hasValidCustomImage && avatarUrl) {
    return (
      <div
        className={`relative shrink-0 overflow-hidden border border-slate-200 ${sizeClasses} ${roundedClasses} ${className}`}
      >
        <Image
          src={avatarUrl}
          alt={nome || "Avatar"}
          fill
          sizes="48px"
          className="object-cover"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`shrink-0 flex items-center justify-center font-bold tracking-wider select-none border ${sizeClasses} ${roundedClasses} ${roleColorClass} ${className}`}
      title={`${nome} (${papel})`}
      aria-label={`Avatar de ${nome}`}
    >
      <span>{initials}</span>
    </div>
  );
}
