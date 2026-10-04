import { describe, expect, it } from 'vitest';
import { buildSecurityHeaders } from '@/lib/securityHeaders';

// 本番 Supabase を模した URL（実在しないダミー値）。
const SUPABASE_URL = 'https://abcdefghijkl.supabase.co';

/**
 * 組み立てたヘッダーから CSP を取り出し、ディレクティブ名 → 値の Map にする。
 * 文字列全体の一致で検証すると順序変更だけで落ちるため、ディレクティブ単位で比較する。
 *
 * @param options - {@link buildSecurityHeaders} に渡す入力
 * @returns ディレクティブ名 → 値（スペース区切りのソース式）の Map
 */
const parseCsp = (options: Parameters<typeof buildSecurityHeaders>[0]): Map<string, string> => {
  const csp = buildSecurityHeaders(options).find((h) => h.key === 'Content-Security-Policy');
  if (!csp) throw new Error('Content-Security-Policy が含まれていない');
  return new Map(
    csp.value.split('; ').map((directive) => {
      const [name = '', ...values] = directive.split(' ');
      return [name, values.join(' ')];
    }),
  );
};

describe('buildSecurityHeaders', () => {
  describe('正常系', () => {
    it('5 種類のセキュリティヘッダーを付与する', () => {
      const headers = buildSecurityHeaders({ supabaseUrl: SUPABASE_URL, isDev: false });
      expect(headers.map((h) => h.key)).toEqual([
        'Content-Security-Policy',
        'X-Content-Type-Options',
        'X-Frame-Options',
        'Referrer-Policy',
        'Permissions-Policy',
      ]);
      expect(headers.slice(1)).toEqual([
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ]);
    });

    it('本番ビルドの CSP は unsafe-eval を含まず、Supabase のオリジンへの通信を許可する', () => {
      const csp = parseCsp({ supabaseUrl: SUPABASE_URL, isDev: false });
      expect(Object.fromEntries(csp)).toEqual({
        'default-src': "'self'",
        'base-uri': "'self'",
        'object-src': "'none'",
        'frame-ancestors': "'none'",
        'form-action': "'self'",
        'script-src': "'self' 'unsafe-inline'",
        'style-src': "'self' 'unsafe-inline'",
        'font-src': "'self' data:",
        'img-src': "'self' data: blob:",
        'connect-src': `'self' ${SUPABASE_URL}`,
      });
    });
  });

  describe('準正常系', () => {
    it('next dev のときだけ script-src に unsafe-eval を加える', () => {
      expect(parseCsp({ supabaseUrl: SUPABASE_URL, isDev: true }).get('script-src')).toBe(
        "'self' 'unsafe-inline' 'unsafe-eval'",
      );
    });

    it.each([
      ['末尾スラッシュ', `${SUPABASE_URL}/`, SUPABASE_URL],
      ['パス付き', `${SUPABASE_URL}/rest/v1`, SUPABASE_URL],
      ['ローカル Supabase（ポート付き http）', 'http://127.0.0.1:54321/', 'http://127.0.0.1:54321'],
    ])('Supabase の URL（%s）をオリジンに正規化する', (_label, supabaseUrl, origin) => {
      expect(parseCsp({ supabaseUrl, isDev: false }).get('connect-src')).toBe(`'self' ${origin}`);
    });
  });

  describe('異常系', () => {
    it.each([
      ['未設定', undefined],
      ['空文字', ''],
      ['URL として不正', 'not a url'],
      ['http(s) 以外のスキーム', 'javascript:alert(1)'],
      ['CSP の区切りを含む値', 'https://evil.example.com; script-src *'],
    ])('Supabase の URL が %s なら connect-src は self のみにする', (_label, supabaseUrl) => {
      expect(parseCsp({ supabaseUrl, isDev: false }).get('connect-src')).toBe("'self'");
    });
  });
});
