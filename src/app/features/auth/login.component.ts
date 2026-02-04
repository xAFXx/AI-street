import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { CheckboxModule } from 'primeng/checkbox';
import { AuthService } from '../../core/services/auth.service';
import { AppConsts } from '../../shared/AppConsts';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        InputTextModule,
        ButtonModule,
        CardModule,
        DividerModule,
        MessageModule,
        PasswordModule,
        CheckboxModule
    ],
    template: `
        <div class="login-container">
            <div class="login-card">
                <!-- Logo & Header -->
                <div class="text-center mb-5">
                    <div class="logo-icon mb-3">
                        <i class="pi pi-bolt text-5xl"></i>
                    </div>
                    <h1 class="text-3xl font-bold m-0 mb-2 text-primary">APPRX True North</h1>
                    <p class="text-500 m-0">The intelligent co-worker for all experts</p>
                </div>

                <!-- Login Form -->
                <div class="login-form">
                    <!-- Tenant Selection -->
                    <div class="field mb-4">
                        <label class="block text-500 font-medium mb-2">
                            <i class="pi pi-building mr-2"></i>Tenant
                        </label>
                        <div class="p-inputgroup">
                            <span class="p-inputgroup-addon">
                                <i class="pi pi-globe"></i>
                            </span>
                            <input 
                                pInputText 
                                [(ngModel)]="tenantInput"
                                class="w-full"
                                placeholder="Enter tenant name or full URL (e.g., demo or https://demo_connectapi...)"
                                (blur)="onTenantChange()"
                                (keyup.enter)="focusUsername()">
                        </div>
                        <small class="text-500 mt-1 block">
                            Tenant: {{ tenantName || '—' }} | API: {{ resolvedApiUrl || 'Enter tenant to see API URL' }}
                        </small>
                    </div>

                    <p-divider></p-divider>

                    <div class="field mb-4">
                        <label class="block text-500 font-medium mb-2">
                            <i class="pi pi-user mr-2"></i>Email or Username
                        </label>
                        <input 
                            pInputText 
                            [(ngModel)]="username"
                            class="w-full p-3 text-lg"
                            placeholder="Enter your email or username"
                            (keyup.enter)="focusPassword()"
                            #usernameInput>
                    </div>

                    <div class="field mb-4">
                        <label class="block text-500 font-medium mb-2">
                            <i class="pi pi-lock mr-2"></i>Password
                        </label>
                        <p-password 
                            [(ngModel)]="password"
                            [feedback]="false"
                            [toggleMask]="true"
                            styleClass="w-full"
                            inputStyleClass="w-full p-3 text-lg"
                            placeholder="Enter your password"
                            (keyup.enter)="login()"
                            #passwordInput>
                        </p-password>
                    </div>

                    <div class="flex align-items-center justify-content-between mb-4">
                        <div class="flex align-items-center">
                            <p-checkbox 
                                [(ngModel)]="rememberMe" 
                                [binary]="true" 
                                inputId="rememberMe">
                            </p-checkbox>
                            <label for="rememberMe" class="ml-2 text-500 text-sm cursor-pointer">Remember me</label>
                        </div>
                    </div>

                    <p-message 
                        *ngIf="errorMessage" 
                        severity="error" 
                        [text]="errorMessage"
                        styleClass="w-full mb-3">
                    </p-message>

                    <button 
                        pButton 
                        label="Sign In" 
                        icon="pi pi-sign-in"
                        class="w-full p-3 text-lg"
                        [loading]="isLoading"
                        [disabled]="!username.trim() || !password || !tenantName.trim()"
                        (click)="login()">
                    </button>
                </div>

                <!-- Footer -->
                <div class="text-center mt-4">
                    <p class="text-500 text-sm m-0">
                        Secure authentication powered by Axilla
                    </p>
                </div>
            </div>

            <!-- Footer -->
            <div class="login-footer text-center mt-4">
                <span class="text-500 text-sm">© 2026 APPRX True North</span>
            </div>
        </div>
    `,
    styles: [`
        :host {
            display: block;
            min-height: 100vh;
        }

        .login-container {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2rem;
        }

        .login-card {
            background: var(--surface-card);
            border-radius: 1rem;
            padding: 2.5rem;
            width: 100%;
            max-width: 420px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            border: 1px solid var(--surface-border);
        }

        .logo-icon {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: var(--primary-color);
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto;
        }

        .logo-icon i {
            color: white !important;
        }

        :host ::ng-deep .p-inputtext:focus {
            box-shadow: 0 0 0 2px var(--primary-color);
        }

        :host ::ng-deep .p-password {
            width: 100%;
        }

        :host ::ng-deep .p-inputgroup-addon {
            background: var(--surface-100);
            border-color: var(--surface-border);
        }
    `]
})
export class LoginComponent implements OnInit {
    private router: Router;
    private authService: AuthService;

    tenantInput = '';
    tenantName = '';
    username = '';
    password = '';
    rememberMe = false;
    errorMessage = '';
    isLoading = false;
    resolvedApiUrl = '';

    constructor(router: Router, authService: AuthService) {
        this.router = router;
        this.authService = authService;
    }

    ngOnInit(): void {
        // Load saved tenant from localStorage
        this.tenantName = localStorage.getItem('tenancy_name') || '';
        const customUrl = localStorage.getItem('custom_api_url');

        if (customUrl) {
            // Restore full custom URL
            this.tenantInput = customUrl;
            AppConsts.setDirectUrl(customUrl, this.tenantName);
        } else if (this.tenantName) {
            // Simple tenant name - use default plattform.nl format
            this.tenantInput = this.tenantName;
            AppConsts.setTenancy(this.tenantName);
        }

        this.updateResolvedUrl();
    }

