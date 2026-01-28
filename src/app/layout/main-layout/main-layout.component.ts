import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { OnboardingDialogComponent } from '../../shared/components/onboarding-dialog.component';

@Component({
    selector: 'app-main-layout',
    standalone: true,
    imports: [CommonModule, RouterModule, SidebarComponent, TopbarComponent, OnboardingDialogComponent],
    template: `
    <div class="flex h-screen overflow-hidden">
        <!-- Sidebar -->
        <div class="w-18rem flex-shrink-0 h-full hidden md:block">
            <app-sidebar></app-sidebar>
        </div>

        <!-- Main Content -->
        <div class="flex-grow-1 flex flex-column h-full overflow-hidden relative">
            <app-topbar></app-topbar>
            
            <div class="flex-grow-1 p-4 overflow-auto surface-ground z-1">
                <router-outlet></router-outlet>
            </div>
        </div>
    </div>
    
    <!-- API Key Configuration Dialog -->
    <app-onboarding-dialog></app-onboarding-dialog>
  `,
    styles: ``
})
export class MainLayoutComponent { }



