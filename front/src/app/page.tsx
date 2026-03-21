import { Suspense } from 'react';
import RecordsListClient from '@/components/RecordsListClient';

export default function HomePage() {
  return (
    <Suspense>
      <RecordsListClient />
    </Suspense>
  );
}
