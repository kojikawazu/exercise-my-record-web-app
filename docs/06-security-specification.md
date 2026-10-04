# 06 セキュリティ仕様書（Security Specification）

認証・認可・暗号化・脆弱性対策を定義する。

## 目次

- [認証](#認証)
- [認可](#認可)
  - [認証が必要なエンドポイント](#認証が必要なエンドポイント)
- [RLS ポリシー（防御の第 2 層）](#rls-ポリシー防御の第-2-層)
- [E2E テスト時の認証バイパス](#e2e-テスト時の認証バイパス)
- [暗号化](#暗号化)
- [セキュリティヘッダー](#セキュリティヘッダー)
  - [CSP ディレクティブ](#csp-ディレクティブ)
  - [CSP 導入時の観測記録（Issue #122 / 2026-10-04）](#csp-導入時の観測記録issue-122--2026-10-04)
  - [対象外とした項目](#対象外とした項目)
- [脆弱性対策](#脆弱性対策)

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

## セキュリティヘッダー

全レスポンス（画面・Route Handler・静的ファイル）に以下を付与する。定義は `front/src/lib/securityHeaders.ts`、適用は `front/next.config.ts` の `headers()`（`source: '/:path*'`）。

| ヘッダー | 値 | 目的 |
|---|---|---|
| `Content-Security-Policy` | 下表のディレクティブ（**強制**） | XSS 成立時の外部送信・外部スクリプト読み込みを止める |
| `X-Content-Type-Options` | `nosniff` | MIME スニッフィングの防止 |
| `X-Frame-Options` | `DENY` | クリックジャッキングの防止（CSP の `frame-ancestors` 非対応ブラウザ向け） |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | 外部遷移時に URL パスを漏らさない |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | 使わないブラウザ権限を無効化 |

**位置づけ**: Supabase のセッションは `localStorage` に保存されるため、XSS が成立するとアクセストークンが奪取される。CSP（特に `connect-src`）はトークンの外部送信を止める多層防御の最後の層である。

### CSP ディレクティブ

| ディレクティブ | 値 | 理由 |
|---|---|---|
| `default-src` / `base-uri` / `form-action` | `'self'` | 既定は自オリジンのみ |
| `object-src` / `frame-ancestors` | `'none'` | プラグイン・埋め込みを使わない |
| `script-src` | `'self' 'unsafe-inline'`（`next dev` のときのみ `'unsafe-eval'` を追加） | Next.js のハイドレーション用インラインスクリプトのため `'unsafe-inline'` が必要。`'unsafe-eval'` は開発モードの React / Turbopack のみが使うため本番では外す |
| `style-src` | `'self' 'unsafe-inline'` | インラインスタイルのため |
| `font-src` | `'self' data:` | 外部フォントを使わない |
| `img-src` | `'self' data: blob:` | 外部画像を表示する機能が無いため `https:` は許可しない |
| `connect-src` | `'self' <Supabase のオリジン>` | Supabase Auth との通信。`NEXT_PUBLIC_SUPABASE_URL` を**オリジンに正規化**して加える。未設定・不正・http(s) 以外の値なら加えない（通信がブロックされる側に倒す） |

- Google OAuth は `signInWithOAuth` によるページ遷移（`window.location`）であり、`connect-src` / `form-action` の対象外。Supabase Realtime（WebSocket）は使っていないため `wss:` は許可しない。
- ヘッダーは `next build` 時に確定する（ビルド時の `NEXT_PUBLIC_SUPABASE_URL` が入る）。Supabase の URL を変えた場合は再ビルドが必要。

### CSP 導入時の観測記録（Issue #122 / 2026-10-04）

`report-uri` / `report-to` は設定していないため、ブラウザのコンソールを直接観測した。観測手段が機能することは、ページから外部オリジン（`https://example.com`）へ `fetch` して違反が記録されること（Report-Only では記録のみ、強制ではブロック）で確認した。

| 観測対象 | 環境 | Report-Only | 強制 |
|---|---|---|---|
| 一覧 `/`・ログイン画面 `/admin/login` の表示 | ローカル本番ビルド（`next build && next start`） | 違反 0 件 | 違反 0 件 |
| Supabase（`connect-src`）への通信 | ローカル本番ビルド → ローカル Supabase `/auth/v1/health` | 許可（200） | 許可（200） |
| 公開・管理者導線全般（一覧・詳細・ページング・記録の追加 / 編集 / 削除・マスター管理・プロフィール） | `next dev` + E2E バイパス（`pnpm test:e2e` 28 件 / `pnpm test:scenario` 3 件） | — | 全件パス |
| レスポンスヘッダーの値（`'unsafe-eval'` なし・`connect-src` に本番 Supabase のオリジン） | 本番（Vercel） | — | 設計どおり |
| Google OAuth ログイン → 一覧・詳細・記録の追加 / 編集 / 削除・マスター管理・プロフィール | 本番（Vercel） | — | 違反 0 件 |

本物の Google OAuth ログインと認証後導線は、本番ビルドでは E2E バイパスが無効で、ローカル Supabase には Google OAuth を設定していないためローカルでは再現できない。そのため PR #156 のマージ後に本番で観測した（#157）。

### 対象外とした項目

- **nonce 化**: `script-src` から `'unsafe-inline'` を外すにはリクエストごとの nonce 発行が必要で、middleware（Next.js 16 では `proxy.ts`）の新設を伴う。強制化そのものには不要なため別タスクとする。
- **HSTS**: Vercel が自ドメインに自動付与するため、アプリ側では付与しない。
- **違反レポートの収集**（`report-to`）: 受け口となるエンドポイントが無いため見送る。

## 脆弱性対策

- シークレット・鍵ファイル・大容量バイナリを push しない（`.claude/rules/git.md`）。
- サーバー専用モジュール（`front/src/lib/prisma.ts` / `front/src/lib/adminAuth.ts`）は `import 'server-only'` で保護し、Client Component から import された場合は `next build` を失敗させる。型チェック・Lint・ビルドのいずれも通ってしまう誤 import を、レビューに頼らず検知するため（#114）。
<!-- OWASP Top10 等の対策方針を記述（未確定） -->
