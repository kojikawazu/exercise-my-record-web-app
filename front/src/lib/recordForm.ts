import type { RecordUpdateRequest } from '@/types/record';
import type { RecordFormValues } from '@/types/recordForm';

/**
 * マスター由来の選択肢に、現在の入力値が含まれていなければ先頭に足す。
 *
 * 保存済みの記録は、後からマスターを削除・改名しても元の名称を持ち続ける。選択肢に無い値を
 * `<select>` に渡すと表示上は別の項目が選ばれて見え、そのまま保存すると値が置き換わるため、
 * 現在値を選択肢として残す。
 *
 * @param options - マスターの名称（表示順）
 * @param current - 現在の入力値。空文字（未選択）は足さない
 * @returns 現在値を含む選択肢
 */
export function withCurrentOption(options: readonly string[], current: string): string[] {
  if (current === '' || options.includes(current)) return [...options];
  return [current, ...options];
}

/**
 * 記録フォームの入力値を、作成・更新 API のリクエスト本文（日付を除く）へ変換する。
 *
 * - メモは前後の空白を除去し、空なら `null`
 * - 数値項目は文字列から数値へ変換し、空文字は 0
 * - 有酸素は時間・距離がともに空の行を除外し、1 行も残らなければ `null`
 *
 * @param values - フォームの入力値
 * @returns API へ送る本文（作成時は呼び出し側で `date` を足す）
 */
export function toRecordRequest(values: RecordFormValues): RecordUpdateRequest {
  const memo = values.memo.trim();
  const cardioRows = values.cardios.filter((c) => c.minutes !== '' || c.distance !== '');
  return {
    memo: memo ? memo : null,
    workouts: values.workouts.map((row) => ({
      part: row.part,
      name: row.name,
      sets: Number(row.sets || 0),
      reps: Number(row.reps || 0),
      weight: Number(row.weight || 0),
    })),
    cardios: cardioRows.length
      ? cardioRows.map((c) => ({
          type: c.type,
          minutes: Number(c.minutes || 0),
          distance: Number(c.distance || 0),
        }))
      : null,
  };
}
