/**
 * SubdomainTenancyNameFinder - Extract tenancy name from subdomain
 * 
 * This utility extracts the tenant name from the current URL based on configured patterns.
 */
import { AppConsts } from '../AppConsts';

export class SubdomainTenancyNameFinder {
    /**
     * Get the current tenancy name from the URL subdomain
     * 
     * @param appBaseUrl The app base URL format with {TENANCY_NAME} placeholder
     * @returns The tenancy name or null if not found
     */
    getCurrentTenancyNameOrNull(appBaseUrl: string): string | null {
        // Handle localhost - use stored tenant or return null
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return localStorage.getItem('tenancy_name') || null;
        }

        // If URL doesn't contain the placeholder, no tenant from subdomain
        if (!appBaseUrl || !appBaseUrl.includes(AppConsts.tenancyNamePlaceHolderInUrl)) {
            return null;
        }

        // Common patterns:
        // appBaseUrl: https://dev_{TENANCY_NAME}.apprx.eu
        // Current: https://dev_ihsc.apprx.eu
        // 
        // appBaseUrl: https://{TENANCY_NAME}.apprx.eu
        // Current: https://ihsc.apprx.eu

        // Extract the pattern before and after the placeholder
        const placeholderIndex = appBaseUrl.indexOf(AppConsts.tenancyNamePlaceHolderInUrl);
        const beforePlaceholder = appBaseUrl.substring(0, placeholderIndex);
        const afterPlaceholder = appBaseUrl.substring(placeholderIndex + AppConsts.tenancyNamePlaceHolderInUrl.length);

        // Get the current origin
        const currentOrigin = window.location.origin;

        // Extract prefix (everything before where tenant would be)
        const prefix = beforePlaceholder.replace('https://', '').replace('http://', '');

        // Extract suffix (everything after where tenant would be, before any path)
        let suffix = afterPlaceholder;
        const pathIndex = suffix.indexOf('/');
        if (pathIndex > 0) {
            suffix = suffix.substring(0, pathIndex);
        }

        // Build regex to extract tenant
        // For "dev_" prefix and ".apprx.eu" suffix, regex would be: dev_(.+)\.apprx\.eu
        const escapedPrefix = this.escapeRegex(prefix);
        const escapedSuffix = this.escapeRegex(suffix);
        const regex = new RegExp(`^https?://${escapedPrefix}(.+?)${escapedSuffix}`, 'i');

        const match = currentOrigin.match(regex);
        if (match && match[1]) {
            return match[1];
        }

        // Fallback: try to extract from hostname directly
        return this.extractFromHostname(hostname);
    }

    /**
     * Fallback method to extract tenant from hostname patterns
     */
    private extractFromHostname(hostname: string): string | null {
        // Consolidated patterns for all supported domains (apprx.eu, ai-street.eu, plattform.nl)
        const patterns = [
            /^dev_([^_.]+)_connectapi\.(ai-street\.eu|apprx\.eu|plattform\.nl)$/i,  // dev_tenant_connectapi.domain
            /^([^_.]+)_connectapi\.(ai-street\.eu|apprx\.eu|plattform\.nl)$/i,      // tenant_connectapi.domain
            /^dev_([^.]+)\.(ai-street\.eu|apprx\.eu|plattform\.nl)$/i,              // dev_tenant.domain
            /^([^.]+)\.(ai-street\.eu|apprx\.eu|plattform\.nl)$/i,                  // tenant.domain
            /^dev_([^._]+)[_-]/i,                                                   // dev_tenant-connectapi...
            /^([^._]+)[_-]connectapi/i                                              // tenant-connectapi...
        ];

        for (const pattern of patterns) {
            const match = hostname.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }

        return null;
    }

    /**
     * Escape special regex characters
     */
    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}
