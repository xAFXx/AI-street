import {NgModule} from "@angular/core";
import {RouterModule} from '@angular/router';
import {CommonModule} from "@angular/common";
import {HttpClientModule} from "@angular/common/http";
import {ReactiveFormsModule, FormsModule} from "@angular/forms";

import {ModalModule, BsModalRef} from 'ngx-bootstrap/modal';
import {TabsModule} from 'ngx-bootstrap/tabs';
import {BsDropdownModule} from 'ngx-bootstrap/dropdown';
import {BsDatepickerModule} from 'ngx-bootstrap/datepicker';

import {NgxSpinnerModule} from "ngx-spinner";

import {FieldsetModule} from 'primeng/fieldset';
import {TableModule} from 'primeng/table';
import {AccordionModule} from 'primeng/accordion';
import {ProgressSpinnerModule} from 'primeng/progressspinner';
import {PaginatorModule} from 'primeng/paginator';
import {CalendarModule} from 'primeng/calendar';
import {MultiSelectModule} from 'primeng/multiselect';
import {DataViewModule} from 'primeng/dataview';
import {InputSwitchModule} from 'primeng/inputswitch';
import {ColorPickerModule} from "primeng/colorpicker";
import {InputNumberModule} from 'primeng/inputnumber';
import {OrganizationChartModule} from 'primeng/organizationchart';

import {
    UtilsModule,
    MasterCommonModule,
    UblCommonModule,
    AxillaAppSharedModule,
    AxillaCommonModule,
    AppUiCustomizationService,
    CookieConsentService,
    AppSessionService,
    AppUrlService
} from "@axilla/axilla-shared";

import {NgJsonEditorModule} from "ang-jsoneditor";

import {AppStoreRoutes} from './app.store-routing.module';


import {AppStoreUtilsModule} from "./shared";

import {ApiCallService, AppService, CustomSettingsService} from './shared';


import {CreateOrEditAppModalComponent} from "./modals";
import {SelectAppModalComponent} from "./modals";
import {CreateOrEditApiCallModalComponent} from "./app-detail/modals";
import {CreateApiConnectionSettingModalComponent} from "./app-detail/modals";

import {OauthComponent} from './oauth/oauth.component';

import {
    IMAPModalComponent, Oauth2GoogleModalComponent, BearerModalComponent,
    TokenSecretModalComponent, CustomAuthModalComponent, NtlmModalComponent, Oauth2ModalComponent,
    OauthModalComponent, Oauth2TwinfieldModalComponent, ApiKeyModalComponent, CreateChannelModalComponent
} from "./app-detail/modals/channels";

import {AuthDeterminationModalComponent} from './app-detail/modals';

import {AppsStoreComponent} from './app.store.component';
import {AppItemComponent} from "./app-item/app-item.component";
import {AppImgComponent} from "./app-item/app-img/app-img.component";
import {ApiCallHeaderComponent} from './api-call/api-call-header.component';
import {AppComponent} from "./app/app.component";
import {AppDetailComponent} from "./app-detail/app.detail.component";

import {JobComponent} from './jobs';
import {CreateOrEditJobModalComponent} from './jobs';
import {UpdateExecutionDefinitionModalComponent} from './jobs';

import {VdbComponent} from "./apps/vdb";
import {VdbDetailsComponent} from "./apps/vdb";

import {PostNLDetailsComponent} from "./apps/postnl";
import {VdbDetailsEditorComponent} from './apps/vdb';
import {NavigateProcessorHomepageComponent} from "./jobs";
import {NavigateHotspotComponent} from "./jobs";
import {ProcessorHomepageComponent, ProcessorHandler} from './jobs';
import {UpdateExecutionDefinitionItemComponent} from './jobs';

import {VDBDynamicTableBuilder} from "./apps/vdb";
import {PostnlChangeAmountModalComponent} from './apps/postnl';

import {AppCardComponent} from "./shared";
import {AppStoreAppDetailsModalComponent} from "./shared";
import {InstalledAppCardComponent} from "./shared";

import {RcFileActionComponent, SetAssignmentModalComponent} from "./apps/remote-controller";
import {RemoteControllerComponent} from "./apps/remote-controller";
import {RemoteControlService} from "./apps/remote-controller";
import {CreateVDBModalComponent} from "./apps/vdb";
import {AddToVDBModalComponent} from "./apps/vdb";
import {VdbService} from "./apps/vdb";
import {CustomActionsComponent} from "./apps/vdb";
import {ProcessorActionStepComponent} from "./jobs";
import {ProcessorService} from "./jobs";
import {NavigationProcessorService} from "./jobs";
import {ProcessorActionListComponent} from "./jobs";
import {PEDOverviewComponent} from "./jobs";
import {PEDStepResultComponent} from "./jobs";
import {PEDStepEditorComponent} from "./jobs";
import {PEDConnectedComponent} from "./jobs";
import {OnErrorPEDStepModalComponent} from "./jobs";

