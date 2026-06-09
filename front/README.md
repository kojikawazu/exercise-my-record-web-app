# Exercise My Record (front)

アプリ本体（Next.js App Router、API Routes 含む）。

> セットアップ・環境変数・開発コマンド・テスト方針は**ルートの [`../README.md`](../README.md) を正**とします。重複を避けるため、ここではフロント内部の構成のみを記載します。環境変数の正は [`.env.example`](.env.example)。

## ディレクトリ構成（`src/`）

| パス | 役割 |
|------|------|
| `app/` | ルーティング（一覧 `/`、詳細 `/records/[date]`、管理者 `/admin/*`） |
| `app/api/` | API Route Handlers（records / masters / profile / admin） |
| `components/` | UI コンポーネント（一覧/詳細クライアント、DatePicker、`ui/` 共通部品 等） |
| `hooks/` | `useRecordValidation` / `useAdminSession` |
| `lib/` | `prisma` / `supabase` / `adminAuth` / `authFetch` / `validation` / `calorie` |
| `generated/prisma/` | Prisma Client 生成物（git 管理外、`prisma generate` で生成） |

## テスト

| 種別 | 配置 |
|------|------|
| ユニット（Vitest） | `src/**/__tests__/`, `src/test/setup.ts` |
| E2E（Playwright） | `tests/e2e/`（`smoke.spec.ts` / `record-crud.spec.ts`） |

詳細は [`../docs/08-test-specification.md`](../docs/08-test-specification.md) を参照。
