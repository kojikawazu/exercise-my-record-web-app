# テスト設計: exercise-my-record-web-app 全体

## 目次

- [対象](#対象)
- [前提: リファクタリング方針](#前提-リファクタリング方針)
- [テスト環境セットアップ](#テスト環境セットアップ)
  - [追加パッケージ](#追加パッケージ)
  - [追加スクリプト (package.json)](#追加スクリプト-packagejson)
  - [設定ファイル](#設定ファイル)
- [テストケース一覧](#テストケース一覧)
  - [1. `validation/record.ts` — 純粋バリデーション関数](#1-validationrecordts--純粋バリデーション関数)
  - [2. `lib/calorie.ts` — カロリー計算関数](#2-libcaloriets--カロリー計算関数)
  - [3. `hooks/useRecordValidation` — フックの状態管理](#3-hooksuserecordvalidation--フックの状態管理)
  - [4. API Routes — `GET/POST /api/records`](#4-api-routes--getpost-apirecords)
  - [5. API Routes — `GET/PATCH/DELETE /api/records/[date]`](#5-api-routes--getpatchdelete-apirecordsdate)
  - [5b. API Routes — masters / profile / admin/me（Phase 1 追加）](#5b-api-routes--masters--profile--adminmephase-1-追加)
  - [5c. 統合テスト（IT）— 実 DB（Testcontainers）（Phase 2 追加）](#5c-統合テストit-実-dbtestcontainersphase-2-追加)
  - [5d. E2E — 実 DB（docker-compose）化（Phase 3）](#5d-e2e--実-dbdocker-compose化phase-3)
  - [5e. シナリオテスト — 複数機能横断（Phase 4）](#5e-シナリオテスト--複数機能横断phase-4)
  - [6. E2Eテスト — 拡充方針（旧・モック時代の記録）](#6-e2eテスト--拡充方針旧モック時代の記録)
- [テスト構成まとめ](#テスト構成まとめ)
  - [ユニットテスト (Vitest)](#ユニットテスト-vitest)
  - [E2Eテスト (Playwright)](#e2eテスト-playwright)
- [モック方針](#モック方針)
- [実装順序](#実装順序)

## 対象

- 対象機能: バリデーション / カロリー計算 / useRecordValidation フック / API Routes (records, profile, masters) / E2Eフロー
- 対象ファイル:
  - `front/src/hooks/useRecordValidation.ts`
  - `front/src/lib/calorie.ts`
  - `front/src/app/api/records/route.ts`
  - `front/src/app/api/records/[date]/route.ts`
  - `front/src/app/api/profile/route.ts`
  - `front/src/app/api/masters/route.ts`
  - `front/src/app/api/masters/[id]/route.ts`
  - `front/src/lib/adminAuth.ts`
  - `front/tests/e2e/smoke.spec.ts`
- スタック: Next.js 16 (App Router) + Prisma v6 + Supabase / Vitest + Playwright

---

## 前提: リファクタリング方針

バリデーション純粋関数（`computeErrors`, `validateNumericField`, `validatePositiveNumericField`）を
`front/src/lib/validation.ts` に切り出してから実装する。
`useRecordValidation.ts` はそのロジックを import して使う構造に変更する。

---

## テスト環境セットアップ

### 追加パッケージ

```bash
cd front
pnpm add -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

### 追加スクリプト (package.json)

```json
"test": "vitest run",
"test:watch": "vitest",
```

### 設定ファイル

- `front/vitest.config.ts` — jsdom環境, パスエイリアス設定
- `front/tests/setup/setup.ts` — jest-dom のマッチャー登録

---

## テストケース一覧

---

### 1. `validation/record.ts` — 純粋バリデーション関数

**テストファイル**: `front/tests/unit/validation/record.test.ts`（#141 で `lib/validation.ts` から移設）

#### 正常系

| # | テストケース | 入力 | 期待結果 | 優先度 |
|---|---|---|---|---|
| N-1 | 全フィールドが有効な場合エラーなし | date="2026-01-01", workout(part/name/sets/reps/weight すべて有効), cardio なし | `errors = { workouts: {}, cardios: {} }` | High |
| N-2 | 有酸素あり・全フィールド有効 | 上記 + cardio(minutes=30, distance=5.0) | エラーなし | High |
| N-3 | 有酸素が完全空行の場合はバリデーションスキップ | cardio(minutes="", distance="") | cardios にエラーなし | High |
| N-4 | weight=0 は許容（0kg スタート） | weight="0" | エラーなし | Medium |
| N-5 | 小数値を許容 | sets="1.5", reps="10.5", weight="55.5", minutes="30.5", distance="5.5" | エラーなし | Medium |

#### 準正常系

| # | テストケース | 入力 | 期待結果 | 優先度 |
|---|---|---|---|---|
| S-1 | 日付が空 | date="" | `errors.date = '日付を選択してください'` | High |
| S-2 | 部位が未選択 | workout.part="" | `errors.workouts[id].part` が設定される | High |
| S-3 | 種目名が空白のみ | workout.name="   " | `errors.workouts[id].name` が設定される | High |
| S-4 | セット数が空 | workout.sets="" | `errors.workouts[id].sets = '値を入力してください'` | High |
| S-5 | セット数が0 | workout.sets="0" | `errors.workouts[id].sets = '正しい数値を入力してください'` | High |
| S-6 | セット数が負数 | workout.sets="-1" | `errors.workouts[id].sets = '正しい数値を入力してください'` | High |
| S-7 | 重量が空 | workout.weight="" | `errors.workouts[id].weight = '値を入力してください'` | High |
| S-8 | 重量が負数（体重分のみ許容しない） | workout.weight="-1" | `errors.workouts[id].weight = '正しい数値を入力してください'` | High |
| S-9 | 有酸素: 時間のみ入力で距離が空 | cardio(minutes="30", distance="") | `errors.cardios[id].distance` が設定される | High |
| S-10 | 有酸素: 距離のみ入力で時間が空 | cardio(minutes="", distance="5") | `errors.cardios[id].minutes` が設定される | High |
| S-11 | 有酸素: minutes=0 | cardio(minutes="0", distance="5") | `errors.cardios[id].minutes = '正しい数値を入力してください'` | High |
| S-12 | 複数workoutの一部のみエラー | workout1=有効, workout2=part空 | workout2のみエラー | Medium |
| S-13 | sets が NaN 文字列 | workout.sets="abc" | `errors.workouts[id].sets` が設定される | Medium |
| S-14 | 有酸素: 入力のある行で種別が空 | cardio(type="", minutes="30", distance="5") | `errors.cardios[id] = { type: '種別を選択してください' }` | High |
| S-15 | 有酸素: 未入力行の種別が空 | cardio(type="", minutes="", distance="") | cardios にエラーなし | Medium |

#### 異常系

| # | テストケース | 入力 | 期待結果 | 優先度 |
|---|---|---|---|---|
| A-1 | workout が空配列 | workouts=[] | `errors.workouts = {}` | Medium |
| A-2 | cardio が空配列 | cardios=[] | `errors.cardios = {}` | Medium |

---

### 2. `lib/calorie.ts` — カロリー計算関数

**テストファイル**: `front/tests/unit/lib/calorie.test.ts`

#### 正常系

| # | テストケース | 入力 | 期待結果 | 優先度 |
|---|---|---|---|---|
| N-1 | ランのカロリー計算 | weight=60, minutes=60, type="ラン" | `8.0 * 60 * 1.0 = 480` | High |
| N-2 | ウォークのカロリー計算 | weight=60, minutes=60, type="ウォーク" | `4.0 * 60 * 1.0 = 240` | High |
| N-3 | 英語エイリアス "run" が機能する | type="run" | "ラン" と同値 | Medium |
| N-4 | 英語エイリアス "walk" が機能する | type="walk" | "ウォーク" と同値 | Medium |
| N-5 | 筋トレカロリー計算 | weight=60, totalSets=10 | `60 * 0.1 * 10 = 60` | High |
| N-6 | formatCalories が整数丸め+kcal表示 | value=123.7 | `"124 kcal"` | Medium |
| N-7 | 30分の有酸素（端数） | weight=60, minutes=30, type="ラン" | `8.0 * 60 * 0.5 = 240` | Medium |

#### 準正常系

| # | テストケース | 入力 | 期待結果 | 優先度 |
|---|---|---|---|---|
| S-1 | 未知の種別は MET=0 (カロリー0) | type="cycling" | `0` | Medium |
| S-2 | minutes=0 はカロリー0 | minutes=0 | `0` | Medium |
| S-3 | formatCalories(0) | value=0 | `"0 kcal"` | Low |

#### 異常系

| # | テストケース | 入力 | 期待結果 | 優先度 |
|---|---|---|---|---|
| A-1 | weight=0 でも計算は 0 を返す | weight=0, minutes=60, type="ラン" | `0` | Low |

---

### 3. `hooks/useRecordValidation` — フックの状態管理

**テストファイル**: `front/tests/unit/hooks/useRecordValidation.test.ts`

#### 正常系

| # | テストケース | 入力 | 期待結果 | 優先度 |
|---|---|---|---|---|
| N-1 | 初期状態でsubmittedはfalse、displayErrors は空 | 初期レンダー | `submitted=false`, `displayErrors = { workouts:{}, cardios:{} }` | High |
| N-2 | setSubmitted(true) でエラーが表示に反映される | エラーあり状態で setSubmitted(true) | `displayErrors` に実際のエラーが入る | High |
| N-3 | 有効なデータでは hasErrors=false | 全フィールド有効 | `hasErrors=false` | High |

#### 準正常系

| # | テストケース | 入力 | 期待結果 | 優先度 |
|---|---|---|---|---|
| S-1 | 未submit時はエラーがあっても displayErrors が空 | date="" + submitted=false | `displayErrors.date` が undefined | High |
| S-2 | エラーあり状態で hasErrors=true | date="" | `hasErrors=true` | High |
| S-3 | データ更新で rawErrors がリアクティブに更新 | date を "" → 有効値へ変更 | `rawErrors.date` が消える | Medium |

---

### 4. API Routes — `GET/POST /api/records`

**テストファイル**: `front/tests/unit/app/api/records/route.test.ts`

モック方針: `vi.mock('@/lib/prisma')`, `vi.mock('@/lib/adminAuth')`

#### 正常系

| # | テストケース | 入力 | 期待結果 | 優先度 |
|---|---|---|---|---|
| N-1 | GETで記録一覧を返す | page=1, DB に2件 | `{ records:[...], totalCount:2, page:1, totalPages:1 }` | High |
| N-2 | GETでページングが機能する | page=2, 15件存在 | page=2, totalPages=2, records が5件 | High |
| N-3 | POSTで記録を作成 (E2Eバイパス時) | 有効な body | status 200, `{ id: "..." }` | High |
| N-4 | GETで page 未指定時は page=1 | page クエリなし | `page: 1` | Medium |

#### 準正常系

| # | テストケース | 入力 | 期待結果 | 優先度 |
|---|---|---|---|---|
| S-1 | POST: date なし | body = {} | status 400, `{ error: 'date is required' }` | High |
| S-2 | POST: 同日重複 | 既存日付で POST | status 409, `{ error: 'duplicate date' }` | High |
| S-3 | POST: 認証なし (非E2E) | Authorization ヘッダーなし | status 401 | High |
| S-4 | POST: 非管理者メール | 別メールのトークン | status 403 | High |
| S-5 | GET: page が文字列 "abc" | page="abc" | page=1 にフォールバック | Medium |
| S-6 | GET: page が範囲外 (999) | page=999, 5件 | page=totalPages にクランプ | Medium |

#### 異常系

| # | テストケース | 入力 | 期待結果 | 優先度 |
|---|---|---|---|---|
| A-1 | DB unavailable (prisma=null) | getPrisma() が null | status 503, `{ error: 'database unavailable' }` | High |
| A-2 | POST: body が不正 JSON | Content-Type:json + 壊れたbody | status 400 | Medium |
| A-3 | POST: 作成中に DB 例外（#121） | 子行 create が内部情報を含む Error を throw | status 500, `{ error: 'failed to create record' }`（生メッセージを含まない） | High |
| A-4 | POST: DB 例外時のログ（#121） | 同上 | `console.error` に例外オブジェクトそのものを渡す（スタックを残す） | High |
| A-5 | POST: Error 以外の値が throw される（#121） | 親 create が文字列を reject | status 500, 定型メッセージ | Medium |

---

### 5. API Routes — `GET/PATCH/DELETE /api/records/[date]`

**テストファイル**: `front/tests/unit/app/api/records/[date]/route.test.ts`

#### 正常系

| # | テストケース | 入力 | 期待結果 | 優先度 |
|---|---|---|---|---|
| N-1 | GETで記録詳細を返す | date="2026-01-01", DBに存在 | workouts/cardios 配列を含むレスポンス | High |
| N-2 | PATCHで記録を更新 | 有効 body, DB に存在 | status 200, `{ id: "..." }` | High |
| N-3 | DELETEで記録を削除 | date 存在 | status 200, `{ ok: true }` | High |

#### 準正常系

| # | テストケース | 入力 | 期待結果 | 優先度 |
|---|---|---|---|---|
| S-1 | GET: 存在しない日付 | date="2099-01-01" | status 404 | High |
| S-2 | PATCH: 存在しない日付 | date="2099-01-01" | status 404 | High |
| S-3 | DELETE: 存在しない日付 | date="2099-01-01" | status 404 | High |
| S-4 | PATCH: 認証なし | Authorization なし | status 401 | High |
| S-5 | DELETE: 認証なし | Authorization なし | status 401 | High |
| S-6 | PATCH: 不正 body | `{}` | status 400 | Medium |

#### 異常系

| # | テストケース | 入力 | 期待結果 | 優先度 |
|---|---|---|---|---|
| A-1 | DB unavailable | getPrisma() が null | status 503 | High |
| A-2 | PATCH: 更新中に DB 例外（#121） | 子行 create が内部情報を含む Error を throw | status 500, `{ error: 'failed to update record' }`（生メッセージを含まない） | High |
| A-3 | PATCH: DB 例外時のログ（#121） | 親 update が Error を throw | `console.error` に例外オブジェクトそのものを渡す（スタックを残す） | High |
| A-4 | PATCH: Error 以外の値が throw される（#121） | deleteMany が文字列を reject | status 500, 定型メッセージ | Medium |

---

### 5b. API Routes — masters / profile / admin/me（Phase 1 追加）

テスト戦略 Phase 1 で、未カバーだった API Route Handler に UT を追加した。モックは外部 I/O（`@/lib/prisma` の `getPrisma`、`@/lib/adminAuth` の `requireAdmin`、`admin/me` は `@supabase/supabase-js` の `createClient`）のみ。ビジネスロジック（CSV 生成・カロリー等）は実物を検証する。

| テストファイル | 対象 | 件数 | 主な正常/準正常/異常 |
|---|---|---|---|
| `tests/unit/app/api/masters/route.test.ts` | GET / POST | 13 | 正: 一覧(name昇順)・作成 / 準: type不正400・name欠落400・重複409・**監査カラム非公開** / 異: 未認証401・503 |
| `tests/unit/app/api/masters/[id]/route.test.ts` | PATCH / DELETE | 11 | 正: 更新・削除 / 準: name欠落400・not found404・**監査カラム非公開** / 異: 未認証401・503・**DB の type 不正500** |
| `tests/unit/app/api/profile/route.test.ts` | GET / POST | 12 | 正: 取得・上書き(update+deleteMany)・新規create / 準: 未存在null・weightKg非数値400 / 異: 未認証401・DBエラー握りつぶし・503相当 |
| `tests/unit/app/api/admin/me/route.test.ts` | GET | 8 | 正: 管理者200(大小文字/前後空白許容) / 準: トークン欠落401・無効401・非管理者403 / 異: 認証設定不備500 |

補足:
- `admin/me` と `profile` はモジュールトップレベルの状態（env 捕捉 / `fallbackWeightKg`）に依存するため、`vi.resetModules()` + 動的 import でテスト順非依存にしている。
- UT/IT 合計 **136 件**（全 pass）。Issue #20 でデータ出力機能を削除したため、admin/export の 11 件は対象外。正常:異常（準正常+異常）比はスイート全体で概ね 1:2 以上。

---

### 5c. 統合テスト（IT）— 実 DB（Testcontainers）（Phase 2 追加）

テスト戦略 Phase 2 で、**モックを使わず実 PostgreSQL に対して** Route Handler を検証する IT レイヤーを新設した。

- 基盤: `@testcontainers/postgresql`（`postgres:16-alpine`）を IT 実行で 1 コンテナ起動。`prisma db push` でスキーマ適用。
- 設定: `front/vitest.it.config.ts`（`globalSetup` でコンテナ起動 + URL を `provide`、`setupFiles` で `DATABASE_URL` 注入 + 各テスト前 TRUNCATE）。ファイル命名 `*.it.test.ts`、コマンド `pnpm test:it`。UT（`pnpm test`）とは分離。
- 認証は `E2E_BYPASS=1` でバイパス（認証は admin/me の UT で別途担保）。

| テストファイル | 検証する実 DB 挙動 | 件数 |
|---|---|---|
| `tests/it/app/api/records/route.it.test.ts` | 作成→詳細往復・**同日 unique→409**・ページング(12件/10件)と日付降順・空状態・PATCH全置換・DELETE子行除去(孤児なし)・404 | 10 |
| `tests/it/app/api/profile/route.it.test.ts` | 保存往復・**繰り返し保存で 1 行維持(上書き)**・非数値400で行なし | 3 |
| `tests/it/app/api/masters/route.it.test.ts` | name昇順・type別スコープ・PATCH/DELETE・**複合unique(type,name)→409**・別typeなら同名可・404 | 6 |

IT 合計 19 件（全 pass）。モックでは検証できない DB 制約・並び順・トランザクション的挙動を実 DB で担保する。既存のモック route テストは高速な「ハンドラ UT」として併存する。

---

### 5d. E2E — 実 DB（docker-compose）化（Phase 3）

テスト戦略 Phase 3 で、E2E を **API モック（`page.route`）撤廃 → 実 Next サーバー → 実 API → 実 PostgreSQL** に切り替えた。

- 基盤: `front/docker-compose.e2e.yml`（`postgres:16-alpine`、ホスト 5433）。`pnpm run e2e:db:up` で起動。
- Playwright: `globalSetup` で `prisma db push`、`webServer` は compose DB の `DATABASE_URL` で dev 起動、`workers:1` 直列。
- データ: `tests/e2e/db.ts` の `resetAndSeedBaseline` 等を各テスト `beforeEach` で実行（マスター/プロフィール/記録2件のベースライン、ページング用の複数レコード）。
- 認証: サーバーは `E2E_BYPASS=1`、クライアントは localStorage バイパス（`injectAdminSession`）。データ API モックは全廃。
- 検証観点は「実永続化」まで: 記録追加→一覧/詳細に反映、同日重複→エラー通知、編集→詳細に反映、削除→一覧から消える、体重 seed→プロフィール反映 等。

E2E 合計 20 件（smoke 5 + record-crud 15、全 pass）。#124 で record-crud に日付初期値のケースを 1 件追加（21 件）。

---

### 5e. 日付の初期値（#124）

記録追加画面の日付初期値を「今日」にした。`/admin/records/new` は静的プリレンダリングされるため、初期値をサーバーで計算するとビルド時の日付（かつサーバーの UTC）が HTML に焼き込まれる。`hooks/useTodayLocalIso` は `useSyncExternalStore` でサーバー値（空文字）とクライアント値（今日）を分ける。

| テストファイル | 件数 | 主な正常/準正常/異常 |
|---|---|---|
| `tests/unit/lib/date.test.ts` | 4 | 正: `YYYY-MM-DD` 整形・ゼロ埋め / 準: ローカル 0 時直後・23 時台でも UTC 換算でずれない |
| `tests/unit/hooks/useTodayLocalIso.test.tsx` | 4 | 正: クライアントで今日を返す / 準: ローカル 0 時直後でも前日にならない / 異: サーバー描画は空（ビルド時の日付を焼き込まない）・hydration で mismatch を起こさない |

---

### 5f. records の repositories / hooks（#142）

records の API アクセスを `repositories/record.ts` と hooks に移した。モックは外部 I/O（グローバル `fetch`、`authFetch` が参照する `@/lib/supabase`）のみで、hooks のテストでも repositories はモックしない（変換まで実物で通す）。fetch モックの足場は `tests/setup/fetchMock.ts`。

| テストファイル | 件数 | 主な正常/準正常/異常 |
|---|---|---|
| `tests/unit/repositories/record.test.ts` | 12 | 正: 一覧・詳細・作成（Bearer / JSON）・更新・削除（本文を読まない） / 準: 404・409・401・503 を `status` で返す / 異: 通信エラーは `status: 0` |
| `tests/unit/lib/recordForm.test.ts` | 5 | 正: 数値変換・行 ID 除去 / 準: メモ trim・空は null、空数値は 0、空の有酸素行の除外、全行空なら null |
| `tests/unit/hooks/useRecordList.test.ts` | 8 | 正: 取得・サーバーの丸め後ページ・refetch / 準: ページ切替中は直前の結果を保持・**古いレスポンスを無視** / 異: 5xx・通信エラー・refetch 失敗 |
| `tests/unit/hooks/useRecordDetail.test.ts` | 5 | 正: 取得と `onLoaded` 1 回 / 準: 404 は not-found・**古いレスポンスを無視** / 異: 5xx・通信エラーは error |
| `tests/unit/hooks/useRecordMutations.test.ts` | 5 | 正: 作成（date 付与）・更新・関数参照の安定 / 準: 409・404 を返す |

画面の振る舞い（一覧・詳細・追加・編集・削除）は既存の E2E / シナリオで回帰を確認する。

### 5g. 記録フォームのマスター連動（#6）

記録追加・編集の選択肢（部位・種目・有酸素種別）をマスターから作る。モックは外部 I/O（グローバル `fetch`）のみ。

| テストファイル | 件数 | 主な正常/準正常/異常 |
|---|---|---|
| `tests/unit/repositories/master.test.ts` | 4 | 正: 種別をクエリに付けて取得 / 準: 0 件は空配列・503 を `status` で返す / 異: 通信エラーは `status: 0` |
| `tests/unit/hooks/useMasters.test.ts` | 3 | 正: 3 種別の名称を取得 / 準: 1 種別だけ失敗しても他は使え `error` / 異: 全失敗（通信エラー・5xx）は空配列で `error` |
| `tests/unit/lib/recordForm.test.ts`（`withCurrentOption`） | 5 | 正: 含まれていればそのまま / 準: マスターに無い現在値を先頭に足す・空値は足さない・マスター 0 件でも現在値を残す / 異: 引数の配列を変更しない |
| `tests/unit/validation/record.test.ts`（S-14 / S-15） | 2 | 準: 入力のある有酸素行の種別未選択はエラー・未入力行は種別を問わない |
| `tests/e2e/record-crud.spec.ts`（マスター連動） | 3 | 正: seed したマスターが選択肢・候補・既定値になる・マスター管理で追加した部位が選べる / 準: マスターから外した保存済みの部位が編集画面で残る |

### 5h. 前回の記録をコピー（#26）

記録追加画面で最新の記録の筋トレ・有酸素をフォームに流し込む。明細 → フォーム行の変換（`toFormRows`）は編集画面の初期値と共用する。モックは外部 I/O（グローバル `fetch`、`@/lib/supabase`）のみ。

| テストファイル | 件数 | 主な正常/準正常/異常 |
|---|---|---|
| `tests/unit/hooks/useLatestRecord.test.ts` | 6 | 正: 1 ページ目の先頭を最新とし明細を取得 / 準: 0 件は `empty`・`empty` の間は API を呼ばない・押下までに削除された（404）は失敗を返す / 異: 5xx・通信エラーは `error` |
| `tests/unit/lib/recordForm.test.ts`（`createWorkoutRow` / `toFormRows` / `isFormBlank`） | 8 | 正: 数値の文字列化と順序・空行の生成 / 準: 行 ID を振り直す・日付とメモを含めない・筋トレ 0 件なら空行 1 行・入力の有無の判定（重量 0・数値が空の有酸素行は入力ありとみなす） |
| `tests/e2e/record-crud.spec.ts`（前回の記録をコピー） | 3 | 正: 最新記録の 3 種目と有酸素が入り、メモは入らず、別日付で保存できる / 準: 入力済みなら確認し、キャンセルで入力を保持・OK で置換 / 記録 0 件ならボタン無効 |

### 5i. masters / profile / admin の repositories / hooks（#143）

マスター管理・プロフィール・推定消費カロリー・管理者判定の API アクセスを `repositories/` と hooks に移した（records の 5f と同じ方針）。モックは外部 I/O（グローバル `fetch`、`@/lib/supabase`）のみ。

| テストファイル | 件数 | 主な正常/準正常/異常 |
|---|---|---|
| `tests/unit/repositories/master.test.ts` | 12 | 正: 取得・追加（Bearer / JSON）・名称変更・削除（本文を読まない） / 準: 0 件・409・401・404 を `status` で返す / 異: 5xx・通信エラーは `status: 0` |
| `tests/unit/repositories/profile.test.ts` | 6 | 正: 取得・保存（Bearer / JSON） / 準: 未保存は `null`・401・400 / 異: 通信エラー |
| `tests/unit/repositories/admin.test.ts` | 4 | 正: 渡したトークンを付け `no-store` で判定 / 準: 403・401 / 異: 通信エラー |
| `tests/unit/hooks/useMasterList.test.ts` | 9 | 正: 取得・追加は先頭へ・名称はサーバー値で置換・削除 / 準: 種別切替中は前の種別を出さない・409 / 失敗時は一覧を変えない・**操作中にタブを切り替えても別種別へ反映しない** / 異: 取得失敗は空で `error` |
| `tests/unit/hooks/useProfile.test.ts` | 5 | 正: 取得・保存後に更新 / 準: 未保存は `null`・保存失敗は保存済みの値を保持 / 異: 取得失敗は `error` |
| `tests/unit/hooks/useAdminSession.test.tsx` | 12 | 正: セッションのトークンで管理者判定・バイパスフラグがあっても hydration で mismatch を起こさず、hydration 後に管理者になる / 準: 403 は非管理者・セッション無しは API を呼ばない・サーバー描画ではバイパス無効（判定中）・同一タブの `setBypassSession` と別タブの `storage` イベントに追従 / 異: 通信エラー・2xx の本文が JSON でない場合も判定を終えて非管理者・フラグ値が `'1'` 以外（`'0'` / `'true'` / 空）ならバイパスしない |

画面の振る舞い（マスター管理・プロフィール・カロリー表示・管理者メニュー）は既存の E2E / シナリオで回帰を確認する。

### 5j. セキュリティヘッダー（#122）

全レスポンスに付与するセキュリティヘッダー（`lib/securityHeaders.ts`）。値の組み立ては純粋関数として UT で、`next.config.ts` の `headers()` が実際に適用されることは E2E で確認する。

| テストファイル | 件数 | 主な正常/準正常/異常 |
|---|---|---|
| `tests/unit/lib/securityHeaders.test.ts` | 11 | 正: 5 種類のヘッダーと値・本番の CSP（`'unsafe-eval'` なし、`connect-src` に Supabase のオリジン） / 準: `next dev` のときだけ `'unsafe-eval'`・Supabase の URL（末尾スラッシュ・パス付き・ローカルのポート付き http）をオリジンに正規化 / 異: 未設定・空文字・URL として不正・http(s) 以外・CSP の区切りを含む値は `connect-src 'self'` のみ |
| `tests/e2e/smoke.spec.ts` | 1 | 正: 画面（`/`）と Route Handler（`/api/records`）の双方のレスポンスに 5 種類のヘッダーが付く |

CSP の強制で画面が壊れないことは、既存の E2E / シナリオ全件を強制モードで実行して確認する（観測記録は `docs/06-security-specification.md`）。

### 5k. サーバー専用モジュールの境界（#114）

`lib/prisma.ts` / `lib/adminAuth.ts` に `import 'server-only'` を追加した。境界の検知は `next build` が担うため、自動テストは追加しない（ビルド成否の検証はテストランナーの対象外）。代わりに以下を手動で確認した。

| 確認内容 | 結果 |
|---|---|
| Client Component（`AdminLoginClient.tsx`）から `lib/prisma` を import して `next build` | 失敗（`'server-only' cannot be imported from a Client Component module`） |
| 同じく `lib/adminAuth` を import して `next build` | 失敗（同上） |
| 対照: `lib/adminAuth` から `import 'server-only'` を外し、同じ誤 import で `next build` | **成功してしまう**（＝検知は `server-only` によるもの） |

既存テストへの影響: UT は `@/lib/prisma` / `@/lib/adminAuth` をモックしているため影響なし。IT は実物を読むため、`vitest.it.config.ts` で `server-only` を空モジュールに差し替えた（IT 19 件パス）。

### 5l. 記録編集の戻り先（#32）

記録編集画面の保存後の遷移先・戻りリンクを遷移元（`?from=`）で切り替える。戻り先の決定は純粋関数（`lib/recordEditNavigation.ts`）として UT で、画面遷移は E2E で確認する。クエリの値を URL として使わないこと（オープンリダイレクト防止）を準正常・異常系で確認する。

| テストファイル | 件数 | 主な正常/準正常/異常 |
|---|---|---|
| `tests/unit/lib/recordEditNavigation.test.ts` | 10 | 正: 編集リンク（`from` なし / `?from=detail`）・`detail` は詳細へ・省略は管理者一覧へ / 準: 未知の値・空文字・複数指定（配列）・大文字違いは管理者一覧へ / 異: 外部 URL・プロトコル相対 URL を渡されても管理者一覧へ |
| `tests/e2e/record-crud.spec.ts`（編集の戻り先） | 4 | 正: 詳細 →「編集」→ 保存で詳細へ戻り変更が反映・詳細から入ると戻りリンクが「詳細へ戻る」・管理者一覧から入ると「管理者一覧へ戻る」 / 異: `from` に外部 URL を指定しても保存後は管理者一覧へ |

### 5m. 一覧カードのメニュー表示（#23）

`GET /api/records` が各記録の明細（`workouts` / `cardios`）を返し、公開一覧・管理者一覧のカードが共通部品 `RecordMenuList` でメニューを表示する。レスポンス整形（行 ID・監査列を返さない）は UT、実 DB での明細の取得は IT、表示は E2E で確認する。モックは外部 I/O（Prisma）のみ。

| テストファイル | 件数 | 主な正常/準正常/異常 |
|---|---|---|
| `tests/unit/app/api/records/route.test.ts`（一覧の明細） | 3 | 正: 明細と `totalSets` を返す / 準: 明細 0 件の日は空配列・`totalSets` 0 / 異: Prisma の行が持つ `id` / `recordId` / 監査列 / `memo` をレスポンスに含めない（キー集合の完全一致） |
| `tests/it/app/api/records/route.it.test.ts`（一覧の明細） | 2 | 正: 作成した筋トレ 2 種目・有酸素が一覧に含まれる（並び順に依存しない比較） / 準: 明細なしの記録は空配列 |
| `tests/e2e/record-crud.spec.ts`（一覧カード） | 3 | 正: 公開一覧のカードに種目・セット×回数/重量・有酸素の時間/距離が表示され、サマリーは表示されない・管理者一覧にも表示される / 準: 有酸素の無い日は「有酸素の記録なし」 |
| `tests/e2e/smoke.spec.ts` | 既存 1 件を更新 | 正: 一覧に「筋トレメニュー」「有酸素メニュー」「推定消費カロリー」が表示される |

### 5n. カレンダー画面（#21）

月表示のカレンダーと `GET /api/records/calendar`。月グリッド・月の検証/移動は純粋関数（`lib/calendar.ts`。日付ピッカーと共用）として UT、月の範囲指定（半開区間）は実 DB の IT、画面の遷移は E2E で確認する。モックは外部 I/O（Prisma・`fetch`・Supabase）のみ。

| テストファイル | 件数 | 主な正常/準正常/異常 |
|---|---|---|
| `tests/unit/lib/calendar.test.ts` | 14 | 正: `YYYY-MM` の受理・前月/次月・月初の曜日に合わせた空白（日曜始まり） / 準: 未指定・`00`/`13` 月・ゼロ埋め無し・余分な部分・配列は `null`・12 月→翌年 1 月・1 月→前年 12 月・うるう年 2/29・30 日月 / 異: 非日付文字列・先頭 0 の年・SQL 片を含む値は `null` |
| `tests/unit/app/api/records/calendar/route.test.ts` | 6 | 正: 記録日の一覧・UTC の半開区間と昇順で問い合わせる / 準: 記録の無い月は空配列・`month` 欠落と範囲外の月は 400（DB を問い合わせない） / 異: DB 接続不可は 503 |
| `tests/unit/hooks/useRecordCalendar.test.ts` | 7 | 正: 月の記録日を取得 / 準: 月が未確定（空文字）の間は取得しない・記録 0 件は `ready`・月の切替中は前の月を持ち越さない・切替後に届いた古い応答を反映しない / 異: 5xx・通信エラーは `error` |
| `tests/unit/repositories/record.test.ts`（`fetchRecordCalendar`） | 3 | 正: 月を付けて要求 / 準: 400 を `status` で返す / 異: 月の値をエンコードし、余分なクエリを足せない |
| `tests/it/app/api/records/calendar/route.it.test.ts` | 5 | 正: 月内の記録日を昇順で返す / 準: 月初・月末を含み隣接月を含まない・12 月と翌年 1 月の境界・うるう年の 2/29・記録の無い月は空配列 |
| `tests/e2e/calendar.spec.ts` | 6 | 正: 記録日のクリックで詳細へ・前月/次月と戻る・12 月→翌年 1 月・サイドバーから開ける / 準: 記録の無い日・月はリンクにならない・不正な `month` は今月を表示 |

日付ピッカー（`DatePicker`）の月グリッドは `lib/calendar.ts` の `buildMonthCells` に移したため、既存の記録追加・編集の E2E で回帰を確認する。

### 5o. 推移グラフ（#22）

推移グラフ画面と `GET /api/records/trends`。期間・起点日・日付の検証と系列の組み立ては純粋関数（`lib/trends.ts`）、カロリー算定の共通化（`estimateDailyCalories` / `toCalorieCardioType`）は既存挙動の固定として UT、起点日の扱いは実 DB の IT、画面は E2E で確認する。モックは外部 I/O（Prisma・`fetch`・Supabase）のみ。

| テストファイル | 件数 | 主な正常/準正常/異常 |
|---|---|---|
| `tests/unit/lib/trends.test.ts` | 17 | 正: 期間の受理・今日を含む 7/30/90 日・全期間は起点なし・系列の組み立て・現在の体重でのカロリー / 準: 未指定・未知・大文字違い・配列は `1m`・月/年またぎ・うるう年・未知の有酸素種別はラン扱い・体重未設定はカロリー系列なし・点 0 件 / 異: 暦に無い日付（2/29・2/30・4/31）・形式不正 |
| `tests/unit/lib/calorie.test.ts`（追加分） | 8 | 正: 筋トレ + 有酸素の合算・複数の有酸素 / 準: 有酸素なし・`ウォーク` 以外はラン扱い（一覧・詳細の既存挙動を固定）・寄せない場合の未知種別は 0 / 異: 体重 0 |
| `tests/unit/app/api/records/trends/route.test.ts` | 8 | 正: 日ごとの集約・`from`（UTC 0 時）以降を昇順で問い合わせる・省略時は全期間 / 準: 記録なしは空配列・明細なしの日は 0 / 異: 不正な `from` は 400（DB を問い合わせない）・ID・監査列・メモを返さない・DB 接続不可は 503 |
| `tests/unit/hooks/useRecordTrends.test.ts` | 7 | 正: 起点日付き・全期間の取得 / 準: 期間未確定の間は取得しない・切替中は前の期間を持ち越さない・古い応答を反映しない / 異: 5xx・通信エラーは `error` |
| `tests/unit/repositories/record.test.ts`（`fetchRecordTrends`） | 3 | 正: 起点日付き・全期間はクエリなし / 準: 400 を `status` で返す |
| `tests/it/app/api/records/trends/route.it.test.ts` | 4 | 正: 日ごとの集約と昇順 / 準: 起点日当日を含み前日を含まない・起点日以降に記録が無ければ空 / 異: 暦に無い日付は 400 |
| `tests/e2e/trends.spec.ts` | 5 | 正: 全期間で 3 指標のグラフと表（値と日付順）・体重 65kg でのカロリー値・期間の切替が URL に反映・サイドバーから開ける / 準: 記録の無い期間は空状態・不正な期間は 1 ヶ月 |

体重未設定時の案内は E2E では再現できない。`GET /api/profile` が一度読んだ体重をプロセス内に保持し（`fallbackWeightKg`）、DB からプロフィールを消しても同じ値を返すため。分岐の判定は `buildTrendSeries` の UT（体重 `null` でカロリー系列が `null`）で担保する。

一覧・詳細の推定カロリーは `toCalorieCardioType` / `estimateDailyCalories` へ置き換えたため、既存の E2E・シナリオ（`profile-calorie.spec.ts`）で回帰を確認する。

### 5p. トップページのダッシュボード（#27）

今週のサマリー・今月のヒートマップ・最新の記録。新しい API は作らず、推移 API（#22）・カレンダー API（#21）・一覧 API（#23 の明細）を再利用する。週の範囲・集計・先週比は純粋関数（`lib/dashboard.ts`）として UT、画面は「今日」基準の相対日付で seed して E2E で確認する。モックは外部 I/O（`fetch`・Supabase）のみ。

| テストファイル | 件数 | 主な正常/準正常/異常 |
|---|---|---|
| `tests/unit/lib/dashboard.test.ts` | 13 | 正: 月曜始まりの今週と先週の同じ曜日まで・範囲内の回数/セット数/カロリー・増減率 / 準: 月曜（1 日だけの週）・日曜は週末扱い・月/年またぎ・範囲の端を含み範囲外を除く・記録なしは 0・体重未設定はカロリー `null`・未知の有酸素種別はラン扱い・変化なし 0%・今週 0 は -100% / 異: 先週 0 は比を定義しない（`null`） |
| `tests/unit/hooks/useWeeklySummary.test.ts` | 4 | 正: 先週の月曜から 1 回だけ取得して今週・先週に振り分ける / 準: 体重未設定・記録なし / 異: 取得失敗は `error` で集計なし |
| `tests/e2e/dashboard.spec.ts` | 5 | 正: 今週の回数・セット数・カロリーと先週比・ヒートマップから詳細へ・最新の記録の種目 / 準: 先週の記録が無ければ「先週は記録なし」・2 ページ目以降はダッシュボードを出さない |

1 ページ目では最新の記録の日付がダッシュボードと一覧の両方に出るため、一覧を対象にした既存の E2E・シナリオは一覧の領域（`role="region"`・名前「記録一覧」）に絞って確認するよう更新した。

### 5d-2. テスト DB の接続先ガード（#116）

`front/tests/setup/test-database-url.ts` の UT（`tests/unit/setup/test-database-url.test.ts`）。IT / E2E が本番 DB に接続しないことを保証する。

| 分類 | ケース | 期待結果 |
|---|---|---|
| 正常系 | `TEST_DATABASE_URL` 未設定 | 既定 `postgresql://e2e:e2e@localhost:5433/e2e` |
| 正常系 | `TEST_DATABASE_URL` がローカル（127.0.0.1） | その値を返す |
| 正常系 | `localhost` / `127.0.0.1` / `[::1]` の URL | 同じ URL を返す（3 件） |
| 準正常系 | `DATABASE_URL` に本番 URL（`TEST_DATABASE_URL` なし） | 参照せず既定値を返す |
| 準正常系 | `TEST_DATABASE_URL` が空文字 | 既定値を返す |
| 準正常系 | `TEST_DATABASE_URL` がリモート | ホスト名入りで throw |
| 準正常系 | リモートホスト | throw（「ローカルではありません」） |
| 準正常系 | `localhost.example.com` | throw（前方一致で通さない） |
| 準正常系 | 失敗メッセージ | 起動コマンドと既定 URL を含む |
| 準正常系 | 失敗メッセージ | パスワードを含まない |
| 異常系 | URL として不正な値 / 空文字 | throw（「URL として解釈できません」、2 件） |

合計 14 件（正常 5 : 準正常・異常 9）。

### 5d-3. ローカル DB 判定と `next dev` 起動ガード（#125）

`front/src/lib/localDatabaseUrl.ts` の UT（`tests/unit/lib/localDatabaseUrl.test.ts`）。allowlist 判定（`checkLocalDatabaseUrl`）は 5d-2 のテスト DB ガードと共有し、`next dev` が本番 DB に接続したまま起動しないことを保証する（`assertDevDatabaseUrl`）。

| 分類 | 対象 | ケース | 期待結果 |
|---|---|---|---|
| 正常系 | check | `localhost` / `127.0.0.1` / `[::1]` の URL | `{ ok: true }`（3 件） |
| 準正常系 | check | リモートホスト | `reason: 'remote'` とホスト名 |
| 準正常系 | check | `localhost.example.com` | `reason: 'remote'`（前方一致で通さない） |
| 異常系 | check | URL として不正な値 / 空文字 | `reason: 'invalid'`（2 件） |
| 正常系 | dev | ローカル Supabase（`127.0.0.1:54322`） | throw しない |
| 正常系 | dev | `DATABASE_URL` 未設定（503 フォールバック） | throw しない |
| 準正常系 | dev | `DATABASE_URL` が空文字 | throw しない |
| 準正常系 | dev | 本番 URL | ホスト名入りで throw |
| 準正常系 | dev | `PROD_DATABASE_URL` に本番 URL（`DATABASE_URL` はローカル） | 参照せず throw しない |
| 準正常系 | dev | 失敗メッセージ | 起動コマンド `pnpm run dev:db:up` を含む |
| 準正常系 | dev | 失敗メッセージ | パスワードを含まない |
| 異常系 | dev | URL として不正な値 | throw（「URL として解釈できません」） |

合計 15 件（正常 5 : 準正常・異常 10）。

---

### 5e. シナリオテスト — 複数機能横断（Phase 4）

テスト戦略 Phase 4 で、単機能フローの E2E とは別に **複数機能をまたぐユーザージャーニー** を検証するシナリオ層を新設した。

- 配置: `front/tests/scenario/`。Playwright を 2 プロジェクト化（`--project=e2e` / `--project=scenario`）し、compose DB・`globalSetup`・`tests/e2e/db.ts` の seed/reset を共有する。コマンド `pnpm run test:scenario`。
- CI: `scenario-test` ジョブ（E2E と同じ実 DB 基盤）。

| シナリオ | 横断する機能 |
|---|---|
| `admin-lifecycle.spec.ts` | 記録追加 → 一覧 → 詳細 → 編集 → 詳細反映 → 削除 → 一覧消滅（管理 CRUD 一気通貫） |
| `visitor-browsing.spec.ts` | 一覧 → ページング → 詳細（カロリー表示）。管理者操作が出ないことも確認 |
| `profile-calorie.spec.ts` | プロフィール体重変更 → 詳細の推定消費カロリーが再計算（100kg→490kcal / 50kg→245kcal） |

シナリオ合計 3 件（全 pass）。単一機能では見えない「機能間の連動・一連の操作」を実 DB で担保する。

---

### 6. E2Eテスト — 拡充方針（旧・モック時代の記録）

> 下記はモック API 時代の設計メモ。実 DB 化の現行仕様は上記 5d を参照。

**テストファイル**: `front/tests/e2e/smoke.spec.ts` (既存拡充) + 新規ファイル追加

#### 現在の smoke.spec.ts カバー範囲

- 一覧ページ表示 / ページング API 検証
- 詳細ページ表示 / 非管理者での編集ボタン非表示
- 管理者: 詳細→編集ナビゲーション
- 管理者: 各ページ表示 / バリデーション / 有酸素複数行 / プロフィール保存

#### 追加すべき E2E ケース

**ファイル**: `front/tests/e2e/record-crud.spec.ts`

| # | テストケース | シナリオ | 優先度 |
|---|---|---|---|
| E-1 | 記録追加フロー（筋トレのみ） | ログイン→new→日付選択→筋トレ入力→保存→一覧に反映 | High |
| E-2 | 記録追加フロー（有酸素あり） | 上記 + 有酸素行追加→入力→保存 | High |
| E-3 | 記録編集フロー | 詳細の「編集」→データ変更→保存→詳細に反映 | High |
| E-4 | 同日重複エラー | 既存日付で記録追加→エラー通知表示 | High |
| E-5 | 記録削除フロー | 管理者一覧→削除→一覧から消える | High |
| E-6 | ページング動作 | 11件以上存在時: 次へ→page=2, 前へ→page=1 | Medium |
| E-7 | 未ログインで管理者URL直打ち | `/admin/records/new` → `/admin/login` にリダイレクト | High |
| E-8 | 体調メモの保存と表示 | memo 入力→保存→詳細に表示 | Medium |
| E-9 | 日付の初期値（#124） | new を開く→ブラウザのローカル日付の今日が表示される→DatePicker で別日に変更できる。空フォーム保存で日付エラーが出ない | High |

---

## テスト構成まとめ

### ユニットテスト (Vitest)

| ファイル | テスト数目安 | 優先度 |
|---|---|---|
| `tests/unit/validation/record.test.ts` | 15件 | High |
| `tests/unit/lib/calorie.test.ts` | 10件 | High |
| `tests/unit/hooks/useRecordValidation.test.ts` | 8件 | High |
| `tests/unit/app/api/api/records/route.test.ts` | 10件 | High |
| `tests/unit/app/api/api/records/[date]/route.test.ts` | 10件 | High |

### E2Eテスト (Playwright)

| ファイル | ケース数目安 |
|---|---|
| `tests/e2e/smoke.spec.ts` (既存) | 4テスト (現状維持+整理) |
| `tests/e2e/record-crud.spec.ts` (新規) | 8件 |

---

## モック方針

- **モック許可**: `@/lib/prisma` (getPrisma), `@/lib/adminAuth` (requireAdmin), `@supabase/supabase-js` のみ
- **モック禁止**: バリデーション関数、カロリー計算関数、Hook の状態ロジック
- **E2E**: 実際の Dev サーバー + E2E bypass を使用。DB は実際に接続

---

## 実装順序

1. **Vitest セットアップ** (vitest.config.ts, setup.ts, package.json スクリプト追加)
2. **バリデーション関数の抽出** (`lib/validation.ts` に切り出し)
3. **ユニットテスト実装** (validation → calorie → useRecordValidation → API routes の順)
4. **E2E 追加テスト実装** (record-crud.spec.ts)
5. **全テスト実行・品質チェック**
