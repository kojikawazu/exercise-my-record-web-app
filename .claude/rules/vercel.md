---
description: Vercel のデプロイ制御ルール — vercel.json でいつデプロイを走らせるか
globs: "front/vercel.json"
---

# Vercel デプロイ制御ルール

**「デプロイに影響のある変更のときだけデプロイを走らせる」** を原則とする。Vercel の Git 連携は **GitHub Actions を経由せず push を直接拾う**ため、`.claude/rules/github-actions.md` の `paths-ignore` ではデプロイを止められない。制御は **`vercel.json` 側で行う**。

ただし制御手段は**失敗したときに気づけるものだけを使う**。本ルールの結論:

| 設定 | 既定 | 理由 |
|---|---|---|
| `git.deploymentEnabled` | **入れる** | 失敗しても即座に気づける（プレビュー URL が出ない）。戻すのも容易 |
| `ignoreCommand` | **入れない** | 失敗が静かに起きる（ビルドは緑のまま本番が古くなる）。得るものが小さく、失うものが大きい |

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
  }
}
```

`crons` など他の設定がある場合は同じ階層に併記する。`ignoreCommand` は**書かない**（理由は「2. ビルドスキップ」）。

## 1. ブランチ単位のデプロイ制御（`git.deploymentEnabled`）

**`deploymentEnabled` は許可リストではなく拒否リストである**。[公式ドキュメント](https://vercel.com/docs/project-configuration/git-configuration)に `Unspecified branches default to true` と明記されており、**列挙しなかったブランチはデプロイが発火する**。`{"main": true}` だけ書いても何も止まらず、全ブランチの Preview デプロイが走り続ける（設定したつもりで効いていない、最も気づきにくい失敗）。

- **まず `"**": false` で全ブランチを止め、そのうえで許可するブランチを `true` で上書きする**。ブランチが複数のパターンにマッチした場合、**1 つでも `true` があればデプロイされる**（OR 判定。記述順や最長一致ではない）ため、この 2 行で「`main` のみ発火」が成立する。
- ワイルドカードは **minimatch** で評価され、`*` は `/` を跨がない。`feat/xxx` のような**スラッシュを含むブランチ名を使う運用では `"*": false` では素通りする**ので、必ず `**` を使う。
- 既定では**本番ブランチ（`main`）のみ `true`** にする。作業ブランチの push ごとに Preview デプロイを積み上げない（ビルド時間とデプロイ枠の浪費を防ぐ）。
- Preview 環境が必要な場合（レビューで実物を確認したい等）は、対象ブランチを**明示的に追加**する（例: `"release/**": true`）。「とりあえず全ブランチ許可」にしない。
- `"main": false` のように**本番ブランチを無効化しない**（デプロイ手段が失われる）。
- 全ブランチを完全に止めたい場合のみ、オブジェクトではなく `"deploymentEnabled": false` と書く（`main` も含めて発火しなくなる点に注意）。

**この設定を推奨する理由は、失敗が目に見えることにある**。ブランチ指定を間違えれば「プレビュー URL が出ない」「本番が更新されない」という形で即座に現れ、`vercel.json` を 1 行戻せば復旧する。設定ミスのコストが小さく、検知が速い。

## 2. ビルドスキップ（`ignoreCommand`）— 原則として入れない

`ignoreCommand`（Ignored Build Step）は「ドキュメントだけの変更ではビルドしない」を実現できるが、**既定では設定しない**。

### 2.1 判断根拠

| | 内容 |
|---|---|
| 得るもの | docs のみの main マージでビルド 1〜2 分の節約 |
| 失うもの | 判定を誤ると**本番が静かに古くなる**。デプロイは成功扱い（緑）のままなので気づけない |
| 安全に運用するコスト | 本番稼働 SHA の監視を別途実装する必要がある。その手間だけで節約分を超える |

**失敗の観測可能性が `deploymentEnabled` と非対称**である点が判断を分ける。デプロイが走らないミスは「無いものが見えない」形で発覚するが、ビルドスキップのミスは「**古いものが正常に見えている**」形で潜伏する。1〜2 分のビルド時間と引き換えにこの潜伏リスクを負う理由はない。

とくに `HEAD^` を基準にした Vercel 公式サンプル（`git diff --quiet HEAD^ HEAD ./`）は**そのまま使わない**。`HEAD^` は「直前のコミット」であって「最後に実際にデプロイされたコミット」ではないため、以下の形で変更が判定窓からこぼれる:

| 失敗モード | 何が起きるか |
|---|---|
| **スキップの累積** | 一度スキップしたコミットの変更は未デプロイのまま、次回の判定窓 `HEAD^..HEAD` の外に出る。ずれは自己修復せず**本番が古いビルドのまま凍結する** |
| **マージコミット** | `HEAD^` は第一親（main の旧先端）を指すため、判定窓が「その 1 マージ分」に限定される |
| **複数コミットの同時反映** | Rebase and merge や直 push で N コミットが一度に載ると、評価されるのは先頭 1 コミットのみ。後方のアプリ変更は**恒久的にこぼれる** |

### 2.2 それでも導入する場合の最低条件

ビルド時間が実際にボトルネックになっている場合（1 ビルド 10 分超、月間ビルド枠の逼迫など）に限り、**以下をすべて満たしたうえで**導入する。1 つでも欠けるなら入れない。

1. **比較基準に `VERCEL_GIT_PREVIOUS_SHA`（前回"成功した"デプロイの SHA）を使う**。`HEAD^` を使わない。この変数は [Vercel のシステム環境変数](https://vercel.com/docs/environment-variables/system-environment-variables)で、Ignored Build Step を設定したときのみビルド時に公開される。スキップされたビルドは「成功したデプロイ」ではないため、スキップが続いても基準は最後にデプロイした地点に留まり、取りこぼしが累積しない。
2. **基準が取れない場合は必ずビルドする**（非 0 終了）。Vercel は既定で shallow clone するため、古い基準 SHA がローカルに存在しないことがある。**迷ったらビルドする**が唯一の安全な既定。
   併せて `git.deploymentEnabled` でプレビューを止めている場合、そのブランチには成功デプロイが無いため基準は常に空になり、毎回ビルドされる。**これは正常な動作であり、基準を `HEAD^` に替えて「効かせよう」としない**（スキップされないことを「設定が効いていない」と読み違えると、2.1 の失敗モードへ逆戻りする）。
3. **判定ロジックをスクリプトに切り出す**。`vercel.json` の一行文字列はローカルで実行検証できず、pathspec が二重エスケープで壊れても気づけない。
4. **本番稼働 SHA の監視を用意する**。`VERCEL_GIT_COMMIT_SHA` をヘルスチェック等で公開し、main 先端との一致を確認できるようにする。ビルドスキップの失敗は**ビルド失敗として現れない**ため、能動的に見ない限り検知経路が存在しない。

**終了コードの規約（直感と逆なので必ず守る）**:

| 終了コード | Vercel の挙動 |
|---|---|
| `0` | ビルドを**スキップ**する |
| `1`（非 0） | ビルドを**実行**する |

参考実装（`front/scripts/vercel-ignore-build.sh`。`vercel.json` からは `"ignoreCommand": "bash scripts/vercel-ignore-build.sh"` で参照する。`ignoreCommand` は Root Directory をカレントとして実行される）:

```bash
#!/usr/bin/env bash
# 終了コード 0 = ビルドをスキップ / 非 0 = ビルドを実行（Vercel の規約。直感と逆）
set -uo pipefail

