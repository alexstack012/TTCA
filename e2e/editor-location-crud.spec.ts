import { expect, test } from '@playwright/test';

const editorPassword = process.env.E2E_ADMIN_PASSWORD;

test('editor can create, update, render, and delete an illustrated location', async ({
  page,
  request,
}) => {
  test.skip(!editorPassword, 'Set E2E_ADMIN_PASSWORD to run database mutation coverage.');

  const login = await request.post('/api/auth/login', { data: { password: editorPassword } });
  expect(login.ok()).toBeTruthy();
  const session = await login.json();
  const headers = { Authorization: `Bearer ${session.token}` };
  const uniqueName = `E2E Mists ${Date.now()}`;
  let locationId: string | null = null;

  try {
    const createdResponse = await request.post('/api/campaigns/curse-of-strahd/locations', {
      headers,
      data: {
        name: uniqueName,
        description: 'First remembered line.\nSecond remembered line.\nA hidden third line.',
        imageUrl: '/images/npcs/Miska_the_Wolf_Spider.webp',
        visibility: 'dm_only',
      },
    });
    expect(createdResponse.status()).toBe(201);
    const created = await createdResponse.json();
    locationId = created.id;
    expect(created.imageUrl).toBe('/images/npcs/Miska_the_Wolf_Spider.webp');

    const updatedResponse = await request.put(
      `/api/campaigns/curse-of-strahd/locations/${locationId}`,
      {
        headers,
        data: {
          name: uniqueName,
          description: 'First remembered line.\nSecond remembered line.\nUpdated final line.',
          imageUrl: created.imageUrl,
          visibility: 'dm_only',
        },
      },
    );
    expect(updatedResponse.ok()).toBeTruthy();

    await page.addInitScript(({ token, user }) => {
      sessionStorage.setItem('ttca_session', token);
      sessionStorage.setItem('ttca_user', JSON.stringify(user));
    }, session);
    await page.goto('/locations');
    await page.getByPlaceholder(/search locations/i).fill(uniqueName);
    const card = page.locator('.location-records article').filter({ hasText: uniqueName });
    await expect(card).toBeVisible();
    await expect(card.locator('.location-preview img')).toHaveAttribute('src', created.imageUrl);
    await expect(card.locator('.location-preview p')).toHaveCSS('-webkit-line-clamp', '2');

    await card
      .getByRole('button', { name: new RegExp(`toggle details for ${uniqueName}`, 'i') })
      .click();
    await expect(card.locator('.full-description')).toContainText('Updated final line.');
    await expect(card.locator('.location-expanded-image')).toBeVisible();
  } finally {
    if (locationId) {
      const deleted = await request.delete(
        `/api/campaigns/curse-of-strahd/locations/${locationId}`,
        { headers, data: { confirmation: 'delete' } },
      );
      expect(deleted.status()).toBe(204);
    }
  }
});
