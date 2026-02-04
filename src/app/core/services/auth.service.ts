import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { map, tap, catchError, switchMap } from 'rxjs/operators';
import {
    TokenAuthServiceProxy,
    SessionServiceProxy,
    IAuthenticateModel,
    IAuthenticateResultModel,
    IGetCurrentLoginInformationsOutput,
    IUserLoginInfoDto
} from './auth-proxies.service';
import { StorageService } from './storage.service';

const AUTH_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const TOKEN_EXPIRY_KEY = 'token_expiry';
const USER_INFO_KEY = 'user_info';

export interface AuthState {
    isAuthenticated: boolean;
    user: IUserLoginInfoDto | null;
    roles: string[];
    accessToken: string | null;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private tokenAuthService = inject(TokenAuthServiceProxy);
    private sessionService = inject(SessionServiceProxy);
    private storageService = inject(StorageService);
    private router = inject(Router);

    private authStateSubject = new BehaviorSubject<AuthState>({
        isAuthenticated: false,
        user: null,
        roles: [],
        accessToken: null
    });

    authState$ = this.authStateSubject.asObservable();

    constructor() {
        // Initialize from stored tokens
        this.initializeFromStorage();
    }

    private initializeFromStorage(): void {
        const token = this.storageService.load<string>(AUTH_TOKEN_KEY);
        const userInfo = this.storageService.load<IUserLoginInfoDto>(USER_INFO_KEY);
        const expiry = this.storageService.load<number>(TOKEN_EXPIRY_KEY);

        if (token && expiry && Date.now() < expiry && userInfo) {
            this.authStateSubject.next({
                isAuthenticated: true,
                user: userInfo,
                roles: userInfo.roles || [],
                accessToken: token
            });
        }
    }

    get isAuthenticated(): boolean {
        return this.authStateSubject.value.isAuthenticated;
    }

    get currentUser(): IUserLoginInfoDto | null {
        return this.authStateSubject.value.user;
    }

    get currentRoles(): string[] {
        return this.authStateSubject.value.roles;
    }

    get accessToken(): string | null {
        return this.storageService.load<string>(AUTH_TOKEN_KEY);
    }

    /**
     * Authenticate user with username/email and password
     */
    login(userNameOrEmailAddress: string, password: string, rememberClient: boolean = false): Observable<IAuthenticateResultModel> {
        console.log('[AuthService] login() called with:', { userNameOrEmailAddress, rememberClient });

        const model: IAuthenticateModel = {
            userNameOrEmailAddress,
            password,
            rememberClient,
            twoFactorVerificationCode: undefined,
            twoFactorRememberClientToken: undefined,
            singleSignIn: undefined,
            returnUrl: undefined,
            captchaResponse: undefined
        };

        return this.tokenAuthService.authenticate(model).pipe(
            tap((result) => {
                console.log('[AuthService] Authentication result received:', result);
                console.log('[AuthService] accessToken present:', !!result?.accessToken);

                if (result?.accessToken) {
                    console.log('[AuthService] Storing tokens...');
                    this.storeTokens(result);
                    console.log('[AuthService] Tokens stored. isAuthenticated:', this.isAuthenticated);

                    // Fetch full session info after successful login
                    console.log('[AuthService] Fetching session info...');
                    this.fetchCurrentSession().subscribe({
                        next: (session) => console.log('[AuthService] Session fetched:', session),
                        error: (err) => console.error('[AuthService] Session fetch failed:', err)
                    });
                } else {
                    console.warn('[AuthService] No accessToken in result!');
                }
            }),
            catchError((error) => {
                console.error('[AuthService] Login failed:', error);
                return throwError(() => error);
            })
        );
    }

    /**
     * Logout and clear all stored tokens/session
     */
    logout(): Observable<void> {
        return this.tokenAuthService.logOut().pipe(
            tap(() => this.clearSession()),
            catchError((error) => {
                // Clear session even if logout API fails
                this.clearSession();
                return of(undefined);
            })
        );
    }

    /**
     * Refresh the access token using refresh token
     */
    refreshToken(): Observable<void> {
        const refreshToken = this.storageService.load<string>(REFRESH_TOKEN_KEY);

        if (!refreshToken) {
            return throwError(() => new Error('No refresh token available'));
        }

        return this.tokenAuthService.refreshToken(refreshToken).pipe(
            tap((result) => {
                if (result.accessToken) {
                    this.storageService.save(AUTH_TOKEN_KEY, result.accessToken);
                    if (result.refreshToken) {
                        this.storageService.save(REFRESH_TOKEN_KEY, result.refreshToken);
                    }
                    const expiryTime = Date.now() + (result.expireInSeconds * 1000);
                    this.storageService.save(TOKEN_EXPIRY_KEY, expiryTime);
                }
            }),
            map(() => undefined),
            catchError((error) => {
                this.clearSession();
                return throwError(() => error);
            })
        );
    }

    /**
     * Fetch current login/session information
     */
    fetchCurrentSession(): Observable<IGetCurrentLoginInformationsOutput> {
        return this.sessionService.getCurrentLoginInformations().pipe(
            tap((session) => {
                if (session.user) {
                    this.storageService.save(USER_INFO_KEY, session.user);
                    this.authStateSubject.next({
                        isAuthenticated: true,
                        user: session.user,
                        roles: session.roles || session.user.roles || [],
                        accessToken: this.accessToken
                    });
                }
            }),
            catchError((error) => {
                console.error('Failed to fetch session:', error);
                return throwError(() => error);
            })
        );
    }

    /**
     * Check if current user has a specific role
     */
    hasRole(role: string): boolean {
        return this.currentRoles.includes(role);
    }

    /**
     * Check if current user has any of the specified roles
     */
    hasAnyRole(roles: string[]): boolean {
        return roles.some(role => this.currentRoles.includes(role));
    }

    private storeTokens(result: IAuthenticateResultModel): void {
        if (result.accessToken) {
            this.storageService.save(AUTH_TOKEN_KEY, result.accessToken);
        }
        if (result.refreshToken) {
            this.storageService.save(REFRESH_TOKEN_KEY, result.refreshToken);
        }
        const expiryTime = Date.now() + (result.expireInSeconds * 1000);
        this.storageService.save(TOKEN_EXPIRY_KEY, expiryTime);

        // IMPORTANT: Set authenticated state immediately so guards work
        this.authStateSubject.next({
            isAuthenticated: true,
            user: null, // Will be populated by fetchCurrentSession
            roles: [],
            accessToken: result.accessToken || null
        });

        console.log('[AuthService] Auth state set to authenticated');
    }

    private clearSession(): void {
        this.storageService.remove(AUTH_TOKEN_KEY);
        this.storageService.remove(REFRESH_TOKEN_KEY);
        this.storageService.remove(TOKEN_EXPIRY_KEY);
        this.storageService.remove(USER_INFO_KEY);

        this.authStateSubject.next({
            isAuthenticated: false,
            user: null,
            roles: [],
            accessToken: null
        });

        this.router.navigate(['/login']);
    }
}
