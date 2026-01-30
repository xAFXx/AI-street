import { AccountComponent } from '@account/account.component';
import {ENVIRONMENT_INITIALIZER, inject, NgModule} from '@angular/core';
import {ExtraOptions, NavigationEnd, Router, RouterModule, Routes} from '@angular/router';
import { AppUiCustomizationService } from '@axilla/axilla-shared';
import { RootRouteGuard } from './root-route-guard';
import { RootComponent } from './root.component';

//import { EmailActionModule } from '@axilla/axilla-email-action';
//@NgModule(
//    {
//        imports: [EmailActionModule]
//    }
//)
//export class ExternalEmailActionModule {
//}


const routes: Routes = [
    {
        path: '',
        //redirectTo: '/app/profile',
        pathMatch: 'full',
        component: RootComponent,
        canActivate: [RootRouteGuard]
    },
    {
        path: 'account',
        loadChildren: () => import('@root/account/account.module').then(m => m.AccountModule), //Lazy load account module
    },
    {
        path: 'app',
        loadChildren: () => import('@root/app/app.module').then(m => m.AppModule), //Lazy load account module
    },

    //{
    //    path: 'email-action',
    //    loadChildren: () => import('@root/root-routing.module').then(m => m.ExternalEmailActionModule),
    //    data: { preload: true }
    //}
];

const routerOptions: ExtraOptions = {
    //enableTracing: true, // Set to true to enable router tracing
};

//#region Debug
function stringifyEvent(routerEvent) {
    switch (routerEvent.type) {
        case 14 /* EventType.ActivationEnd */:
            return `ActivationEnd(path: '${routerEvent.snapshot.routeConfig?.path || ''}')`;
        case 13 /* EventType.ActivationStart */:
            return `ActivationStart(path: '${routerEvent.snapshot.routeConfig?.path || ''}')`;
        case 12 /* EventType.ChildActivationEnd */:
            return `ChildActivationEnd(path: '${routerEvent.snapshot.routeConfig?.path || ''}')`;
        case 11 /* EventType.ChildActivationStart */:
            return `ChildActivationStart(path: '${routerEvent.snapshot.routeConfig?.path || ''}')`;
        case 8 /* EventType.GuardsCheckEnd */:
            return `GuardsCheckEnd(id: ${routerEvent.id}, url: '${routerEvent.url}', urlAfterRedirects: '${routerEvent.urlAfterRedirects}', state: ${routerEvent.state}, shouldActivate: ${routerEvent.shouldActivate})`;
        case 7 /* EventType.GuardsCheckStart */:
            return `GuardsCheckStart(id: ${routerEvent.id}, url: '${routerEvent.url}', urlAfterRedirects: '${routerEvent.urlAfterRedirects}', state: ${routerEvent.state})`;
        case 2 /* EventType.NavigationCancel */:
            return `NavigationCancel(id: ${routerEvent.id}, url: '${routerEvent.url}')`;
        case 16 /* EventType.NavigationSkipped */:
            return `NavigationSkipped(id: ${routerEvent.id}, url: '${routerEvent.url}')`;
        case 1 /* EventType.NavigationEnd */:
            return `NavigationEnd(id: ${routerEvent.id}, url: '${routerEvent.url}', urlAfterRedirects: '${routerEvent.urlAfterRedirects}')`;
        case 3 /* EventType.NavigationError */:
            return `NavigationError(id: ${routerEvent.id}, url: '${routerEvent.url}', error: ${routerEvent.error})`;
        case 0 /* EventType.NavigationStart */:
            return `NavigationStart(id: ${routerEvent.id}, url: '${routerEvent.url}')`;
        case 6 /* EventType.ResolveEnd */:
            return `ResolveEnd(id: ${routerEvent.id}, url: '${routerEvent.url}', urlAfterRedirects: '${routerEvent.urlAfterRedirects}', state: ${routerEvent.state})`;
        case 5 /* EventType.ResolveStart */:
            return `ResolveStart(id: ${routerEvent.id}, url: '${routerEvent.url}', urlAfterRedirects: '${routerEvent.urlAfterRedirects}', state: ${routerEvent.state})`;
        case 10 /* EventType.RouteConfigLoadEnd */:
            return `RouteConfigLoadEnd(path: ${routerEvent.route.path})`;
        case 9 /* EventType.RouteConfigLoadStart */:
            return `RouteConfigLoadStart(path: ${routerEvent.route.path})`;
        case 4 /* EventType.RoutesRecognized */:
            return `RoutesRecognized(id: ${routerEvent.id}, url: '${routerEvent.url}', urlAfterRedirects: '${routerEvent.urlAfterRedirects}', state: ${routerEvent.state})`;
        case 15 /* EventType.Scroll */:
            const pos = routerEvent.position ? `${routerEvent.position[0]}, ${routerEvent.position[1]}` : null;
            return `Scroll(anchor: '${routerEvent.anchor}', position: '${pos}')`;
    }
}
function withDebugTracing() {
    let providers = [];
    //if (typeof ngDevMode === 'undefined' || ngDevMode) {
    providers = [{
        provide: ENVIRONMENT_INITIALIZER,
        multi: true,
        useFactory: () => {
            const router = inject(Router);
            return () => router.events.subscribe((e) => {
                // tslint:disable:no-console
                debugger;
                console.group?.(`Router Event: ${e.constructor.name}`);
                console.log(stringifyEvent(e));
                console.log(e);
                console.groupEnd?.();
                // tslint:enable:no-console
            });
        }
    }];
    //}
    //else {
    //    providers = [];
    //}
    return providers;
}
//#endregion Debug

