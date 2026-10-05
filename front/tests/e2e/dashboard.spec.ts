import { expect, test } from '@playwright/test';
import { resetAndSeedBaseline, resetDb, seedRecordsForDates, seedWorkoutRecord } from './helpers';

// トップページのダッシュボード（#27）。集計は「今日」基準のため、ベースライン（体重 65kg・
// 2026 年 1〜2 月の固定日付の記録）に加えて、今日からの相対日付で記録を作る。
// ブラウザ（Playwright）とテストは同じマシンで動くため、ローカル日付が一致する。

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * 今日を基準に日付を求める。
 *
 * @param offsetDays - 今日からの日数（負で過去）
 * @param fromMonday - `true` なら今週の月曜を基準にする
 * @returns `YYYY-MM-DD`
 */
const dayFromToday = (offsetDays: number, fromMonday = false) => {
  const d = new Date();
  if (fromMonday) d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  d.setDate(d.getDate() + offsetDays);
  return iso(d);
};

test.beforeEach(async () => {
  await resetAndSeedBaseline();
});

test('should show this week totals compared with last week up to the same weekday', async ({
  page,
}) => {
  // 今週の月曜に 6 セット、先週の月曜に 3 セット（どちらも各週の範囲に必ず入る）
  await seedWorkoutRecord(dayFromToday(0, true), { part: '胸', name: 'ベンチプレス', sets: 6 });
  await seedWorkoutRecord(dayFromToday(-7, true), { part: '脚', name: 'スクワット', sets: 3 });

  await page.goto('/');
  const summary = page.getByRole('region', { name: '今週のサマリー' });
  await expect(summary.getByText('1回')).toBeVisible();
  await expect(summary.getByText('6セット')).toBeVisible();
  await expect(summary.getByText('先週比 +100%')).toBeVisible();
  await expect(summary.getByText('先週比 0%')).toBeVisible();
  // 体重 65kg: 65 × 0.1 × 6 = 39
  await expect(summary.getByText('39 kcal')).toBeVisible();
});

test('should say there was no record last week instead of a rate', async ({ page }) => {
  await seedWorkoutRecord(dayFromToday(0, true), { part: '胸', name: 'ベンチプレス', sets: 6 });

  await page.goto('/');
  const summary = page.getByRole('region', { name: '今週のサマリー' });
  await expect(summary.getByText('6セット')).toBeVisible();
  await expect(summary.getByText('先週は記録なし').first()).toBeVisible();
  await expect(summary.getByText(/先週比/)).toHaveCount(0);
});

test('should mark recorded days of this month on the heatmap and link to the detail', async ({
  page,
}) => {
  const today = dayFromToday(0);
  await seedWorkoutRecord(today, { part: '背中', name: 'デッドリフト', sets: 3 });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: /^今月の記録/ })).toBeVisible();
  await page.getByRole('link', { name: `${today} の記録を見る` }).click();
  await expect(page).toHaveURL(`/records/${today}`);
});

test('should highlight the latest record with its exercises', async ({ page }) => {
  const latest = dayFromToday(0);
  await seedWorkoutRecord(latest, { part: '肩', name: 'ショルダープレス', sets: 4 });

  await page.goto('/');
  const highlight = page.getByRole('region', { name: '最新の記録' });
  await expect(highlight.getByText(latest)).toBeVisible();
  await expect(highlight.getByText('ショルダープレス')).toBeVisible();
  await expect(highlight.getByText('4セット × 10回 / 40kg')).toBeVisible();
});

test('should show the dashboard only on the first page', async ({ page }) => {
  await resetDb();
  await seedRecordsForDates(
    Array.from({ length: 15 }, (_, i) => `2026-05-${String(i + 1).padStart(2, '0')}`),
  );

  await page.goto('/');
  await expect(page.getByRole('heading', { name: '今週のサマリー' })).toBeVisible();

  await page.getByRole('button', { name: '次へ' }).click();
  await expect(page).toHaveURL('/?page=2');
  await expect(page.getByText('2026-05-05')).toBeVisible();
  await expect(page.getByRole('heading', { name: '今週のサマリー' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '最新の記録' })).toHaveCount(0);
});

test('should show the streak including today', async ({ page }) => {
  for (const offset of [0, -1, -2]) {
    await seedWorkoutRecord(dayFromToday(offset), { part: '胸', name: 'ベンチプレス', sets: 3 });
  }

  await page.goto('/');
  const summary = page.getByRole('region', { name: '今週のサマリー' });
  await expect(summary.getByText('3日連続記録中')).toBeVisible();
  await expect(summary.getByText(/今日記録すると/)).toHaveCount(0);
});

test('should keep the streak up to yesterday and prompt to record today', async ({ page }) => {
  for (const offset of [-1, -2]) {
    await seedWorkoutRecord(dayFromToday(offset), { part: '胸', name: 'ベンチプレス', sets: 3 });
  }

  await page.goto('/');
  const summary = page.getByRole('region', { name: '今週のサマリー' });
  await expect(summary.getByText('2日連続記録中')).toBeVisible();
  await expect(summary.getByText('今日記録すると 3 日になります')).toBeVisible();
});

test('should encourage starting a streak when there is none', async ({ page }) => {
  // ベースラインの記録は 2026 年 1〜2 月のみ（今日・昨日の記録なし）
  await page.goto('/');
  await expect(
    page
      .getByRole('region', { name: '今週のサマリー' })
      .getByText('連続記録はまだありません。今日から始めましょう'),
  ).toBeVisible();
});

test('should mark streak days on the heatmap with a legend', async ({ page }) => {
  const today = dayFromToday(0);
  await seedWorkoutRecord(today, { part: '胸', name: 'ベンチプレス', sets: 3 });

  await page.goto('/');
  const heatmap = page.getByRole('region', { name: '今月の記録' });
  await expect(
    heatmap.getByRole('link', { name: `${today} の記録を見る（連続記録中）` }),
  ).toBeVisible();
  await expect(heatmap.getByText('連続記録中', { exact: true })).toBeVisible();
  await expect(heatmap.getByText('記録あり', { exact: true })).toBeVisible();
});
