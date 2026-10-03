'use client';

import { Save } from 'lucide-react';
import { useState } from 'react';
import Card from '@/components/ui/Card';
import PageHeader from '@/components/ui/PageHeader';
import { buttonClasses } from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useProfile } from '@/hooks/useProfile';
import Link from 'next/link';

/**
 * プロフィール画面。体重（kg）を入力・保存する。表示時に保存済みの体重を取得してプリセットし、
 * 保存値は消費カロリー計算に使用する。数値以外の入力は保存せずエラー表示にする。データは
 * 1 件のみ維持（上書き保存）。
 */
export default function AdminProfileClient() {
  const { weightKg: savedWeightKg, status: loadStatus, save } = useProfile();
  // 入力欄の値。未編集（null）の間は保存済みの体重を表示する
  const [input, setInput] = useState<string | null>(null);
  const weightKg = input ?? (savedWeightKg === null ? '' : String(savedWeightKg));
  const isFetching = loadStatus === 'loading';
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const handleSave = async () => {
    setStatus('saving');
    const value = Number.parseFloat(weightKg);
    if (Number.isNaN(value)) {
      setStatus('error');
      return;
    }
    const result = await save(value);
    if (!result.ok) {
      setStatus('error');
      console.warn('Profile save failed.', result.status);
      return;
    }
    setStatus('saved');
  };

  return (
    <main className="min-h-screen pb-16">
      <PageHeader
        title="プロフィール"
        subtitle="Profile"
        maxWidth="4xl"
        action={
          <Link href="/admin" className={buttonClasses('outline')}>
            管理者メニューへ戻る
          </Link>
        }
      />

      <section className="mx-auto max-w-4xl px-6 pt-8">
        <Card className="p-6 md:p-8">
          {isFetching ? (
            <LoadingSpinner mode="fetching" />
          ) : (
            <>
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                体重 (kg)
                <input
                  type="number"
                  step="0.1"
                  value={weightKg}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="例: 65.5"
                  className="mt-3 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold"
                />
              </label>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-bold text-gray-400">
                  {status === 'saved'
                    ? '保存しました。'
                    : status === 'error'
                      ? '数値を入力してください。'
                      : '1日の消費カロリー計算に使用します。'}
                </p>
                <button
                  type="button"
                  onClick={handleSave}
                  className={`${buttonClasses('primary')} flex items-center gap-2 rounded-2xl px-6 py-3 text-sm`}
                  disabled={status === 'saving'}
                >
                  {status === 'saving' ? (
                    <LoadingSpinner mode="saving" variant="inline" className="text-white" />
                  ) : (
                    <>
                      <Save size={16} />
                      保存
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </Card>
      </section>
    </main>
  );
}
