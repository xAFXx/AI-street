import { Component, OnInit, inject, signal, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { DividerModule } from 'primeng/divider';
import { InputTextModule } from 'primeng/inputtext';
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
        DividerModule,
        InputTextModule
    ],
    template: `
        <p-dialog 
            [(visible)]="visible" 
            [modal]="true" 
            [closable]="true"
            [draggable]="false"
            [resizable]="false"
            [style]="{ width: '480px' }"
            styleClass="api-key-dialog">
            
            <!-- Header with OpenAI Branding -->
            <ng-template pTemplate="header">
                <div class="w-full">
                    <!-- OpenAI Logo/Brand -->
                    <div class="openai-brand text-center mb-3">
                        <div class="openai-logo-container mx-auto mb-3">
                            <svg viewBox="0 0 24 24" width="56" height="56" fill="currentColor" class="openai-logo">
                                <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.896zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08-4.778 2.758a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
                            </svg>
                        </div>
                        <h2 class="m-0 text-2xl font-bold">Connect OpenAI</h2>
                        <p class="text-500 mt-2 mb-0">Power your document analysis with AI</p>
                    </div>
                </div>
            </ng-template>

            <div class="fadein animation-duration-300">
                <!-- Feature highlights -->
                <div class="features-grid mb-4">
                    <div class="feature-item flex align-items-center gap-2 mb-2">
                        <i class="pi pi-check-circle text-green-500"></i>
                        <span class="text-sm">Intelligent document extraction</span>
                    </div>
                    <div class="feature-item flex align-items-center gap-2 mb-2">
                        <i class="pi pi-check-circle text-green-500"></i>
                        <span class="text-sm">Automated schema mapping</span>
                    </div>
                    <div class="feature-item flex align-items-center gap-2 mb-2">
                        <i class="pi pi-check-circle text-green-500"></i>
                        <span class="text-sm">Vision API for PDF & image analysis</span>
                    </div>
                </div>

                <p-divider></p-divider>

                <!-- API Key Input -->
                <div class="field mb-4">
                    <label class="block font-medium mb-2">
                        <i class="pi pi-key mr-2 text-primary"></i>Your OpenAI API Key
                    </label>
                    <div class="p-inputgroup">
                        <span class="p-inputgroup-addon">
                            <i class="pi pi-lock"></i>
                        </span>
                        <input 
                            pInputText
                            [type]="showKey() ? 'text' : 'password'"
                            [(ngModel)]="openaiKey" 
                            class="w-full"
                            placeholder="sk-proj-...">
                        <button 
                            type="button"
                            pButton
                            [icon]="showKey() ? 'pi pi-eye-slash' : 'pi pi-eye'"
                            class="p-button-text p-button-secondary"
                            (click)="showKey.set(!showKey())">
                        </button>
                    </div>
                    <small class="text-500 flex align-items-center gap-1 mt-2">
                        <i class="pi pi-shield text-green-600"></i>
                        Stored securely in your browser only — never sent to external servers
                    </small>
                </div>

                <!-- Get API Key Help Box -->
                <div class="help-box surface-50 border-round-xl p-4">
                    <div class="flex align-items-start gap-3">
                        <div class="help-icon flex-shrink-0">
                            <i class="pi pi-question-circle text-3xl text-primary"></i>
                        </div>
                        <div>
                            <strong class="block mb-1">Need an API key?</strong>
                            <span class="text-600 text-sm block mb-2">
                                Create one for free at OpenAI's platform. You'll need to add billing, but there's $5 free credit for new accounts.
                            </span>
                            <a href="https://platform.openai.com/api-keys" target="_blank" 
                                class="p-button p-button-sm p-button-outlined inline-flex align-items-center gap-2">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                    <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.896zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08-4.778 2.758a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
                                </svg>
                                Get API Key
                                <i class="pi pi-external-link text-xs"></i>
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <ng-template pTemplate="footer">
                <div class="flex justify-content-between w-full gap-2">
                    <p-button 
                        label="Skip for now" 
                        styleClass="p-button-text p-button-secondary"
                        (onClick)="skip()">
                    </p-button>
                    
                    <p-button 
                        label="Save & Enable AI"
                        icon="pi pi-bolt"
                        iconPos="right"
                        [disabled]="!openaiKey || !isValidKey()"
                        (onClick)="save()">
                    </p-button>
                </div>
            </ng-template>
        </p-dialog>
    `,
    styles: [`
        :host ::ng-deep .api-key-dialog {
            .p-dialog {
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            }
            
            .p-dialog-header {
                padding: 1.5rem 1.5rem 0.5rem;
                border-bottom: none;
                background: linear-gradient(135deg, rgba(16, 163, 127, 0.05) 0%, transparent 100%);
            }
            
            .p-dialog-content {
                padding: 1rem 1.5rem;
            }
            
            .p-dialog-footer {
                padding: 1rem 1.5rem 1.5rem;
                border-top: 1px solid var(--surface-200);
            }
        }

        .openai-logo-container {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #10a37f 0%, #1a7f64 100%);
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 10px 40px rgba(16, 163, 127, 0.3);
            animation: float 3s ease-in-out infinite;
        }

        .openai-logo {
            color: white;
        }

        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
        }

        .features-grid {
            background: var(--surface-50);
            border-radius: 12px;
            padding: 1rem;
        }

        .feature-item {
            transition: transform 0.2s ease;
        }

        .feature-item:hover {
            transform: translateX(4px);
        }

        .help-box {
            border: 1px solid var(--surface-200);
            transition: border-color 0.2s ease;
        }

        .help-box:hover {
            border-color: var(--primary-200);
        }
    `]
})
export class OnboardingDialogComponent implements OnInit {
    private userService = inject(UserManagementService);

    @Input() forceShow = false;
    visible = false;
    openaiKey = '';
    showKey = signal(false);

    @Output() apiKeySaved = new EventEmitter<void>();
    @Output() dialogClosed = new EventEmitter<void>();

    ngOnInit() {
        // If forceShow is true, show immediately without checking login status
        if (this.forceShow) {
            this.visible = true;
        } else {
            this.checkApiKeyNeeded();
        }
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

    /**
     * Public method to open the dialog from external components
     */
    public show(): void {
        this.visible = true;
    }

    /**
     * Check if the entered key looks valid (basic format check)
     */
    isValidKey(): boolean {
        const key = this.openaiKey.trim();
        // OpenAI keys typically start with 'sk-' and are 40+ characters
        return key.length >= 40 && (key.startsWith('sk-') || key.startsWith('sk-proj-'));
    }

    save(): void {
        if (this.openaiKey && this.isValidKey()) {
            setApiKey('openai', this.openaiKey.trim());
            this.visible = false;
            this.apiKeySaved.emit();
        }
    }

    skip(): void {
        // Remember that user skipped, don't show again this session
        localStorage.setItem('api_key_dialog_dismissed', 'true');
        this.visible = false;
        this.dialogClosed.emit();
    }
}
