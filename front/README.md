# Exercise My Record (front)

## 開発コマンド
- `pnpm dev` : ローカル開発サーバー起動
- `pnpm run build` : 本番ビルド
- `pnpm run test:e2e` : Playwright E2E実行

## 認証
- 管理者ログインは Supabase Google OAuth を使用
- 未ログインで管理者URLにアクセスした場合は `/admin/login` へリダイレクト

## E2Eテスト運用
- E2E実行時のみテストログインを有効化
- Playwright の `webServer` で `NEXT_PUBLIC_E2E_BYPASS=1` を付与

## 環境変数
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `DATABASE_URL`（未設定時はAPIがフォールバック）

更新: 2026-02-03 認証/E2E運用/環境変数の現状を反映
