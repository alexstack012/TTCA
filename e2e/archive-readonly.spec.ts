import { expect, test, type Page } from '@playwright/test';

async function enterDemo(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /explore the demonstration/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: /a living archive/i })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('ttca_session'))).toBeTruthy();
}

test('protected routes cannot be opened without a session', async ({ page }) => {
  await page.goto('/characters');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: /open the sealed archive/i })).toBeVisible();
});

test('demo entry opens a read-only dashboard', async ({ page }) => {
  await enterDemo(page);
  await expect(page.getByRole('heading', { name: /a living archive/i })).toBeVisible();
  await page.goto('/characters');
  await expect(page.getByRole('button', { name: /create character/i })).toHaveCount(0);
});

test('every dashboard collection card navigates to its page', async ({ page }) => {
  await enterDemo(page);
  const destinations = [
    ['Characters', '/characters'],
    ['Items & Equipment', '/items'],
    ['Spells', '/spells'],
    ['Campaign Log', '/campaign-log'],
    ['Lore & Plot Points', '/lore'],
    ['Locations', '/locations'],
  ] as const;

  for (const [name, path] of destinations) {
    await page.goto('/dashboard');
    await page.locator('.grid article').filter({ hasText: name }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(
      page.getByRole('heading', { name, exact: name !== 'Lore & Plot Points' }),
    ).toBeVisible();
  }
});

test('static spell and equipment searches expose useful empty states', async ({ page }) => {
  await enterDemo(page);

  await page.goto('/spells');
  await page.getByPlaceholder(/search names, effects/i).fill('not-a-real-archive-record');
  await expect(page.getByText(/no working in the grimoire matches/i)).toBeVisible();

  await page.goto('/items');
  await page.getByPlaceholder(/search names, properties/i).fill('not-a-real-archive-record');
  await expect(page.getByText(/no item in the ledger matches/i)).toBeVisible();
});

test('the API health response is minimal and entity visibility is server-filtered', async ({
  request,
}) => {
  const health = await request.get('/api/health');
  expect(health.ok()).toBeTruthy();
  expect(await health.json()).toEqual({ status: 'ok' });

  const anonymous = await request.get('/api/campaigns/curse-of-strahd/entities');
  expect(anonymous.status()).toBe(401);

  const demoLogin = await request.post('/api/auth/demo');
  expect(demoLogin.ok()).toBeTruthy();
  const { token } = await demoLogin.json();
  const entities = await request.get('/api/campaigns/curse-of-strahd/entities', {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(entities.ok()).toBeTruthy();
  expect(
    (await entities.json()).every(
      (entity: { visibility: string }) => entity.visibility !== 'dm_only',
    ),
  ).toBeTruthy();
});
