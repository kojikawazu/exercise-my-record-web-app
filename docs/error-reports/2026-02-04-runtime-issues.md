# ランタイム不具合メモ（2026-02-04）

## 概要
- 2026-02-04 時点で発生したランタイム不具合の記録。
- 現状の修正状況と再発防止のための対応を記載。

## 不具合一覧
| ID | 症状 | 影響 | 原因 | 対応状況 |
| --- | --- | --- | --- | --- |
| ER-2026-02-04-01 | `/api/records` が `503 database unavailable` | CRUD 全般が無効化され、一覧/詳細が取得不可 | Prisma Client が `engine type "client"` で生成されており、`adapter` 必須だった | `@prisma/adapter-pg` + `pg` を導入し `PrismaClient({ adapter })` で初期化するよう変更 |
| ER-2026-02-04-02 | 詳細画面で `Each child in a list should have a unique "key"` の警告 | 詳細の筋トレ一覧描画時に警告 | `/api/records/:date` の `workouts` に `id` が含まれていなかった | API レスポンスに `workout.id` を追加 |
| ER-2026-02-04-03 | 管理者記録編集ページで `params` 参照エラー | 編集画面が警告/不安定 | Next 16 で `params` が Promise になった仕様に未対応 | `React.use(params)` で unwrap するよう修正 |
| ER-2026-02-04-04 | 日付ピッカーで 1日ずれる | 日付が意図より 1日過去になる | `toISOString()` により UTC 変換されていた | ローカル日付で `YYYY-MM-DD` を生成するよう修正 |
| ER-2026-02-04-05 | データ出力画面で日付選択後にカレンダーが閉じない | UX 低下 | クリックイベントがラベル側へ伝播して再オープン | ポップアップ内クリックの伝播を停止 |

## 追記
- マスター管理のデータは追加・表示できるが、記録追加/編集の選択肢へ反映されていない。
- 残タスクとして `docs/06.tasks.md` に追記済み。
