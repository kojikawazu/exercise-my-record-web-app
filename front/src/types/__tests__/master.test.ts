import { describe, expect, it } from 'vitest';
import { MASTER_TYPES, isMasterType } from '@/types/master';

describe('MASTER_TYPES', () => {
  // 正常系: 管理画面のタブ順がこの配列順に従うため、順序自体が仕様。
  it('部位・種目・有酸素種別をこの順で保持する', () => {
    expect(MASTER_TYPES).toEqual(['body-parts', 'exercises', 'cardio-types']);
  });
});

describe('isMasterType', () => {
  // 正常系
  it.each(MASTER_TYPES)('有効な種別 %s を受け入れる', (type) => {
    expect(isMasterType(type)).toBe(true);
  });

  // 準正常系: クエリ未指定・空クエリは想定内の入力。
  it('未指定（null）を拒否する', () => {
    expect(isMasterType(null)).toBe(false);
  });

  it('空文字を拒否する', () => {
    expect(isMasterType('')).toBe(false);
  });

  // 準正常系: 前後空白は正規化せず拒否する（API が受け取る値をそのまま判定するため）。
  it('前後に空白を含む値を拒否する', () => {
    expect(isMasterType(' body-parts ')).toBe(false);
  });

  // 準正常系: 大文字小文字は区別する。
  it('大文字違いの値を拒否する', () => {
    expect(isMasterType('BODY-PARTS')).toBe(false);
  });

  // 異常系: 存在しない種別。
  it('未知の種別を拒否する', () => {
    expect(isMasterType('unknown-type')).toBe(false);
  });

  // 異常系: Object.prototype 由来のキーを種別と誤認しない。
  it('プロトタイプ由来のキーを拒否する', () => {
    expect(isMasterType('constructor')).toBe(false);
    expect(isMasterType('toString')).toBe(false);
  });
});
