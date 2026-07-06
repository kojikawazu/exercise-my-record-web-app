'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  calculateCardioCalories,
  calculateStrengthCalories,
  formatCalories,
  type CardioType,
} from '@/lib/calorie';

/** 消費カロリー算定に用いる有酸素 1 件分の入力。 */
type CardioEntry = {
  /** 有酸素種別（METs 係数の決定に使う）。 */
  type: CardioType;
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
export default function CalorieEstimate({
  totalSets,
  cardios,
}: CalorieEstimateProps) {
  const [weightKg, setWeightKg] = useState<number | null>(null);

  useEffect(() => {
    const fetchWeight = async () => {
      const res = await fetch('/api/profile');
      if (!res.ok) return;
      const data = (await res.json()) as { weightKg: number | null };
      if (typeof data.weightKg === 'number') {
        setWeightKg(data.weightKg);
      }
    };

    void fetchWeight();
  }, []);

  const calories = useMemo(() => {
    if (weightKg === null) return null;
    const strength = calculateStrengthCalories(weightKg, totalSets);
    const cardioTotal = cardios.reduce(
      (sum, c) => sum + calculateCardioCalories(weightKg, c.minutes, c.type),
      0,
    );
    return strength + cardioTotal;
  }, [weightKg, totalSets, cardios]);

  return (
    <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm font-bold text-gray-600">
      推定消費カロリー: {calories === null ? '-- kcal' : formatCalories(calories)}
    </div>
  );
}
