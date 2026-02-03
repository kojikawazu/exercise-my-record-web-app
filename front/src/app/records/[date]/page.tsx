import type { Metadata } from 'next';
import RecordDetailClient from '@/components/RecordDetailClient';

type PageProps = {
  params: Promise<{ date: string }>;
};

export const metadata: Metadata = {
  title: '記録詳細',
};

export default async function RecordDetailPage({ params }: PageProps) {
  const { date } = await params;
  return <RecordDetailClient date={date} />;
}
