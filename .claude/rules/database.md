---
description: Prisma ORM 命名規約・マイグレーション・クエリ規約
globs: "front/prisma/**,front/src/lib/**"
---

# データベースルール（Prisma）

## 命名規約

- テーブル名（モデル名）: PascalCase・単数形（例: `ExerciseRecord`, `ExerciseWorkout`）— Prisma の規約に従う。
- カラム名（フィールド名）: camelCase（例: `recordId`, `createdAt`）— Prisma の規約に従う。
- DB 上のテーブル名: `@@map()` で snake_case・複数形にマッピング可（例: `@@map("exercise_records")`）。**本プロジェクトは未使用**（モデル名がそのままテーブル名）。既存モデルに後付けすると DB 側の改名が必要になるため、採用するなら新規モデルからか、マイグレーションで一括して行う。
- 本アプリが使用するのは `Exercise*` 系モデルのみ（`Report` / `ReportTag` / `VideoEntry` 等は共有スキーマの名残で対象外）。

## 主キー・共通フィールド

| フィールド | 型 | 説明 |
|-----------|------|------|
| id | String @id @default(cuid()) | 主キー（cuid） |
| createdAt | DateTime @default(now()) | 作成日時（監査用・必要に応じて） |
| updatedAt | DateTime @updatedAt | 更新日時（監査用・必要に応じて） |

- 主キーは `cuid()` を使用する（本プロジェクトの既存モデルに合わせる）。
- リレーションは Cascade 削除を明示する（例: `ExerciseRecord` 削除時に子の `ExerciseWorkout` / `ExerciseCardio` を削除）。

## 監査列

監査列（`createdAt` / `updatedAt` / `deletedAt`）は **Prisma の機構で自動設定する**。アプリケーションコードで値を組み立てない。

- **手動代入を禁止**する。`data: { updatedAt: new Date() }` のように Route Handler・`lib/` で監査列へ値を書かない（`updatedAt` の手動指定は `@updatedAt` の自動更新を上書きしてしまう）。
- 日時は**スキーマ側で宣言**する: `createdAt DateTime @default(now())` / `updatedAt DateTime @updatedAt`。
- `createdAt` は**更新しない**。更新系の `data` に `createdAt` を含めない。
- 参照（`orderBy: { createdAt: 'desc' }` 等）は問題ない。禁止するのは**書き込み**。
- 論理削除を採用する場合、`deletedAt` も削除ヘルパー経由で設定する。呼び出し側で `deletedAt: new Date()` を書かない（下記「論理削除」参照）。
- 操作ユーザー（`createdBy` / `updatedBy`）は現状のスキーマに存在しない。追加する場合は Prisma Client Extension（`$extends` の query フック）でリクエストコンテキストから自動注入し、各ハンドラーで個別に詰めない。
- **例外**: シードデータ・テストで日時を固定したい場合のみ明示指定を許容する。本番コードパスには持ち込まない。

## 論理削除

- **本プロジェクトは物理削除を採用**する（`ExerciseRecord` 削除時は Cascade で子も削除）。記録の復元要件がないため、`deletedAt` は持たない。
- 将来、論理削除を採用する場合:
  - `deletedAt` フィールドを追加する。
  - **読み取りクエリには `where: { deletedAt: null }` を必ず付与する**。付け忘れが削除済みデータの露出に直結する。
  - Prisma middleware または Client 拡張で一括適用を検討する（個別クエリでの付与漏れを構造的に防ぐ）。
  - 物理削除と論理削除を**モデルごとに混在させない**。混在させる場合は、どちらを採用したかをスキーマのコメントに残す。

## マイグレーション（手動適用）

- スキーマ変更時は `front/prisma/migrations/<name>/migration.sql` に SQL を配置する。
- **マイグレーションは自動適用されない。** `pnpm run build` は `prisma generate && next build` のみ実行する。
- デプロイ前に Supabase SQL Editor または `psql "$DATABASE_URL" -f <migration.sql>` で**手動適用**する。
- RLS ポリシーもマイグレーション SQL で管理する（`docs/06-security-specification.md` 参照）。

## クエリ

- Prisma Client のパラメータバインディングを使用する。`$queryRaw` での文字列結合は禁止。
- カロリー等の派生値は保存せず、表示時に算定する（`lib/calorie.ts`）。
