import { UtilsService } from 'abp-ng2-module';
import { CompilerOptions, NgModuleRef, Type } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppAuthService } from '@app/shared/common/auth/app-auth.service';
import { AppConsts } from '@shared/AppConsts';
import { SubdomainTenancyNameFinder, UrlHelper, XmlHttpRequestHelper, LocaleMappingService } from '@axilla/axilla-shared';

import _ from 'lodash';
import { DynamicResourcesHelper } from '@shared/helpers/DynamicResourcesHelper';
import { environment } from './environments/environment';

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

export class AppPreBootstrap {

    static run(appRootUrl: string, callback: () => void, resolve: any, reject: any): void {
        AppPreBootstrap.getApplicationConfig(appRootUrl, () => {
            if (UrlHelper.isInstallUrl(location.href)) {
                AppPreBootstrap.loadAssetsForInstallPage(callback);
                return;
            }

            const queryStringObj = UrlHelper.getQueryParameters();

            if (queryStringObj.redirect && queryStringObj.redirect === 'TenantRegistration') {
                if (queryStringObj.forceNewRegistration) {
                    new AppAuthService().logout();
                }

                location.href = AppConsts.appBaseUrl + '/account/select-edition';
            } else if (queryStringObj.impersonationToken) {
                AppPreBootstrap.impersonatedAuthenticate(queryStringObj.impersonationToken, queryStringObj.tenantId, () => { AppPreBootstrap.getUserConfiguration(callback); });
            } else if (queryStringObj.token) {
                AppPreBootstrap.ssoAuthenticate(queryStringObj.token, queryStringObj.tenantId, () => { AppPreBootstrap.getUserConfiguration(callback); });
            } else if (this.ociDetection(queryStringObj)) {
                AppPreBootstrap.ociLogin(queryStringObj, () => { AppPreBootstrap.getUserConfiguration(callback); });
            } else if (queryStringObj.switchAccountToken) {
                AppPreBootstrap.linkedAccountAuthenticate(queryStringObj.switchAccountToken, queryStringObj.tenantId, () => { AppPreBootstrap.getUserConfiguration(callback); });
            } else {
                AppPreBootstrap.getUserConfiguration(callback);
            }
        });
    }

    static bootstrap<TM>(moduleType: Type<TM>, compilerOptions?: CompilerOptions | CompilerOptions[]): Promise<NgModuleRef<TM>> {
        return platformBrowserDynamic().bootstrapModule(moduleType, compilerOptions);
    }

    private static getApplicationConfig(appRootUrl: string, callback: () => void) {
        let type = 'GET';
        let url = appRootUrl + 'assets/' + environment.appConfig;
        let customHeaders = [
            {
                name: abp.multiTenancy.tenantIdCookieName,
                value: abp.multiTenancy.getTenantIdCookie() + ''
            }];

        XmlHttpRequestHelper.ajax(type, url, customHeaders, null, (result) => {
            const subdomainTenancyNameFinder = new SubdomainTenancyNameFinder();
            const tenancyName = subdomainTenancyNameFinder.getCurrentTenancyNameOrNull(result.appBaseUrl);

            AppConsts.appBaseUrlFormat = result.appBaseUrl;
            AppConsts.remoteServiceBaseUrlFormat = result.remoteServiceBaseUrl;
            AppConsts.localeMappings = result.localeMappings;
            AppConsts.applicationName = result.applicationName;

            if (tenancyName == null) {
                AppConsts.appBaseUrl = result.appBaseUrl.replace(AppConsts.tenancyNamePlaceHolderInUrl + '.', '');
                AppConsts.remoteServiceBaseUrl = result.remoteServiceBaseUrl.replace(AppConsts.tenancyNamePlaceHolderInUrl + '.', '');
            } else {
                AppConsts.appBaseUrl = result.appBaseUrl.replace(AppConsts.tenancyNamePlaceHolderInUrl, tenancyName);
                AppConsts.remoteServiceBaseUrl = result.remoteServiceBaseUrl.replace(AppConsts.tenancyNamePlaceHolderInUrl, tenancyName);
            }

            callback();
        });
    }

    private static getCurrentClockProvider(currentProviderName: string): abp.timing.IClockProvider {
        if (currentProviderName === 'unspecifiedClockProvider') {
            return abp.timing.unspecifiedClockProvider;
        }

        if (currentProviderName === 'utcClockProvider') {
            return abp.timing.utcClockProvider;
        }

        return abp.timing.localClockProvider;
    }

    private static impersonatedAuthenticate(impersonationToken: string, tenantId: number, callback: () => void): void {
        abp.multiTenancy.setTenantIdCookie(tenantId);
        const cookieLangValue = abp.utils.getCookieValue('Abp.Localization.CultureName');

        let requestHeaders = {
            '.AspNetCore.Culture': ('c=' + cookieLangValue + '|uic=' + cookieLangValue),
            [abp.multiTenancy.tenantIdCookieName]: abp.multiTenancy.getTenantIdCookie()
        };

        XmlHttpRequestHelper.ajax(
            'POST',
            AppConsts.remoteServiceBaseUrl + '/api/TokenAuth/ImpersonatedAuthenticate?impersonationToken=' + impersonationToken,
            requestHeaders,
            null,
            (response) => {
                let result = response.result;
                abp.auth.setToken(result.accessToken);
                AppPreBootstrap.setEncryptedTokenCookie(result.encryptedAccessToken);
                location.search = '';
                callback();
            }
        );
    }

