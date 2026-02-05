'use client';

import { useEffect, useState } from 'react';
import { LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import PageHeader from '@/components/ui/PageHeader';
import { buttonClasses } from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { isBypassAllowed, setBypassSession, useAdminSession } from '@/hooks/useAdminSession';

export default function AdminLoginPage() {
  const router = useRouter();
  const { isAdmin, isLoading } = useAdminSession();
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isLoading) return;
    if (isAdmin) {
      router.replace('/admin');
    }
  }, [isAdmin, isLoading, router]);

  const handleLogin = async () => {
    setIsWorking(true);
    setError('');
    const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/admin/login`;

    const { error: loginError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });

    if (loginError) {
      setError('ログインに失敗しました。再度お試しください。');
      setIsWorking(false);
    }
  };

  const handleBypassLogin = () => {
    setBypassSession(true);
    router.replace('/admin?bypass=1');
  };

  if (isLoading) {
    return (
      <main className="min-h-screen pb-16">
        <PageHeader title="管理者ログイン" subtitle="Admin login" maxWidth="xl" />
        <section className="mx-auto max-w-xl px-6 pt-8">
          <Card className="p-8">
            <LoadingSpinner mode="fetching" />
          </Card>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-16">
      <PageHeader title="管理者ログイン" subtitle="Admin login" maxWidth="xl" />

      <section className="mx-auto max-w-xl px-6 pt-8">
        <Card className="p-8 text-center">
          <p className="text-sm font-bold text-gray-500">
            Google アカウントでログインしてください
          </p>
          <button
            type="button"
            className={`mt-6 ${buttonClasses('primary')} flex items-center gap-2 rounded-2xl px-6 py-3 text-sm`}
            onClick={handleLogin}
            disabled={isWorking}
          >
            {isWorking ? (
              <LoadingSpinner mode="auth" variant="inline" className="text-white" />
            ) : (
              <>
                <LogIn size={16} />
                Googleでログイン
              </>
            )}
          </button>
          {error ? <p className="mt-4 text-sm font-bold text-red-500">{error}</p> : null}
          {isBypassAllowed ? (
            <button
              type="button"
              className={`mt-4 ${buttonClasses('outline')} w-full`}
              onClick={handleBypassLogin}
            >
              テストログイン
            </button>
          ) : null}
        </Card>
      </section>
    </main>
  );
}
