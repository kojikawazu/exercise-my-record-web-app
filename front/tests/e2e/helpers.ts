import type { Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// DatePicker 操作ヘルパー
// ---------------------------------------------------------------------------

/**
 * カスタム DatePicker コンポーネントで日付を選択する。
 * @param page Playwright の Page
 * @param dateStr "YYYY-MM-DD" 形式の日付文字列
 */
export const selectDate = async (page: Page, dateStr: string) => {
  const [year, month, day] = dateStr.split('-').map(Number);

  // トリガーボタンをクリック（"Year jump" テキストで DatePicker を特定）
  await page.getByRole('button', { name: /year jump/i }).click();

  // ポップアップ内の年セレクト（値は年の数字）
  const popup = page.locator('.absolute.top-full');
  await popup.locator('select').nth(0).selectOption(String(year));

  // ポップアップ内の月セレクト（値は 0-indexed）
  await popup.locator('select').nth(1).selectOption(String(month - 1));

  // 日付ボタンをクリック（exact マッチで数字のみのボタンを選ぶ）
  await popup.getByRole('button', { name: String(day), exact: true }).first().click();
};

// ---------------------------------------------------------------------------
// 管理者セッション注入
// ---------------------------------------------------------------------------

/**
 * Supabase v2 の偽セッションを localStorage に注入し、
 * /api/admin/me をモックして isAdmin=true にする。
 * isBypassAllowed (NEXT_PUBLIC_E2E_BYPASS) に依存しない。
 */
export const injectAdminSession = async (page: Page) => {
  // Supabase v2 のセッションキー: sb-{hostname}-auth-token
  const storageKey = 'sb-dummy.supabase.co-auth-token';

  await page.addInitScript((key: string) => {
    const fakeSession = {
      access_token: 'fake-e2e-access-token',
      expires_at: Math.floor(Date.now() / 1000) + 7200,
      expires_in: 7200,
      refresh_token: 'fake-e2e-refresh-token',
      token_type: 'bearer',
      user: {
        id: 'fake-e2e-user-id',
        aud: 'authenticated',
        email: 'admin@example.com',
        role: 'authenticated',
      },
    };
    localStorage.setItem(key, JSON.stringify(fakeSession));
    localStorage.setItem('e2e_admin_bypass', '1');
  }, storageKey);

  // /api/admin/me をモック → isAdmin: true
  await page.route('**/api/admin/me**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ isAdmin: true }),
    }),
  );

  // Supabase auth API をモックしてリフレッシュ試行を即時解決
  await page.route('**/auth/v1/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'fake-e2e-access-token',
        expires_in: 7200,
        refresh_token: 'fake-e2e-refresh-token',
        token_type: 'bearer',
        user: { id: 'fake-e2e-user-id', email: 'admin@example.com' },
      }),
    }),
  );
};

// ---------------------------------------------------------------------------
// フィクスチャ
// ---------------------------------------------------------------------------

export type RecordSummary = {
  date: string;
  totalSets: number;
  cardioMinutes: number;
  cardioDistance: number;
  cardios: { type: string; minutes: number; distance: number }[];
};

export type RecordDetail = {
  date: string;
  memo: string | null;
  workouts: { id: string; part: string; name: string; sets: number; reps: number; weight: number }[];
  cardios: { type: string; minutes: number; distance: number }[];
};

export const recordsFixture: RecordSummary[] = [
  {
    date: '2026-02-02',
    totalSets: 9,
    cardioMinutes: 30,
    cardioDistance: 5,
    cardios: [{ type: 'ラン', minutes: 30, distance: 5 }],
  },
  {
    date: '2026-01-15',
    totalSets: 6,
    cardioMinutes: 0,
    cardioDistance: 0,
    cardios: [],
  },
];

export const recordDetailFixture: RecordDetail = {
  date: '2026-02-02',
  memo: '体調良好',
  workouts: [
    { id: 'w1', part: '胸', name: 'ベンチプレス', sets: 3, reps: 10, weight: 60 },
    { id: 'w2', part: '背中', name: 'デッドリフト', sets: 3, reps: 5, weight: 100 },
    { id: 'w3', part: '脚', name: 'スクワット', sets: 3, reps: 8, weight: 80 },
  ],
  cardios: [{ type: 'ラン', minutes: 30, distance: 5 }],
};

// ---------------------------------------------------------------------------
// API ルートモック
// ---------------------------------------------------------------------------

/** GET /api/records をモック */
export const mockRecordsListApi = async (
  page: Page,
  records: RecordSummary[] = recordsFixture,
  overrides: { totalCount?: number; page?: number; totalPages?: number } = {},
) => {
  await page.route('**/api/records*', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    const totalCount = overrides.totalCount ?? records.length;
    const totalPages = overrides.totalPages ?? Math.max(1, Math.ceil(totalCount / 10));
    const currentPage = overrides.page ?? 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ records, totalCount, page: currentPage, totalPages }),
    });
  });
};

/** GET /api/records/[date] をモック */
export const mockRecordDetailApi = async (
  page: Page,
  detail: RecordDetail | null = recordDetailFixture,
) => {
  await page.route('**/api/records/**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    if (!detail) {
      await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'not found' }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(detail) });
  });
};

/** POST /api/records をモック */
export const mockRecordCreateApi = async (
  page: Page,
  response: { status?: number; body?: object } = {},
) => {
  await page.route('**/api/records', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }
    const status = response.status ?? 200;
    const body = response.body ?? { id: 'new-rec-1' };
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
};

/** PATCH /api/records/[date] をモック */
export const mockRecordUpdateApi = async (
  page: Page,
  response: { status?: number; body?: object } = {},
) => {
  await page.route('**/api/records/**', async (route) => {
    if (route.request().method() !== 'PATCH') {
      await route.fallback();
      return;
    }
    const status = response.status ?? 200;
    const body = response.body ?? { id: 'rec-1' };
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
};

/** DELETE /api/records/[date] をモック */
export const mockRecordDeleteApi = async (
  page: Page,
  response: { status?: number; body?: object } = {},
) => {
  await page.route('**/api/records/**', async (route) => {
    if (route.request().method() !== 'DELETE') {
      await route.fallback();
      return;
    }
    const status = response.status ?? 200;
    const body = response.body ?? { ok: true };
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
};
