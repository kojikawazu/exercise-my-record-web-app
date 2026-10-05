'use client';

import DashboardSummary from '@/components/DashboardSummary';
import LatestRecordHighlight from '@/components/LatestRecordHighlight';
import MonthHeatmap from '@/components/MonthHeatmap';
import { useStreak } from '@/hooks/useStreak';
import type { RecordListItem } from '@/types/record';

/** {@link Dashboard} の props。 */
type DashboardProps = {
  /** 最新の記録（一覧 1 ページ目の先頭）。一覧の取得前・記録 0 件は `null`（ハイライトを出さない） */
  latestRecord: RecordListItem | null;
};

/**
 * トップページ 1 ページ目のダッシュボード（#27 / #28）。今週のサマリー・今月のヒートマップ・
 * 最新の記録を並べる。連続記録日数はサマリーとヒートマップの双方で使うため、ここで 1 回だけ
 * 取得して配る。props の各項目は {@link DashboardProps} を参照。
 */
export default function Dashboard({ latestRecord }: DashboardProps) {
  const { streak } = useStreak();

  return (
    <div className="mt-8 grid gap-6">
      <DashboardSummary streak={streak} />
      <MonthHeatmap streak={streak} />
      {latestRecord ? <LatestRecordHighlight record={latestRecord} /> : null}
    </div>
  );
}
