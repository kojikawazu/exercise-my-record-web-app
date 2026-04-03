import { describe, it, expect } from 'vitest';
import {
  calculateCardioCalories,
  calculateStrengthCalories,
  formatCalories,
} from '../calorie';

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
    // @ts-expect-error testing unknown type
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
