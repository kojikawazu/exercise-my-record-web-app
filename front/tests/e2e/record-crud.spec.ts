import { expect, test } from '@playwright/test';
import {
  injectAdminSession,
  selectDate,
  resetDb,
  resetAndSeedBaseline,
  seedRecordsForDates,
} from './helpers';

// 実 DB（docker-compose.e2e.yml）に対する記録 CRUD の E2E。
// API はモックせず、実 API/DB を通して永続化まで検証する。

test.beforeEach(async () => {
  await resetAndSeedBaseline();
});

// ---------------------------------------------------------------------------
// 認証ガード
// ---------------------------------------------------------------------------

test('should redirect to /admin/login when accessing admin page without login', async ({ page }) => {
  await page.goto('/admin/records/new');
  await expect(page).toHaveURL(/\/admin\/login/);
});

// ---------------------------------------------------------------------------
// 一覧表示
// ---------------------------------------------------------------------------

test('should display seeded records on the list', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '記録一覧' })).toBeVisible();
  await expect(page.getByText('2026-02-02')).toBeVisible();
});

test('should show empty state when there are no records', async ({ page }) => {
  await resetDb();
  await page.goto('/');
  await expect(page.getByText('記録がありません')).toBeVisible();
});

test('should show pagination controls when multiple pages exist', async ({ page }) => {
  await resetDb();
  await seedRecordsForDates(
    Array.from({ length: 15 }, (_, i) => `2026-05-${String(i + 1).padStart(2, '0')}`),
  );
  await page.goto('/');
  await expect(page.getByRole('button', { name: '前へ' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '次へ' })).toBeEnabled();
});

// ---------------------------------------------------------------------------
// 詳細表示
// ---------------------------------------------------------------------------

test('should display record detail from real DB', async ({ page }) => {
  await page.goto('/records/2026-02-02');
  await expect(page.getByRole('heading', { name: '記録詳細' })).toBeVisible();
  await expect(page.getByText('体調良好')).toBeVisible();
  await expect(page.getByText('ベンチプレス')).toBeVisible();
});

test('should show 404 UI when record does not exist', async ({ page }) => {
  await page.goto('/records/2099-01-01');
  await expect(page.getByText(/見つかりません|not found|404/i).first()).toBeVisible();
});

test('should not show edit button for non-admin user', async ({ page }) => {
  await page.goto('/records/2026-02-02');
  await expect(page.getByRole('link', { name: '編集' })).not.toBeVisible();
});

test('should show edit button for admin user', async ({ page }) => {
  await injectAdminSession(page);
  await page.goto('/records/2026-02-02');
  await expect(page.getByRole('link', { name: '編集' })).toBeVisible();
});

// ---------------------------------------------------------------------------
// 記録追加フォーム — バリデーション
// ---------------------------------------------------------------------------

test('should show field validation errors when saving empty form', async ({ page }) => {
  await injectAdminSession(page);
  await page.goto('/admin/records/new');

  await page.getByRole('button', { name: '保存' }).click();

  await expect(page.getByText('日付を選択してください')).toBeVisible();
  await expect(page.getByText('部位を選択してください').first()).toBeVisible();
  await expect(page.getByText('種目名を入力してください').first()).toBeVisible();
  await expect(page.getByText('値を入力してください').first()).toBeVisible();
});

test('should show cardio validation error when only minutes is filled', async ({ page }) => {
  await injectAdminSession(page);
  await page.goto('/admin/records/new');

  await page.getByRole('button', { name: '追加' }).nth(1).click();
  await page.locator('input[type="number"]').nth(3).fill('30');

  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.getByText('値を入力してください').first()).toBeVisible();
});

// ---------------------------------------------------------------------------
// 記録追加フロー（実 DB へ永続化）
// ---------------------------------------------------------------------------