import {AppStoreServiceProxyModule} from "./shared";
import {AppConsts} from './AppConsts';
import {ImageDescriptionComponent} from "./apps/image-description/image-description.component";
import {
    DescribeImageModalComponent
} from "./apps/image-description/modals/describe-image-modal.component";
import {ExecuteApiModalComponent} from "./modals/execute-api/execute-api-modal.component";
import {ExecuteApiHeaderComponent} from "./modals/execute-api/execute-api-header.component";
import {ExecuteApiLookUpComponent} from "./modals/execute-api/execute-api-lookup.component";
import {RcHttpActionComponent} from "./apps/remote-controller/actions/http/rc-http-action.component";

export function getRemoteServiceBaseUrl2(): string {
    return AppConsts.remoteServiceBaseUrl;
}

@NgModule({
    imports: [
        CommonModule,
        AxillaAppSharedModule,
        AxillaCommonModule,
        AppStoreUtilsModule,
        ReactiveFormsModule,
        FormsModule,
        RouterModule.forChild(AppStoreRoutes),
        ModalModule.forRoot(),
        TableModule,
        CalendarModule,
        PaginatorModule,
        TabsModule,
        BsDropdownModule,
        HttpClientModule,
        AccordionModule,
        UtilsModule,
        NgxSpinnerModule,
        ProgressSpinnerModule,
        MultiSelectModule,
        BsDatepickerModule.forRoot(),
        NgJsonEditorModule,
//        AppCommonModule,
        DataViewModule,
        InputSwitchModule,
        ColorPickerModule,
        InputNumberModule,
        OrganizationChartModule,
        UblCommonModule,
        FieldsetModule,
        MasterCommonModule,
        AppStoreServiceProxyModule
    ],
    declarations: [
        AppsStoreComponent,
        AppItemComponent,
        AppDetailComponent,
        CreateOrEditAppModalComponent,
        SelectAppModalComponent,
        CreateOrEditApiCallModalComponent,
        CreateApiConnectionSettingModalComponent,
        CreateChannelModalComponent,
        Oauth2TwinfieldModalComponent,
        AppComponent,
        AuthDeterminationModalComponent,
        TokenSecretModalComponent,
        Oauth2GoogleModalComponent,
        OauthModalComponent,
        BearerModalComponent,
        ApiKeyModalComponent,
        ApiCallHeaderComponent,
        AppImgComponent,
        NtlmModalComponent,
        IMAPModalComponent,
        Oauth2ModalComponent,
        CustomAuthModalComponent,
        CustomActionsComponent,
        JobComponent,
        CreateOrEditJobModalComponent,
        UpdateExecutionDefinitionModalComponent,
        CreateVDBModalComponent,
        AddToVDBModalComponent,
        ProcessorActionStepComponent,
        ProcessorActionListComponent,
        PEDOverviewComponent,
        PEDStepResultComponent,
        PEDStepEditorComponent,
        PEDConnectedComponent,
        OnErrorPEDStepModalComponent,

        ImageDescriptionComponent,
        DescribeImageModalComponent,
        VdbComponent,
        VdbDetailsComponent,
        PostNLDetailsComponent,
        VdbDetailsEditorComponent,
        ProcessorHomepageComponent,

        NavigateProcessorHomepageComponent,
        NavigateHotspotComponent,
        RemoteControllerComponent,
        RcFileActionComponent,
        RcHttpActionComponent,
        SetAssignmentModalComponent,

        UpdateExecutionDefinitionItemComponent,
        VDBDynamicTableBuilder,
        PostnlChangeAmountModalComponent,

        AppCardComponent,
        AppStoreAppDetailsModalComponent,
        InstalledAppCardComponent,
        OauthComponent,
        ExecuteApiModalComponent
        , ExecuteApiHeaderComponent
        , ExecuteApiLookUpComponent
    ],
    exports: [
        BsDatepickerModule,
    ],
    providers: [
        // { provide: API_BASE_URL, useFactory: getRemoteServiceBaseUrl2 },

        // { provide: BsDatepickerConfig, useFactory: NgxBootstrapDatePickerConfigService.getDatepickerConfig },
        // { provide: BsDaterangepickerConfig, useFactory: NgxBootstrapDatePickerConfigService.getDaterangepickerConfig },
        // { provide: BsLocaleService, useFactory: NgxBootstrapDatePickerConfigService.getDatepickerLocale },
        BsModalRef,
        ApiCallService,
        AppService,
        CustomSettingsService,
        RemoteControlService,
        VdbService,
        ProcessorService,
        AppSessionService,
        AppUiCustomizationService,
        CookieConsentService,
        AppUrlService,
        ProcessorHandler
    ],
})
export class AppsStoreModule {
}
