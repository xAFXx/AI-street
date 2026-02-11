import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { Dashboard } from './features/app-store/apps/ai-street/dashboard/dashboard';
import { HomeRedirectComponent } from './shared/components/home-redirect.component';
import { authGuard, adminGuard, loginGuard } from './core/guards/auth.guard';

export const routes: Routes = [
    // Login page (no auth required)
    {
        path: 'login',
        loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent),
        canActivate: [loginGuard]
    },

    // Main app (auth required)
    {
        path: '',
        component: MainLayoutComponent,
        canActivate: [authGuard],
        children: [
            { path: '', component: HomeRedirectComponent },
            { path: 'dashboard', component: Dashboard },
            { path: 'input', loadComponent: () => import('./features/app-store/apps/ai-street/input-manager/input-manager').then(m => m.InputManager), canActivate: [adminGuard] },
            { path: 'arena', loadComponent: () => import('./features/app-store/apps/ai-street/model-arena/model-arena').then(m => m.ModelArena), canActivate: [adminGuard] },
            { path: 'processes', loadComponent: () => import('./features/app-store/apps/ai-street/process-manager/process-manager').then(m => m.ProcessManager), canActivate: [adminGuard] },
            { path: 'reports', loadComponent: () => import('./features/app-store/apps/true-north/reports/reports-page.component').then(m => m.ReportsPageComponent) },
            { path: 'reports/:id', loadComponent: () => import('./features/app-store/apps/true-north/reports/report-details.component').then(m => m.ReportDetailsComponent) },
            { path: 'results', loadComponent: () => import('./features/app-store/apps/true-north/results/results.component').then(m => m.ResultsComponent) },
            { path: 'audit-standards', loadComponent: () => import('./features/app-store/apps/true-north/block-templates/block-templates-page.component').then(m => m.BlockTemplatesPageComponent) },
            { path: 'report-frameworks', loadComponent: () => import('./features/app-store/apps/true-north/template-editor/report-frameworks.component').then(m => m.ReportFrameworksComponent) },
            { path: 'template-editor/new', loadComponent: () => import('./features/app-store/apps/true-north/template-editor/template-editor.component').then(m => m.TemplateEditorComponent), canActivate: [adminGuard] },
            { path: 'template-editor/:id', loadComponent: () => import('./features/app-store/apps/true-north/template-editor/template-editor.component').then(m => m.TemplateEditorComponent), canActivate: [adminGuard] },
            { path: 'report-wizard', loadComponent: () => import('./features/app-store/apps/true-north/report-wizard/report-wizard.component').then(m => m.ReportWizardComponent) },
            { path: 'search', loadComponent: () => import('./features/app-store/apps/search-action/search-action.component').then(m => m.SearchActionComponent) },
            { path: 'document-management', loadComponent: () => import('./features/app-store/apps/document-management/document-management.component').then(m => m.DocumentManagementComponent) },
            { path: 'schema-editor', loadComponent: () => import('./features/app-store/apps/true-north/schema-editor/schema-editor.component').then(m => m.SchemaEditorComponent) },
            { path: 'schema-editor/:id', loadComponent: () => import('./features/app-store/apps/true-north/schema-editor/schema-editor.component').then(m => m.SchemaEditorComponent) },
            { path: 'app-nexus', loadComponent: () => import('./features/app-store/app-nexus.component').then(m => m.AppNexusComponent) },
            { path: 'tax-management', loadComponent: () => import('./features/app-store/apps/tax-management/tax-management.component').then(m => m.TaxManagementComponent) },
            { path: 'region-lookup', loadComponent: () => import('./features/app-store/apps/region-lookup/region-lookup.component').then(m => m.RegionLookupComponent) },
            { path: 'ai-street', loadComponent: () => import('./features/app-store/apps/ai-street/ai-street.component').then(m => m.AiStreetComponent) },
            { path: 'ai-management', loadComponent: () => import('./features/ai-management/ai-management.component').then(m => m.AIManagementComponent) }
        ]
    },

    // Fallback
    { path: '**', redirectTo: '' }
];


