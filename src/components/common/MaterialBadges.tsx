import React from "react";
import {
  FileText,
  File,
  Video,
  Headphones,
  ExternalLink,
  BookOpen,
  CheckCircle2,
  Clock,
  Archive,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  Globe,
  Users,
  User,
} from "lucide-react";
import {
  TipoMaterial,
  StatusMaterial,
  TipoAtividade,
  StatusAtividade,
  StatusEntrega,
  DestinoTipo,
} from "@/types";
import { cn } from "@/lib/utils";

export function TipoMaterialBadge({
  tipo,
  className,
}: {
  tipo: TipoMaterial;
  className?: string;
}) {
  switch (tipo) {
    case "texto":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200",
            className
          )}
        >
          <FileText className="h-3 w-3 text-slate-500" />
          <span>Texto</span>
        </span>
      );
    case "pdf":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200",
            className
          )}
        >
          <File className="h-3 w-3 text-rose-600" />
          <span>PDF</span>
        </span>
      );
    case "video":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 border border-purple-200",
            className
          )}
        >
          <Video className="h-3 w-3 text-purple-600" />
          <span>Vídeo</span>
        </span>
      );
    case "audio":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200",
            className
          )}
        >
          <Headphones className="h-3 w-3 text-amber-700" />
          <span>Áudio</span>
        </span>
      );
    case "link":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700 border border-sky-200",
            className
          )}
        >
          <ExternalLink className="h-3 w-3 text-sky-600" />
          <span>Link</span>
        </span>
      );
    case "documento":
    default:
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200",
            className
          )}
        >
          <BookOpen className="h-3 w-3 text-indigo-600" />
          <span>Documento</span>
        </span>
      );
  }
}

export function StatusMaterialBadge({
  status,
  className,
}: {
  status: StatusMaterial;
  className?: string;
}) {
  switch (status) {
    case "publicado":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200",
            className
          )}
        >
          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
          <span>Publicado</span>
        </span>
      );
    case "agendado":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-200",
            className
          )}
        >
          <Clock className="h-3 w-3 text-indigo-600" />
          <span>Agendado</span>
        </span>
      );
    case "rascunho":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 border border-slate-200",
            className
          )}
        >
          <HelpCircle className="h-3 w-3 text-slate-400" />
          <span>Rascunho</span>
        </span>
      );
    case "arquivado":
    default:
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600 border border-zinc-200",
            className
          )}
        >
          <Archive className="h-3 w-3 text-zinc-500" />
          <span>Arquivado</span>
        </span>
      );
  }
}

export function TipoAtividadeBadge({
  tipo,
  className,
}: {
  tipo: TipoAtividade;
  className?: string;
}) {
  switch (tipo) {
    case "texto":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 border border-purple-200",
            className
          )}
        >
          <FileText className="h-3 w-3 text-purple-600" />
          <span>Resposta em texto</span>
        </span>
      );
    case "link":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700 border border-sky-200",
            className
          )}
        >
          <ExternalLink className="h-3 w-3 text-sky-600" />
          <span>Envio de Link</span>
        </span>
      );
    case "multipla_escolha":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 border border-slate-200",
            className
          )}
        >
          <span>Múltipla escolha (em breve)</span>
        </span>
      );
    case "audio":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 border border-slate-200",
            className
          )}
        >
          <span>Áudio gravado (em breve)</span>
        </span>
      );
    case "video":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 border border-slate-200",
            className
          )}
        >
          <span>Vídeo (em breve)</span>
        </span>
      );
    case "arquivo":
    default:
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 border border-slate-200",
            className
          )}
        >
          <span>Arquivo (em breve)</span>
        </span>
      );
  }
}

export function StatusAtividadeBadge({
  status,
  className,
}: {
  status: StatusAtividade;
  className?: string;
}) {
  switch (status) {
    case "publicada":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200",
            className
          )}
        >
          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
          <span>Publicada</span>
        </span>
      );
    case "agendada":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-200",
            className
          )}
        >
          <Clock className="h-3 w-3 text-indigo-600" />
          <span>Agendada</span>
        </span>
      );
    case "encerrada":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800 border border-amber-200",
            className
          )}
        >
          <AlertCircle className="h-3 w-3 text-amber-700" />
          <span>Encerrada</span>
        </span>
      );
    case "rascunho":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 border border-slate-200",
            className
          )}
        >
          <span>Rascunho</span>
        </span>
      );
    case "arquivada":
    default:
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600 border border-zinc-200",
            className
          )}
        >
          <Archive className="h-3 w-3 text-zinc-500" />
          <span>Arquivada</span>
        </span>
      );
  }
}

export function StatusEntregaBadge({
  status,
  className,
}: {
  status: StatusEntrega;
  className?: string;
}) {
  switch (status) {
    case "corrigida":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200",
            className
          )}
        >
          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
          <span>Corrigida</span>
        </span>
      );
    case "entregue":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 border border-blue-200",
            className
          )}
        >
          <Clock className="h-3 w-3 text-blue-600" />
          <span>Entregue</span>
        </span>
      );
    case "atrasada":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700 border border-rose-200",
            className
          )}
        >
          <AlertCircle className="h-3 w-3 text-rose-600" />
          <span>Atrasada</span>
        </span>
      );
    case "em_andamento":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200",
            className
          )}
        >
          <Clock className="h-3 w-3 text-amber-600" />
          <span>Rascunho salvo</span>
        </span>
      );
    case "reenviar":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-xs font-bold text-purple-700 border border-purple-200",
            className
          )}
        >
          <RotateCcw className="h-3 w-3 text-purple-600" />
          <span>Solicitado reenvio</span>
        </span>
      );
    case "nao_iniciada":
    default:
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 border border-slate-200",
            className
          )}
        >
          <span>Pendente</span>
        </span>
      );
  }
}

export function DestinoBadge({
  destinoTipo,
  destinoNome,
  className,
}: {
  destinoTipo: DestinoTipo;
  destinoNome?: string;
  className?: string;
}) {
  switch (destinoTipo) {
    case "geral":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 border border-slate-200",
            className
          )}
        >
          <Globe className="h-3 w-3 text-slate-500" />
          <span>Geral</span>
        </span>
      );
    case "turma":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-800 border border-purple-200",
            className
          )}
        >
          <Users className="h-3 w-3 text-purple-600" />
          <span className="truncate max-w-[130px]">{destinoNome || "Turma"}</span>
        </span>
      );
    case "aluno":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-800 border border-blue-200",
            className
          )}
        >
          <User className="h-3 w-3 text-blue-600" />
          <span className="truncate max-w-[130px]">{destinoNome || "Aluno"}</span>
        </span>
      );
  }
}
