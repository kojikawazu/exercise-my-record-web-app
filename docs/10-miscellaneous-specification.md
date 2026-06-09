# 10 その他仕様書（Miscellaneous Specification）

用語集・参考資料・付録・その他を定義する。

## 用語集

| 用語 | 説明 |
|------|------|
| レコード | 1 日分の記録（`ExerciseRecord`）。1 日 1 レコード |
| 筋トレ行 | 部位/種目/セット/回数/重量を持つ筋トレの 1 項目（`ExerciseWorkout`） |
| 有酸素行 | 種別/時間/距離を持つ有酸素の 1 項目（`ExerciseCardio`）。複数行追加可 |
| マスター | 部位/種目/有酸素種別の選択肢（`ExerciseMaster`） |
| 推定消費カロリー | 体重・METs から算定する目安カロリー（[`03-functional-specification.md`](./03-functional-specification.md)） |
| METs | 運動強度の指標。ラン=8.0 / ウォーク=4.0（暫定） |
| RLS | Row Level Security。Supabase のテーブル行レベル権限（[`06-security-specification.md`](./06-security-specification.md)） |
| E2E バイパス | テスト時のみ認証を迂回する仕組み（サーバー専用フラグ `E2E_BYPASS`） |

## 参考資料（プロジェクト内ドキュメント）

- デザイン検討（ペルソナ別ディスカッション・改善提案）: [`docs/design-discussion/`](./design-discussion/)
  - [`01-discussion-log.md`](./design-discussion/01-discussion-log.md) — 3 者ディスカッションログ
  - [`02-design-recommendations.md`](./design-discussion/02-design-recommendations.md) — 改善提案レポート（配色/トップ再設計/優先度）
- エラー記録: [`docs/error-reports/`](./error-reports/)
  - [`2026-02-04-runtime-issues.md`](./error-reports/2026-02-04-runtime-issues.md) — ランタイム不具合メモ
  - [`2026-02-04-vercel-build-errors.md`](./error-reports/2026-02-04-vercel-build-errors.md) — Vercel ビルドエラーレポート
- テスト設計: [`docs/test-design/test-design.md`](./test-design/test-design.md)

## 付録

- METs 係数は暫定値であり、今後調整の可能性がある（カロリー算定式は [`03-functional-specification.md`](./03-functional-specification.md)）。
- データ出力（CSV/JSON）機能は Issue #20 で削除予定（現時点ではコード上は現役）。
