#!/usr/bin/env bash
# scripts/check-secret-files.sh のテスト。
# ケースごとに一時 git リポジトリを作り、検査対象のスクリプトをその scripts/ へ複製して実行する
# （スクリプトは自身の位置からリポジトリルートを解決するため、複製先のリポジトリが検査対象になる）。
# 1 ケース 1 ファイルにして、別ファイルの検出結果が混ざらないようにする。
#
# 使い方: scripts/check-secret-files.test.sh（CI の secret-scan ジョブも同じものを実行する）
set -euo pipefail

SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/check-secret-files.sh"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

pass=0
fail=0

# 新しい一時リポジトリを作り、そのパスを出力する。
# 呼び出し側は $(new_repo) のコマンド置換（サブシェル）で受けるため、ここで変数を
# 更新しても親に戻らない。連番ではなく mktemp でケースごとに別ディレクトリを保証する。
new_repo() {
  local dir
  dir="$(mktemp -d "$WORK/repo.XXXXXX")"
  mkdir -p "$dir/scripts"
  git -C "$dir" init -q
  cp "$SCRIPT" "$dir/scripts/check-secret-files.sh"
  # スクリプト自身は検査対象に入れても影響しない（パターンに当たらない）が、状態を明示するため追跡しておく
  git -C "$dir" add scripts/check-secret-files.sh
  printf '%s\n' "$dir"
}

# 空ファイルを作る（親ディレクトリも作る）
touch_file() {
  mkdir -p "$(dirname "$1/$2")"
  : > "$1/$2"
}

# 一時リポジトリに依存しない git 設定でコミットする（実行環境の user.name 未設定で落ちないように）
commit() {
  git -C "$1" -c user.name=test -c user.email=test@example.com commit -q -m "$2"
}

# 期待する終了コードと実際の終了コードを照合する
#   $1: ケース名 / $2: 期待する終了コード / $3: 実際の終了コード
assert_rc() {
  if [ "$3" -eq "$2" ]; then
    pass=$((pass + 1))
  else
    fail=$((fail + 1))
    echo "FAIL: $1（期待 rc=$2、実際 rc=$3）"
  fi
}

# 追跡済みのファイル 1 つに対する判定を検証する
#   $1: パス / $2: 期待する終了コード（1 = 検出、0 = 素通り）
check_tracked() {
  local repo rc=0
  repo="$(new_repo)"
  touch_file "$repo" "$1"
  git -C "$repo" add -f -- "$1"
  "$repo/scripts/check-secret-files.sh" >/dev/null 2>&1 || rc=$?
  assert_rc "追跡済み: $1" "$2" "$rc"
}

# ---- 正常系: 秘匿ファイルを検出する（追跡済み） ------------------------------
for p in config/master.key front/.env front/.env.local base/.env.production \
  certs/server.pem secrets/id_rsa secrets/id_ed25519 gcp/serviceAccountKey.json \
  .env '鍵/秘密.pem'; do
  check_tracked "$p" 1
done

# ---- 準正常系: テンプレート・型定義・紛らわしい名前は素通りする ---------------
for p in front/.env.example front/.env.local.example front/.env.sample \
  src/env.d.ts front/.env.d.ts docs/keyboard.md src/apiKey.ts README.md; do
  check_tracked "$p" 0
done

# ---- 未追跡: .gitignore されていなければ検出し、されていれば素通りする ----------
repo="$(new_repo)"
touch_file "$repo" front/.env
rc=0; "$repo/scripts/check-secret-files.sh" >/dev/null 2>&1 || rc=$?
assert_rc "未追跡（.gitignore なし）: front/.env" 1 "$rc"

repo="$(new_repo)"
touch_file "$repo" front/.env
printf '.env*\n' > "$repo/front/.gitignore"
rc=0; "$repo/scripts/check-secret-files.sh" >/dev/null 2>&1 || rc=$?
assert_rc "未追跡（.gitignore あり）: front/.env" 0 "$rc"

# ---- 履歴: 現在は追跡されていなくても --history で検出する --------------------
repo="$(new_repo)"
touch_file "$repo" front/.env
git -C "$repo" add -f front/.env
commit "$repo" "add env"
git -C "$repo" rm -q --cached front/.env
rm "$repo/front/.env"
commit "$repo" "remove env"
rc=0; "$repo/scripts/check-secret-files.sh" >/dev/null 2>&1 || rc=$?
assert_rc "履歴のみ（既定モード）: 検出しない" 0 "$rc"
rc=0; "$repo/scripts/check-secret-files.sh" --history >/dev/null 2>&1 || rc=$?
assert_rc "履歴のみ（--history）: 検出する" 1 "$rc"

# ---- 異常系: 黙って成功扱いにしない ------------------------------------------
dir="$WORK/not-a-repo/scripts"
mkdir -p "$dir"
cp "$SCRIPT" "$dir/check-secret-files.sh"
rc=0; "$dir/check-secret-files.sh" >/dev/null 2>&1 || rc=$?
assert_rc "git 管理外: エラーで止める" 1 "$rc"

repo="$(new_repo)"
rc=0; "$repo/scripts/check-secret-files.sh" --unknown >/dev/null 2>&1 || rc=$?
assert_rc "不明な引数: exit 2" 2 "$rc"

echo "check-secret-files.test: ${pass} passed, ${fail} failed"
[ "$fail" -eq 0 ]
