---
description: Next.js (App Router) フロントエンド設計・コンポーネント規約
globs: "front/src/components/**,front/src/app/**,front/src/hooks/**,front/src/stores/**,front/src/contexts/**,front/src/providers/**,front/src/constants/**,front/src/lib/**"
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
  - 本プロジェクトの実例: `RecordsListClient` / `RecordDetailClient` / `AdminMastersClient` 等の `*Client` コンポーネント（`components/` に置く）。
- **`page.tsx` に `'use client'` を直接書かない。** 対話が必要なら Client Component へ切り出して `page.tsx` から描画する。
- **ページ全体を Client にする前に、Client が必要な範囲を見極める。** 画面の一部だけが対話を持つなら、**その部分だけを Client 境界に切り出す**。
  - 実例: `app/admin/page.tsx` はメニューグリッドが静的なため Server Component のまま描画し、ログアウトのみ `AdminLogoutButton` として切り出している（結果としてページが静的プリレンダリングの対象になる）。
- **動的セグメント（`params`）は `page.tsx` 側で `await` して解決し、値を props で渡す。** Client 側で `use(params)` しない。
  - 実例: `app/records/[date]/page.tsx` / `app/admin/records/[date]/edit/page.tsx`。
- **`metadata` は `page.tsx`（Server Component）に置く。** Client Component からは export できない。

## ロジック分離

- **クライアントコンポーネント**のロジックは**カスタムフック**（`hooks/`）に切り出す。コンポーネントは UI 描画に専念する。
  - 実例: 入力バリデーションは `hooks/useRecordValidation.ts`（状態管理）と `lib/validation.ts`（純粋関数）に分離。
- **サーバーコンポーネント**のデータ取得は `page.tsx` や `lib/` 内のサーバー関数で行う（hooks は使用しない）。
- 状態の種類で手段を分ける:
  - **サーバー状態**（API データ）: React Query / SWR
  - **クライアント状態**（UI 状態）: ローカル state、複雑なら Zustand 等（`stores/`）
- **現状**: サーバー状態管理ライブラリは未導入。admin 配下は `useEffect` + `lib/authFetch.ts` の `authFetch()` で取得している。**新規に別のライブラリを混在させない**。導入する場合は上記の分類に従い、`useEffect` での手動取得を置き換える形で一括して行う。

## 状態管理・Context

- **Context は cross-cutting かつ低頻度変更**の関心事に限定する: 認証/セッション、テーマ、i18n、feature flag。
- 頻繁に変わる状態・サーバー状態を Context に載せない（再レンダリング多発）。
- Context は関心事ごとに分割し、provider の value は memo 化する。
- **Next.js 固有**: Context の provider は Client Component（`"use client"`）必須。Server Component は Context を参照できないため、provider は必要な client 境界に置き、ツリー全体を包まない。
- **Context value・カスタムフックの戻り値は型を先に定義し、各メンバーにコメントを付ける**。これらは定義ファイルを開かずに使われるため、コメントが唯一の説明になる。詳細は `jsdoc.md`「状態・ロジック層のコメント」に従う。
- コンポーネント内に閉じた `useState`・ハンドラ関数は一律必須にしない（「なぜ」が非自明なときのみ）。

## 型定義

- props・state・API レスポンス型は**原則 `type`** を使う（`typescript.md` の type/interface 方針に従う）。
- 置き場所は**参照範囲**で決める。1 ファイルに閉じる型（props 型等）はコロケーション、2 箇所以上から参照される型は `types/` へ集約する。詳細は `typescript.md`「型定義の配置」に従う。
- `type` / `interface` は型本体・各メンバーともにコメント必須（`jsdoc.md`）。
- **共通定数は `constants/` に集約する**（判断軸は型と同じ「参照範囲」。マジックナンバー・マジック文字列を直接書かない）。ただし union の元になる定数は、導出される型と**同じファイルに同居**させる。環境変数は `constants/` に置かない。詳細は `typescript.md`「定数の配置」に従う。
- **現状**: `types/` `constants/` ディレクトリは未作成。型は `lib/validation.ts` 等にコロケーションされている。**2 箇所目の参照が発生した時点で昇格**させる（先回りで作らない）。

## レイヤ依存の一方向ルール

**依存は上位から下位への一方向のみ**。下位レイヤが上位レイヤを import してはならない。

```text
app  →  components  →  hooks  →  lib（API クライアント・サーバー関数）  →  types / constants
（ルーティング・合成）（表示） （ロジック）        （通信・純粋関数）              （最下層）
```

| レイヤ | import してよい | import 禁止 |
|---|---|---|
| `app/` | `components/`, `hooks/`, `lib/`, `types/`, `constants/` | （なし。app は誰からも参照されない） |
| `components/` | 下位の `components/`, `hooks/`, `types/`, `constants/` | **`app/`**（ページ固有の型・定数を含む） |
| `hooks/` | `lib/`, `types/`, `constants/` | **`app/`**, **`components/`**（JSX を返さない） |
| `lib/` | `types/`, `constants/` | **`app/`**, **`components/`**, **`hooks/`** |
| `types/` `constants/` | （原則どこにも依存しない） | 上位レイヤすべて |