test('should create a new record and persist it (visible on the list)', async ({ page }) => {
  await injectAdminSession(page);
  await page.goto('/admin/records/new');

  await selectDate(page, '2026-03-01');
  await page.locator('select').first().selectOption({ index: 1 });
  await page.locator('input[placeholder*="種目"]').first().fill('テストプレス');
  await page.locator('input[type="number"]').nth(0).fill('3');
  await page.locator('input[type="number"]').nth(1).fill('10');
  await page.locator('input[type="number"]').nth(2).fill('60');

  await page.getByRole('button', { name: '保存' }).click();
  await expect(page).toHaveURL('/');

  // 実 DB に保存され、一覧（日付降順の先頭）に出る。
  await expect(page.getByText('2026-03-01')).toBeVisible();
  // 詳細でも確認できる。
  await page.goto('/records/2026-03-01');
  await expect(page.getByText('テストプレス')).toBeVisible();
});

test('should show duplicate date error when creating on an existing date', async ({ page }) => {
  // ベースラインに 2026-02-02 が存在する。
  await injectAdminSession(page);
  await page.goto('/admin/records/new');

  await selectDate(page, '2026-02-02');
  await page.locator('select').first().selectOption({ index: 1 });
  await page.locator('input[placeholder*="種目"]').first().fill('重複テスト');
  await page.locator('input[type="number"]').nth(0).fill('1');
  await page.locator('input[type="number"]').nth(1).fill('1');
  await page.locator('input[type="number"]').nth(2).fill('1');

  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.getByText('同じ日付の記録が既に存在します。')).toBeVisible();
});

// ---------------------------------------------------------------------------
// 記録編集フロー（実 DB へ永続化）
// ---------------------------------------------------------------------------

test('should edit a record and persist the change', async ({ page }) => {
  await injectAdminSession(page);
  await page.goto('/admin/records/2026-02-02/edit');
  await expect(page.getByRole('heading', { name: '記録編集' })).toBeVisible();
  // 既存データの非同期プリフィル完了を待ってから編集する（レース回避）。
  await expect(page.locator('textarea')).toHaveValue('体調良好');

  await page.locator('textarea').fill('編集後メモ');
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page).toHaveURL('/admin/records');

  // 詳細で永続化を確認。
  await page.goto('/records/2026-02-02');
  await expect(page.getByText('編集後メモ')).toBeVisible();
});

// ---------------------------------------------------------------------------
// 有酸素複数行 UI
// ---------------------------------------------------------------------------

test('should add and remove multiple cardio rows', async ({ page }) => {
  await injectAdminSession(page);
  await page.goto('/admin/records/new');

  const cardioAdd = page.getByRole('button', { name: '追加' }).nth(1);
  await cardioAdd.click();
  await cardioAdd.click();

  const cardioSelects = page.locator('select').filter({ hasText: 'ラン' });
  await expect(cardioSelects).toHaveCount(2);

  const cardioRows = page.locator('.rounded-2xl').filter({ has: page.locator('option[value="ウォーク"]') });
  await cardioRows.last().getByRole('button', { name: '削除' }).click();
  await expect(cardioSelects).toHaveCount(1);
});

// ---------------------------------------------------------------------------
// 記録削除フロー（実 DB から削除）
// ---------------------------------------------------------------------------

test('should delete a record from the admin list', async ({ page }) => {
  await injectAdminSession(page);
  // window.confirm を自動承認する。
  page.on('dialog', (dialog) => dialog.accept());

  await page.goto('/admin/records');
  await expect(page.getByText('2026-02-02')).toBeVisible();

  // 2026-02-02 のカード内の削除ボタンを押す。
  const card = page.locator('div').filter({ hasText: '2026-02-02' }).filter({ has: page.getByRole('button', { name: '削除' }) }).last();
  await card.getByRole('button', { name: '削除' }).click();

  // 実 DB から消え、一覧から 2026-02-02 が消える（2026-01-15 は残る）。
  await expect(page.getByText('2026-02-02')).toHaveCount(0);
  await expect(page.getByText('2026-01-15')).toBeVisible();
});
