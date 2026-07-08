import type { Page } from '@playwright/test';

// 実 DB（docker-compose.e2e.yml）に対する E2E のヘルパー。
// API はモックせず、seed 済みデータと実 API/DB を通して検証する。
// 認証のみ E2E_BYPASS（サーバー）+ localStorage バイパス（クライアント）で通す。

// seed/reset ユーティリティを E2E 側へ再エクスポートする。
export {
  resetDb,
  seedBaseline,
  seedRecordsForDates,
  resetAndSeedBaseline,
  disconnectDb,
} from './db';

// ---------------------------------------------------------------------------
// DatePicker 操作ヘルパー
// ---------------------------------------------------------------------------

/**
 * カスタム DatePicker コンポーネントで日付を選択する。
 *
 * @param page - Playwright の Page
 * @param dateStr - "YYYY-MM-DD" 形式の日付文字列
 */
export const selectDate = async (page: Page, dateStr: string) => {
  const [year, month, day] = dateStr.split('-').map(Number);

  await page.getByRole('button', { name: /year jump/i }).click();

  const popup = page.locator('.absolute.top-full');
  await popup.locator('select').nth(0).selectOption(String(year));
  await popup.locator('select').nth(1).selectOption(String(month - 1));
  await popup.getByRole('button', { name: String(day), exact: true }).first().click();
};

// ---------------------------------------------------------------------------
// 管理者セッション（localStorage バイパス）
// ---------------------------------------------------------------------------

/**
 * 管理者としてアクセスするための localStorage バイパスフラグを注入する。
 *
 * 非本番では `useAdminSession` が `e2e_admin_bypass=1` を見て isAdmin=true とする。
 * サーバー側の書き込み認証は webServer の `E2E_BYPASS=1` でバイパスされる。
 *
 * @param page - Playwright の Page
 */
export const injectAdminSession = async (page: Page) => {
  await page.addInitScript(() => {
    localStorage.setItem('e2e_admin_bypass', '1');
  });
};
