import type { RecordDetail, RecordUpdateRequest } from '@/types/record';
import type { CardioRow, RecordFormValues, WorkoutRow } from '@/types/recordForm';

/**
 * 空の筋トレ入力行を生成する。初期表示（最少 1 行）・行追加・取得結果が 0 件の場合に使う。
 *
 * @returns 各フィールドが空で新規 ID を持つ筋トレ行
 */
export const createWorkoutRow = (): WorkoutRow => ({
  id: crypto.randomUUID(),
  part: '',
  name: '',
  sets: '',
  reps: '',
  weight: '',
});

/**
 * 保存済みの記録（API の詳細レスポンス）を、記録フォームの筋トレ行・有酸素行へ変換する。
 * 編集画面の初期値と、記録追加画面の「前回の記録をコピー」で共用する。
 *
 * - 数値項目は文字列へ変換する
 * - 行 ID は新しく振る（行 ID は描画の key とエラーの紐付けにしか使わず、保存時には捨てる）
 * - 筋トレが 0 件なら空行を 1 行補う（筋トレは最少 1 行）
 *
 * @param detail - 記録詳細
 * @returns フォームの筋トレ行・有酸素行（日付・メモは含まない）
 */
export function toFormRows(detail: RecordDetail): Pick<RecordFormValues, 'workouts' | 'cardios'> {
  const workouts = detail.workouts.map(
    (w): WorkoutRow => ({
      id: crypto.randomUUID(),
      part: w.part,
      name: w.name,
      sets: String(w.sets),
      reps: String(w.reps),
      weight: String(w.weight),
    }),
  );
  return {
    workouts: workouts.length ? workouts : [createWorkoutRow()],
    cardios: detail.cardios.map(
      (c): CardioRow => ({
        id: crypto.randomUUID(),
        type: c.type,
        minutes: String(c.minutes),
        distance: String(c.distance),
      }),
    ),
  };
}

/**
 * 筋トレ・有酸素が未入力かを判定する（コピーで上書きする前の確認要否に使う）。
 *
 * 筋トレ行はどの項目も空なら未入力とみなす。有酸素行は既定の種別が入るため、1 行でもあれば入力ありとする。
 * メモはコピーで上書きしないため判定に含めない。
 *
 * @param workouts - 筋トレ行
 * @param cardios - 有酸素行
 * @returns 筋トレ・有酸素とも未入力なら `true`
 */
export function isFormBlank(workouts: WorkoutRow[], cardios: CardioRow[]): boolean {
  const workoutBlank = workouts.every(
    (row) => !row.part && !row.name && !row.sets && !row.reps && !row.weight,
  );
  return workoutBlank && cardios.length === 0;
}

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
