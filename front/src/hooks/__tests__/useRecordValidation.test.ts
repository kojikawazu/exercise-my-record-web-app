import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRecordValidation } from '../useRecordValidation';

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

describe('useRecordValidation', () => {
  // --- 正常系 ---

  it('should initialize with submitted=false and empty displayErrors', () => {
    const { result } = renderHook(() =>
      useRecordValidation('', [validWorkout], []),
    );
    expect(result.current.submitted).toBe(false);
    expect(result.current.displayErrors).toEqual({ workouts: {}, cardios: {} });
  });

  it('should return hasErrors=false when all data is valid', () => {
    const { result } = renderHook(() =>
      useRecordValidation('2026-01-01', [validWorkout], [validCardio]),
    );
    expect(result.current.hasErrors).toBe(false);
  });

  it('should expose errors in displayErrors after setSubmitted(true)', () => {
    const { result } = renderHook(() =>
      useRecordValidation('', [validWorkout], []),
    );
    act(() => {
      result.current.setSubmitted(true);
    });
    expect(result.current.displayErrors.date).toBe('日付を選択してください');
  });

  // --- 準正常系 ---

  it('should hide errors in displayErrors before submission even if rawErrors exist', () => {
    const { result } = renderHook(() =>
      useRecordValidation('', [validWorkout], []),
    );
    expect(result.current.rawErrors.date).toBe('日付を選択してください');
    expect(result.current.displayErrors.date).toBeUndefined();
  });

  it('should return hasErrors=true when date is missing', () => {
    const { result } = renderHook(() =>
      useRecordValidation('', [validWorkout], []),
    );
    expect(result.current.hasErrors).toBe(true);
  });

  it('should reactively update rawErrors when inputs change', () => {
    let date = '';
    const { result, rerender } = renderHook(() =>
      useRecordValidation(date, [validWorkout], []),
    );
    expect(result.current.rawErrors.date).toBe('日付を選択してください');

    date = '2026-01-01';
    rerender();
    expect(result.current.rawErrors.date).toBeUndefined();
  });

  // --- 異常系 ---

  it('should handle empty workouts array without throwing', () => {
    const { result } = renderHook(() =>
      useRecordValidation('2026-01-01', [], []),
    );
    expect(result.current.hasErrors).toBe(false);
    expect(result.current.rawErrors.workouts).toEqual({});
  });
});
