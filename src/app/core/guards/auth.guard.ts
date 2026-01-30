import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard to check if user is logged in
 */
export const authGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.isAuthenticated) {
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
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.isAuthenticated && authService.hasAnyRole(['Admin', 'admin'])) {
        return true;
    }

    // Redirect to home if not admin
    if (authService.isAuthenticated) {
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
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.isAuthenticated) {
        // Already logged in, redirect to dashboard
        router.navigate(['/dashboard']);
        return false;
    }

    return true;
};

