import { expect, test } from '@playwright/test';

test('list page renders core elements and pagination', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '記録一覧' })).toBeVisible();
  await expect(page.getByRole('link', { name: '管理者ログイン' })).toBeVisible();
  await expect(page.getByRole('link', { name: '詳細を見る' }).first()).toBeVisible();
  await expect(page.getByText('合計セット数').first()).toBeVisible();
  await expect(page.getByText('有酸素合計時間').first()).toBeVisible();
  await expect(page.getByText('有酸素合計距離').first()).toBeVisible();
  await expect(page.getByText('推定消費カロリー').first()).toBeVisible();

  // Pagination: verify API returns paging structure
  const res = await page.request.get('/api/records?page=1');
  const data = await res.json();
  // API should return { records, totalCount, page, totalPages }
  expect(data).toHaveProperty('records');
  expect(data).toHaveProperty('totalCount');
  expect(data).toHaveProperty('page', 1);
  expect(data).toHaveProperty('totalPages');

  // If multiple pages, verify pagination UI
  if (data.totalPages > 1) {
    const prevButton = page.getByRole('button', { name: '前へ' });
    const nextButton = page.getByRole('button', { name: '次へ' });
    // First page: "前へ" should be disabled
    await expect(prevButton).toBeDisabled();
    // Click "次へ" and verify URL changes to ?page=2
    await nextButton.click();
    await expect(page).toHaveURL(/[?&]page=2/);
  }
});

test('detail page renders sections', async ({ page }) => {
  await page.goto('/records/2026-02-02');
  await expect(page.getByRole('heading', { name: '記録詳細' })).toBeVisible();
  await expect(page.getByText('推定消費カロリー')).toBeVisible();
  await expect(page.getByText('筋トレ')).toBeVisible();
  await expect(page.getByText('有酸素')).toBeVisible();
  await expect(page.getByRole('heading', { name: '体調メモ' })).toBeVisible();

  // Non-admin: edit button should NOT be visible
  await expect(page.getByRole('link', { name: '編集' })).not.toBeVisible();
});

test('detail page shows edit button for admin and navigates to edit page', async ({ page }) => {
  // Login as admin
  await page.goto('/admin/login');
  await page.getByRole('button', { name: 'テストログイン' }).click();

  // Navigate to detail page
  await page.goto('/records/2026-02-02');
  await expect(page.getByRole('heading', { name: '記録詳細' })).toBeVisible();

  // Admin: edit button should be visible
  const editLink = page.getByRole('link', { name: '編集' });
  await expect(editLink).toBeVisible();

  // Click edit and verify navigation to edit page
  await editLink.click();
  await expect(page).toHaveURL(/\/admin\/records\/2026-02-02\/edit/);
  await expect(page.getByRole('heading', { name: '記録編集' })).toBeVisible();
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

  // Validation: click save with empty form, expect field errors
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.getByText('日付を選択してください')).toBeVisible();
  await expect(page.getByText('部位を選択してください').first()).toBeVisible();
  await expect(page.getByText('種目名を入力してください').first()).toBeVisible();
  await expect(page.getByText('値を入力してください').first()).toBeVisible();

  // Validation: negative number shows specific error
  const setsInput = page.locator('input[type="number"]').first();
  await setsInput.fill('-5');
  await expect(page.getByText('正しい数値を入力してください').first()).toBeVisible();
  await setsInput.fill('');

  // Multiple cardio rows: locate the cardio section by its "任意" badge
  // The cardio "追加" button is the second one on the page (first is for workouts)
  const cardioAddButton = page.getByRole('button', { name: '追加' }).nth(1);

  // Add first cardio row and fill only minutes (partial input)
  await cardioAddButton.click();
  await expect(page.getByText('任意')).toBeVisible();
  const cardioMinutesInput = page.locator('.rounded-2xl.bg-gray-50').filter({ has: page.locator('option[value="ウォーク"]') }).first().locator('input[type="number"]').first();
  await cardioMinutesInput.fill('30');

  // Save should show cardio distance validation error (partial input)
  await page.getByRole('button', { name: '保存' }).click();
  // Distance is empty while minutes is filled, so error should appear
  const cardioDistanceError = page.locator('.rounded-2xl.bg-gray-50').filter({ has: page.locator('option[value="ウォーク"]') }).first().getByText('値を入力してください');
  await expect(cardioDistanceError).toBeVisible();

  // Fill distance to clear the error, then clear minutes for next test
  const cardioDistanceInput = page.locator('.rounded-2xl.bg-gray-50').filter({ has: page.locator('option[value="ウォーク"]') }).first().locator('input[type="number"]').nth(1);
  await cardioDistanceInput.fill('5');
  await cardioMinutesInput.fill('');
  await cardioDistanceInput.fill('');

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
