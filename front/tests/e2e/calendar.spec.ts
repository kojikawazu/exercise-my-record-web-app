import { expect, test } from '@playwright/test';
import { resetAndSeedBaseline } from './helpers';

// 実 DB に seed したベースライン（2026-02-02 / 2026-01-15 に記録あり）でカレンダー画面を検証する。

test.beforeEach(async () => {
  await resetAndSeedBaseline();
});

test('should mark recorded days and navigate to the detail on click', async ({ page }) => {
  await page.goto('/calendar?month=2026-02');
  await expect(page.getByRole('heading', { name: '2026年2月' })).toBeVisible();

  await page.getByRole('link', { name: '2026-02-02 の記録を見る' }).click();
  await expect(page).toHaveURL('/records/2026-02-02');
  await expect(page.getByRole('heading', { name: '記録詳細' })).toBeVisible();
});

test('should not link days without a record', async ({ page }) => {
  await page.goto('/calendar?month=2026-02');
  await expect(page.getByRole('link', { name: '2026-02-02 の記録を見る' })).toBeVisible();
  await expect(page.getByRole('link', { name: '2026-02-03 の記録を見る' })).toHaveCount(0);
  // 記録の無い月はリンクが 1 つも無い
  await page.goto('/calendar?month=2026-03');
  await expect(page.getByRole('heading', { name: '2026年3月' })).toBeVisible();
  await expect(page.getByRole('link', { name: /の記録を見る$/ })).toHaveCount(0);
});

test('should move to the previous and next month via the URL', async ({ page }) => {
  await page.goto('/calendar?month=2026-02');
  await page.getByRole('button', { name: '前月' }).click();
  await expect(page).toHaveURL('/calendar?month=2026-01');
  await expect(page.getByRole('link', { name: '2026-01-15 の記録を見る' })).toBeVisible();

  await page.getByRole('button', { name: '次月' }).click();
  await page.getByRole('button', { name: '次月' }).click();
  await expect(page).toHaveURL('/calendar?month=2026-03');

  // ブラウザの戻るで前の月へ戻れる（URL が表示月の唯一の真実）
  await page.goBack();
  await expect(page).toHaveURL('/calendar?month=2026-02');
  await expect(page.getByRole('heading', { name: '2026年2月' })).toBeVisible();
});

test('should roll over the year when moving from December', async ({ page }) => {
  await page.goto('/calendar?month=2026-12');
  await page.getByRole('button', { name: '次月' }).click();
  await expect(page).toHaveURL('/calendar?month=2027-01');
  await expect(page.getByRole('heading', { name: '2027年1月' })).toBeVisible();
});

test('should fall back to the current month for an invalid month', async ({ page }) => {
  await page.goto('/calendar?month=abc');
  // ブラウザと同じマシンのローカル日付で今月を求める
  const now = new Date();
  await expect(
    page.getByRole('heading', { name: `${now.getFullYear()}年${now.getMonth() + 1}月` }),
  ).toBeVisible();
});

test('should open the calendar from the sidebar', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'カレンダー', exact: true }).click();
  await expect(page).toHaveURL('/calendar');
  await expect(page.getByRole('heading', { name: 'カレンダー' })).toBeVisible();
});
