import { describe, it, expect } from 'vitest';
import { buildTrendSeries, parseIsoDate, parseTrendPeriod, trendFromDate } from '@/lib/trends';

describe('parseTrendPeriod', () => {
  it('should accept each period option', () => {
    expect(parseTrendPeriod('1w')).toBe('1w');
    expect(parseTrendPeriod('1m')).toBe('1m');
    expect(parseTrendPeriod('3m')).toBe('3m');
    expect(parseTrendPeriod('all')).toBe('all');
  });

  it('should default to 1m when the period is missing', () => {
    expect(parseTrendPeriod(undefined)).toBe('1m');
  });

  it('should default to 1m for an unknown or differently cased value', () => {
    expect(parseTrendPeriod('1y')).toBe('1m');
    expect(parseTrendPeriod('ALL')).toBe('1m');
    expect(parseTrendPeriod('')).toBe('1m');
  });

  it('should default to 1m when the period is specified multiple times', () => {
    expect(parseTrendPeriod(['1w', '3m'])).toBe('1m');
  });
});

describe('trendFromDate', () => {
  it('should include today in the 7/30/90 day windows', () => {
    expect(trendFromDate('2026-10-31', '1w')).toBe('2026-10-25');
    expect(trendFromDate('2026-10-31', '1m')).toBe('2026-10-02');
    expect(trendFromDate('2026-10-31', '3m')).toBe('2026-08-03');
  });

  it('should return null for all (no start date)', () => {
    expect(trendFromDate('2026-10-31', 'all')).toBeNull();
  });

  it('should cross month and year boundaries', () => {
    expect(trendFromDate('2026-03-03', '1w')).toBe('2026-02-25');
    expect(trendFromDate('2026-01-05', '1m')).toBe('2025-12-07');
  });

  it('should account for February 29 in a leap year', () => {
    // 2028-03-01 から遡って 7 日（当日含む）: 2/24〜3/1（2/29 を含む）
    expect(trendFromDate('2028-03-01', '1w')).toBe('2028-02-24');
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

describe('buildTrendSeries', () => {
  const points = [
    { date: '2026-01-15', totalSets: 2, cardioDistance: 0, cardios: [] },
    {
      date: '2026-02-02',
      totalSets: 9,
      cardioDistance: 5,
      cardios: [{ type: 'ラン', minutes: 30 }],
    },
  ];

  it('should build sets and distance series in the given order', () => {
    const series = buildTrendSeries(points, 65);
    expect(series.sets).toEqual([
      { date: '2026-01-15', value: 2 },
      { date: '2026-02-02', value: 9 },
    ]);
    expect(series.distance).toEqual([
      { date: '2026-01-15', value: 0 },
      { date: '2026-02-02', value: 5 },
    ]);
  });

  it('should compute rounded calories with the current weight', () => {
    // 2026-01-15: 65 × 0.1 × 2 = 13 / 2026-02-02: 58.5 + 260 = 318.5 → 319
    expect(buildTrendSeries(points, 65).calories).toEqual([
      { date: '2026-01-15', value: 13 },
      { date: '2026-02-02', value: 319 },
    ]);
  });

  it('should count an unknown cardio type as run, like the list and detail screens', () => {
    const series = buildTrendSeries(
      [
        {
          date: '2026-02-03',
          totalSets: 0,
          cardioDistance: 10,
          cardios: [{ type: 'サイクリング', minutes: 30 }],
        },
      ],
      60,
    );
    // ラン扱い: 60 × 8 × 0.5 = 240
    expect(series.calories).toEqual([{ date: '2026-02-03', value: 240 }]);
  });

  it('should not build the calorie series when the weight is not set', () => {
    const series = buildTrendSeries(points, null);
    expect(series.calories).toBeNull();
    expect(series.sets).toHaveLength(2);
  });

  it('should return empty series for no points', () => {
    expect(buildTrendSeries([], 65)).toEqual({ sets: [], distance: [], calories: [] });
  });
});
