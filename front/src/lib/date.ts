const pad = (value: number) => String(value).padStart(2, '0');

/**
 * Date をローカルタイムゾーンの `YYYY-MM-DD` 文字列へ変換する。
 *
 * `toISOString()` は UTC 変換で日付がずれるため、ローカルの年月日を直接組み立てる。
 *
 * @param date - 変換対象の日付
 * @returns `YYYY-MM-DD` 形式の文字列
 */
export const toLocalIso = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
