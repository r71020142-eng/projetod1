"use client";

import React from "react";
import { ExercicioForm } from "@/components/admin/ExercicioForm";

export default function NovoExercicioPage() {
  return (
    <div className="animate-in fade-in duration-200">
      <ExercicioForm isEditing={false} />
    </div>
  );
}
