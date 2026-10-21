/**
 * Utilitários de conversão de data e fuso horário para a Agenda MTD.
 * Fuso horário padrão: America/Sao_Paulo (UTC-3).
 */

const DEFAULT_TIMEZONE = "America/Sao_Paulo";

/**
 * Converte data local (YYYY-MM-DD) e horário local (HH:mm) para ISO UTC (TIMESTAMPTZ).
 */
export function localToUtc(
  dateStr: string,
  timeStr: string,
  timeZone: string = DEFAULT_TIMEZONE
): string {
  // Monta a representação no fuso horário local e normaliza para UTC ISO
  // Como America/Sao_Paulo opera sem horário de verão (UTC-3), normalizamos com segurança
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);

  // Usa string formatada com offset padrão -03:00 caso seja America/Sao_Paulo
  if (timeZone === "America/Sao_Paulo") {
    const pad = (n: number) => String(n).padStart(2, "0");
    const localIso = `${pad(year)}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00-03:00`;
    return new Date(localIso).toISOString();
  }

  // Fallback genérico com Intl
  const naiveDate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  return naiveDate.toISOString();
}

/**
 * Converte um timestamp UTC ISO para data (YYYY-MM-DD) e horário (HH:mm) no fuso local.
 */
export function utcToLocal(
  utcIsoStr: string,
  timeZone: string = DEFAULT_TIMEZONE
): { date: string; time: string } {
  const d = new Date(utcIsoStr);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  const partMap: Record<string, string> = {};
  for (const p of parts) {
    partMap[p.type] = p.value;
  }

  // Se hour for "24", ajusta para "00"
  let hour = partMap.hour || "00";
  if (hour === "24") hour = "00";

  return {
    date: `${partMap.year}-${partMap.month}-${partMap.day}`,
    time: `${hour}:${partMap.minute}`,
  };
}

/**
 * Calcula a duração em minutos entre dois timestamps UTC.
 */
export function calculateDurationMinutes(startUtc: string, endUtc: string): number {
  const start = new Date(startUtc).getTime();
  const end = new Date(endUtc).getTime();
  const diffMinutes = Math.round((end - start) / (60 * 1000));
  return Math.max(1, diffMinutes);
}

/**
 * Adiciona minutos a um timestamp UTC ISO.
 */
export function addMinutesToUtc(startUtc: string, minutes: number): string {
  const start = new Date(startUtc).getTime();
  const end = new Date(start + minutes * 60 * 1000);
  return end.toISOString();
}
