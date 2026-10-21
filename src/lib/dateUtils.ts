/**
 * Utilitários de conversão de data e fuso horário para a Agenda MTD.
 * Utiliza estritamente timezones IANA (padrão: America/Sao_Paulo) sem offsets numéricos fixos.
 */

export const DEFAULT_TIMEZONE = "America/Sao_Paulo";

/**
 * Converte data local (YYYY-MM-DD) e horário local (HH:mm) em um fuso IANA para ISO UTC (TIMESTAMPTZ).
 * Não utiliza offsets fixos codificados em string (ex: -03:00), calculando a diferença
 * exata em milissegundos via Intl.DateTimeFormat para qualquer fuso IANA e horário histórico.
 */
export function localToUtc(
  dateStr: string,
  timeStr: string,
  timeZone: string = DEFAULT_TIMEZONE
): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);

  // 1. Cria um Date de referência assumindo UTC com os componentes informados
  const naiveUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));

  // 2. Formata esse instante no timezone IANA alvo para identificar o deslocamento civil exato
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });

  const parts = formatter.formatToParts(naiveUtc);
  const partMap: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      partMap[part.type] = parseInt(part.value, 10);
    }
  }

  // Normalização caso o formatador retorne 24 para a meia-noite
  let tzHour = partMap.hour;
  if (tzHour === 24) tzHour = 0;

  const targetDateInTz = new Date(
    Date.UTC(
      partMap.year,
      partMap.month - 1,
      partMap.day,
      tzHour,
      partMap.minute,
      partMap.second || 0
    )
  );

  // Offset civil do fuso alvo em relação ao UTC naquele instante específico
  const offsetMs = targetDateInTz.getTime() - naiveUtc.getTime();

  // O instante UTC correspondente ao horário civil informado é naiveUtc subtraído do offset
  const realUtc = new Date(naiveUtc.getTime() - offsetMs);
  return realUtc.toISOString();
}

/**
 * Converte um timestamp UTC ISO para data (YYYY-MM-DD) e horário (HH:mm) no fuso local IANA.
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
