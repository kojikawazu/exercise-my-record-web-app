'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import Card from '@/components/ui/Card';
import PageHeader from '@/components/ui/PageHeader';
import { buttonClasses } from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import RecordMenuList from '@/components/RecordMenuList';
import { useRecordList } from '@/hooks/useRecordList';
import { useRecordMutations } from '@/hooks/useRecordMutations';
import { recordEditHref } from '@/lib/recordEditNavigation';

/**
 * 管理者向けの記録一覧クライアント。ページング付きで記録を表示し、削除・編集への導線を提供する。
 *
 * URL の `page` クエリを唯一の真実としてページ状態を同期し、削除後は現在ページを再取得する。
 * 再取得結果が空かつ 2 ページ目以降なら前ページへ戻る。API がページ番号をクランプした場合は
 * URL を補正する。
 */
export default function AdminRecordsListClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [deletingDate, setDeletingDate] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const currentPage = Number(searchParams.get('page') ?? 1) || 1;
  const { records, page, totalPages, hasFetched, hasError, refetch } = useRecordList(currentPage);
  const { remove } = useRecordMutations();
  const error = deleteError || (hasError ? '記録の取得に失敗しました。' : '');

  useEffect(() => {
    // API がページ番号を丸めた（範囲外の page を要求した）場合は URL を補正する
    if (hasFetched && !hasError && page !== currentPage) {
      router.replace(`/admin/records?page=${page}`);
    }
  }, [hasFetched, hasError, page, currentPage, router]);

  const goToPage = (p: number) => {
    window.scrollTo({ top: 0 });
    router.push(`/admin/records?page=${p}`);
  };

  const handleDelete = async (date: string) => {
    if (!confirm('この記録を削除しますか？')) return;
    setDeletingDate(date);
    setDeleteError('');
    const result = await remove(date);
    setDeletingDate(null);
    if (!result.ok) {
      setDeleteError('削除に失敗しました。');
      return;
    }
    // 現在ページを再取得し、空になった 2 ページ目以降なら前ページへ戻る
    const data = await refetch();
    if (data && data.records.length === 0 && data.page > 1) {
      goToPage(data.page - 1);
    }
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
          <Link href="/admin/records/new" className={`ml-auto ${buttonClasses('pink')}`}>
            <Plus size={16} />
            記録追加
          </Link>
        </div>

        <div className="mt-8 grid gap-6">
          {error ? <p className="text-sm font-bold text-red-500">{error}</p> : null}
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
          ) : null}
          {records.length > 0 &&
            records.map((record) => (
              <Card key={record.date} className="p-6 md:p-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                      日付
                    </p>
                    <h2 className="text-2xl font-black text-gray-900">{record.date}</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/records/${record.date}`} className={buttonClasses('outline')}>
                      詳細を見る
                    </Link>
                    <Link
                      href={recordEditHref(record.date)}
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
                      {deletingDate === record.date ? (
                        <LoadingSpinner mode="deleting" variant="inline" className="text-inherit" />
                      ) : (
                        '削除'
                      )}
                    </button>
                  </div>
                </div>
                <RecordMenuList workouts={record.workouts} cardios={record.cardios} />
              </Card>
            ))}

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
