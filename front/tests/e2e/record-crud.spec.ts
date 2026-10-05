import { expect, test } from '@playwright/test';
import {
  deleteMaster,
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

test('should redirect to /admin/login when accessing admin page without login', async ({
  page,
}) => {
  await page.goto('/admin/records/new');
  await expect(page).toHaveURL(/\/admin\/login/);
});

// ---------------------------------------------------------------------------
// 一覧表示
// ---------------------------------------------------------------------------

test('should display seeded records on the list', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '記録一覧' })).toBeVisible();
  // 1 ページ目は最新の記録がダッシュボードにも出るため、一覧の範囲で確認する（#27）
  await expect(
    page.getByRole('region', { name: '記録一覧' }).getByText('2026-02-02'),
  ).toBeVisible();
});

test('should show workout and cardio menus of each record on the list card', async ({ page }) => {
  await page.goto('/');
  // seed の 2026-02-02: 筋トレ 3 種目 + ラン 30 分 / 5km。サマリー表示は廃止した（#23）
  const card = page
    .getByRole('region', { name: '記録一覧' })
    .locator('div', { has: page.getByText('2026-02-02', { exact: true }) })
    .filter({ has: page.getByText('筋トレメニュー') });
  const latest = card.last();
  await expect(latest.getByText('ベンチプレス')).toBeVisible();
  await expect(latest.getByText('3セット × 10回 / 60kg')).toBeVisible();
  await expect(latest.getByText('デッドリフト')).toBeVisible();
  await expect(latest.getByText('スクワット')).toBeVisible();
  await expect(latest.getByText('30分 / 5km')).toBeVisible();
  // 一覧カードのサマリー表示は廃止した（ダッシュボードの「合計セット数」は対象外）
  const list = page.getByRole('region', { name: '記録一覧' });
  await expect(list.getByText('合計セット数')).toHaveCount(0);
  await expect(list.getByText('有酸素合計時間')).toHaveCount(0);
});

test('should show a placeholder when a record has no cardio on the list card', async ({ page }) => {
  await page.goto('/');
  // seed の 2026-01-15 は筋トレのみ
  const card = page
    .getByRole('region', { name: '記録一覧' })
    .locator('div', { has: page.getByText('2026-01-15', { exact: true }) })
    .filter({ has: page.getByText('有酸素メニュー') })
    .last();
  await expect(card.getByText('有酸素の記録なし')).toBeVisible();
  await expect(card.getByText('筋トレの記録なし')).toHaveCount(0);
});

