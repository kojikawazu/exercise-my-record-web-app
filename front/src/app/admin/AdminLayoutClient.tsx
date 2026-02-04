'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  getBypassFlag,
  isBypassAllowed,
  setBypassSession,
  useAdminSession,
} from '@/hooks/useAdminSession';

export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAdmin, isLoading, isBypass } = useAdminSession();
  const bypassParam = searchParams.get('bypass') === '1';
  const hasBypass = isBypass || (isBypassAllowed && getBypassFlag()) || bypassParam;

  const isLoginRoute = pathname.startsWith('/admin/login');

  useEffect(() => {
    if (bypassParam) {
      setBypassSession(true);
      router.replace(pathname);
    }
  }, [bypassParam, pathname, router]);

  useEffect(() => {
    if (isLoginRoute || isLoading || hasBypass) return;
    if (!isAdmin) {
      router.replace('/admin/login');
    }
  }, [isAdmin, isLoading, isLoginRoute, hasBypass, router]);

  if (isLoginRoute) return <>{children}</>;
  if (hasBypass) return <>{children}</>;
  if (isLoading || !isAdmin) return null;

  return <>{children}</>;
}
