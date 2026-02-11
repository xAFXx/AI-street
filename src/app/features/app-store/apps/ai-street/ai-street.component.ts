import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

// PrimeNG Modules
import { TabsModule } from 'primeng/tabs';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

// Child Components - co-located sub-modules
import { InputManager } from './input-manager/input-manager';
import { ModelArena } from './model-arena/model-arena';
import { ProcessManager } from './process-manager/process-manager';
import { Dashboard } from './dashboard/dashboard';

/**
 * AI Street App
 * 
 * A unified hub for AI-powered data management and analytics.
 * Contains 4 integrated modules:
 * - Data Management: Configure and manage input datasets
 * - Model Arena: Compare and evaluate AI models
 * - Test Evaluation Center: Monitor and manage AI processes
 * - Dashboard: View analytics and performance metrics
 */
@Component({
    selector: 'app-ai-street',
    standalone: true,
    imports: [
        CommonModule,
        TabsModule,
        CardModule,
        ButtonModule,
        TooltipModule,
        // Child components
        InputManager,
        ModelArena,
        ProcessManager,
        Dashboard
    ],
    templateUrl: './ai-street.component.html',
    styleUrls: ['./ai-street.component.less']
})
export class AiStreetComponent {
    // Active tab tracking
    activeTab = signal(0);

    // Tab definitions with icons matching the screenshot
    readonly tabs = [
        {
            label: 'Data Management',
            icon: 'pi pi-database',
            description: 'Configure and manage input datasets'
        },
        {
            label: 'Model Arena',
            icon: 'pi pi-microchip',
            description: 'Compare and evaluate AI models'
        },
        {
            label: 'Test Evaluation Center',
            icon: 'pi pi-cog',
            description: 'Monitor and manage AI processes'
        },
        {
            label: 'Dashboard',
            icon: 'pi pi-chart-bar',
            description: 'Analytics and performance metrics'
        }
    ];

    onTabChange(index: number): void {
        this.activeTab.set(index);
    }
}