- **`components/` 内も一方向**にする。汎用度の高いものほど下位に置き、下位は上位を import しない。
- **`app/api/`（Route Handler）から `components/` や `hooks/` を import しない**。API はサーバー側の層であり、UI 層に依存してはならない（`api.md` 参照）。
- **サーバー専用モジュール（Prisma クライアント・シークレットを読む処理）を Client Component から import しない**。本プロジェクトでは `lib/prisma.ts` や `lib/adminAuth.ts` が該当する。`server-only` パッケージで境界を機械的に守ることを推奨する。
- **`hooks/` は JSX を返さない**。返したくなったらそれはコンポーネントであり、`components/` に置く。

禁止例:

- `components/` のコンポーネントが `app/**/page.tsx` の型・定数を import する
- `hooks/useRecordValidation.ts` が `components/` を import する
- 同一レイヤ間の**相互依存（循環）**（例: `A.tsx` ⇄ `B.tsx` が互いを import）

### 逆流したくなったら「共通化」で解決する

| 逆流したい理由 | 正しい解き方 |
|---|---|
| 上位の型・定数を下位でも使いたい | その型・定数を**`types/` `constants/` へ移動**し、上下双方がそこを参照する |
| 上位のロジックを下位でも使いたい | 共通処理を**下位の `hooks/` または `lib/` の純粋関数へ抽出**し、双方から呼ぶ |
| 下位から上位の状態を変えたい | **呼ばない**。**props でコールバックを受け取る**（イベントは上へ、データは下へ） |
| 子が親のレイアウトを知りたい | 知らせない。**props / children で親が渡す**（子は自分の見た目だけに責任を持つ） |

**レビュー観点**: import 文の向きを見る。下位レイヤのファイルに上位レイヤ（`app/` / `components/`）へのパスが現れていたら指摘する。Client Component がサーバー専用モジュールを引き込んでいないか。

## 型の扱い（API の形を画面に持ち込まない）

**API のレスポンス型と、画面が使う型を分ける。**

| 種類 | 役割 | 置き場所 |
|---|---|---|
| **API 契約の型** | Route Handler が返す形。サーバー側の都合で変わる | `types/` に置き、**Route Handler とフロントで共有**して 1 箇所定義にする |
| **ビューモデル** | 画面が必要とする形。UI 要件で変わる | `types/`、単一画面用なら該当コンポーネントにコロケーション |

**本プロジェクトは一体型（`app/api/` を持つ）ため、変換は Route Handler 側が担当する。**

- Route Handler が**画面単位のレスポンス型を定義し、その形に整形して返す**（`api.md`「レスポンス整形」）。
- フロントは**返ってきた型をそのまま使い、再変換しない**（変換層を二重に置かない）。
- **理由**: DB スキーマのフィールド名変更が画面のあちこちに波及するのを防ぐ。API 契約とビューは**変わる理由が違う**（`duplication.md`「層をまたぐ型は共通化しない」）。
- 表示専用の整形（日付フォーマット・カロリー算定・区分名の解決）は**コンポーネント側または `lib/` の純粋関数**で行い（例: `lib/calorie.ts`）、**API 契約の型に表示都合のフィールドを足さない**。
- ただし**両者が完全に一致し、変換が恒久的に無意味な場合は同じ型を使ってよい**（早すぎる抽象化を避ける）。**表示都合の差が出た時点で分ける**。

## ディレクトリ構成

```text
front/src/
├── app/                    # ルーティング（App Router）+ Route Handlers
│   ├── {route}/
│   │   ├── page.tsx        # Server Component（データ取得・合成）
│   │   └── client.tsx      # Client Component（対話・状態）
│   └── api/                # Route Handlers（api.md 参照）
├── components/             # 設計選択に従う
├── hooks/                  # クライアントロジック（useXxx）
├── lib/                    # サーバー関数・純粋関数・ユーティリティ
├── generated/              # Prisma 自動生成（lint・編集対象外）
├── constants/              # 共通定数（環境変数は置かない。未作成 — 必要時に作る）
└── types/                  # 型定義（未作成 — 2 箇所目の参照が出た時点で作る）
```

## バリデーション

- 入力検証は `lib/validation.ts` の**純粋関数**に集約し、状態管理は `hooks/useRecordValidation.ts` が担う（ロジック分離の実例）。検証ライブラリの導入方針は `typescript.md`「スキーマバリデーション」に従う。
- **クライアント検証は UX のためのものであり、セキュリティ担保ではない**。Route Handler でも必ず検証する（信頼境界が違うため、この重複は**必要**な重複 — `duplication.md`）。
- 同じ入力ルールなら、**制約値を定数として共有する**（検証の実装は両側に置いても、上限値等の数値を二重に書かない）。

## インポート

- `@/*` パスエイリアスを使用する（相対パスの深いネストを避ける）。

## テスト

- E2E: Playwright（`front/tests/e2e`）
- Base URL: `http://localhost:3000`
