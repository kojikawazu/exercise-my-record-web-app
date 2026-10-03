import { describe, expect, it } from 'vitest';
import {
  createWorkoutRow,
  isFormBlank,
  toFormRows,
  toRecordRequest,
  withCurrentOption,
} from '@/lib/recordForm';

const workout = {
  id: 'w1',
  part: '胸',
  name: 'ベンチプレス',
  sets: '3',
  reps: '10',
  weight: '60.5',
};

describe('toRecordRequest', () => {
  it('should convert numeric strings to numbers and drop row ids', () => {
    const result = toRecordRequest({
      memo: '体調良好',
      workouts: [workout],
      cardios: [{ id: 'c1', type: 'ウォーク', minutes: '30', distance: '2.5' }],
    });
    expect(result).toEqual({
      memo: '体調良好',
      workouts: [{ part: '胸', name: 'ベンチプレス', sets: 3, reps: 10, weight: 60.5 }],
      cardios: [{ type: 'ウォーク', minutes: 30, distance: 2.5 }],
    });
  });

  it('should trim the memo and send null when it is blank', () => {
    expect(toRecordRequest({ memo: '  メモ  ', workouts: [], cardios: [] }).memo).toBe('メモ');
    expect(toRecordRequest({ memo: '   ', workouts: [], cardios: [] }).memo).toBeNull();
  });

  it('should treat empty numeric strings as 0', () => {
    const result = toRecordRequest({
      memo: '',
      workouts: [{ ...workout, sets: '', reps: '', weight: '' }],
      cardios: [{ id: 'c1', type: 'ラン', minutes: '20', distance: '' }],
    });
    expect(result.workouts[0]).toEqual({
      part: '胸',
      name: 'ベンチプレス',
      sets: 0,
      reps: 0,
      weight: 0,
    });
    expect(result.cardios).toEqual([{ type: 'ラン', minutes: 20, distance: 0 }]);
  });

  it('should exclude cardio rows whose minutes and distance are both empty', () => {
    const result = toRecordRequest({
      memo: '',
      workouts: [workout],
      cardios: [
        { id: 'c1', type: 'ラン', minutes: '', distance: '' },
        { id: 'c2', type: 'ラン', minutes: '10', distance: '1' },
      ],
    });
    expect(result.cardios).toEqual([{ type: 'ラン', minutes: 10, distance: 1 }]);
  });

  it('should send null cardios when no cardio row has input', () => {
    const result = toRecordRequest({
      memo: '',
      workouts: [workout],
      cardios: [{ id: 'c1', type: 'ラン', minutes: '', distance: '' }],
    });
    expect(result.cardios).toBeNull();
  });
});

describe('withCurrentOption', () => {
  const options = ['胸', '背中'];

  it('should return the options as is when the current value is included', () => {
    expect(withCurrentOption(options, '背中')).toEqual(['胸', '背中']);
  });

  it('should prepend the current value when it is missing from the master', () => {
    expect(withCurrentOption(options, '腹')).toEqual(['腹', '胸', '背中']);
  });

  it('should not prepend an empty (unselected) value', () => {
    expect(withCurrentOption(options, '')).toEqual(['胸', '背中']);
  });

  it('should keep the current value even when the master is empty', () => {
    expect(withCurrentOption([], 'ラン')).toEqual(['ラン']);
  });

  it('should not mutate the given options', () => {
    const source = ['胸'];
    withCurrentOption(source, '脚');
    expect(source).toEqual(['胸']);
  });
});

describe('createWorkoutRow', () => {
  it('should create an empty row with a unique id', () => {
    const a = createWorkoutRow();
    const b = createWorkoutRow();
    expect(a).toEqual({ id: a.id, part: '', name: '', sets: '', reps: '', weight: '' });
    expect(a.id).not.toBe(b.id);
  });
});

describe('toFormRows', () => {
  const detail = {
    date: '2026-02-02',
    memo: '体調良好',
    workouts: [
      { id: 'w-db-1', part: '胸', name: 'ベンチプレス', sets: 3, reps: 10, weight: 60.5 },
      { id: 'w-db-2', part: '背中', name: 'デッドリフト', sets: 3, reps: 5, weight: 0 },
    ],
    cardios: [{ type: 'ラン', minutes: 30, distance: 5 }],
  };

  it('should convert numbers to strings and keep the order', () => {
    const rows = toFormRows(detail);
    const id = expect.any(String);
    expect(rows.workouts).toEqual([
      { id, part: '胸', name: 'ベンチプレス', sets: '3', reps: '10', weight: '60.5' },
      { id, part: '背中', name: 'デッドリフト', sets: '3', reps: '5', weight: '0' },
    ]);
    expect(rows.cardios).toEqual([{ id, type: 'ラン', minutes: '30', distance: '5' }]);
  });

  it('should assign new row ids instead of the saved ids', () => {
    const rows = toFormRows(detail);
    const ids = [...rows.workouts, ...rows.cardios].map((r) => r.id);
    expect(ids).not.toContain('w-db-1');
    expect(ids).not.toContain('w-db-2');
    expect(new Set(ids).size).toBe(3);
  });

  it('should not include the date and memo', () => {
    expect(Object.keys(toFormRows(detail)).sort()).toEqual(['cardios', 'workouts']);
  });

  it('should add one empty workout row when the record has no workouts', () => {
    const rows = toFormRows({ ...detail, workouts: [], cardios: [] });
    expect(rows.workouts).toHaveLength(1);
    expect(rows.workouts[0]).toEqual({
      id: rows.workouts[0].id,
      part: '',
      name: '',
      sets: '',
      reps: '',
      weight: '',
    });
    expect(rows.cardios).toEqual([]);
  });
});

describe('isFormBlank', () => {
  const blankRow = { id: 'w1', part: '', name: '', sets: '', reps: '', weight: '' };

  it('should be true when every workout field is empty and there is no cardio row', () => {
    expect(isFormBlank([blankRow, { ...blankRow, id: 'w2' }], [])).toBe(true);
  });

  it('should be false when any workout field has a value', () => {
    expect(isFormBlank([{ ...blankRow, weight: '0' }], [])).toBe(false);
    expect(isFormBlank([{ ...blankRow, part: '胸' }], [])).toBe(false);
  });

  it('should be false when a cardio row exists even if its numbers are empty', () => {
    expect(isFormBlank([blankRow], [{ id: 'c1', type: 'ラン', minutes: '', distance: '' }])).toBe(
      false,
    );
  });
});
