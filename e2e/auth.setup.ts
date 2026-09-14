import { expect, test as setup } from '@playwright/test';

const authFile = 'playwright/.auth/admin.json';

setup('admin signs in through the user interface', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Электронная почта').fill('e2e.admin@example.test');
    await page.getByLabel('Пароль').fill('e2e-password-2026');
    await page.getByRole('button', { name: 'Войти' }).click();

    await expect(page).toHaveURL('/');
    await page.context().storageState({ path: authFile });
});
