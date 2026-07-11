# Exercise My Record — 開発タスクランナー
#
# コマンドの実体は front/package.json の pnpm scripts。
# 各ターゲットは front/ ディレクトリで pnpm を実行する（このリポジトリはコマンドが front/ で動く前提）。
# 使い方: リポジトリルートで `make <target>`。一覧は `make help`。

# pnpm scripts が置かれているフロントのディレクトリ
FRONT_DIR := front

# psql 用の接続文字列。環境変数に無ければ front/.env から読み込む。
# 例: make migrate DATABASE_URL=postgres://...
DATABASE_URL ?= $(shell grep -E '^DATABASE_URL=' $(FRONT_DIR)/.env 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '"')

# .PHONY: 同名ファイルの有無に関わらず常にレシピを実行する（Makefile の慣習）
.PHONY: help install dev build lint format test test-it e2e scenario e2e-db-up e2e-db-down migrate

# 引数なし `make` のデフォルトを help にする
.DEFAULT_GOAL := help

## help: このヘルプを表示する
help:
	@echo "Exercise My Record — make targets"
	@echo ""
	@grep -E '^## ' $(MAKEFILE_LIST) | sed -E 's/^## ([a-z0-9-]+): (.*)/  \1|\2/' | awk -F'|' '{ printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2 }' | sed 's/^  //'
	@echo ""
	@echo "例: make dev / make test / make e2e-db-up e2e"

# ---- 基本 ----------------------------------------------------------------

## install: 依存関係をインストールする（pnpm install）
install:
	cd $(FRONT_DIR) && pnpm install

## dev: 開発サーバーを起動する（http://localhost:3000）
dev:
	cd $(FRONT_DIR) && pnpm dev

## build: 本番ビルド（prisma generate && next build）
build:
	cd $(FRONT_DIR) && pnpm run build

## lint: ESLint を実行する
lint:
	cd $(FRONT_DIR) && pnpm lint

## format: Prettier のフォーマットチェック
format:
	cd $(FRONT_DIR) && pnpm format

# ---- テスト --------------------------------------------------------------

## test: Vitest ユニットテスト（モック）
test:
	cd $(FRONT_DIR) && pnpm test

## test-it: Vitest 統合テスト（Testcontainers の実 PostgreSQL、要 Docker / Node 22+）
test-it:
	cd $(FRONT_DIR) && pnpm run test:it

## e2e: Playwright E2E（単機能フロー、実 DB。事前に make e2e-db-up、要 Docker）
e2e:
	cd $(FRONT_DIR) && pnpm run test:e2e

## scenario: Playwright シナリオテスト（複数機能横断、実 DB。事前に make e2e-db-up）
scenario:
	cd $(FRONT_DIR) && pnpm run test:scenario

## e2e-db-up: E2E 用 PostgreSQL（docker-compose）を起動する
e2e-db-up:
	cd $(FRONT_DIR) && pnpm run e2e:db:up

## e2e-db-down: E2E 用 PostgreSQL を破棄する（ボリューム込み）
e2e-db-down:
	cd $(FRONT_DIR) && pnpm run e2e:db:down

# ---- DB マイグレーション（手動適用） ------------------------------------

## migrate: prisma/migrations の SQL を DATABASE_URL に手動適用する
migrate:
	@if [ -z "$(DATABASE_URL)" ]; then \
		echo "エラー: DATABASE_URL が未設定です（環境変数か $(FRONT_DIR)/.env に設定してください）"; \
		exit 1; \
	fi
	@for sql in $$(ls $(FRONT_DIR)/prisma/migrations/*/migration.sql | sort); do \
		echo "==> applying $$sql"; \
		psql "$(DATABASE_URL)" -f "$$sql" || exit 1; \
	done
	@echo "マイグレーション適用完了"
