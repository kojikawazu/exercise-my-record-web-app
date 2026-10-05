import { describe, it, expect } from 'vitest';
import { computeStreak } from '@/lib/streak';

describe('computeStreak', () => {
  // 正常系
  it('should count consecutive days ending today', () => {
    expect(computeStreak(['2026-10-07', '2026-10-06', '2026-10-05'], '2026-10-07')).toEqual({
      days: 3,
      from: '2026-10-05',
      to: '2026-10-07',
      recordedToday: true,
    });
  });

  it('should keep the streak alive up to yesterday when today is not recorded yet', () => {
    expect(computeStreak(['2026-10-06', '2026-10-05'], '2026-10-07')).toEqual({
      days: 2,
      from: '2026-10-05',
      to: '2026-10-06',
      recordedToday: false,
    });
  });

  it('should count a single day recorded only today', () => {
    expect(computeStreak(['2026-10-07', '2026-10-05'], '2026-10-07')).toEqual({
      days: 1,
      from: '2026-10-07',
      to: '2026-10-07',
      recordedToday: true,
    });
  });

  // 準正常系
  it('should be 0 when neither today nor yesterday is recorded', () => {
    expect(computeStreak(['2026-10-05', '2026-10-04'], '2026-10-07')).toEqual({
      days: 0,
      from: null,
      to: null,
      recordedToday: false,
    });
  });

  it('should stop counting at a gap', () => {
    const streak = computeStreak(
      ['2026-10-07', '2026-10-06', '2026-10-04', '2026-10-03'],
      '2026-10-07',
    );
    expect(streak.days).toBe(2);
    expect(streak.from).toBe('2026-10-06');
  });

  it('should continue across month, year and leap-day boundaries', () => {
    expect(computeStreak(['2027-01-01', '2026-12-31', '2026-12-30'], '2027-01-01').days).toBe(3);
    expect(computeStreak(['2028-03-01', '2028-02-29', '2028-02-28'], '2028-03-01')).toMatchObject({
      days: 3,
      from: '2028-02-28',
    });
  });

  it('should ignore order and duplicates of the input dates', () => {
    expect(
      computeStreak(['2026-10-05', '2026-10-07', '2026-10-06', '2026-10-07'], '2026-10-07').days,
    ).toBe(3);
  });

  it('should be 0 when there are no records', () => {
    expect(computeStreak([], '2026-10-07')).toEqual({
      days: 0,
      from: null,
      to: null,
      recordedToday: false,
    });
  });

  // 異常系
  it('should not count future dates (after today)', () => {
    // 今日 10/7 は未記録、10/8 は未来 → 昨日 10/6 からの連続のみ
    expect(computeStreak(['2026-10-08', '2026-10-06'], '2026-10-07')).toEqual({
      days: 1,
      from: '2026-10-06',
      to: '2026-10-06',
      recordedToday: false,
    });
  });
});
