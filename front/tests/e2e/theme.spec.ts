import { expect, test } from '@playwright/test';
import { resetAndSeedBaseline } from './helpers';

// 配色テーマ（#25）。既定はダークで、選んだテーマは localStorage に残り、次回は描画前に適用される。

test.beforeEach(async () => {
  await resetAndSeedBaseline();
});

const html = (page: import('@playwright/test').Page) => page.locator('html');

test('should default to the dark theme on the first visit', async ({ page }) => {
  await page.goto('/');
  await expect(html(page)).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: 'ダーク' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('button', { name: 'ライト' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  // トークンが効いている（ページ背景がダークの値）
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(15, 15, 20)');
});

test('should switch to light and keep it after reloading', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'ライト' }).click();
  await expect(html(page)).toHaveAttribute('data-theme', 'light');
  await expect(page.getByRole('button', { name: 'ライト' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(248, 247, 244)');

  await page.reload();
  await expect(html(page)).toHaveAttribute('data-theme', 'light');
  await expect(page.getByRole('button', { name: 'ライト' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  // 別画面へ遷移してもテーマは変わらない
  await page.getByRole('link', { name: '推移グラフ' }).click();
  await expect(page).toHaveURL('/trends');
  await expect(html(page)).toHaveAttribute('data-theme', 'light');
});

test('should apply the saved theme before the app hydrates', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('theme', 'light'));
  // アプリの JS を読ませない（ハイドレーションが起きない）状態でも、<head> の描画前スクリプトだけで
  // テーマが適用されること（＝ライトを選んだ人の画面が一瞬ダークで描かれないこと）を確かめる
  await page.route('**/_next/static/**/*.js', (route) => route.abort());
  await page.goto('/');
  await expect(html(page)).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(248, 247, 244)');
});

test('should fall back to dark for an invalid saved value', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('theme', 'sepia'));
  await page.goto('/');
  await expect(html(page)).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: 'ダーク' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});
