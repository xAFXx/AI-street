import { Component, OnInit, OnDestroy, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { Subject, takeUntil } from 'rxjs';
import { UserManagementService, User } from '../../core/services/user-management.service';
import { AuthService } from '../../core/services/auth.service';
import { AppNexusService } from '../../features/app-store/app-nexus.service';
import { MenuPlacement } from '../../features/app-store/app.model';

@Component({
    selector: 'app-sidebar',
    standalone: true,
    imports: [CommonModule, RouterModule, MenuModule, ButtonModule, AvatarModule, TooltipModule, TagModule],
    templateUrl: './sidebar.component.html',
    styleUrl: './sidebar.component.less'
})
export class SidebarComponent implements OnInit, OnDestroy {
    private userService = inject(UserManagementService);
    private authService = inject(AuthService);
    private appNexusService = inject(AppNexusService);
    private router = inject(Router);
    private destroy$ = new Subject<void>();

    items: MenuItem[] = [];
    currentUser: User | null = null;
    private currentRole: string = 'enduser';

    constructor() {
        // Rebuild menu when installed apps change
        effect(() => {
            const installedApps = this.appNexusService.installedApps();
            if (this.currentRole) {
                this.buildMenuForRole(this.currentRole);
            }
        });
    }

    // All menu items with role requirements
    // Note: True North-specific items (Results, True North, Report Frameworks, Audit Standards)
    // are defined in the True North app and injected when the app is installed
    private allMenuItems: (MenuItem & { roles?: string[] })[] = [
        {
            label: 'Management',
            roles: ['admin'], // Only admin sees this group
            items: [
                {
                    label: 'App Nexus',
                    icon: 'pi pi-th-large',
                    routerLink: '/app-nexus'
                },
                {
                    label: 'Data Management',
                    icon: 'pi pi-database',
                    routerLink: '/input'
                },
                {
                    label: 'Model Arena',
                    icon: 'pi pi-microchip',
                    routerLink: '/arena'
                },
                {
                    label: 'Test Evaluation Center',
                    icon: 'pi pi-cog',
                    routerLink: '/processes'
                }
            ]
        },
        {
            label: 'Analytics',
            roles: ['admin'], // Only admin sees this group header
            items: [
                {
                    label: 'Dashboard',
                    icon: 'pi pi-chart-bar',
                    routerLink: '/dashboard'
                },
                {
                    label: 'Search & Action',
                    icon: 'pi pi-search',
                    routerLink: '/search'
                },
                {
                    label: 'Document Management',
                    icon: 'pi pi-file-edit',
                    routerLink: '/document-management'
                }
            ]
        },
        {
            label: 'Tools',
            roles: ['enduser'], // Only enduser sees this simplified group
            items: [
                {
                    label: 'Search & Action',
                    icon: 'pi pi-search',
                    routerLink: '/search'
                }
            ]
        }
    ];


    ngOnInit() {
        // Subscribe to UserManagementService for local user state (legacy)
        this.userService.getCurrentUser()
            .pipe(takeUntil(this.destroy$))
            .subscribe(user => {
                this.currentUser = user;
                if (user) {
                    this.buildMenuForRole(user.role);
                }
            });

        // Also subscribe to AuthService for authenticated user state (real API)
        this.authService.authState$
            .pipe(takeUntil(this.destroy$))
            .subscribe(authState => {
                console.log('[Sidebar] Auth state changed:', authState);
                if (authState.isAuthenticated) {
                    // Treat all authenticated API users as admin
                    const role = 'admin';
                    console.log('[Sidebar] Building menu for role:', role);

                    // Set a display user if not already set
                    if (!this.currentUser) {
                        this.currentUser = {
                            id: authState.user?.id?.toString() || '0',
                            name: authState.user?.name || authState.user?.userName || 'User',
                            email: authState.user?.emailAddress || '',
                            role: role
                        } as User;
                    }

                    this.buildMenuForRole(role);
                }
            });
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Build menu items based on user role
     */
    private buildMenuForRole(role: string): void {
        this.currentRole = role;

        // Filter base menu items by role
        const baseItems = this.allMenuItems
            .filter(item => {
                if (!item.roles || item.roles.length === 0) return true;
                return item.roles.includes(role);
            })
            .map(item => {
                const { roles, ...menuItem } = item;
                return menuItem;
            });

        // Get installed apps from AppNexusService
        const installedApps = this.appNexusService.installedApps();

        // Separate apps by menu placement
        const groupedApps = installedApps.filter(
            app => app.menuPlacement !== MenuPlacement.TopLevel && app.menuPlacement !== MenuPlacement.None && !app.menuItems
        );
        const topLevelApps = installedApps.filter(
            app => app.menuPlacement === MenuPlacement.TopLevel
        );

        // Build menu groups from apps that have custom menuItems (like True North)
        const appMenuGroups: MenuItem[] = installedApps
            .filter(app => app.menuItems && app.menuItems.length > 0)
            .map(app => ({
                label: app.name,
                items: app.menuItems!.map(item => ({
                    label: item.label,
                    icon: item.icon,
                    routerLink: item.routerLink
                }))
            }));

        // Build "Installed Apps" group menu item (if there are grouped apps without custom menuItems)
        const installedAppsGroup: MenuItem | null = groupedApps.length > 0 ? {
            label: 'Installed Apps',
            items: groupedApps.map(app => ({
                label: app.name,
                icon: app.iconUrl.startsWith('pi ') ? app.iconUrl : 'pi pi-box',
                routerLink: app.startScreen.startsWith('/') ? app.startScreen : `/${app.startScreen}`
            }))
        } : null;

        // Build top-level app menu items
        const topLevelAppItems: MenuItem[] = topLevelApps.map(app => ({
            label: app.name,
            icon: app.iconUrl.startsWith('pi ') ? app.iconUrl : 'pi pi-box',
            routerLink: app.startScreen.startsWith('/') ? app.startScreen : `/${app.startScreen}`
        }));

        // Combine all menu items: base + app menu groups + installed apps group + top-level items
        this.items = [
            ...baseItems,
            ...appMenuGroups,
            ...(installedAppsGroup ? [installedAppsGroup] : []),
            ...topLevelAppItems
        ];
    }

    /**
     * Get role display name
     */
    getRoleLabel(): string {
        return this.currentUser?.role === 'admin' ? 'Admin' : 'End User';
    }

    /**
     * Logout and redirect to login
     */
    logout(): void {
        console.log('[Sidebar] Logging out...');
        // Clear auth tokens and call API
        this.authService.logout().subscribe({
            next: () => {
                console.log('[Sidebar] Logout successful');
                // Also clear user management state
                this.userService.logout();
                // Redirect to login
                this.router.navigate(['/login']);
            },
            error: (err) => {
                console.error('[Sidebar] Logout error:', err);
                // Still redirect even on error - session is cleared locally
                this.userService.logout();
                this.router.navigate(['/login']);
            }
        });
    }

    /**
     * Clear all localStorage data and reload (admin only, for testing)
     */
    clearAllData(): void {
        if (confirm('This will clear all saved data including credentials and reload the page. Continue?')) {
            this.userService.clearAllData();
            window.location.href = '/login';
        }
    }
}



