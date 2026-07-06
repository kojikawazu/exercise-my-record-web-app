---
description: Next.js Route Handlers（一体型 API）設計・API ルール
globs: "front/src/app/api/**"
---

# API ルール（Next.js Route Handlers / 一体型）

## 設計方針

- Next.js App Router の Route Handlers を **一体型 API** として使用する（独立バックエンドは持たない）。
- Route Handler は Prisma（`@prisma/adapter-pg` + `pg`）経由で Supabase（PostgreSQL）に直接アクセスする。
- 認証・バリデーション・DB アクセス・レスポンス整形を Route Handler ＋ `lib/` のヘルパーで完結させる。

## ディレクトリ構成

```
src/app/api/
├── records/route.ts          # 一覧(GET) / 作成(POST)
├── records/[date]/route.ts   # 詳細(GET) / 編集(PATCH) / 削除(DELETE)
├── masters/route.ts          # マスター取得(GET) / 追加(POST)
├── masters/[id]/route.ts     # マスター編集(PATCH) / 削除(DELETE)
├── profile/route.ts          # 体重取得(GET) / 保存(POST)
└── admin/
    ├── me/route.ts           # 管理者判定
    └── export/route.ts       # データ出力（Issue #20 で削除予定）
```

## 共通方針

- RESTful 設計（リソース指向エンドポイント）。
- レスポンス形式: JSON（`NextResponse.json()`）。
- 認証: 書き込み系（POST/PATCH/DELETE）は `lib/adminAuth.ts` の `requireAdmin(request)` で Bearer トークン検証 + `ADMIN_EMAIL` 一致を確認する。読み取り系（GET）は認証不要。
  - フロントからの呼び出しは `lib/authFetch.ts` の `authFetch()` で Supabase セッショントークンを自動付与する。
- 入力バリデーションは Route Handler 内で実施する（純粋関数は `lib/validation.ts` に集約）。
- エラー時は適切な HTTP ステータスコードで返す: 400（必須欠落・不正 JSON）/ 401（未認証）/ 403（管理者以外）/ 404（対象なし）/ 409（同日重複）/ 503（DB 接続不可）。
- DB 接続不可時（`getPrisma()` が null）は 503 `{ error: "database unavailable" }` を返す。
