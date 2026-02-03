'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import PageHeader from '@/components/ui/PageHeader';
import { buttonClasses } from '@/components/ui/Button';
import CalorieEstimate from '@/components/CalorieEstimate';

export type DetailWorkout = {
  id: string;
  name: string;
  part: string;
  sets: number;
  reps: number;
  weight: number;
};

const fallbackWorkouts: DetailWorkout[] = [
  { id: '1', name: 'ベンチプレス', part: '胸', sets: 4, reps: 8, weight: 75 },
  { id: '2', name: 'スクワット', part: '脚', sets: 5, reps: 6, weight: 90 },
  { id: '3', name: 'ラットプルダウン', part: '背中', sets: 3, reps: 10, weight: 55 },
];

const fallbackCardio = { type: 'ラン' as const, minutes: 42, distance: 5.6 };

type RecordDetailData = {
  date: string;
  memo: string | null;
  workouts: DetailWorkout[];
  cardio: { type: string; minutes: number; distance: number } | null;
};

type RecordDetailClientProps = {
  date: string;
};

export default function RecordDetailClient({ date }: RecordDetailClientProps) {
  const [detail, setDetail] = useState<RecordDetailData | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchDetail = async () => {
      const res = await fetch(`/api/records/${date}`);
      if (res.status === 404) {
        setErrorMessage('記録が見つかりません。');
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as RecordDetailData;
      setDetail(data);
    };

    void fetchDetail();
  }, [date]);

  const workouts = detail?.workouts ?? fallbackWorkouts;
  const cardio = detail?.cardio ?? fallbackCardio;
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
          <Card className="p-6 md:p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">日付</p>
            <h2 className="text-2xl font-black text-gray-900">{detail?.date ?? date}</h2>
          </Card>

          <Card className="p-6">
            <CalorieEstimate
              totalSets={totalSets}
              cardioMinutes={cardio.minutes}
              cardioType={cardio.type === 'ウォーク' ? 'ウォーク' : 'ラン'}
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
            <h3 className="text-xl font-black text-[color:var(--accent)]">有酸素</h3>
            <div className="mt-4 grid gap-3 text-sm text-gray-800 md:grid-cols-3">
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-[10px] font-black uppercase text-gray-400">種別</p>
                <p className="font-bold">{cardio.type}</p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-[10px] font-black uppercase text-gray-400">時間</p>
                <p className="font-bold">{cardio.minutes}分</p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-[10px] font-black uppercase text-gray-400">距離</p>
                <p className="font-bold">{cardio.distance}km</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 md:p-8">
            <h3 className="text-xl font-black text-[color:var(--accent)]">体調メモ</h3>
            <p className="mt-3 text-sm text-gray-500">
              {memo.length === 0 ? '体調メモなし' : memo}
            </p>
          </Card>
        </div>
      </section>
    </main>
  );
}
