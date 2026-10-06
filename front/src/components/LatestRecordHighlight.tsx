import Link from 'next/link';
import Card from '@/components/ui/Card';
import { buttonClasses } from '@/components/ui/Button';
import RecordMenuList from '@/components/RecordMenuList';
import type { RecordListItem } from '@/types/record';

/** {@link LatestRecordHighlight} の props。 */
type LatestRecordHighlightProps = {
  /** 最新の記録（一覧 1 ページ目の先頭。一覧で取得済みのものを渡し、追加の取得はしない） */
  record: RecordListItem;
};

/**
 * トップページの「最新の記録」ハイライト（#27）。日付と、その日の種目・有酸素を表示する。
 * props の各項目は {@link LatestRecordHighlightProps} を参照。
 */
export default function LatestRecordHighlight({ record }: LatestRecordHighlightProps) {
  return (
    <Card className="p-6 md:p-8" role="region" aria-label="最新の記録">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-primary">最新の記録</h2>
          <p className="mt-1 text-sm font-bold text-muted">{record.date}</p>
        </div>
        <Link href={`/records/${record.date}`} className={buttonClasses('outline')}>
          詳細を見る
        </Link>
      </div>
      <RecordMenuList workouts={record.workouts} cardios={record.cardios} />
    </Card>
  );
}
