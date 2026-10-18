"use client";

import React, { useState } from "react";
import { Cartao, ItemImportacaoCSV, OperationResult } from "@/types";
import { parseAndValidateCSV } from "@/data/validators";
import {
  X,
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";

interface ImportarCartoesCSVModalProps {
  isOpen: boolean;
  onClose: () => void;
  baralhoId: string;
  baralhoNome: string;
  cartoesExistentes: Cartao[];
  onImportar: (
    itensValidos: Array<{
      frente: string;
      verso: string;
      exemplo?: string;
      traducao?: string;
      dica?: string;
      pronuncia?: string;
      tags?: string[];
    }>
  ) => Promise<OperationResult<Cartao[]>>;
}

export function ImportarCartoesCSVModal({
  isOpen,
  onClose,
  baralhoNome,
  cartoesExistentes,
  onImportar,
}: ImportarCartoesCSVModalProps) {
  const [csvContent, setCsvContent] = useState("");
  const [preview, setPreview] = useState<{
    itens: ItemImportacaoCSV[];
    totalValidos: number;
    totalInvalidos: number;
    totalDuplicados: number;
  } | null>(null);

  const [importando, setImportando] = useState(false);
  const [erroImportacao, setErroImportacao] = useState("");

  if (!isOpen) return null;

  const handleProcessarTexto = (text: string) => {
    setCsvContent(text);
    if (!text.trim()) {
      setPreview(null);
      return;
    }
    const res = parseAndValidateCSV(text, cartoesExistentes);
    setPreview(res);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      handleProcessarTexto(text);
    };
    reader.readAsText(file);
  };

  const handleConfirmarImportacao = async () => {
    if (!preview || preview.totalValidos === 0) return;

    setImportando(true);
    setErroImportacao("");

    const validos = preview.itens
      .filter((item) => item.status === "valido")
      .map((item) => ({
        frente: item.frente,
        verso: item.verso,
        exemplo: item.exemplo,
        traducao: item.traducao,
        dica: item.dica,
        pronuncia: item.pronuncia,
        tags: item.tags,
      }));

    try {
      const res = await onImportar(validos);
      if (res.success) {
        onClose();
      } else {
        setErroImportacao(res.error || "Erro ao importar cartões.");
      }
    } finally {
      setImportando(false);
    }
  };

  const modeloExemplo = `frente,verso,exemplo,traducao,dica,pronuncia,tags
"What are you up to?","O que você está fazendo?","Hey, what are you up to tonight?","Oi, o que você vai fazer hoje à noite?","Cumprimento informal","WUH-chuh UP too","cotidiano;perguntas"
"Figure out","Descobrir ou resolver","We need to figure this out.","Precisamos resolver isso.","Foco no processo mental","FIG-yər OWT","phrasal-verbs;resolução"`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Importar Cartões via CSV
              </h2>
              <p className="text-xs text-gray-500">
                Baralho de destino: <strong className="text-gray-800">{baralhoNome}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {erroImportacao && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{erroImportacao}</span>
            </div>
          )}

          {/* Local Processing Guarantee */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs text-emerald-800 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <div>
              <strong className="font-semibold">Processamento 100% Local no Navegador:</strong> O
              arquivo CSV é lido e validado inteiramente na sua máquina. Nenhum dado é transmitido
              a APIs externas ou armazenado em servidores de terceiros.
            </div>
          </div>

          {/* Upload or paste area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Selecione o arquivo CSV ou cole o conteúdo abaixo
              </label>
              <button
                type="button"
                onClick={() => handleProcessarTexto(modeloExemplo)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Preencher modelo de exemplo
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <label className="flex-1 flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 hover:border-indigo-400 rounded-xl cursor-pointer bg-gray-50/60 hover:bg-indigo-50/30 transition-colors">
                <FileText className="w-6 h-6 text-gray-400 mb-1" />
                <span className="text-xs font-medium text-gray-700">
                  Clique para carregar arquivo .csv
                </span>
                <span className="text-[11px] text-gray-400">Codificação UTF-8 recomendada</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <textarea
              rows={4}
              value={csvContent}
              onChange={(e) => handleProcessarTexto(e.target.value)}
              placeholder="Cole aqui o texto CSV no formato:&#10;frente,verso,exemplo,traducao,dica,pronuncia,tags"
              className="w-full font-mono text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Preview Results */}
          {preview && (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-center">
                  <div className="text-lg font-bold text-gray-800">{preview.itens.length}</div>
                  <div className="text-[11px] text-gray-500">Linhas Lidas</div>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                  <div className="text-lg font-bold text-emerald-700">{preview.totalValidos}</div>
                  <div className="text-[11px] text-emerald-600 font-medium">Válidos</div>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center">
                  <div className="text-lg font-bold text-amber-700">{preview.totalDuplicados}</div>
                  <div className="text-[11px] text-amber-600 font-medium">Duplicados</div>
                </div>
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-center">
                  <div className="text-lg font-bold text-rose-700">{preview.totalInvalidos}</div>
                  <div className="text-[11px] text-rose-600 font-medium">Inválidos</div>
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Linha</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Status</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Frente</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Verso</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Detalhe / Erro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {preview.itens.map((it) => (
                      <tr
                        key={it.linha}
                        className={
                          it.status === "valido"
                            ? "hover:bg-gray-50/50"
                            : it.status === "duplicado"
                            ? "bg-amber-50/30"
                            : "bg-rose-50/30"
                        }
                      >
                        <td className="px-3 py-2 text-gray-500 font-mono">{it.linha}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {it.status === "valido" && (
                            <span className="inline-flex items-center text-emerald-700 font-medium gap-1">
                              <CheckCircle className="w-3.5 h-3.5" /> Válido
                            </span>
                          )}
                          {it.status === "duplicado" && (
                            <span className="inline-flex items-center text-amber-700 font-medium gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" /> Duplicado
                            </span>
                          )}
                          {it.status === "invalido" && (
                            <span className="inline-flex items-center text-rose-700 font-medium gap-1">
                              <AlertCircle className="w-3.5 h-3.5" /> Inválido
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-medium text-gray-900 max-w-[150px] truncate">
                          {it.frente || "—"}
                        </td>
                        <td className="px-3 py-2 text-gray-700 max-w-[150px] truncate">
                          {it.verso || "—"}
                        </td>
                        <td className="px-3 py-2 text-gray-500">
                          {it.erro ? (
                            <span className="text-red-600">{it.erro}</span>
                          ) : (
                            <span className="text-gray-400">Pronto para importar</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between shrink-0">
          <span className="text-xs text-gray-500">
            {preview ? `${preview.totalValidos} cartão(ões) aptos para adição` : "Carregue ou cole um arquivo CSV"}
          </span>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={importando}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmarImportacao}
              disabled={!preview || preview.totalValidos === 0 || importando}
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm disabled:opacity-40"
            >
              {importando
                ? "Importando..."
                : `Importar ${preview?.totalValidos || 0} Cartões Válidos`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
