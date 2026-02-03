'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import PageHeader from '@/components/ui/PageHeader';
import { buttonClasses } from '@/components/ui/Button';
import CalorieEstimate from '@/components/CalorieEstimate';
import DatePicker from '@/components/DatePicker';

type WorkoutRow = {
  id: string;
  part: string;
  name: string;
  sets: string;
  reps: string;
  weight: string;
};

const createRow = (): WorkoutRow => ({
  id: crypto.randomUUID(),
  part: '',
  name: '',
  sets: '',
  reps: '',
  weight: '',
});

export default function AdminRecordNewPage() {
  const router = useRouter();
  const [date, setDate] = useState('');
  const [memo, setMemo] = useState('');
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([createRow()]);
  const [cardioType, setCardioType] = useState<'ラン' | 'ウォーク'>('ラン');
  const [cardioMinutes, setCardioMinutes] = useState('');
  const [cardioDistance, setCardioDistance] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [notice, setNotice] = useState('');

  const totalSets = useMemo(
    () => workouts.reduce((sum, row) => sum + Number(row.sets || 0), 0),
    [workouts],
  );

  const hasValidationIssue = useMemo(
    () => workouts.some((row) => !row.part || !row.name || !row.weight),
    [workouts],
  );

  const updateWorkout = (id: string, field: keyof WorkoutRow, value: string) => {
    setWorkouts((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  };

  const addRow = () => setWorkouts((prev) => [...prev, createRow()]);
  const removeRow = (id: string) =>
    setWorkouts((prev) => (prev.length === 1 ? prev : prev.filter((row) => row.id !== id)));

  const handleSave = async () => {
    setStatus('saving');
    setNotice('');

    const cardioHasValue = cardioMinutes !== '' || cardioDistance !== '';
    if (!date) {
      setStatus('error');
      setNotice('日付を選択してください。');
      return;
    }

    const res = await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date,
        memo: memo.trim() ? memo.trim() : null,
        workouts: workouts.map((row) => ({
          part: row.part,
          name: row.name,
          sets: Number(row.sets || 0),
          reps: Number(row.reps || 0),
          weight: Number(row.weight || 0),
        })),
        cardio: cardioHasValue
          ? {
              type: cardioType,
              minutes: Number(cardioMinutes || 0),
              distance: Number(cardioDistance || 0),
            }
          : null,
      }),
    });

    if (res.status === 409) {
      setStatus('error');
      setNotice('同じ日付の記録が既に存在します。');
      return;
    }

    if (!res.ok) {
      setStatus('error');
      setNotice('保存に失敗しました。');
      return;
    }

    router.push('/');
  };

  return (
    <main className="min-h-screen pb-16">
      <PageHeader
        title="記録追加"
        subtitle="New record"
        action={
          <Link href="/" className={buttonClasses('outline')}>
            一覧へ戻る
          </Link>
        }
      />

      <section className="mx-auto max-w-5xl px-6 pt-8">
        <div className="grid gap-8">
          {notice ? <p className="text-sm font-bold text-red-500">{notice}</p> : null}
          {hasValidationIssue ? (
            <p className="text-xs font-bold text-amber-600">未入力の項目があります。</p>
          ) : null}
          <Card className="p-6 md:p-8">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
              日付
            </label>
            <div className="mt-3">
              <DatePicker value={date} onChange={setDate} />
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
            <h2 className="text-xl font-black text-[color:var(--accent)]">有酸素</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <label className="text-[10px] font-black uppercase text-gray-400">
                種別
                <select
                  className="mt-2 w-full rounded-lg border-none bg-white p-2 text-sm font-bold"
                  value={cardioType}
                  onChange={(event) =>
                    setCardioType(event.target.value === 'ウォーク' ? 'ウォーク' : 'ラン')
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
                  value={cardioMinutes}
                  onChange={(event) => setCardioMinutes(event.target.value)}
                />
              </label>
              <label className="text-[10px] font-black uppercase text-gray-400">
                距離 (km)
                <input
                  type="number"
                  placeholder="0"
                  className="mt-2 w-full rounded-lg border-none bg-white p-2 text-sm font-bold"
                  value={cardioDistance}
                  onChange={(event) => setCardioDistance(event.target.value)}
                />
              </label>
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
              disabled={status === 'saving' || !date}
            >
              {status === 'saving' ? '保存中...' : '保存'}
            </button>
          </div>

          <Card className="p-4">
            <CalorieEstimate
              totalSets={totalSets}
              cardioMinutes={Number(cardioMinutes || 0)}
              cardioType={cardioType}
            />
          </Card>
        </div>
      </section>
    </main>
  );
}
