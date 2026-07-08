# Exercise My Record

[![CI](https://github.com/kojikawazu/exercise-my-record-web-app/actions/workflows/test.yml/badge.svg)](https://github.com/kojikawazu/exercise-my-record-web-app/actions/workflows/test.yml)

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
- 📤 **データ出力**（CSV / JSON）※ Issue #20 で削除予定

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
- Supabase プロジェクト（DB と Google OAuth プロバイダを設定）

### セットアップ

```bash
# 1. 依存関係のインストール
cd front
pnpm install

# 2. 環境変数の設定（.env.example をコピーして値を埋める）
cp .env.example .env.local
#   必須: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / DATABASE_URL / ADMIN_EMAIL
#   ※ Google OAuth のキーは Supabase ダッシュボード側で設定（アプリの env では不要）

# 3. DB マイグレーションの適用（初回 / スキーマ変更時。詳細は下記）
psql "$DATABASE_URL" -f prisma/migrations/20260321_cardio_multiple_rows/migration.sql
psql "$DATABASE_URL" -f prisma/migrations/20260322_exercise_rls_policies/migration.sql

# 4. 開発サーバー起動
pnpm dev   # http://localhost:3000
```

> 環境変数の正（Single Source）は [`front/.env.example`](front/.env.example) です。各変数の意味はファイル内のコメントを参照してください。

### よく使うコマンド

| コマンド | 内容 |
|----------|------|
| `pnpm dev` | ローカル開発サーバー |
| `pnpm run build` | 本番ビルド（`prisma generate && next build`） |
| `pnpm test` | Vitest ユニットテスト（モック） |
| `pnpm run test:it` | Vitest 統合テスト（Testcontainers の実 PostgreSQL、要 Docker / Node 22+） |
| `pnpm run test:e2e` | Playwright E2E テスト |
| `pnpm lint` / `pnpm format` | Lint / フォーマットチェック |

## DB マイグレーション

- スキーマ変更時は `front/prisma/migrations/` に SQL を配置する。
- **マイグレーションは自動適用されない。** `pnpm run build` は `prisma generate` のみ実行する。
- デプロイ前に Supabase SQL Editor または `psql` で**手動適用**すること。

```bash
psql "$DATABASE_URL" -f front/prisma/migrations/20260321_cardio_multiple_rows/migration.sql
```

## テスト

- **ユニット（Vitest）**: バリデーション / カロリー計算 / フック / API Routes（モック）。`pnpm test`。
- **統合（Vitest + Testcontainers）**: 実 PostgreSQL に対し Prisma 経由で API Routes を検証（unique 制約 / ページング / cascade 等）。`pnpm run test:it`（**Docker 必須**、`*.it.test.ts`）。
- **E2E（Playwright）**: 実 Dev サーバー + 認証バイパスで主要フローを検証。`pnpm run test:e2e`。
  - 認証バイパスはサーバー専用フラグ `E2E_BYPASS=1` で有効化（`playwright.config.ts` の `webServer.command` が自動付与、本番ビルドでは無効）。
- CI（GitHub Actions, `.github/workflows/test.yml`）で `unit-test` / `e2e-test` を並列実行。

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
