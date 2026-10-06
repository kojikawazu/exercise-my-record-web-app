'use client';

import { useMemo } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { estimateDailyCalories, formatCalories } from '@/lib/calorie';

/** 消費カロリー算定に用いる有酸素 1 件分の入力。 */
type CardioEntry = {
  /** 有酸素種別（METs 係数の決定に使う。係数を持たない種別はカロリー 0 として扱う）。 */
  type: string;
  /** 運動時間（分）。 */
  minutes: number;
};

/** {@link CalorieEstimate} の props。 */
type CalorieEstimateProps = {
  /** その日の筋トレセット数の合計。 */
  totalSets: number;
  /** その日の有酸素運動の一覧。 */
  cardios: CardioEntry[];
};

/**
 * その日の記録から推定消費カロリー（目安）を表示する。
 *
 * プロフィール API から体重を取得し、筋トレ + 有酸素の合計を算定する。体重未取得の間は
 * `-- kcal` を表示する。props の各項目は {@link CalorieEstimateProps} を参照。
 */
export default function CalorieEstimate({ totalSets, cardios }: CalorieEstimateProps) {
  const { weightKg } = useProfile();

  const calories = useMemo(() => {
    if (weightKg === null) return null;
    return estimateDailyCalories(weightKg, totalSets, cardios);
  }, [weightKg, totalSets, cardios]);

  return (
    <div className="rounded-2xl bg-surface-muted px-4 py-3 text-sm font-bold text-muted">
      推定消費カロリー: {calories === null ? '-- kcal' : formatCalories(calories)}
    </div>
  );
}
