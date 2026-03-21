import { expect, test } from '@playwright/test';

test('list page renders core elements', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '記録一覧' })).toBeVisible();
  await expect(page.getByRole('link', { name: '管理者ログイン' })).toBeVisible();
  await expect(page.getByRole('link', { name: '詳細を見る' }).first()).toBeVisible();
  await expect(page.getByText('合計セット数').first()).toBeVisible();
  await expect(page.getByText('有酸素合計時間').first()).toBeVisible();
  await expect(page.getByText('有酸素合計距離').first()).toBeVisible();
  await expect(page.getByText('推定消費カロリー').first()).toBeVisible();
});

test('detail page renders sections', async ({ page }) => {
  await page.goto('/records/2026-02-02');
  await expect(page.getByRole('heading', { name: '記録詳細' })).toBeVisible();
  await expect(page.getByText('推定消費カロリー')).toBeVisible();
  await expect(page.getByText('筋トレ')).toBeVisible();
  await expect(page.getByText('有酸素')).toBeVisible();
  await expect(page.getByRole('heading', { name: '体調メモ' })).toBeVisible();
});

test('admin pages render', async ({ page }) => {
  await page.goto('/admin/login');
  await page.getByRole('button', { name: 'テストログイン' }).click();

  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: '管理者メニュー' })).toBeVisible();
  await expect(page.locator('a[href="/admin/records"]')).toBeVisible();
  await expect(page.locator('a[href="/admin/records/new"]')).toBeVisible();
  await expect(page.locator('a[href="/admin/profile"]')).toBeVisible();
  await expect(page.locator('a[href="/admin/masters"]')).toBeVisible();
  await expect(page.locator('a[href="/admin/export"]')).toBeVisible();

  await page.goto('/admin/records');
  await expect(page.getByRole('heading', { name: '記録一覧（管理）' })).toBeVisible();
  await expect(page.getByRole('link', { name: '記録追加' })).toBeVisible();

  await page.goto('/admin/records/new');
  await expect(page.getByRole('heading', { name: '記録追加' })).toBeVisible();
  await expect(page.getByText('筋トレ')).toBeVisible();
  await expect(page.getByText('有酸素')).toBeVisible();
  await expect(page.getByText('推定消費カロリー')).toBeVisible();
  await expect(page.getByRole('button', { name: '保存' })).toBeVisible();

  // Multiple cardio rows: locate the cardio section by its "任意" badge
  // The cardio "追加" button is the second one on the page (first is for workouts)
  const cardioAddButton = page.getByRole('button', { name: '追加' }).nth(1);

  // Add first cardio row
  await cardioAddButton.click();
  await expect(page.getByText('任意')).toBeVisible();

  // Add second cardio row
  await cardioAddButton.click();

  // Verify 2 cardio rows exist by counting "種別" selects in the cardio section
  // Workouts have a "部位" select; cardio has "種別" (ラン/ウォーク) select
  const cardioTypeSelects = page.locator('select').filter({ hasText: 'ラン' });
  await expect(cardioTypeSelects).toHaveCount(2);

  // Delete one cardio row using the delete button next to a cardio type select
  const cardioRows = page.locator('.rounded-2xl.bg-gray-50').filter({ has: page.locator('option[value="ウォーク"]') });
  await cardioRows.last().getByRole('button', { name: '削除' }).click();

  // Verify only 1 cardio row remains
  await expect(cardioTypeSelects).toHaveCount(1);

  await page.goto('/admin/masters');
  await expect(page.getByRole('heading', { name: 'マスター管理' })).toBeVisible();
  await expect(page.getByRole('button', { name: '部位' })).toBeVisible();
  await expect(page.getByRole('button', { name: '種目' })).toBeVisible();
  await expect(page.getByRole('button', { name: '有酸素種別' })).toBeVisible();

  await page.goto('/admin/export');
  await expect(page.getByRole('heading', { name: 'データ出力' })).toBeVisible();
  await expect(page.getByText('開始日')).toBeVisible();
  await expect(page.getByText('終了日')).toBeVisible();
  await expect(page.getByRole('button', { name: 'エクスポート' })).toBeVisible();

  await page.goto('/admin/profile');
  await expect(page.getByRole('heading', { name: 'プロフィール' })).toBeVisible();
  await expect(page.getByText('体重 (kg)')).toBeVisible();
  await page.getByRole('spinbutton').fill('65.5');
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.getByText('保存しました。')).toBeVisible();

  // Verify overwrite: save a different value and confirm it persists after reload
  await page.getByRole('spinbutton').fill('70.0');
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.getByText('保存しました。')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('spinbutton')).toHaveValue('70');
});
