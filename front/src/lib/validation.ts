export type WorkoutRow = {
  id: string;
  part: string;
  name: string;
  sets: string;
  reps: string;
  weight: string;
};

export type CardioRow = {
  id: string;
  type: string;
  minutes: string;
  distance: string;
};

type FieldErrors = Record<string, string>;

export type ValidationErrors = {
  date?: string;
  workouts: Record<string, FieldErrors>;
  cardios: Record<string, FieldErrors>;
};

export function validateNumericField(value: string): string | undefined {
  if (value === '') return '値を入力してください';
  const num = Number(value);
  if (Number.isNaN(num) || num < 0) return '正しい数値を入力してください';
  return undefined;
}

export function validatePositiveNumericField(value: string): string | undefined {
  if (value === '') return '値を入力してください';
  const num = Number(value);
  if (Number.isNaN(num) || num <= 0) return '正しい数値を入力してください';
  return undefined;
}

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

export function hasAnyErrors(errors: ValidationErrors): boolean {
  if (errors.date) return true;
  if (Object.keys(errors.workouts).length > 0) return true;
  if (Object.keys(errors.cardios).length > 0) return true;
  return false;
}
