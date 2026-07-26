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

```text
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

## 型定義

- 型は**原則 `type`** を使う（`typescript.md` の type/interface 方針に従う）。
- 置き場所は**参照範囲**で決める。1 ファイル（Route Handler）に閉じる型はコロケーション、**フロントと Route Handler の双方から参照される API 契約の型は `types/` へ集約**して 1 箇所定義にする（同じレスポンス形をフロント側と二重定義しない）。詳細は `typescript.md`「型定義の配置」に従う。
- `type` / `interface` は型本体・各メンバーともにコメント必須（`jsdoc.md`）。
- **共通定数は `constants/` に集約する**（判断軸は型と同じ「参照範囲」。マジックナンバー・マジック文字列を直接書かない）。ただし union の元になる定数は、導出される型と**同じファイルに同居**させる。環境変数は `constants/` に置かない。詳細は `typescript.md`「定数の配置」に従う。

## レスポンス整形（Prisma の行オブジェクトを素通ししない）

- **Prisma の行オブジェクトをそのまま `NextResponse.json()` に流さない**。Route Handler の責務は「**この画面に必要なものだけ**を返す」ことであり、パススルーは責務放棄にあたる。
- **公開してよいフィールドだけを厳選**して返す（内部 ID・監査カラム `createdAt` / `updatedAt`・他ユーザー情報・DB の内部エラー詳細を漏らさない）。**ブラウザに届いた時点で、画面に表示していなくてもユーザーは全て閲覧できる**。
- 変換は明示的に行う（マッパー関数、または `select` で取得列を絞る）。スプレッド（`{ ...record, extra }`）で組み立てない — **スキーマにカラムが増えた瞬間、自動的に公開される**。
  - 実例: `records/route.ts` の `GET` は `records.map()` で `date` / `totalSets` / `cardioMinutes` / `cardioDistance` / `cardios` のみに詰め替えている。この形を維持する。
- **画面単位のレスポンス型を定義**し、その形に合わせて集約・整形する。派生値（セット数合計・カロリー）は保存せず、ここで算定して返す（`database.md`「クエリ」）。
- エラーレスポンスも整形する。**Prisma のスタックトレース・SQL・内部メッセージをそのまま返さない**（`error-handling.md` に従い、クライアント向けメッセージに変換する）。
- **変換は Route Handler に閉じる。フロント側で再変換しない**（変換層を二重に置かない）。フロントは Route Handler が返す型をそのまま使う（`frontend.md`「型の扱い」と対になる規定）。
- **Route Handler から UI 層（`components/` / `hooks/`）を import しない**。API はサーバー側の層であり、UI に依存してはならない（`frontend.md`「レイヤ依存の一方向ルール」）。
- **理由**: 過剰公開（over-fetching / 機密漏洩）の防止、DB の内部スキーマ変更がクライアント契約に直接漏れない疎結合化、転送量の削減。

## 共通方針

- RESTful 設計（リソース指向エンドポイント）。
- レスポンス形式: JSON（`NextResponse.json()`）。
- 認証: 書き込み系（POST/PATCH/DELETE）は `lib/adminAuth.ts` の `requireAdmin(request)` で Bearer トークン検証 + `ADMIN_EMAIL` 一致を確認する。読み取り系（GET）は認証不要。
  - フロントからの呼び出しは `lib/authFetch.ts` の `authFetch()` で Supabase セッショントークンを自動付与する。
- 入力バリデーションは Route Handler 内で実施する（純粋関数は `lib/validation.ts` に集約）。
- エラー時は適切な HTTP ステータスコードで返す: 400（必須欠落・不正 JSON）/ 401（未認証）/ 403（管理者以外）/ 404（対象なし）/ 409（同日重複）/ 503（DB 接続不可）。
- DB 接続不可時（`getPrisma()` が null）は 503 `{ error: "database unavailable" }` を返す。
