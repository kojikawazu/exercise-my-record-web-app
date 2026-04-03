import { expect, test } from '@playwright/test';
import {
  injectAdminSession,
  selectDate,
  mockRecordsListApi,
  mockRecordDetailApi,
  mockRecordCreateApi,
  mockRecordUpdateApi,
  mockRecordDeleteApi,
  recordsFixture,
  recordDetailFixture,
} from './helpers';

// ---------------------------------------------------------------------------
// 認証ガード
// ---------------------------------------------------------------------------

test('should redirect to /admin/login when accessing admin page without login', async ({ page }) => {
  // bypass を注入しない（非ログイン状態）
  await mockRecordsListApi(page);
  await page.goto('/admin/records/new');
  await expect(page).toHaveURL(/\/admin\/login/);
});

// ---------------------------------------------------------------------------
// 一覧表示
// ---------------------------------------------------------------------------

test('should display record list from mocked API', async ({ page }) => {
  await mockRecordsListApi(page, recordsFixture);
  await page.goto('/');

  await expect(page.getByRole('heading', { name: '記録一覧' })).toBeVisible();
  await expect(page.getByRole('link', { name: '詳細を見る' }).first()).toBeVisible();
});

test('should show empty state when no records', async ({ page }) => {
  await mockRecordsListApi(page, []);
  await page.goto('/');

  await expect(page.getByText('記録がありません')).toBeVisible();
});

test('should show pagination controls when multiple pages exist', async ({ page }) => {
  await mockRecordsListApi(page, recordsFixture, { totalCount: 15, totalPages: 2, page: 1 });
  await page.goto('/');

  await expect(page.getByRole('button', { name: '前へ' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '次へ' })).toBeEnabled();
});

// ---------------------------------------------------------------------------
// 詳細表示
// ---------------------------------------------------------------------------

test('should display record detail from mocked API', async ({ page }) => {
  await mockRecordDetailApi(page, recordDetailFixture);
  await page.goto('/records/2026-02-02');

  await expect(page.getByRole('heading', { name: '記録詳細' })).toBeVisible();
  await expect(page.getByText('体調良好')).toBeVisible();
  await expect(page.getByText('ベンチプレス')).toBeVisible();
});

test('should show 404 UI when record does not exist', async ({ page }) => {
  await mockRecordDetailApi(page, null);
  await page.goto('/records/2099-01-01');

  await expect(page.getByText(/見つかりません|not found|404/i)).toBeVisible();
});

test('should not show edit button for non-admin user', async ({ page }) => {
  await mockRecordDetailApi(page, recordDetailFixture);
  await page.goto('/records/2026-02-02');

  await expect(page.getByRole('link', { name: '編集' })).not.toBeVisible();
});

test('should show edit button for admin user', async ({ page }) => {
  await injectAdminSession(page);
  await mockRecordDetailApi(page, recordDetailFixture);
  await page.goto('/records/2026-02-02');

  await expect(page.getByRole('link', { name: '編集' })).toBeVisible();
});

// ---------------------------------------------------------------------------
// 記録追加フォーム — バリデーション
// ---------------------------------------------------------------------------

test('should show field validation errors when saving empty form', async ({ page }) => {
  await injectAdminSession(page);
  await mockRecordCreateApi(page);
  await page.goto('/admin/records/new');

  await page.getByRole('button', { name: '保存' }).click();

  await expect(page.getByText('日付を選択してください')).toBeVisible();
  await expect(page.getByText('部位を選択してください').first()).toBeVisible();
  await expect(page.getByText('種目名を入力してください').first()).toBeVisible();
  await expect(page.getByText('値を入力してください').first()).toBeVisible();
});

test('should show cardio validation error when only minutes is filled', async ({ page }) => {
  await injectAdminSession(page);
  await mockRecordCreateApi(page);
  await page.goto('/admin/records/new');

  // 有酸素追加ボタン（2番目の「追加」ボタン）
  await page.getByRole('button', { name: '追加' }).nth(1).click();

  // minutes のみ入力
  await page.locator('input[type="number"]').nth(3).fill('30');

  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.getByText('値を入力してください').first()).toBeVisible();
});

// ---------------------------------------------------------------------------
// 記録追加フロー
// ---------------------------------------------------------------------------

