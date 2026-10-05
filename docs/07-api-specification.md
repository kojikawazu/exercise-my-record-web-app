# 07 API 仕様書（API Specification）

エンドポイント・リクエスト/レスポンス形式・認証・エラーハンドリングを定義する。

## 目次

- [前提](#前提)
- [エンドポイント一覧](#エンドポイント一覧)
- [認証方式](#認証方式)
- [リクエスト/レスポンス形式](#リクエストレスポンス形式)
  - [POST /records](#post-records)
  - [GET /records](#get-records)
  - [GET /records/:date](#get-recordsdate)
  - [GET /records/calendar?month=YYYY-MM](#get-recordscalendarmonthyyyy-mm)
  - [GET /records/trends?from=YYYY-MM-DD](#get-recordstrendsfromyyyy-mm-dd)
  - [GET /records/streak?today=YYYY-MM-DD](#get-recordsstreaktodayyyyy-mm-dd)
  - [GET /admin/me](#get-adminme)
  - [マスター管理](#マスター管理)
  - [プロフィール](#プロフィール)
- [エラーレスポンス](#エラーレスポンス)
- [バリデーション方針](#バリデーション方針)

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
| GET | `/records/calendar?month=YYYY-MM` | 月別記録有無 | 不要 |
| GET | `/records/trends?from=YYYY-MM-DD` | 推移グラフ用データ | 不要 |
| GET | `/records/streak?today=YYYY-MM-DD` | 連続記録日数（ストリーク） | 不要 |
| GET | `/admin/me` | 管理者判定（`{ isAdmin }`） | 任意 |
| GET | `/masters?type=...` | マスター取得 | 不要 |
| POST | `/masters?type=...` | マスター追加 | 必須 |
| PATCH | `/masters/:id` | マスター編集 | 必須 |
| DELETE | `/masters/:id` | マスター削除 | 必須 |
| GET | `/profile` | 体重取得 | 不要 |
| POST | `/profile` | 体重保存（履歴にも積む） | 必須 |
| GET | `/profile/weights?from=YYYY-MM-DD` | 体重の履歴（推移グラフ用） | 不要 |

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
    "records": [
      {
        "date": "2026-02-02",
        "totalSets": 9,
        "workouts": [{ "part": "胸", "name": "ベンチプレス", "sets": 3, "reps": 10, "weight": 60 }],
        "cardios": [{ "type": "ラン", "minutes": 30, "distance": 5 }]
      }
    ],
    "totalCount": 25,
    "page": 1,
    "totalPages": 3
  }
  ```

- 一覧カードの筋トレ/有酸素メニュー表示用に、各記録の明細（`workouts` / `cardios`）を返す（#23）。行の ID・`recordId`・監査列（`createdAt` / `updatedAt`）は返さない。明細の並び順は詳細 API と同じく保証しない。
- `totalSets` は推定消費カロリーの算定用にサーバーで集約した派生値。有酸素の合計時間/距離（旧 `cardioMinutes` / `cardioDistance`）は一覧のサマリー表示廃止に伴い削除した（#23）。

### GET /records/:date

- 返却項目（最小）: `date` / `memo` / `workouts (part/name/sets/reps/weight, id)` / `cardios (type/minutes/distance)`（複数行）。

### GET /records/calendar?month=YYYY-MM

- 用途: カレンダー画面用。指定月に記録がある日の一覧を返す（#21）。
- クエリ: `month`（必須、`YYYY-MM`。月は `01`〜`12`、ゼロ埋め必須）。
- 取得範囲: `[月初, 翌月初)` の半開区間（UTC 0 時で保存した記録日に対して）。明細は読まず日付のみ取得する。
- レスポンス:

  ```json
  { "month": "2026-02", "dates": ["2026-02-02", "2026-02-15"] }
  ```

  - `dates` は昇順。記録の無い月は空配列。
- エラー: 400 `{ "error": "invalid month" }`（`month` の欠落・形式不正・範囲外の月）/ 503 `{ "error": "database unavailable" }`。
- `/records/:date` の動的セグメントより静的セグメント `calendar` が優先されるため、ルートは衝突しない。

### GET /records/trends?from=YYYY-MM-DD

- 用途: 推移グラフ画面用。起点日以降（当日を含む）の記録を日ごとに集約して返す（#22）。
- クエリ: `from`（任意、`YYYY-MM-DD`。暦に存在しない日付は不正）。省略時は全期間。
  - 当初設計の `period=1w|1m|3m|all` から変更した。期間の起点となる「今日」をサーバー（UTC）で決めると日本時間の 0〜9 時に 1 日ずれるため、ブラウザのローカル日付で起点日を求めて渡す。
- レスポンス:

  ```json
  {
    "points": [
      { "date": "2026-02-02", "totalSets": 9, "cardioDistance": 5, "cardios": [{ "type": "ラン", "minutes": 30 }] }
    ]
  }
  ```

  - `points` は日付昇順で、記録がある日のみ（記録の無い日を 0 で埋めない）。
  - `cardios` は推定カロリーの算定用に種別と時間のみを返す（距離は `cardioDistance` に集約済み）。推定カロリーはプロフィールの体重を持つクライアントで算定する（一覧・詳細と同じ）。
  - 体重の履歴は記録の集約ではないため本 API では返さず、`GET /profile/weights` で取得する（#178）。
- エラー: 400 `{ "error": "invalid from" }` / 503 `{ "error": "database unavailable" }`。


### GET /records/streak?today=YYYY-MM-DD

- 用途: トップページのサマリー・ヒートマップ用。今日を起点とした連続記録日数を返す（#28）。
- クエリ: `today`（必須、`YYYY-MM-DD`。ブラウザのローカル日付。サーバーの UTC で決めると日付がずれるため）。
- 判定: 今日を起点に、記録がある日が途切れずに続く日数。今日が未記録でも昨日まで続いていれば継続中として昨日までを数える。今日も昨日も未記録なら 0。今日より後の記録は数えない。
  - 連続は月をまたいで遡るため、今日以前の記録日を日付のみ取得してサーバーで数える（明細は読まない。判定は `front/src/lib/streak.ts`）。
- レスポンス:

  ```json
  { "days": 3, "from": "2026-10-03", "to": "2026-10-05", "recordedToday": false }
  ```

  - `from` / `to` は連続の初日・最終日（`days` が 0 なら `null`）。`recordedToday` が `false` なら「今日記録すると +1 日」と促せる。
- エラー: 400 `{ "error": "invalid today" }`（欠落・形式不正・暦に無い日付）/ 503 `{ "error": "database unavailable" }`。
### GET /admin/me

- 用途: 現在のリクエストユーザーが管理者かの判定（フロントの認証状態確認用）。
- 認証: 任意（`Authorization: Bearer <token>` があれば検証）。返却: `{ isAdmin: boolean }`。

### マスター管理

- `GET /masters?type=body-parts|exercises|cardio-types` / `POST /masters?type=...` / `PATCH /masters/:id` / `DELETE /masters/:id`。
- レスポンス（`DELETE` を除く）は **`{ id, name, type }` のみ**。`createdAt` / `updatedAt` は公開しない（`.claude/rules/api.md`「レスポンス整形」）。契約型は `front/src/types/master.ts` の `MasterResponse` で、Route Handler と画面が共有する。
- `PATCH` は、DB に保存されている `type` が既知の種別でない場合に 500 `{ error: "invalid master type in database" }` を返す（`type` は制約なしの `String` 列のため）。

### プロフィール

- `GET /profile`（体重取得） / `POST /profile`（体重保存）。暫定: `/api/profile` はフロントの仮実装で使用（本番は Supabase 想定）。

### POST /profile

- リクエスト: `{ "weightKg": 65.5, "date": "2026-10-06" }`
  - `weightKg`（必須、数値）: 現在の体重として上書き保存する。
  - `date`（必須、`YYYY-MM-DD`。暦に存在しない日付は不正）: 体重の履歴に積む日付。ブラウザのローカル日付を渡す。同日の履歴は上書きする。
- 現在の体重の上書きと履歴の upsert は 1 つのトランザクションで行う。
- レスポンス: 200 `{ "weightKg": 65.5 }`。
- エラー: 400 `{ "error": "weightKg is required" }` / 400 `{ "error": "invalid date" }` / 401 / 403。DB エラーは暫定実装として握りつぶし、200 で保存値を返す（既存仕様）。

### GET /profile/weights?from=YYYY-MM-DD

- 用途: 推移グラフ画面の「体重」グラフ用。起点日以降（当日を含む）の体重の履歴を返す（#178）。
- クエリ: `from`（任意、`YYYY-MM-DD`）。省略時は全期間。起点日の決め方は `GET /records/trends` と同じ。
- レスポンス:

  ```json
  { "points": [{ "date": "2026-10-01", "weightKg": 65.2 }] }
  ```

  - `points` は日付昇順で、履歴がある日のみ。
- エラー: 400 `{ "error": "invalid from" }` / 503 `{ "error": "database unavailable" }`。

## エラーレスポンス

| ステータス | 例 | 条件 |
|-----------|----|----|
| 400 | `{ "error": "date is required" }` | 必須項目欠落・不正 JSON |
| 401 | — | 認証なし（書き込み系） |
| 403 | — | 管理者以外 |
| 404 | — | 対象日付の記録が存在しない |
| 409 | `{ "error": "duplicate date" }` | 同日重複（POST） |
| 500 | `{ "error": "failed to create record" }` / `{ "error": "failed to update record" }` | 記録の作成（POST）/ 更新（PATCH）中の想定外エラー。例外の生メッセージは返さず、サーバーログにのみ残す |
| 503 | `{ "error": "database unavailable" }` | DB 接続不可（`getPrisma()` が null） |

## バリデーション方針

- フロント側: フィールド単位でエラー表示し、エラーがある場合は保存を抑止（Issue #19）。
- サーバ側: 別 issue で対応予定。現時点ではフロントバリデーションのみ。
