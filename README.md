# Exercise My Record

[![CI](https://github.com/kojikawazu/exercise-my-record-web-app/actions/workflows/ci.yml/badge.svg)](https://github.com/kojikawazu/exercise-my-record-web-app/actions/workflows/ci.yml)

ジム通いの日々のトレーニング（筋トレ・有酸素）を「1 日 1 レコード」で記録・振り返りできるフィットネス記録 Web アプリ（MVP）。Next.js（App Router）+ Supabase + Prisma のフルスタック構成です。

## 主な機能

実装済み:

- 📝 **記録の追加 / 編集 / 削除**（管理者）— 1 日 1 レコード（同日重複はエラー）、筋トレ複数種目・有酸素複数行・体調メモ
- 📋 **一覧**（全ユーザー）— 日付降順、1 ページ 10 件のページング、筋トレ/有酸素メニュー表示
- 🔍 **詳細**（全ユーザー）— 筋トレ/有酸素/体調メモ/推定消費カロリー
- 🔥 **推定消費カロリー**（目安）— 体重 × METs から自動算定（一覧/詳細/記録追加に表示）
- 🔐 **管理者認証** — Supabase Google OAuth（`ADMIN_EMAIL` のメールのみ許可）
- ⚙️ **マスター管理** — 部位 / 種目 / 有酸素種別の CRUD
- 👤 **プロフィール** — 体重（kg）の保存
- ✅ **入力バリデーション** — フィールド単位のエラー表示・保存抑止

未実装（設計のみ）:

- 📅 **カレンダー**（月表示） — 未着手
- 📈 **推移グラフ** — 未着手

詳細な仕様は [`docs/03-functional-specification.md`](docs/03-functional-specification.md)、進捗は [`docs/11-tasks.md`](docs/11-tasks.md) を参照。

## 技術スタック

| 区分 | 採用 |
|------|------|
| フレームワーク | Next.js 16（App Router, Turbopack）/ React 19 |
| 言語 | TypeScript 5 |
| スタイリング | Tailwind CSS v4 / lucide-react |
| ORM | Prisma v6（`@prisma/adapter-pg` + `pg`） |
| DB / 認証 | Supabase（PostgreSQL / Google OAuth） |
| テスト | Vitest（ユニット）/ Playwright（E2E） |
| ホスティング / CI | Vercel / GitHub Actions |
| パッケージ管理 | pnpm |

## Getting Started

### 前提

- Node.js 20 以上
- pnpm（`npm i -g pnpm` または corepack）
- Docker（ローカル Supabase・テスト用 DB の起動に使用）
- Supabase CLI（`brew install supabase/tap/supabase`）

> **ローカル開発は本番 DB に接続しない。** 開発・動作確認はローカル Supabase（`supabase start`）を使う。`pnpm dev` は `DATABASE_URL` がローカル以外を指していると起動を中断する（`front/src/lib/localDatabaseUrl.ts`。方針は `.claude/rules/production-data.md`）。

### セットアップ

```bash
# 1. 依存関係のインストール
cd front
pnpm install

# 2. ローカル Supabase の起動（初回はイメージ取得に数分かかる）
pnpm run dev:db:up   # = supabase start（Studio: http://127.0.0.1:54323）

# 3. 環境変数の設定（.env.example の既定値はローカル Supabase 向け）
cp .env.example .env
supabase status -o env | grep ANON_KEY   # NEXT_PUBLIC_SUPABASE_ANON_KEY に設定
#   ADMIN_EMAIL も設定する。管理画面の書き込みを試す場合は E2E_BYPASS=1 を有効にし、
#   管理ログイン画面の「テストログイン」を使う（ローカルには Google OAuth を設定していない）

# 4. スキーマの適用（初回 / schema.prisma 変更時）
pnpm run dev:db:push   # 接続先はローカル Supabase に固定（.env の DATABASE_URL は読まない）

# 5. 開発サーバー起動
pnpm dev   # http://localhost:3000
```

> 環境変数の正（Single Source）は [`front/.env.example`](front/.env.example) です。各変数の意味はファイル内のコメントを参照してください。

### よく使うコマンド

| コマンド | 内容 |
|----------|------|
| `pnpm dev` | ローカル開発サーバー（`DATABASE_URL` がローカル以外なら起動を中断） |
| `pnpm run dev:db:up` / `dev:db:down` | ローカル Supabase（`supabase start` / `supabase stop`）の起動 / 停止 |
| `pnpm run dev:db:push` | ローカル Supabase へ `schema.prisma` を反映（`prisma db push`。接続先はローカル固定） |
| `pnpm run build` | 本番ビルド（`prisma generate && next build`） |
| `pnpm test` | Vitest ユニットテスト（モック） |
| `pnpm run test:it` | Vitest 統合テスト（Testcontainers の実 PostgreSQL、要 Docker / Node 22+） |
| `pnpm run e2e:db:up` / `e2e:db:down` | E2E 用 PostgreSQL（docker-compose）の起動 / 破棄 |
| `pnpm run test:e2e` | Playwright E2E テスト（単機能フロー、実 DB。事前に `e2e:db:up`、要 Docker） |
| `pnpm run test:scenario` | Playwright シナリオテスト（複数機能横断、実 DB。事前に `e2e:db:up`、要 Docker） |
| `pnpm lint` / `pnpm format` | Lint / フォーマットチェック（いずれも CI 必須。`format` は差分ゼロを検証するのみ） |
| `pnpm run format:fix` | Prettier で自動整形（`pnpm format` が落ちたら手元でこれを実行する） |
| `make actionlint` | GitHub Actions ワークフローを actionlint で検証（リポジトリルートで実行。`run:` 内は shellcheck で検査、要 Docker。CI と同一コマンド） |

> `make actionlint` は shellcheck 同梱の公式イメージ（`rhysd/actionlint`、バージョンは `Makefile` の `ACTIONLINT_IMAGE`）を使う。Docker を使えない環境では、**同じバージョンの actionlint バイナリと shellcheck を併せて**入れて `actionlint` を実行する（`brew install actionlint shellcheck`）。shellcheck が無いと `run:` の検査だけが**エラーにならずに黙ってスキップ**され、CI でだけ落ちる。

## DB マイグレーション

- スキーマ変更時は `front/prisma/migrations/` に SQL を配置する。
- **マイグレーションは自動適用されない。** `pnpm run build` は `prisma generate` のみ実行する。
- デプロイ前に Supabase SQL Editor または `psql` で**手動適用**すること。
- 本番に適用する前に、ローカル Supabase で同じ SQL を流して結果を確かめる。

```bash
# ローカル Supabase で事前確認
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f front/prisma/migrations/<name>/migration.sql

# 本番へ適用（接続情報は自動で読み込まれない front/.env.prod に PROD_DATABASE_URL として置き、必要なときだけ読み込む）
set -a; source front/.env.prod; set +a
psql "$PROD_DATABASE_URL" -f front/prisma/migrations/<name>/migration.sql
```

- 本番の接続情報を `front/.env`（`DATABASE_URL`）に置かない。`.env.production` / `.env.production.local` も `next build` / `next start` が自動で読むため使わない。
- ローカル Supabase のスキーマは `migrations/` ではなく `pnpm run dev:db:push`（`schema.prisma` から生成）で作る。`migrations/` は本番への差分 SQL のみで、初期スキーマを含まないため。

## テスト

- **ユニット（Vitest）**: バリデーション / カロリー計算 / フック / API Routes（モック）。`pnpm test`。
- **統合（Vitest + Testcontainers）**: 実 PostgreSQL に対し Prisma 経由で API Routes を検証（unique 制約 / ページング / cascade 等）。`pnpm run test:it`（**Docker 必須**、`*.it.test.ts`）。
- **E2E（Playwright + docker-compose）**: 実 Dev サーバー + **実 PostgreSQL** で主要フローを検証（API モックなし）。`pnpm run e2e:db:up`（DB起動）→ `pnpm run test:e2e`（**要 Docker**、`*.spec.ts`）。
  - DB は `front/docker-compose.e2e.yml`。`globalSetup` で `prisma db push`、各テスト `beforeEach` で reset+seed。
  - 認証バイパスはサーバー専用フラグ `E2E_BYPASS=1`（`webServer.command` が付与）＋ クライアントの localStorage バイパス。本番ビルドでは無効。
- **テスト DB の接続先ガード**: IT / E2E の接続先は `front/tests/setup/test-database-url.ts` で解決し、`localhost` / `127.0.0.1` / `::1` 以外なら seed・`db push` の前に中断する。`DATABASE_URL`（`.env`）は参照しない。接続先を変える場合はテスト専用の `TEST_DATABASE_URL` を使う（既定 `postgresql://e2e:e2e@localhost:5433/e2e`）。E2E は既存の dev サーバーを再利用しないため、`localhost:3000` を空けてから実行する。
- **シナリオ（Playwright）**: 複数機能横断のユーザージャーニー（`front/tests/scenario/`）。E2E と同じ実 DB 基盤。`pnpm run test:scenario`（**要 Docker**）。
- CI（GitHub Actions, `.github/workflows/ci.yml`）で `static-check` / `unit-test` / `it-test` / `e2e-test` / `scenario-test` を並列実行。ドキュメントのみの変更ではスキップされ、代わりに `.github/workflows/docs.yml` が markdown lint を実行する。`.github/workflows/**` / `Makefile` の変更時は `actionlint` ジョブ（`make actionlint`）でワークフロー自体も検証する。

詳細は [`docs/08-test-specification.md`](docs/08-test-specification.md)。

## プロジェクト構成

| パス | 説明 |
|------|------|
| `front/` | アプリ本体（Next.js App Router、API Routes 含む） |
| `docs/` | 仕様書（`01`〜`11` の番号付き + 設計/エラー/テスト設計のサブディレクトリ）。入口は [`docs/README.md`](docs/README.md) |
| `base/` | デザイン参照用の読み取り専用ディレクトリ（**編集禁止**） |

## ドキュメント

| ファイル | 役割 |
|----------|------|
| `README.md`（本ファイル） | プロジェクト概要・セットアップ・開発の入口 |
| [`docs/`](docs/README.md) | 詳細な仕様書（要件 / 機能 / データ / API / セキュリティ / テスト / アーキテクチャ / タスク） |
| `front/README.md` | フロント固有の補足 |
| `CLAUDE.md` / `AGENTS.md` | AI エージェント向けの開発ルール・運用メモ |

---

更新履歴は [`docs/11-tasks.md`](docs/11-tasks.md) を参照。
