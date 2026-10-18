import React from "react";
import {
  TipoEspacoComunidade,
  StatusEspacoComunidade,
  TipoPublicacaoComunidade,
  StatusPublicacaoComunidade,
} from "@/types";
import {
  Globe,
  Users,
  GraduationCap,
  Briefcase,
  Plane,
  Pin,
  AlertTriangle,
  EyeOff,
  CheckCircle,
} from "lucide-react";

export function TipoEspacoBadge({ tipo }: { tipo: TipoEspacoComunidade }) {
  switch (tipo) {
    case "geral":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <Globe className="w-3 h-3" />
          Geral
        </span>
      );
    case "turma":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Users className="w-3 h-3" />
          Turma
        </span>
      );
    case "nivel":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          <GraduationCap className="w-3 h-3" />
          Nível
        </span>
      );
    case "objetivo":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Briefcase className="w-3 h-3" />
          Objetivo
        </span>
      );
    case "oportunidades":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <Plane className="w-3 h-3" />
          Intercâmbio
        </span>
      );
    default:
      return null;
  }
}

export function StatusEspacoBadge({ status }: { status: StatusEspacoComunidade }) {
  switch (status) {
    case "ativo":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          Ativo
        </span>
      );
    case "rascunho":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
          Rascunho
        </span>
      );
    case "arquivado":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-200 text-slate-600 border border-slate-300">
          Arquivado
        </span>
      );
  }
}

export function TipoPublicacaoBadge({ tipo }: { tipo: TipoPublicacaoComunidade }) {
  const configs: Record<TipoPublicacaoComunidade, { label: string; bg: string; text: string }> = {
    discussao: { label: "Discussão", bg: "bg-indigo-50 border-indigo-200", text: "text-indigo-700" },
    comunicado: { label: "Comunicado Oficial", bg: "bg-blue-50 border-blue-200", text: "text-blue-700" },
    conteudo: { label: "Conteúdo", bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700" },
    oportunidade: { label: "Oportunidade", bg: "bg-purple-50 border-purple-200", text: "text-purple-700" },
    duvida: { label: "Dúvida", bg: "bg-amber-50 border-amber-200", text: "text-amber-700" },
    texto: { label: "Publicação", bg: "bg-slate-100 border-slate-200", text: "text-slate-700" },
    artigo: { label: "Artigo", bg: "bg-teal-50 border-teal-200", text: "text-teal-700" },
    aviso: { label: "Aviso Oficial", bg: "bg-blue-50 border-blue-200", text: "text-blue-700" },
    conquista: { label: "Conquista", bg: "bg-purple-50 border-purple-200", text: "text-purple-700" },
    dica: { label: "Dica de Estudo", bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700" },
  };

  const c = configs[tipo] || configs.texto;
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

export function StatusPublicacaoBadge({
  status,
  fixada,
}: {
  status: StatusPublicacaoComunidade;
  fixada?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {fixada && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
          <Pin className="w-2.5 h-2.5" />
          Fixada
        </span>
      )}
      {status === "oculta" && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-300">
          <EyeOff className="w-2.5 h-2.5" />
          Oculta
        </span>
      )}
      {status === "denunciada" && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
          <AlertTriangle className="w-2.5 h-2.5" />
          Denunciada
        </span>
      )}
      {status === "removida" && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-100 text-rose-800 border border-rose-300">
          Removida
        </span>
      )}
      {status === "publicada" && !fixada && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle className="w-2.5 h-2.5" />
          Publicada
        </span>
      )}
    </div>
  );
}
