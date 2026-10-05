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
import { useTodayLocalIso } from '@/hooks/useTodayLocalIso';
import { useRecordMutations } from '@/hooks/useRecordMutations';
import { useMasters } from '@/hooks/useMasters';
import { useLatestRecord } from '@/hooks/useLatestRecord';
import { createWorkoutRow, isFormBlank, toFormRows, withCurrentOption } from '@/lib/recordForm';
import type { CardioRow, WorkoutRow } from '@/types/recordForm';

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
 * 記録追加画面。日付（初期値はブラウザのローカル日付での今日）・筋トレ（最少 1 行）・有酸素（任意）・体調メモを入力し、フィールド単位の
 * バリデーション（保存押下後に表示）を経て API へ新規保存する。推定消費カロリーを画面下部に
 * 表示し、同日重複（409）や保存失敗は通知する。保存成功後は一覧へ遷移する。
 */
export default function AdminRecordNewClient() {
  const router = useRouter();
  const today = useTodayLocalIso();
  // ユーザーが選んだ日付。未選択（null）の間は今日を表示・保存に使う
  const [pickedDate, setDate] = useState<string | null>(null);
  const date = pickedDate ?? today;
  const [memo, setMemo] = useState('');
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([createWorkoutRow()]);
  const [cardios, setCardios] = useState<CardioRow[]>([]);
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [notice, setNotice] = useState('');
  const { bodyParts, exercises, cardioTypes, status: mastersStatus } = useMasters();
  // 種目名の <input list> と <datalist> を結ぶ ID
  const exerciseListId = useId();
  const { latestDate, status: latestStatus, loadLatest } = useLatestRecord();
  const [copying, setCopying] = useState(false);
  // コピー操作の結果表示（成功は案内、失敗はエラー）。次の操作で消す
  const [copyMessage, setCopyMessage] = useState<{ tone: 'info' | 'error'; text: string } | null>(
    null,
  );

  const { displayErrors, hasErrors, setSubmitted } = useRecordValidation(date, workouts, cardios);
  const { create } = useRecordMutations();

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

  // 最新の記録の筋トレ・有酸素をフォームへ流し込む。日付・メモはコピーしない
  const handleCopyLatest = async () => {
    setCopyMessage(null);
    if (
      !isFormBlank(workouts, cardios) &&
      !confirm('入力中の筋トレ・有酸素を前回の記録で置き換えます。よろしいですか？')
    ) {
      return;
    }
    setCopying(true);
    const result = await loadLatest();
    setCopying(false);
    if (!result.ok) {
      setCopyMessage({ tone: 'error', text: '前回の記録を取得できませんでした。' });
      return;
    }
    const rows = toFormRows(result.data);
    setWorkouts(rows.workouts);
    setCardios(rows.cardios);
    setCopyMessage({ tone: 'info', text: `${result.data.date} の記録をコピーしました。` });
  };

  const handleSave = async () => {
    setSubmitted(true);
    setNotice('');
    if (hasErrors) {
      setStatus('error');
      return;
    }
    setStatus('saving');

    const result = await create(date, { memo, workouts, cardios });

    if (!result.ok && result.status === 409) {
      setStatus('error');
      setNotice('同じ日付の記録が既に存在します。');
      return;
    }

    if (!result.ok) {
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
          {notice ? <p className="text-sm font-bold text-danger">{notice}</p> : null}
          {mastersStatus === 'error' ? (
            <p className="text-sm font-bold text-danger">選択肢を取得できませんでした。</p>
          ) : null}
          <Card className="p-6 md:p-8">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-subtle">
              日付
            </label>
            <div className="mt-3">
              <DatePicker value={date} onChange={setDate} />
            </div>
            {displayErrors.date ? (
              <p className="mt-1 text-xs text-danger">{displayErrors.date}</p>
            ) : null}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                className={buttonClasses('outline')}
                onClick={handleCopyLatest}
                disabled={latestStatus !== 'ready' || copying}
              >
                {latestDate ? `前回の記録をコピー（${latestDate}）` : '前回の記録をコピー'}
              </button>
              {latestStatus === 'empty' ? (
                <p className="text-xs font-bold text-subtle">コピーできる記録がありません。</p>
              ) : null}
              {latestStatus === 'error' ? (
                <p className="text-xs font-bold text-danger">前回の記録を取得できませんでした。</p>
              ) : null}
              {copyMessage ? (
                <p
                  className={`text-xs font-bold ${
                    copyMessage.tone === 'error' ? 'text-danger' : 'text-muted'
                  }`}
                >
                  {copyMessage.text}
                </p>
              ) : null}
            </div>
          </Card>

          <Card className="p-6 md:p-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-primary">筋トレ</h2>
              <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
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
                <div key={row.id} className="rounded-2xl bg-surface-muted p-4">
                  <div className="grid gap-4 md:grid-cols-6">
                    <label className="text-[10px] font-black uppercase text-subtle">
                      部位
                      <select
                        className="mt-2 w-full rounded-lg border-none bg-surface p-2 text-sm font-bold"
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
                        <p className="mt-1 text-xs text-danger">
                          {displayErrors.workouts[row.id].part}
                        </p>
                      ) : null}
                    </label>
                    <label className="text-[10px] font-black uppercase text-subtle md:col-span-2">
                      種目名
                      <input
                        type="text"
                        placeholder="種目を入力"
                        list={exerciseListId}
                        className="mt-2 w-full rounded-lg border-none bg-surface p-2 text-sm font-bold"
                        value={row.name}
                        onChange={(event) => updateWorkout(row.id, 'name', event.target.value)}
                      />
                      {displayErrors.workouts[row.id]?.name ? (
                        <p className="mt-1 text-xs text-danger">
                          {displayErrors.workouts[row.id].name}
                        </p>
                      ) : null}
                    </label>
                    <label className="text-[10px] font-black uppercase text-subtle">
                      セット数
                      <input
                        type="number"
                        placeholder="0"
                        className="mt-2 w-full rounded-lg border-none bg-surface p-2 text-sm font-bold"
                        value={row.sets}
                        onChange={(event) => updateWorkout(row.id, 'sets', event.target.value)}
                      />
                      {displayErrors.workouts[row.id]?.sets ? (
                        <p className="mt-1 text-xs text-danger">
                          {displayErrors.workouts[row.id].sets}
                        </p>
                      ) : null}
                    </label>
                    <label className="text-[10px] font-black uppercase text-subtle">
                      回数
                      <input
                        type="number"
                        placeholder="0"
                        className="mt-2 w-full rounded-lg border-none bg-surface p-2 text-sm font-bold"
                        value={row.reps}
                        onChange={(event) => updateWorkout(row.id, 'reps', event.target.value)}
                      />
                      {displayErrors.workouts[row.id]?.reps ? (
                        <p className="mt-1 text-xs text-danger">
                          {displayErrors.workouts[row.id].reps}
                        </p>
                      ) : null}
                    </label>
                    <label className="text-[10px] font-black uppercase text-subtle">
                      重量 (kg)
                      <input
                        type="number"
                        placeholder="0"
                        className="mt-2 w-full rounded-lg border-none bg-surface p-2 text-sm font-bold"
                        value={row.weight}
                        onChange={(event) => updateWorkout(row.id, 'weight', event.target.value)}
                      />
                      {displayErrors.workouts[row.id]?.weight ? (
                        <p className="mt-1 text-xs text-danger">
                          {displayErrors.workouts[row.id].weight}
                        </p>
                      ) : null}
                    </label>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      className="rounded-full border border-primary px-3 py-1 text-xs font-bold text-primary"
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
              <button type="button" className={buttonClasses('cta')} onClick={addRow}>
                追加
              </button>
            </div>
          </Card>

          <Card className="p-6 md:p-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-primary">有酸素</h2>
              <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
                任意
              </span>
            </div>
            <div className="mt-6 grid gap-4">
              {cardios.map((row) => (
                <div key={row.id} className="rounded-2xl bg-surface-muted p-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="text-[10px] font-black uppercase text-subtle">
                      種別
                      <select
                        className="mt-2 w-full rounded-lg border-none bg-surface p-2 text-sm font-bold"
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
                        <p className="mt-1 text-xs text-danger">
                          {displayErrors.cardios[row.id].type}
                        </p>
                      ) : null}
                    </label>
                    <label className="text-[10px] font-black uppercase text-subtle">
                      時間 (分)
                      <input
                        type="number"
                        placeholder="0"
                        className="mt-2 w-full rounded-lg border-none bg-surface p-2 text-sm font-bold"
                        value={row.minutes}
                        onChange={(event) => updateCardio(row.id, 'minutes', event.target.value)}
                      />
                      {displayErrors.cardios[row.id]?.minutes ? (
                        <p className="mt-1 text-xs text-danger">
                          {displayErrors.cardios[row.id].minutes}
                        </p>
                      ) : null}
                    </label>
                    <label className="text-[10px] font-black uppercase text-subtle">
                      距離 (km)
                      <input
                        type="number"
                        placeholder="0"
                        className="mt-2 w-full rounded-lg border-none bg-surface p-2 text-sm font-bold"
                        value={row.distance}
                        onChange={(event) => updateCardio(row.id, 'distance', event.target.value)}
                      />
                      {displayErrors.cardios[row.id]?.distance ? (
                        <p className="mt-1 text-xs text-danger">
                          {displayErrors.cardios[row.id].distance}
                        </p>
                      ) : null}
                    </label>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      className="rounded-full border border-primary px-3 py-1 text-xs font-bold text-primary"
                      onClick={() => removeCardioRow(row.id)}
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <button type="button" className={buttonClasses('cta')} onClick={addCardioRow}>
                追加
              </button>
            </div>
          </Card>

          <Card className="p-6 md:p-8">
            <h2 className="text-xl font-black text-primary">体調メモ</h2>
            <textarea
              placeholder="体調メモを入力"
              className="mt-4 h-28 w-full rounded-2xl border-none bg-surface-muted px-4 py-3 text-sm font-bold"
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
            />
            <p className="mt-2 text-xs font-bold text-subtle">最大500文字</p>
          </Card>

          <div className="flex justify-end">
            <button
              type="button"
              className={`${buttonClasses('cta')} rounded-2xl px-6 py-3 text-sm`}
              onClick={handleSave}
              disabled={status === 'saving'}
            >
              {status === 'saving' ? (
                <LoadingSpinner mode="saving" variant="inline" className="text-cta-foreground" />
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
