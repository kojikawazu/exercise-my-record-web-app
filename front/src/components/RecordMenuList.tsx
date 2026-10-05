import type { RecordListItem } from '@/types/record';

/** {@link RecordMenuList} の props。 */
type RecordMenuListProps = {
  /** その日の筋トレ種目の一覧。空配列なら「筋トレの記録なし」を表示する */
  workouts: RecordListItem['workouts'];
  /** その日の有酸素の一覧。空配列なら「有酸素の記録なし」を表示する */
  cardios: RecordListItem['cardios'];
};

/**
 * 記録一覧カードに表示する、その日の筋トレメニューと有酸素メニュー（#23）。
 *
 * 公開一覧と管理者一覧で共用する。明細は表示専用で並べ替え・編集をしないため、行の key は
 * 配列のインデックスを使う（一覧 API は行 ID を返さない）。
 */
export default function RecordMenuList({ workouts, cardios }: RecordMenuListProps) {
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl bg-surface-muted p-4">
        <p className="text-[10px] font-black uppercase text-subtle">筋トレメニュー</p>
        {workouts.length === 0 ? (
          <p className="mt-2 text-sm text-subtle">筋トレの記録なし</p>
        ) : (
          <ul className="mt-2 grid gap-2">
            {workouts.map((w, i) => (
              <li key={i} className="text-sm text-foreground">
                <span className="mr-2 rounded-full bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary">
                  {w.part}
                </span>
                <span className="font-bold">{w.name}</span>
                <span className="ml-2 text-muted">
                  {w.sets}セット × {w.reps}回 / {w.weight}kg
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="rounded-2xl bg-surface-muted p-4">
        <p className="text-[10px] font-black uppercase text-subtle">有酸素メニュー</p>
        {cardios.length === 0 ? (
          <p className="mt-2 text-sm text-subtle">有酸素の記録なし</p>
        ) : (
          <ul className="mt-2 grid gap-2">
            {cardios.map((c, i) => (
              <li key={i} className="text-sm text-foreground">
                <span className="font-bold">{c.type}</span>
                <span className="ml-2 text-muted">
                  {c.minutes}分 / {c.distance}km
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
