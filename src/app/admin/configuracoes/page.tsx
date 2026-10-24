"use client";

import React, { useState } from "react";
import {
  Building2,
  GraduationCap,
  ShieldCheck,
  Server,
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  Mail,
  Phone,
  MapPin,
  Lock,
  Database,
  Sliders,
  Check,
  RefreshCw,
} from "lucide-react";

export default function AdminConfiguracoesPage() {
  const [salvando, setSalvando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  // Dados Institucionais
  const [dadosInstitucionais, setDadosInstitucionais] = useState({
    nomeEscola: "DEMOSTRATIVO MTD — Método Paulo",
    sigla: "MTD",
    emailOficial: "contato@metodopaulo.com.br",
    telefoneSuporte: "+55 (11) 98765-4321",
    cidade: "São Paulo, SP — Brasil",
    fusoHorario: "America/Sao_Paulo (UTC-3)",
  });

  // Parâmetros Pedagógicos
  const [parametrosPedagogicos, setParametrosPedagogicos] = useState({
    duracaoAulaPadrao: "50",
    frequenciaMinima: "75",
    srsAtivo: true,
    validacaoHumanaObrigatoria: true,
    autoCorrecaoObjetivas: true,
    selfPresentationNivelamento: true,
  });

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setMensagemSucesso(null);

    setTimeout(() => {
      setSalvando(false);
      setMensagemSucesso("Configurações da plataforma atualizadas e salvas com sucesso!");
      setTimeout(() => setMensagemSucesso(null), 4000);
    }, 600);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Configurações da Plataforma
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Operacional
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Gestão dos parâmetros institucionais, políticas pedagógicas, isolamento de dados e infraestrutura.
          </p>
        </div>

        <button
          onClick={handleSalvar}
          disabled={salvando}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5046E5] px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {salvando ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Salvando...</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>Salvar Alterações</span>
            </>
          )}
        </button>
      </div>

      {/* Success Notification */}
      {mensagemSucesso && (
        <div className="rounded-2xl bg-emerald-50 p-4 border border-emerald-200 text-xs sm:text-sm text-emerald-800 flex items-center gap-3 animate-in fade-in duration-200 shadow-xs">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <p className="font-semibold">{mensagemSucesso}</p>
        </div>
      )}

      {/* Grid of Settings Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Dados Institucionais */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Dados Institucionais da Escola</h2>
              <p className="text-xs text-slate-500">
                Informações cadastrais exibidas no cabeçalho e relatórios oficiais.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome da Instituição / Metodologia
              </label>
              <input
                type="text"
                value={dadosInstitucionais.nomeEscola}
                onChange={(e) =>
                  setDadosInstitucionais({ ...dadosInstitucionais, nomeEscola: e.target.value })
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5046E5]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sigla Oficial
                </label>
                <input
                  type="text"
                  value={dadosInstitucionais.sigla}
                  onChange={(e) =>
                    setDadosInstitucionais({ ...dadosInstitucionais, sigla: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5046E5]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fuso Horário Oficial
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    disabled
                    value={dadosInstitucionais.fusoHorario}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8.5 pr-3 py-2 text-xs font-mono text-slate-600"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  E-mail Oficial de Suporte
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="email"
                    value={dadosInstitucionais.emailOficial}
                    onChange={(e) =>
                      setDadosInstitucionais({ ...dadosInstitucionais, emailOficial: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white pl-8.5 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5046E5]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Telefone / WhatsApp de Contato
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={dadosInstitucionais.telefoneSuporte}
                    onChange={(e) =>
                      setDadosInstitucionais({ ...dadosInstitucionais, telefoneSuporte: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white pl-8.5 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5046E5]"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Localização / Sede
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={dadosInstitucionais.cidade}
                  onChange={(e) =>
                    setDadosInstitucionais({ ...dadosInstitucionais, cidade: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white pl-8.5 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5046E5]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Parâmetros Pedagógicos & Acadêmicos */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="rounded-xl bg-purple-50 p-2.5 text-purple-600">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Parâmetros Pedagógicos & Método</h2>
              <p className="text-xs text-slate-500">
                Regras de frequência, repetição espaçada e fluxo de validação humana.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Duração Padrão das Aulas (min)
                </label>
                <input
                  type="number"
                  value={parametrosPedagogicos.duracaoAulaPadrao}
                  onChange={(e) =>
                    setParametrosPedagogicos({
                      ...parametrosPedagogicos,
                      duracaoAulaPadrao: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5046E5]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Frequência Mínima Exigida (%)
                </label>
                <input
                  type="number"
                  value={parametrosPedagogicos.frequenciaMinima}
                  onChange={(e) =>
                    setParametrosPedagogicos({
                      ...parametrosPedagogicos,
                      frequenciaMinima: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#5046E5]"
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={parametrosPedagogicos.srsAtivo}
                  onChange={(e) =>
                    setParametrosPedagogicos({
                      ...parametrosPedagogicos,
                      srsAtivo: e.target.checked,
                    })
                  }
                  className="mt-0.5 h-4 w-4 rounded text-[#5046E5] focus:ring-[#5046E5]"
                />
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Repetição Espaçada (SRS) Ativa
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Algoritmo SM-2 determinístico com piso de facilidade 1.3 e revisões automáticas programadas.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={parametrosPedagogicos.validacaoHumanaObrigatoria}
                  onChange={(e) =>
                    setParametrosPedagogicos({
                      ...parametrosPedagogicos,
                      validacaoHumanaObrigatoria: e.target.checked,
                    })
                  }
                  className="mt-0.5 h-4 w-4 rounded text-[#5046E5] focus:ring-[#5046E5]"
                />
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Barreira de Validação Humana pelo Docente
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Módulos atingindo 100% de atividades ficam em &quot;Aguardando Validação&quot; até o parecer formal do professor.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={parametrosPedagogicos.selfPresentationNivelamento}
                  onChange={(e) =>
                    setParametrosPedagogicos({
                      ...parametrosPedagogicos,
                      selfPresentationNivelamento: e.target.checked,
                    })
                  }
                  className="mt-0.5 h-4 w-4 rounded text-[#5046E5] focus:ring-[#5046E5]"
                />
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Rito de Nivelamento (Self Presentation)
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Exige gravação ou áudio do discente e avaliação via rubrica de 6 critérios fonético-pedagógicos.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Card 3: Segurança, RLS e Isolamento de Dados */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Segurança, RLS & Isolamento</h2>
              <p className="text-xs text-slate-500">
                Auditoria de permissões e integridade de acesso entre alunos e equipe.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 rounded-2xl border border-emerald-100 bg-emerald-50/40">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-emerald-600 p-1 text-white">
                  <Check className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Row-Level Security (RLS)</p>
                  <p className="text-[11px] text-slate-500">22 migrações aplicadas no Supabase com isolamento total</p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                100% Ativo
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl border border-emerald-100 bg-emerald-50/40">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-emerald-600 p-1 text-white">
                  <Lock className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Isolamento Discente (Aluno A vs B)</p>
                  <p className="text-[11px] text-slate-500">Resolvido via get_current_aluno_id() e perfil_id</p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                Blindado
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-indigo-600 p-1 text-white">
                  <Sliders className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Cadastro de Alunos com Login</p>
                  <p className="text-[11px] text-slate-500">Criação simultânea em auth.users e public.alunos</p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                Operacional
              </span>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 text-[11px] text-amber-800 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <p>
                <strong>Observações Pedagógicas:</strong> O campo de anotações internas da coordenação é estritamente expurgado antes de qualquer serialização para o portal do aluno.
              </p>
            </div>
          </div>
        </div>

        {/* Card 4: Infraestrutura & Armazenamento em Nuvem */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Infraestrutura em Nuvem</h2>
              <p className="text-xs text-slate-500">
                Conexões ativas com o banco de dados PostgreSQL e buckets de armazenamento.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-[#5046E5]" />
                  <span className="text-xs font-bold text-slate-800">Supabase Database</span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  Conectado
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-500 break-all">
                Project Ref: oaissugnjvrobhdrnain
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Bucket: materiais</span>
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                </div>
                <p className="text-[11px] text-slate-500">PDFs, apostilas, gravações de aula e áudios de prática</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Bucket: avatars</span>
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                </div>
                <p className="text-[11px] text-slate-500">Fotos de perfil de alunos, professores e coordenação</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Hospedagem & Edge CDN</span>
                <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
                  Vercel Production
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Domínio ativo: demonstrativo-mtd.vercel.app
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
