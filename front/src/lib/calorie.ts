/**
 * 有酸素種別ごとの METs（運動強度）係数の暫定値。
 *
 * ラン = 8.0 / ウォーク = 4.0。表記ゆれ（日本語・英語）を同じ係数へ寄せる。
 * 未知の種別は係数を持たず、カロリー算定では 0 として扱う。
 */
const cardioMets: Record<string, number> = {
  ラン: 8.0,
  ウォーク: 4.0,
  run: 8.0,
  walk: 4.0,
  Running: 8.0,
  Walking: 4.0,
};

/**
 * 有酸素運動の推定消費カロリー（目安）を時間ベースで算定する。
 *
 * 計算式は `METs × 体重(kg) × 時間(時間)`。未知の種別は METs=0 のためカロリー 0 を返す。
 *
 * @param weightKg - プロフィールに保存した体重（kg）
 * @param minutes - 運動時間（分）。内部で時間へ換算する
 * @param type - 有酸素種別。`cardioMets` に無い値は消費カロリー 0 とみなす
 * @returns 推定消費カロリー（kcal、丸め前の実数）
 */
export const calculateCardioCalories = (weightKg: number, minutes: number, type: string) => {
  const mets = cardioMets[type] ?? 0;
  const hours = minutes / 60;
  return mets * weightKg * hours;
};

/**
 * 筋トレの推定消費カロリー（目安）をその日のセット数合計から概算する。
 *
 * 計算式は `体重(kg) × 0.1 × セット数合計`。
 *
 * @param weightKg - プロフィールに保存した体重（kg）
 * @param totalSets - その日の筋トレセット数の合計
 * @returns 推定消費カロリー（kcal、丸め前の実数）
 */
export const calculateStrengthCalories = (weightKg: number, totalSets: number) =>
  weightKg * 0.1 * totalSets;

/**
 * 記録の表示画面（一覧・詳細・推移グラフ）で、有酸素種別をカロリー算定用の種別へ寄せる。
 *
 * `ウォーク` 以外はすべて `ラン` として算定する（係数を持たない種別も `ラン` 扱いになる）。
 * 記録の追加・編集フォームの推定カロリーは種別をそのまま渡しており、この寄せを適用しない。
 *
 * @param type - 記録された有酸素種別
 * @returns `ウォーク` または `ラン`
 */
export const toCalorieCardioType = (type: string) => (type === 'ウォーク' ? 'ウォーク' : 'ラン');

/**
 * 1 日分の推定消費カロリー（筋トレ + 有酸素）を算定する。
 *
 * 有酸素種別はそのまま {@link calculateCardioCalories} に渡す（寄せが必要なら呼び出し側で
 * {@link toCalorieCardioType} を適用する）。
 *
 * @param weightKg - プロフィールに保存した体重（kg）
 * @param totalSets - その日の筋トレセット数の合計
 * @param cardios - その日の有酸素（種別と時間（分））
 * @returns 推定消費カロリー（kcal、丸め前の実数）
 */
export const estimateDailyCalories = (
  weightKg: number,
  totalSets: number,
  cardios: { type: string; minutes: number }[],
) =>
  calculateStrengthCalories(weightKg, totalSets) +
  cardios.reduce((sum, c) => sum + calculateCardioCalories(weightKg, c.minutes, c.type), 0);

/**
 * カロリー値を表示用に整数へ丸め、「N kcal」形式の文字列へ整形する。
 *
 * @param value - 丸め前の推定消費カロリー（kcal）
 * @returns 「N kcal」形式の表示文字列
 */
export const formatCalories = (value: number) => `${Math.round(value)} kcal`;
