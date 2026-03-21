'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, Plus } from 'lucide-react';
import Card from '@/components/ui/Card';
import PageHeader from '@/components/ui/PageHeader';
import { buttonClasses } from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import CalorieEstimate from '@/components/CalorieEstimate';
import { useAdminSession } from '@/hooks/useAdminSession';

type CardioSummary = { type: string; minutes: number; distance: number };

export type RecordSummary = {
  date: string;
  totalSets: number;
  cardioMinutes: number;
  cardioDistance: number;
  cardios: CardioSummary[];
};

export default function RecordsListClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [records, setRecords] = useState<RecordSummary[]>([]);
  const [hasFetched, setHasFetched] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { isAdmin } = useAdminSession();

  const currentPage = Number(searchParams.get('page') ?? 1) || 1;

  const fetchRecords = useCallback(async (p: number) => {
    setHasFetched(false);
    try {
      const res = await fetch(`/api/records?page=${p}`);
      if (!res.ok) {
        setErrorMessage('記録の取得に失敗しました。');
        setRecords([]);
        setHasFetched(true);
        return;
      }
      const data = (await res.json()) as {
        records: RecordSummary[];
        page: number;
        totalPages: number;
      };
      setErrorMessage('');
      setRecords(data.records);
      setPage(data.page);
      setTotalPages(data.totalPages);
      setHasFetched(true);

      // Correct URL if API clamped the page
      if (data.page !== p) {
        router.replace(data.page === 1 ? '/' : `/?page=${data.page}`);
      }
    } catch {
      setErrorMessage('記録の取得に失敗しました。');
      setRecords([]);
      setHasFetched(true);
    }
  }, [router]);

  useEffect(() => {
    void fetchRecords(currentPage);
  }, [currentPage, fetchRecords]);

  const goToPage = (p: number) => {
    window.scrollTo({ top: 0 });
    router.push(p === 1 ? '/' : `/?page=${p}`);
  };

  return (
    <main className="min-h-screen pb-16">
      <PageHeader
        title="記録一覧"
        subtitle="Training Dashboard"
        action={
          isAdmin ? (
            <Link href="/admin" className={buttonClasses('outline')}>
              管理者メニュー
            </Link>
          ) : (
            <Link href="/admin/login" className={buttonClasses('outline')}>
              管理者ログイン
            </Link>
          )
        }
      />

      <section className="mx-auto max-w-5xl px-6 pt-8">
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
          <span className="rounded-full bg-white px-3 py-1 font-bold">合計セット数</span>
          <span className="rounded-full bg-white px-3 py-1 font-bold">有酸素合計時間</span>
          <span className="rounded-full bg-white px-3 py-1 font-bold">有酸素合計距離</span>
          {isAdmin ? (
            <Link href="/admin/records/new" className={`ml-auto ${buttonClasses('pink')}`}>
              <Plus size={16} />
              記録追加
            </Link>
          ) : null}
        </div>

        <div className="mt-8 grid gap-6">
          {errorMessage ? (
            <Card className="p-6 text-sm font-bold text-red-500">{errorMessage}</Card>
          ) : null}
          {!hasFetched ? (
            <Card className="p-10">
              <LoadingSpinner mode="fetching" />
            </Card>
          ) : null}
          {records.length === 0 && hasFetched ? (
            <Card className="p-10 text-center">
              <p className="text-lg font-bold text-gray-500">
                記録がありません。最初の記録を追加しましょう
              </p>
            </Card>
          ) : (
            records.map((record) => (
              <Card key={record.date} className="p-6 md:p-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-[color:var(--accent)]">
                      <CalendarDays size={22} />
                    </div>
                    <div>
                      <p className="text-lg font-black text-gray-900">{record.date}</p>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
                        Training Day
                      </p>
                    </div>
                  </div>
                  <Link href={`/records/${record.date}`} className={buttonClasses('outline')}>
                    詳細を見る
                  </Link>
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
                <div className="mt-4">
                  <CalorieEstimate
                    totalSets={record.totalSets}
                    cardios={(record.cardios ?? []).map((c) => ({
                      type: (c.type === 'ウォーク' ? 'ウォーク' : 'ラン') as import('@/lib/calorie').CardioType,
                      minutes: c.minutes,
                    }))}
                  />
                </div>
              </Card>
            ))
          )}

          {hasFetched && totalPages > 1 ? (
            <div className="mt-8 flex items-center justify-center gap-4">
              <button
                type="button"
                className={buttonClasses('outline')}
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
              >
                前へ
              </button>
              <span className="text-sm font-bold text-gray-600">
                {page} / {totalPages} ページ
              </span>
              <button
                type="button"
                className={buttonClasses('outline')}
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
              >
                次へ
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
