# 04 非機能仕様書（Non-Functional Specification）

パフォーマンス・スケーラビリティ・可用性・信頼性要件を定義する。

> MVP 段階のため、定量目標が未確定の項目はプレースホルダとして残す。確定し次第更新する。

## 目次

- [パフォーマンス](#パフォーマンス)
- [スケーラビリティ](#スケーラビリティ)
- [可用性・信頼性](#可用性信頼性)
- [運用・保守](#運用保守)
- [バックアップ・復旧](#バックアップ復旧)

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
<!-- モニタリング・ログ方針を記述（未確定） -->

## バックアップ・復旧

本番 DB（Supabase）のバックアップ状況と、データを壊したときの戻し方（`.claude/rules/production-data.md`「復旧手段を先に確認する」、#125）。

| 項目 | 状態（2026-10-01 確認） |
|------|------------------------|
| 日次バックアップ（Scheduled backups） | **有効**。Supabase が 1 日 1 回自動取得する（保持期間はプランに従う） |
| PITR（Point in Time Recovery） | **無効**。任意の時刻には戻せない |

- **戻せるのは「直近の日次バックアップの時点」まで。** 最大で約 1 日分の更新が失われる。
- **復旧は DB 全体の巻き戻しになる。** バックアップ時点より後の更新はすべて消え、復旧中は DB が停止する。特定のテーブル・レコードだけを戻すことはできない。

### 本番に書き込む前（マイグレーションの手動適用など）

日次バックアップだけでは「適用直前」の状態に戻せないため、**適用直前に手元へダンプを取る**。

```bash
set -a; source front/.env.prod; set +a
pg_dump "$PROD_DATABASE_URL" --schema=public --data-only --format=custom \
  --file="backup-$(date +%Y%m%d-%H%M%S).dump"
```

- ダンプは本番データを含むため、**リポジトリ内に置かない・コミットしない**（作業後に削除する）。
- 同じ SQL は先にローカル Supabase で実行して結果を確かめる（README「DB マイグレーション」）。

### 復旧手順

1. 影響範囲を確認する（壊れたテーブル・件数・発生時刻）。**直前のダンプがあれば、まずそれで部分的に戻せないか検討する**（`pg_restore --data-only --table=<テーブル名>`。DB 全体を巻き戻すより失うものが少ない）。
2. 日次バックアップで戻す場合は、Supabase ダッシュボードの **Database → Backups → Scheduled backups** で、障害発生より前のバックアップを選んで **Restore** する。
3. 復旧後、アプリの主要画面（一覧・詳細・管理画面）で表示を確認し、失われた期間の記録を issue に残す。

> PITR を有効にすれば秒単位で戻せるが、有料のアドオン。現状のデータ量・更新頻度（個人の記録用途）では、日次バックアップと書き込み前のダンプで足りると判断している。
