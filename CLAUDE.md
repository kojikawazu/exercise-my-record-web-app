# Exercise My Record

フィットネス記録MVPのWebアプリ（Next.js + Supabase）

## Rules

明示的な指示がなくても、`.claude/rules/` 内のルールを常に守ってください。

| ファイル | スコープ | 内容 |
|---------|---------|------|
| shortcuts.md | 全体 | 指示ショートカット（PR出して、PR承認しました 等） |
| workflow.md | 全体 | 開発フロー（ブランチ運用・テスト必須） |
| quality-gate.md | 全体 | 品質ゲート（セルフレビュー・設計/実装レビュー） |
| documentation.md | 全体 | ドキュメント更新ルール |
| git.md | 全体 | GitHub Flow・ブランチ命名・push 禁止物 |
| github-issue.md | 全体 | GitHub issue 運用（ブランチと対で起票・open/close で進捗管理） |
| testing.md | 全体 | テスト分類・原則・テストツール・テストファイル配置（`front/tests/` に集約） |
| coding-standards.md | 全体 | コーディング規約（TypeScript strict・pnpm・ESLint/Prettier） |
| error-handling.md | 全体 | エラーハンドリング方針（バリデーション・HTTPステータス・ログ） |
| security.md | 全体 | セキュリティ設計方針（認証・通信・インジェクション対策・シークレット） |
| duplication.md | 全体 | 重複と共通化の判断基準（3回目で共通化・偶然の一致は残す・`common`/`util` を置き場にしない） |
| dead-code.md | 全体 | デッドコード禁止（コメントアウト・未使用 export・スキップ放置テストを残さない） |
| static-analysis.md | 全体 | 静的解析の運用（Formatter/Linter の役割分担・CI必須・警告ゼロ・抑制コメント最小化） |
| github-actions.md | `.github/workflows/**` | Actions 発火ルール（関係あるジョブだけ動かす・必須チェックと `paths-ignore` を併用しない） |
| vercel.md | `front/vercel.json` | Vercel デプロイ制御（ブランチ単位の許可・`ignoreCommand` でのビルドスキップ） |
| jsdoc.md | `front/src/**` | JSDoc（TSDoc）規約・公開シンボル/型メンバー/状態・ロジック層への必須付与 |
| typescript.md | `front/src/**` | TypeScript 固有規約（type/interface の使い分け・型/定数の配置・any禁止・enum回避・`import type`） |
| frontend.md | `front/src/{components,app,hooks,stores,contexts,providers,constants,validation,repositories,lib}/**` | Next.js App Router フロント設計・server/client 分離・レイヤ一方向依存・ディレクトリの役割分担 |
| api.md | `front/src/app/api/**` | Next.js Route Handlers（一体型 API）設計・認証・エラー方針・レスポンス整形 |
| database.md | `front/prisma/**`, `front/src/lib/**` | Prisma 命名規約・手動マイグレーション・クエリ規約・監査列の自動化・論理削除方針 |
