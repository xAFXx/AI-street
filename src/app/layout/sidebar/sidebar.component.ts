import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';

@Component({
    selector: 'app-sidebar',
    standalone: true,
    imports: [CommonModule, RouterModule, MenuModule, ButtonModule, AvatarModule],
    templateUrl: './sidebar.component.html',
    styleUrl: './sidebar.component.less'
})
export class SidebarComponent implements OnInit {
    items: MenuItem[] | undefined;

    ngOnInit() {
        this.items = [
            {
                label: 'Management',
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
            }
        ];
    }
}
