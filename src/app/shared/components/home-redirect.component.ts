import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../../core/services/user.service';

/**
 * Redirects users to appropriate home page based on their role
 * - Admin → Dashboard
 * - End User → Results
 */
@Component({
    selector: 'app-home-redirect',
    standalone: true,
    template: `
        <div class="flex align-items-center justify-content-center h-full">
            <i class="pi pi-spin pi-spinner text-4xl text-primary"></i>
        </div>
    `
})
export class HomeRedirectComponent implements OnInit {
    private router = inject(Router);
    private userService = inject(UserService);

    ngOnInit(): void {
        const user = this.userService.getCurrentUser();

        // Default page is App Nexus for all users
        this.router.navigate(['/app-nexus'], { replaceUrl: true });
    }
}
