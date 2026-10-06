import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildThemeInitScript, parseTheme } from '@/lib/theme';

describe('parseTheme', () => {
  it.each(['dark', 'light'] as const)('should accept %s', (value) => {
    expect(parseTheme(value)).toBe(value);
  });

  it.each([
    ['null (nothing saved)', null],
    ['an unknown value', 'sepia'],
    ['a different case', 'Dark'],
    ['an empty string', ''],
    ['a non-string', 1],
  ])('should fall back to dark for %s', (_label, value) => {
    expect(parseTheme(value)).toBe('dark');
  });
});

describe('buildThemeInitScript', () => {
  // 描画前スクリプトは文字列として <head> に埋め込まれる。jsdom 上で実際に実行して、
  // 保存値に応じて <html data-theme> を書き換えることを確かめる
  const run = () => new Function(buildThemeInitScript())();

  afterEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    vi.restoreAllMocks();
  });

  it('should apply the saved theme before rendering', () => {
    document.documentElement.dataset.theme = 'dark';
    localStorage.setItem('theme', 'light');
    run();
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('should keep the server default when nothing is saved', () => {
    document.documentElement.dataset.theme = 'dark';
    run();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('should ignore an invalid saved value', () => {
    document.documentElement.dataset.theme = 'dark';
    localStorage.setItem('theme', '<script>');
    run();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('should not throw when localStorage is unavailable', () => {
    document.documentElement.dataset.theme = 'dark';
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    expect(run).not.toThrow();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
