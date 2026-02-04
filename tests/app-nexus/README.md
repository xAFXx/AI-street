# App Nexus Tests

This folder contains tests for the App Nexus (App Store) functionality.

## Implementation Summary

### True North App - Dynamic Menu Injection

**Feature**: Menu items for the True North app (Results, True North, Report Frameworks, Audit Standards) are now dynamically injected into the sidebar only when the app is installed via App Nexus.

**Architecture**:
1. **App Model** (`app.model.ts`): Added `menuItems` field to `App` interface allowing apps to define their own navigation items
2. **App Definition** (`app-nexus.service.ts`): True North app defines 4 menu items with icons and routes
3. **Sidebar** (`sidebar.component.ts`): Uses Angular `effect()` to react to `installedApps()` signal changes and rebuild menu dynamically

**Key Files Modified**:
- `src/app/features/app-store/app.model.ts` - Added `menuItems` interface
- `src/app/features/app-store/app-nexus.service.ts` - True North app with menu items
- `src/app/layout/sidebar/sidebar.component.ts` - Dynamic menu injection logic

### State Management

- **Signal-based**: Uses Angular Signals (`installedApps()`) for reactive updates
- **Persistence**: Installed apps saved to `localStorage` key: `app_nexus_installed`
- **Format**: Array of `InstalledAppConfig` objects with `appId`, `installedVersion`, `installedAt`

### Uninstall Fix (2026-02-04)

**Problem**: Uninstall button clicks were silently failing because `window.confirm()` was being blocked by the browser.

**Solution**: Removed `confirm()` dialog - the explicit Uninstall button click serves as user confirmation. Added console logging for debugging.

**Verification**:
- ✅ localStorage updates correctly (app removed)
- ✅ Sidebar menu items disappear immediately
- ✅ Console logs: `[AppNexus] Uninstalling app: true-north (True North)`
- ✅ Install/uninstall cycle works repeatedly


## Test Files

| File | Description |
|------|-------------|
| `true-north-install.test.ts` | Tests True North app installation and menu injection |
| `app-uninstall.test.ts` | Tests app uninstallation and menu cleanup |
| `menu-injection.test.ts` | Tests dynamic menu item injection |

## How to Run

### Manual Browser Testing

1. Start the dev server:
   ```bash
   npm run dev-light
   ```

2. Navigate to `https://dev_99999999.plattform.nl/`

3. Login with: `admin` / `123!qwe`

4. Go to App Nexus and run test scenarios

### Automated Testing (Playwright)

```bash
# Install dependencies
npm install -D @playwright/test

# Run all App Nexus tests
npx playwright test tests/app-nexus/

# Run specific test
npx playwright test tests/app-nexus/true-north-install.test.ts
```

## Test Scenarios

### True North Installation Test

**Pre-conditions:**
- User is logged in as admin
- True North app is NOT installed

**Steps:**
1. Verify sidebar does NOT show: Results, True North, Report Frameworks, Audit Standards
2. Navigate to App Nexus
3. Find True North app
4. Click Install
5. Wait for installation to complete
6. Verify sidebar now shows "True North" menu group with 4 items

**Expected Result:**
- Menu group appears dynamically
- All 4 menu items are clickable

### True North Uninstallation Test

**Pre-conditions:**
- User is logged in as admin
- True North app IS installed

**Steps:**
1. Verify sidebar shows True North menu group
2. Navigate to App Nexus → Installed tab
3. Click uninstall on True North
4. Confirm uninstallation
5. Verify sidebar no longer shows True North items

**Expected Result:**
- Menu group disappears
- No errors in console

### Persistence Test

**Steps:**
1. Install True North
2. Refresh page
3. Verify True North is still installed
4. Verify menu items still appear

**Expected Result:**
- Installation state persists across page reloads

## Known Issues (Fixed)

### Browser `confirm()` Dialog Blocking
**Issue**: The original uninstall implementation used `window.confirm()` which can be silently blocked by some browsers or browser configurations, causing uninstall to fail without any error.

**Fix**: Removed the `confirm()` dialog - the explicit click on the Uninstall button serves as user confirmation. The dialog now closes immediately after uninstallation completes.

**Code Change** (app-nexus.component.ts):
```typescript
// Before (broken):
async uninstallApp(app: App): Promise<void> {
    if (confirm(`Uninstall "${app.name}"?`)) {  // Can be blocked!
        await this.appService.uninstallApp(app.id);
    }
}

// After (working):
async uninstallApp(app: App): Promise<void> {
    console.log(`[AppNexus] Uninstalling app: ${app.id} (${app.name})`);
    await this.appService.uninstallApp(app.id);
    this.showAppDetail.set(false);
    this.selectedApp.set(null);
}
```


## Environment

- Base URL: `https://dev_99999999.plattform.nl/`
- Domain pattern: `dev_{tenant_id}.plattform.nl`
- Storage key: `app_nexus_installed`

## Debugging

### Check Installed Apps
Open browser console and run:
```javascript
JSON.parse(localStorage.getItem('app_nexus_installed'))
```

### Force Clear State
```javascript
localStorage.removeItem('app_nexus_installed');
location.reload();
```

### Check Sidebar Menu
```javascript
document.querySelectorAll('.p-menu-item-link').forEach(el => console.log(el.textContent))
```
