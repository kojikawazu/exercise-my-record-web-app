const pad = (value: number) => String(value).padStart(2, '0');

/** `YYYY-MM-DD`（年の先頭 0 は認めない）。暦として存在するかは別途確かめる。 */
const ISO_DATE_PATTERN = /^[1-9]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

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

/**
 * `YYYY-MM-DD` の日付を指定日数ずらす（ローカル日付で計算し、月・年・うるう日をまたぐ）。
 *
 * @param date - 基準日（`YYYY-MM-DD`）
 * @param days - ずらす日数（負で過去）
 * @returns ずらした日付（`YYYY-MM-DD`）
 */
export const addDays = (date: string, days: number) => {
  const [year, month, day] = date.split('-').map(Number);
  // 日の繰り上がり・繰り下がりで月・年をまたぐ計算を Date に任せる
  return toLocalIso(new Date(year, month - 1, day + days));
};

/**
 * `YYYY-MM-DD` の日付文字列を検証する（暦に存在しない日付も弾く）。
 *
 * @param value - 検証対象（クエリの生値）
 * @returns 正しい日付ならその文字列、それ以外（未指定・形式不正・2/30 等の存在しない日）は `null`
 */
export const parseIsoDate = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string' || !ISO_DATE_PATTERN.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  // 2026-02-30 は Date では 3/2 に繰り上がるため、往復して一致するかで存在を確かめる
  return parsed.toISOString().slice(0, 10) === value ? value : null;
};
