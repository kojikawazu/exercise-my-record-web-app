/** `YYYY-MM`（西暦 4 桁・月 01〜12）。年の先頭 0 は認めない（0000〜0999 年は扱わない）。 */
const MONTH_PATTERN = /^[1-9]\d{3}-(0[1-9]|1[0-2])$/;

/**
 * クエリ等から受け取った月の指定を検証する。
 *
 * @param value - 検証対象（`searchParams` の生値。重複指定時は配列になる）
 * @returns 正しい `YYYY-MM` ならその文字列、それ以外（未指定・配列・形式不正・範囲外の月）は `null`
 */
export const parseMonthParam = (value: string | string[] | null | undefined): string | null =>
  typeof value === 'string' && MONTH_PATTERN.test(value) ? value : null;

/**
 * 月を前後に移動する（年をまたぐ）。
 *
 * @param month - 基準の月（`YYYY-MM`。{@link parseMonthParam} で検証済みであること）
 * @param delta - 移動量（-1 で前月、+1 で次月）
 * @returns 移動後の月（`YYYY-MM`）
 */
export const shiftMonth = (month: string, delta: number): string => {
  const [year, monthNumber] = month.split('-').map(Number);
  // Date の月繰り上がり・繰り下がりで年またぎを処理する（日は 1 日固定なので月末の溢れは起きない）
  const shifted = new Date(year, monthNumber - 1 + delta, 1);
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * 月間カレンダーのセル配列を組み立てる（日曜始まり）。
 *
 * 月初の曜日に合わせて先頭を `null`（空白セル）で埋め、以降に 1〜末日を並べる。
 * 記録カレンダー画面と日付ピッカーで共用する。
 *
 * @param year - 対象の西暦年
 * @param month - 対象の月（0 始まり。0=1月）
 * @returns 空白は `null`、日付は数値で並ぶセル配列
 */
export const buildMonthCells = (year: number, month: number): Array<number | null> => {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = first.getDay();
  const cells: Array<number | null> = [];
  for (let i = 0; i < startOffset; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  return cells;
};
