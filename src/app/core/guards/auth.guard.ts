import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserManagementService } from '../services/user-management.service';

/**
 * Guard to check if user is logged in
 */
export const authGuard: CanActivateFn = (route, state) => {
    const userService = inject(UserManagementService);
    const router = inject(Router);

    if (userService.isLoggedIn()) {
        return true;
    }

    // Redirect to login
    router.navigate(['/login']);
    return false;
};

/**
 * Guard to check if user is admin
 */
export const adminGuard: CanActivateFn = (route, state) => {
    const userService = inject(UserManagementService);
    const router = inject(Router);

    if (userService.isLoggedIn() && userService.isAdmin()) {
        return true;
    }

    // Redirect to home if not admin
    if (userService.isLoggedIn()) {
        router.navigate(['/results']);
    } else {
        router.navigate(['/login']);
    }
    return false;
};

/**
 * Guard for login page - redirect if already logged in
 */
export const loginGuard: CanActivateFn = (route, state) => {
    const userService = inject(UserManagementService);
    const router = inject(Router);

    if (userService.isLoggedIn()) {
        // Already logged in, redirect to appropriate page
        const user = userService.getCurrentUserSync();
        if (user?.role === 'admin') {
            router.navigate(['/dashboard']);
        } else {
            router.navigate(['/results']);
        }
        return false;
    }

    return true;
};