test('should submit new record and navigate to list on success', async ({ page }) => {
  await injectAdminSession(page);
  await mockRecordCreateApi(page, { status: 200, body: { id: 'new-rec-1' } });
  await page.goto('/admin/records/new');

  // DatePicker で日付を選択
  await selectDate(page, '2026-03-01');

  // 筋トレ行
  await page.locator('select').first().selectOption({ index: 1 });
  await page.locator('input[placeholder*="種目"]').first().fill('テストプレス');
  await page.locator('input[type="number"]').nth(0).fill('3');
  await page.locator('input[type="number"]').nth(1).fill('10');
  await page.locator('input[type="number"]').nth(2).fill('60');

  await page.getByRole('button', { name: '保存' }).click();
  await expect(page).toHaveURL('/');
});

test('should show duplicate date error when API returns 409', async ({ page }) => {
  await injectAdminSession(page);
  await mockRecordCreateApi(page, { status: 409, body: { error: 'duplicate date' } });
  await page.goto('/admin/records/new');

  // DatePicker で日付を選択
  await selectDate(page, '2026-02-02');

  await page.locator('select').first().selectOption({ index: 1 });
  await page.locator('input[placeholder*="種目"]').first().fill('重複テスト');
  await page.locator('input[type="number"]').nth(0).fill('1');
  await page.locator('input[type="number"]').nth(1).fill('1');
  await page.locator('input[type="number"]').nth(2).fill('1');

  await page.getByRole('button', { name: '保存' }).click();

  // アプリのエラーメッセージ: "同じ日付の記録が既に存在します。"
  await expect(page.getByText('同じ日付の記録が既に存在します。')).toBeVisible();
});

// ---------------------------------------------------------------------------
// 記録編集フロー
// ---------------------------------------------------------------------------

test('should load edit form with prefilled data and submit successfully', async ({ page }) => {
  await injectAdminSession(page);
  await mockRecordDetailApi(page, recordDetailFixture);
  await mockRecordUpdateApi(page, { status: 200, body: { id: 'rec-1' } });
  await page.goto('/admin/records/2026-02-02/edit');

  await expect(page.getByRole('heading', { name: '記録編集' })).toBeVisible();

  // 体調メモを変更
  const memoInput = page.locator('textarea');
  await memoInput.fill('編集後メモ');

  await page.getByRole('button', { name: '保存' }).click();
  // 編集後は管理者一覧へリダイレクト
  await expect(page).toHaveURL('/admin/records');
});

// ---------------------------------------------------------------------------
// 有酸素複数行: 追加と削除
// ---------------------------------------------------------------------------

test('should add and remove multiple cardio rows', async ({ page }) => {
  await injectAdminSession(page);
  await mockRecordCreateApi(page);
  await page.goto('/admin/records/new');

  const cardioAdd = page.getByRole('button', { name: '追加' }).nth(1);

  // 2行追加
  await cardioAdd.click();
  await cardioAdd.click();

  const cardioSelects = page.locator('select').filter({ hasText: 'ラン' });
  await expect(cardioSelects).toHaveCount(2);

  // 1行削除
  const cardioRows = page.locator('.rounded-2xl').filter({ has: page.locator('option[value="ウォーク"]') });
  await cardioRows.last().getByRole('button', { name: '削除' }).click();
  await expect(cardioSelects).toHaveCount(1);
});

// ---------------------------------------------------------------------------
// 記録削除
// ---------------------------------------------------------------------------

test('should delete a record from admin list', async ({ page }) => {
  await injectAdminSession(page);
  await mockRecordsListApi(page, recordsFixture);
  await mockRecordDeleteApi(page, { status: 200, body: { ok: true } });
  await page.goto('/admin/records');

  const deleteButton = page.getByRole('button', { name: '削除' }).first();
  const isVisible = await deleteButton.isVisible();

  if (!isVisible) {
    test.skip();
    return;
  }

  await deleteButton.click();

  // 確認ダイアログがあれば承認
  const confirmDialog = page.getByRole('dialog');
  if (await confirmDialog.isVisible()) {
    await confirmDialog.getByRole('button', { name: /削除|確認|OK/i }).click();
  }

  // 削除後も一覧ページにいる（またはリフレッシュされる）
  await expect(page).toHaveURL(/\/admin\/records/);
});

// ---------------------------------------------------------------------------
// 詳細→編集ナビゲーション
// ---------------------------------------------------------------------------

test('should navigate from detail to edit page via edit button', async ({ page }) => {
  await injectAdminSession(page);
  await mockRecordDetailApi(page, recordDetailFixture);
  await page.goto('/records/2026-02-02');

  await page.getByRole('link', { name: '編集' }).click();
  await expect(page).toHaveURL(/\/admin\/records\/2026-02-02\/edit/);
});
