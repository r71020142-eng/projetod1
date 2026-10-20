"use client";

import React, { useState } from "react";
import {
  KeyRound,
  Mail,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  Lock,
} from "lucide-react";
import { AcessoUsuario, TipoAcessoUsuario } from "@/types";

interface CardAcessoSistemaProps {
  tipo: TipoAcessoUsuario;
  entidadeId: string;
  nomeCompleto: string;
  email: string;
  perfilId?: string | null;
  statusOperacional: string;
  acesso: AcessoUsuario | null;
  onConviteEnviado?: () => void;
}

export function CardAcessoSistema({
  tipo,
  entidadeId,
  nomeCompleto,
  email,
  perfilId,
  statusOperacional,
  acesso,
  onConviteEnviado,
}: CardAcessoSistemaProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    tipo: "sucesso" | "erro" | "aviso";
    mensagem: string;
  } | null>(null);

  // Determinação do Estado de Acesso
  let estadoAcesso:
    | "ativo"
    | "convite_pendente"
    | "processando"
    | "bloqueado"
    | "erro"
    | "sem_acesso" = "sem_acesso";

  if (perfilId || acesso?.status === "ativo") {
    estadoAcesso = "ativo";
  } else if (acesso?.status === "convite_pendente") {
    estadoAcesso = "convite_pendente";
  } else if (acesso?.status === "processando") {
    estadoAcesso = "processando";
  } else if (acesso?.status === "bloqueado") {
    estadoAcesso = "bloqueado";
  } else if (acesso?.status === "erro") {
    estadoAcesso = "erro";
  }

  const handleEnviarConvite = async () => {
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/admin/acessos/convites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, id: entidadeId }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setFeedback({
          tipo: "sucesso",
          mensagem: data.message || "Convite enviado com sucesso!",
        });
        if (onConviteEnviado) onConviteEnviado();
      } else {
        setFeedback({
          tipo: response.status === 503 ? "aviso" : "erro",
          mensagem:
            data.error ||
            "Não foi possível processar a solicitação de convite.",
        });
      }
    } catch {
      setFeedback({
        tipo: "erro",
        mensagem:
          "Erro de comunicação com o servidor ao solicitar o convite.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4">
      {/* Header do Card */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-50 text-[#5046E5] border border-indigo-100">
            <KeyRound className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Acesso ao Sistema
            </h3>
            <p className="text-[11px] text-slate-500">
              Credenciais e estado da conta de {nomeCompleto}
            </p>
          </div>
        </div>

        {/* Badge do Estado de Acesso */}
        <div>
          {estadoAcesso === "ativo" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Acesso Ativo
            </span>
          )}
          {estadoAcesso === "convite_pendente" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-200">
              <Mail className="h-3.5 w-3.5 text-blue-500" />
              Convite Enviado
            </span>
          )}
          {estadoAcesso === "processando" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 border border-amber-200">
              <Clock className="h-3.5 w-3.5 text-amber-500 animate-spin" />
              Em Processamento
            </span>
          )}
          {estadoAcesso === "bloqueado" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 border border-rose-200">
              <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
              Acesso Bloqueado
            </span>
          )}
          {estadoAcesso === "erro" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 border border-rose-200">
              <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
              Falha de Configuração
            </span>
          )}
          {estadoAcesso === "sem_acesso" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 border border-slate-200">
              <Lock className="h-3.5 w-3.5 text-slate-500" />
              Sem Acesso
            </span>
          )}
        </div>
      </div>

      {/* Diferenciação Explícita: Status Operacional vs Status de Acesso */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
            {tipo === "aluno" ? "Matrícula Pedagógica" : "Disponibilidade Docente"}
          </span>
          <span className="font-semibold text-slate-800 capitalize">
            {statusOperacional}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
            Conta de Acesso ao Sistema
          </span>
          <span className="font-semibold text-slate-800">
            {estadoAcesso === "ativo"
              ? "Autenticado e vinculado"
              : estadoAcesso === "convite_pendente"
              ? "Convite pendente de ativação"
              : estadoAcesso === "bloqueado"
              ? "Acesso bloqueado"
              : "Sem conta vinculada"}
          </span>
        </div>
      </div>

      {/* Detalhes do Usuário */}
      <div className="space-y-1.5 text-xs text-slate-600">
        <div className="flex items-center justify-between">
          <span className="text-slate-500">E-mail para convite:</span>
          <span className="font-mono font-medium text-slate-800">{email}</span>
        </div>
        {perfilId && (
          <div className="flex items-center justify-between">
            <span className="text-slate-500">ID de Autenticação (Auth UID):</span>
            <span className="font-mono text-[11px] text-slate-700">{perfilId}</span>
          </div>
        )}
        {acesso?.conviteEnviadoEm && (
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Convite enviado em:</span>
            <span className="text-slate-700">
              {new Date(acesso.conviteEnviadoEm).toLocaleString("pt-BR")}
            </span>
          </div>
        )}
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
            feedback.tipo === "sucesso"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : feedback.tipo === "aviso"
              ? "bg-amber-50 border-amber-200 text-amber-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {feedback.tipo === "sucesso" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
          ) : feedback.tipo === "aviso" ? (
            <Info className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          )}
          <div>
            <p className="font-semibold">
              {feedback.tipo === "sucesso"
                ? "Sucesso"
                : feedback.tipo === "aviso"
                ? "Configuração Pendente"
                : "Erro"}
            </p>
            <p className="mt-0.5">{feedback.mensagem}</p>
          </div>
        </div>
      )}

      {/* Aviso de Configuração Pendente da Etapa 10.2C1 */}
      {estadoAcesso === "sem_acesso" && (
        <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200 text-xs text-slate-600 space-y-2">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-[#5046E5] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-slate-800">
                Fundação de Convites Preparada (Etapa 10.2C1)
              </p>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                A infraestrutura de banco de dados, políticas RLS e endpoint seguro
                estão implementados. O envio oficial de convites por e-mail será
                habilitado na Etapa 10.2C2 após a configuração do provedor SMTP e
                da chave administrativa de serviço.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Botão de Envio de Convite */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleEnviarConvite}
          disabled={estadoAcesso === "ativo" || isSubmitting}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#5046E5] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Mail className="h-4 w-4" />
          <span>
            {estadoAcesso === "ativo"
              ? "Acesso Já Ativo"
              : isSubmitting
              ? "Processando..."
              : "Enviar Convite de Acesso"}
          </span>
        </button>

        {estadoAcesso !== "ativo" && (
          <p className="mt-1.5 text-[11px] text-slate-400">
            * O envio requer ativação prévia da Secret Key no ambiente (Etapa 10.2C2).
          </p>
        )}
      </div>
    </div>
  );
}
