---
description: Vercel のデプロイ制御ルール — vercel.json でいつデプロイを走らせるか
globs: "front/vercel.json"
---

# Vercel デプロイ制御ルール

**「デプロイに影響のある変更のときだけデプロイを走らせる」** を原則とする。Vercel の Git 連携は **GitHub Actions を経由せず push を直接拾う**ため、`.claude/rules/github-actions.md` の `paths-ignore` ではデプロイを止められない。制御は **`vercel.json` 側で行う**。

## vercel.json の配置

- Vercel プロジェクト設定の **Root Directory 直下**に置く（モノレポでフロントが `front/` なら `front/vercel.json`。リポジトリ直下ではない）。
- 先頭に `"$schema": "https://openapi.vercel.sh/vercel.json"` を宣言する（エディタ補完とスキーマ検証を効かせるため）。

## 基本形

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "git": {
    "deploymentEnabled": {
      "**": false,
      "main": true
    }
  },
  "ignoreCommand": "git diff --quiet HEAD^ HEAD -- ':(top,exclude)docs' ':(top,exclude).claude' ':(top,exclude).github' ':(top,exclude)*.md'"
}
```

## 1. ブランチ単位のデプロイ制御（`git.deploymentEnabled`）

**`deploymentEnabled` は許可リストではなく拒否リストである**。[公式ドキュメント](https://vercel.com/docs/project-configuration/git-configuration)に `Unspecified branches default to true` と明記されており、**列挙しなかったブランチはデプロイが発火する**。`{"main": true}` だけ書いても何も止まらず、全ブランチの Preview デプロイが走り続ける（設定したつもりで効いていない、最も気づきにくい失敗）。

- **まず `"**": false` で全ブランチを止め、そのうえで許可するブランチを `true` で上書きする**。ブランチが複数のパターンにマッチした場合、**1 つでも `true` があればデプロイされる**（OR 判定。記述順や最長一致ではない）ため、この 2 行で「`main` のみ発火」が成立する。
- ワイルドカードは **minimatch** で評価され、`*` は `/` を跨がない。`feat/xxx` のような**スラッシュを含むブランチ名を使う運用では `"*": false` では素通りする**ので、必ず `**` を使う。
- 既定では**本番ブランチ（`main`）のみ `true`** にする。作業ブランチの push ごとに Preview デプロイを積み上げない（ビルド時間とデプロイ枠の浪費を防ぐ）。
- Preview 環境が必要な場合（レビューで実物を確認したい等）は、対象ブランチを**明示的に追加**する（例: `"release/**": true`）。「とりあえず全ブランチ許可」にしない。
- `"main": false` のように**本番ブランチを無効化しない**（デプロイ手段が失われる）。
- 全ブランチを完全に止めたい場合のみ、オブジェクトではなく `"deploymentEnabled": false` と書く（`main` も含めて発火しなくなる点に注意）。

## 2. ビルドスキップ（`ignoreCommand`）

デプロイ成果物に影響しない変更（ドキュメント・AI ルール・CI 定義）だけの push では、ビルドを実行しない。

**終了コードの規約（直感と逆なので必ず守る）**:

| 終了コード | Vercel の挙動 |
|---|---|
| `0` | ビルドを**スキップ**する |
| `1`（非 0） | ビルドを**実行**する |

`git diff --quiet` は「差分なし」で `0`、「差分あり」で `1` を返す。したがって上記の基本形は「**除外パス以外に差分がなければ `0` → スキップ**」と読む。条件を反転させて書かない。

**除外パスの指定**:

- 除外は Git の pathspec マジック `':(top,exclude)<path>'` で書く。`top` を付けることで、`vercel.json` が置かれたサブディレクトリではなく**リポジトリルート基準**で解決される。
- 除外対象は「ビルド成果物に影響しないもの」に限る。既定は `docs` / `.claude` / `.github` / `*.md`。
- **アプリケーションコード・依存関係（ロックファイル）・環境変数定義・`vercel.json` 自体を除外しない**。除外するとデプロイ漏れ（本番と最新コードの乖離）が起きる。

**注意点**:

- `HEAD^` を参照するため、**単一コミットしかない履歴や shallow clone では失敗し得る**。失敗（非 0 終了）時は安全側に倒れて**ビルドが実行される**ので、デプロイ漏れにはならない。
- squash マージ運用では `HEAD^ HEAD` が「main の 1 マージコミット分の差分」を見る。PR 内の中間コミットは畳まれるため、意図した粒度で判定できる。

## GitHub Actions との役割分担（重複させない）

| 観点 | 担当 |
|---|---|
| Vercel のデプロイをいつ走らせるか（ブランチ・パス） | `.claude/rules/vercel.md`（本ファイル）＝ `vercel.json` |
| lint / test / build を CI でいつ走らせるか | `.claude/rules/github-actions.md` ＝ ワークフローの `paths-ignore` |
| デプロイ先の選定・パイプライン構成（何を作るか） | `docs/design/12-cicd.md`（`/design-policy` が生成） |

- **同じ除外パスの一覧を両方に書いたら、両方を同時に更新する**。片方だけ更新すると「CI は動かないのにデプロイは走る」等の食い違いが起きる。
- GitHub Actions から Vercel CLI でデプロイしている（Git 連携を使わない）構成では、本ファイルの `git.deploymentEnabled` は不要。その場合は Vercel ダッシュボードで Git 連携を無効化し、発火制御を `github-actions.md` に一本化する。
