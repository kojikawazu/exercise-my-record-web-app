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
