import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? '';

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
