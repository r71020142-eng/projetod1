"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ExercicioInterativo } from "@/types";
import { exercicioRepository } from "@/data/exercicioRepository";
import { ExercicioForm } from "@/components/admin/ExercicioForm";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function EditarExercicioPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [exercicio, setExercicio] = useState<ExercicioInterativo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function carregar() {
      if (!id) return;
      try {
        setLoading(true);
        const data = await exercicioRepository.obterPorId(id);
        if (!data) {
          setError("Exercício não encontrado.");
        } else {
          setExercicio(data);
        }
      } catch (err: unknown) {
        setError((err as Error)?.message || "Erro ao carregar dados do exercício.");
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, [id]);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
        Carregando exercício...
      </div>
    );
  }

  if (error || !exercicio) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-sm font-bold text-rose-600">{error || "Exercício não encontrado."}</p>
        <button
          onClick={() => router.push("/admin/exercicios")}
          className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 inline-flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar aos Exercícios
        </button>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-200">
      <ExercicioForm initialData={exercicio} isEditing={true} />
    </div>
  );
}
