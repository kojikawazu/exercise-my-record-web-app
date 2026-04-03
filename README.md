# Exercise My Record

フィットネス記録MVPのフロントエンド実装です。

## 構成
- `front/` : アプリ本体（Next.js App Router）
- `docs/` : 仕様・フロー・API・E2Eケース
- `base/` : 読み取り専用（編集禁止）

## 開発コマンド
- `cd front && pnpm dev` : ローカル開発
- `cd front && pnpm run build` : ビルド
- `cd front && pnpm test` : Vitestユニットテスト
- `cd front && pnpm run test:e2e` : Playwright E2E

## 認証
- 管理者ログインは Supabase Google OAuth を使用
- 未ログインで管理者URLにアクセスした場合は `/admin/login` へリダイレクト

## E2Eテスト運用
- Playwright 起動時のみテストログインを有効化
- `front/playwright.config.ts` の `webServer.command` で `NEXT_PUBLIC_E2E_BYPASS=1` を付与

## 環境変数
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `DATABASE_URL`（未設定時はAPIがフォールバック）

## DBマイグレーション
スキーマ変更時は `front/prisma/migrations/` にSQLを配置する。
デプロイ前に Supabase SQL Editor または `psql` で手動適用すること。

```bash
# 例: ローカルで適用
psql $DATABASE_URL -f front/prisma/migrations/20260321_cardio_multiple_rows/migration.sql
```

**注意**: `pnpm run build` は `prisma generate` のみ実行する。マイグレーションは自動適用されない。

## 仕様ドキュメント
- `docs/05.spec.md`
- `docs/07.e2e-cases.md`
- `docs/08.flow.md`

更新: 2026-02-03 ルートREADMEを追加
