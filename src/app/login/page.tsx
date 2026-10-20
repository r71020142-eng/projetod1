"use client";

import React, { useState, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { loginAction } from "@/lib/auth/authActions";

function LoginFormContent() {
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next") || "";
  const errorParam = searchParams.get("error");
  const mensagemParam = searchParams.get("mensagem");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(() => {
    if (errorParam === "codigo_ausente") {
      return "O link de autenticação é inválido ou não possui código.";
    }
    if (errorParam === "sessao_expirada") {
      return "Sua sessão ou link expirou. Por favor, autentique-se novamente.";
    }
    if (errorParam === "conta_bloqueada") {
      return "Sua conta está inativa ou bloqueada. Entre em contato com a coordenação.";
    }
    return null;
  });

  const successMessage =
    mensagemParam === "senha_redefinida"
      ? "Sua senha foi redefinida com sucesso. Faça login com a nova senha."
      : null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const result = await loginAction(null, formData);

    if (result?.error) {
      setErrorMessage(result.error);
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0C0A17] relative flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Background Decorativo SVG */}
      <div
        className="absolute inset-0 pointer-events-none select-none opacity-40 z-0 bg-cover bg-center"
        style={{ backgroundImage: `url('/assets/mtd/mtd-main-background.svg')` }}
        aria-hidden="true"
      />

      {/* Glow Suave de Fundo */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#5B2FE8]/20 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Card Principal */}
        <div className="bg-[#161426]/90 border border-white/10 rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-xl">
          {/* Cabeçalho Institucional */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-[#1F1B38] border border-[#D4AF37]/30 flex items-center justify-center mb-4 shadow-inner">
              <Image
                src="/assets/mtd/mtd-logo-mark.svg"
                alt="Logo Método Paulo"
                width={32}
                height={32}
                className="w-8 h-8 object-contain"
                priority
              />
            </div>

            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#D4AF37] mb-1.5">
              Escola Paulo • MTD
            </span>

            <h1 className="font-serif text-3xl sm:text-4xl text-white font-normal tracking-tight">
              Acesso à Plataforma
            </h1>

            <p className="text-sm text-gray-400 mt-2 font-sans">
              Entre com suas credenciais institucionais para continuar
            </p>
          </div>

          {/* Banner de Mensagem de Sucesso */}
          {successMessage && (
            <div
              role="alert"
              className="mb-6 p-3.5 bg-emerald-950/60 border border-emerald-500/30 rounded-xl flex items-start gap-2.5 text-emerald-300 text-xs sm:text-sm"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Banner de Erro */}
          {errorMessage && (
            <div
              role="alert"
              className="mb-6 p-3.5 bg-rose-950/60 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-rose-300 text-xs sm:text-sm animate-shake"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Formulário de Login */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <input type="hidden" name="next" value={nextParam} />

            {/* Campo E-mail */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium uppercase tracking-wider text-gray-300 mb-2"
              >
                E-mail institucional
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-4 h-4" aria-hidden="true" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="seu.email@exemplo.com"
                  className="w-full pl-10 pr-4 py-3 bg-[#110F20] border border-white/10 rounded-xl text-white text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#5B2FE8] focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="password"
                  className="block text-xs font-medium uppercase tracking-wider text-gray-300"
                >
                  Senha de acesso
                </label>
                <Link
                  href="/esqueci-senha"
                  className="text-xs text-[#D4AF37] hover:text-[#e0c25a] transition-colors font-medium"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" aria-hidden="true" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-11 py-3 bg-[#110F20] border border-white/10 rounded-xl text-white text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#5B2FE8] focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {/* Botão de Envio */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-[#5B2FE8] hover:bg-[#6C42F5] text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#5B2FE8]/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed group mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validando credenciais...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Rodapé Seguro Sem Cadastro Público */}
          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-xs text-gray-400 leading-relaxed">
              Acesso exclusivo para discentes matriculados, corpo docente e equipe de gestão. Não há cadastro público.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0C0A17] flex items-center justify-center p-4">
          <Loader2 className="w-8 h-8 text-[#5B2FE8] animate-spin" />
        </main>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
