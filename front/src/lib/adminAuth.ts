import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? '';

const isE2eBypass =
  process.env.NODE_ENV !== 'production' &&
  process.env.E2E_BYPASS === '1';

type AuthResult =
  | { authorized: true }
  | { authorized: false; response: NextResponse };

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