# 除外パス（ビルド成果物に影響しないものだけを列挙する）
EXCLUDES=(
  ':(top,exclude)docs'
  ':(top,exclude).claude'
  ':(top,exclude).github'
  ':(top,exclude)*.md'
)

# 比較基準は「前回"成功した"デプロイの SHA」。HEAD^ を使わない（理由は 2.1）
BASE="${VERCEL_GIT_PREVIOUS_SHA:-}"

# 基準が取れない場合は安全側 = ビルドを実行する
#   - 初回デプロイ / Ignored Build Step 未設定 → 変数が空
#   - shallow clone で基準コミットがローカルに存在しない → cat-file が失敗
if [ -z "$BASE" ] || ! git cat-file -e "${BASE}^{commit}" 2>/dev/null; then
  echo "baseline unavailable (VERCEL_GIT_PREVIOUS_SHA='${BASE}') -> build"
  exit 1
fi

if git diff --quiet "$BASE" HEAD -- "${EXCLUDES[@]}"; then
  echo "only ignored paths changed since ${BASE} -> skip"
  exit 0
fi

echo "deployable changes found since ${BASE} -> build"
exit 1
```

**導入前の検証（必須）**:

```bash
# 除外パスだけの差分 → 0（スキップ）になること
VERCEL_GIT_PREVIOUS_SHA=$(git rev-parse HEAD~1) bash scripts/vercel-ignore-build.sh; echo "exit=$?"
# 基準が取れない場合 → 1（ビルド実行）になること
VERCEL_GIT_PREVIOUS_SHA= bash scripts/vercel-ignore-build.sh; echo "exit=$?"
```

**除外パスの指定**:

- 除外は Git の pathspec マジック `':(top,exclude)<path>'` で書く。`top` を付けることで、`vercel.json` が置かれたサブディレクトリではなく**リポジトリルート基準**で解決される。
- 除外対象は「ビルド成果物に影響しないもの」に限る。**アプリケーションコード・依存関係（ロックファイル）・環境変数定義・`vercel.json` 自体・判定スクリプト自体を除外しない**。
- 除外パスの追加は**「そのパスだけが変わった状態で本番が古いままでも許容できるか」**で判断する。許容できないなら除外しない。

## GitHub Actions との役割分担（重複させない）

| 観点 | 担当 |
|---|---|
| Vercel のデプロイをいつ走らせるか（ブランチ） | `.claude/rules/vercel.md`（本ファイル）＝ `vercel.json` |
| lint / test / build を CI でいつ走らせるか | `.claude/rules/github-actions.md` ＝ ワークフローの `paths-ignore` |
| デプロイ先の選定・パイプライン構成（何を作るか） | `docs/design/12-cicd.md`（`/design-policy` が生成） |

- **パスによる実行制御は CI 側（`paths-ignore`）に寄せる**。CI のスキップは失敗しても「テストが走らない」だけで本番の状態を壊さないため、デプロイ側でパス制御するより安全に同じ節約が得られる。
- GitHub Actions から Vercel CLI でデプロイしている（Git 連携を使わない）構成では、本ファイルの `git.deploymentEnabled` は不要。その場合は Vercel ダッシュボードで Git 連携を無効化し、発火制御を `github-actions.md` に一本化する。
