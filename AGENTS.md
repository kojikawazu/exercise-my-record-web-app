# Repository Guidelines

## 目的と使い方
このドキュメントは、本リポジトリに参加する人（人間/AI）が迷わず作業できるように、最小限のルールと手順を共有します。内容は暫定であり、要件や構成が固まり次第、随時更新します。

## Project Structure & Module Organization
- `front/src/` : アプリケーションのソースコード
- `front/tests/` : E2Eテスト（Playwright）
- `front/public/` : 静的アセット
- `docs/` : 仕様・設計・運用ドキュメント
- `base/` : 読み取り専用（編集禁止）

## Build, Test, and Development Commands
- `cd front && pnpm dev` : ローカル開発サーバー起動
- `cd front && pnpm run build` : 本番ビルド
- `cd front && pnpm run test:e2e` : Playwright E2E実行

## Coding Style & Naming Conventions
- インデント: 2スペース
- 命名: `camelCase`（変数/関数）、`PascalCase`（コンポーネント/クラス）
- フォーマット/リンタ: Prettier, ESLint

## Testing Guidelines
- テストフレームワーク: Playwright（E2Eのみ）
- 命名規則: `*.spec.ts`
- 実行方法: `pnpm run test:e2e`

## Commit & Pull Request Guidelines
- コミットメッセージ: `feat:`, `fix:`, `docs:`
- PR要件: 目的/変更点/テスト結果/スクリーンショット（必要時）

## Codex Skills（グローバル運用）
- Skills は原則グローバル（例: `~/.codex/skills/`）で管理し、プロジェクト固有の手順はスキル内に明記します。
- 本リポジトリで使用すべきスキルが決まったら、ここに一覧と使い方（例: 「変更前に必ず参照」）を追記してください。
例:
- `project-frontend-rules` : UI 変更前に必ず参照、`front/` 以外は編集禁止
- `project-e2e-playwright` : 変更後に E2E 実行手順を確認

## 追加の注意事項（必要に応じて）
- セキュリティ設定や環境変数の管理ルール
- デプロイ手順やブランチ運用
- 禁止事項（例: `main` 直コミット禁止 など）

---
更新したら日付や簡単なメモを残す運用がおすすめです。
更新: 2026-02-03 プロジェクト構成/コマンド/テスト方針を現状に合わせて整理
更新: 2026-02-05 docs参照による現状把握を実施（Codex作業記録）
- 参照: `docs/01.requirements.md` 〜 `docs/11.calorie.md`, `docs/error-reports/2026-02-04-runtime-issues.md`, `docs/error-reports/2026-02-04-vercel-build-errors.md`
- 進捗サマリ: 基盤認証・一般ユーザー機能・管理者主要機能・データ出力・Vercel本番デプロイは完了
- 未着手: マスター管理の選択肢反映（Issue #6）、プロフィール体重の上書き保存（Issue #8）、ローディング表示統一（Issue #9）、CIでのE2E自動化、base/docs変更時のVercel自動デプロイ抑止（Issue #10）
- 既知不具合: 2026-02-04時点のランタイム不具合とVercelビルドエラーは `docs/error-reports/` に修正履歴あり
- 要確認: 同日保存仕様が `docs/05.spec.md`（同日保存はエラー）と `docs/07.e2e-cases.md`（同日保存は上書き）で不整合
