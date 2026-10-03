import { describe, it, expect } from 'vitest';
import { toLocalIso } from '@/lib/date';

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
