import { describe, it, expect } from 'vitest';
import { getLocalDateKey, getLocalTimeKey, isLocalToday, formatDisplayDate, getSafeTimestamp, toLocalDateString } from '../dateUtils';

describe('dateUtils', () => {
  it('should format Date instance into local YYYY-MM-DD string', () => {
    const d = new Date(2026, 4, 15, 14, 30); // May 15, 2026
    expect(getLocalDateKey(d)).toBe('2026-05-15');
  });

  it('should format ISO timestamp string into local YYYY-MM-DD string', () => {
    const d = new Date(2026, 8, 18, 10, 0);
    expect(getLocalDateKey(d.toISOString())).toBe('2026-09-18');
  });

  it('should fallback to current date if input is invalid', () => {
    const today = getLocalDateKey();
    expect(getLocalDateKey('invalid-date')).toBe(today);
  });

  it('should format local time into HH:mm format', () => {
    const d = new Date(2026, 0, 1, 8, 5); // 08:05
    expect(getLocalTimeKey(d)).toBe('08:05');
  });

  it('should handle invalid date for getLocalTimeKey', () => {
    expect(getLocalTimeKey('invalid-time')).toBe('00:00');
  });

  it('should format date for display DD/MM/YYYY', () => {
    expect(formatDisplayDate('2026-09-18')).toBe('18/09/2026');
    expect(formatDisplayDate('2026-01-05T12:00:00Z')).toBe('05/01/2026');
    expect(formatDisplayDate(null)).toBe('-');
  });

  it('should correctly identify if a date is local today', () => {
    const today = getLocalDateKey();
    expect(isLocalToday(today)).toBe(true);
    expect(isLocalToday('2020-01-01')).toBe(false);
    expect(isLocalToday(null)).toBe(false);
  });

  it('should return safe millisecond timestamp', () => {
    expect(getSafeTimestamp(null)).toBe(0);
    expect(getSafeTimestamp(123456789)).toBe(123456789);
    const now = Date.now();
    expect(Math.abs(getSafeTimestamp(new Date()) - now)).toBeLessThan(100);
    expect(getSafeTimestamp('invalid')).toBe(0);
  });

  it('should convert with toLocalDateString', () => {
    expect(toLocalDateString(null)).toBe('');
    const d = new Date(2026, 2, 10);
    expect(toLocalDateString(d)).toBe('2026-03-10');
  });
});