    //#region SSO
    private static ssoAuthenticate(token: string, tenantId: number, callback: () => void): void {
        abp.multiTenancy.setTenantIdCookie(tenantId);
        const cookieLangValue = abp.utils.getCookieValue('Abp.Localization.CultureName');

        let requestHeaders = {
            '.AspNetCore.Culture': ('c=' + cookieLangValue + '|uic=' + cookieLangValue),
            [abp.multiTenancy.tenantIdCookieName]: abp.multiTenancy.getTenantIdCookie()
        };

        XmlHttpRequestHelper.ajax(
            'POST',
            AppConsts.remoteServiceBaseUrl + '/api/TokenAuth/SSOAuthenticate?token=' + token,
            requestHeaders,
            null,
            (response) => {
                let result = response.result;
                abp.auth.setToken(result.accessToken);
                AppPreBootstrap.setEncryptedTokenCookie(result.encryptedAccessToken);
                location.search = '';
                callback();
            }
        );
    }
    //#endregion SSO


    //#region OCI

    private static ociLogin(queryStringObj: any, callback: () => void): void {
        abp.multiTenancy.setTenantIdCookie(queryStringObj.tenantId);

        const password = queryStringObj.password ?? queryStringObj.PASSWORD;
        const userName = queryStringObj.username ?? queryStringObj.USERNAME;
        const hookurl = queryStringObj.hookurl ?? queryStringObj.HOOK_URL;

        let requestHeaders = {
            'Accept': 'text/plain',
            'Content-type': 'application/json-patch+json'
        };

        let data = `{ "UserName": "${userName}", "Password": "${password}", "HookUrl": "${hookurl}" }`;

        XmlHttpRequestHelper.ajax(
            'POST',
            AppConsts.remoteServiceBaseUrl + '/api/services/app/PunchOut/LoginFromOci',
            requestHeaders,
            data,
            (response) => {
                let result = response.result;
                AppPreBootstrap.ssoAuthenticate(result, queryStringObj.tenantId, callback);
            },
            true
        );
    }


    private static ociDetection(queryStringObj: any): boolean {
        if ((queryStringObj.password || queryStringObj.PASSWORD)
            && (queryStringObj.username || queryStringObj.USERNAME)
            && (queryStringObj.hookurl || queryStringObj.HOOK_URL)) {
            return true;
        }

        return false;
    }


    private static ociAuthenticate(token: string, tenantId: number, callback: () => void): void {
        abp.multiTenancy.setTenantIdCookie(tenantId);
        const cookieLangValue = abp.utils.getCookieValue('Abp.Localization.CultureName');

        let requestHeaders = {
            '.AspNetCore.Culture': ('c=' + cookieLangValue + '|uic=' + cookieLangValue),
            [abp.multiTenancy.tenantIdCookieName]: abp.multiTenancy.getTenantIdCookie()
        };

        XmlHttpRequestHelper.ajax(
            'POST',
            AppConsts.remoteServiceBaseUrl + '/api/TokenAuth/SSOAuthenticate?token=' + token,
            requestHeaders,
            null,
            (response) => {
                let result = response.result;
                abp.auth.setToken(result.accessToken);
                AppPreBootstrap.setEncryptedTokenCookie(result.encryptedAccessToken);
                location.search = '';
                callback();
            }
        );
    }
    //#endregion OCI

    private static linkedAccountAuthenticate(switchAccountToken: string, tenantId: number, callback: () => void): void {
        abp.multiTenancy.setTenantIdCookie(tenantId);
        const cookieLangValue = abp.utils.getCookieValue('Abp.Localization.CultureName');

        let requestHeaders = {
            '.AspNetCore.Culture': ('c=' + cookieLangValue + '|uic=' + cookieLangValue),
            [abp.multiTenancy.tenantIdCookieName]: abp.multiTenancy.getTenantIdCookie()
        };

        XmlHttpRequestHelper.ajax(
            'POST',
            AppConsts.remoteServiceBaseUrl + '/api/TokenAuth/LinkedAccountAuthenticate?switchAccountToken=' + switchAccountToken,
            requestHeaders,
            null,
            (response) => {
                let result = response.result;
                abp.auth.setToken(result.accessToken);
                AppPreBootstrap.setEncryptedTokenCookie(result.encryptedAccessToken);
                location.search = '';
                callback();
            }
        );
    }

