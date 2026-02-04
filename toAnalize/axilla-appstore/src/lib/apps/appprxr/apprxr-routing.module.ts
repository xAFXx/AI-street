import { Routes } from '@angular/router';
import {ApprxrComponent} from './apprxr.component';

export const ApprxrRoutes: Routes = [
    {
        path: '',
        component: ApprxrComponent,
        data: { permission: 'Pages.App.RemoteController' }
    },
    {
        path: '**',
        redirectTo: ''
    }
];

