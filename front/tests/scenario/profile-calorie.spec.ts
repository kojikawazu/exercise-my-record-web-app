import { expect, test } from '@playwright/test';
import { injectAdminSession, resetAndSeedBaseline } from '../e2e/helpers';

// シナリオ: プロフィール（体重）→ 推定消費カロリー の機能横断連動。
// 管理者が体重を変更すると、詳細画面のカロリー表示がその体重で再計算される。
//
// ベースライン 2026-02-02: 筋トレ合計 9 セット + 有酸素ラン 30 分。
//   strength = 体重 * 0.1 * 9 / cardio(ラン MET=8.0) = 8.0 * 体重 * (30/60)
//   体重 100 → 90 + 400 = 490 kcal / 体重 50 → 45 + 200 = 245 kcal

test.beforeEach(async () => {
  await resetAndSeedBaseline();
});

test('changing profile weight updates the estimated calories on the detail page', async ({ page }) => {
  await injectAdminSession(page);

  // 体重を 100kg に設定
  await page.goto('/admin/profile');
  await page.getByRole('spinbutton').fill('100');
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.getByText('保存しました。')).toBeVisible();

  // 詳細のカロリーが体重 100 で算定される
  await page.goto('/records/2026-02-02');
  await expect(page.getByText('推定消費カロリー: 490 kcal')).toBeVisible();

  // 体重を 50kg に変更するとカロリーも変わる
  await page.goto('/admin/profile');
  await page.getByRole('spinbutton').fill('50');
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.getByText('保存しました。')).toBeVisible();

  await page.goto('/records/2026-02-02');
  await expect(page.getByText('推定消費カロリー: 245 kcal')).toBeVisible();
});
