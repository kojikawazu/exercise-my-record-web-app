# 07 API 仕様書（API Specification）

エンドポイント・リクエスト/レスポンス形式・認証・エラーハンドリングを定義する。

## 前提

- 1 日 1 レコード。POST は同日存在時にエラー（上書きしない）。
- 取得系は `/records`（一覧）と `/records/:date`（詳細）。
- データソースは Supabase（Prisma 経由）。プロフィール（体重）は Supabase に保存。
- 認証/認可の詳細は [`06-security-specification.md`](./06-security-specification.md) を参照。

## エンドポイント一覧

| メソッド | パス | 概要 | 認証 |
|---------|------|------|------|
| POST | `/records` | 1 日 1 レコードの作成（同日はエラー） | 必須 |
| GET | `/records` | 一覧取得（日付降順・ページング） | 不要 |
| GET | `/records/:date` | 詳細取得 | 不要 |
| PATCH | `/records/:date` | レコード編集 | 必須 |
| DELETE | `/records/:date` | レコード削除 | 必須 |
| GET | `/records/calendar?month=YYYY-MM` | 月別記録有無 ※未実装（設計のみ） | 不要 |
| GET | `/records/trends?period=1w\|1m\|3m\|all` | 推移グラフ用データ ※未実装（設計のみ） | 不要 |
| GET | `/admin/me` | 管理者判定（`{ isAdmin }`） | 任意 |
| GET | `/masters?type=...` | マスター取得 | 不要 |
| POST | `/masters?type=...` | マスター追加 | 必須 |
| PATCH | `/masters/:id` | マスター編集 | 必須 |
| DELETE | `/masters/:id` | マスター削除 | 必須 |
| GET | `/profile` | 体重取得 | 不要 |
| POST | `/profile` | 体重保存 | 必須 |
| GET | `/admin/export?from&to&format` | データ出力 ※ Issue #20 で削除予定 | 必須 |

## 認証方式

- 書き込み系は `Authorization: Bearer <access_token>` を付与し、サーバー側で Supabase トークン検証 + `ADMIN_EMAIL` 一致を確認する（[`06-security-specification.md`](./06-security-specification.md)）。

## リクエスト/レスポンス形式

### POST /records

- 用途: 1 日 1 レコードの作成。挙動: 同日が存在する場合はエラーを返す（上書きしない）。

### GET /records

- 並び順: 日付の新しい順（降順）。
- クエリ: `page=N`（1 始まり、limit=10 固定）。`page` 未指定/NaN/0 以下 → 1 に正規化。`page > totalPages` → 最終ページに clamp。
- レスポンス:

  ```json
  {
    "records": [{ "date": "...", "totalSets": 0, "cardioMinutes": 0, "cardioDistance": 0, "cardios": [] }],
    "totalCount": 25,
    "page": 1,
    "totalPages": 3
  }
  ```

  ※ 筋トレは現状 `totalSets` 集約のみで詳細配列は未返却（一覧カードの全メニュー表示は要改修、[`11-tasks.md`](./11-tasks.md) 参照）。

### GET /records/:date

- 返却項目（最小）: `date` / `memo` / `workouts (part/name/sets/reps/weight, id)` / `cardios (type/minutes/distance)`（複数行）。

### GET /records/calendar?month=YYYY-MM ※未実装（設計のみ）

- 用途: カレンダー用の月別記録有無取得。返却: 記録がある日付の配列。
- 状態: ルート未実装。カレンダー画面とあわせて今後実装予定。

### GET /records/trends?period=1w|1m|3m|all ※未実装（設計のみ）

- 用途: 推移グラフ用データ取得。返却: `dates` / `weight` / `totalSets` / `cardioDistance` / `calories`。
- 状態: ルート未実装。推移グラフ画面とあわせて今後実装予定。

### GET /admin/me

- 用途: 現在のリクエストユーザーが管理者かの判定（フロントの認証状態確認用）。
- 認証: 任意（`Authorization: Bearer <token>` があれば検証）。返却: `{ isAdmin: boolean }`。

### マスター管理

- `GET /masters?type=body-parts|exercises|cardio-types` / `POST /masters?type=...` / `PATCH /masters/:id` / `DELETE /masters/:id`。

### プロフィール

- `GET /profile`（体重取得） / `POST /profile`（体重保存）。暫定: `/api/profile` はフロントの仮実装で使用（本番は Supabase 想定）。

### GET /admin/export（Issue #20 で削除予定、現時点では現役）

- 用途: データ出力（管理者のみ）。クエリ: `from=YYYY-MM-DD`, `to=YYYY-MM-DD`, `format=csv|json`。実装: `/api/admin/export`。

## エラーレスポンス

| ステータス | 例 | 条件 |
|-----------|----|----|
| 400 | `{ "error": "date is required" }` | 必須項目欠落・不正 JSON |
| 401 | — | 認証なし（書き込み系） |
| 403 | — | 管理者以外 |
| 404 | — | 対象日付の記録が存在しない |
| 409 | `{ "error": "duplicate date" }` | 同日重複（POST） |
| 503 | `{ "error": "database unavailable" }` | DB 接続不可（`getPrisma()` が null） |

## バリデーション方針

- フロント側: フィールド単位でエラー表示し、エラーがある場合は保存を抑止（Issue #19）。
- サーバ側: 別 issue で対応予定。現時点ではフロントバリデーションのみ。
