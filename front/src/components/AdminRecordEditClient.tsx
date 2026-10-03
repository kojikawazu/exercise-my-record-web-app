'use client';

import { useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import PageHeader from '@/components/ui/PageHeader';
import { buttonClasses } from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import CalorieEstimate from '@/components/CalorieEstimate';
import DatePicker from '@/components/DatePicker';
import { useRecordValidation } from '@/hooks/useRecordValidation';
import { useRecordDetail } from '@/hooks/useRecordDetail';
import { useRecordMutations } from '@/hooks/useRecordMutations';
import { useMasters } from '@/hooks/useMasters';
import { createWorkoutRow, toFormRows, withCurrentOption } from '@/lib/recordForm';
import type { RecordDetail } from '@/types/record';
import type { CardioRow, WorkoutRow } from '@/types/recordForm';

/** 記録編集クライアントの props。 */
type AdminRecordEditClientProps = {
  /** 編集対象の記録日（`YYYY-MM-DD`）。Server Component 側で動的セグメントを解決済み */
  date: string;
};

/**
 * 空の有酸素入力行を生成する。行追加に使用する。
 *
 * @param type - 既定の種別（有酸素種別マスターの先頭。マスターが未取得・0 件なら空文字）
 * @returns 数値項目が空で新規 ID を持つ有酸素行
 */
const createCardioRow = (type: string): CardioRow => ({
  id: crypto.randomUUID(),
  type,
  minutes: '',
  distance: '',
});

/**
 * 記録編集画面。URL の日付の既存記録を取得してフォームへプリセットし、記録追加と同一構成
 * （筋トレ・有酸素・体調メモ）で編集する。日付は変更不可。フィールド単位バリデーション（保存
 * 押下後に表示）を経て API へ更新保存し、推定消費カロリーを画面下部に表示する。保存成功後は
 * 管理者向け記録一覧へ遷移する。
 */
export default function AdminRecordEditClient({ date }: AdminRecordEditClientProps) {
  const router = useRouter();
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([createWorkoutRow()]);
  const [memo, setMemo] = useState('');
  const [cardios, setCardios] = useState<CardioRow[]>([]);
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [notice, setNotice] = useState('');
  const { bodyParts, exercises, cardioTypes, status: mastersStatus } = useMasters();
  // 種目名の <input list> と <datalist> を結ぶ ID
  const exerciseListId = useId();

  // 取得した既存記録をフォームの初期値として流し込む（取得成功時に 1 回だけ呼ばれる）
  const presetForm = (data: RecordDetail) => {
    const rows = toFormRows(data);
    setWorkouts(rows.workouts);
    setCardios(rows.cardios);
    setMemo(data.memo ?? '');
  };
  const { status: loadStatus } = useRecordDetail(date, presetForm);
  const loading = loadStatus === 'loading';
  const loadNotice =
    loadStatus === 'not-found' || loadStatus === 'error' ? '記録が見つかりません。' : '';
  const { update } = useRecordMutations();

  const { displayErrors, hasErrors, setSubmitted } = useRecordValidation(date, workouts, cardios);

  const totalSets = useMemo(
    () => workouts.reduce((sum, row) => sum + Number(row.sets || 0), 0),
    [workouts],
  );

  const updateWorkout = (id: string, field: keyof WorkoutRow, value: string) => {
    setWorkouts((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const addRow = () => setWorkouts((prev) => [...prev, createWorkoutRow()]);
  const removeRow = (id: string) =>
    setWorkouts((prev) => (prev.length === 1 ? prev : prev.filter((row) => row.id !== id)));

  const updateCardio = (id: string, field: keyof CardioRow, value: string) => {
    setCardios((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };
  const addCardioRow = () => setCardios((prev) => [...prev, createCardioRow(cardioTypes[0] ?? '')]);
  const removeCardioRow = (id: string) => setCardios((prev) => prev.filter((row) => row.id !== id));

  const handleSave = async () => {
    setSubmitted(true);
    setNotice('');
    if (hasErrors) {
      setStatus('error');
      return;
    }
    setStatus('saving');

    const result = await update(date, { memo, workouts, cardios });

    if (!result.ok) {
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
          {notice || loadNotice ? (
            <p className="text-sm font-bold text-red-500">{notice || loadNotice}</p>
          ) : null}
          {mastersStatus === 'error' ? (
            <p className="text-sm font-bold text-red-500">選択肢を取得できませんでした。</p>
          ) : null}
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
            {/* 種目名の入力候補。マスターに無い種目も記録できるよう自由入力を残す */}
            <datalist id={exerciseListId}>
              {exercises.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
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
                        {withCurrentOption(bodyParts, row.part).map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                      {displayErrors.workouts[row.id]?.part ? (
                        <p className="mt-1 text-xs text-red-500">
                          {displayErrors.workouts[row.id].part}
                        </p>
                      ) : null}
                    </label>
                    <label className="text-[10px] font-black uppercase text-gray-400 md:col-span-2">
                      種目名
                      <input
                        type="text"
                        placeholder="種目を入力"
                        list={exerciseListId}
                        className="mt-2 w-full rounded-lg border-none bg-white p-2 text-sm font-bold"
                        value={row.name}
                        onChange={(event) => updateWorkout(row.id, 'name', event.target.value)}
                      />
                      {displayErrors.workouts[row.id]?.name ? (
                        <p className="mt-1 text-xs text-red-500">
                          {displayErrors.workouts[row.id].name}
                        </p>
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
                        <p className="mt-1 text-xs text-red-500">
                          {displayErrors.workouts[row.id].sets}
                        </p>
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
                        <p className="mt-1 text-xs text-red-500">
                          {displayErrors.workouts[row.id].reps}
                        </p>
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
                        <p className="mt-1 text-xs text-red-500">
                          {displayErrors.workouts[row.id].weight}
                        </p>
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
                        onChange={(event) => updateCardio(row.id, 'type', event.target.value)}
                      >
                        {row.type === '' ? <option value="">選択</option> : null}
                        {withCurrentOption(cardioTypes, row.type).map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                      {displayErrors.cardios[row.id]?.type ? (
                        <p className="mt-1 text-xs text-red-500">
                          {displayErrors.cardios[row.id].type}
                        </p>
                      ) : null}
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
                        <p className="mt-1 text-xs text-red-500">
                          {displayErrors.cardios[row.id].minutes}
                        </p>
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
                        <p className="mt-1 text-xs text-red-500">
                          {displayErrors.cardios[row.id].distance}
                        </p>
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
