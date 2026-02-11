import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { CheckboxModule } from 'primeng/checkbox';
import { AuthService } from '../../core/services/auth.service';
import { AppConsts } from '../../shared/AppConsts';
import { TenantCustomizationService } from '../../core/services/tenant-customization.service';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    opacity: number;
}

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        InputTextModule,
        PasswordModule,
        CheckboxModule
    ],
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.less']
})
export class LoginComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('particleCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

    private router = inject(Router);
    private authService = inject(AuthService);
    private tenantCustomization = inject(TenantCustomizationService);

    tenantName = '';
    username = '';
    password = '';
    rememberMe = false;
    errorMessage = '';
    errorDetails = '';
    isLoading = false;
    hasError = false;
    logoUrl: string | null = null;

    // Particle animation
    private particles: Particle[] = [];
    private animationId: number | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private resizeHandler = () => this.resizeCanvas();

    ngOnInit(): void {
        this.tenantName = AppConsts.tenancyName || localStorage.getItem('tenancy_name') || '';
        this.logoUrl = this.tenantCustomization.getLogoUrl('dark');
    }

    ngAfterViewInit(): void {
        this.initParticles();
    }

    ngOnDestroy(): void {
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
        }
        window.removeEventListener('resize', this.resizeHandler);
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

    dismissError(): void {
        this.errorMessage = '';
        this.errorDetails = '';
        this.hasError = false;
    }

    login(): void {
        if (!this.username.trim() || !this.password) return;

        this.isLoading = true;
        this.errorMessage = '';
        this.hasError = false;

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
                    this.showError('Two-factor authentication is required but not yet implemented.');
                } else if (result.shouldResetPassword) {
                    this.showError('Password reset is required. Please contact your administrator.');
                }
            },
            error: (error) => {
                this.isLoading = false;

                // Extract ABP-style error from the response body
                const abpError = error?.error?.error;

                if (abpError?.message) {
                    // Backend sent a structured ABP error — show it directly
                    this.showError(abpError.message, abpError.details);
                } else if (error.status === 0) {
                    this.showError('Connection lost', 'Unable to reach the server. Please check your network.');
                } else {
                    this.showError('Login failed', 'An unexpected error occurred. Please try again.');
                }
            }
        });
    }

    private showError(message: string, details?: string): void {
        this.errorMessage = message;
        this.errorDetails = details || '';
        this.hasError = true;

        // Trigger shake animation on the card
        const card = document.querySelector('.login-card') as HTMLElement;
        if (card) {
            card.classList.remove('shake');
            // Force reflow to restart animation
            void card.offsetWidth;
            card.classList.add('shake');
        }
    }

    // ── Particle Animation ──

    private initParticles(): void {
        const canvas = this.canvasRef?.nativeElement;
        if (!canvas) return;

        this.ctx = canvas.getContext('2d');
        if (!this.ctx) return;

        this.resizeCanvas();

        // Create particles
        const count = Math.min(60, Math.floor((canvas.width * canvas.height) / 15000));
        this.particles = [];
        for (let i = 0; i < count; i++) {
            this.particles.push(this.createParticle(canvas));
        }

        window.addEventListener('resize', this.resizeHandler);

        // Start animation loop
        this.animate(canvas);
    }

    private createParticle(canvas: HTMLCanvasElement): Particle {
        return {
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            radius: Math.random() * 1.5 + 0.5,
            opacity: Math.random() * 0.4 + 0.1
        };
    }

    private resizeCanvas(): void {
        const canvas = this.canvasRef?.nativeElement;
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    private animate(canvas: HTMLCanvasElement): void {
        if (!this.ctx) return;
        const ctx = this.ctx;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Update & draw particles
        for (const p of this.particles) {
            p.x += p.vx;
            p.y += p.vy;

            // Wrap around edges
            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(124, 58, 237, ${p.opacity})`;
            ctx.fill();
        }

        // Draw connection lines between nearby particles
        const maxDist = 120;
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const dx = this.particles[i].x - this.particles[j].x;
                const dy = this.particles[i].y - this.particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < maxDist) {
                    const alpha = (1 - dist / maxDist) * 0.12;
                    ctx.beginPath();
                    ctx.moveTo(this.particles[i].x, this.particles[i].y);
                    ctx.lineTo(this.particles[j].x, this.particles[j].y);
                    ctx.strokeStyle = `rgba(124, 58, 237, ${alpha})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }

        this.animationId = requestAnimationFrame(() => this.animate(canvas));
    }
}
