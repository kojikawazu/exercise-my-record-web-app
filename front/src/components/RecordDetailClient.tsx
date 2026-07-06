'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import PageHeader from '@/components/ui/PageHeader';
import { buttonClasses } from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import CalorieEstimate from '@/components/CalorieEstimate';
import { useAdminSession } from '@/hooks/useAdminSession';

/** 記録詳細における筋トレ 1 種目分のデータ。 */
export type DetailWorkout = {
  /** 種目の一意 ID（リストの key に使用）。 */
  id: string;
  /** 種目名。 */
  name: string;
  /** 対象部位。 */
  part: string;
  /** セット数。 */
  sets: number;
  /** 1 セットあたりの回数。 */
  reps: number;
  /** 重量（kg）。 */
  weight: number;
};

/** 記録詳細における有酸素 1 件分のデータ。 */
type CardioDetail = { type: string; minutes: number; distance: number };

/** 記録詳細 API から取得する 1 日分のレスポンス形。 */
type RecordDetailData = {
  /** 記録日（`YYYY-MM-DD`）。 */
  date: string;
  /** 体調メモ。未入力時は `null`。 */
  memo: string | null;
  /** 筋トレ種目の一覧。 */
  workouts: DetailWorkout[];
  /** 有酸素運動の一覧。 */
  cardios: CardioDetail[];
};

/** {@link RecordDetailClient} の props。 */
type RecordDetailClientProps = {
  /** 表示対象の記録日（`YYYY-MM-DD`）。 */
  date: string;
};

/** 再レンダーごとの参照変化を避けるための空配列（`useMemo` 依存の安定化用）。 */
const EMPTY_WORKOUTS: DetailWorkout[] = [];

/**
 * 指定日の記録詳細を表示するクライアント。筋トレ・有酸素・メモ・推定カロリーを一覧化する。
 *
 * マウント時と `date` 変更時に詳細 API を取得し、404 は「見つからない」、その他失敗は
 * 「取得失敗」を表示する。管理者（{@link useAdminSession}）にのみ編集リンクを出す。props の
 * 各項目は {@link RecordDetailClientProps} を参照。
 */
export default function RecordDetailClient({ date }: RecordDetailClientProps) {
  const [detail, setDetail] = useState<RecordDetailData | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { isAdmin } = useAdminSession();

  useEffect(() => {
    const fetchDetail = async () => {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const res = await fetch(`/api/records/${date}`);
        if (res.status === 404) {
          setErrorMessage('記録が見つかりません。');
          setDetail(null);
          return;
        }
        if (!res.ok) {
          setErrorMessage('記録の取得に失敗しました。');
          setDetail(null);
          return;
        }
        const data = (await res.json()) as RecordDetailData;
        setDetail(data);
      } catch {
        setErrorMessage('記録の取得に失敗しました。');
        setDetail(null);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchDetail();
  }, [date]);

  const workouts = detail?.workouts ?? EMPTY_WORKOUTS;
  const cardios = detail?.cardios ?? [];
  const memo = detail?.memo ?? '';

  const totalSets = useMemo(
    () => workouts.reduce((sum, item) => sum + item.sets, 0),
    [workouts],
  );

  return (
    <main className="min-h-screen pb-16">
      <PageHeader
        title="記録詳細"
        subtitle="Record detail"
        maxWidth="4xl"
        action={
          <Link href="/" className={buttonClasses('outline')}>
            一覧へ戻る
          </Link>
        }
      />

      <section className="mx-auto max-w-4xl px-6 pt-8">
        <div className="space-y-8">
          {errorMessage ? (
            <Card className="p-6 text-sm font-bold text-red-500">{errorMessage}</Card>
          ) : null}
          {isLoading ? (
            <Card className="p-10">
              <LoadingSpinner mode="fetching" />
            </Card>
          ) : null}
          {!isLoading && !errorMessage ? (
            <>
              <Card className="p-6 md:p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">日付</p>
                    <h2 className="text-2xl font-black text-gray-900">{detail?.date ?? date}</h2>
                  </div>
                  {isAdmin ? (
                    <Link
                      href={`/admin/records/${detail?.date ?? date}/edit`}
                      className="rounded-full border border-[#8a6f3c] px-4 py-2 text-sm font-bold text-[#8a6f3c] transition hover:bg-[#8a6f3c] hover:text-white"
                    >
                      編集
                    </Link>
                  ) : null}
                </div>
              </Card>

              <Card className="p-6">
                <CalorieEstimate
                  totalSets={totalSets}
                  cardios={cardios.map((c) => ({
                    type: (c.type === 'ウォーク' ? 'ウォーク' : 'ラン') as import('@/lib/calorie').CardioType,
                    minutes: c.minutes,
                  }))}
                />
              </Card>

              <Card className="p-6 md:p-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-[color:var(--accent)]">筋トレ</h3>
                  <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-[color:var(--accent)]">
                    {workouts.length} 件
                  </span>
                </div>
                <div className="mt-5 grid gap-4">
                  {workouts.map((item) => (
                    <div key={item.id} className="rounded-2xl bg-gray-50 p-4">
                      <div className="grid gap-3 text-sm text-gray-800 md:grid-cols-5">
                        <div>
                          <p className="text-[10px] font-black uppercase text-gray-400">種目</p>
                          <p className="font-bold">{item.name}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase text-gray-400">部位</p>
                          <p className="font-bold">{item.part}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase text-gray-400">セット</p>
                          <p className="font-bold">{item.sets}セット</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase text-gray-400">回数</p>
                          <p className="font-bold">{item.reps}回</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase text-gray-400">重量</p>
                          <p className="font-bold">{item.weight}kg</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6 md:p-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-[color:var(--accent)]">有酸素</h3>
                  <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-[color:var(--accent)]">
                    {cardios.length} 件
                  </span>
                </div>
                {cardios.length === 0 ? (
                  <p className="mt-4 text-sm text-gray-400">有酸素の記録なし</p>
                ) : (
                  <div className="mt-5 grid gap-4">
                    {cardios.map((c, i) => (
                      <div key={i} className="rounded-2xl bg-gray-50 p-4">
                        <div className="grid gap-3 text-sm text-gray-800 md:grid-cols-3">
                          <div>
                            <p className="text-[10px] font-black uppercase text-gray-400">種別</p>
                            <p className="font-bold">{c.type}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase text-gray-400">時間</p>
                            <p className="font-bold">{c.minutes}分</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase text-gray-400">距離</p>
                            <p className="font-bold">{c.distance}km</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-6 md:p-8">
                <h3 className="text-xl font-black text-[color:var(--accent)]">体調メモ</h3>
                <p className="mt-3 text-sm text-gray-500">
                  {memo.length === 0 ? '体調メモなし' : memo}
                </p>
              </Card>
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
}
