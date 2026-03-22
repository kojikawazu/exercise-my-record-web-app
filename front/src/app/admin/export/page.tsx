'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Download } from 'lucide-react';
import Card from '@/components/ui/Card';
import PageHeader from '@/components/ui/PageHeader';
import { buttonClasses } from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import DatePicker from '@/components/DatePicker';
import { authFetch } from '@/lib/authFetch';

export default function AdminExportPage() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [status, setStatus] = useState<'idle' | 'loading'>('idle');
  const [message, setMessage] = useState('');

  const handleExport = async () => {
    if (!fromDate || !toDate) {
      setMessage('期間を選択してください。');
      return;
    }
    setStatus('loading');
    setMessage('');
    const res = await authFetch(
      `/api/admin/export?from=${fromDate}&to=${toDate}&format=${format}`,
    );
    if (!res.ok) {
      setStatus('idle');
      setMessage('エクスポートに失敗しました。');
      return;
    }

    if (format === 'json') {
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `records_${fromDate}_${toDate}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `records_${fromDate}_${toDate}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }

    setStatus('idle');
    setMessage('エクスポートを開始しました。');
  };

  return (
    <main className="min-h-screen pb-16">
      <PageHeader
        title="データ出力"
        subtitle="Export"
        maxWidth="4xl"
        action={
          <Link href="/admin" className={buttonClasses('outline')}>
            戻る
          </Link>
        }
      />

      <section className="mx-auto max-w-4xl px-6 pt-8">
        <Card className="p-6 md:p-8">
          <div className="grid gap-6 md:grid-cols-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
              開始日
              <div className="mt-2">
                <DatePicker value={fromDate} onChange={setFromDate} />
              </div>
            </label>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
              終了日
              <div className="mt-2">
                <DatePicker value={toDate} onChange={setToDate} />
              </div>
            </label>
          </div>

          <div className="mt-6">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">形式</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {(
                [
                  { label: 'CSV', value: 'csv' },
                  { label: 'JSON', value: 'json' },
                ] as const
              ).map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-bold"
                >
                  <input
                    type="radio"
                    name="format"
                    value={option.value}
                    checked={format === option.value}
                    onChange={() => setFormat(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>
        </Card>

        {message ? (
          <p className="mt-4 text-sm font-bold text-gray-500">{message}</p>
        ) : null}

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            className={`${buttonClasses('primary')} flex items-center gap-2 rounded-2xl px-6 py-3 text-sm`}
            onClick={handleExport}
            disabled={status === 'loading'}
          >
            {status === 'loading' ? (
              <LoadingSpinner mode="exporting" variant="inline" className="text-white" />
            ) : (
              <>
                <Download size={16} />
                エクスポート
              </>
            )}
          </button>
        </div>
      </section>
    </main>
  );
}
