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
import { useLanguage } from "@/lib/i18n/LanguageContext";

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
  const { locale, formatDate } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    tipo: "sucesso" | "erro" | "aviso";
    mensagem: string;
  } | null>(null);

  // Determinação do Estado de Acesso segundo a Máquina de Estados Oficial
  let estadoAcesso:
    | "ativo"
    | "convite_pendente"
    | "processando"
    | "bloqueado"
    | "erro"
    | "sem_acesso" = "sem_acesso";

  if (acesso?.status === "ativo") {
    estadoAcesso = "ativo";
  } else if (acesso?.status === "convite_pendente") {
    estadoAcesso = "convite_pendente";
  } else if (acesso?.status === "processando") {
    estadoAcesso = "processando";
  } else if (acesso?.status === "bloqueado") {
    estadoAcesso = "bloqueado";
  } else if (acesso?.status === "erro") {
    estadoAcesso = "erro";
  } else if (perfilId) {
    estadoAcesso = "ativo";
  } else {
    estadoAcesso = "sem_acesso";
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
          mensagem: data.message || (locale === "en" ? "Invite sent successfully!" : "Convite enviado com sucesso!"),
        });
        if (onConviteEnviado) onConviteEnviado();
      } else {
        setFeedback({
          tipo: response.status === 503 ? "aviso" : "erro",
          mensagem:
            data.error ||
            (locale === "en" ? "Could not process the invitation request." : "Não foi possível processar a solicitação de convite."),
        });
      }
    } catch {
      setFeedback({
        tipo: "erro",
        mensagem:
          locale === "en"
            ? "Server communication failure when sending invitation."
            : "Erro de comunicação com o servidor ao solicitar o convite.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const tCard = {
    title: {
      pt: "Acesso ao Sistema",
      en: "System Access",
      fr: "Accès au système",
      es: "Acceso al sistema",
      it: "Accesso al sistema",
      zh: "系统访问权限",
    }[locale] || "Acesso ao Sistema",

    subtitle: {
      pt: `Credenciais e estado da conta de ${nomeCompleto}`,
      en: `Credentials and account status for ${nomeCompleto}`,
      fr: `Identifiants et statut du compte de ${nomeCompleto}`,
      es: `Credenciales y estado de cuenta de ${nomeCompleto}`,
      it: `Credenziali e stato dell'account per ${nomeCompleto}`,
      zh: `${nomeCompleto} 的凭据与账户状态`,
    }[locale] || `Credenciais de ${nomeCompleto}`,

    badgeAtivo: {
      pt: "Acesso Ativo",
      en: "Active Access",
      fr: "Accès actif",
      es: "Acceso activo",
      it: "Accesso attivo",
      zh: "访问权限已激活",
    }[locale] || "Acesso Ativo",

    badgePendente: {
      pt: "Convite Enviado",
      en: "Invite Sent",
      fr: "Invitation envoyée",
      es: "Invitación enviada",
      it: "Invito inviato",
      zh: "邀请已发送",
    }[locale] || "Convite Enviado",

    badgeProcessando: {
      pt: "Em Processamento",
      en: "Processing",
      fr: "En traitement",
      es: "Procesando",
      it: "In elaborazione",
      zh: "处理中",
    }[locale] || "Em Processamento",

    badgeBloqueado: {
      pt: "Acesso Bloqueado",
      en: "Access Blocked",
      fr: "Accès bloqué",
      es: "Acceso bloqueado",
      it: "Accesso bloccato",
      zh: "访问已锁定",
    }[locale] || "Acesso Bloqueado",

    badgeErro: {
      pt: "Falha de Configuração",
      en: "Config Error",
      fr: "Erreur de configuration",
      es: "Error de configuración",
      it: "Errore di configurazione",
      zh: "配置错误",
    }[locale] || "Falha de Configuração",

    badgeSemAcesso: {
      pt: "Sem Acesso",
      en: "No Access",
      fr: "Sans accès",
      es: "Sin acceso",
      it: "Nessun accesso",
      zh: "无访问权限",
    }[locale] || "Sem Acesso",

    enrollmentLabel: tipo === "aluno"
      ? {
          pt: "Matrícula Pedagógica",
          en: "Pedagogical Enrollment",
          fr: "Inscription pédagogique",
          es: "Matrícula pedagógica",
          it: "Iscrizione pedagogica",
          zh: "教学学籍",
        }[locale] || "Matrícula Pedagógica"
      : {
          pt: "Disponibilidade Docente",
          en: "Teaching Availability",
          fr: "Disponibilité pédagogique",
          es: "Disponibilidad docente",
          it: "Disponibilità didattica",
          zh: "教师任教状态",
        }[locale] || "Disponibilidade Docente",

    accountLabel: {
      pt: "Conta de Acesso ao Sistema",
      en: "System Access Account",
      fr: "Compte d'accès au système",
      es: "Cuenta de acceso al sistema",
      it: "Account di accesso al sistema",
      zh: "系统访问账户",
    }[locale] || "Conta de Acesso ao Sistema",

    accountStatus: estadoAcesso === "ativo"
      ? {
          pt: "Autenticado e vinculado",
          en: "Authenticated and linked",
          fr: "Authentifié et associé",
          es: "Autenticado y vinculado",
          it: "Autenticato e collegato",
          zh: "已认证并关联",
        }[locale] || "Autenticado e vinculado"
      : estadoAcesso === "convite_pendente"
      ? {
          pt: "Convite pendente de ativação",
          en: "Invite pending activation",
          fr: "Invitation en attente d'activation",
          es: "Invitación pendiente de activación",
          it: "Invito in attesa di attivazione",
          zh: "邀请待激活",
        }[locale] || "Convite pendente de ativação"
      : estadoAcesso === "bloqueado"
      ? {
          pt: "Acesso bloqueado",
          en: "Access blocked",
          fr: "Accès bloqué",
          es: "Acceso bloqueado",
          it: "Accesso bloccato",
          zh: "访问已锁定",
        }[locale] || "Acesso bloqueado"
      : {
          pt: "Sem conta vinculada",
          en: "No linked account",
          fr: "Aucun compte associé",
          es: "Sin cuenta vinculada",
          it: "Nessun account collegato",
          zh: "未绑定账户",
        }[locale] || "Sem conta vinculada",

    emailLabel: {
      pt: "E-mail para convite:",
      en: "Invite email:",
      fr: "E-mail d'invitation :",
      es: "Correo de invitación:",
      it: "E-mail di invito:",
      zh: "邀请邮箱：",
    }[locale] || "E-mail para convite:",

    authUidLabel: {
      pt: "ID de Autenticação (Auth UID):",
      en: "Auth UID:",
      fr: "Identifiant d'authentification (UID) :",
      es: "UID de autenticación:",
      it: "UID di autenticazione:",
      zh: "认证用户标识 (UID)：",
    }[locale] || "Auth UID:",

    inviteSentLabel: {
      pt: "Convite enviado em:",
      en: "Invite sent on:",
      fr: "Invitation envoyée le :",
      es: "Invitación enviada el:",
      it: "Invito inviato il:",
      zh: "邀请发送于：",
    }[locale] || "Convite enviado em:",

    btnActive: {
      pt: "Acesso Já Ativo",
      en: "Access Already Active",
      fr: "Accès déjà actif",
      es: "Acceso ya activo",
      it: "Accesso già attivo",
      zh: "权限已生效",
    }[locale] || "Acesso Já Ativo",

    btnProcessing: {
      pt: "Processando...",
      en: "Processing...",
      fr: "Traitement en cours...",
      es: "Procesando...",
      it: "Elaborazione...",
      zh: "处理中...",
    }[locale] || "Processando...",

    btnSend: {
      pt: "Enviar Convite de Acesso",
      en: "Send Access Invite",
      fr: "Envoyer l'invitation d'accès",
      es: "Enviar invitación de acceso",
      it: "Invia invito di accesso",
      zh: "发送访问邀请",
    }[locale] || "Enviar Convite de Acesso",

    smtpNote: {
      pt: "* O envio requer ativação prévia da Secret Key no ambiente.",
      en: "* Delivery requires SMTP credentials in production environment.",
      fr: "* L'envoi nécessite la configuration SMTP dans l'environnement.",
      es: "* El envío requiere credenciales SMTP en el entorno.",
      it: "* L'invio richiede credenziali SMTP nell'ambiente.",
      zh: "* 正式环境发送需要配置相应的凭据。",
    }[locale] || "* Requer configuração no ambiente.",
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
            <h3 className="text-sm font-bold text-slate-900">{tCard.title}</h3>
            <p className="text-[11px] text-slate-500">{tCard.subtitle}</p>
          </div>
        </div>

        {/* Badge do Estado de Acesso */}
        <div>
          {estadoAcesso === "ativo" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              {tCard.badgeAtivo}
            </span>
          )}
          {estadoAcesso === "convite_pendente" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-200">
              <Mail className="h-3.5 w-3.5 text-blue-500" />
              {tCard.badgePendente}
            </span>
          )}
          {estadoAcesso === "processando" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 border border-amber-200">
              <Clock className="h-3.5 w-3.5 text-amber-500 animate-spin" />
              {tCard.badgeProcessando}
            </span>
          )}
          {estadoAcesso === "bloqueado" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 border border-rose-200">
              <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
              {tCard.badgeBloqueado}
            </span>
          )}
          {estadoAcesso === "erro" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 border border-rose-200">
              <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
              {tCard.badgeErro}
            </span>
          )}
          {estadoAcesso === "sem_acesso" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 border border-slate-200">
              <Lock className="h-3.5 w-3.5 text-slate-500" />
              {tCard.badgeSemAcesso}
            </span>
          )}
        </div>
      </div>

      {/* Diferenciação Explícita: Status Operacional vs Status de Acesso */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
            {tCard.enrollmentLabel}
          </span>
          <span className="font-semibold text-slate-800 capitalize">
            {statusOperacional}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
            {tCard.accountLabel}
          </span>
          <span className="font-semibold text-slate-800">
            {tCard.accountStatus}
          </span>
        </div>
      </div>

      {/* Detalhes do Usuário */}
      <div className="space-y-1.5 text-xs text-slate-600">
        <div className="flex items-center justify-between">
          <span className="text-slate-500">{tCard.emailLabel}</span>
          <span className="font-mono font-medium text-slate-800">{email}</span>
        </div>
        {perfilId && (
          <div className="flex items-center justify-between">
            <span className="text-slate-500">{tCard.authUidLabel}</span>
            <span className="font-mono text-[11px] text-slate-700">{perfilId}</span>
          </div>
        )}
        {acesso?.conviteEnviadoEm && (
          <div className="flex items-center justify-between">
            <span className="text-slate-500">{tCard.inviteSentLabel}</span>
            <span className="text-slate-700">
              {formatDate(acesso.conviteEnviadoEm)}
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
              {feedback.tipo === "sucesso" ? "OK" : "Aviso"}
            </p>
            <p className="mt-0.5">{feedback.mensagem}</p>
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
              ? tCard.btnActive
              : isSubmitting
              ? tCard.btnProcessing
              : tCard.btnSend}
          </span>
        </button>

        {estadoAcesso !== "ativo" && (
          <p className="mt-1.5 text-[11px] text-slate-400">
            {tCard.smtpNote}
          </p>
        )}
      </div>
    </div>
  );
}
