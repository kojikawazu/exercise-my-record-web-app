import type { CardioRow, FieldErrors, ValidationErrors, WorkoutRow } from '@/types/recordForm';

/**
 * 0 以上の数値入力を検証する（重量など 0 を許容する項目向け）。
 *
 * @param value - 入力値の文字列。空文字は未入力扱い
 * @returns エラーメッセージ。妥当な場合は `undefined`
 */
export function validateNumericField(value: string): string | undefined {
  if (value === '') return '値を入力してください';
  const num = Number(value);
  if (Number.isNaN(num) || num < 0) return '正しい数値を入力してください';
  return undefined;
}

/**
 * 正の数値入力を検証する（セット数・回数・時間・距離など 0 を許容しない項目向け）。
 *
 * @param value - 入力値の文字列。空文字は未入力扱い
 * @returns エラーメッセージ。妥当な場合は `undefined`
 */
export function validatePositiveNumericField(value: string): string | undefined {
  if (value === '') return '値を入力してください';
  const num = Number(value);
  if (Number.isNaN(num) || num <= 0) return '正しい数値を入力してください';
  return undefined;
}

/**
 * 記録フォーム全体を検証し、フィールド単位のエラー集合を組み立てる。
 *
 * 有酸素行は時間・距離がともに空なら未入力の任意行として検証をスキップする。
 *
 * @param date - 日付入力（空なら必須エラー）
 * @param workouts - 筋トレ行の配列（各行の部位・種目・セット・回数・重量を検証）
 * @param cardios - 有酸素行の配列（入力のある行のみ種別・時間・距離を検証）
 * @returns フィールド単位のエラー。行エラーは行 id をキーに格納する
 */
export function computeErrors(
  date: string,
  workouts: WorkoutRow[],
  cardios: CardioRow[],
): ValidationErrors {
  const errors: ValidationErrors = { workouts: {}, cardios: {} };

  if (!date) {
    errors.date = '日付を選択してください';
  }

  for (const row of workouts) {
    const rowErrors: FieldErrors = {};
    if (!row.part) rowErrors.part = '部位を選択してください';
    if (!row.name.trim()) rowErrors.name = '種目名を入力してください';
    const setsErr = validatePositiveNumericField(row.sets);
    if (setsErr) rowErrors.sets = setsErr;
    const repsErr = validatePositiveNumericField(row.reps);
    if (repsErr) rowErrors.reps = repsErr;
    const weightErr = validateNumericField(row.weight);
    if (weightErr) rowErrors.weight = weightErr;
    if (Object.keys(rowErrors).length > 0) {
      errors.workouts[row.id] = rowErrors;
    }
  }

  for (const row of cardios) {
    if (row.minutes === '' && row.distance === '') continue;

    const rowErrors: FieldErrors = {};
    if (!row.type) rowErrors.type = '種別を選択してください';
    const minutesErr = validatePositiveNumericField(row.minutes);
    if (minutesErr) rowErrors.minutes = minutesErr;
    const distanceErr = validatePositiveNumericField(row.distance);
    if (distanceErr) rowErrors.distance = distanceErr;
    if (Object.keys(rowErrors).length > 0) {
      errors.cardios[row.id] = rowErrors;
    }
  }

  return errors;
}

/**
 * バリデーション結果にエラーが 1 件でも含まれるかを判定する（保存抑止の判断に使う）。
 *
 * @param errors - `computeErrors` の結果
 * @returns 日付・筋トレ・有酸素のいずれかにエラーがあれば `true`
 */
export function hasAnyErrors(errors: ValidationErrors): boolean {
  if (errors.date) return true;
  if (Object.keys(errors.workouts).length > 0) return true;
  if (Object.keys(errors.cardios).length > 0) return true;
  return false;
}
