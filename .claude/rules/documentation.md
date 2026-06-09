---
description: ドキュメント更新・設計書管理ルール（影響マップ + opt-out の完了条件）
globs: 
---

# ドキュメント

コード変更がドキュメント（CLAUDE.md / README.md / docs/）と乖離しないことを構造的に担保する。

## 完了条件（opt-out）

変更は、下記「影響マップ」の対応ドキュメントを**同一 PR 内で更新する**ことを完了条件とする。

- 更新不要と判断した場合は、**PR 説明にその理由を明記する**（省略＝未対応とみなす）。
- この乖離チェックは `/self-review` と `/pr-create` の確認対象に含まれる。

## 影響マップ（変更種別 → 更新必須ドキュメント）

「どのドキュメントだっけ？」を考えさせないための逆引き表。

| 変更種別 | 更新必須ドキュメント |
|---|---|
| API エンドポイントの追加・変更・削除 | `docs/07-api-specification.md` |
| 機能・画面の追加・変更（管理画面含む） | `docs/03-functional-specification.md`、`docs/05-data-specification.md`（データ要件に影響する場合） |
| DB スキーマ・マイグレーション変更（`front/prisma/`） | `docs/05-data-specification.md`、`README.md`（DBマイグレーション節） |
| 認証・認可・セキュリティ仕様の変更 | `docs/06-security-specification.md`、`README.md`（認証節） |
| 非機能要件（性能・ログ・運用）の変更 | `docs/04-non-functional-specification.md` |
| アーキテクチャ・技術構成の変更 | `docs/09-architecture-specification.md`、`CLAUDE.md`（必要に応じて） |
| テスト方針・E2E/ユニットケースの追加・変更 | `docs/08-test-specification.md`、`docs/test-design/test-design.md` |
| 環境変数・開発コマンド・ビルド手順の変更 | `README.md`（環境変数／開発コマンド節） |
| ルール（`.claude/rules/`）の追加・削除・スコープ変更 | `CLAUDE.md`（Rules テーブル）、`README.md`（記載がある場合） |
| 要件・スコープの変更 | `docs/01-business-requirements.md`、`docs/02-requirements-specification.md` |

該当する変更がない場合はスキップする。

## 補足

- **設計書の管理**: タスクごとに設計書を新規作成しない。既存の仕様書ドキュメント（`docs/01〜11-*.md`、`docs/test-design/`）に追記・更新する。
- 影響マップに該当行がない種類の変更でも、ルートドキュメント（CLAUDE.md / README.md / docs/）に乖離が生じる場合は更新する。
