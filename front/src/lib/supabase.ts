import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * ブラウザ・クライアント側で共有する Supabase クライアント（匿名キーで初期化）。
 *
 * 認証（Google OAuth のセッション取得・監視）に用いる。URL / 匿名キーは公開用の
 * `NEXT_PUBLIC_*` 環境変数から読み込む。
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
