export type CardioType = 'ラン' | 'ウォーク' | 'run' | 'walk' | 'Running' | 'Walking';

export const cardioMets: Record<string, number> = {
  ラン: 8.0,
  ウォーク: 4.0,
  run: 8.0,
  walk: 4.0,
  Running: 8.0,
  Walking: 4.0,
};

export const calculateCardioCalories = (
  weightKg: number,
  minutes: number,
  type: CardioType,
) => {
  const mets = cardioMets[type] ?? 0;
  const hours = minutes / 60;
  return mets * weightKg * hours;
};

export const calculateStrengthCalories = (weightKg: number, totalSets: number) =>
  weightKg * 0.1 * totalSets;

export const formatCalories = (value: number) => `${Math.round(value)} kcal`;
