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
import { TenantCustomizationService } from '../../core/services/tenant-customization.service';

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
                    <div class="logo-area mb-3">
                        <img *ngIf="logoUrl"
                             [src]="logoUrl"
                             alt="Tenant logo"
                             class="tenant-logo"
                             (error)="onLogoError()">
                        <div *ngIf="!logoUrl" class="logo-icon">
                            <i class="pi pi-bolt text-5xl"></i>
                        </div>
                    </div>
                    <h1 class="text-3xl font-bold m-0 mb-2 text-primary">Apprx 2.0</h1>
                    <p class="text-500 m-0">The intelligent co-worker for all experts</p>
                </div>

                <!-- Tenant Display -->
                <div class="tenant-badge mb-4" *ngIf="tenantName">
                    <i class="pi pi-building mr-2"></i>
                    <span class="tenant-label">{{ tenantName }}</span>
                </div>

                <!-- Login Form -->
                <div class="login-form">
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
                        [disabled]="!username.trim() || !password"
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
                <span class="text-500 text-sm">© 2026 Apprx 2.0</span>
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

        .logo-area {
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .tenant-logo {
            max-height: 60px;
            max-width: 240px;
            object-fit: contain;
        }

        .logo-icon {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: var(--primary-color);
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .logo-icon i {
            color: white !important;
        }

        .tenant-badge {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0.5rem 1rem;
            background: var(--surface-100);
            border-radius: 0.5rem;
            border: 1px solid var(--surface-border);
        }

        .tenant-badge i {
            color: var(--primary-color);
        }

        .tenant-label {
            font-weight: 600;
            color: var(--text-color);
            text-transform: capitalize;
        }

        :host ::ng-deep .p-inputtext:focus {
            box-shadow: 0 0 0 2px var(--primary-color);
        }

        :host ::ng-deep .p-password {
            width: 100%;
        }
    `]
})
export class LoginComponent implements OnInit {
    private router: Router;
    private authService: AuthService;
    private tenantCustomization: TenantCustomizationService;

    tenantName = '';
    username = '';
    password = '';
    rememberMe = false;
    errorMessage = '';
    isLoading = false;
    logoUrl: string | null = null;

    constructor(router: Router, authService: AuthService, tenantCustomization: TenantCustomizationService) {
        this.router = router;
        this.authService = authService;
        this.tenantCustomization = tenantCustomization;
    }

    ngOnInit(): void {
        // Tenant is already resolved by AppPreBootstrap from the URL subdomain
        this.tenantName = AppConsts.tenancyName || localStorage.getItem('tenancy_name') || '';
        this.logoUrl = this.tenantCustomization.getLogoUrl('light');
    }

    /** Fallback if the logo image fails to load */
    onLogoError(): void {
        this.logoUrl = null;
    }

    focusPassword(): void {
        const passwordInput = document.querySelector('p-password input') as HTMLInputElement;
        if (passwordInput) {
            passwordInput.focus();
        }
    }

    login(): void {
        if (!this.username.trim() || !this.password) return;

        this.isLoading = true;
        this.errorMessage = '';

        this.authService.login(this.username, this.password, this.rememberMe).subscribe({
            next: (result) => {
                console.log('[LoginComponent] Login result:', result);
                this.isLoading = false;

                if (result.accessToken) {
                    console.log('[LoginComponent] Login successful, navigating to app-nexus...');
                    this.router.navigate(['/app-nexus']).then(success => {
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
