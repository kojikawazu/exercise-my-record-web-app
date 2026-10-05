# 05 データ仕様書（Data Specification）

データモデル・ERD・DB スキーマ・データフローを定義する。スキーマの実体は `front/prisma/schema.prisma`。

> 本アプリが使用するのは `Exercise*` 系モデルのみ。同 schema 内の `Report` / `ReportTag` / `ReportTagMapping` / `VideoEntry` は本アプリ対象外（共有スキーマの名残）。

## 目次

- [データモデル](#データモデル)
- [ER 図（テーブル関係）](#er-図テーブル関係)
- [テーブルスキーマ](#テーブルスキーマ)
  - [ExerciseRecord](#exerciserecord)
  - [ExerciseWorkout](#exerciseworkout)
  - [ExerciseCardio](#exercisecardio)
  - [ExerciseMaster](#exercisemaster)
  - [ExerciseProfile](#exerciseprofile)
  - [ExerciseWeightLog](#exerciseweightlog)
- [データフロー](#データフロー)
- [マイグレーション](#マイグレーション)

## データモデル

| エンティティ | 説明 |
|--------------|------|
| `ExerciseRecord` | 1 日 1 レコード（日付ユニーク）。体調メモを持つ |
| `ExerciseWorkout` | 筋トレ行（部位・種目・セット・回数・重量）。Record に複数紐付く |
| `ExerciseCardio` | 有酸素行（種別・時間・距離）。Record に複数紐付く |
| `ExerciseMaster` | マスター（type=部位/種目/有酸素種別、name）。type+name でユニーク |
| `ExerciseProfile` | プロフィール（現在の体重 kg）。1 件のみ維持 |
| `ExerciseWeightLog` | 体重の履歴（記録日 × 体重 kg）。1 日 1 件（同日の保存は上書き） |

## ER 図（テーブル関係）

```mermaid
erDiagram
    ExerciseRecord ||--o{ ExerciseWorkout : "has (Cascade)"
    ExerciseRecord ||--o{ ExerciseCardio : "has (Cascade)"

    ExerciseRecord {
        string id PK
        datetime date UK
        string memo "nullable"
    }
    ExerciseWorkout {
        string id PK
        string recordId FK
        string part
        string name
        float sets
        float reps
        float weight
    }
    ExerciseCardio {
        string id PK
        string recordId FK
        string type
        float minutes
        float distance
    }
    ExerciseMaster {
        string id PK
        string type
        string name
    }
    ExerciseProfile {
        string id PK
        float weightKg
    }
    ExerciseWeightLog {
        string id PK
        datetime date UK
        float weightKg
    }
```

`ExerciseMaster`（type+name でユニーク）・`ExerciseProfile`（1 件のみ維持）・`ExerciseWeightLog`（1 日 1 件）はリレーションを持たない独立テーブル。

## テーブルスキーマ

### ExerciseRecord

| カラム | 型 | 制約 |
|--------|----|----|
| id | String | `@id @default(cuid())` |
| date | DateTime | `@unique`（1 日 1 レコード）, index |
| memo | String? | 体調メモ（任意、500 文字想定） |
| createdAt / updatedAt | DateTime | 監査用 |

### ExerciseWorkout

| カラム | 型 | 制約 |
|--------|----|----|
| id | String | `@id @default(cuid())` |
| recordId | String | FK → ExerciseRecord（Cascade）, index |
| part / name | String | 部位 / 種目名 |
| sets / reps / weight | Float | セット数 / 回数 / 重量（小数可、kg） |

### ExerciseCardio

| カラム | 型 | 制約 |
|--------|----|----|
| id | String | `@id @default(cuid())` |
| recordId | String | FK → ExerciseRecord（Cascade）, index |
| type | String | 種別（ラン/ウォーク） |
| minutes / distance | Float | 時間（分） / 距離（km） |

### ExerciseMaster

| カラム | 型 | 制約 |
|--------|----|----|
| id | String | `@id @default(cuid())` |
| type | String | 部位 / 種目 / 有酸素種別, index |
| name | String | 名称, index |
| — | — | `@@unique([type, name])` |

### ExerciseProfile

| カラム | 型 | 制約 |
|--------|----|----|
| id | String | `@id @default(cuid())` |
| weightKg | Float | 体重（kg） |

### ExerciseWeightLog

体重の履歴（#178）。プロフィールの保存（POST `/profile`）のたびに、保存した日の 1 件を積む。

| カラム | 型 | 制約 |
|--------|----|----|
| id | String | `@id @default(cuid())` |
| date | DateTime | 記録日（UTC の 0 時。`ExerciseRecord.date` と同じ扱い）, `@unique` |
| weightKg | Float | その日の体重（kg）。同日に複数回保存した場合は最後の値 |
| createdAt / updatedAt | DateTime | 監査列（`@default(now())` / `@updatedAt`） |

- **現在の体重は `ExerciseProfile` が持ち、本テーブルは推移グラフの表示にだけ使う。** 推定消費カロリーの算定（一覧・詳細・ダッシュボード・推移グラフ）は、全期間に現在の体重を使う（履歴の値は使わない）。画面ごとに使う体重が食い違わないようにし、算定の変更範囲を小さく保つため。
- 記録日はブラウザのローカル日付をクライアントから受け取る（サーバーの UTC で決めると日本時間の 0〜9 時に 1 日ずれるため）。

## データフロー

- 記録追加（POST `/records`）→ ExerciseRecord + 紐付く Workout/Cardio を作成（同日存在時はエラー）。
- 一覧（GET `/records`）→ 日付降順・ページングで Record を集約取得（筋トレは `workouts`、有酸素は `cardios` 配列。セット数合計 `totalSets` はサーバーで算定）。
- 詳細（GET `/records/:date`）→ Record + workouts + cardios を返却。
- 体重保存（POST `/profile`）→ 1 つのトランザクションで ExerciseProfile を上書きし、ExerciseWeightLog に当日分を upsert。
- 体重の推移（GET `/profile/weights`）→ 起点日以降の ExerciseWeightLog を日付昇順で返却。
- カロリーは保存値ではなく表示時に算定（[`03-functional-specification.md`](./03-functional-specification.md) 参照）。
- API 詳細は [`07-api-specification.md`](./07-api-specification.md)。

## マイグレーション

- `front/prisma/migrations/` に SQL を配置（例: `20260321_cardio_multiple_rows`, `20260322_exercise_rls_policies`, `20261006_exercise_weight_log`）。
- `20261006_exercise_weight_log` は `ExerciseWeightLog` の作成・RLS の有効化とポリシー設定に加え、既存の体重（`ExerciseProfile` の最新 1 件）を、最終更新日（UTC の日付）の履歴として 1 件だけ移す。
- `pnpm run build` は `prisma generate` のみ実行。マイグレーションは自動適用されないため、デプロイ前に Supabase SQL Editor または `psql $DATABASE_URL -f <migration.sql>` で手動適用する。
- RLS ポリシーの方針は [`06-security-specification.md`](./06-security-specification.md) を参照。
