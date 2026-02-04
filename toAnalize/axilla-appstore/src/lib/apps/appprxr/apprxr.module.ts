import { NgModule } from "@angular/core";
import { RouterModule } from '@angular/router';
import { CommonModule } from "@angular/common";
import { HttpClientModule } from "@angular/common/http";
import { ReactiveFormsModule, FormsModule } from "@angular/forms";

import {ModalModule, BsModalRef} from 'ngx-bootstrap/modal';
import {TabsModule} from 'ngx-bootstrap/tabs';
import {BsDropdownModule} from 'ngx-bootstrap/dropdown';
import { BsDatepickerModule } from 'ngx-bootstrap/datepicker';

import { NgxSpinnerModule } from "ngx-spinner";

import { TableModule } from 'primeng/table';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { PaginatorModule  } from 'primeng/paginator';
import { CalendarModule } from 'primeng/calendar';
import { DataViewModule } from 'primeng/dataview';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputNumberModule } from 'primeng/inputnumber';

import {
    UtilsModule, MasterCommonModule, UblCommonModule,
  AxillaAppSharedModule, AxillaCommonModule, AppSessionService } from "@axilla/axilla-shared";

import { NgJsonEditorModule } from "ang-jsoneditor";

import { ApprxrRoutes } from './apprxr-routing.module';
import {AppService, AppStoreServiceProxyModule, AppStoreUtilsModule, CustomSettingsService} from "../../shared";
import {AppConsts} from "../../AppConsts";
import {RemoteControlService} from "../remote-controller";
import { VdbService } from "../vdb";
import {ApprxrComponent} from "./apprxr.component";

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
        RouterModule.forChild(ApprxrRoutes),
        ModalModule.forRoot(),
        TableModule,
        CalendarModule,
        PaginatorModule,
        TabsModule,
        BsDropdownModule,
        HttpClientModule,
        UtilsModule,
        NgxSpinnerModule,
        ProgressSpinnerModule,
        BsDatepickerModule.forRoot(),
        NgJsonEditorModule,
        DataViewModule,
        InputSwitchModule,
        InputNumberModule,
        UblCommonModule,
        MasterCommonModule,
        AppStoreServiceProxyModule
    ],
    declarations: [
      ApprxrComponent
    ],
    exports: [

    ],
    providers: [
        BsModalRef,
        AppService,
        CustomSettingsService,
        RemoteControlService,
        VdbService,
        AppSessionService,
    ],
})
export class ApprxrModule { }
