import { Suspense } from 'react';
import AdminRecordsListClient from '@/components/AdminRecordsListClient';

export default function AdminRecordsPage() {
  return (
    <Suspense>
      <AdminRecordsListClient />
    </Suspense>
  );
}
