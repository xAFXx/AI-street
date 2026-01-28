import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectButtonModule } from 'primeng/selectbutton';
import { StepsModule } from 'primeng/steps';
import { PasswordModule } from 'primeng/password';
import { DividerModule } from 'primeng/divider';
import { MenuItem } from 'primeng/api';
import { UserService, UserRole } from '../../core/services/user.service';
import { setApiKey, hasApiKey } from '../../features/template-editor/ai-providers/ai-config';

@Component({
    selector: 'app-onboarding-dialog',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        DialogModule,
        ButtonModule,
        InputTextModule,
        SelectButtonModule,
        StepsModule,
        PasswordModule,
        DividerModule
    ],
    template: `
        <p-dialog 
            [(visible)]="visible" 
            [modal]="true" 
            [closable]="false"
            [draggable]="false"
            [resizable]="false"
            [style]="{ width: '500px' }"
            styleClass="onboarding-dialog">
            
            <!-- Header with gradient -->
            <ng-template pTemplate="header">
                <div class="w-full text-center">
                    <div class="text-4xl mb-2">🚀</div>
                    <h2 class="m-0 text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">
                        Welcome to AI Street
                    </h2>
                    <p class="text-500 mt-2 mb-0">Let's get you set up in just a moment</p>
                </div>
            </ng-template>

            <!-- Step Indicators -->
            <div class="flex justify-content-center gap-2 mb-4">
                <span *ngFor="let s of [1,2,3]" 
                    class="w-3rem h-1 border-round transition-all transition-duration-300"
                    [class.bg-primary]="step >= s"
                    [class.surface-300]="step < s">
                </span>
            </div>

            <!-- Step 1: User Info -->
            <div *ngIf="step === 1" class="fadein animation-duration-300">
                <h3 class="mt-0 mb-3 text-center">👤 What should we call you?</h3>
                
                <div class="field mb-4">
                    <label class="block text-500 font-medium mb-2">Your Name</label>
                    <input pInputText 
                        [(ngModel)]="userName" 
                        class="w-full p-3 text-lg"
                        placeholder="Enter your name"
                        autofocus>
                </div>

                <div class="field">
                    <label class="block text-500 font-medium mb-2">Your Role</label>
                    <div class="flex gap-3">
                        <div *ngFor="let role of roleOptions" 
                            class="flex-1 p-3 border-round-lg cursor-pointer transition-all transition-duration-200"
                            [class.surface-100]="userRole !== role.value"
                            [class.surface-card]="userRole !== role.value"
                            [class.border-primary]="userRole === role.value"
                            [class.border-2]="userRole === role.value"
                            [class.surface-primary]="userRole === role.value"
                            [class.bg-primary-50]="userRole === role.value"
                            style="border: 2px solid transparent"
                            (click)="userRole = role.value">
                            <div class="text-center">
                                <i [class]="role.icon + ' text-3xl mb-2'" 
                                   [class.text-primary]="userRole === role.value"></i>
                                <div class="font-bold" [class.text-primary]="userRole === role.value">{{ role.label }}</div>
                                <div class="text-xs text-500 mt-1">{{ role.description }}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Step 2: AI Configuration (Optional) -->
            <div *ngIf="step === 2" class="fadein animation-duration-300">
                <h3 class="mt-0 mb-3 text-center">🤖 AI Configuration</h3>
                <p class="text-500 text-center mb-4">Optional: Connect your AI provider for smart features</p>

                <div class="field mb-4">
                    <label class="block text-500 font-medium mb-2">
                        <i class="pi pi-key mr-2"></i>OpenAI API Key
                    </label>
                    <p-password 
                        [(ngModel)]="openaiKey" 
                        [toggleMask]="true"
                        [feedback]="false"
                        styleClass="w-full"
                        inputStyleClass="w-full p-3"
                        placeholder="sk-...">
                    </p-password>
                    <small class="text-500 block mt-2">
                        <i class="pi pi-info-circle mr-1"></i>
                        Your key is stored locally and never sent to our servers
                    </small>
                </div>

                <div class="surface-100 border-round-lg p-3 flex align-items-center gap-3">
                    <i class="pi pi-lightbulb text-2xl text-yellow-500"></i>
                    <div class="text-sm">
                        <strong>Don't have an API key?</strong><br>
                        <span class="text-500">You can add it later in settings. Skip this step for now.</span>
                    </div>
                </div>
            </div>

            <!-- Step 3: All Set -->
            <div *ngIf="step === 3" class="fadein animation-duration-300 text-center">
                <div class="text-6xl mb-3">🎉</div>
                <h3 class="mt-0 mb-2">You're all set, {{ userName || 'friend' }}!</h3>
                <p class="text-500 mb-4">
                    {{ userRole === 'admin' ? 'You have full access to all features.' : 'You can access True North and Results.' }}
                </p>
                
                <div class="surface-100 border-round-lg p-4 text-left">
                    <div class="flex align-items-center gap-3 mb-3">
                        <i class="pi pi-user text-xl text-primary"></i>
                        <div>
                            <div class="text-500 text-sm">Name</div>
                            <div class="font-bold">{{ userName || 'Guest User' }}</div>
                        </div>
                    </div>
                    <div class="flex align-items-center gap-3 mb-3">
                        <i class="pi pi-shield text-xl text-primary"></i>
                        <div>
                            <div class="text-500 text-sm">Role</div>
                            <div class="font-bold">{{ userRole === 'admin' ? 'Administrator' : 'End User' }}</div>
                        </div>
                    </div>
                    <div class="flex align-items-center gap-3">
                        <i class="pi pi-microchip text-xl" [class.text-green-500]="hasApiKeyConfigured" [class.text-500]="!hasApiKeyConfigured"></i>
                        <div>
                            <div class="text-500 text-sm">AI Provider</div>
                            <div class="font-bold">{{ hasApiKeyConfigured ? 'Connected' : 'Not configured' }}</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <ng-template pTemplate="footer">
                <div class="flex justify-content-between w-full">
                    <p-button 
                        *ngIf="step > 1"
                        label="Back" 
                        icon="pi pi-arrow-left"
                        styleClass="p-button-text"
                        (onClick)="previousStep()">
                    </p-button>
                    <div *ngIf="step === 1"></div>
                    
                    <p-button 
                        *ngIf="step < 3"
                        [label]="step === 2 ? (openaiKey ? 'Continue' : 'Skip') : 'Continue'"
                        icon="pi pi-arrow-right"
                        iconPos="right"
                        [disabled]="step === 1 && !userName"
                        (onClick)="nextStep()">
                    </p-button>
                    
                    <p-button 
                        *ngIf="step === 3"
                        label="Get Started"
                        icon="pi pi-check"
                        iconPos="right"
                        styleClass="p-button-success"
                        (onClick)="complete()">
                    </p-button>
                </div>
            </ng-template>
        </p-dialog>
    `,
    styles: [`
        :host ::ng-deep .onboarding-dialog {
            .p-dialog-header {
                padding-bottom: 0;
                border-bottom: none;
            }
            .p-dialog-content {
                padding-top: 1rem;
            }
            .p-dialog-footer {
                padding-top: 1.5rem;
            }
        }
        
        .bg-gradient-to-r {
            background: linear-gradient(90deg, var(--primary-color), #9333ea);
            -webkit-background-clip: text;
            background-clip: text;
        }
    `]
})
export class OnboardingDialogComponent implements OnInit {
    private userService = inject(UserService);

