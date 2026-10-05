import { describe, it, expect } from 'vitest';
import { addDays, parseIsoDate, toLocalIso } from '@/lib/date';

describe('toLocalIso', () => {
  it('should format a date as YYYY-MM-DD', () => {
    expect(toLocalIso(new Date(2026, 11, 31, 12, 0))).toBe('2026-12-31');
  });

  it('should zero-pad single-digit months and days', () => {
    expect(toLocalIso(new Date(2026, 0, 5, 12, 0))).toBe('2026-01-05');
  });

  it('should use the local calendar date right after local midnight', () => {
    // UTC より進んだタイムゾーン（JST 等）では toISOString() が前日を返す時刻帯
    expect(toLocalIso(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01');
  });

  it('should use the local calendar date right before local midnight', () => {
    // UTC より遅れたタイムゾーンでは toISOString() が翌日を返す時刻帯
    expect(toLocalIso(new Date(2026, 11, 31, 23, 55))).toBe('2026-12-31');
  });
});

describe('parseIsoDate', () => {
  it('should accept a valid date', () => {
    expect(parseIsoDate('2026-02-28')).toBe('2026-02-28');
    expect(parseIsoDate('2028-02-29')).toBe('2028-02-29');
  });

  it('should reject a missing value', () => {
    expect(parseIsoDate(null)).toBeNull();
    expect(parseIsoDate(undefined)).toBeNull();
    expect(parseIsoDate('')).toBeNull();
  });

  it('should reject dates that do not exist on the calendar', () => {
    expect(parseIsoDate('2026-02-29')).toBeNull();
    expect(parseIsoDate('2026-02-30')).toBeNull();
    expect(parseIsoDate('2026-04-31')).toBeNull();
  });

  it('should reject malformed values', () => {
    expect(parseIsoDate('2026-2-1')).toBeNull();
    expect(parseIsoDate('2026-02-01T00:00:00Z')).toBeNull();
    expect(parseIsoDate('0999-01-01')).toBeNull();
    expect(parseIsoDate('abc')).toBeNull();
  });
});

describe('addDays', () => {
  it('should move forward and backward by days', () => {
    expect(addDays('2026-10-07', 1)).toBe('2026-10-08');
    expect(addDays('2026-10-07', -7)).toBe('2026-09-30');
  });

  it('should cross month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('should account for February 29 in a leap year', () => {
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29');
  });

  it('should return the same date for 0 days', () => {
    expect(addDays('2026-10-07', 0)).toBe('2026-10-07');
  });
});
