import { Injectable } from '@angular/core';
import { AppConsts } from '../../shared/AppConsts';

/**
 * TenantCustomizationService — Reusable service for tenant branding assets.
 *
 * Builds URLs for tenant-specific resources (logo, etc.) using the
 * tenantId stored in AppConsts (populated from AbpUserConfiguration/GetAll).
 */
@Injectable({ providedIn: 'root' })
export class TenantCustomizationService {

    /** Numeric tenant ID from the ABP session. */
    get tenantId(): number | null {
        return AppConsts.tenantId;
    }

    /** Tenant name resolved from the URL subdomain. */
    get tenantName(): string {
        return AppConsts.tenancyName;
    }

    /**
     * Build the full URL for the tenant logo image.
     *
     * @param skin  'light' or 'dark' — selects the logo variant
     * @returns     Absolute URL to the logo, or `null` if tenantId is unknown
     */
    getLogoUrl(skin: 'light' | 'dark' = 'light'): string | null {
        if (AppConsts.tenantId == null || !AppConsts.remoteServiceBaseUrl) {
            return null;
        }
        return `${AppConsts.remoteServiceBaseUrl}/TenantCustomization/GetTenantLogo?skin=${skin}&tenantId=${AppConsts.tenantId}`;
    }
}
