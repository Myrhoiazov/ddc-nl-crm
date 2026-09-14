import { expect, test } from '@playwright/test';

test('authenticated user sees the seeded client from the database', async ({ page }) => {
    await page.goto('/clients');

    await expect(page.getByText('E2E Seed Client', { exact: true })).toBeVisible();
});

test('authenticated user creates a client that remains after reload', async ({ page }) => {
    const clientName = 'E2E Created Client';

    await page.goto('/clients');
    await page.getByRole('button', { name: 'Добавить клиента' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Имя').fill('E2E');
    await dialog.getByLabel('Фамилия').fill('Created Client');
    await dialog.getByRole('button', { name: 'Добавить' }).click();

    await expect(page.getByText(clientName, { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText(clientName, { exact: true })).toBeVisible();
});

test('authenticated user edits a client and the change remains after reload', async ({ page }) => {
    await page.goto('/clients');
    await page.getByText('E2E Seed Client', { exact: true }).click();
    await page.getByRole('button', { name: 'Редактировать' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Фамилия').fill('Updated Client');
    await dialog.getByRole('button', { name: 'Сохранить' }).click();

    await expect(page.getByText('E2E Updated Client', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText('E2E Updated Client', { exact: true })).toBeVisible();
});
