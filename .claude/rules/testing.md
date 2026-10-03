---
description: テスト分類・原則（スタック非依存）
globs: 
---

# テストルール

## テスト分類

| 分類 | 定義 |
|------|------|
| 正常系（Normal） | 期待通りの入力 → 正しい結果 |
| 準正常系（Semi-Normal） | 想定内の異常入力 → 適切なハンドリング |
| 異常系（Abnormal） | 想定外のエラー → 安全な失敗 |

## 原則

- テストは仕様の証明。テストが失敗したら実装を修正する（テストを実装に合わせない）。
- 正常系 1 : 異常系（準正常系 + 異常系）2 以上の比率を目安とする。
- ビジネスロジックをモックしない。モックは外部 I/O（HTTP通信、DB接続、ファイルシステム）のみ。
- `toBeTruthy()` 等の曖昧なアサーションを避け、具体的な値で検証する。

## テストツール

| テスト種別 | ツール |
|-----------|--------|
| ユニットテスト（UT） | Vitest + Testing Library |
| インテグレーションテスト（IT） | Vitest + Testcontainers（実 PostgreSQL） |
| E2E テスト | Playwright（実 PostgreSQL / docker-compose） |
| シナリオテスト | Playwright（E2E と同一基盤） |
| スモークテスト | Playwright（起動確認・主要ページ表示） |

## テストファイル配置

**テストは `front/tests/` に集約する。ソースツリー（`front/src/`）にテストファイルを置かない。**

| テスト種別 | 配置 | 実行コマンド |
|---|---|---|
| **UT** | `front/tests/unit/` | `pnpm test` |
| **IT** | `front/tests/it/` | `pnpm run test:it`（要 Docker） |
| **E2E** | `front/tests/e2e/` | `pnpm run test:e2e`（要 Docker） |
| **シナリオ** | `front/tests/scenario/` | `pnpm run test:scenario`（要 Docker） |
| **テスト足場** | `front/tests/setup/` | — |

```text
front/
├── src/                       # プロダクションコードのみ
└── tests/
    ├── unit/                  # src の構造をミラーする
    │   ├── validation/record.test.ts
    │   ├── hooks/useRecordValidation.test.ts
    │   ├── types/master.test.ts
    │   └── app/api/records/route.test.ts
    ├── it/                    # 実 DB（Testcontainers）
    │   └── app/api/records/route.it.test.ts
    ├── e2e/
    ├── scenario/
    └── setup/                 # setup.ts / it-setup.ts / it-global-setup.ts
```

- **集約する理由**: ソースツリーにテストが混ざらないため、プロダクションコードの一覧性が保たれる。E2E・シナリオは特定のソースファイルに紐づかず**複数機能を横断する**ため、そもそもコロケート先が決まらない。全レベルを同じ軸で配置すると、レベル間の移動（UT → IT への昇格など）も素直になる。
- **`tests/unit/` `tests/it/` は `src/` の構造をミラーする**（例: `src/app/api/records/route.ts` → `tests/unit/app/api/records/route.test.ts`）。対象との対応関係は**パスで表現する**。
- **レベルの分離はディレクトリで行う**（ファイル名ではない）。`vitest.config.ts` は `tests/unit/**`、`vitest.it.config.ts` は `tests/it/**` を `include` する。
- IT のファイル名に残している `.it.` は、**実 DB を要求するテストであることを一覧上でも示すため**。設定の切り分けはディレクトリが担う。
- **テストからソースへの import は `@/` エイリアスを使う**（`front/src/` を指す）。集約により相対パスでは辿れないため。

### ESLint の対象範囲

`front/eslint.config.mjs` の JSDoc ブロックは `src/**` と `tests/**` の両方を対象にする。テストを `src/` の外へ出したことで対象から漏れないようにするため（`jsdoc.md`「混乱テスト」はテスト足場にも "why" を求めている）。

## テスト用 DB の接続先（破壊防止）

**テストは本番と同じ接続先環境変数（`DATABASE_URL`）を参照してはならない。** IT / E2E の seed は既存データを全削除することが多く、接続先を誤ると本番データが消える。

- 接続先の解決は **1 箇所に集約**する（`front/tests/setup/test-database-url.ts`）。IT・E2E の双方がこの入口を通す。
- 上書きは**テスト専用の環境変数**（`TEST_DATABASE_URL`）でのみ行う。既定値は `postgresql://e2e:e2e@localhost:5433/e2e`。
  - 本プロジェクトの IT は Testcontainers が払い出す接続文字列を使う。この値も同じ入口のホスト検証を通してから `prisma db push` / `TRUNCATE` に渡す。
- **ホストの allowlist で検証し、`localhost` / `127.0.0.1` / `::1` 以外なら接続前に throw する。** テストランナー起動時ではなく、**seed や migrate が走る前**に落とす。
- 失敗メッセージには**解決されたホスト名**と**復旧手順**（テスト DB の起動コマンド `pnpm run e2e:db:up`、既定 URL）を含める。原因の特定に時間をかけさせない。
- **`process.env.X ?? ローカル既定` というフォールバックを書かない。** 「未設定なら安全側」に見えて、実際は「**値が入っていれば危険側**」に倒れる。安全な既定は allowlist（通すものを列挙し、他は落とす）である。
- **E2E のアプリサーバーも同じ接続先で起動し、既存サーバーを再利用しない**（`playwright.config.ts` の `webServer.reuseExistingServer` を `false` にする）。再利用すると、手元で `.env`（本番 DB）のまま起動している `pnpm dev` に E2E が接続し、seed はテスト DB に入る一方で**画面からの作成・削除は本番 DB に対して実行される**。
- ガード自体をテストする（既定値・localhost 許可・本番用変数が汚染されていても無視すること・リモート拒否・メッセージ内容）。

**なぜフォールバックが危険か**: ORM クライアント（Prisma 等）を import した時点で `.env` が `process.env` に読み込まれる実装がある。この場合 `process.env.DATABASE_URL ?? ローカル既定` は **`.env` の本番 URL を拾う**。しかもアプリ側と seed 側で評価タイミングが違うと、**アプリはローカルを読み、seed だけが本番を壊す**という非対称が起き、症状は「seed 依存テストが全滅」という形でしか現れない。

> **テストが不可解に全滅したら、まず接続先を疑う。** 原因を推測で決めつけて環境変数を手で固定し、先に進めてはならない。

同じ原則は DB 以外の破壊的操作にも適用する。テストやスクリプトが外部リソース（ストレージ、キュー、メール送信、決済 API 等）を消去・送信し得る場合は、接続先・宛先を allowlist で検証し、本番を指したら実行前に失敗させる。
