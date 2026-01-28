import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { DividerModule } from 'primeng/divider';
import { UserManagementService } from '../../core/services/user-management.service';
import { setApiKey, hasApiKey } from '../../features/template-editor/ai-providers/ai-config';

@Component({
    selector: 'app-onboarding-dialog',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        DialogModule,
        ButtonModule,
        PasswordModule,
        DividerModule
    ],
    template: `
        <p-dialog 
            [(visible)]="visible" 
            [modal]="true" 
            [closable]="true"
            [draggable]="false"
            [resizable]="false"
            [style]="{ width: '450px' }"
            styleClass="onboarding-dialog">
            
            <!-- Header -->
            <ng-template pTemplate="header">
                <div class="w-full text-center">
                    <div class="text-4xl mb-2">🤖</div>
                    <h2 class="m-0 text-xl font-bold text-primary">
                        AI Configuration
                    </h2>
                    <p class="text-500 mt-2 mb-0 text-sm">Connect your AI provider for smart features</p>
                </div>
            </ng-template>

            <div class="fadein animation-duration-300">
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
                        <i class="pi pi-lock mr-1"></i>
                        Your key is stored locally and never sent to our servers
                    </small>
                </div>

                <p-divider></p-divider>

                <div class="surface-100 border-round-lg p-3 flex align-items-center gap-3">
                    <i class="pi pi-lightbulb text-2xl text-yellow-500"></i>
                    <div class="text-sm">
                        <strong>Don't have an API key?</strong><br>
                        <span class="text-500">Get one at <a href="https://platform.openai.com/api-keys" target="_blank" class="text-primary">platform.openai.com</a></span>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <ng-template pTemplate="footer">
                <div class="flex justify-content-between w-full gap-2">
                    <p-button 
                        label="Skip for now" 
                        styleClass="p-button-text"
                        (onClick)="skip()">
                    </p-button>
                    
                    <p-button 
                        label="Save & Continue"
                        icon="pi pi-check"
                        iconPos="right"
                        [disabled]="!openaiKey"
                        (onClick)="save()">
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
    `]
})
export class OnboardingDialogComponent implements OnInit {
    private userService = inject(UserManagementService);

    visible = false;
    openaiKey = '';

    ngOnInit() {
        this.checkApiKeyNeeded();
    }

    private checkApiKeyNeeded(): void {
        // Only show if user is logged in and API key not configured
        if (this.userService.isLoggedIn() && !hasApiKey('openai')) {
            // Check if user has already dismissed this dialog
            const dismissed = localStorage.getItem('api_key_dialog_dismissed');
            if (!dismissed) {
                this.visible = true;
            }
        }
    }

    save(): void {
        if (this.openaiKey) {
            setApiKey('openai', this.openaiKey);
        }
        this.visible = false;
    }

    skip(): void {
        // Remember that user skipped, don't show again this session
        localStorage.setItem('api_key_dialog_dismissed', 'true');
        this.visible = false;
    }
}

