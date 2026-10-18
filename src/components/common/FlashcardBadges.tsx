import React from "react";
import {
  DestinoTipo,
  EstadoCartaoAprendizagem,
  StatusBaralho,
  StatusCartao,
} from "@/types";

export function BadgeStatusBaralho({ status }: { status: StatusBaralho }) {
  switch (status) {
    case "publicado":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
          Publicado
        </span>
      );
    case "rascunho":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5" />
          Rascunho
        </span>
      );
    case "arquivado":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-1.5" />
          Arquivado
        </span>
      );
  }
}

export function BadgeStatusCartao({ status }: { status: StatusCartao }) {
  switch (status) {
    case "ativo":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700">
          Ativo
        </span>
      );
    case "suspenso":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-700">
          Suspenso
        </span>
      );
  }
}

export function BadgeEstadoAprendizagem({ estado }: { estado: EstadoCartaoAprendizagem }) {
  switch (estado) {
    case "novo":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          Novo
        </span>
      );
    case "aprendendo":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          Aprendendo
        </span>
      );
    case "revisao":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          Revisão
        </span>
      );
    case "suspenso":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
          Suspenso
        </span>
      );
  }
}

export function BadgeDestinoTipo({
  destinoTipo,
  destinoNome,
}: {
  destinoTipo: DestinoTipo;
  destinoNome?: string;
}) {
  switch (destinoTipo) {
    case "geral":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700">
          Geral (Todos os alunos)
        </span>
      );
    case "turma":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-purple-50 text-purple-700">
          Turma: {destinoNome || "Específica"}
        </span>
      );
    case "aluno":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700">
          Individual: {destinoNome || "Aluno"}
        </span>
      );
  }
}
