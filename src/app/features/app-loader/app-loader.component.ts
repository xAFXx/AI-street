import { Component, OnInit, inject, signal, Type } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { ButtonModule } from 'primeng/button';
import { DynamicModuleRegistryService } from '../../core/dynamic-modules';
import { AppNexusService } from '../app-store/app-nexus.service';
import { AppInstallStatus } from '../app-store/app.model';

/**
 * App Loader Component
 * 
 * Dynamic wrapper component that loads the target app module based on route parameter.
 * Acts as a universal entry point for all dynamically loaded apps.
 */
@Component({
    selector: 'app-loader',
    standalone: true,
    imports: [CommonModule, ProgressSpinnerModule, MessageModule, ButtonModule],
    template: `
        <div class="app-loader">
            <!-- Loading State -->
            @if (isLoading()) {
                <div class="loading-container">
                    <p-progressSpinner strokeWidth="4" />
                    <p>Loading {{ appName() }}...</p>
                </div>
            }
            
            <!-- Error State -->
            @if (error()) {
                <div class="error-container">
                    <p-message severity="error" [text]="error()!" />
                    <div class="error-actions">
                        <p-button label="Retry" icon="pi pi-refresh" (onClick)="loadApp()" />
                        <p-button label="Go to App Nexus" icon="pi pi-th-large" 
                            severity="secondary" routerLink="/app-nexus" />
                    </div>
                </div>
            }
            
            <!-- Loaded Component -->
            @if (loadedComponent()) {
                <ng-container *ngComponentOutlet="loadedComponent()" />
            }
        </div>
    `,
    styles: [`
        .app-loader {
            width: 100%;
            height: 100%;
            min-height: 400px;
        }
        
        .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            min-height: 400px;
            gap: 1rem;
            
            p {
                color: var(--text-color-secondary);
                font-size: 1.1rem;
            }
        }
        
        .error-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            min-height: 400px;
            gap: 1.5rem;
            
            .error-actions {
                display: flex;
                gap: 1rem;
            }
        }
    `]
})
export class AppLoaderComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private registry = inject(DynamicModuleRegistryService);
    private appNexusService = inject(AppNexusService);

    // State
    isLoading = signal(true);
    error = signal<string | null>(null);
    appName = signal('App');
    loadedComponent = signal<Type<any> | null>(null);

    async ngOnInit(): Promise<void> {
        await this.loadApp();
    }

    async loadApp(): Promise<void> {
        this.isLoading.set(true);
        this.error.set(null);
        this.loadedComponent.set(null);

        // Get app ID from route
        const appId = this.route.snapshot.params['appId'] ||
            this.route.snapshot.data['appId'];

        if (!appId) {
            this.error.set('No app ID specified');
            this.isLoading.set(false);
            return;
        }

        // Verify app is installed via AppNexusService (single source of truth)
        const appInfo = this.appNexusService.getAppById(appId);
        if (appInfo) {
            this.appName.set(appInfo.name);

            // Check if app is installed
            if (appInfo.installStatus !== AppInstallStatus.Installed) {
                this.error.set(`App "${appInfo.name}" is not installed. Please install it from App Nexus.`);
                this.isLoading.set(false);
                return;
            }
        } else {
            // Fallback to registry for backward compatibility
            const registeredApp = this.registry.getRegisteredApp(appId);
            if (registeredApp) {
                this.appName.set(registeredApp.manifest.name);
            }
        }

        // Load the module
        const result = await this.registry.loadModule(appId);

        if (result.success && result.component) {
            this.loadedComponent.set(result.component);
        } else {
            this.error.set(result.error || 'Failed to load app');
        }

        this.isLoading.set(false);
    }
}
