'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

const BYPASS_KEY = 'e2e_admin_bypass';

type AdminSessionState = {
  isAdmin: boolean;
  isLoading: boolean;
  isBypass: boolean;
};

export const isBypassAllowed = process.env.NODE_ENV !== 'production';

export function getBypassFlag() {
  if (!isBypassAllowed || typeof window === 'undefined') return false;
  return localStorage.getItem(BYPASS_KEY) === '1';
}

export function setBypassSession(enabled: boolean) {
  if (!isBypassAllowed) return;
  if (enabled) {
    localStorage.setItem(BYPASS_KEY, '1');
  } else {
    localStorage.removeItem(BYPASS_KEY);
  }
}

export function useAdminSession(): AdminSessionState {
  const [sessionActive, setSessionActive] = useState(false);
  const [bypassActive, setBypassActive] = useState(() => getBypassFlag());
  const [ready, setReady] = useState(() => getBypassFlag());

  useEffect(() => {
    let mounted = true;
    let requestId = 0;

    if (isBypassAllowed) {
      setBypassActive(getBypassFlag());
    }

    const syncAdminFromSession = async (session: Session | null) => {
      const currentRequestId = ++requestId;

      if (!session?.access_token) {
        if (!mounted || currentRequestId !== requestId) return;
        setSessionActive(false);
        setReady(true);
        return;
      }

      try {
        const response = await fetch('/api/admin/me', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: 'no-store',
        });

        if (!mounted || currentRequestId !== requestId) return;
        if (!response.ok) {
          setSessionActive(false);
          setReady(true);
          return;
        }

        const data = (await response.json().catch(() => null)) as { isAdmin?: boolean } | null;
        setSessionActive(Boolean(data?.isAdmin));
      } catch {
        if (!mounted || currentRequestId !== requestId) return;
        setSessionActive(false);
      } finally {
        if (!mounted || currentRequestId !== requestId) return;
        setReady(true);
      }
    };

    const syncSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setReady(false);
      await syncAdminFromSession(data.session);
    };

    void syncSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setReady(false);
      void syncAdminFromSession(session);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const isAdmin = useMemo(
    () => sessionActive || (isBypassAllowed && bypassActive),
    [sessionActive, bypassActive],
  );

  return {
    isAdmin,
    isBypass: isBypassAllowed && bypassActive,
    isLoading: !ready && !(isBypassAllowed && bypassActive),
  };
}
