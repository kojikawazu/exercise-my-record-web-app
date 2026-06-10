# ドキュメント索引

Exercise My Record の仕様・設計ドキュメント一覧。プロジェクト概要・セットアップ手順はリポジトリ直下の [`../README.md`](../README.md) を参照。

ドキュメントは 4 層で構成している。

- **標準仕様書（`01`〜`11`）** — 仕様の正準。番号順に読むと全体像をつかめる。
- **[`design-discussion/`](./design-discussion/)** — デザイン検討の経緯（ペルソナ別ディスカッション・改善提案）。
- **[`error-reports/`](./error-reports/)** — 過去の不具合・ビルドエラーの記録。
- **[`test-design/`](./test-design/)** — テスト設計の詳細ケース表。

## 読み進め順（おすすめ）

`01 要求 → 02 要件 → 03 機能 → 05 データ → 06 セキュリティ → 07 API → 08 テスト → 09 アーキテクチャ`。
04・10・11 は随時参照。初めて環境構築する場合は [`../README.md`](../README.md) のセットアップ手順から。

## 標準仕様書

| # | ドキュメント | 概要 |
|---|---|---|
| 01 | [要求仕様書](./01-business-requirements.md) | 背景・目的・ステークホルダー・スコープ・制約 |
| 02 | [要件仕様書](./02-requirements-specification.md) | 機能要件一覧（FR-ID）・受け入れ基準・優先度 |
| 03 | [機能仕様書](./03-functional-specification.md) | 画面仕様・ユーザーフロー・UI コピー・ビジネスロジック（カロリー算定式） |
| 04 | [非機能仕様書](./04-non-functional-specification.md) | 非機能要件（性能・可用性・運用）※一部未確定 |
| 05 | [データ仕様書](./05-data-specification.md) | データモデル・ER 図・スキーマ・データフロー |
| 06 | [セキュリティ仕様書](./06-security-specification.md) | 認証・認可・RLS・脆弱性対策 |
| 07 | [API 仕様書](./07-api-specification.md) | エンドポイント・リクエスト/レスポンス・エラーレスポンス |
| 08 | [テスト仕様書](./08-test-specification.md) | テスト戦略・受け入れ E2E・テスト環境 |
| 09 | [アーキテクチャ仕様書](./09-architecture-specification.md) | システム構成・技術スタック・CI/CD・デプロイ |
| 10 | [その他仕様書](./10-miscellaneous-specification.md) | 用語集・参考資料・付録 |
| 11 | [タスク](./11-tasks.md) | マイルストーン・タスク一覧・進捗・開発履歴 |

## design-discussion/ — デザイン検討

| ドキュメント | 概要 |
|---|---|
| [01-discussion-log](./design-discussion/01-discussion-log.md) | デザインシステムのペルソナ別ディスカッションログ |
| [02-design-recommendations](./design-discussion/02-design-recommendations.md) | ディスカッションを踏まえた改善提案レポート |

## error-reports/ — 不具合・エラー記録

| ドキュメント | 概要 |
|---|---|
| [2026-02-04-runtime-issues](./error-reports/2026-02-04-runtime-issues.md) | ランタイム不具合の記録と再発防止策 |
| [2026-02-04-vercel-build-errors](./error-reports/2026-02-04-vercel-build-errors.md) | Vercel ビルドエラー（型エラー・App Router 制約）の解消記録 |

## test-design/ — テスト設計

| ドキュメント | 対象 |
|---|---|
| [test-design](./test-design/test-design.md) | バリデーション / カロリー計算 / フック / API Routes / E2E の詳細ケース表 |

## 関連

- 開発ルール: [`../CLAUDE.md`](../CLAUDE.md) と [`../.claude/rules/`](../.claude/rules/)
- ドキュメント更新の影響マップ: [`../.claude/rules/documentation.md`](../.claude/rules/documentation.md)
