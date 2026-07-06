---
description: Next.js (App Router) フロントエンド設計・コンポーネント規約
globs: "front/src/components/**,front/src/app/**,front/src/hooks/**,front/src/lib/**"
---

# フロントエンドルール（Next.js App Router）

## コンポーネント設計

プロジェクト規模・ドメイン数に応じて以下のいずれかを選択する:

| パターン | 構成 | 採用基準 |
|---|---|---|
| **アトミックデザイン** | Atoms / Molecules / Organisms / Pages | 小〜中規模・ドメインが少ない |
| **ドメイン別構成** | features/ 配下にドメイン単位で分割 | 中〜大規模・ドメインが多い |

## サーバー/クライアント分離

- **server-first** を基本とする。データ取得・SEO はサーバーコンポーネントで行う。
- server/client 境界を明確にするためファイルを分離する:
  - `page.tsx` — サーバーコンポーネント（データ取得・SEO・props 受け渡し）
  - `client.tsx` — クライアントコンポーネント（インタラクション・状態管理）
  - 本プロジェクトの実例: `RecordsListClient` / `RecordDetailClient` 等の `*Client` コンポーネント。

## ロジック分離

- **クライアントコンポーネント**のロジックは**カスタムフック**（`hooks/`）に切り出す。コンポーネントは UI 描画に専念する。
  - 実例: 入力バリデーションは `hooks/useRecordValidation.ts`（状態管理）と `lib/validation.ts`（純粋関数）に分離。
- **サーバーコンポーネント**のデータ取得は `page.tsx` や `lib/` 内のサーバー関数で行う（hooks は使用しない）。

## インポート

- `@/*` パスエイリアスを使用する（相対パスの深いネストを避ける）。

## テスト

- E2E: Playwright（`front/tests/e2e`）
- Base URL: `http://localhost:3000`
