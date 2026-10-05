import { describe, it, expect } from 'vitest';
import { buildMonthCells, parseMonthParam, shiftMonth } from '@/lib/calendar';

describe('parseMonthParam', () => {
  // 正常系
  it('should accept a YYYY-MM month', () => {
    expect(parseMonthParam('2026-02')).toBe('2026-02');
  });

  it('should accept the first and last months of a year', () => {
    expect(parseMonthParam('2026-01')).toBe('2026-01');
    expect(parseMonthParam('2026-12')).toBe('2026-12');
  });

  // 準正常系
  it('should reject a missing value', () => {
    expect(parseMonthParam(undefined)).toBeNull();
    expect(parseMonthParam(null)).toBeNull();
    expect(parseMonthParam('')).toBeNull();
  });

  it('should reject out-of-range months', () => {
    expect(parseMonthParam('2026-00')).toBeNull();
    expect(parseMonthParam('2026-13')).toBeNull();
  });

  it('should reject months without zero padding or with extra parts', () => {
    expect(parseMonthParam('2026-2')).toBeNull();
    expect(parseMonthParam('2026-02-01')).toBeNull();
    expect(parseMonthParam(' 2026-02')).toBeNull();
  });

  it('should reject a value specified multiple times (array)', () => {
    expect(parseMonthParam(['2026-02', '2026-03'])).toBeNull();
  });

  // 異常系
  it('should reject non-month strings and years starting with zero', () => {
    expect(parseMonthParam('abc')).toBeNull();
    expect(parseMonthParam('0999-01')).toBeNull();
    expect(parseMonthParam('2026-02; DROP TABLE')).toBeNull();
  });
});

describe('shiftMonth', () => {
  it('should move to the next and previous month', () => {
    expect(shiftMonth('2026-02', 1)).toBe('2026-03');
    expect(shiftMonth('2026-02', -1)).toBe('2026-01');
  });

  it('should roll over the year forward from December', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });

  it('should roll over the year backward from January', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  });
});

describe('buildMonthCells', () => {
  it('should pad the leading cells up to the weekday of the 1st (Sunday start)', () => {
    // 2026-02-01 は日曜 → 先頭の空白なし。28 日
    const cells = buildMonthCells(2026, 1);
    expect(cells[0]).toBe(1);
    expect(cells).toHaveLength(28);
  });

  it('should pad six blanks when the 1st is a Saturday', () => {
    // 2026-08-01 は土曜
    const cells = buildMonthCells(2026, 7);
    expect(cells.slice(0, 7)).toEqual([null, null, null, null, null, null, 1]);
    expect(cells.at(-1)).toBe(31);
  });

  it('should include February 29 in a leap year', () => {
    // 2028-02-01 は火曜（空白 2）、うるう年で 29 日
    const cells = buildMonthCells(2028, 1);
    expect(cells.slice(0, 3)).toEqual([null, null, 1]);
    expect(cells.at(-1)).toBe(29);
  });

  it('should end at the 30th for a 30-day month', () => {
    expect(buildMonthCells(2026, 3).at(-1)).toBe(30);
  });
});