    onTenantChange(): void {
        const input = this.tenantInput.trim();
        if (!input) return;

        console.log('[Login] onTenantChange input:', input);

        // Check if input is a URL:
        // - Contains :// (explicit protocol)
        // - Contains _connectapi (well-known pattern)
        // - Contains a dot and common TLD patterns (looks like a domain)
        const isFullUrl = input.includes('://') ||
            input.includes('_connectapi') ||
            /\.(nl|eu|com|org|net|io)/i.test(input);

        console.log('[Login] isFullUrl:', isFullUrl);

        if (isFullUrl) {
            // Full URL provided - extract tenant name for display, but use full URL
            const extracted = this.extractTenantFromUrl(input);
            this.tenantName = extracted || 'custom';

            // Normalize the URL (ensure https://)
            let fullUrl = input;
            if (!fullUrl.includes('://')) {
                fullUrl = 'https://' + fullUrl;
            }

            // Migrate any deprecated domains to plattform.nl
            fullUrl = AppConsts.migrateUrl(fullUrl);

            console.log('[Login] Setting direct URL:', fullUrl);
            console.log('[Login] Extracted tenant:', this.tenantName);

            // Use the full URL directly
            AppConsts.setDirectUrl(fullUrl, this.tenantName);
            localStorage.setItem('tenancy_name', this.tenantName);
            localStorage.setItem('custom_api_url', fullUrl);
        } else {
            // Simple tenant name - use plattform.nl default format
            this.tenantName = input;
            console.log('[Login] Using simple tenant, plattform.nl format:', this.tenantName);
            AppConsts.setTenancy(this.tenantName);
            localStorage.setItem('tenancy_name', this.tenantName);
            localStorage.removeItem('custom_api_url');
        }

        console.log('[Login] AppConsts.remoteServiceBaseUrl:', AppConsts.remoteServiceBaseUrl);
        this.updateResolvedUrl();
    }

    /**
     * Extract tenant name from a full URL.
     * Looks for the pattern: {tenant}_connectapi in the hostname.
     * Handles environment prefixes: dev_, acc_, acc-
     * E.g., https://dev_demo_connectapi.example.com -> 'demo'
     * E.g., https://demo_connectapi.example.com -> 'demo'
     */
    private extractTenantFromUrl(url: string): string | null {
        try {
            // Ensure it's a valid URL
            let urlToParse = url;
            if (!urlToParse.includes('://')) {
                urlToParse = 'https://' + urlToParse;
            }

            const parsed = new URL(urlToParse);
            const hostname = parsed.hostname; // e.g., dev_demo_connectapi.example.com

            // Find the part before _connectapi
            const connectApiIndex = hostname.indexOf('_connectapi');
            if (connectApiIndex > 0) {
                // Extract everything before _connectapi
                let subdomain = hostname.substring(0, connectApiIndex);

                // Strip environment prefixes: dev_, acc_, acc-
                const envPrefixes = ['dev_', 'acc_', 'acc-', 'tst_', 'prd_'];
                for (const prefix of envPrefixes) {
                    if (subdomain.startsWith(prefix)) {
                        subdomain = subdomain.substring(prefix.length);
                        break;
                    }
                }

                return subdomain;
            }

            return null;
        } catch {
            return null;
        }
    }

    private updateResolvedUrl(): void {
        this.resolvedApiUrl = AppConsts.remoteServiceBaseUrl;
    }

    focusUsername(): void {
        const usernameInput = document.querySelector('input[placeholder*="email"]') as HTMLInputElement;
        if (usernameInput) {
            usernameInput.focus();
        }
    }

    focusPassword(): void {
        // Focus password field on Enter from username
        const passwordInput = document.querySelector('p-password input') as HTMLInputElement;
        if (passwordInput) {
            passwordInput.focus();
        }
    }

    login(): void {
        if (!this.username.trim() || !this.password || !this.tenantName.trim()) return;

        // Note: Don't call setTenancy here - it was already set in onTenantChange()
        // and could overwrite a custom URL with the default apprx.eu format

        this.isLoading = true;
        this.errorMessage = '';

        this.authService.login(this.username, this.password, this.rememberMe).subscribe({
            next: (result) => {
                console.log('[LoginComponent] Login result:', result);
                this.isLoading = false;

                if (result.accessToken) {
                    console.log('[LoginComponent] Login successful, navigating to dashboard...');
                    // Successful login - navigate to dashboard
                    this.router.navigate(['/dashboard']).then(success => {
                        console.log('[LoginComponent] Navigation result:', success);
                    });
                } else if (result.requiresTwoFactorVerification) {
                    this.errorMessage = 'Two-factor authentication is required but not yet implemented.';
                } else if (result.shouldResetPassword) {
                    this.errorMessage = 'Password reset is required. Please contact your administrator.';
                }
            },
            error: (error) => {
                this.isLoading = false;

                if (error.status === 401 || error.status === 400) {
                    this.errorMessage = 'Invalid username or password';
                } else if (error.status === 0) {
                    this.errorMessage = 'Unable to connect to authentication server. Please check your network.';
                } else {
                    this.errorMessage = error.message || 'Login failed. Please try again.';
                }
            }
        });
    }
}
