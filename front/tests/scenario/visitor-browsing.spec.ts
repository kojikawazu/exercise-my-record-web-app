import { expect, test } from '@playwright/test';
import {
  resetDb,
  seedBaseline,
  seedRecordsForDates,
} from '../e2e/helpers';

// シナリオ: 一般訪問者（非管理者）の閲覧回遊。
// 一覧 → ページング → 詳細（カロリー表示）を辿り、管理者操作が一切出ないことを確認する。

test.beforeEach(async () => {
  await resetDb();
  await seedBaseline(); // 2026-02-02(充実) / 2026-01-15
  // ページングのため新しめの日付を 13 件足して計 15 件にする。
  await seedRecordsForDates(
    Array.from({ length: 13 }, (_, i) => `2026-05-${String(i + 1).padStart(2, '0')}`),
  );
});

test('a visitor browses the list, paginates, and opens a detail without admin controls', async ({ page }) => {
  // 1) 一覧: 管理者ログイン導線はあるが、管理者専用（記録追加）は出ない
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '記録一覧' })).toBeVisible();
  await expect(page.getByRole('link', { name: '管理者ログイン' })).toBeVisible();
  await expect(page.getByRole('link', { name: '記録追加' })).toHaveCount(0);

  // 2) ページング: 1 ページ目は「前へ」無効・「次へ」有効 → 次へで 2 ページ目
  await expect(page.getByRole('button', { name: '前へ' })).toBeDisabled();
  await page.getByRole('button', { name: '次へ' }).click();
  await expect(page).toHaveURL(/\?page=2/);
  await expect(page.getByRole('button', { name: '前へ' })).toBeEnabled();

  // 3) 詳細（充実レコード）: カロリー表示あり・編集ボタンなし
  await page.goto('/records/2026-02-02');
  await expect(page.getByRole('heading', { name: '記録詳細' })).toBeVisible();
  await expect(page.getByText('ベンチプレス')).toBeVisible();
  await expect(page.getByText(/推定消費カロリー/)).toBeVisible();
  await expect(page.getByRole('link', { name: '編集' })).not.toBeVisible();
});
