'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

const BYPASS_KEY = 'e2e_admin_bypass';

type AdminSessionState = {
  isAdmin: boolean;
  isLoading: boolean;
  isBypass: boolean;
};

export const isBypassAllowed =
  process.env.NODE_ENV !== 'production' &&
  process.env.NEXT_PUBLIC_E2E_BYPASS === '1';

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

    if (isBypassAllowed) {
      setBypassActive(getBypassFlag());
    }

    const syncSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSessionActive(Boolean(data.session));
      setReady(true);
    };

    void syncSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSessionActive(Boolean(session));
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
