import { describe, it, expect } from 'vitest';
import { changeRate, summarizeRange, weekRanges } from '@/lib/dashboard';

describe('weekRanges', () => {
  it('should start this week on Monday and compare with last week up to the same weekday', () => {
    // 2026-10-07 は水曜
    expect(weekRanges('2026-10-07')).toEqual({
      thisWeek: { from: '2026-10-05', to: '2026-10-07' },
      lastWeek: { from: '2026-09-28', to: '2026-09-30' },
    });
  });

  it('should treat Monday as a one-day week', () => {
    expect(weekRanges('2026-10-05')).toEqual({
      thisWeek: { from: '2026-10-05', to: '2026-10-05' },
      lastWeek: { from: '2026-09-28', to: '2026-09-28' },
    });
  });

  it('should treat Sunday as the last day of the week (not the first)', () => {
    // 2026-10-11 は日曜 → 今週は 10/5（月）から
    expect(weekRanges('2026-10-11')).toEqual({
      thisWeek: { from: '2026-10-05', to: '2026-10-11' },
      lastWeek: { from: '2026-09-28', to: '2026-10-04' },
    });
  });

  it('should cross month and year boundaries', () => {
    // 2027-01-01 は金曜 → 月曜は 2026-12-28
    expect(weekRanges('2027-01-01')).toEqual({
      thisWeek: { from: '2026-12-28', to: '2027-01-01' },
      lastWeek: { from: '2026-12-21', to: '2026-12-25' },
    });
  });
});

describe('summarizeRange', () => {
  const points = [
    { date: '2026-09-28', totalSets: 4, cardioDistance: 0, cardios: [] },
    {
      date: '2026-09-30',
      totalSets: 6,
      cardioDistance: 5,
      cardios: [{ type: 'ラン', minutes: 30 }],
    },
    { date: '2026-10-01', totalSets: 99, cardioDistance: 0, cardios: [] },
    { date: '2026-10-05', totalSets: 10, cardioDistance: 0, cardios: [] },
  ];

  it('should count days, sum sets and calories within the range (both ends included)', () => {
    // 9/28: 60 × 0.1 × 4 = 24 / 9/30: 36 + ラン 60 × 8 × 0.5 = 240 → 276 → 合計 300
    expect(summarizeRange(points, { from: '2026-09-28', to: '2026-09-30' }, 60)).toEqual({
      days: 2,
      totalSets: 10,
      calories: 300,
    });
  });

  it('should exclude days after the range end (last week beyond the same weekday)', () => {
    // 10/1 は先週の範囲（〜9/30）の外
    expect(summarizeRange(points, { from: '2026-09-28', to: '2026-09-30' }, 60).totalSets).toBe(10);
  });

  it('should return zeros for a range without records', () => {
    expect(summarizeRange(points, { from: '2026-10-06', to: '2026-10-07' }, 60)).toEqual({
      days: 0,
      totalSets: 0,
      calories: 0,
    });
  });

  it('should return null calories when the weight is not set', () => {
    expect(summarizeRange(points, { from: '2026-10-05', to: '2026-10-05' }, null)).toEqual({
      days: 1,
      totalSets: 10,
      calories: null,
    });
  });

  it('should count an unknown cardio type as run, like the other screens', () => {
    const cycling = [
      {
        date: '2026-10-05',
        totalSets: 0,
        cardioDistance: 10,
        cardios: [{ type: 'サイクリング', minutes: 30 }],
      },
    ];
    expect(summarizeRange(cycling, { from: '2026-10-05', to: '2026-10-05' }, 60).calories).toBe(
      240,
    );
  });
});

describe('changeRate', () => {
  it('should return the rounded increase and decrease in percent', () => {
    expect(changeRate(5, 4)).toBe(25);
    expect(changeRate(2, 3)).toBe(-33);
  });

  it('should return 0 when nothing changed', () => {
    expect(changeRate(3, 3)).toBe(0);
  });

  it('should return -100 when this week has nothing', () => {
    expect(changeRate(0, 4)).toBe(-100);
  });

  it('should return null when last week is 0 (the rate is undefined)', () => {
    expect(changeRate(5, 0)).toBeNull();
    expect(changeRate(0, 0)).toBeNull();
  });
});
