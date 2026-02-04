/**
 * App Uninstallation Test
 * 
 * Tests:
 * 1. Uninstall button visible for installed apps
 * 2. Uninstallation removes app from installed list
 * 3. Menu items disappear after uninstallation
 * 4. State persists after page reload
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'https://dev_99999999.plattform.nl';
const LOGIN_CREDENTIALS = {
    username: 'admin',
    password: '123!qwe'
};

test.describe('App Uninstallation', () => {

    test.beforeEach(async ({ page }) => {
        // Ensure True North is installed before each test
        await page.goto(BASE_URL);
        await page.evaluate(() => {
            const config = [{
                appId: 'true-north',
                installedVersion: '1.0.0',
                installedAt: new Date().toISOString(),
                parameters: {},
                settings: {}
            }];
            localStorage.setItem('app_nexus_installed', JSON.stringify(config));
        });
        await page.reload();
    });

    test('should show True North menu items when installed', async ({ page }) => {
        await login(page);

        const menuText = await page.locator('.p-menu-item-link').allTextContents();
        expect(menuText.join(' ')).toContain('True North');
    });

    test('should remove menu items after uninstallation', async ({ page }) => {
        await login(page);

        // Verify menu items are present
        let menuText = await page.locator('.p-menu-item-link').allTextContents();
        expect(menuText.join(' ')).toContain('True North');

        // Navigate to App Nexus and go to Installed tab
        await page.click('text=App Nexus');
        await page.click('text=Installed');

        // Find True North and click uninstall
        await page.click('.surface-card:has-text("True North") button.p-button-danger');

        // Confirm in dialog if present
        const confirmBtn = page.locator('.p-dialog button:has-text("Uninstall")');
        if (await confirmBtn.isVisible()) {
            await confirmBtn.click();
        }

        await page.waitForTimeout(1000);

        // Verify menu items are gone
        menuText = await page.locator('.p-menu-item-link').allTextContents();
        expect(menuText.join(' ')).not.toContain('Results');
        expect(menuText.join(' ')).not.toContain('Report Frameworks');
        expect(menuText.join(' ')).not.toContain('Audit Standards');
    });

    test('should persist uninstallation across page reload', async ({ page }) => {
        await login(page);

        // Uninstall True North
        await page.click('text=App Nexus');
        await page.click('text=Installed');
        await page.click('.surface-card:has-text("True North") button.p-button-danger');

        const confirmBtn = page.locator('.p-dialog button:has-text("Uninstall")');
        if (await confirmBtn.isVisible()) {
            await confirmBtn.click();
        }

        await page.waitForTimeout(1000);

        // Reload and verify
        await page.reload();
        await page.waitForTimeout(1000);

        const menuText = await page.locator('.p-menu-item-link').allTextContents();
        expect(menuText.join(' ')).not.toContain('Report Frameworks');
    });

    test('should show Install button after uninstallation', async ({ page }) => {
        await login(page);

        // Uninstall True North
        await page.click('text=App Nexus');
        await page.click('text=Installed');
        await page.click('.surface-card:has-text("True North") button.p-button-danger');

        const confirmBtn = page.locator('.p-dialog button:has-text("Uninstall")');
        if (await confirmBtn.isVisible()) {
            await confirmBtn.click();
        }

        await page.waitForTimeout(1000);

        // Go to All Apps tab
        await page.click('text=All Apps');

        // Find True North and verify Install button is shown
        const installBtn = page.locator('.surface-card:has-text("True North") button:has-text("Install")');
        await expect(installBtn).toBeVisible();
    });
});

async function login(page: Page) {
    await page.goto(BASE_URL);

    const isLoginPage = await page.locator('input[type="password"]').isVisible();
    if (!isLoginPage) return;

    await page.fill('input[placeholder*="email"]', LOGIN_CREDENTIALS.username);
    await page.fill('input[type="password"]', LOGIN_CREDENTIALS.password);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('**/app-nexus');
}
