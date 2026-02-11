import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { StorageService } from '../services/storage.service';

const AUTH_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
    const storageService = inject(StorageService);
    const router = inject(Router);

    // Skip adding token for authentication endpoints
    if (req.url.includes('/TokenAuth/') && !req.url.includes('/LogOut')) {
        return next(req);
    }

    // Skip adding token for external public APIs (to avoid CORS issues)
    const externalApis = [
        'api.pdok.nl',           // Dutch BAG/address API
        'geo.leefbaarometer.nl', // Dutch livability API
        'api.openai.com'         // OpenAI API (handles its own auth)
    ];
    const isExternalApi = externalApis.some(domain => req.url.includes(domain));
    if (isExternalApi) {
        return next(req);
    }

    const token = storageService.load<string>(AUTH_TOKEN_KEY);

    if (token) {
        req = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });
    }

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            if (error.status === 401) {
                // Token expired or invalid - redirect to login
                storageService.remove(AUTH_TOKEN_KEY);
                storageService.remove(REFRESH_TOKEN_KEY);
                router.navigate(['/login']);
            }
            return throwError(() => error);
        })
    );
};

