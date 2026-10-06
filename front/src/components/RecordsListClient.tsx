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
import Dashboard from '@/components/Dashboard';
import CalorieEstimate from '@/components/CalorieEstimate';
import { useAdminSession } from '@/hooks/useAdminSession';
import { useRecordList } from '@/hooks/useRecordList';
import { toCalorieCardioType } from '@/lib/calorie';

/**
 * トップページ（一般ユーザー向け）。1 ページ目はダッシュボード（今週のサマリーと連続記録日数・
 * 今月のヒートマップ・最新の記録）を上部に表示し（#27 / #28）、その下にページング付きの記録一覧と推定カロリーを表示する。
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
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
          {isAdmin ? (
            <Link href="/admin/records/new" className={`ml-auto ${buttonClasses('cta')}`}>
              <Plus size={16} />
              記録追加
            </Link>
          ) : null}
        </div>

        {/* ダッシュボードは「今」を見るためのもので、1 ページ目にだけ出す（#27） */}
        {currentPage === 1 ? (
          <Dashboard latestRecord={hasFetched && page === 1 ? (records[0] ?? null) : null} />
        ) : null}

        <div className="mt-8 grid gap-6" role="region" aria-label="記録一覧">
          {errorMessage ? (
            <Card className="p-6 text-sm font-bold text-danger">{errorMessage}</Card>
          ) : null}
          {!hasFetched ? (
            <Card className="p-10">
              <LoadingSpinner mode="fetching" />
            </Card>
          ) : null}
          {records.length === 0 && hasFetched ? (
            <Card className="p-10 text-center">
              <p className="text-lg font-bold text-muted">
                記録がありません。最初の記録を追加しましょう
              </p>
            </Card>
          ) : (
            records.map((record) => (
              <Card key={record.date} className="p-6 md:p-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                      <CalendarDays size={22} />
                    </div>
                    <div>
                      <p className="text-lg font-black text-foreground">{record.date}</p>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-subtle">
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
              <span className="text-sm font-bold text-muted">
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
