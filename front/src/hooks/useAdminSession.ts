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

/** E2E 用の認証バイパスを許可するか。非本番環境でのみ `true`（本番は常に無効）。 */
export const isBypassAllowed = process.env.NODE_ENV !== 'production';

/**
 * localStorage に保存された E2E バイパスフラグの有無を返す。
 *
 * バイパス非許可環境（本番）・サーバー側（`window` 不在）では常に `false`。
 *
 * @returns バイパスが有効なら `true`
 */
export function getBypassFlag() {
  if (!isBypassAllowed || typeof window === 'undefined') return false;
  return localStorage.getItem(BYPASS_KEY) === '1';
}

/**
 * E2E バイパスフラグを localStorage に設定・解除する。
 *
 * バイパス非許可環境（本番）では何もしない。
 *
 * @param enabled - `true` でバイパスを有効化、`false` で解除
 */
export function setBypassSession(enabled: boolean) {
  if (!isBypassAllowed) return;
  if (enabled) {
    localStorage.setItem(BYPASS_KEY, '1');
  } else {
    localStorage.removeItem(BYPASS_KEY);
  }
}

/**
 * 管理者ログイン状態を購読するフック。
 *
 * Supabase セッションを監視し、`/api/admin/me` で管理者判定を行う。非本番では localStorage の
 * E2E バイパスフラグも加味する。認証状態の変化（ログイン/ログアウト）に追従し、古い非同期結果で
 * 状態を上書きしないよう最新リクエストのみ反映する。
 *
 * @returns `isAdmin`（管理者か）/ `isLoading`（判定中か）/ `isBypass`（バイパス経由の管理者か）
 */
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
