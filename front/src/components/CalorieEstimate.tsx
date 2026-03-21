'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  calculateCardioCalories,
  calculateStrengthCalories,
  formatCalories,
  type CardioType,
} from '@/lib/calorie';

type CardioEntry = {
  type: CardioType;
  minutes: number;
};

type CalorieEstimateProps = {
  totalSets: number;
  cardios: CardioEntry[];
};

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
