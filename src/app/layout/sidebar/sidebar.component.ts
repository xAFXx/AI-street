import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { TooltipModule } from 'primeng/tooltip';
import { Subject, takeUntil } from 'rxjs';
import { UserService, User } from '../../core/services/user.service';

@Component({
    selector: 'app-sidebar',
    standalone: true,
    imports: [CommonModule, RouterModule, MenuModule, ButtonModule, AvatarModule, TooltipModule],
    templateUrl: './sidebar.component.html',
    styleUrl: './sidebar.component.less'
})
export class SidebarComponent implements OnInit, OnDestroy {
    private userService = inject(UserService);
    private destroy$ = new Subject<void>();

    items: MenuItem[] = [];
    currentUser: User | null = null;

    // All menu items with role requirements
    private allMenuItems: (MenuItem & { roles?: string[] })[] = [
        {
            label: 'Management',
            roles: ['admin'], // Only admin sees this group
            items: [
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
                },
                {
                    label: 'Audit Standards',
                    icon: 'pi pi-th-large',
                    routerLink: '/audit-standards'
                },
                {
                    label: 'Report Frameworks',
                    icon: 'pi pi-book',
                    routerLink: '/report-frameworks'
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
                    label: 'True North',
                    icon: 'pi pi-clipboard',
                    routerLink: '/reports'
                },
                {
                    label: 'Results',
                    icon: 'pi pi-file-check',
                    routerLink: '/results'
                }
            ]
        },
        {
            label: 'Reports',
            roles: ['enduser'], // Only enduser sees this simplified group
            items: [
                {
                    label: 'True North',
                    icon: 'pi pi-clipboard',
                    routerLink: '/reports'
                },
                {
                    label: 'Results',
                    icon: 'pi pi-file-check',
                    routerLink: '/results'
                }
            ]
        }
    ];

    ngOnInit() {
        this.userService.getUser()
            .pipe(takeUntil(this.destroy$))
            .subscribe(user => {
                this.currentUser = user;
                this.buildMenuForRole(user.role);
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
        this.items = this.allMenuItems
            .filter(item => {
                // If no roles specified, show to everyone
                if (!item.roles || item.roles.length === 0) return true;
                // Otherwise, check if user's role is in the list
                return item.roles.includes(role);
            })
            .map(item => {
                // Remove the roles property before passing to PrimeNG
                const { roles, ...menuItem } = item;
                return menuItem;
            });
    }

    /**
     * Toggle user role (for demo purposes)
     */
    toggleRole(): void {
        this.userService.toggleRole();
    }

    /**
     * Get role display name
     */
    getRoleLabel(): string {
        return this.currentUser?.role === 'admin' ? 'Admin' : 'End User';
    }

    /**
     * Clear all localStorage data and reload (admin only, for testing)
     */
    clearAllData(): void {
        if (confirm('This will clear all saved data including credentials and reload the page. Continue?')) {
            localStorage.clear();
            window.location.reload();
        }
    }
}


