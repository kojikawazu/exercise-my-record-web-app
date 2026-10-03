import type { RecordUpdateRequest } from '@/types/record';
import type { RecordFormValues } from '@/types/recordForm';

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