    private static getUserConfiguration(
        callback: () => void,
        retry: { attempts?: number; baseDelayMs?: number; maxDelayMs?: number; timeoutMs?: number } = {}
    ): void {
        const attempts   = retry.attempts    ?? 4;     // total tries
        const baseDelay  = retry.baseDelayMs ?? 500;   // first backoff
        const maxDelay   = retry.maxDelayMs  ?? 4000;  // cap backoff
        const timeoutMs  = retry.timeoutMs   ?? 10000; // per-attempt timeout

        const cookieLangValue = abp.utils.getCookieValue('Abp.Localization.CultureName');
        const token = abp.auth.getToken();
        const url = AppConsts.remoteServiceBaseUrl + '/AbpUserConfiguration/GetAll';

        const requestHeaders: any = {
            '.AspNetCore.Culture': ('c=' + cookieLangValue + '|uic=' + cookieLangValue),
            [abp.multiTenancy.tenantIdCookieName]: abp.multiTenancy.getTenantIdCookie()
        };
        if (token) {
            requestHeaders['Authorization'] = 'Bearer ' + token;
        }

        let attempt = 0;
        let activeRunId = 0;   // guards against late responses from previous attempts
        let finished = false;  // ensure callback fires only once

        const scheduleBackoff = (i: number) => Math.min(baseDelay * Math.pow(2, i), maxDelay);

        const run = () => {
            if (finished) {
                return;
            }
            attempt++;
            const runId = ++activeRunId;

            let timer: any = setTimeout(() => {
                // timeout → retry or fail
                if (finished || runId !== activeRunId) {
                    return;
                }
                onFail(new Error('getUserConfiguration timeout'));
            }, timeoutMs);

            const clear = () => { if (timer) { clearTimeout(timer); timer = null; } };

            const onSuccess = (response: any) => {
                if (finished || runId !== activeRunId) {
                    return;
                } // ignore late success
                clear();
                try {
                    const result = response.result;
                    _.merge(abp, result);
                    abp.clock.provider = this.getCurrentClockProvider(result.clock.provider);
                    AppPreBootstrap.configureDayjs();
                    abp.event.trigger('abp.dynamicScriptsInitialized');

                    AppConsts.recaptchaSiteKey = abp.setting.get('Recaptcha.SiteKey');
                    AppConsts.subscriptionExpireNootifyDayCount =
                        parseInt(abp.setting.get('App.TenantManagement.SubscriptionExpireNotifyDayCount'));

                    // Load dynamic resources, then call the outer callback exactly once
                    DynamicResourcesHelper.loadResources(() => {
                        if (finished) {
                            return;
                        }
                        finished = true;
                        callback();
                    });
                } catch (e) {
                    onFail(e);
                }
            };

            const onFail = (err?: any) => {
                if (finished || runId !== activeRunId) {
                    return;
                } // ignore if already superseded
                clear();
                if (attempt < attempts) {
                    const delay = scheduleBackoff(attempt - 1);
                    // optional: log
                    console.warn(`[bootstrap] getUserConfiguration attempt ${attempt}/${attempts} failed:`, err);
                    setTimeout(run, delay);
                } else {
                    finished = true;
                    console.error('[bootstrap] Failed to load user configuration after retries:', err);
                    if (typeof abp !== 'undefined' && abp?.message?.error) {
                        abp.message.error(
                            'We couldn’t load your user configuration. Please check your network and reload the page.',
                            'Startup Error'
                        );
                    } else {
                        alert('Failed to load user configuration. Please check your network and refresh.');
                    }
                }
            };

            try {
                // If your XmlHttpRequestHelper.ajax supports an error callback, pass it as the 6th arg.
                // Otherwise, the per-attempt timeout above will trigger retries.
                const fn: any = (XmlHttpRequestHelper as any).ajax;
                if (typeof fn === 'function' && fn.length >= 6) {
                    fn('GET', url, requestHeaders, null, onSuccess, onFail);
                } else {
                    fn('GET', url, requestHeaders, null, onSuccess);
                }
            } catch (e) {
                onFail(e);
            }
        };

        run();
    }

    private static configureDayjs() {
        const localeService = new LocaleMappingService();
        const currentLocale = localeService.map('dayjs', abp.localization.currentLanguage.name);

        dayjs.locale(currentLocale);  // Set locale globally

        (window as any).dayjs = dayjs;
        (window as any).dayjs.locale(currentLocale);

        if (abp.clock.provider.supportsMultipleTimezone) {
            const timeZoneId = abp.timing.timeZoneInfo.iana.timeZoneId;
            dayjs.tz.setDefault(timeZoneId);
            (window as any).dayjs.tz.setDefault(timeZoneId);
        } else {
            dayjs.prototype.toJSON = function() {
                return this.format(); // Default format
            };
            dayjs.prototype.toISOString = function() {
                return this.format(); // Default ISO format
            };
        }
    }

    private static setEncryptedTokenCookie(encryptedToken: string) {
        new UtilsService().setCookieValue(AppConsts.authorization.encrptedAuthTokenName,
            encryptedToken,
            new Date(new Date().getTime() + 365 * 86400000), //1 year
            abp.appPath
        );
    }

    private static loadAssetsForInstallPage(callback) {
        abp.setting.values['App.UiManagement.Theme'] = 'default';
        abp.setting.values['default.App.UiManagement.ThemeColor'] = 'default';

        DynamicResourcesHelper.loadResources(callback);
    }
}
