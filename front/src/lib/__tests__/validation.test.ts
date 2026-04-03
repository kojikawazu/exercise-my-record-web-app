import { describe, it, expect } from 'vitest';
import {
  validateNumericField,
  validatePositiveNumericField,
  computeErrors,
  hasAnyErrors,
} from '../validation';

// ---------------------------------------------------------------------------
// validateNumericField
// ---------------------------------------------------------------------------
describe('validateNumericField', () => {
  // 正常系
  it('should return undefined when value is a valid positive number', () => {
    expect(validateNumericField('55.5')).toBeUndefined();
  });

  it('should return undefined when value is zero (weight=0 is allowed)', () => {
    expect(validateNumericField('0')).toBeUndefined();
  });

  it('should return undefined when value is a decimal string', () => {
    expect(validateNumericField('0.5')).toBeUndefined();
  });

  // 準正常系
  it('should return error when value is empty string', () => {
    expect(validateNumericField('')).toBe('値を入力してください');
  });

  it('should return error when value is negative', () => {
    expect(validateNumericField('-1')).toBe('正しい数値を入力してください');
  });

  it('should return error when value is non-numeric string', () => {
    expect(validateNumericField('abc')).toBe('正しい数値を入力してください');
  });
});

// ---------------------------------------------------------------------------
// validatePositiveNumericField
// ---------------------------------------------------------------------------
describe('validatePositiveNumericField', () => {
  // 正常系
  it('should return undefined when value is positive', () => {
    expect(validatePositiveNumericField('1')).toBeUndefined();
  });

  it('should return undefined when value is a positive decimal', () => {
    expect(validatePositiveNumericField('0.1')).toBeUndefined();
  });

  // 準正常系
  it('should return error when value is empty string', () => {
    expect(validatePositiveNumericField('')).toBe('値を入力してください');
  });

  it('should return error when value is zero (not positive)', () => {
    expect(validatePositiveNumericField('0')).toBe('正しい数値を入力してください');
  });

  it('should return error when value is negative', () => {
    expect(validatePositiveNumericField('-5')).toBe('正しい数値を入力してください');
  });

  it('should return error when value is NaN string', () => {
    expect(validatePositiveNumericField('abc')).toBe('正しい数値を入力してください');
  });
});

// ---------------------------------------------------------------------------
// computeErrors
// ---------------------------------------------------------------------------

const validWorkout = {
  id: 'w1',
  part: '胸',
  name: 'ベンチプレス',
  sets: '3',
  reps: '10',
  weight: '60',
};

const validCardio = {
  id: 'c1',
  type: 'ラン',
  minutes: '30',
  distance: '5',
};

