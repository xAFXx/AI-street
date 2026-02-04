import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { API_BASE_URL, PagedResult, ApiError } from './api-config';

/**
 * Query parameters for paginated requests.
 */
export interface PaginationParams {
    skipCount?: number;
    maxResultCount?: number;
    sorting?: string;
    filter?: string;
}

/**
 * Options for API requests.
 */
export interface RequestOptions {
    headers?: HttpHeaders | { [header: string]: string | string[] };
    params?: HttpParams | { [param: string]: string | string[] };
    withCredentials?: boolean;
}

/**
 * Base API Service
 * 
 * Provides a shared HTTP layer for all module-specific API services.
 * Handles common concerns like error handling, serialization, and headers.
 */
@Injectable({ providedIn: 'root' })
export class BaseApiService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(API_BASE_URL, { optional: true }) ?? '';

    /**
     * Perform a GET request.
     */
    get<T>(path: string, params?: Record<string, any>, options?: RequestOptions): Observable<T> {
        const url = this.buildUrl(path);
        const httpParams = this.buildParams(params);

        return this.http.get<T>(url, {
            ...options,
            params: httpParams,
            headers: this.buildHeaders(options?.headers)
        }).pipe(
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Perform a POST request.
     */
    post<T>(path: string, body?: any, options?: RequestOptions): Observable<T> {
        const url = this.buildUrl(path);

        return this.http.post<T>(url, body, {
            ...options,
            headers: this.buildHeaders(options?.headers)
        }).pipe(
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Perform a PUT request.
     */
    put<T>(path: string, body?: any, options?: RequestOptions): Observable<T> {
        const url = this.buildUrl(path);

        return this.http.put<T>(url, body, {
            ...options,
            headers: this.buildHeaders(options?.headers)
        }).pipe(
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Perform a DELETE request.
     */
    delete<T>(path: string, params?: Record<string, any>, options?: RequestOptions): Observable<T> {
        const url = this.buildUrl(path);
        const httpParams = this.buildParams(params);

        return this.http.delete<T>(url, {
            ...options,
            params: httpParams,
            headers: this.buildHeaders(options?.headers)
        }).pipe(
            catchError(error => this.handleError(error))
        );
    }

    /**
     * Perform a paginated GET request.
     */
    getPaged<T>(
        path: string,
        pagination?: PaginationParams,
        additionalParams?: Record<string, any>
    ): Observable<PagedResult<T>> {
        const rawParams: Record<string, string | undefined> = {
            ...additionalParams,
            SkipCount: pagination?.skipCount?.toString(),
            MaxResultCount: pagination?.maxResultCount?.toString(),
            Sorting: pagination?.sorting,
            Filter: pagination?.filter
        };

        // Filter out undefined/null values
        const params: Record<string, string> = Object.fromEntries(
            Object.entries(rawParams).filter(([_, v]) => v !== undefined && v !== null)
        ) as Record<string, string>;

        return this.get<PagedResult<T>>(path, params);
    }

    // ==================== Private Methods ====================

    private buildUrl(path: string): string {
        // If path is already absolute URL, return as-is
        if (path.startsWith('http://') || path.startsWith('https://')) {
            return path;
        }

        // Ensure path starts with /
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;

        // Remove trailing slash from baseUrl if present
        const normalizedBase = this.baseUrl.endsWith('/')
            ? this.baseUrl.slice(0, -1)
            : this.baseUrl;

        return `${normalizedBase}${normalizedPath}`;
    }

    private buildParams(params?: Record<string, any>): HttpParams {
        let httpParams = new HttpParams();

        if (params) {
            Object.keys(params).forEach(key => {
                const value = params[key];
                if (value !== undefined && value !== null) {
                    if (Array.isArray(value)) {
                        value.forEach(v => httpParams = httpParams.append(key, v.toString()));
                    } else {
                        httpParams = httpParams.set(key, value.toString());
                    }
                }
            });
        }

        return httpParams;
    }

    private buildHeaders(customHeaders?: HttpHeaders | { [header: string]: string | string[] }): HttpHeaders {
        let headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        });

        if (customHeaders) {
            if (customHeaders instanceof HttpHeaders) {
                customHeaders.keys().forEach(key => {
                    headers = headers.set(key, customHeaders.get(key)!);
                });
            } else {
                Object.keys(customHeaders).forEach(key => {
                    headers = headers.set(key, customHeaders[key] as string);
                });
            }
        }

        return headers;
    }

    private handleError(error: HttpErrorResponse): Observable<never> {
        let apiError: ApiError;

        if (error.error instanceof ErrorEvent) {
            // Client-side error
            apiError = {
                code: 'CLIENT_ERROR',
                message: error.error.message
            };
        } else {
            // Server-side error
            apiError = {
                code: error.error?.error?.code || `HTTP_${error.status}`,
                message: error.error?.error?.message || error.message,
                details: error.error?.error?.details,
                validationErrors: error.error?.error?.validationErrors
            };
        }

        console.error('[API Error]', apiError);
        return throwError(() => apiError);
    }
}
