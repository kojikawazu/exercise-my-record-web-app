# 06 セキュリティ仕様書（Security Specification）

認証・認可・暗号化・脆弱性対策を定義する。

## 認証

- 認証方式: Supabase の Google OAuth。
- 管理者ログイン必須。一般ユーザーはログイン不要（閲覧のみ）。
- 管理者ログイン導線は一覧画面ヘッダー右上に表示。ログイン画面は `/admin/login`。
- 未ログインで管理者 URL にアクセスした場合は `/admin/login` へリダイレクト。
- ログイン後は一覧画面へ遷移。
- セッションはブラウザを閉じても保持する（Supabase セッション）。
- 管理者判定は `ADMIN_EMAIL` のみ許可（`NEXT_PUBLIC_ADMIN_EMAIL` は不使用、Issue #15）。判定は `/api/admin/me`。

## 認可

- 読み取り系（GET）は認証不要（一般ユーザーが閲覧可能）。
- 書き込み系（POST/PATCH/DELETE）は管理者認証が必要。
  - リクエストヘッダーに `Authorization: Bearer <access_token>` を付与。
  - サーバー側で Supabase `auth.getUser()` によるトークン検証 + `ADMIN_EMAIL` 一致チェック。
  - 認証なし → 401、管理者以外 → 403。
- 共通認証ヘルパー: `front/src/lib/adminAuth.ts` の `requireAdmin(request)`。
- フロント側: `front/src/lib/authFetch.ts` の `authFetch()` で Supabase セッショントークンを自動付与。

### 認証が必要なエンドポイント

| エンドポイント | メソッド |
|---------------|---------|
| `/api/records` | POST |
| `/api/records/:date` | PATCH, DELETE |
| `/api/masters` | POST |
| `/api/masters/:id` | PATCH, DELETE |
| `/api/profile` | POST |
| `/api/admin/export` | GET（Issue #20 で削除予定） |

## RLS ポリシー（防御の第 2 層）

- Exercise 系全テーブルに RLS ポリシーを設定済み（`front/prisma/migrations/20260322_exercise_rls_policies`）。
- SELECT: 全ユーザーが閲覧可能（`true`）。
- INSERT/UPDATE/DELETE: Supabase 認証済みユーザーのみ（`auth.uid() IS NOT NULL`）。
- Prisma（`DATABASE_URL`）は RLS をバイパスするため、主な防御は上記の API ミドルウェア。RLS は Supabase Client SDK 経由アクセスに対する追加の防御層。

## E2E テスト時の認証バイパス

- `NODE_ENV !== 'production'` かつサーバー専用フラグ `E2E_BYPASS=1` の場合のみ認証をバイパス（`front/src/lib/adminAuth.ts`）。
- 本番ビルドでは無効。詳細は [`08-test-specification.md`](./08-test-specification.md)。

## 暗号化

- 通信は HTTPS（Vercel / Supabase）。
<!-- 保存データの暗号化方針を記述（未確定） -->

## 脆弱性対策

- シークレット・鍵ファイル・大容量バイナリを push しない（`.claude/rules/git.md`）。
<!-- OWASP Top10 等の対策方針を記述（未確定） -->
