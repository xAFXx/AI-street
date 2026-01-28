import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { MessageModule } from 'primeng/message';
import { UserManagementService } from '../../core/services/user-management.service';

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
        MessageModule
    ],
    template: `
        <div class="login-container">
            <div class="login-card">
                <!-- Logo & Header -->
                <div class="text-center mb-5">
                    <div class="logo-icon mb-3">
                        <i class="pi pi-bolt text-5xl"></i>
                    </div>
                    <h1 class="text-3xl font-bold m-0 mb-2 text-primary">AI Street</h1>
                    <p class="text-500 m-0">Intelligent Report Management</p>
                </div>

                <!-- Login Form -->
                <div class="login-form">
                    <div class="field mb-4">
                        <label class="block text-500 font-medium mb-2">
                            <i class="pi pi-user mr-2"></i>Email or Username
                        </label>
                        <input 
                            pInputText 
                            [(ngModel)]="loginInput"
                            class="w-full p-3 text-lg"
                            placeholder="Enter your email or username"
                            (keyup.enter)="login()"
                            autofocus>
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
                        [disabled]="!loginInput.trim()"
                        (click)="login()">
                    </button>
                </div>

                <p-divider align="center">
                    <span class="text-500 text-sm">New here?</span>
                </p-divider>

                <div class="text-center">
                    <p class="text-500 text-sm m-0">
                        Just enter your email or name to get started.<br>
                        No password required.
                    </p>
                </div>

                <!-- Demo Info -->
                <div class="demo-info mt-4">
                    <div class="surface-100 border-round-lg p-3">
                        <div class="flex align-items-center gap-2 mb-2">
                            <i class="pi pi-info-circle text-primary"></i>
                            <span class="font-bold text-sm">Quick Access</span>
                        </div>
                        <div class="text-sm text-500">
                            Admin users: <strong>oleg</strong> or <strong>sascha</strong>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="login-footer text-center mt-4">
                <span class="text-500 text-sm">© 2026 AI Street Manager</span>
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
    `]
})
export class LoginComponent {
    private userService = inject(UserManagementService);
    private router = inject(Router);

    loginInput = '';
    errorMessage = '';
    isLoading = false;

    login(): void {
        if (!this.loginInput.trim()) return;

        this.isLoading = true;
        this.errorMessage = '';

        // Simulate slight delay for UX
        setTimeout(() => {
            const result = this.userService.login(this.loginInput);

            if (result.success && result.user) {
                // Navigate based on role
                if (result.user.role === 'admin') {
                    this.router.navigate(['/dashboard']);
                } else {
                    this.router.navigate(['/results']);
                }
            } else {
                this.errorMessage = result.error || 'Login failed';
            }

            this.isLoading = false;
        }, 500);
    }
}
