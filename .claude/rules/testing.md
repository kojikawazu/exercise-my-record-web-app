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

**レベルによって配置方針を分ける。**

| テスト種別 | 配置 | 実行コマンド |
|---|---|---|
| **UT / IT** | 対象コードの隣の `__tests__/` に**コロケート**する | `pnpm test` / `pnpm run test:it` |
| **E2E / シナリオ** | `front/tests/e2e/` `front/tests/scenario/` に**集約**する | `pnpm run test:e2e` / `pnpm run test:scenario` |

```text
front/
├── src/
│   ├── lib/__tests__/validation.test.ts              # UT
│   ├── hooks/__tests__/useRecordValidation.test.ts   # UT
│   └── app/api/records/__tests__/
│       ├── route.test.ts                             # UT
│       └── route.it.test.ts                          # IT（実 DB）
└── tests/
    ├── e2e/
    └── scenario/
```

- **UT / IT をコロケートする理由**: 対象と 1:1 で対応し、実装を変えたときに直すべきテストが同じディレクトリにあるため追跡漏れが起きにくい。App Router では Route Handler とテストが離れると対応関係が読めなくなる。
- **E2E / シナリオを集約する理由**: 特定のソースファイルに紐づかず、**複数機能を横断する**ため、コロケート先が決まらない。
- **IT は `.it.test.ts` の命名で区別する**（`vitest.it.config.ts` が対象を切り分けるため）。UT の実行に実 DB を要求しない。
