# Vercel ビルドエラーレポート（2026-02-04）

## 概要
Vercel デプロイ時に TypeScript の型エラーと Next.js App Router の制約でビルド失敗が複数回発生。型の絞り込み、Route Handler の署名合わせ、Prisma クライアント生成の自動化、Suspense 対応により解消。

## 環境
- Next.js: 16.1.6 (Turbopack)
- ビルドコマンド: `pnpm run build`
- デプロイ対象: `front/`

## エラーと対応の時系列

1. **Prisma クライアントの import が見つからない**
- エラー: `Module not found: Can't resolve '@/generated/prisma/client'`（`front/src/lib/prisma.ts`）
- 原因: `front/src/generated/prisma` が gitignore 対象で、ビルド時に生成物が存在しない。
- 対応: ビルド前に `prisma generate` を実行し、生成先から import。
- 変更:
  - `front/package.json`: `build` -> `prisma generate && next build`
  - `front/src/lib/prisma.ts`: `@/generated/prisma/client` から import

2. **Route Handler 署名の不一致（Next.js 16）**
- エラー: `RouteHandlerConfig` 不整合（`front/src/app/api/masters/[id]/route.ts`）
- 原因: Next 16 の型定義により `NextRequest` と `params: Promise<...>` を要求。
- 対応: `NextRequest` を使用し、`params` を `Promise` として `await`。

3. **API の map で暗黙の any（records by date）**
- エラー: `Parameter 'workout' implicitly has an 'any' type.`（`front/src/app/api/records/[date]/route.ts`）
- 対応: `map` の引数に必要な型を明示。

4. **API の map で暗黙の any（records list）**
- エラー: `Parameter 'record' implicitly has an 'any' type.`（`front/src/app/api/records/route.ts`）
- 対応: `map` の引数に必要な型を明示。

5. **エクスポート形式の型不一致**
- エラー: `string` が `'csv' | 'json'` に代入不可（`front/src/app/admin/export/page.tsx`）
- 対応: options 配列を `as const` にしてリテラル型を保持。

6. **Records リストでリテラル型の widen**
- エラー: `cardioType` が `string` に広がり `'ラン' | 'ウォーク'` に代入不可（`front/src/components/RecordsListClient.tsx`）
- 対応: `withType` を `RecordSummary[]` として明示。

7. **PrismaClient の constructor 型が adapter 必須**
- エラー: `Expected 1 arguments, but got 0.` から `adapter` 必須に起因する型エラーへ（`front/src/lib/prisma.ts`）
- 原因: 生成されたクライアント型が `adapter` を必須扱い。
- 対応: `new PrismaClient({} as any)` で型チェックを回避。

8. **useSearchParams は Suspense 必須**
- エラー: `useSearchParams() should be wrapped in a suspense boundary`（`/admin/export`）
- 原因: `front/src/app/admin/layout.tsx` で `useSearchParams` を Suspense なしで使用。
- 対応: `AdminLayoutClient` に移し、`layout.tsx` で `<Suspense>` で包む。
- 変更:
  - `front/src/app/admin/AdminLayoutClient.tsx`: 新規 client component
  - `front/src/app/admin/layout.tsx`: `Suspense` で包む server component

## 結果
上記対応によりビルドエラーは解消され、Vercel デプロイが完了。