    visible = false;
    step = 1;

    userName = '';
    userRole: UserRole = 'enduser';
    openaiKey = '';

    roleOptions = [
        {
            value: 'enduser' as UserRole,
            label: 'End User',
            icon: 'pi pi-user',
            description: 'View reports & results'
        },
        {
            value: 'admin' as UserRole,
            label: 'Admin',
            icon: 'pi pi-shield',
            description: 'Full system access'
        }
    ];

    get hasApiKeyConfigured(): boolean {
        return !!this.openaiKey || hasApiKey('openai');
    }

    ngOnInit() {
        this.checkFirstTimeUser();
    }

    private checkFirstTimeUser(): void {
        const hasCompletedOnboarding = localStorage.getItem('onboarding_completed');
        const currentUser = this.userService.getCurrentUser();

        // Show if never completed onboarding
        if (!hasCompletedOnboarding) {
            this.visible = true;
            // Pre-fill with existing data if any
            this.userName = currentUser.name !== 'Guest User' ? currentUser.name : '';
            this.userRole = currentUser.role;
        }
    }

    nextStep(): void {
        if (this.step < 3) {
            // Save data as we go
            if (this.step === 1) {
                this.userService.setUser({
                    name: this.userName || 'Guest User',
                    role: this.userRole
                });
            } else if (this.step === 2 && this.openaiKey) {
                setApiKey('openai', this.openaiKey);
            }
            this.step++;
        }
    }

    previousStep(): void {
        if (this.step > 1) {
            this.step--;
        }
    }

    complete(): void {
        // Save final state
        this.userService.setUser({
            name: this.userName || 'Guest User',
            role: this.userRole
        });

        if (this.openaiKey) {
            setApiKey('openai', this.openaiKey);
        }

        // Mark onboarding as complete
        localStorage.setItem('onboarding_completed', 'true');

        this.visible = false;
    }
}
