# ドキュメント目次

Exercise My Record の仕様書群。番号付き 11 ファイル（`01`〜`11`）+ 補足サブディレクトリで構成。

## 読む順の目安

1. 何のアプリか → `01` → `02`
2. どう動くか（画面/機能） → `03`
3. データ・API・セキュリティ → `05` → `07` → `06`
4. 開発・運用（構成/テスト） → `09` → `08`
5. 進捗・残タスク → `11`

## 仕様書一覧

| # | ファイル | 内容 |
|---|----------|------|
| 01 | [`01-business-requirements.md`](01-business-requirements.md) | 背景・目的・ステークホルダー・スコープ・制約 |
| 02 | [`02-requirements-specification.md`](02-requirements-specification.md) | 機能要件一覧（FR-ID）・受け入れ基準・優先度 |
| 03 | [`03-functional-specification.md`](03-functional-specification.md) | 画面仕様・ユーザーフロー・UI コピー・ビジネスロジック（カロリー算定式） |
| 04 | [`04-non-functional-specification.md`](04-non-functional-specification.md) | 非機能要件（性能・可用性・運用）※一部未確定 |
| 05 | [`05-data-specification.md`](05-data-specification.md) | データモデル・ER 図・スキーマ・データフロー |
| 06 | [`06-security-specification.md`](06-security-specification.md) | 認証・認可・RLS・脆弱性対策 |
| 07 | [`07-api-specification.md`](07-api-specification.md) | エンドポイント・req/res・エラーレスポンス |
| 08 | [`08-test-specification.md`](08-test-specification.md) | テスト戦略・受け入れ E2E・テスト環境 |
| 09 | [`09-architecture-specification.md`](09-architecture-specification.md) | システム構成・技術スタック・CI/CD・デプロイ |
| 10 | [`10-miscellaneous-specification.md`](10-miscellaneous-specification.md) | 用語集・参考資料・付録 |
| 11 | [`11-tasks.md`](11-tasks.md) | マイルストーン・タスク一覧・進捗・開発履歴 |

## 補足ディレクトリ

| ディレクトリ | 内容 |
|--------------|------|
| [`design-discussion/`](design-discussion/) | デザイン検討（ペルソナ別ディスカッション・改善提案） |
| [`error-reports/`](error-reports/) | ランタイム不具合・Vercel ビルドエラーの記録 |
| [`test-design/`](test-design/) | テスト設計（ユニット/E2E の詳細ケース表） |

> プロジェクト全体の概要・セットアップ手順はルートの [`../README.md`](../README.md) を参照。
