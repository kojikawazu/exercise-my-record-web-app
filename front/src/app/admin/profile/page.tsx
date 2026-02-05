'use client';

import { Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import PageHeader from '@/components/ui/PageHeader';
import { buttonClasses } from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Link from 'next/link';

export default function AdminProfilePage() {
  const [weightKg, setWeightKg] = useState('');
  const [isFetching, setIsFetching] = useState(true);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    const fetchWeight = async () => {
      try {
        const res = await fetch('/api/profile');
        if (!res.ok) return;
        const data = (await res.json()) as { weightKg: number | null };
        if (typeof data.weightKg === 'number') {
          setWeightKg(String(data.weightKg));
        }
      } finally {
        setIsFetching(false);
      }
    };

    void fetchWeight();
  }, []);

  const handleSave = async () => {
    setStatus('saving');
    const value = Number.parseFloat(weightKg);
    if (Number.isNaN(value)) {
      setStatus('error');
      return;
    }
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weightKg: value }),
      });

      if (!res.ok) {
        setStatus('error');
        console.warn('Profile save failed.', res.status);
        return;
      }
      setStatus('saved');
    } catch (error) {
      setStatus('error');
      console.warn('Profile save failed.', error);
    }
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
                  onChange={(event) => setWeightKg(event.target.value)}
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