@NgModule({
    imports: [RouterModule.forRoot(routes, routerOptions)],
    exports: [RouterModule],
//#region Debug
    //providers: [...withDebugTracing()]
//#endregion Debug
})
export class RootRoutingModule {
    constructor(
        private router: Router,
        private _uiCustomizationService: AppUiCustomizationService) {
        router.events.subscribe((event: NavigationEnd) => {
            setTimeout(() => {
                this.toggleBodyCssClass(event.url);
            }, 0);
        });
    }

    toggleBodyCssClass(url: string): void {
        if (url) {
            if (url === '/') {
                if (abp.session.userId > 0) {
                    this.setAppModuleBodyClassInternal();
                } else {
                    this.setAccountModuleBodyClassInternal();
                }
            }

            if (url.indexOf('/account/') >= 0) {
                this.setAccountModuleBodyClassInternal();
            } else {
                this.setAppModuleBodyClassInternal();
            }
        }
    }

    setAppModuleBodyClassInternal(): void {
        let currentBodyClass = document.body.className;
        let classesToRemember = '';

        if (currentBodyClass.indexOf('m-brand--minimize') >= 0) {
            classesToRemember += ' m-brand--minimize ';
        }

        if (currentBodyClass.indexOf('m-aside-left--minimize') >= 0) {
            classesToRemember += ' m-aside-left--minimize';
        }

        if (currentBodyClass.indexOf('m-brand--hide') >= 0) {
            classesToRemember += ' m-brand--hide';
        }

        if (currentBodyClass.indexOf('m-aside-left--hide') >= 0) {
            classesToRemember += ' m-aside-left--hide';
        }

        if (currentBodyClass.indexOf('swal2-toast-shown') >= 0) {
            classesToRemember += ' swal2-toast-shown';
        }

        document.body.className = this._uiCustomizationService.getAppModuleBodyClass() + ' ' + classesToRemember;
    }

    setAccountModuleBodyClassInternal(): void {
        let currentBodyClass = document.body.className;
        let classesToRemember = '';

        if (currentBodyClass.indexOf('swal2-toast-shown') >= 0) {
            classesToRemember += ' swal2-toast-shown';
        }

        document.body.className = this._uiCustomizationService.getAccountModuleBodyClass() + ' ' + classesToRemember;
    }

    getSetting(key: string): string {
        return abp.setting.get(key);
    }
}
