import { expect, test } from '@playwright/test';
import {
  injectAdminSession,
  selectDate,
  resetAndSeedBaseline,
} from '../e2e/helpers';

// シナリオ: 管理者による記録の一気通貫ライフサイクル。
// 追加 → 一覧で確認 → 詳細 → 編集 → 詳細で反映確認 → 削除 → 一覧から消滅、を
// 1 本のジャーニーとして実 DB を通して検証する（複数機能横断）。

test.beforeEach(async () => {
  await resetAndSeedBaseline();
});

test('admin creates, views, edits, and deletes a record end to end', async ({ page }) => {
  await injectAdminSession(page);
  page.on('dialog', (dialog) => dialog.accept());

  // 1) 記録追加（新規日付）
  await page.goto('/admin/records/new');
  await selectDate(page, '2026-07-01');
  await page.locator('select').first().selectOption({ index: 1 });
  await page.locator('input[placeholder*="種目"]').first().fill('ジャーニープレス');
  await page.locator('input[type="number"]').nth(0).fill('4');
  await page.locator('input[type="number"]').nth(1).fill('8');
  await page.locator('input[type="number"]').nth(2).fill('70');
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page).toHaveURL('/');

  // 2) 一覧に反映される
  await expect(page.getByText('2026-07-01')).toBeVisible();

  // 3) 詳細で内容を確認
  await page.goto('/records/2026-07-01');
  await expect(page.getByRole('heading', { name: '記録詳細' })).toBeVisible();
  await expect(page.getByText('ジャーニープレス')).toBeVisible();

  // 4) 編集してメモを変更
  await page.goto('/admin/records/2026-07-01/edit');
  await expect(page.getByRole('heading', { name: '記録編集' })).toBeVisible();
  // 既存の筋トレ行がプリフィルされるのを待ってからメモを編集する（レース回避）。
  await expect(page.locator('input[placeholder*="種目"]').first()).toHaveValue('ジャーニープレス');
  await page.locator('textarea').fill('一気通貫メモ');
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page).toHaveURL('/admin/records');

  // 5) 詳細で編集反映を確認
  await page.goto('/records/2026-07-01');
  await expect(page.getByText('一気通貫メモ')).toBeVisible();

  // 6) 管理一覧から削除 → 消滅（ベースラインの 2026-02-02 は残る）
  await page.goto('/admin/records');
  const card = page
    .locator('div')
    .filter({ hasText: '2026-07-01' })
    .filter({ has: page.getByRole('button', { name: '削除' }) })
    .last();
  await card.getByRole('button', { name: '削除' }).click();
  await expect(page.getByText('2026-07-01')).toHaveCount(0);
  await expect(page.getByText('2026-02-02')).toBeVisible();
});
