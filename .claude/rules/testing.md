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
    │   ├── lib/validation.test.ts
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
