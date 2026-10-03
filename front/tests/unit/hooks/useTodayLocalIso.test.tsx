import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { useTodayLocalIso } from '@/hooks/useTodayLocalIso';

/** フックの値をそのまま描画する検証用コンポーネント（サーバー描画・hydration の比較に使う）。 */
function TodayProbe() {
  return <span>{useTodayLocalIso()}</span>;
}

beforeEach(() => {
  // Date だけを偽装する（タイマーまで止めると React の内部スケジューリングに影響するため）
  vi.useFakeTimers({ toFake: ['Date'] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useTodayLocalIso', () => {
  it("should return today's date in the local timezone on the client", () => {
    vi.setSystemTime(new Date(2026, 9, 3, 12, 0));
    const { result } = renderHook(() => useTodayLocalIso());
    expect(result.current).toBe('2026-10-03');
  });

  it('should not shift to the previous day right after local midnight', () => {
    vi.setSystemTime(new Date(2026, 0, 1, 0, 5));
    const { result } = renderHook(() => useTodayLocalIso());
    expect(result.current).toBe('2026-01-01');
  });

  it('should render an empty value on the server so that no build-time date is baked in', () => {
    vi.setSystemTime(new Date(2026, 9, 3, 12, 0));
    expect(renderToString(<TodayProbe />)).toBe('<span></span>');
  });

  it('should hydrate server HTML without a mismatch and then show today', async () => {
    vi.setSystemTime(new Date(2026, 9, 3, 12, 0));
    const container = document.createElement('div');
    container.innerHTML = renderToString(<TodayProbe />);
    document.body.appendChild(container);
    const onRecoverableError = vi.fn();

    const root = await act(async () =>
      hydrateRoot(container, <TodayProbe />, { onRecoverableError }),
    );

    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(container.textContent).toBe('2026-10-03');
    act(() => root.unmount());
    container.remove();
  });
});
