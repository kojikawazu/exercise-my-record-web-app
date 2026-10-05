import { expect, test } from '@playwright/test';
import { injectAdminSession, resetDb, resetAndSeedBaseline, seedRecordsForDates } from './helpers';

// 実 DB（docker-compose.e2e.yml）に seed したデータで主要画面の描画を検証する。

test.beforeEach(async () => {
  await resetAndSeedBaseline();
});

test('list page renders seeded records and core elements', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '記録一覧' })).toBeVisible();
  await expect(page.getByRole('link', { name: '管理者ログイン' })).toBeVisible();
  await expect(page.getByRole('link', { name: '詳細を見る' }).first()).toBeVisible();
  // seed した 2 レコードの日付が一覧に表示される（最新はダッシュボードにも出るため一覧の範囲で確認する）。
  const list = page.getByRole('region', { name: '記録一覧' });
  await expect(list.getByText('2026-02-02')).toBeVisible();
  await expect(list.getByText('2026-01-15')).toBeVisible();
  await expect(page.getByText('筋トレメニュー').first()).toBeVisible();
  await expect(page.getByText('有酸素メニュー').first()).toBeVisible();
  await expect(page.getByText('推定消費カロリー').first()).toBeVisible();
});

test('list page shows pagination when more than one page exists', async ({ page }) => {
  // ベースラインを消し、15 レコード（2 ページ）を作る。
  await resetDb();
  await seedRecordsForDates(
    Array.from({ length: 15 }, (_, i) => `2026-05-${String(i + 1).padStart(2, '0')}`),
  );

  await page.goto('/');
  await expect(page.getByRole('button', { name: '前へ' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '次へ' })).toBeEnabled();
});

test('detail page renders sections from seeded data', async ({ page }) => {
  await page.goto('/records/2026-02-02');
  await expect(page.getByRole('heading', { name: '記録詳細' })).toBeVisible();
  await expect(page.getByText('推定消費カロリー')).toBeVisible();
  await expect(page.getByText('ベンチプレス')).toBeVisible();
  await expect(page.getByText('体調良好')).toBeVisible();

  // 非管理者では編集ボタンは出ない。
  await expect(page.getByRole('link', { name: '編集' })).not.toBeVisible();
});

test('detail page shows edit button for admin and navigates to edit page', async ({ page }) => {
  await injectAdminSession(page);
  await page.goto('/records/2026-02-02');
  await expect(page.getByRole('heading', { name: '記録詳細' })).toBeVisible();

  const editLink = page.getByRole('link', { name: '編集' });
  await expect(editLink).toBeVisible();
  await editLink.click();
  await expect(page).toHaveURL(/\/admin\/records\/2026-02-02\/edit/);
  await expect(page.getByRole('heading', { name: '記録編集' })).toBeVisible();
});

test('admin pages render for a bypassed admin', async ({ page }) => {
  await injectAdminSession(page);

  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: '管理者メニュー' })).toBeVisible();
  await expect(page.locator('a[href="/admin/records"]')).toBeVisible();
  await expect(page.locator('a[href="/admin/records/new"]')).toBeVisible();
  await expect(page.locator('a[href="/admin/masters"]')).toBeVisible();

  await page.goto('/admin/records');
  await expect(page.getByRole('heading', { name: '記録一覧（管理）' })).toBeVisible();
  await expect(page.getByRole('link', { name: '記録追加' })).toBeVisible();
  // seed 済みレコードが管理一覧にも出る。
  await expect(page.getByText('2026-02-02')).toBeVisible();

  await page.goto('/admin/masters');
  await expect(page.getByRole('heading', { name: 'マスター管理' })).toBeVisible();
  await expect(page.getByRole('button', { name: '部位' })).toBeVisible();

  await page.goto('/admin/profile');
  await expect(page.getByRole('heading', { name: 'プロフィール' })).toBeVisible();
  // seed した体重 65 が読み込まれる。
  await expect(page.getByRole('spinbutton')).toHaveValue('65');
});

test('pages and API responses carry security headers', async ({ page, request }) => {
  // 値の詳細は UT（tests/unit/lib/securityHeaders.test.ts）で検証する。ここでは next.config.ts の
  // headers() が画面・Route Handler の双方に実際に適用されていることを確かめる。
  const pageResponse = await page.goto('/');
  const apiResponse = await request.get('/api/records');
  for (const response of [pageResponse?.headers(), apiResponse.headers()]) {
    expect(response?.['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(response?.['x-content-type-options']).toBe('nosniff');
    expect(response?.['x-frame-options']).toBe('DENY');
    expect(response?.['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(response?.['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()');
  }
});
