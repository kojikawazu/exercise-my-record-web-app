# テスト設計: exercise-my-record-web-app 全体

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
pnpm add -D vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

### 追加スクリプト (package.json)

```json
"test": "vitest run",
"test:watch": "vitest",
```

### 設定ファイル

- `front/vitest.config.ts` — jsdom環境, パスエイリアス設定
- `front/src/test/setup.ts` — jest-dom のマッチャー登録

---

## テストケース一覧

---

### 1. `lib/validation.ts` — 純粋バリデーション関数

**テストファイル**: `front/src/lib/__tests__/validation.test.ts`

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

#### 異常系

| # | テストケース | 入力 | 期待結果 | 優先度 |
|---|---|---|---|---|
| A-1 | workout が空配列 | workouts=[] | `errors.workouts = {}` | Medium |
| A-2 | cardio が空配列 | cardios=[] | `errors.cardios = {}` | Medium |

---

### 2. `lib/calorie.ts` — カロリー計算関数

**テストファイル**: `front/src/lib/__tests__/calorie.test.ts`

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

**テストファイル**: `front/src/hooks/__tests__/useRecordValidation.test.ts`

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

**テストファイル**: `front/src/app/api/records/__tests__/route.test.ts`

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

---

### 5. API Routes — `GET/PATCH/DELETE /api/records/[date]`

**テストファイル**: `front/src/app/api/records/[date]/__tests__/route.test.ts`

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

---

### 6. E2Eテスト — 拡充方針

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

---

## テスト構成まとめ

### ユニットテスト (Vitest)

| ファイル | テスト数目安 | 優先度 |
|---|---|---|
| `lib/__tests__/validation.test.ts` | 15件 | High |
| `lib/__tests__/calorie.test.ts` | 10件 | High |
| `hooks/__tests__/useRecordValidation.test.ts` | 8件 | High |
| `api/records/__tests__/route.test.ts` | 10件 | High |
| `api/records/[date]/__tests__/route.test.ts` | 10件 | High |

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
