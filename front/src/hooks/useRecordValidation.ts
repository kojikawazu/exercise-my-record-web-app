import { useMemo, useState } from 'react';
import {
  computeErrors,
  hasAnyErrors,
  type WorkoutRow,
  type CardioRow,
  type ValidationErrors,
} from '@/lib/validation';

export type { WorkoutRow, CardioRow, ValidationErrors };

const EMPTY_ERRORS: ValidationErrors = { workouts: {}, cardios: {} };

/**
 * 記録フォームのバリデーション状態を管理するフック。
 *
 * 入力値から常にエラーを再計算しつつ、表示は「保存押下後（`submitted`）」まで抑制する。
 * これにより初期表示ではエラーを出さず、保存を試みてから初めてフィールド下に表示する挙動を実現する。
 *
 * @param date - 日付入力
 * @param workouts - 筋トレ行の配列
 * @param cardios - 有酸素行の配列
 * @returns `rawErrors`（常時計算した実エラー）/ `displayErrors`（表示用・未送信なら空）/
 *   `hasErrors`（保存可否）/ `submitted` と `setSubmitted`（送信済みフラグの制御）
 */
export function useRecordValidation(
  date: string,
  workouts: WorkoutRow[],
  cardios: CardioRow[],
) {
  const [submitted, setSubmitted] = useState(false);

  const rawErrors = useMemo(
    () => computeErrors(date, workouts, cardios),
    [date, workouts, cardios],
  );

  const hasErrors = useMemo(() => hasAnyErrors(rawErrors), [rawErrors]);

  const displayErrors = submitted ? rawErrors : EMPTY_ERRORS;

  return { rawErrors, displayErrors, hasErrors, submitted, setSubmitted };
}
