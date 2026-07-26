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
 * 記録フォームのバリデーション状態と操作。
 *
 * `rawErrors` と `displayErrors` を分けているのは、入力の妥当性（常に最新）と、
 * それを画面に出すか（保存を試みてから）を独立させるため。
 */
export type UseRecordValidation = {
  /** 入力値から常に再計算される実エラー。表示可否に関わらず最新の状態を保つ */
  rawErrors: ValidationErrors;
  /** 表示用のエラー。`submitted` が false の間は常に空（初期表示でエラーを出さないため） */
  displayErrors: ValidationErrors;
  /** 保存可否。`rawErrors` にエラーが 1 つでもあれば `true`（`displayErrors` ではなく `rawErrors` を見る） */
  hasErrors: boolean;
  /** 保存が試みられたか。一度 true になるとフォームを離れるまで戻らない */
  submitted: boolean;
  /** 保存押下時に `true` を渡してエラー表示を有効化する。検証自体は走らない（副作用なし） */
  setSubmitted: (submitted: boolean) => void;
};

/**
 * 記録フォームのバリデーション状態を管理するフック。
 *
 * 入力値から常にエラーを再計算しつつ、表示は「保存押下後（`submitted`）」まで抑制する。
 * これにより初期表示ではエラーを出さず、保存を試みてから初めてフィールド下に表示する挙動を実現する。
 *
 * @param date - 日付入力
 * @param workouts - 筋トレ行の配列
 * @param cardios - 有酸素行の配列
 * @returns バリデーション状態と、送信済みフラグの制御（各メンバーの意味は `UseRecordValidation` を参照）
 */
export function useRecordValidation(
  date: string,
  workouts: WorkoutRow[],
  cardios: CardioRow[],
): UseRecordValidation {
  const [submitted, setSubmitted] = useState(false);

  const rawErrors = useMemo(
    () => computeErrors(date, workouts, cardios),
    [date, workouts, cardios],
  );

  const hasErrors = useMemo(() => hasAnyErrors(rawErrors), [rawErrors]);

  const displayErrors = submitted ? rawErrors : EMPTY_ERRORS;

  return { rawErrors, displayErrors, hasErrors, submitted, setSubmitted };
}
