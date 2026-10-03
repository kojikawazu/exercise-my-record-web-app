import { describe, expect, it } from 'vitest';
import { toRecordRequest } from '@/lib/recordForm';

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
