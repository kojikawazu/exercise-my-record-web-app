import { describe, expect, it } from 'vitest';
import { assertDevDatabaseUrl, checkLocalDatabaseUrl } from '@/lib/localDatabaseUrl';

// 本番 Supabase を模した接続先（実在しないダミー値）。
const REMOTE_URL =
  'postgresql://postgres.abcdefghijkl:dummy@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';

// ローカル Supabase（supabase start）の DB。
const LOCAL_SUPABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

describe('checkLocalDatabaseUrl', () => {
  describe('正常系', () => {
    it.each([
      ['localhost', 'postgresql://u:p@localhost:5433/db'],
      ['127.0.0.1', LOCAL_SUPABASE_URL],
      ['::1', 'postgresql://u:p@[::1]:5433/db'],
    ])('%s を ok と判定する', (_host, url) => {
      expect(checkLocalDatabaseUrl(url)).toEqual({ ok: true });
    });
  });

  describe('準正常系', () => {
    it('リモートホストを remote と判定し、ホスト名を返す', () => {
      expect(checkLocalDatabaseUrl(REMOTE_URL)).toEqual({
        ok: false,
        reason: 'remote',
        host: 'aws-0-ap-northeast-1.pooler.supabase.com',
      });
    });

    it('localhost を含むだけのホスト名（localhost.example.com）を remote と判定する', () => {
      expect(checkLocalDatabaseUrl('postgresql://u:p@localhost.example.com:5432/db')).toEqual({
        ok: false,
        reason: 'remote',
        host: 'localhost.example.com',
      });
    });
  });

  describe('異常系', () => {
    it.each([['not a url'], ['']])('URL として解釈できない値（%j）を invalid と判定する', (url) => {
      expect(checkLocalDatabaseUrl(url)).toEqual({ ok: false, reason: 'invalid' });
    });
  });
});

describe('assertDevDatabaseUrl', () => {
  describe('正常系', () => {
    it('ローカル Supabase を指していれば throw しない', () => {
      expect(() => assertDevDatabaseUrl({ DATABASE_URL: LOCAL_SUPABASE_URL })).not.toThrow();
    });

    it('DATABASE_URL 未設定（503 フォールバック動作）なら throw しない', () => {
      expect(() => assertDevDatabaseUrl({})).not.toThrow();
    });
  });

  describe('準正常系', () => {
    it('DATABASE_URL が空文字なら throw しない', () => {
      expect(() => assertDevDatabaseUrl({ DATABASE_URL: '' })).not.toThrow();
    });

    it('本番 URL を指していたらホスト名付きで throw する', () => {
      expect(() => assertDevDatabaseUrl({ DATABASE_URL: REMOTE_URL })).toThrow(
        '[dev-db-guard] next dev の DATABASE_URL がローカルではありません（host: aws-0-ap-northeast-1.pooler.supabase.com）',
      );
    });

    it('PROD_DATABASE_URL は参照しない（別変数に本番 URL があっても通す）', () => {
      expect(() =>
        assertDevDatabaseUrl({ DATABASE_URL: LOCAL_SUPABASE_URL, PROD_DATABASE_URL: REMOTE_URL }),
      ).not.toThrow();
    });

    it('失敗メッセージに復旧手順（起動コマンド）を含める', () => {
      expect(() => assertDevDatabaseUrl({ DATABASE_URL: REMOTE_URL })).toThrow(
        'pnpm run dev:db:up',
      );
    });

    it('失敗メッセージに資格情報（パスワード）を含めない', () => {
      expect(() => assertDevDatabaseUrl({ DATABASE_URL: REMOTE_URL })).toThrow(
        expect.objectContaining({ message: expect.not.stringContaining('dummy') }),
      );
    });
  });

  describe('異常系', () => {
    it('URL として解釈できない値なら throw する', () => {
      expect(() => assertDevDatabaseUrl({ DATABASE_URL: 'not a url' })).toThrow(
        'URL として解釈できません',
      );
    });
  });
});
