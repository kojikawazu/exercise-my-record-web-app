'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import Card from '@/components/ui/Card';
import PageHeader from '@/components/ui/PageHeader';
import { buttonClasses } from '@/components/ui/Button';

export type AdminRecordSummary = {
  date: string;
  totalSets: number;
  cardioMinutes: number;
  cardioDistance: number;
};

export default function AdminRecordsListClient() {
  const [records, setRecords] = useState<AdminRecordSummary[]>([]);
  const [deletingDate, setDeletingDate] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const res = await fetch('/api/records');
        if (!res.ok) {
          setError('記録の取得に失敗しました。');
          setRecords([]);
          setHasFetched(true);
          return;
        }
        const data = (await res.json()) as AdminRecordSummary[];
        setRecords(data);
        setHasFetched(true);
      } catch {
        setError('記録の取得に失敗しました。');
        setRecords([]);
        setHasFetched(true);
      }
    };

    void fetchRecords();
  }, []);

  const handleDelete = async (date: string) => {
    if (!confirm('この記録を削除しますか？')) return;
    setDeletingDate(date);
    setError('');
    const res = await fetch(`/api/records/${date}`, { method: 'DELETE' });
    if (!res.ok) {
      setError('削除に失敗しました。');
      setDeletingDate(null);
      return;
    }
    setRecords((prev) => prev.filter((record) => record.date !== date));
    setDeletingDate(null);
  };

  return (
    <main className="min-h-screen pb-16">
      <PageHeader
        title="記録一覧（管理）"
        subtitle="Admin records"
        action={
          <Link href="/admin" className={buttonClasses('outline')}>
            管理者メニューへ戻る
          </Link>
        }
      />

      <section className="mx-auto max-w-5xl px-6 pt-8">
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
          <span className="rounded-full bg-white px-3 py-1 font-bold">合計セット数</span>
          <span className="rounded-full bg-white px-3 py-1 font-bold">有酸素合計時間</span>
          <span className="rounded-full bg-white px-3 py-1 font-bold">有酸素合計距離</span>
          <Link href="/admin/records/new" className={`ml-auto ${buttonClasses('pink')}`}>
            <Plus size={16} />
            記録追加
          </Link>
        </div>

        <div className="mt-8 grid gap-6">
          {error ? <p className="text-sm font-bold text-red-500">{error}</p> : null}
          {records.length === 0 && hasFetched ? (
            <Card className="p-10 text-center">
              <p className="text-lg font-bold text-gray-500">
                記録がありません。最初の記録を追加しましょう
              </p>
            </Card>
          ) : null}
          {records.map((record) => (
            <Card key={record.date} className="p-6 md:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">日付</p>
                  <h2 className="text-2xl font-black text-gray-900">{record.date}</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/records/${record.date}`} className={buttonClasses('outline')}>
                    詳細を見る
                  </Link>
                  <Link
                    href={`/admin/records/${record.date}/edit`}
                    className="rounded-full border border-[#8a6f3c] px-4 py-2 text-sm font-bold text-[#8a6f3c] transition hover:bg-[#8a6f3c] hover:text-white"
                  >
                    編集
                  </Link>
                  <button
                    type="button"
                    className={buttonClasses('danger')}
                    onClick={() => handleDelete(record.date)}
                    disabled={deletingDate === record.date}
                  >
                    {deletingDate === record.date ? '削除中...' : '削除'}
                  </button>
                </div>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-gray-50 p-4 text-center">
                  <p className="text-[10px] font-black uppercase text-gray-400">合計セット数</p>
                  <p className="mt-2 text-2xl font-black text-[color:var(--accent)]">
                    {record.totalSets}セット
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4 text-center">
                  <p className="text-[10px] font-black uppercase text-gray-400">有酸素合計時間</p>
                  <p className="mt-2 text-2xl font-black text-[color:var(--accent)]">
                    {record.cardioMinutes}分
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4 text-center">
                  <p className="text-[10px] font-black uppercase text-gray-400">有酸素合計距離</p>
                  <p className="mt-2 text-2xl font-black text-[color:var(--accent)]">
                    {record.cardioDistance}km
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
