import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TEST_DATABASE_URL,
  assertLocalDatabaseUrl,
  resolveTestDatabaseUrl,
} from '../../setup/test-database-url';

// 本番 Supabase を模した接続先（実在しないダミー値）。
const REMOTE_URL =
  'postgresql://postgres.abcdefghijkl:dummy@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';

describe('resolveTestDatabaseUrl', () => {
  describe('正常系', () => {
    it('TEST_DATABASE_URL 未設定なら既定のローカル URL を返す', () => {
      expect(resolveTestDatabaseUrl({})).toBe('postgresql://e2e:e2e@localhost:5433/e2e');
    });

    it('TEST_DATABASE_URL がローカルならその値を返す', () => {
      const url = 'postgresql://user:pass@127.0.0.1:5432/app_test';
      expect(resolveTestDatabaseUrl({ TEST_DATABASE_URL: url })).toBe(url);
    });
  });

  describe('準正常系', () => {
    it('DATABASE_URL に本番 URL が入っていても参照せず既定値を返す', () => {
      expect(resolveTestDatabaseUrl({ DATABASE_URL: REMOTE_URL })).toBe(DEFAULT_TEST_DATABASE_URL);
    });

    it('TEST_DATABASE_URL が空文字なら既定値を返す', () => {
      expect(resolveTestDatabaseUrl({ TEST_DATABASE_URL: '' })).toBe(DEFAULT_TEST_DATABASE_URL);
    });

    it('TEST_DATABASE_URL がリモートを指していたら throw する', () => {
      expect(() => resolveTestDatabaseUrl({ TEST_DATABASE_URL: REMOTE_URL })).toThrow(
        'host: aws-0-ap-northeast-1.pooler.supabase.com',
      );
    });
  });
});

describe('assertLocalDatabaseUrl', () => {
  describe('正常系', () => {
    it.each([
      ['localhost', 'postgresql://u:p@localhost:5433/db'],
      ['127.0.0.1', 'postgresql://u:p@127.0.0.1:5433/db'],
      ['::1', 'postgresql://u:p@[::1]:5433/db'],
    ])('%s を許可して同じ URL を返す', (_host, url) => {
      expect(assertLocalDatabaseUrl(url)).toBe(url);
    });
  });

  describe('準正常系', () => {
    it('リモートホストを拒否する', () => {
      expect(() => assertLocalDatabaseUrl(REMOTE_URL)).toThrow('ローカルではありません');
    });

    it('localhost を含むだけのホスト名（localhost.example.com）を拒否する', () => {
      expect(() =>
        assertLocalDatabaseUrl('postgresql://u:p@localhost.example.com:5432/db'),
      ).toThrow('host: localhost.example.com');
    });

    it('失敗メッセージに復旧手順（起動コマンドと既定 URL）を含める', () => {
      expect(() => assertLocalDatabaseUrl(REMOTE_URL)).toThrow(
        /pnpm run e2e:db:up[\s\S]*postgresql:\/\/e2e:e2e@localhost:5433\/e2e/,
      );
    });

    it('失敗メッセージに資格情報（パスワード）を含めない', () => {
      expect(() => assertLocalDatabaseUrl(REMOTE_URL)).toThrow(
        expect.objectContaining({ message: expect.not.stringContaining('dummy') }),
      );
    });
  });

  describe('異常系', () => {
    it('URL として解釈できない値を拒否する', () => {
      expect(() => assertLocalDatabaseUrl('not a url')).toThrow('URL として解釈できません');
    });

    it('空文字を拒否する', () => {
      expect(() => assertLocalDatabaseUrl('')).toThrow('URL として解釈できません');
    });
  });
});
