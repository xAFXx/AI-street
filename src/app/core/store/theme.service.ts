import { Injectable, inject, effect } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { AppStoreService } from './app-store.service';
import { ThemeConfig } from './app-config.model';

/**
 * ThemeService - Dynamic Theme Management
 * 
 * Handles application theming through CSS custom properties.
 * Automatically applies theme from AppConfig and supports dark mode switching.
 * 
 * @example
 * ```typescript
 * // Theme is auto-applied on initialization
 * // To manually update theme or toggle dark mode:
 * themeService.applyTheme();
 * themeService.toggleDarkMode();
 * ```
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
    private document = inject(DOCUMENT);
    private store = inject(AppStoreService);

    constructor() {
        // React to dark mode changes
        effect(() => {
            const isDark = this.store.isDarkMode();
            this.applyDarkModeClass(isDark);
        });

        // React to theme config changes
        effect(() => {
            const theme = this.store.theme();
            if (theme) {
                this.applyCssVariables(theme);
            }
        });
    }

    /**
     * Apply the current theme configuration
     * Called automatically during initialization
     */
    applyTheme(): void {
        const theme = this.store.theme();
        if (!theme) {
            console.warn('[ThemeService] No theme configuration available');
            return;
        }

        this.applyCssVariables(theme);
        this.updateFavicon(theme.faviconUrl);
        this.updateDocumentTitle(theme.brandName);
        this.applyDarkModeClass(this.store.isDarkMode());

        console.log('[ThemeService] Theme applied:', theme.brandName);
    }

    /**
     * Apply CSS custom properties from theme config
     */
    private applyCssVariables(theme: ThemeConfig): void {
        const root = this.document.documentElement;
        const isDark = this.store.isDarkMode();

        // Primary color (with dark mode override if available)
        const primaryColor = isDark && theme.primaryColorDark
            ? theme.primaryColorDark
            : theme.primaryColor;

        // Secondary color (with dark mode override if available)
        const secondaryColor = isDark && theme.secondaryColorDark
            ? theme.secondaryColorDark
            : theme.secondaryColor;

        // Set CSS custom properties
        root.style.setProperty('--primary-color', primaryColor);
        root.style.setProperty('--secondary-color', secondaryColor);
        root.style.setProperty('--brand-primary', primaryColor);
        root.style.setProperty('--brand-secondary', secondaryColor);

        // Generate color variations
        root.style.setProperty('--primary-color-rgb', this.hexToRgb(primaryColor));
        root.style.setProperty('--secondary-color-rgb', this.hexToRgb(secondaryColor));

        // Lighter/darker variants (for hover states, etc.)
        root.style.setProperty('--primary-color-light', this.lightenColor(primaryColor, 20));
        root.style.setProperty('--primary-color-dark', this.darkenColor(primaryColor, 20));
        root.style.setProperty('--secondary-color-light', this.lightenColor(secondaryColor, 20));
        root.style.setProperty('--secondary-color-dark', this.darkenColor(secondaryColor, 20));
    }

    /**
     * Apply or remove dark mode class on document
     */
    private applyDarkModeClass(isDark: boolean): void {
        const html = this.document.documentElement;
        const body = this.document.body;

        if (isDark) {
            html.classList.add('dark-mode');
            body.classList.add('dark-mode');
        } else {
            html.classList.remove('dark-mode');
            body.classList.remove('dark-mode');
        }
    }

    /**
     * Update the document favicon
     */
    private updateFavicon(faviconUrl: string): void {
        if (!faviconUrl) return;

        let link: HTMLLinkElement | null = this.document.querySelector("link[rel~='icon']");
        if (!link) {
            link = this.document.createElement('link');
            link.rel = 'icon';
            this.document.head.appendChild(link);
        }
        link.href = faviconUrl;
    }

    /**
     * Update the document title
     */
    private updateDocumentTitle(brandName: string): void {
        if (brandName) {
            this.document.title = brandName;
        }
    }

    /**
     * Get the application logo URL from current theme
     */
    getLogoUrl(): string {
        return this.store.theme()?.logoUrl ?? '';
    }

    /**
     * Get the brand name from current theme
     */
    getBrandName(): string {
        return this.store.theme()?.brandName ?? 'Application';
    }

    // ==================== Color Utilities ====================

    /**
     * Convert hex color to RGB string (for rgba usage)
     */
    private hexToRgb(hex: string): string {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return '0, 0, 0';
        return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
    }

    /**
     * Lighten a hex color by a percentage
     */
    private lightenColor(hex: string, percent: number): string {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
    }

    /**
     * Darken a hex color by a percentage
     */
    private darkenColor(hex: string, percent: number): string {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
    }
}
