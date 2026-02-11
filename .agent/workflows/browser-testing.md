---
description: How to run browser tests for APPRX True North features
---

# Browser Testing Workflow

## Test Environment

// turbo-all
**Primary Test URL**: `https://dev_99999999.plattform.nl`

Do NOT use:
- `localhost:4200` (connection refused in browser subagent)
- `dev-99999999.plattform.nl` (different environment)

## Login Credentials

**Username**: `admin`  
**Password**: `123!qwe`

If redirected to login page, enter these credentials before proceeding with tests.

## Common Test Paths

| Feature | URL |
|---------|-----|
| App Nexus | `/app-nexus` |
| Tax Management | `/tax-management` |
| Document Management | `/document-management` |
| Schema Editor | `/schema-editor` |
| Reports | `/reports` |

## Testing Steps

1. Navigate to `https://dev_99999999.plattform.nl/{feature-path}`
2. If login page appears, use credentials above
3. Wait 3-5 seconds for Angular app to bootstrap
4. Take screenshots to verify UI state
5. Check console logs for errors

## Notes

- The deployed site may have stale JS chunks after local builds
- If you see blank pages with "Failed to load module script" errors, run `npm run build` locally
- The site uses Angular with lazy-loaded routes