test('should show menus on the admin list card as well', async ({ page }) => {
  await injectAdminSession(page);
  await page.goto('/admin/records');
  await expect(page.getByText('筋トレメニュー').first()).toBeVisible();
  await expect(page.getByText('3セット × 10回 / 60kg')).toBeVisible();
  await expect(page.getByText('30分 / 5km')).toBeVisible();
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

test("should prefill today's local date and allow changing it", async ({ page }) => {
  await injectAdminSession(page);
  await page.goto('/admin/records/new');

  // 期待値はブラウザ側のローカル日付で組み立てる（toISOString は UTC 換算で日付がずれるため）
  const today = await page.evaluate(() => {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  });
  const picker = page.getByRole('button', { name: /year jump/i });
  await expect(picker).toContainText(today);

  await selectDate(page, '2025-06-15');
  await expect(picker).toContainText('2025-06-15');
});

test('should show field validation errors when saving empty form', async ({ page }) => {
  await injectAdminSession(page);
  await page.goto('/admin/records/new');

  await page.getByRole('button', { name: '保存' }).click();

  // 日付は今日が初期値で入るため（#124）、空フォームでも日付エラーは出ない
  await expect(page.getByText('日付を選択してください')).toHaveCount(0);
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
  await expect(
    page.getByRole('region', { name: '記録一覧' }).getByText('2026-03-01'),
  ).toBeVisible();
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

test('should return to the admin list via the back link when entered from the admin list', async ({
  page,
}) => {
  await injectAdminSession(page);
  await page.goto('/admin/records');
  await page.locator('a[href="/admin/records/2026-02-02/edit"]').click();
  await expect(page).toHaveURL('/admin/records/2026-02-02/edit');

  await page.getByRole('link', { name: '管理者一覧へ戻る' }).click();
  await expect(page).toHaveURL('/admin/records');
});

test('should return to the record detail after saving when entered from the detail page', async ({
  page,
}) => {
  await injectAdminSession(page);
  await page.goto('/records/2026-02-02');
  await page.getByRole('link', { name: '編集' }).click();
  await expect(page).toHaveURL('/admin/records/2026-02-02/edit?from=detail');
  await expect(page.locator('textarea')).toHaveValue('体調良好');

  await page.locator('textarea').fill('詳細から編集');
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page).toHaveURL('/records/2026-02-02');
  await expect(page.getByText('詳細から編集')).toBeVisible();
});

test('should return to the record detail via the back link when entered from the detail page', async ({
  page,
}) => {
  await injectAdminSession(page);
  await page.goto('/admin/records/2026-02-02/edit?from=detail');
  await expect(page.getByRole('link', { name: '管理者一覧へ戻る' })).toHaveCount(0);

  await page.getByRole('link', { name: '詳細へ戻る' }).click();
  await expect(page).toHaveURL('/records/2026-02-02');
});

test('should fall back to the admin list when from is an external URL', async ({ page }) => {
  await injectAdminSession(page);
  await page.goto('/admin/records/2026-02-02/edit?from=https%3A%2F%2Fevil.example');
  await expect(page.locator('textarea')).toHaveValue('体調良好');

  await page.getByRole('button', { name: '保存' }).click();
  await expect(page).toHaveURL('/admin/records');
});

// ---------------------------------------------------------------------------
// マスター連動（記録フォームの選択肢）
// ---------------------------------------------------------------------------

test('should build form options from the masters (seeded body parts / cardio types / exercises)', async ({
  page,
}) => {
  await injectAdminSession(page);
  await page.goto('/admin/records/new');

  // 部位はマスターの名称昇順（seed: 胸 / 背中 / 脚）。直書きだった「腹」は出ない。
  const partSelect = page.locator('select').first();
  await expect(partSelect.locator('option')).toHaveText(['選択', '背中', '胸', '脚']);

  // 種目名は datalist の候補として出る（自由入力は input のまま）。
  await expect(page.locator('datalist option')).toHaveCount(3);

  // 有酸素行の種別はマスターの先頭（名称昇順で「ウォーク」）が既定になる。
  await page.getByRole('button', { name: '追加' }).nth(1).click();
  const cardioSelect = page.locator('select').nth(1);
  await expect(cardioSelect.locator('option')).toHaveText(['ウォーク', 'ラン']);
  await expect(cardioSelect).toHaveValue('ウォーク');
});

test('should reflect a body part added on the master screen in the record form', async ({
  page,
}) => {
  await injectAdminSession(page);
  await page.goto('/admin/masters');
  await page.getByPlaceholder('新しい項目を追加').fill('肩');
  await page.getByRole('button', { name: '追加' }).click();
  await expect(page.getByText('肩', { exact: true })).toBeVisible();

  await page.goto('/admin/records/new');
  await page.locator('select').first().selectOption('肩');
  await expect(page.locator('select').first()).toHaveValue('肩');
});

test('should keep a saved part that has been removed from the master on the edit screen', async ({
  page,
}) => {
  // 2026-02-02 の記録は「脚」を含む。マスターから外しても編集画面で値が消えないこと。
  await deleteMaster('body-parts', '脚');
  await injectAdminSession(page);
  await page.goto('/admin/records/2026-02-02/edit');
  await expect(page.locator('textarea')).toHaveValue('体調良好');

  await expect(page.locator('select').nth(2)).toHaveValue('脚');
  // 新しい行の選択肢には、マスターから外した「脚」は出ない。
  await page.getByRole('button', { name: '追加' }).first().click();
  await expect(page.locator('select').nth(3).locator('option')).toHaveText(['選択', '背中', '胸']);
});

// ---------------------------------------------------------------------------
// 前回の記録をコピー（記録追加画面）
// ---------------------------------------------------------------------------

test('should copy workouts and cardios of the latest record and save them as a new record', async ({
  page,
}) => {
  // ベースラインの最新は 2026-02-02（筋トレ 3 種目・ラン 30 分・メモ「体調良好」）。
  await injectAdminSession(page);
  await page.goto('/admin/records/new');

  await page.getByRole('button', { name: '前回の記録をコピー（2026-02-02）' }).click();
  await expect(page.getByText('2026-02-02 の記録をコピーしました。')).toBeVisible();

  const names = page.locator('input[placeholder*="種目"]');
  await expect(names).toHaveCount(3);
  await expect(names.nth(0)).toHaveValue('ベンチプレス');
  await expect(names.nth(1)).toHaveValue('デッドリフト');
  await expect(names.nth(2)).toHaveValue('スクワット');
  await expect(page.locator('select').nth(1)).toHaveValue('背中');
  // 有酸素行（筋トレの部位 3 つの次の select）も入る。
  await expect(page.locator('select').nth(3)).toHaveValue('ラン');
  // メモはコピーしない。
  await expect(page.locator('textarea')).toHaveValue('');

  // 日付は選び直して保存でき、コピーした内容が永続化される。
  await selectDate(page, '2026-03-01');
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page).toHaveURL('/');
  await page.goto('/records/2026-03-01');
  await expect(page.getByText('デッドリフト')).toBeVisible();
  await expect(page.getByText('体調良好')).toHaveCount(0);
});

test('should ask before overwriting the input and keep it when cancelled', async ({ page }) => {
  await injectAdminSession(page);
  await page.goto('/admin/records/new');
  const copyButton = page.getByRole('button', { name: '前回の記録をコピー（2026-02-02）' });
  await expect(copyButton).toBeEnabled();

  const names = page.locator('input[placeholder*="種目"]');
  await names.first().fill('入力中の種目');

  // キャンセル → 入力はそのまま。
  page.once('dialog', (dialog) => {
    expect(dialog.message()).toBe(
      '入力中の筋トレ・有酸素を前回の記録で置き換えます。よろしいですか？',
    );
    void dialog.dismiss();
  });
  await copyButton.click();
  await expect(names).toHaveCount(1);
  await expect(names.first()).toHaveValue('入力中の種目');

  // OK → 前回の記録で置き換わる。
  page.once('dialog', (dialog) => void dialog.accept());
  await copyButton.click();
  await expect(names).toHaveCount(3);
  await expect(names.first()).toHaveValue('ベンチプレス');
});

test('should disable the copy button when there are no records', async ({ page }) => {
  await resetDb();
  await injectAdminSession(page);
  await page.goto('/admin/records/new');

  await expect(page.getByText('コピーできる記録がありません。')).toBeVisible();
  await expect(page.getByRole('button', { name: '前回の記録をコピー' })).toBeDisabled();
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

  const cardioRows = page
    .locator('.rounded-2xl')
    .filter({ has: page.locator('option[value="ウォーク"]') });
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
  const card = page
    .locator('div')
    .filter({ hasText: '2026-02-02' })
    .filter({ has: page.getByRole('button', { name: '削除' }) })
    .last();
  await card.getByRole('button', { name: '削除' }).click();

  // 実 DB から消え、一覧から 2026-02-02 が消える（2026-01-15 は残る）。
  await expect(page.getByText('2026-02-02')).toHaveCount(0);
  await expect(page.getByText('2026-01-15')).toBeVisible();
});
