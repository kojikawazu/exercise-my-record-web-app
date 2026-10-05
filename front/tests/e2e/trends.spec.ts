import { expect, test } from '@playwright/test';
import { injectAdminSession, resetAndSeedBaseline, seedWeightLogs } from './helpers';

// 実 DB に seed したベースライン（体重 65kg、2026-01-15: 筋トレ 2 セット / 2026-02-02: 筋トレ 9 セット + ラン 30 分 5km）
// で推移グラフ画面を検証する。ベースラインは過去の日付のため、グラフの表示は全期間で確認する。

test.beforeEach(async () => {
  await resetAndSeedBaseline();
});

test('should show the three metric charts with table views for all records', async ({ page }) => {
  await page.goto('/trends?period=all');
  await expect(page.getByRole('heading', { name: '推移グラフ' })).toBeVisible();
  await expect(page.getByRole('button', { name: '全期間' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await expect(page.getByRole('img', { name: '合計セット数の推移（2 日分）' })).toBeVisible();
  await expect(page.getByRole('img', { name: '有酸素距離の推移（2 日分）' })).toBeVisible();

  // 表で見る: 合計セット数の値（日付昇順）
  const setsCard = page
    .locator('div', { has: page.getByRole('heading', { name: /^合計セット数/ }) })
    .last();
  await setsCard.getByText('表で見る').click();
  const rows = setsCard.locator('tbody tr');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText('2026-01-15');
  await expect(rows.nth(0)).toContainText('2');
  await expect(rows.nth(1)).toContainText('2026-02-02');
  await expect(rows.nth(1)).toContainText('9');

  // 有酸素距離: ラン 5km
  const distanceCard = page
    .locator('div', { has: page.getByRole('heading', { name: /^有酸素距離/ }) })
    .last();
  await distanceCard.getByText('表で見る').click();
  await expect(distanceCard.locator('tbody tr').nth(1)).toContainText('5');
});

test('should show the calorie chart computed from the profile weight', async ({ page }) => {
  // ベースラインは体重 65kg を seed する
  await page.goto('/trends?period=all');
  const caloriesCard = page
    .locator('div', { has: page.getByRole('heading', { name: /^推定消費カロリー/ }) })
    .last();
  await expect(page.getByRole('img', { name: '推定消費カロリーの推移（2 日分）' })).toBeVisible();
  await caloriesCard.getByText('表で見る').click();
  // 2026-02-02: 筋トレ 65 × 0.1 × 9 = 58.5 + ラン 65 × 8 × 0.5 = 260 → 318.5 → 319
  await expect(caloriesCard.locator('tbody tr').nth(1)).toContainText('319');
});

test('should show the weight chart from the weight history', async ({ page }) => {
  await seedWeightLogs([
    { date: '2026-01-10', weightKg: 66 },
    { date: '2026-02-01', weightKg: 65.2 },
  ]);
  await page.goto('/trends?period=all');
  await expect(page.getByRole('img', { name: '体重の推移（2 日分）' })).toBeVisible();

  const weightCard = page
    .locator('div', { has: page.getByRole('heading', { name: /^体重/ }) })
    .last();
  await weightCard.getByText('表で見る').click();
  const rows = weightCard.locator('tbody tr');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText('2026-01-10');
  await expect(rows.nth(0)).toContainText('66');
  await expect(rows.nth(1)).toContainText('2026-02-01');
  await expect(rows.nth(1)).toContainText('65.2');
});

test('should add today to the weight chart after saving the weight on the profile page', async ({
  page,
}) => {
  await injectAdminSession(page);
  await page.goto('/admin/profile');
  const input = page.getByLabel('体重 (kg)');
  await expect(input).toHaveValue('65');
  await input.fill('64.3');
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.getByText('保存しました。')).toBeVisible();

  // 今日（ブラウザのローカル日付）の履歴として積まれ、直近 1 週間のグラフに載る
  await page.goto('/trends?period=1w');
  await expect(page.getByRole('img', { name: '体重の推移（1 日分）' })).toBeVisible();
  const weightCard = page
    .locator('div', { has: page.getByRole('heading', { name: /^体重/ }) })
    .last();
  await weightCard.getByText('表で見る').click();
  await expect(weightCard.locator('tbody tr')).toHaveCount(1);
  await expect(weightCard.locator('tbody tr').nth(0)).toContainText('64.3');
});

test('should show the empty state when the period has no records', async ({ page }) => {
  await page.goto('/trends?period=1w');
  await expect(page.getByText('この期間の記録はありません')).toBeVisible();
  await expect(page.getByText('体重: この期間の体重の記録はありません')).toBeVisible();
  await expect(page.getByRole('img', { name: /の推移/ })).toHaveCount(0);
});

test('should switch the period via the URL and default to 1 month', async ({ page }) => {
  await page.goto('/trends');
  await expect(page.getByRole('button', { name: '1 ヶ月' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await page.getByRole('button', { name: '全期間' }).click();
  await expect(page).toHaveURL('/trends?period=all');
  await expect(page.getByRole('img', { name: '合計セット数の推移（2 日分）' })).toBeVisible();

  await page.getByRole('button', { name: '3 ヶ月' }).click();
  await expect(page).toHaveURL('/trends?period=3m');
  await expect(page.getByRole('button', { name: '3 ヶ月' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('should fall back to 1 month for an unknown period', async ({ page }) => {
  await page.goto('/trends?period=1y');
  await expect(page.getByRole('button', { name: '1 ヶ月' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('should open the trends page from the sidebar', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: '推移グラフ' }).click();
  await expect(page).toHaveURL('/trends');
  await expect(page.getByRole('heading', { name: '推移グラフ' })).toBeVisible();
});
