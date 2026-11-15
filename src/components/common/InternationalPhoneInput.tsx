"use client";

import React, { useMemo } from "react";
import { Globe, Phone } from "lucide-react";

export interface InternationalPhoneInputProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
}

interface CountryOption {
  code: string;
  ddi: string;
  flag: string;
  label: string;
}

const COUNTRY_OPTIONS: CountryOption[] = [
  { code: "BR", ddi: "+55", flag: "🇧🇷", label: "Brasil (+55)" },
  { code: "US", ddi: "+1", flag: "🇺🇸", label: "EUA / Canadá (+1)" },
  { code: "GB", ddi: "+44", flag: "🇬🇧", label: "Reino Unido (+44)" },
  { code: "PT", ddi: "+351", flag: "🇵🇹", label: "Portugal (+351)" },
  { code: "ES", ddi: "+34", flag: "🇪🇸", label: "Espanha (+34)" },
  { code: "FR", ddi: "+33", flag: "🇫🇷", label: "França (+33)" },
  { code: "DE", ddi: "+49", flag: "🇩🇪", label: "Alemanha (+49)" },
  { code: "IT", ddi: "+39", flag: "🇮🇹", label: "Itália (+39)" },
  { code: "IE", ddi: "+353", flag: "🇮🇪", label: "Irlanda (+353)" },
  { code: "CH", ddi: "+41", flag: "🇨🇭", label: "Suíça (+41)" },
  { code: "AR", ddi: "+54", flag: "🇦🇷", label: "Argentina (+54)" },
  { code: "CL", ddi: "+56", flag: "🇨🇱", label: "Chile (+56)" },
  { code: "MX", ddi: "+52", flag: "🇲🇽", label: "México (+52)" },
  { code: "CO", ddi: "+57", flag: "🇨🇴", label: "Colômbia (+57)" },
  { code: "JP", ddi: "+81", flag: "🇯🇵", label: "Japão (+81)" },
  { code: "AU", ddi: "+61", flag: "🇦🇺", label: "Austrália (+61)" },
  { code: "CUSTOM", ddi: "+", flag: "🌐", label: "Outro país (+...)" },
];

export function InternationalPhoneInput({
  id = "telefone",
  label = "Telefone",
  value = "",
  onChange,
  error,
  disabled = false,
  required = false,
  placeholder,
}: InternationalPhoneInputProps) {
  // Tenta deduzir o DDI selecionado a partir do valor atual
  const selectedDdi = useMemo(() => {
    if (!value || !value.startsWith("+")) {
      return "+55"; // Padrão Brasil
    }
    // Procura na lista o DDI mais longo que corresponda ao prefixo do telefone
    const sorted = [...COUNTRY_OPTIONS]
      .filter((c) => c.ddi !== "+")
      .sort((a, b) => b.ddi.length - a.ddi.length);

    for (const opt of sorted) {
      if (value.startsWith(opt.ddi)) {
        return opt.ddi;
      }
    }
    return "+"; // Custom
  }, [value]);

  const handleCountryChange = (newDdi: string) => {
    if (newDdi === "+") {
      // Se selecionou outro país e o número não começa com +, adiciona +
      if (!value.startsWith("+")) {
        onChange(`+${value.replace(/\D/g, "")}`);
      }
      return;
    }

    if (!value.trim()) {
      onChange(`${newDdi} `);
      return;
    }

    // Se já havia um DDI, substitui pelo novo
    if (value.startsWith("+")) {
      const match = value.match(/^\+\d{1,4}/);
      if (match) {
        const withoutOldDdi = value.slice(match[0].length).trim();
        onChange(`${newDdi} ${withoutOldDdi}`);
        return;
      }
    }

    // Caso não tivesse DDI antes
    onChange(`${newDdi} ${value.trim()}`);
  };

  const handlePhoneInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    onChange(rawVal);
  };

  const currentPlaceholder =
    placeholder || (selectedDdi === "+55" ? "(11) 98765-4321" : selectedDdi === "+1" ? "(555) 123-4567" : "Número de telefone");

  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-slate-700 mb-1">
          {label} {!required && <span className="text-slate-400 font-normal">(opcional)</span>}
        </label>
      )}

      <div className="flex rounded-xl border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-[#5046E5] focus-within:border-transparent transition-all shadow-xs">
        {/* Seletor de Código do País (DDI) */}
        <div className="relative flex items-center border-r border-slate-200 bg-slate-50/70 rounded-l-xl px-2.5">
          <Globe className="h-3.5 w-3.5 text-slate-400 mr-1.5 shrink-0" />
          <select
            value={selectedDdi}
            disabled={disabled}
            onChange={(e) => handleCountryChange(e.target.value)}
            className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer py-2 pr-1"
            title="Selecione o código de país (DDI)"
          >
            {COUNTRY_OPTIONS.map((c) => (
              <option key={c.code} value={c.ddi}>
                {c.flag} {c.ddi}
              </option>
            ))}
          </select>
        </div>

        {/* Input do Número de Telefone */}
        <div className="relative flex-1 flex items-center">
          <input
            id={id}
            type="text"
            disabled={disabled}
            placeholder={currentPlaceholder}
            value={value}
            onChange={handlePhoneInputChange}
            className="w-full bg-transparent px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <Phone className="h-3.5 w-3.5 text-slate-300 mr-3 shrink-0 pointer-events-none" />
        </div>
      </div>

      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
        <span>Suporta códigos de qualquer país (ex: +1, +55, +44, +351)</span>
      </div>

      {error && <p className="mt-1 text-[11px] font-medium text-rose-600">{error}</p>}
    </div>
  );
}
