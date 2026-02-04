import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AppNexusService } from './app-nexus.service';
import { DynamicModuleRegistryService } from '../../core/dynamic-modules';
import { App, InstalledAppConfig, AppInstallStatus } from './app.model';

describe('AppNexusService', () => {
    let service: AppNexusService;
    let mockModuleRegistry: jasmine.SpyObj<DynamicModuleRegistryService>;

    const STORAGE_KEY = 'app_nexus_installed';

    // Mock localStorage
    let mockStorage: { [key: string]: string } = {};

    beforeEach(() => {
        // Reset mock storage
        mockStorage = {};

        // Mock localStorage
        spyOn(localStorage, 'getItem').and.callFake((key: string) => {
            return mockStorage[key] || null;
        });
        spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
            mockStorage[key] = value;
        });
        spyOn(localStorage, 'removeItem').and.callFake((key: string) => {
            delete mockStorage[key];
        });

        // Create mock for DynamicModuleRegistryService
        mockModuleRegistry = jasmine.createSpyObj('DynamicModuleRegistryService', [
            'registerApp',
            'unregisterApp'
        ]);
        mockModuleRegistry.registerApp.and.returnValue(Promise.resolve());

        TestBed.configureTestingModule({
            providers: [
                AppNexusService,
                { provide: DynamicModuleRegistryService, useValue: mockModuleRegistry }
            ]
        });

        service = TestBed.inject(AppNexusService);
    });

    describe('Initialization', () => {
        it('should create the service', () => {
            expect(service).toBeTruthy();
        });

        it('should load demo apps on initialization', () => {
            expect(service.apps().length).toBeGreaterThan(0);
        });

        it('should load installed apps from localStorage on init', () => {
            // Pre-populate localStorage
            const savedConfigs: InstalledAppConfig[] = [
                {
                    appId: 'doc-analyzer',
                    installedVersion: '2.1.0',
                    installedAt: new Date(),
                    parameters: {},
                    settings: {}
                }
            ];
            mockStorage[STORAGE_KEY] = JSON.stringify(savedConfigs);

            // Re-create service to test initialization
            const newService = new AppNexusService();

            expect(newService.installedConfigs().length).toBe(1);
            expect(newService.installedConfigs()[0].appId).toBe('doc-analyzer');
        });

        it('should handle corrupted localStorage gracefully', () => {
            mockStorage[STORAGE_KEY] = 'invalid-json{{{';

            // Should not throw
            const newService = new AppNexusService();
            expect(newService.installedConfigs()).toEqual([]);
        });
    });

    describe('Install App', () => {
        it('should install an app and update state', fakeAsync(() => {
            const appId = 'invoice-processor';

            // Get initial state
            const appBefore = service.getAppById(appId);
            expect(appBefore?.installStatus).toBe(AppInstallStatus.Available);

            // Install
            service.installApp(appId);
            tick(2000); // Wait for simulated delay

            // Verify state updated
            const appAfter = service.getAppById(appId);
            expect(appAfter?.installStatus).toBe(AppInstallStatus.Installed);
            expect(appAfter?.installedAt).toBeDefined();
        }));

        it('should persist installation to localStorage', fakeAsync(() => {
            const appId = 'invoice-processor';

            service.installApp(appId);
            tick(2000);

            // Verify localStorage was called
            expect(localStorage.setItem).toHaveBeenCalledWith(
                STORAGE_KEY,
                jasmine.any(String)
            );

            // Verify data structure
            const saved = JSON.parse(mockStorage[STORAGE_KEY]);
            expect(saved.some((c: InstalledAppConfig) => c.appId === appId)).toBe(true);
        }));

        it('should save parameters during installation', fakeAsync(() => {
            const appId = 'doc-analyzer';
            const params = { 'openai-key': 'sk-test-123', model: 'gpt-4o' };

            service.installApp(appId, params);
            tick(2000);

            const config = service.getInstalledConfig(appId);
            expect(config?.parameters).toEqual(params);
        }));

        it('should register internal app with module registry', fakeAsync(() => {
            const appId = 'vdb-manager'; // This is an internal app

            service.installApp(appId);
            tick(2000);

            expect(mockModuleRegistry.registerApp).toHaveBeenCalled();
        }));

        it('should set loading state during installation', fakeAsync(() => {
            expect(service.isLoading()).toBe(false);

            service.installApp('invoice-processor');

            // Should be loading immediately after call
            expect(service.isLoading()).toBe(true);

            tick(2000);

            // Should not be loading after completion
            expect(service.isLoading()).toBe(false);
        }));
    });

    describe('Uninstall App', () => {
        beforeEach(fakeAsync(() => {
            // Pre-install an app
            service.installApp('invoice-processor');
            tick(2000);
        }));

        it('should uninstall an app and update state', fakeAsync(() => {
            const appId = 'invoice-processor';

            service.uninstallApp(appId);
            tick(1000);

            const app = service.getAppById(appId);
            expect(app?.installStatus).toBe(AppInstallStatus.Available);
            expect(app?.installedAt).toBeUndefined();
        }));

        it('should remove from localStorage on uninstall', fakeAsync(() => {
            const appId = 'invoice-processor';

            // Verify it's saved
            let saved = JSON.parse(mockStorage[STORAGE_KEY]);
            expect(saved.some((c: InstalledAppConfig) => c.appId === appId)).toBe(true);

            service.uninstallApp(appId);
            tick(1000);

            // Verify it's removed
            saved = JSON.parse(mockStorage[STORAGE_KEY]);
            expect(saved.some((c: InstalledAppConfig) => c.appId === appId)).toBe(false);
        }));

        it('should unregister from module registry', fakeAsync(() => {
            service.uninstallApp('invoice-processor');
            tick(1000);

            expect(mockModuleRegistry.unregisterApp).toHaveBeenCalledWith('invoice-processor');
        }));
    });

    describe('Update Parameters and Settings', () => {
        beforeEach(fakeAsync(() => {
            service.installApp('doc-analyzer', { 'openai-key': 'old-key' });
            tick(2000);
        }));

        it('should update app parameters', () => {
            const newParams = { 'openai-key': 'new-key', model: 'gpt-4-turbo' };

            service.updateAppParameters('doc-analyzer', newParams);

            const config = service.getInstalledConfig('doc-analyzer');
            expect(config?.parameters).toEqual(newParams);
        });

        it('should persist parameter updates to localStorage', () => {
            service.updateAppParameters('doc-analyzer', { 'openai-key': 'updated' });

            const saved = JSON.parse(mockStorage[STORAGE_KEY]);
            const config = saved.find((c: InstalledAppConfig) => c.appId === 'doc-analyzer');
            expect(config.parameters['openai-key']).toBe('updated');
        });

        it('should update app settings', () => {
            const newSettings = { autoAnalyze: false, theme: 'dark' };

            service.updateAppSettings('doc-analyzer', newSettings);

            const config = service.getInstalledConfig('doc-analyzer');
            expect(config?.settings).toEqual(newSettings);
        });

        it('should persist settings updates to localStorage', () => {
            service.updateAppSettings('doc-analyzer', { saveHistory: false });

            const saved = JSON.parse(mockStorage[STORAGE_KEY]);
            const config = saved.find((c: InstalledAppConfig) => c.appId === 'doc-analyzer');
            expect(config.settings.saveHistory).toBe(false);
        });
    });

    describe('Computed Signals', () => {
        beforeEach(fakeAsync(() => {
            service.installApp('invoice-processor');
            tick(2000);
        }));

        it('should return installed apps via installedApps signal', () => {
            const installed = service.installedApps();
            expect(installed.some(a => a.id === 'invoice-processor')).toBe(true);
        });

        it('should return available apps via availableApps signal', () => {
            const available = service.availableApps();
            expect(available.every(a => a.installStatus === AppInstallStatus.Available)).toBe(true);
            expect(available.some(a => a.id === 'invoice-processor')).toBe(false);
        });

        it('should return featured apps via featuredApps signal', () => {
            const featured = service.featuredApps();
            expect(featured.every(a => a.isFeatured === true)).toBe(true);
        });
    });

    describe('Search and Filter', () => {
        it('should search apps by query', () => {
            const results = service.searchApps('invoice');
            expect(results.length).toBeGreaterThan(0);
            expect(results.some(a => a.name.toLowerCase().includes('invoice'))).toBe(true);
        });

        it('should get apps by category', () => {
            const dataApps = service.getAppsByCategory('data');
            expect(dataApps.every(a => a.category === 'data')).toBe(true);
        });

        it('should return empty array for unknown category', () => {
            const results = service.getAppsByCategory('nonexistent');
            expect(results).toEqual([]);
        });
    });

    describe('App Configuration', () => {
        it('should have hasManageScreen=false for VDB app', () => {
            const vdbApp = service.getAppById('vdb-manager');
            expect(vdbApp?.hasManageScreen).toBe(false);
        });

        it('should default hasManageScreen to undefined for apps without explicit setting', () => {
            const invoiceApp = service.getAppById('invoice-processor');
            expect(invoiceApp?.hasManageScreen).toBeUndefined();
        });
    });

    describe('localStorage Error Handling', () => {
        it('should handle localStorage quota exceeded', fakeAsync(() => {
            // Override setItem to throw
            (localStorage.setItem as jasmine.Spy).and.throwError('QuotaExceededError');

            // Should not throw
            expect(() => {
                service.installApp('invoice-processor');
                tick(2000);
            }).not.toThrow();

            // State should still be updated in memory
            const app = service.getAppById('invoice-processor');
            expect(app?.installStatus).toBe(AppInstallStatus.Installed);
        }));
    });
});
