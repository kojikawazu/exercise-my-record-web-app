# 08 テスト仕様書（Test Specification）

テスト戦略・テストケース・カバレッジ目標・使用ツールを定義する。詳細なテスト設計は [`docs/test-design/test-design.md`](./test-design/test-design.md) を参照。

## 目次

- [テスト戦略](#テスト戦略)
  - [モック方針](#モック方針)
- [テストケース一覧（受け入れ E2E）](#テストケース一覧受け入れ-e2e)
  - [一般ユーザー](#一般ユーザー)
  - [管理者](#管理者)
  - [共通](#共通)
- [E2E テスト環境の仕組み（実 DB）](#e2e-テスト環境の仕組み実-db)
- [カバレッジ目標](#カバレッジ目標)
- [使用ツール](#使用ツール)

## テスト戦略

- ユニットテスト（Vitest）: バリデーション純粋関数 / カロリー計算 / `useRecordValidation` フック / API Routes（records, profile, masters）。
- E2E テスト（Playwright）: 主要な受け入れシナリオを実 Dev サーバー + E2E バイパスで検証。
- 原則（`.claude/rules/testing.md`）: テストは仕様の証明。正常系 1 : 異常系（準正常系 + 異常系）2 以上。ビジネスロジックはモックしない（モックは外部 I/O のみ）。曖昧なアサーションを避ける。

### モック方針

- モック許可: `@/lib/prisma`（getPrisma）, `@/lib/adminAuth`（requireAdmin）, `@supabase/supabase-js`。
- モック禁止: バリデーション関数、カロリー計算関数、フックの状態ロジック。
- E2E: 実 Dev サーバー + 実 API + 実 PostgreSQL（API・DB はモックしない）。認証のみバイパスする。

## テストケース一覧（受け入れ E2E）

詳細なユニット/E2E ケース表は [`docs/test-design/test-design.md`](./test-design/test-design.md) に定義。主要な受け入れシナリオは以下。

### 一般ユーザー

- 一覧を開くと記録が日付順で表示される / 1 日カードに合計値が表示される / 記録がない場合は空状態が表示される。
- 一覧から詳細へ遷移でき、日付/体調メモ/筋トレ一覧/有酸素詳細が表示される。

### 管理者

- ログイン/メニュー: 管理者がログインでき、ログイン後にメニューが表示される。一般ユーザーには表示されない。
- 記録追加: 画面を開け、日付に今日が初期表示され（変更も可）、筋トレ行を追加/削除でき、有酸素を入力して保存できる。同日保存はエラー通知。
- 記録編集/削除: 既存レコードを編集/削除できる。編集の保存後・戻りリンクは遷移元に戻る（詳細から入れば詳細、管理者一覧から入れば管理者一覧。不正な `from` は管理者一覧）。
- マスター管理: 初期マスター表示、部位/種目/有酸素種別の追加/削除/名称変更。

### 共通

- セキュリティヘッダー: 画面・API のレスポンスに CSP / `X-Content-Type-Options` / `X-Frame-Options` / `Referrer-Policy` / `Permissions-Policy` が付く。CSP を強制した状態で上記の受け入れシナリオがすべて通る。

## E2E テスト環境の仕組み（実 DB）

E2E・シナリオテストは **API も DB もモックしない**。実 Next サーバー → 実 API（Route Handler）→ 実 PostgreSQL を通して検証する（テスト戦略 Phase 3 で `page.route()` による API モックを撤廃。経緯は [`test-design.md`](./test-design/test-design.md)）。

1. **DB**: `front/docker-compose.e2e.yml` の PostgreSQL（`postgres:16-alpine`、ホスト 5433）。Playwright の外で `pnpm run e2e:db:up` により起動する（CI も同じコマンド）。
2. **スキーマ適用**: Playwright の `globalSetup`（`tests/e2e/global-setup.ts`）が `prisma db push` を実行する。e2e / scenario の両プロジェクトで共通。
3. **データ**: 各テストの `beforeEach` で reset + seed する（`tests/e2e/db.ts` の `resetAndSeedBaseline` 等）。実 DB を共有するため直列実行（`workers: 1`）。
4. **アプリサーバー**: `playwright.config.ts` の `webServer` が `E2E_BYPASS=1 DATABASE_URL=<テスト DB> pnpm dev` で dev サーバーを起動する。接続先の解決・ローカル以外の拒否・既存サーバーを再利用しない理由は、次節「テスト DB の接続先ガード」を参照。
5. **認証バイパス（サーバー）**: サーバー専用フラグ `E2E_BYPASS=1` により、書き込み系 API の管理者認証をバイパスする（`front/src/lib/adminAuth.ts`）。本番ビルドでは無効。
6. **認証バイパス（クライアント）**: `localStorage` に `e2e_admin_bypass=1` を注入して管理者セッションをシミュレートする（`tests/e2e/helpers.ts` の `injectAdminSession`）。フラグは `useAdminSession` が `useSyncExternalStore` で購読し、サーバー描画・hydration 中は無効（サーバー HTML と一致させる）、hydration 後に有効になる。レンダー中に `localStorage` を直接読まない（読むと hydration mismatch になり、本物の hydration 不具合が紛れる。#140）。
7. **Supabase の接続情報**: E2E は Supabase Auth を使わない（認証は 5・6 のバイパス）が、クライアントの初期化に `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` が必要。CI は `.env.local` にダミー値を生成し、手元では `front/.env`（ローカル Supabase）の値を使う。

CI 固有の追加設定（`prisma generate`、`.env.local` 動的生成、タイムアウト延長）と構築時のトラブルシュート記録は [`09-architecture-specification.md`](./09-architecture-specification.md) を参照。

## テスト DB の接続先ガード

IT / E2E の seed・`TRUNCATE`・`prisma db push --accept-data-loss` は全データを消すため、接続先が本番を指すと本番データが消える（`.claude/rules/testing.md`「テスト用 DB の接続先（破壊防止）」、#116）。

- 接続先の解決は `front/tests/setup/test-database-url.ts` に集約する。E2E（`playwright.config.ts` / `global-setup.ts` / `db.ts`）と IT（`it-global-setup.ts`）はすべてここを通す。
- 上書きはテスト専用の `TEST_DATABASE_URL` のみ（既定 `postgresql://e2e:e2e@localhost:5433/e2e`）。`DATABASE_URL` は参照しない。
- ホストが `localhost` / `127.0.0.1` / `::1` 以外なら、接続前に例外を投げる。メッセージにはホスト名と復旧手順（`pnpm run e2e:db:up`、既定 URL）を含め、資格情報は含めない。
- E2E の `webServer` は `reuseExistingServer: false`。手元の `pnpm dev`（E2E 用以外の DB に接続）を再利用させない。
- ガード自体は UT（`tests/unit/setup/test-database-url.test.ts`、14 件）で検証する。
- ローカル判定の allowlist は `front/src/lib/localDatabaseUrl.ts` の `checkLocalDatabaseUrl` に集約し、`next dev` 起動時のガード（`assertDevDatabaseUrl`、#125）と共有する。UT は `tests/unit/lib/localDatabaseUrl.test.ts`（15 件）。

## カバレッジ目標

- ユニットテスト: バリデーション/カロリー/フック/API（records / masters / masters[id] / profile / admin/me）を網羅。UT/IT 合計 136 件（目安件数・内訳は test-design 参照）。
<!-- 定量カバレッジ目標（行・分岐）は未確定 -->

## 使用ツール

- **テストは `front/tests/` に集約する**（ソースツリー `front/src/` にテストファイルを置かない）。レベルの分離はファイル名ではなく**ディレクトリ**で行う: `tests/unit/`（UT）/ `tests/it/`（IT）/ `tests/e2e/` / `tests/scenario/` / `tests/setup/`（足場）。`tests/unit/` `tests/it/` は `src/` の構造をミラーする。詳細は `.claude/rules/testing.md`。
- ユニット: Vitest 4（jsdom, `@testing-library/react`）。設定: `front/vitest.config.ts`（`include: tests/unit/**`）, `front/tests/setup/setup.ts`。
- E2E: Playwright（`front/tests/e2e/`、`smoke.spec.ts` / `record-crud.spec.ts`、`--project=e2e`、`pnpm run test:e2e`）。実 PostgreSQL に対して実 API/DB を通す。仕組みは「[E2E テスト環境の仕組み（実 DB）](#e2e-テスト環境の仕組み実-db)」。
- シナリオ: Playwright（`front/tests/scenario/`、`--project=scenario`）。E2E と同じ実 DB 基盤で、**複数機能横断のユーザージャーニー**を検証（`pnpm run test:scenario`）。
- 統合(IT): Vitest + Testcontainers（`@testcontainers/postgresql`）。実 PostgreSQL に対し Prisma 経由で Route Handler を検証。ファイル命名 `*.it.test.ts`、設定 `front/vitest.it.config.ts`、コマンド `pnpm test:it`。認証は `E2E_BYPASS=1` でバイパス。`lib/prisma` / `lib/adminAuth` の `import 'server-only'` は Vitest（`react-server` 条件を持たない）では import 時に throw するため、`vitest.it.config.ts` で空モジュールに差し替えている（#114）。
- 静的検査: ESLint（`eslint-plugin-jsdoc` 含む）+ knip（未使用の export・ファイル・依存関係）+ `tsc --noEmit` + `next build`。CI の `static-check` ジョブで実行。
- CI: GitHub Actions（`.github/workflows/ci.yml`、`static-check` / `unit-test` / `it-test` / `e2e-test` / `scenario-test` ジョブを並列実行）。ドキュメントのみの変更ではスキップされる（`.claude/rules/github-actions.md`）。
- 秘匿ファイル検査: `scripts/check-secret-files.sh` を `.github/workflows/secret-scan.yml` で常時実行（パスフィルタなし）。スクリプト自体のテスト `scripts/check-secret-files.test.sh`（代表パスの検出／素通り・未追跡・`--history`・git 管理外・不明な引数）も同ジョブで毎回実行する。
- ワークフロー検証: actionlint（`run:` 内は shellcheck）。`.github/workflows/**` / `Makefile` の変更時に CI の `actionlint` ジョブで実行し、手元では同一コマンドの `make actionlint`（要 Docker）。
