# 08 テスト仕様書（Test Specification）

テスト戦略・テストケース・カバレッジ目標・使用ツールを定義する。詳細なテスト設計は [`docs/test-design/test-design.md`](./test-design/test-design.md) を参照。

## 目次

- [テスト戦略](#テスト戦略)
  - [モック方針](#モック方針)
- [テストケース一覧（受け入れ E2E）](#テストケース一覧受け入れ-e2e)
  - [一般ユーザー](#一般ユーザー)
  - [管理者](#管理者)
  - [共通](#共通)
- [E2E テスト環境の仕組み（DB なしで動作）](#e2e-テスト環境の仕組みdb-なしで動作)
- [カバレッジ目標](#カバレッジ目標)
- [使用ツール](#使用ツール)

## テスト戦略

- ユニットテスト（Vitest）: バリデーション純粋関数 / カロリー計算 / `useRecordValidation` フック / API Routes（records, profile, masters）。
- E2E テスト（Playwright）: 主要な受け入れシナリオを実 Dev サーバー + E2E バイパスで検証。
- 原則（`.claude/rules/testing.md`）: テストは仕様の証明。正常系 1 : 異常系（準正常系 + 異常系）2 以上。ビジネスロジックはモックしない（モックは外部 I/O のみ）。曖昧なアサーションを避ける。

### モック方針

- モック許可: `@/lib/prisma`（getPrisma）, `@/lib/adminAuth`（requireAdmin）, `@supabase/supabase-js`。
- モック禁止: バリデーション関数、カロリー計算関数、フックの状態ロジック。
- E2E: 実 Dev サーバー + E2E バイパス。

## テストケース一覧（受け入れ E2E）

詳細なユニット/E2E ケース表は [`docs/test-design/test-design.md`](./test-design/test-design.md) に定義。主要な受け入れシナリオは以下。

### 一般ユーザー

- 一覧を開くと記録が日付順で表示される / 1 日カードに合計値が表示される / 記録がない場合は空状態が表示される。
- 一覧から詳細へ遷移でき、日付/体調メモ/筋トレ一覧/有酸素詳細が表示される。

### 管理者

- ログイン/メニュー: 管理者がログインでき、ログイン後にメニューが表示される。一般ユーザーには表示されない。
- 記録追加: 画面を開け、日付に今日が初期表示され（変更も可）、筋トレ行を追加/削除でき、有酸素を入力して保存できる。同日保存はエラー通知。
- 記録編集/削除: 既存レコードを編集/削除できる。
- マスター管理: 初期マスター表示、部位/種目/有酸素種別の追加/削除/名称変更。

### 共通

- セキュリティヘッダー: 画面・API のレスポンスに CSP / `X-Content-Type-Options` / `X-Frame-Options` / `Referrer-Policy` / `Permissions-Policy` が付く。CSP を強制した状態で上記の受け入れシナリオがすべて通る。

## E2E テスト環境の仕組み（DB なしで動作）

E2E テストは実データベースを使わない設計。

1. **API モック**: Playwright の `page.route()` でブラウザレベルのネットワークリクエストを傍受。
2. **認証バイパス**: `localStorage` に `e2e_admin_bypass=1` を注入して管理者セッションをシミュレート。
3. **Supabase ダミー認証情報**: `.env.local` にダミー URL/キーを設定してクライアント初期化を通す。
4. **テストログイン有効化**: Playwright 起動時のみサーバー専用フラグ `E2E_BYPASS=1` を付与（`playwright.config.ts` の `webServer.command` が `E2E_BYPASS=1 pnpm dev` を実行）。本番ビルドでは無効。

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
- E2E: Playwright（`front/tests/e2e/`、`smoke.spec.ts` / `record-crud.spec.ts`、`--project=e2e`）。**実 PostgreSQL（`docker-compose.e2e.yml`）** に対して実 API/DB を通す（`page.route` モックは撤廃）。`globalSetup` で `prisma db push`、各テスト `beforeEach` で reset+seed、認証は `E2E_BYPASS` + localStorage バイパス。直列実行（`workers:1`）。
- シナリオ: Playwright（`front/tests/scenario/`、`--project=scenario`）。E2E と同じ実 DB 基盤で、**複数機能横断のユーザージャーニー**を検証（`pnpm run test:scenario`）。
- 統合(IT): Vitest + Testcontainers（`@testcontainers/postgresql`）。実 PostgreSQL に対し Prisma 経由で Route Handler を検証。ファイル命名 `*.it.test.ts`、設定 `front/vitest.it.config.ts`、コマンド `pnpm test:it`。認証は `E2E_BYPASS=1` でバイパス。`lib/prisma` / `lib/adminAuth` の `import 'server-only'` は Vitest（`react-server` 条件を持たない）では import 時に throw するため、`vitest.it.config.ts` で空モジュールに差し替えている（#114）。
- 静的検査: ESLint（`eslint-plugin-jsdoc` 含む）+ `tsc --noEmit` + `next build`。CI の `static-check` ジョブで実行。
- CI: GitHub Actions（`.github/workflows/ci.yml`、`static-check` / `unit-test` / `it-test` / `e2e-test` / `scenario-test` ジョブを並列実行）。ドキュメントのみの変更ではスキップされる（`.claude/rules/github-actions.md`）。
