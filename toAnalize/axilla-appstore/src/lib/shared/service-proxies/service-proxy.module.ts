import { AbpHttpInterceptor, RefreshTokenService, AbpHttpConfigurationService } from 'abp-ng2-module';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { NgModule } from '@angular/core';
import * as ApiServiceProxies from './service-proxies';

import { ZeroRefreshTokenService } from '@axilla/axilla-shared';
import { AppConsts } from '../../AppConsts';
import { ZeroTemplateHttpConfigurationService } from "@axilla/axilla-shared";

export function getRemoteServiceBaseUrl(): string {
    return AppConsts.remoteServiceBaseUrl;
}

@NgModule({
    providers: [
        ApiServiceProxies.AppStoreServiceProxy,
        ApiServiceProxies.AppServiceBaseServiceProxy,
        ApiServiceProxies.ApiConnectionSettingServiceProxy,
        ApiServiceProxies.ChannelDefinitionServiceProxy,
        ApiServiceProxies.ApiConfServiceProxy,
        ApiServiceProxies.WorkFlowServiceProxy,
        ApiServiceProxies.VDBServiceProxy,
        ApiServiceProxies.RemoteControlServiceProxy,
        ApiServiceProxies.AppJobSchedulerServiceProxy,
        ApiServiceProxies.AppLoggerServiceProxy,
        ApiServiceProxies.ProcessorDebugServiceProxy,
        ApiServiceProxies.ProcessorServiceProxy,
        ApiServiceProxies.ProcessorEngineLogServiceProxy,
        ApiServiceProxies.LogDashboardServiceProxy,
      ApiServiceProxies.ImageDescriptionServiceProxy,

        { provide: ApiServiceProxies.API_BASE_URL, useFactory: getRemoteServiceBaseUrl },

        { provide: RefreshTokenService, useClass: ZeroRefreshTokenService },
        { provide: AbpHttpConfigurationService, useClass: ZeroTemplateHttpConfigurationService },
        { provide: HTTP_INTERCEPTORS, useClass: AbpHttpInterceptor, multi: true }
    ]
})
export class AppStoreServiceProxyModule { }
