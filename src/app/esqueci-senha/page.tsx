"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Mail, AlertCircle, CheckCircle2, Loader2, ArrowLeft, Send } from "lucide-react";
import { requestPasswordResetAction } from "@/lib/auth/authActions";

export default function EsqueciSenhaPage() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const result = await requestPasswordResetAction(null, formData);

    setLoading(false);
    if (result.error) {
      setErrorMessage(result.error);
    } else if (result.message) {
      setSuccessMessage(result.message);
    }
  }

  return (
    <main className="min-h-screen bg-[#0C0A17] relative flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Background Decorativo */}
      <div
        className="absolute inset-0 pointer-events-none select-none opacity-40 z-0 bg-cover bg-center"
        style={{ backgroundImage: `url('/assets/mtd/mtd-main-background.svg')` }}
        aria-hidden="true"
      />

      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#5B2FE8]/20 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-[#161426]/90 border border-white/10 rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-xl">
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
              Recuperação de Acesso
            </span>

            <h1 className="font-serif text-3xl sm:text-4xl text-white font-normal tracking-tight">
              Esqueceu sua senha?
            </h1>

            <p className="text-sm text-gray-400 mt-2 font-sans">
              Informe seu e-mail para receber as orientações de redefinição.
            </p>
          </div>

          {successMessage && (
            <div
              role="status"
              className="mb-6 p-4 bg-emerald-950/60 border border-emerald-500/30 rounded-xl flex items-start gap-3 text-emerald-300 text-sm"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-emerald-200">Solicitação enviada</p>
                <p className="text-xs text-emerald-300/90 leading-relaxed">
                  {successMessage}
                </p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div
              role="alert"
              className="mb-6 p-3.5 bg-rose-950/60 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-rose-300 text-xs sm:text-sm"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!successMessage ? (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-[#5B2FE8] hover:bg-[#6C42F5] text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#5B2FE8]/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed group mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enviando solicitação...</span>
                  </>
                ) : (
                  <>
                    <span>Enviar Link de Recuperação</span>
                    <Send className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <Link
                href="/login"
                className="w-full py-3 px-4 bg-[#1F1B38] hover:bg-[#2A244D] text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 border border-white/10 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar para a tela de login</span>
              </Link>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Lembrou sua senha? Retornar ao login</span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
