"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import {
  ShieldCheck,
  GraduationCap,
  Key,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Save,
} from "lucide-react";
import { useAlunoIdentity } from "@/app/aluno/AlunoLayoutClient";
import { alunoRepository } from "@/data/alunoRepository";
import { turmaRepository } from "@/data/turmaRepository";
import { Aluno, Turma } from "@/types";
import { NivelBadge } from "@/components/common/NivelBadge";

export default function PerfilAlunoPage() {
  const identity = useAlunoIdentity();
  const alunoId = identity?.isRealAuth ? (identity.alunoId || "") : (identity?.alunoId || "alu-001");

  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);

  // Alteração de Senha
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [senhaErro, setSenhaErro] = useState<string | null>(null);
  const [senhaSucesso, setSenhaSucesso] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function carregar() {
      setLoading(true);
      try {
        if (alunoId) {
          const [a, t] = await Promise.all([
            alunoRepository.obterPorId(alunoId).catch(() => null),
            turmaRepository.listarPorAluno(alunoId).catch(() => []),
          ]);
          if (mounted) {
            setAluno(a);
            setTurmas(t);
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    carregar();
    return () => {
      mounted = false;
    };
  }, [alunoId]);

  const handleSalvarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    setSenhaErro(null);
    setSenhaSucesso(null);

    if (!novaSenha.trim()) {
      setSenhaErro("Por favor, digite a nova senha desejada.");
      return;
    }
    if (novaSenha.length < 6) {
      setSenhaErro("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setSenhaErro("A confirmação não coincide com a nova senha digitada.");
      return;
    }

    setSalvandoSenha(true);
    try {
      if (aluno) {
        const res = await alunoRepository.atualizar(aluno.id, {
          senha: novaSenha.trim(),
        });
        if (!res.success) {
          setSenhaErro(res.error || "Erro ao atualizar a senha. Tente novamente.");
          return;
        }
      }
      setSenhaSucesso("Sua senha de acesso foi atualizada com sucesso!");
      setNovaSenha("");
      setConfirmarSenha("");
      setTimeout(() => setSenhaSucesso(null), 4000);
    } catch (err: unknown) {
      setSenhaErro(err instanceof Error ? err.message : "Erro ao atualizar senha.");
    } finally {
      setSalvandoSenha(false);
    }
  };

  const nomeExibicao = aluno?.nomeCompleto || identity?.nomeCompleto || "Aluno";
  const emailExibicao = aluno?.email || identity?.email || "aluno@metodopaulo.com.br";
  const iniciais = identity?.initials || "AL";

  return (
    <div className="w-full max-w-[1080px] mx-auto min-w-0 animate-in fade-in duration-200 space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Meu Perfil
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Informações cadastrais, credenciais de acesso e parâmetros da sua conta discente.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Coluna 1: Cartão de Identificação */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-5 text-center">
          <div className="flex flex-col items-center">
            {identity?.avatarUrl ? (
              <Image
                src={identity.avatarUrl}
                alt={nomeExibicao}
                width={96}
                height={96}
                className="h-24 w-24 rounded-2xl object-cover ring-4 ring-indigo-50 shadow-md"
              />
            ) : (
              <div className="h-24 w-24 rounded-2xl bg-[#5046E5] text-white flex items-center justify-center text-2xl font-black shadow-md ring-4 ring-indigo-50">
                {iniciais}
              </div>
            )}
            <h2 className="mt-4 text-base font-bold text-slate-900">{nomeExibicao}</h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{emailExibicao}</p>

            <div className="mt-3 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Matrícula Ativa
              </span>
              <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
                Aluno MTD
              </span>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 text-left space-y-3">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Nível Pedagógico
              </p>
              <div className="mt-1">
                <NivelBadge nivel={aluno?.nivel || "nao_avaliado"} />
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Objetivo com o Inglês
              </p>
              <p className="text-xs text-slate-700 mt-0.5 font-medium">
                {aluno?.objetivoIngles || "Fluência e proficiência comunicativa"}
              </p>
            </div>
          </div>
        </div>

        {/* Coluna 2 e 3: Turmas e Segurança */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Vínculos e Turmas */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="rounded-xl bg-purple-50 p-2 text-purple-600">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Turmas e Aulas Vinculadas</h3>
                <p className="text-xs text-slate-500">
                  Grupos de estudo e mentorias com o corpo docente do Método Paulo.
                </p>
              </div>
            </div>

            {loading ? (
              <p className="text-xs text-slate-400">Carregando dados das turmas...</p>
            ) : turmas.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center">
                <BookOpen className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-600">
                  Nenhuma turma vinculada no momento.
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  A coordenação pedagógica alocará sua turma de acordo com seu horário preferencial.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {turmas.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-slate-50/70"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{t.nome}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Modalidade {t.modalidade === "individual" ? "Individual" : "Grupo"} • Nível {t.nivel}
                      </p>
                    </div>
                    <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                      Matriculado
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card: Alterar Senha de Acesso */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="rounded-xl bg-indigo-50 p-2 text-[#5046E5]">
                <Key className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Alterar Senha de Acesso</h3>
                <p className="text-xs text-slate-500">
                  Defina uma nova senha para entrar na plataforma em /login com seu e-mail.
                </p>
              </div>
            </div>

            {senhaSucesso && (
              <div className="rounded-xl bg-emerald-50 p-3 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{senhaSucesso}</span>
              </div>
            )}

            {senhaErro && (
              <div className="rounded-xl bg-rose-50 p-3 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{senhaErro}</span>
              </div>
            )}

            <form onSubmit={handleSalvarSenha} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">Nova Senha</label>
                    <button
                      type="button"
                      onClick={() => setMostrarSenha(!mostrarSenha)}
                      className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800"
                    >
                      {mostrarSenha ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      <span>{mostrarSenha ? "Ocultar" : "Ver"}</span>
                    </button>
                  </div>
                  <input
                    type={mostrarSenha ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5046E5]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirmar Nova Senha
                  </label>
                  <input
                    type={mostrarSenha ? "text" : "password"}
                    placeholder="Repita a nova senha"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5046E5]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={salvandoSenha || !novaSenha}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#5046E5] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {salvandoSenha ? (
                    <span>Salvando...</span>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      <span>Atualizar Senha</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Card: Blindagem e Privacidade RLS */}
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 flex items-start gap-3">
            <div className="rounded-lg bg-emerald-600 p-1.5 text-white shrink-0 mt-0.5">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-emerald-950">
                Privacidade & Isolamento de Dados Ativo
              </h4>
              <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                Sua conta opera sob políticas estritas de Row-Level Security (RLS) no PostgreSQL.
                Suas notas, histórico de tentativas, gravações do Self Presentation e conquistas
                são estritamente confidenciais e inacessíveis para outros estudantes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
