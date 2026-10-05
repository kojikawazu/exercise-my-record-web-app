'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, Plus } from 'lucide-react';
import Card from '@/components/ui/Card';
import PageHeader from '@/components/ui/PageHeader';
import { buttonClasses } from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import RecordMenuList from '@/components/RecordMenuList';
import CalorieEstimate from '@/components/CalorieEstimate';
import { useAdminSession } from '@/hooks/useAdminSession';
import { useRecordList } from '@/hooks/useRecordList';
import { toCalorieCardioType } from '@/lib/calorie';

/**
 * 一般ユーザー向けの記録一覧クライアント。ページング付きで記録と推定カロリーを表示する。
 *
 * URL の `page` クエリを唯一の真実としてページ状態を同期し、API がページ番号をクランプした
 * 場合は URL を補正する。管理者（{@link useAdminSession}）には管理者メニューと記録追加への
 * 導線を追加表示する。
 */
export default function RecordsListClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAdmin } = useAdminSession();

  const currentPage = Number(searchParams.get('page') ?? 1) || 1;
  const { records, page, totalPages, hasFetched, hasError } = useRecordList(currentPage);
  const errorMessage = hasError ? '記録の取得に失敗しました。' : '';

  useEffect(() => {
    // API がページ番号を丸めた（範囲外の page を要求した）場合は URL を補正する
    if (hasFetched && !hasError && page !== currentPage) {
      router.replace(page === 1 ? '/' : `/?page=${page}`);
    }
  }, [hasFetched, hasError, page, currentPage, router]);

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
                <RecordMenuList workouts={record.workouts} cardios={record.cardios} />
                <div className="mt-4">
                  <CalorieEstimate
                    totalSets={record.totalSets}
                    cardios={record.cardios.map((c) => ({
                      type: toCalorieCardioType(c.type),
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
