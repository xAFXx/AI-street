/**
 * Menu Injection Test
 * 
 * Tests the dynamic menu injection feature where apps can define
 * custom menuItems that appear in the sidebar when installed.
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'https://dev_99999999.plattform.nl';
const LOGIN_CREDENTIALS = {
    username: 'admin',
    password: '123!qwe'
};

test.describe('Dynamic Menu Injection', () => {

    test.beforeEach(async ({ page }) => {
        // Clear all installed apps
        await page.goto(BASE_URL);
        await page.evaluate(() => {
            localStorage.removeItem('app_nexus_installed');
        });
        await page.reload();
    });

    test('should inject menu items as a named group', async ({ page }) => {
        await login(page);

        // Install True North
        await page.click('text=App Nexus');
        await page.locator('.surface-card:has-text("True North")').scrollIntoViewIfNeeded();
        await page.click('.surface-card:has-text("True North") button:has-text("Install")');
        await page.waitForTimeout(2000);

        // Verify "True North" appears as a menu group label
        const menuHeaders = await page.locator('.p-menu-submenu-header, .p-menu-item-content').allTextContents();

        // Check that the group exists
        const hasGroupHeader = menuHeaders.some(text => text.includes('True North'));
        expect(hasGroupHeader).toBe(true);
    });

    test('should not show apps with menuItems in Installed Apps group', async ({ page }) => {
        await login(page);

        // Install True North (has menuItems)
        await page.click('text=App Nexus');
        await page.click('.surface-card:has-text("True North") button:has-text("Install")');
        await page.waitForTimeout(2000);

        // Verify True North does NOT appear under "Installed Apps"
        const installedAppsSection = page.locator('.p-menu-item-content:has-text("Installed Apps")');

        if (await installedAppsSection.isVisible()) {
            // Get all items under Installed Apps
            const siblingItems = await installedAppsSection.locator('~ .p-menu-item').allTextContents();
            expect(siblingItems.join(' ')).not.toContain('True North');
        }
    });

    test('should show correct icons for injected menu items', async ({ page }) => {
        await login(page);

        // Install True North
        await page.click('text=App Nexus');
        await page.click('.surface-card:has-text("True North") button:has-text("Install")');
        await page.waitForTimeout(2000);

        // Check Results has pi-file-check icon
        const resultsItem = page.locator('.p-menu-item-link:has-text("Results")');
        const resultsIcon = await resultsItem.locator('i').getAttribute('class');
        expect(resultsIcon).toContain('pi-file-check');

        // Check Audit Standards has pi-th-large icon
        const auditItem = page.locator('.p-menu-item-link:has-text("Audit Standards")');
        const auditIcon = await auditItem.locator('i').getAttribute('class');
        expect(auditIcon).toContain('pi-th-large');
    });

    test('should maintain correct router links for injected items', async ({ page }) => {
        await login(page);

        // Install True North
        await page.click('text=App Nexus');
        await page.click('.surface-card:has-text("True North") button:has-text("Install")');
        await page.waitForTimeout(2000);

        // Check href attributes
        const resultsLink = await page.locator('.p-menu-item-link:has-text("Results")').getAttribute('href');
        expect(resultsLink).toContain('/results');

        const frameworksLink = await page.locator('.p-menu-item-link:has-text("Report Frameworks")').getAttribute('href');
        expect(frameworksLink).toContain('/report-frameworks');

        const auditLink = await page.locator('.p-menu-item-link:has-text("Audit Standards")').getAttribute('href');
        expect(auditLink).toContain('/audit-standards');
    });

    test('should update menu immediately on installation', async ({ page }) => {
        await login(page);

        // Verify no True North items initially
        let menuText = await page.locator('.p-menu-item-link').allTextContents();
        expect(menuText.join(' ')).not.toContain('Audit Standards');

        // Install True North
        await page.click('text=App Nexus');
        await page.click('.surface-card:has-text("True North") button:has-text("Install")');

        // Wait for signal to propagate
        await page.waitForTimeout(2000);

        // Verify items appear without page reload
        menuText = await page.locator('.p-menu-item-link').allTextContents();
        expect(menuText.join(' ')).toContain('Audit Standards');
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
