// 全レスポンスに付与するセキュリティヘッダーの定義（#122）。next.config.ts の `headers()` から使う。
// ディレクティブごとの採否の理由は docs/06-security-specification.md「セキュリティヘッダー」を参照。

/** レスポンスに付与するヘッダー 1 件（Next.js の `headers()` が受け取る形）。 */
type SecurityHeader = {
  /** ヘッダー名 */
  key: string;
  /** ヘッダー値 */
  value: string;
};

/** {@link buildSecurityHeaders} の入力。 */
type SecurityHeaderOptions = {
  /**
   * Supabase の URL（`NEXT_PUBLIC_SUPABASE_URL`）。オリジンに正規化して `connect-src` に加える。
   * 未設定・URL として不正・http(s) 以外の場合は加えない（Supabase への通信はブロックされる側に倒れる）。
   */
  supabaseUrl: string | undefined;
  /**
   * `next dev` で動いているか。`true` のときだけ `script-src` に `'unsafe-eval'` を加える
   * （開発モードの React / Turbopack が `eval` を使うため。本番ビルドでは不要）。
   */
  isDev: boolean;
};

/** Supabase の URL として受け付けるスキーム。 */
const ALLOWED_SUPABASE_PROTOCOLS: readonly string[] = ['http:', 'https:'];

/**
 * Supabase の URL をオリジン（`scheme://host:port`）に正規化する。
 * パスや末尾スラッシュを含んだ値をそのまま CSP に入れると、ソース式としての意味が変わるため。
 *
 * @param url - `NEXT_PUBLIC_SUPABASE_URL` の値
 * @returns オリジン。未設定・不正・http(s) 以外なら `null`
 */
function toSupabaseOrigin(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return ALLOWED_SUPABASE_PROTOCOLS.includes(parsed.protocol) ? parsed.origin : null;
  } catch {
    return null;
  }
}

/**
 * Content-Security-Policy の値を組み立てる。
 *
 * `script-src` / `style-src` の `'unsafe-inline'` は、Next.js のハイドレーション用インラインスクリプトと
 * インラインスタイルのため。nonce 化は middleware の新設を伴うため見送っている。
 *
 * @param options - 組み立ての入力
 * @returns `; ` 区切りの CSP 文字列
 */
function buildContentSecurityPolicy(options: SecurityHeaderOptions): string {
  const { supabaseUrl, isDev } = options;
  const supabaseOrigin = toSupabaseOrigin(supabaseUrl);
  const scriptSrc = ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])];
  const connectSrc = ["'self'", ...(supabaseOrigin ? [supabaseOrigin] : [])];
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src ${scriptSrc.join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    // 外部画像を表示する機能は無いため https: は許可しない。
    "img-src 'self' data: blob:",
    `connect-src ${connectSrc.join(' ')}`,
  ].join('; ');
}

/**
 * 全レスポンスに付与するセキュリティヘッダーを組み立てる。
 *
 * @param options - 組み立ての入力（Supabase の URL と、`next dev` かどうか）
 * @returns `next.config.ts` の `headers()` にそのまま渡せるヘッダー配列
 */
export function buildSecurityHeaders(options: SecurityHeaderOptions): SecurityHeader[] {
  return [
    { key: 'Content-Security-Policy', value: buildContentSecurityPolicy(options) },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  ];
}
