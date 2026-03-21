'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import PageHeader from '@/components/ui/PageHeader';
import { buttonClasses } from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import CalorieEstimate from '@/components/CalorieEstimate';
import DatePicker from '@/components/DatePicker';
import { useRecordValidation } from '@/hooks/useRecordValidation';

type WorkoutRow = {
  id: string;
  part: string;
  name: string;
  sets: string;
  reps: string;
  weight: string;
};

type CardioRow = {
  id: string;
  type: 'ラン' | 'ウォーク';
  minutes: string;
  distance: string;
};

type RecordDetail = {
  date: string;
  memo: string | null;
  workouts: { id: string; part: string; name: string; sets: number; reps: number; weight: number }[];
  cardios: { type: string; minutes: number; distance: number }[];
};

type PageProps = {
  params: Promise<{ date: string }>;
};

const toRow = (workout: RecordDetail['workouts'][number]): WorkoutRow => ({
  id: workout.id,
  part: workout.part,
  name: workout.name,
  sets: String(workout.sets),
  reps: String(workout.reps),
  weight: String(workout.weight),
});

const emptyRow = (): WorkoutRow => ({
  id: crypto.randomUUID(),
  part: '',
  name: '',
  sets: '',
  reps: '',
  weight: '',
});

const createCardioRow = (): CardioRow => ({
  id: crypto.randomUUID(),
  type: 'ラン',
  minutes: '',
  distance: '',
});

