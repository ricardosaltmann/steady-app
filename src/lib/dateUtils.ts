/**
 * Canonical Date & Timezone Utilities for SteadySync
 * 
 * Guarantees that calendar operations, daily tracking, weigh-ins, injections
 * and protocol reminders consistently use the user's LOCAL calendar date
 * instead of Greenwich UTC (which skews dates at night/early morning).
 */

/**
 * Returns a 'YYYY-MM-DD' calendar date string strictly in the user's local timezone.
 * 
 * @param input Optional Date, ISO timestamp, or milliseconds. Defaults to current time.
 * @returns String in 'YYYY-MM-DD' format.
 */
export function getLocalDateKey(input?: Date | string | number): string {
  const date = input 
    ? (input instanceof Date ? input : new Date(input))
    : new Date();

  if (isNaN(date.getTime())) {
    const fallback = new Date();
    const year = fallback.getFullYear();
    const month = String(fallback.getMonth() + 1).padStart(2, '0');
    const day = String(fallback.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Returns current local time in 'HH:mm' format (24-hour).
 */
export function getLocalTimeKey(input?: Date | string | number): string {
  const date = input 
    ? (input instanceof Date ? input : new Date(input))
    : new Date();

  if (isNaN(date.getTime())) return '00:00';

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
}

/**
 * Checks if a given date string ('YYYY-MM-DD' or ISO) corresponds to the local 'today'.
 */
export function isLocalToday(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  return getLocalDateKey(dateStr) === getLocalDateKey();
}

/**
 * Formats a 'YYYY-MM-DD' date string to Brazilian/European display format 'DD/MM/YYYY'.
 */
export function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  const clean = dateStr.slice(0, 10);
  const parts = clean.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  }
  return dateStr;
}

/**
 * Safely parses a date input and returns milliseconds timestamp.
 */
export function getSafeTimestamp(input?: Date | string | number | null): number {
  if (!input) return 0;
  if (typeof input === 'number') return input;
  const d = new Date(input);
  const t = d.getTime();
  return isNaN(t) ? 0 : t;
}
