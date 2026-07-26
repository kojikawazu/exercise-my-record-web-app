import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsdoc from "eslint-plugin-jsdoc";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // JSDoc 規約（TSDoc スタイル）の機械的に判定できる部分を強制する。
  // 有効ルールの唯一の真実はこのブロック。方針の根拠は .claude/rules/jsdoc.md。
  {
    // tests/ も対象に含める。テストを src からここへ集約した際、対象が src/** のままだと
    // テストコードが黙って JSDoc ルールの対象外になるため（jsdoc.md「混乱テスト」は
    // テスト足場にも "why" を求めている）。
    files: ["src/**/*.{ts,tsx}", "tests/**/*.{ts,tsx}"],
    plugins: { jsdoc },
    // TS 前提。型は JSDoc ではなくシグネチャに委ねる。
    settings: { jsdoc: { mode: "typescript" } },
    rules: {
      // 型の再掲を禁止（TS シグネチャが型の唯一の真実）。
      "jsdoc/no-types": "error",
      // JSDoc ブロックを持つ関数は全引数を @param で説明する。
      // 分割代入 props は型（XxxProps）が真実なので props.x 単位には展開しない。
      "jsdoc/require-param": ["error", { checkDestructured: false, checkDestructuredRoots: false }],
      "jsdoc/require-param-description": "error",
      // @param 名と実引数名を突き合わせる（名前ズレ・順序・過不足を検出）。
      "jsdoc/check-param-names": "error",
      // 返り値がある関数は @returns に意味を書く（.tsx コンポーネントは後続ブロックで除外）。
      "jsdoc/require-returns": "error",
      "jsdoc/require-returns-description": "error",
      // 書いた JSDoc の体裁を整える。
      "jsdoc/check-alignment": "warn",
      "jsdoc/no-multi-asterisks": "warn",
      // 型本体（type / interface の宣言）に JSDoc を必須にする。
      // require: {} で関数・クラス等の既定対象は要求せず、contexts で型宣言だけを対象にする。
      // 関数に対する require-jsdoc は // 行コメントを誤検知するため引き続き未採用で、
      // 関数の JSDoc ブロックの有無・質はレビューで確認する。
      "jsdoc/require-jsdoc": [
        "error",
        { require: {}, contexts: ["TSTypeAliasDeclaration", "TSInterfaceDeclaration"] },
      ],
    },
  },
  {
    // 型メンバー（TSPropertySignature）単位の強制は types/ に限定する。
    // 全体に広げると 100 件超を検出し、「書くことがない項目に埋め草コメントを付けない」
    // 方針（jsdoc.md）と衝突する。types/ は複数箇所から参照される共有型の置き場であり、
    // 定義ファイルを開かずに使われるためコメントの価値が最も高い。
    // static-analysis.md「警告ゼロを維持し、守れないルールは有効にしない」に従い、
    // warn で放置せず error にできる範囲だけを対象にしている（現状 0 件）。
    files: ["src/types/**/*.ts"],
    rules: {
      "jsdoc/require-jsdoc": [
        "error",
        {
          require: {},
          contexts: [
            "TSTypeAliasDeclaration",
            "TSInterfaceDeclaration",
            "TSPropertySignature",
          ],
        },
      ],
    },
  },
  {
    // React コンポーネント（JSX を返す .tsx）は @returns を要求しない（「@returns …の要素」はノイズ）。
    // .ts のフック / lib / API では @returns 必須のまま。
    files: ["src/**/*.tsx", "tests/**/*.tsx"],
    rules: {
      "jsdoc/require-returns": "off",
      "jsdoc/require-returns-description": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Prisma 自動生成コード（.gitignore 済みのビルド成果物）は lint 対象外にする。
    // JSDoc/型ルール等が生成コードを誤検知するため除外する。
    "src/generated/**",
  ]),
]);

export default eslintConfig;
