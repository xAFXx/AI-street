import { Routes } from '@angular/router';
import {AppsStoreComponent} from "./app.store.component";
import {OauthComponent} from "./oauth/oauth.component";
import {AppDetailComponent} from "./app-detail/app.detail.component";
import {AppComponent} from "./app/app.component";
import {JobComponent} from "./jobs";
import {RemoteControllerComponent} from "./apps/remote-controller";
import {VdbComponent, VdbDetailsComponent} from "./apps/vdb";
import {PostNLDetailsComponent} from "./apps/postnl";
import {ImageDescriptionComponent} from "./apps/image-description/image-description.component";
import {ApprxrComponent} from "./apps/appprxr/apprxr.component";

export const AppStoreRoutes: Routes = [
    {
        path: '',
        component: AppsStoreComponent
    }, {
        path: 'app-detail/oauth',
        component: OauthComponent
    }, {
        path: 'app-detail/detail/:id',
        component: AppDetailComponent
    }, {
        path: 'app/:id',
        component: AppComponent
    }, {
        path: 'app/jobs',
        component: JobComponent
    },
    {
      path: 'rc',
      component: RemoteControllerComponent,
      data: { permission: 'Pages.App.RemoteController' }
    },
    {
      path: 'apprxr',
      component: ApprxrComponent,
      data: { permission: 'Pages.App.RemoteController' }
    },
    {
      path: 'image-description',
      component: ImageDescriptionComponent
    },
    {
        path: 'vdb',
        component: VdbComponent,
        data: { permission: 'Pages.App.VDB' }
    }, {
        path: 'vdb/:id',
        component: VdbDetailsComponent,
        data: { permission: 'Pages.App.VDB' }
    }, {
        path: 'postnl',
        component: PostNLDetailsComponent,
        data: { permission: 'Pages.App.PostNl' }
    },
  {
        path: '**',
        redirectTo: ''
    }

];