export default function AdminRecordEditPage({ params }: PageProps) {
  const { date } = use(params);
  const router = useRouter();
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([emptyRow()]);
  const [memo, setMemo] = useState('');
  const [cardios, setCardios] = useState<CardioRow[]>([]);
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecord = async () => {
      const res = await fetch(`/api/records/${date}`);
      if (!res.ok) {
        setNotice('記録が見つかりません。');
        setLoading(false);
        return;
      }
      const data = (await res.json()) as RecordDetail;
      setWorkouts(data.workouts.length ? data.workouts.map(toRow) : [emptyRow()]);
      setMemo(data.memo ?? '');
      if (data.cardios?.length) {
        setCardios(data.cardios.map((c) => ({
          id: crypto.randomUUID(),
          type: (c.type === 'ウォーク' ? 'ウォーク' : 'ラン') as 'ラン' | 'ウォーク',
          minutes: String(c.minutes),
          distance: String(c.distance),
        })));
      }
      setLoading(false);
    };

    void fetchRecord();
  }, [date]);

  const { displayErrors, hasErrors, setSubmitted } = useRecordValidation(date, workouts, cardios);

  const totalSets = useMemo(
    () => workouts.reduce((sum, row) => sum + Number(row.sets || 0), 0),
    [workouts],
  );

  const updateWorkout = (id: string, field: keyof WorkoutRow, value: string) => {
    setWorkouts((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  };

  const addRow = () => setWorkouts((prev) => [...prev, emptyRow()]);
  const removeRow = (id: string) =>
    setWorkouts((prev) => (prev.length === 1 ? prev : prev.filter((row) => row.id !== id)));

  const updateCardio = (id: string, field: keyof CardioRow, value: string) => {
    setCardios((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  };
  const addCardioRow = () => setCardios((prev) => [...prev, createCardioRow()]);
  const removeCardioRow = (id: string) =>
    setCardios((prev) => prev.filter((row) => row.id !== id));

  const handleSave = async () => {
    setSubmitted(true);
    setNotice('');
    if (hasErrors) {
      setStatus('error');
      return;
    }
    setStatus('saving');

    const cardioRows = cardios.filter((c) => c.minutes !== '' || c.distance !== '');
    const res = await fetch(`/api/records/${date}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memo: memo.trim() ? memo.trim() : null,
        workouts: workouts.map((row) => ({
          part: row.part,
          name: row.name,
          sets: Number(row.sets || 0),
          reps: Number(row.reps || 0),
          weight: Number(row.weight || 0),
        })),
        cardios: cardioRows.length
          ? cardioRows.map((c) => ({
              type: c.type,
              minutes: Number(c.minutes || 0),
              distance: Number(c.distance || 0),
            }))
          : null,
      }),
    });

    if (!res.ok) {
      setStatus('error');
      setNotice('保存に失敗しました。');
      return;
    }

    router.push('/admin/records');
  };

  if (loading) {
    return (
      <main className="min-h-screen pb-16">
        <PageHeader
          title="記録編集"
          subtitle="Edit record"
          action={
            <Link href="/admin/records" className={buttonClasses('outline')}>
              管理者一覧へ戻る
            </Link>
          }
        />

        <section className="mx-auto max-w-5xl px-6 pt-8">
          <Card className="p-10">
            <LoadingSpinner mode="fetching" />
          </Card>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-16">
      <PageHeader
        title="記録編集"
        subtitle="Edit record"
        action={
          <Link href="/admin/records" className={buttonClasses('outline')}>
            管理者一覧へ戻る
          </Link>
        }
      />

      <section className="mx-auto max-w-5xl px-6 pt-8">
        <div className="grid gap-8">
          {notice ? <p className="text-sm font-bold text-red-500">{notice}</p> : null}
          <Card className="p-6 md:p-8">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
              日付
            </label>
            <div className="mt-3">
              <DatePicker value={date} onChange={() => undefined} disabled />
            </div>
          </Card>

          <Card className="p-6 md:p-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-[color:var(--accent)]">筋トレ</h2>
              <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-[color:var(--accent)]">
                最少1行
              </span>
            </div>
            <div className="mt-6 grid gap-4">
              {workouts.map((row) => (
                <div key={row.id} className="rounded-2xl bg-gray-50 p-4">
                  <div className="grid gap-4 md:grid-cols-6">
                    <label className="text-[10px] font-black uppercase text-gray-400">
                      部位
                      <select
                        className="mt-2 w-full rounded-lg border-none bg-white p-2 text-sm font-bold"
                        value={row.part}
                        onChange={(event) => updateWorkout(row.id, 'part', event.target.value)}
                      >
                        <option value="">選択</option>
                        <option value="胸">胸</option>
                        <option value="背中">背中</option>
                        <option value="脚">脚</option>
                        <option value="腹">腹</option>
                      </select>
                      {displayErrors.workouts[row.id]?.part ? (
                        <p className="mt-1 text-xs text-red-500">{displayErrors.workouts[row.id].part}</p>
                      ) : null}
                    </label>
                    <label className="text-[10px] font-black uppercase text-gray-400 md:col-span-2">
                      種目名
                      <input
                        type="text"
                        placeholder="種目を入力"
                        className="mt-2 w-full rounded-lg border-none bg-white p-2 text-sm font-bold"
                        value={row.name}
                        onChange={(event) => updateWorkout(row.id, 'name', event.target.value)}
                      />
                      {displayErrors.workouts[row.id]?.name ? (
                        <p className="mt-1 text-xs text-red-500">{displayErrors.workouts[row.id].name}</p>
                      ) : null}
                    </label>
                    <label className="text-[10px] font-black uppercase text-gray-400">
                      セット数
                      <input
                        type="number"
                        placeholder="0"
                        className="mt-2 w-full rounded-lg border-none bg-white p-2 text-sm font-bold"
                        value={row.sets}
                        onChange={(event) => updateWorkout(row.id, 'sets', event.target.value)}
                      />
                      {displayErrors.workouts[row.id]?.sets ? (
                        <p className="mt-1 text-xs text-red-500">{displayErrors.workouts[row.id].sets}</p>
                      ) : null}
                    </label>
                    <label className="text-[10px] font-black uppercase text-gray-400">
                      回数
                      <input
                        type="number"
                        placeholder="0"
                        className="mt-2 w-full rounded-lg border-none bg-white p-2 text-sm font-bold"
                        value={row.reps}
                        onChange={(event) => updateWorkout(row.id, 'reps', event.target.value)}
                      />
                      {displayErrors.workouts[row.id]?.reps ? (
                        <p className="mt-1 text-xs text-red-500">{displayErrors.workouts[row.id].reps}</p>
                      ) : null}
                    </label>
                    <label className="text-[10px] font-black uppercase text-gray-400">
                      重量 (kg)
                      <input
                        type="number"
                        placeholder="0"
                        className="mt-2 w-full rounded-lg border-none bg-white p-2 text-sm font-bold"
                        value={row.weight}
                        onChange={(event) => updateWorkout(row.id, 'weight', event.target.value)}
                      />
                      {displayErrors.workouts[row.id]?.weight ? (
                        <p className="mt-1 text-xs text-red-500">{displayErrors.workouts[row.id].weight}</p>
                      ) : null}
                    </label>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      className="rounded-full border border-[color:var(--accent)] px-3 py-1 text-xs font-bold text-[color:var(--accent)]"
                      onClick={() => removeRow(row.id)}
                      disabled={workouts.length === 1}
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <button type="button" className={buttonClasses('pink')} onClick={addRow}>
                追加
              </button>
            </div>
          </Card>

          <Card className="p-6 md:p-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-[color:var(--accent)]">有酸素</h2>
              <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-[color:var(--accent)]">
                任意
              </span>
            </div>
            <div className="mt-6 grid gap-4">
              {cardios.map((row) => (
                <div key={row.id} className="rounded-2xl bg-gray-50 p-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="text-[10px] font-black uppercase text-gray-400">
                      種別
                      <select
                        className="mt-2 w-full rounded-lg border-none bg-white p-2 text-sm font-bold"
                        value={row.type}
                        onChange={(event) =>
                          updateCardio(row.id, 'type', event.target.value)
                        }
                      >
                        <option value="ラン">ラン</option>
                        <option value="ウォーク">ウォーク</option>
                      </select>
                    </label>
                    <label className="text-[10px] font-black uppercase text-gray-400">
                      時間 (分)
                      <input
                        type="number"
                        placeholder="0"
                        className="mt-2 w-full rounded-lg border-none bg-white p-2 text-sm font-bold"
                        value={row.minutes}
                        onChange={(event) => updateCardio(row.id, 'minutes', event.target.value)}
                      />
                      {displayErrors.cardios[row.id]?.minutes ? (
                        <p className="mt-1 text-xs text-red-500">{displayErrors.cardios[row.id].minutes}</p>
                      ) : null}
                    </label>
                    <label className="text-[10px] font-black uppercase text-gray-400">
                      距離 (km)
                      <input
                        type="number"
                        placeholder="0"
                        className="mt-2 w-full rounded-lg border-none bg-white p-2 text-sm font-bold"
                        value={row.distance}
                        onChange={(event) => updateCardio(row.id, 'distance', event.target.value)}
                      />
                      {displayErrors.cardios[row.id]?.distance ? (
                        <p className="mt-1 text-xs text-red-500">{displayErrors.cardios[row.id].distance}</p>
                      ) : null}
                    </label>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      className="rounded-full border border-[color:var(--accent)] px-3 py-1 text-xs font-bold text-[color:var(--accent)]"
                      onClick={() => removeCardioRow(row.id)}
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <button type="button" className={buttonClasses('pink')} onClick={addCardioRow}>
                追加
              </button>
            </div>
          </Card>

          <Card className="p-6 md:p-8">
            <h2 className="text-xl font-black text-[color:var(--accent)]">体調メモ</h2>
            <textarea
              placeholder="体調メモを入力"
              className="mt-4 h-28 w-full rounded-2xl border-none bg-gray-50 px-4 py-3 text-sm font-bold"
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
            />
            <p className="mt-2 text-xs font-bold text-gray-400">最大500文字</p>
          </Card>

          <div className="flex justify-end">
            <button
              type="button"
              className={`${buttonClasses('primary')} rounded-2xl px-6 py-3 text-sm`}
              onClick={handleSave}
              disabled={status === 'saving'}
            >
              {status === 'saving' ? (
                <LoadingSpinner mode="saving" variant="inline" className="text-white" />
              ) : (
                '保存'
              )}
            </button>
          </div>

          <Card className="p-4">
            <CalorieEstimate
              totalSets={totalSets}
              cardios={cardios.map((c) => ({
                type: c.type,
                minutes: Number(c.minutes || 0),
              }))}
            />
          </Card>
        </div>
      </section>
    </main>
  );
}
