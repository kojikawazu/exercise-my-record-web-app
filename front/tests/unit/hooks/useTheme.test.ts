import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useTheme } from '@/hooks/useTheme';

beforeEach(() => {
  document.documentElement.dataset.theme = 'dark';
});

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  vi.restoreAllMocks();
});

describe('useTheme', () => {
  it('should read the current theme from <html data-theme>', () => {
    document.documentElement.dataset.theme = 'light';
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');
  });

  it('should switch the theme and save it for the next visit', async () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme('light'));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
    // 属性の変化は MutationObserver（マイクロタスク）経由で届く
    await waitFor(() => expect(result.current.theme).toBe('light'));
  });

  it('should follow a change made outside the hook', async () => {
    const { result } = renderHook(() => useTheme());
    act(() => {
      document.documentElement.dataset.theme = 'light';
    });
    await waitFor(() => expect(result.current.theme).toBe('light'));
  });

  it('should treat an invalid attribute value as dark', () => {
    document.documentElement.dataset.theme = 'sepia';
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
  });

  it('should still switch the display when saving fails', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme('light'));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('theme')).toBeNull();
  });
});
