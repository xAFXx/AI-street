/**
 * Auth Service Proxies
 * 
 * These are simplified versions of the authentication service proxies.
 * They use relative URLs so requests go through the Angular dev proxy.
 * The proxy.conf.json routes /api/* to the actual backend based on AppConsts.
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AppConsts } from '../../shared/AppConsts';
import { API_BASE_URL } from '../api-client/api-config';

// ================== DTOs ==================

export interface IAuthenticateModel {
    userNameOrEmailAddress: string;
    password: string;
    twoFactorVerificationCode?: string;
    rememberClient: boolean;
    twoFactorRememberClientToken?: string;
    singleSignIn?: boolean;
    returnUrl?: string;
    captchaResponse?: string;
}

export interface IAuthenticateResultModel {
    accessToken?: string;
    encryptedAccessToken?: string;
    expireInSeconds: number;
    shouldResetPassword: boolean;
    passwordResetCode?: string;
    userId: number;
    requiresTwoFactorVerification: boolean;
    twoFactorAuthProviders?: string[];
    twoFactorRememberClientToken?: string;
    returnUrl?: string;
    refreshToken?: string;
    refreshTokenExpireInSeconds: number;
}

export interface IRefreshTokenResult {
    accessToken?: string;
    encryptedAccessToken?: string;
    expireInSeconds: number;
    refreshToken?: string;
    refreshTokenExpireInSeconds: number;
}

export interface IUserLoginInfoDto {
    id: number;
    name?: string;
    surname?: string;
    userName?: string;
    emailAddress?: string;
    profilePictureId?: string;
    roles?: string[];
}

export interface ITenantLoginInfoDto {
    id: number;
    tenancyName?: string;
    name?: string;
}

export interface IApplicationInfoDto {
    version?: string;
    features?: { [key: string]: boolean };
}

export interface IGetCurrentLoginInformationsOutput {
    roles?: string[];
    user?: IUserLoginInfoDto;
    tenant?: ITenantLoginInfoDto;
    application?: IApplicationInfoDto;
}

// ================== Service Proxies ==================

@Injectable({ providedIn: 'root' })
export class TokenAuthServiceProxy {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(API_BASE_URL, { optional: true }) ?? '';

    /**
     * Get standard headers for API requests
     */
    private getHeaders(): HttpHeaders {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };

        // Add tenant header for logging/debugging
        if (AppConsts.tenancyName) {
            headers['X-Tenant-Name'] = AppConsts.tenancyName;
        }

        return new HttpHeaders(headers);
    }

    /**
     * Authenticate with username/email and password
     */
    authenticate(body: IAuthenticateModel): Observable<IAuthenticateResultModel> {
        const url = `${this.baseUrl}/api/TokenAuth/Authenticate`;
        console.log(`[TokenAuthServiceProxy] Authenticating to: ${url}`);
        console.log(`[TokenAuthServiceProxy] Request body:`, body);

        // ABP API returns { result: { ... }, success: true, ... }
        return this.http.post<{ result: IAuthenticateResultModel }>(url, body, {
            headers: this.getHeaders()
        }).pipe(
            map(response => {
                console.log(`[TokenAuthServiceProxy] Raw response:`, response);
                // Extract the result from ABP wrapper
                const result = response.result || response as unknown as IAuthenticateResultModel;
                console.log(`[TokenAuthServiceProxy] Extracted result:`, result);
                return result;
            }),
            catchError(error => {
                console.error(`[TokenAuthServiceProxy] Authentication error:`, error);
                return throwError(() => error);
            })
        );
    }

    /**
     * Refresh the access token
     */
    refreshToken(refreshToken: string): Observable<IRefreshTokenResult> {
        const url = `${this.baseUrl}/api/TokenAuth/RefreshToken`;

        return this.http.post<IRefreshTokenResult>(url, null, {
            params: { refreshToken },
            headers: this.getHeaders()
        }).pipe(
            map(response => response),
            catchError(error => throwError(() => error))
        );
    }

    /**
     * Logout the current user
     */
    logOut(): Observable<void> {
        const url = `${this.baseUrl}/api/TokenAuth/LogOut`;

        return this.http.get<void>(url, { headers: this.getHeaders() }).pipe(
            catchError(error => throwError(() => error))
        );
    }
}

@Injectable({ providedIn: 'root' })
export class SessionServiceProxy {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(API_BASE_URL, { optional: true }) ?? '';

    /**
     * Get standard headers
     */
    private getHeaders(): HttpHeaders {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };

        if (AppConsts.tenancyName) {
            headers['X-Tenant-Name'] = AppConsts.tenancyName;
        }

        return new HttpHeaders(headers);
    }

    /**
     * Get current login/session information
     */
    getCurrentLoginInformations(): Observable<IGetCurrentLoginInformationsOutput> {
        const url = `${this.baseUrl}/api/services/app/Session/GetCurrentLoginInformations`;

        return this.http.get<{ result: IGetCurrentLoginInformationsOutput }>(url, {
            headers: this.getHeaders()
        }).pipe(
            map(response => response.result),
            catchError(error => throwError(() => error))
        );
    }
}
