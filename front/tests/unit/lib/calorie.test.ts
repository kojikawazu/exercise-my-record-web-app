import { describe, it, expect } from 'vitest';
import {
  calculateCardioCalories,
  calculateStrengthCalories,
  estimateDailyCalories,
  formatCalories,
  toCalorieCardioType,
} from '@/lib/calorie';

describe('calculateCardioCalories', () => {
  // --- 正常系 ---

  it('should calculate calories for ラン (MET=8.0)', () => {
    expect(calculateCardioCalories(60, 60, 'ラン')).toBe(480);
  });

  it('should calculate calories for ウォーク (MET=4.0)', () => {
    expect(calculateCardioCalories(60, 60, 'ウォーク')).toBe(240);
  });

  it('should treat "run" alias same as ラン', () => {
    expect(calculateCardioCalories(60, 60, 'run')).toBe(480);
  });

  it('should treat "walk" alias same as ウォーク', () => {
    expect(calculateCardioCalories(60, 60, 'walk')).toBe(240);
  });

  it('should treat "Running" alias same as ラン', () => {
    expect(calculateCardioCalories(60, 60, 'Running')).toBe(480);
  });

  it('should treat "Walking" alias same as ウォーク', () => {
    expect(calculateCardioCalories(60, 60, 'Walking')).toBe(240);
  });

  it('should calculate correctly for 30 minutes (half hour)', () => {
    expect(calculateCardioCalories(60, 30, 'ラン')).toBe(240);
  });

  // --- 準正常系 ---

  it('should return 0 for unknown cardio type (MET defaults to 0)', () => {
    expect(calculateCardioCalories(60, 60, 'cycling')).toBe(0);
  });

  it('should return 0 when minutes is 0', () => {
    expect(calculateCardioCalories(60, 0, 'ラン')).toBe(0);
  });

  // --- 異常系 ---

  it('should return 0 when weight is 0', () => {
    expect(calculateCardioCalories(0, 60, 'ラン')).toBe(0);
  });
});

describe('calculateStrengthCalories', () => {
  // --- 正常系 ---

  it('should calculate strength calories correctly', () => {
    expect(calculateStrengthCalories(60, 10)).toBe(60);
  });

  it('should return 0 when totalSets is 0', () => {
    expect(calculateStrengthCalories(60, 0)).toBe(0);
  });

  it('should return 0 when weight is 0', () => {
    expect(calculateStrengthCalories(0, 10)).toBe(0);
  });
});

describe('formatCalories', () => {
  it('should round and append kcal unit', () => {
    expect(formatCalories(123.7)).toBe('124 kcal');
  });

  it('should handle zero', () => {
    expect(formatCalories(0)).toBe('0 kcal');
  });

  it('should round down when decimal is below .5', () => {
    expect(formatCalories(99.4)).toBe('99 kcal');
  });
});

describe('toCalorieCardioType', () => {
  it('should keep walk as walk', () => {
    expect(toCalorieCardioType('ウォーク')).toBe('ウォーク');
  });

  it('should treat run as run', () => {
    expect(toCalorieCardioType('ラン')).toBe('ラン');
  });

  it('should treat any other type (including unknown ones) as run', () => {
    // 一覧・詳細の既存挙動を固定する（係数を持たない種別も ラン として算定する）
    expect(toCalorieCardioType('サイクリング')).toBe('ラン');
    expect(toCalorieCardioType('walk')).toBe('ラン');
    expect(toCalorieCardioType('')).toBe('ラン');
  });
});

describe('estimateDailyCalories', () => {
  it('should sum strength and cardio calories', () => {
    // 筋トレ 60kg × 0.1 × 10 セット = 60、ラン 60kg × 8.0 × 0.5h = 240
    expect(estimateDailyCalories(60, 10, [{ type: 'ラン', minutes: 30 }])).toBe(300);
  });

  it('should add every cardio entry', () => {
    // ラン 240 + ウォーク 60kg × 4.0 × 0.5h = 120
    expect(
      estimateDailyCalories(60, 0, [
        { type: 'ラン', minutes: 30 },
        { type: 'ウォーク', minutes: 30 },
      ]),
    ).toBe(360);
  });

  it('should return strength calories only when there is no cardio', () => {
    expect(estimateDailyCalories(60, 10, [])).toBe(60);
  });

  it('should count an unknown cardio type as 0 when the type is passed as is', () => {
    expect(estimateDailyCalories(60, 0, [{ type: 'サイクリング', minutes: 60 }])).toBe(0);
  });

  it('should return 0 when the weight is 0', () => {
    expect(estimateDailyCalories(0, 10, [{ type: 'ラン', minutes: 30 }])).toBe(0);
  });
});