describe('computeErrors', () => {
  // --- 正常系 ---

  it('should return no errors when all fields are valid (no cardio)', () => {
    const errors = computeErrors('2026-01-01', [validWorkout], []);
    expect(errors.date).toBeUndefined();
    expect(errors.workouts).toEqual({});
    expect(errors.cardios).toEqual({});
  });

  it('should return no errors when cardio is also valid', () => {
    const errors = computeErrors('2026-01-01', [validWorkout], [validCardio]);
    expect(errors.workouts).toEqual({});
    expect(errors.cardios).toEqual({});
  });

  it('should skip completely empty cardio rows (both minutes and distance empty)', () => {
    const emptyCardio = { id: 'c2', type: 'ウォーク', minutes: '', distance: '' };
    const errors = computeErrors('2026-01-01', [validWorkout], [emptyCardio]);
    expect(errors.cardios).toEqual({});
  });

  it('should allow weight=0 (no error)', () => {
    const workout = { ...validWorkout, weight: '0' };
    const errors = computeErrors('2026-01-01', [workout], []);
    expect(errors.workouts).toEqual({});
  });

  it('should allow decimal values for all numeric fields', () => {
    const workout = { ...validWorkout, sets: '1.5', reps: '10.5', weight: '55.5' };
    const cardio = { ...validCardio, minutes: '30.5', distance: '5.5' };
    const errors = computeErrors('2026-01-01', [workout], [cardio]);
    expect(errors.workouts).toEqual({});
    expect(errors.cardios).toEqual({});
  });

  // --- 準正常系 ---

  it('should return date error when date is empty', () => {
    const errors = computeErrors('', [validWorkout], []);
    expect(errors.date).toBe('日付を選択してください');
  });

  it('should return part error when part is empty', () => {
    const workout = { ...validWorkout, part: '' };
    const errors = computeErrors('2026-01-01', [workout], []);
    expect(errors.workouts['w1'].part).toBe('部位を選択してください');
  });

  it('should return name error when name is whitespace only', () => {
    const workout = { ...validWorkout, name: '   ' };
    const errors = computeErrors('2026-01-01', [workout], []);
    expect(errors.workouts['w1'].name).toBe('種目名を入力してください');
  });

  it('should return sets error when sets is empty', () => {
    const workout = { ...validWorkout, sets: '' };
    const errors = computeErrors('2026-01-01', [workout], []);
    expect(errors.workouts['w1'].sets).toBe('値を入力してください');
  });

  it('should return sets error when sets is zero', () => {
    const workout = { ...validWorkout, sets: '0' };
    const errors = computeErrors('2026-01-01', [workout], []);
    expect(errors.workouts['w1'].sets).toBe('正しい数値を入力してください');
  });

  it('should return sets error when sets is negative', () => {
    const workout = { ...validWorkout, sets: '-1' };
    const errors = computeErrors('2026-01-01', [workout], []);
    expect(errors.workouts['w1'].sets).toBe('正しい数値を入力してください');
  });

  it('should return weight error when weight is empty', () => {
    const workout = { ...validWorkout, weight: '' };
    const errors = computeErrors('2026-01-01', [workout], []);
    expect(errors.workouts['w1'].weight).toBe('値を入力してください');
  });

  it('should return weight error when weight is negative', () => {
    const workout = { ...validWorkout, weight: '-1' };
    const errors = computeErrors('2026-01-01', [workout], []);
    expect(errors.workouts['w1'].weight).toBe('正しい数値を入力してください');
  });

  it('should return cardio minutes error when only distance is filled', () => {
    const cardio = { ...validCardio, minutes: '', distance: '5' };
    const errors = computeErrors('2026-01-01', [validWorkout], [cardio]);
    expect(errors.cardios['c1'].minutes).toBe('値を入力してください');
    expect(errors.cardios['c1'].distance).toBeUndefined();
  });

  it('should return cardio distance error when only minutes is filled', () => {
    const cardio = { ...validCardio, minutes: '30', distance: '' };
    const errors = computeErrors('2026-01-01', [validWorkout], [cardio]);
    expect(errors.cardios['c1'].distance).toBe('値を入力してください');
    expect(errors.cardios['c1'].minutes).toBeUndefined();
  });

  it('should return cardio minutes error when minutes is zero', () => {
    const cardio = { ...validCardio, minutes: '0' };
    const errors = computeErrors('2026-01-01', [validWorkout], [cardio]);
    expect(errors.cardios['c1'].minutes).toBe('正しい数値を入力してください');
  });

  it('should only report errors for the invalid workout row when multiple rows exist', () => {
    const workout2 = { id: 'w2', part: '', name: 'スクワット', sets: '3', reps: '10', weight: '80' };
    const errors = computeErrors('2026-01-01', [validWorkout, workout2], []);
    expect(errors.workouts['w1']).toBeUndefined();
    expect(errors.workouts['w2'].part).toBe('部位を選択してください');
  });

  it('should return sets error when sets is NaN string', () => {
    const workout = { ...validWorkout, sets: 'abc' };
    const errors = computeErrors('2026-01-01', [workout], []);
    expect(errors.workouts['w1'].sets).toBe('正しい数値を入力してください');
  });

  // --- 異常系 ---

  it('should return no errors when workouts array is empty', () => {
    const errors = computeErrors('2026-01-01', [], []);
    expect(errors.workouts).toEqual({});
  });

  it('should return no errors when cardios array is empty', () => {
    const errors = computeErrors('2026-01-01', [validWorkout], []);
    expect(errors.cardios).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// hasAnyErrors
// ---------------------------------------------------------------------------
describe('hasAnyErrors', () => {
  it('should return false when there are no errors', () => {
    const errors = computeErrors('2026-01-01', [validWorkout], []);
    expect(hasAnyErrors(errors)).toBe(false);
  });

  it('should return true when date error is present', () => {
    const errors = computeErrors('', [validWorkout], []);
    expect(hasAnyErrors(errors)).toBe(true);
  });

  it('should return true when a workout error is present', () => {
    const workout = { ...validWorkout, part: '' };
    const errors = computeErrors('2026-01-01', [workout], []);
    expect(hasAnyErrors(errors)).toBe(true);
  });

  it('should return true when a cardio error is present', () => {
    const cardio = { ...validCardio, minutes: '30', distance: '' };
    const errors = computeErrors('2026-01-01', [validWorkout], [cardio]);
    expect(hasAnyErrors(errors)).toBe(true);
  });

  it('should return false when cardio row is completely empty (skipped)', () => {
    const emptyCardio = { id: 'c2', type: 'ウォーク', minutes: '', distance: '' };
    const errors = computeErrors('2026-01-01', [validWorkout], [emptyCardio]);
    expect(hasAnyErrors(errors)).toBe(false);
  });
});
