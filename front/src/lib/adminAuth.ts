import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? '';

const isE2eBypass =
  process.env.NODE_ENV !== 'production' &&
  process.env.E2E_BYPASS === '1';

/** 管理者認証の結果。未認可時は呼び出し側がそのまま返せる `response` を同梱する。 */
type AuthResult =
  | { authorized: true }
  | { authorized: false; response: NextResponse };

/**
 * 書き込み系 API の管理者認証ガード（防御の第 1 層）。
 *
 * `Authorization: Bearer <token>` を Supabase で検証し、ユーザーのメールが `ADMIN_EMAIL`
 * と一致する場合のみ認可する。非本番かつ `E2E_BYPASS=1` のときは検証を丸ごとバイパスする。
 * 未認可時はステータス付きの `NextResponse`（401=トークン無効/欠落・403=管理者以外・
 * 500=認証設定不備）を `response` に格納して返す。
 *
 * @param request - 検証対象のリクエスト（`Authorization` ヘッダーを参照）
 * @returns 認可可否。`authorized: false` の場合は返却用の `response` を含む
 */
export async function requireAdmin(request: Request): Promise<AuthResult> {
  if (isE2eBypass) {
    return { authorized: true };
  }

  if (!supabaseUrl || !supabaseAnonKey || !adminEmail) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'admin auth is not configured' },
        { status: 500 },
      ),
    };
  }

  const authHeader = request.headers.get('authorization');
  const bearer = authHeader?.match(/^Bearer\s+(.+)$/i);
  const accessToken = bearer?.[1];

  if (!accessToken) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }),
    };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }),
    };
  }

  const userEmail = data.user.email?.trim().toLowerCase() ?? '';
  if (userEmail === '' || userEmail !== adminEmail) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'forbidden' }, { status: 403 }),
    };
  }

  return { authorized: true };
}
