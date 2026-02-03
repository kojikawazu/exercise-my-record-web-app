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
});
