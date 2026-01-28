import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { Dashboard } from './features/dashboard/dashboard';

export const routes: Routes = [
    {
        path: '',
        component: MainLayoutComponent,
        children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            { path: 'dashboard', component: Dashboard },
            { path: 'input', loadComponent: () => import('./features/input-manager/input-manager').then(m => m.InputManager) },
            { path: 'arena', loadComponent: () => import('./features/model-arena/model-arena').then(m => m.ModelArena) },
            { path: 'processes', loadComponent: () => import('./features/process-manager/process-manager').then(m => m.ProcessManager) },
            { path: 'reports', loadComponent: () => import('./features/reports/reports-page.component').then(m => m.ReportsPageComponent) },
            { path: 'reports/:id', loadComponent: () => import('./features/reports/report-details.component').then(m => m.ReportDetailsComponent) },
            { path: 'results', loadComponent: () => import('./features/results/results.component').then(m => m.ResultsComponent) },
            { path: 'audit-standards', loadComponent: () => import('./features/block-templates/block-templates-page.component').then(m => m.BlockTemplatesPageComponent) },
            { path: 'report-frameworks', loadComponent: () => import('./features/template-editor/report-frameworks.component').then(m => m.ReportFrameworksComponent) },
            { path: 'template-editor/new', loadComponent: () => import('./features/template-editor/template-editor.component').then(m => m.TemplateEditorComponent) },
            { path: 'template-editor/:id', loadComponent: () => import('./features/template-editor/template-editor.component').then(m => m.TemplateEditorComponent) },
            { path: 'report-wizard', loadComponent: () => import('./features/report-wizard/report-wizard.component').then(m => m.ReportWizardComponent) }
        ]
    }
];
