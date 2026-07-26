---
description: Vercel のデプロイ制御ルール — vercel.json でいつデプロイを走らせるか
globs: "front/vercel.json"
---

# Vercel デプロイ制御ルール

**「デプロイに影響のある変更のときだけデプロイを走らせる」** を原則とする。Vercel の Git 連携は **GitHub Actions を経由せず push を直接拾う**ため、`.claude/rules/github-actions.md` の `paths-ignore` ではデプロイを止められない。制御は **`vercel.json` 側で行う**。

## vercel.json の配置

- Vercel プロジェクト設定の **Root Directory 直下**に置く（モノレポでフロントが `front/` なら `front/vercel.json`。リポジトリ直下ではない）。
- 先頭に `"$schema": "https://openapi.vercel.sh/vercel.json"` を宣言する（エディタ補完とスキーマ検証を効かせるため）。
- `ignoreCommand` は **Root Directory をカレントとして実行される**。判定スクリプトも同じく Root Directory 基準で `front/scripts/vercel-ignore-build.sh` に置き、`vercel.json` からは相対パスで参照する。

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
  "ignoreCommand": "bash scripts/vercel-ignore-build.sh"
}
```

判定ロジックは JSON の一行文字列に押し込まず、**スクリプトに切り出す**（後述「2.1 なぜスクリプトに切り出すか」）。`front/scripts/vercel-ignore-build.sh` を次の内容で置く:

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

# 比較基準は「前回"成功した"デプロイの SHA」。HEAD^ を使わない（理由は 2.2）
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

`git diff --quiet` は「差分なし」で `0`、「差分あり」で `1` を返す。したがって上記スクリプトは「**除外パス以外に差分がなければ `0` → スキップ**」と読む。条件を反転させて書かない。

### 2.1 なぜスクリプトに切り出すか

`vercel.json` の一行文字列は、**ローカルで実行して確かめられない**（クォートが JSON とシェルで二重にエスケープされ、pathspec の `':(top,exclude)...'` が壊れても気づけない）。スクリプトにすれば `VERCEL_GIT_PREVIOUS_SHA=<sha> bash scripts/vercel-ignore-build.sh; echo $?` で終了コードを目視できる。**デプロイ可否を決めるロジックは検証可能な場所に置く**。

### 2.2 比較基準に `HEAD^` を使わない（本番凍結の原因）

Vercel 公式のサンプルは `git diff --quiet HEAD^ HEAD ./` だが、**この基準をそのまま本番運用に使わない**。`HEAD^` は「直前のコミット」であって「**最後に実際にデプロイされたコミット**」ではないため、両者がずれた瞬間に変更が判定窓の外へこぼれる。

| 失敗モード | 何が起きるか |
|---|---|
| **スキップの累積** | 一度スキップしたコミットの変更は未デプロイのまま、次回の判定窓 `HEAD^..HEAD` の外に出る。以降そのずれは自己修復せず、**本番が古いビルドのまま凍結する** |
| **マージコミット** | `HEAD^` は第一親（main の旧先端）を指すため、判定窓が「その 1 マージ分」に限定される |
| **複数コミットの同時反映** | Rebase and merge や直 push で N コミットが一度に載ると、評価されるのは先頭 1 コミットのみ。後方のアプリ変更は**恒久的にこぼれる** |

いずれも「ビルドが落ちて気づく」形にならず、**成功したデプロイが並んでいるのに中身が古い**という形で表面化するため発見が遅れる。

したがって基準は **`VERCEL_GIT_PREVIOUS_SHA`（前回"成功した"デプロイの SHA）** を使う。

- この変数は [Vercel のシステム環境変数](https://vercel.com/docs/environment-variables/system-environment-variables)で、**Ignored Build Step を設定したときのみ**ビルド時に公開される。
- スキップされたビルドは「成功したデプロイ」ではないため、スキップが続く間も基準は最後にデプロイした地点に留まる。**取りこぼしが累積しない**。
- **変数が空、または基準コミットがローカルに存在しない場合は必ず非 0（＝ビルド実行）で終わらせる**。Vercel は既定で shallow clone するため、古い基準 SHA がフェッチされていないことがある。ここを `0` に倒すとデプロイ漏れが起きる。**迷ったらビルドする**が唯一の安全な既定。

**変更後の検証（デプロイ前に必ず実施する）**:

```bash
# 除外パスだけの差分 → 0（スキップ）になること
VERCEL_GIT_PREVIOUS_SHA=$(git rev-parse HEAD~1) bash scripts/vercel-ignore-build.sh; echo "exit=$?"
# 基準が取れない場合 → 1（ビルド実行）になること
VERCEL_GIT_PREVIOUS_SHA= bash scripts/vercel-ignore-build.sh; echo "exit=$?"
```

**除外パスの指定**:

- 除外は Git の pathspec マジック `':(top,exclude)<path>'` で書く。`top` を付けることで、`vercel.json` が置かれたサブディレクトリではなく**リポジトリルート基準**で解決される。
- 除外対象は「ビルド成果物に影響しないもの」に限る。既定は `docs` / `.claude` / `.github` / `*.md`。
- **アプリケーションコード・依存関係（ロックファイル）・環境変数定義・`vercel.json` 自体を除外しない**。除外するとデプロイ漏れ（本番と最新コードの乖離）が起きる。

**注意点**:

- `scripts/vercel-ignore-build.sh` 自体を除外パスに入れない（判定ロジックの変更がデプロイに反映されなくなる）。
- 除外パスの追加は**「そのパスだけが変わった状態で本番が古いままでも許容できるか」**で判断する。許容できないなら除外しない。
- スキップされたデプロイは Vercel のダッシュボードで `Ignored` 表示になる。**アプリコードを変更した push が `Ignored` になっていたら判定ロジックのバグ**なので、除外パスを疑う前にまず基準（`VERCEL_GIT_PREVIOUS_SHA` が空になっていないか）を確認する。
- 本番が最新コミットと一致しているかを定期的に突き合わせる（`VERCEL_GIT_COMMIT_SHA` をアプリのヘルスチェック等で公開しておくと検知できる）。ビルドスキップの失敗は**ビルド失敗として現れない**ため、能動的に見ないと気づけない。

## GitHub Actions との役割分担（重複させない）

| 観点 | 担当 |
|---|---|
| Vercel のデプロイをいつ走らせるか（ブランチ・パス） | `.claude/rules/vercel.md`（本ファイル）＝ `vercel.json` |
| lint / test / build を CI でいつ走らせるか | `.claude/rules/github-actions.md` ＝ ワークフローの `paths-ignore` |
| デプロイ先の選定・パイプライン構成（何を作るか） | `docs/design/12-cicd.md`（`/design-policy` が生成） |

- **同じ除外パスの一覧を両方に書いたら、両方を同時に更新する**。片方だけ更新すると「CI は動かないのにデプロイは走る」等の食い違いが起きる。
- GitHub Actions から Vercel CLI でデプロイしている（Git 連携を使わない）構成では、本ファイルの `git.deploymentEnabled` は不要。その場合は Vercel ダッシュボードで Git 連携を無効化し、発火制御を `github-actions.md` に一本化する。
