import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? '';

/**
 * 現在のリクエストユーザーが管理者かどうかを判定する（フロントの認証状態確認用）。
 *
 * 認証は任意で、`Authorization: Bearer <token>` があれば Supabase で検証し、
 * ユーザーのメールが `ADMIN_EMAIL` と一致するかを返す。トークン欠落・無効時は
 * 401、管理者以外は 403、いずれも本文は `{ isAdmin: false }`。認証設定不備時は 500。
 *
 * @param request - リクエスト。`Authorization` ヘッダーの Bearer トークンを参照する（任意）
 * @returns 200: `{ isAdmin: true }`。401: トークン欠落/無効（`{ isAdmin: false }`）。403: 管理者以外（`{ isAdmin: false }`）。500: 認証設定不備
 */
export async function GET(request: Request) {
  if (!supabaseUrl || !supabaseAnonKey || !adminEmail) {
    return NextResponse.json({ error: 'admin auth is not configured' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  const bearer = authHeader?.match(/^Bearer\s+(.+)$/i);
  const accessToken = bearer?.[1];

  if (!accessToken) {
    return NextResponse.json({ isAdmin: false }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    return NextResponse.json({ isAdmin: false }, { status: 401 });
  }

  const userEmail = data.user.email?.trim().toLowerCase() ?? '';
  const isAdmin = userEmail !== '' && userEmail === adminEmail;

  if (!isAdmin) {
    return NextResponse.json({ isAdmin: false }, { status: 403 });
  }

  return NextResponse.json({ isAdmin: true });
}
