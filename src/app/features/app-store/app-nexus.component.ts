import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { TabsModule } from 'primeng/tabs';
import { DialogModule } from 'primeng/dialog';
import { BadgeModule } from 'primeng/badge';
import { ChipModule } from 'primeng/chip';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DividerModule } from 'primeng/divider';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { MessageModule } from 'primeng/message';
import { AppNexusService } from './app-nexus.service';
import { App, AppParameter, AppCategory, AppInstallStatus } from './app.model';

@Component({
    selector: 'app-nexus',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        CardModule,
        ButtonModule,
        InputTextModule,
        TagModule,
        TabsModule,
        DialogModule,
        BadgeModule,
        ChipModule,
        TooltipModule,
        ProgressSpinnerModule,
        DividerModule,
        ToggleSwitchModule,
        SelectModule,
        InputNumberModule,
        TextareaModule,
        MessageModule
    ],
    templateUrl: './app-nexus.component.html',
    styleUrls: ['./app-nexus.component.less']
})
export class AppNexusComponent {
    private appService = inject(AppNexusService);
    private router = inject(Router);

    // Expose enum for template use
    readonly AppInstallStatus = AppInstallStatus;

    // State
    searchQuery = signal('');
    selectedCategory = signal<string | null>(null);
    activeTabIndex = signal(0);

    // Dialog state
    showAppDetail = signal(false);
    showCreateApp = signal(false);
    showConfigureApp = signal(false);
    selectedApp = signal<App | null>(null);

    // New app form
    newApp = signal({
        name: '',
        description: '',
        category: 'custom',
        usesApiConnection: false
    });

    // Parameter values for installation
    parameterValues = signal<Record<string, any>>({});

    // Computed
    readonly apps = this.appService.apps;
    readonly categories = this.appService.categories;
    readonly isLoading = this.appService.isLoading;
    readonly installedApps = this.appService.installedApps;
    readonly featuredApps = this.appService.featuredApps;

    readonly filteredApps = computed(() => {
        let apps = this.apps();
        const query = this.searchQuery().toLowerCase();
        const category = this.selectedCategory();

        if (query) {
            apps = apps.filter(app =>
                app.name.toLowerCase().includes(query) ||
                app.description.toLowerCase().includes(query) ||
                app.tags.some(t => t.toLowerCase().includes(query))
            );
        }

        if (category) {
            apps = apps.filter(app => app.category === category);
        }

        return apps;
    });

    readonly staticApps = computed(() =>
        this.filteredApps().filter(app => app.type === 'static')
    );

    readonly dynamicApps = computed(() =>
        this.filteredApps().filter(app => app.type === 'dynamic')
    );

    // ==================== App Actions ====================

    openAppDetail(app: App): void {
        this.selectedApp.set(app);
        this.showAppDetail.set(true);
    }

    closeAppDetail(): void {
        this.showAppDetail.set(false);
        this.selectedApp.set(null);
    }

    async installApp(app: App): Promise<void> {
        if (app.parameters.length > 0) {
            // Show configuration dialog for apps with parameters
            this.selectedApp.set(app);
            this.parameterValues.set({});
            this.showConfigureApp.set(true);
        } else {
            await this.appService.installApp(app.id);
        }
    }

    async confirmInstall(): Promise<void> {
        const app = this.selectedApp();
        if (app) {
            await this.appService.installApp(app.id, this.parameterValues());
            this.showConfigureApp.set(false);
            this.showAppDetail.set(false);
            this.selectedApp.set(null);
        }
    }

    async uninstallApp(app: App): Promise<void> {
        console.log(`[AppNexus] Uninstalling app: ${app.id} (${app.name})`);
        await this.appService.uninstallApp(app.id);
        // Close the detail dialog after uninstall
        this.showAppDetail.set(false);
        this.selectedApp.set(null);
    }

    manageApp(app: App): void {
        this.selectedApp.set(app);
        this.showConfigureApp.set(true);
        // Load current values
        const config = this.appService.getInstalledConfig(app.id);
        if (config) {
            this.parameterValues.set(config.parameters);
        }
    }

    /**
     * Open an installed app by navigating to its dynamic route
     */
    openApp(app: App): void {
        // Use centralized route lookup from AppNexusService
        const route = this.appService.getAppRoute(app.id);
        if (route) {
            this.router.navigate([route]);
        } else {
            console.warn(`No route found for app: ${app.id}`);
        }
    }

    // ==================== Create App ====================

    openCreateApp(): void {
        this.newApp.set({
            name: '',
            description: '',
            category: 'custom',
            usesApiConnection: false
        });
        this.showCreateApp.set(true);
    }

    createApp(): void {
        const data = this.newApp();
        if (data.name.trim()) {
            this.appService.createDynamicApp({
                name: data.name,
                description: data.description,
                category: data.category,
                usesApiConnection: data.usesApiConnection
            });
            this.showCreateApp.set(false);
        }
    }

    // Helper methods for updating newApp properties
    updateNewAppName(name: string): void {
        this.newApp.update(a => ({ ...a, name }));
    }

    updateNewAppDescription(description: string): void {
        this.newApp.update(a => ({ ...a, description }));
    }

    updateNewAppCategory(category: string): void {
        this.newApp.update(a => ({ ...a, category }));
    }

    updateNewAppUsesApi(usesApiConnection: boolean): void {
        this.newApp.update(a => ({ ...a, usesApiConnection }));
    }

    // ==================== Filtering ====================

    filterByCategory(categoryId: string | null): void {
        this.selectedCategory.set(
            this.selectedCategory() === categoryId ? null : categoryId
        );
    }

    clearFilters(): void {
        this.searchQuery.set('');
        this.selectedCategory.set(null);
    }

    // ==================== Helpers ====================

    getAppIcon(app: App): string {
        // If iconUrl is a PrimeNG icon class, return it
        if (app.iconUrl.startsWith('pi ')) {
            return app.iconUrl;
        }
        // Otherwise return a default
        return 'pi pi-box';
    }

    getPriceDisplay(app: App): string {
        if (app.pricing.type === 'free') {
            return 'Free';
        }
        const price = `€${app.pricing.amount}`;
        if (app.pricing.type === 'subscription') {
            return `${price}/${app.pricing.billingPeriod === 'monthly' ? 'mo' : 'yr'}`;
        }
        return price;
    }

    getTypeColor(type: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
        return type === 'static' ? 'info' : 'success';
    }

    getStatusColor(status: AppInstallStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
        switch (status) {
            case AppInstallStatus.Installed: return 'success';
            case AppInstallStatus.UpdateAvailable: return 'warn';
            case AppInstallStatus.Installing: return 'info';
            case AppInstallStatus.Error: return 'danger';
            default: return 'secondary';
        }
    }

    updateParameterValue(paramId: string, value: any): void {
        this.parameterValues.update(v => ({ ...v, [paramId]: value }));
    }
}
