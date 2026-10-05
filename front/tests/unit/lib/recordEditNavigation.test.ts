import { describe, it, expect } from 'vitest';
import { recordEditHref, resolveEditReturn } from '@/lib/recordEditNavigation';

const ADMIN_LIST = { href: '/admin/records', label: '管理者一覧へ戻る' };

describe('recordEditHref', () => {
  it('should build the edit path without a query when origin is omitted', () => {
    expect(recordEditHref('2026-02-02')).toBe('/admin/records/2026-02-02/edit');
  });

  it('should append from=detail when entering from the detail page', () => {
    expect(recordEditHref('2026-02-02', 'detail')).toBe(
      '/admin/records/2026-02-02/edit?from=detail',
    );
  });
});

describe('resolveEditReturn', () => {
  // 正常系
  it('should return to the record detail when from is detail', () => {
    expect(resolveEditReturn('detail', '2026-02-02')).toEqual({
      href: '/records/2026-02-02',
      label: '詳細へ戻る',
    });
  });

  it('should return to the admin list when from is omitted', () => {
    expect(resolveEditReturn(undefined, '2026-02-02')).toEqual(ADMIN_LIST);
  });

  // 準正常系: 想定外のクエリ値は既定（管理者一覧）に倒す
  it('should fall back to the admin list for an unknown origin', () => {
    expect(resolveEditReturn('calendar', '2026-02-02')).toEqual(ADMIN_LIST);
  });

  it('should fall back to the admin list for an empty string', () => {
    expect(resolveEditReturn('', '2026-02-02')).toEqual(ADMIN_LIST);
  });

  it('should fall back to the admin list when from is specified multiple times', () => {
    // ?from=detail&from=detail は Next.js の searchParams で配列になる
    expect(resolveEditReturn(['detail', 'detail'], '2026-02-02')).toEqual(ADMIN_LIST);
  });

  it('should not treat the origin case-insensitively', () => {
    expect(resolveEditReturn('DETAIL', '2026-02-02')).toEqual(ADMIN_LIST);
  });

  // 異常系: クエリに URL を入れられても外部へ遷移させない（オープンリダイレクト防止）
  it('should never use an external URL given as from', () => {
    expect(resolveEditReturn('https://evil.example', '2026-02-02')).toEqual(ADMIN_LIST);
  });

  it('should never use a protocol-relative URL given as from', () => {
    expect(resolveEditReturn('//evil.example', '2026-02-02')).toEqual(ADMIN_LIST);
  });
});
