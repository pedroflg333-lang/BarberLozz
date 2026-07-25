/**
 * Centralized date resolver for appointment booking.
 * 
 * All relative date expressions from customers MUST go through this function.
 * Ollama NEVER computes dates directly.
 */

const DAY_NAMES: Record<string, number> = {
  domingo: 0, dom: 0,
  lunes: 1, lun: 1,
  martes: 2, mar: 2,
  miércoles: 3, miercoles: 3, mie: 3, mier: 3,
  jueves: 4, jue: 4, juv: 4,
  viernes: 5, vie: 5,
  sábado: 6, sabado: 6, sab: 6
};

const SPANISH_DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function getDayName(date: Date, timezone: string): string {
  const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  const d = new Date(dateStr + 'T12:00:00Z');
  return SPANISH_DAY_NAMES[d.getUTCDay()];
}

function getDayIndex(date: Date, timezone: string): number {
  // 'en-CA' gives YYYY-MM-DD, from which we can derive day of week
  const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
}

function startOfDay(date: Date, timezone: string): Date {
  // Parse the timezone-aware date string as local midnight
  const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  return new Date(dateStr + 'T00:00:00');
}

function formatDate(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export interface DateResolution {
  dateStr: string;           // YYYY-MM-DD in business timezone
  dayName: string;           // Spanish day name (e.g. "viernes")
  label: string;             // Human-readable for logs
}

/**
 * Resolve a customer's appointment date expression to an absolute YYYY-MM-DD.
 * 
 * @param customerMessage - The raw message from the customer
 * @param timezone - IANA timezone (default: Europe/Madrid)
 * @param now - Optional reference date (for testing)
 * @returns DateResolution or null if unresolvable
 */
export function resolveAppointmentDate(
  customerMessage: string,
  timezone: string = 'Europe/Madrid',
  now?: Date
): DateResolution | null {
  const msg = customerMessage.toLowerCase().trim();
  const refDate = now ? startOfDay(now, timezone) : startOfDay(new Date(), timezone);
  const todayIndex = getDayIndex(refDate, timezone);

  // --- Explicit dates ---

  // "24 de julio", "24 de julio de 2026"
  const explicitMatch = msg.match(/(\d{1,2})\s*de\s+([a-záéíóúñ]+)(?:\s*de\s*(\d{4}))?/);
  if (explicitMatch) {
    const day = parseInt(explicitMatch[1]);
    const monthName = explicitMatch[2].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const year = explicitMatch[3] ? parseInt(explicitMatch[3]) : refDate.getFullYear();
    const months: Record<string, number> = {
      enero: 1, feb: 2, febrero: 2, marzo: 3, mar: 3, abril: 4, abr: 4,
      mayo: 5, junio: 6, jun: 6, julio: 7, jul: 7, agosto: 8, ago: 8,
      septiembre: 9, set: 9, oct: 10, octubre: 10, noviembre: 11, nov: 11,
      diciembre: 12, dic: 12
    };
    const month = months[monthName];
    if (month) {
      let y = year;
      const candidate = new Date(y, month - 1, day);
      if (!explicitMatch[3] && candidate < refDate) y++;
      const result = new Date(y, month - 1, day);
      if (result.getMonth() === month - 1) {
        const ds = formatDate(result, timezone);
        return { dateStr: ds, dayName: getDayName(result, timezone), label: `${ds} (${getDayName(result, timezone)})` };
      }
    }
  }

  // "24/07/2026" or "24/07" or "2026-07-24" (ISO)
  const datePatterns = [
    { re: /^(\d{4})-(\d{1,2})-(\d{1,2})$/, y: 1, m: 2, d: 3 },
    { re: /(\d{1,2})\/(\d{1,2})\/(\d{4})/, y: 3, m: 2, d: 1 },
    { re: /(\d{1,2})\/(\d{1,2})(?!\/)/, y: 0, m: 2, d: 1 }
  ];
  for (const p of datePatterns) {
    const match = msg.match(p.re);
    if (match) {
      let year = p.y ? parseInt(match[p.y]) : refDate.getFullYear();
      const month = parseInt(match[p.m]);
      const day = parseInt(match[p.d]);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        if (!match[p.y]) {
          const candidate = new Date(year, month - 1, day);
          if (candidate < refDate) year++;
        }
        const result = new Date(year, month - 1, day);
        if (result.getMonth() === month - 1) {
          const ds = formatDate(result, timezone);
          return { dateStr: ds, dayName: getDayName(result, timezone), label: `${ds} (${getDayName(result, timezone)})` };
        }
      }
    }
  }

  // --- Relative day expressions ---

  if (msg.includes('pasado mañana') || msg.includes('pasado manana') || msg === 'pasado') {
    const d = new Date(refDate);
    d.setDate(d.getDate() + 2);
    const ds = formatDate(d, timezone);
    return { dateStr: ds, dayName: getDayName(d, timezone), label: `pasado mañana (${ds})` };
  }

  // "mañana" as "tomorrow" (standalone word, not "por la mañana" / "de la mañana")
  const isTomorrow = (/\bmañana\b/.test(msg) || /\bmanana\b/.test(msg)) &&
    !/por\s+(la\s+)?mañana/i.test(msg) && !/por\s+(la\s+)?manana/i.test(msg) &&
    !/de\s+(la\s+)?mañana/i.test(msg) && !/de\s+(la\s+)?manana/i.test(msg);
  if (isTomorrow) {
    const d = new Date(refDate);
    d.setDate(d.getDate() + 1);
    const ds = formatDate(d, timezone);
    return { dateStr: ds, dayName: getDayName(d, timezone), label: `mañana (${ds})` };
  }

  if (/\bhoy\b/.test(msg)) {
    const ds = formatDate(refDate, timezone);
    return { dateStr: ds, dayName: getDayName(refDate, timezone), label: `hoy (${ds})` };
  }

  // --- Day-of-week expressions ---

  // Match day names using word boundaries to avoid partial matches (e.g., "vie" in "viene")
  const mentionedDays: { name: string; index: number }[] = [];
  for (const [name, idx] of Object.entries(DAY_NAMES)) {
    const re = new RegExp('\\b' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    if (re.test(msg)) {
      mentionedDays.push({ name: name.toLowerCase(), index: idx });
    }
  }

  if (mentionedDays.length > 0) {
    const day = mentionedDays[mentionedDays.length - 1];
    const isNextWeek = /pr[oó]ximo|que viene|siguiente|pr[oó]xim[oa]/i.test(msg);

    if (isNextWeek) {
      // Semantics: "[day] que viene" / "próximo [day]" → the immediate next occurrence of that day.
      // If today IS that day, "próximo [day]" means 7 days from now (next week, not today).
      // This is consistent with bare day names ("lunes" = next Monday from today).
      // The "que viene" / "próximo" modifier does NOT add an extra week; it only labels the intent.
      const d = new Date(refDate);
      let daysUntil = day.index - getDayIndex(d, timezone);
      if (daysUntil <= 0) daysUntil += 7;
      d.setDate(d.getDate() + daysUntil);
      return { dateStr: formatDate(d, timezone), dayName: getDayName(d, timezone), label: `${day.name} próximo (${formatDate(d, timezone)})` };
    }

    const isEste = msg.includes('este ') || msg.includes('esta ') || msg.includes('éste ') || msg.includes('ésta ');

    const d = new Date(refDate);
    let daysUntil = day.index - getDayIndex(d, timezone);

    if (isEste) {
      // Map JS Sunday=0 to Mon-Sun week: Mon=0, Tue=1, ..., Sun=6
      const monSun = (jsIdx: number) => jsIdx === 0 ? 6 : jsIdx - 1;
      const todayMS = monSun(getDayIndex(d, timezone));
      const targetMS = monSun(day.index);
      daysUntil = targetMS - todayMS;
      if (daysUntil < 0) return null;
    } else {
      if (daysUntil <= 0) daysUntil += 7;
    }

    d.setDate(d.getDate() + daysUntil);
    const ds = formatDate(d, timezone);
    return { dateStr: ds, dayName: getDayName(d, timezone), label: `${day.name} (${ds})` };
  }

  return null;
}

/**
 * Validate that a date's day of week matches a customer's request.
 */
export function validateDayMatch(
  dateStr: string,
  customerMessage: string,
  timezone: string = 'Europe/Madrid'
): boolean {
  const msg = customerMessage.toLowerCase();
  const date = new Date(dateStr + 'T12:00:00');
  const actualDayIndex = getDayIndex(date, timezone);

  for (const [name, idx] of Object.entries(DAY_NAMES)) {
    const re = new RegExp('\\b' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    if (re.test(msg)) {
      return idx === actualDayIndex;
    }
  }

  return true; // No day mentioned, no validation needed
}

/**
 * Get the window of today for business operations in the given timezone.
 */
export function getTodayInTimezone(timezone: string = 'Europe/Madrid'): string {
  const d = new Date();
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(d);
}

export { getDayName, getDayIndex, startOfDay };
