# 04 非機能仕様書（Non-Functional Specification）

パフォーマンス・スケーラビリティ・可用性・信頼性要件を定義する。

> MVP 段階のため、定量目標が未確定の項目はプレースホルダとして残す。確定し次第更新する。

## 目次

- [パフォーマンス](#パフォーマンス)
- [スケーラビリティ](#スケーラビリティ)
- [可用性・信頼性](#可用性信頼性)
- [運用・保守](#運用保守)

## パフォーマンス

- 一覧は 1 ページ 10 件のページングで応答データ量を抑える（API `page` クエリ）。
<!-- レスポンスタイム・スループットの定量目標を記述（未確定） -->

## スケーラビリティ

- 個人/小規模利用を想定した MVP。大規模同時アクセスは対象外。
<!-- 想定ユーザー数・データ量の上限を記述（未確定） -->

## 可用性・信頼性

- ホスティングは Vercel（詳細は [`09-architecture-specification.md`](./09-architecture-specification.md)）。
- `DATABASE_URL` 未設定時は API がフォールバックする（DB 接続不可時は 503 `database unavailable` を返す）。
<!-- SLA・障害許容度を記述（未確定） -->

## 運用・保守

- DB マイグレーションは自動適用されない。`front/prisma/migrations/` の SQL を Supabase SQL Editor または `psql` で手動適用する（[`05-data-specification.md`](./05-data-specification.md) 参照）。
- CI（GitHub Actions）で Vitest ユニットテストと Playwright E2E を自動実行（[`08-test-specification.md`](./08-test-specification.md) / [`09-architecture-specification.md`](./09-architecture-specification.md) 参照）。
- 既知のランタイム不具合とビルドエラーの記録は [`docs/error-reports/`](./error-reports/) を参照。
<!-- モニタリング・ログ・バックアップ方針を記述（未確定） -->
