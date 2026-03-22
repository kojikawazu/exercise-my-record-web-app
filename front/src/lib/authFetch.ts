import { supabase } from '@/lib/supabase';

export async function authFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(options.headers);

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(url, { ...options, headers });
}
