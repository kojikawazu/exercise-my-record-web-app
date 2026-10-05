import type { RecordEditReturn } from '@/types/recordEdit';

/**
 * 記録編集画面の遷移元（`?from=` に載せる値）。この値以外・省略時は管理者一覧から入ったものとして扱う。
 * - `detail`: 公開の記録詳細画面（`/records/{date}`）の「編集」ボタンから入った
 */
type RecordEditOrigin = 'detail';

/** 遷移元を編集画面へ引き渡すクエリパラメータ名。 */
const ORIGIN_PARAM = 'from';

/**
 * 記録編集画面へのリンクを組み立てる。
 *
 * @param date - 編集対象の記録日（`YYYY-MM-DD`）
 * @param origin - 遷移元。省略時は管理者一覧からの遷移としてクエリを付けない
 * @returns 記録編集画面のパス
 */
export const recordEditHref = (date: string, origin?: RecordEditOrigin): string => {
  const path = `/admin/records/${date}/edit`;
  return origin ? `${path}?${ORIGIN_PARAM}=${origin}` : path;
};

/**
 * `?from=` の値から記録編集画面の戻り先を決める。
 *
 * 戻り先のパスは常にここで組み立てる（クエリの値を URL としてそのまま使うとオープンリダイレクトに
 * なるため）。`detail` 以外の値・省略・複数指定（配列）はいずれも管理者一覧へ戻す。
 *
 * @param from - `searchParams.from` の生値（Next.js では重複指定時に配列になる）
 * @param date - 編集対象の記録日（`YYYY-MM-DD`）。詳細へ戻る場合のパスに使う
 * @returns 戻り先のパスと戻りリンクの文言
 */
export const resolveEditReturn = (
  from: string | string[] | undefined,
  date: string,
): RecordEditReturn => {
  if (from === 'detail') {
    return { href: `/records/${date}`, label: '詳細へ戻る' };
  }
  return { href: '/admin/records', label: '管理者一覧へ戻る' };
};
