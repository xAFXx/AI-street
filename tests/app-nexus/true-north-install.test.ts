/**
 * True North App Installation Test
 * 
 * Tests:
 * 1. Menu items NOT visible before installation
 * 2. App installation via App Nexus
 * 3. Menu items appear after installation
 * 4. Navigation works from new menu items
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'https://dev_99999999.plattform.nl';
const LOGIN_CREDENTIALS = {
    username: 'admin',
    password: '123!qwe'
};

const TRUE_NORTH_MENU_ITEMS = [
    'Results',
    'True North',
    'Report Frameworks',
    'Audit Standards'
];

test.describe('True North App Installation', () => {

    test.beforeEach(async ({ page }) => {
        // Clear installed apps from localStorage
        await page.goto(BASE_URL);
        await page.evaluate(() => {
            localStorage.removeItem('app_nexus_installed');
        });
        await page.reload();
    });

    test('should not show True North menu items before installation', async ({ page }) => {
        await login(page);

        // Get sidebar menu text
        const menuText = await page.locator('.p-menu-item-link').allTextContents();

        for (const item of TRUE_NORTH_MENU_ITEMS) {
            expect(menuText).not.toContain(item);
        }
    });

    test('should show True North menu items after installation', async ({ page }) => {
        await login(page);

        // Navigate to App Nexus
        await page.click('text=App Nexus');
        await page.waitForURL('**/app-nexus');

        // Find and install True North
        await page.locator('.surface-card:has-text("True North")').scrollIntoViewIfNeeded();
        await page.click('.surface-card:has-text("True North") button:has-text("Install")');

        // Wait for installation (simulated delay)
        await page.waitForTimeout(2000);

        // Verify menu items now appear
        const menuText = await page.locator('.p-menu-item-link').allTextContents();

        for (const item of TRUE_NORTH_MENU_ITEMS) {
            expect(menuText.join(' ')).toContain(item);
        }
    });

    test('should persist installation across page reload', async ({ page }) => {
        await login(page);

        // Install True North
        await page.click('text=App Nexus');
        await page.click('.surface-card:has-text("True North") button:has-text("Install")');
        await page.waitForTimeout(2000);

        // Reload page
        await page.reload();
        await page.waitForTimeout(1000);

        // Verify menu items still present
        const menuText = await page.locator('.p-menu-item-link').allTextContents();
        expect(menuText.join(' ')).toContain('True North');
    });

    test('should navigate when clicking True North menu items', async ({ page }) => {
        await login(page);

        // Install True North first
        await page.click('text=App Nexus');
        await page.click('.surface-card:has-text("True North") button:has-text("Install")');
        await page.waitForTimeout(2000);

        // Click on Results menu item
        await page.click('.p-menu-item-link:has-text("Results")');
        await page.waitForURL('**/results');
        expect(page.url()).toContain('/results');

        // Click on Audit Standards
        await page.click('.p-menu-item-link:has-text("Audit Standards")');
        await page.waitForURL('**/audit-standards');
        expect(page.url()).toContain('/audit-standards');
    });
});

async function login(page: Page) {
    await page.goto(BASE_URL);

    // Check if already logged in
    const isLoginPage = await page.locator('input[type="password"]').isVisible();
    if (!isLoginPage) return;

    await page.fill('input[placeholder*="email"]', LOGIN_CREDENTIALS.username);
    await page.fill('input[type="password"]', LOGIN_CREDENTIALS.password);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('**/app-nexus');
}
