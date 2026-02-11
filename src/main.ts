import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { AppPreBootstrap, BootstrapError } from './app/AppPreBootstrap';
import { XmlHttpRequestHelper } from './app/shared/helpers/XmlHttpRequestHelper';

// ── Test mode: simulate backend failures via URL params ─────────────
// Usage:  ?test=bad-gateway          → 30s delay then 502
//         ?test=bad-gateway&delay=5  → 5s delay then 502
const testParams = new URLSearchParams(location.search);
const testMode = testParams.get('test');

if (testMode === 'bad-gateway') {
  const delaySeconds = parseInt(testParams.get('delay') || '30', 10);
  const delayMs = delaySeconds * 1000;

  console.warn(`[TEST MODE] Simulating ${delaySeconds}s delay + 502 Bad Gateway on AbpUserConfiguration/GetAll`);

  const origAjax = XmlHttpRequestHelper.ajax;

  XmlHttpRequestHelper.ajax = function (
    method: 'GET' | 'POST',
    url: string,
    customHeaders: { name: string; value: string }[] | null,
    data: string | null,
    successCallback: (result: any) => void,
    errorCallback?: (error: any) => void
  ): void {
    if (url.includes('AbpUserConfiguration/GetAll')) {
      console.warn(`[TEST MODE] Intercepted ${url} — will respond with 502 after ${delaySeconds}s`);
      setTimeout(() => {
        console.warn('[TEST MODE] Firing 502 Bad Gateway now');
        if (errorCallback) {
          errorCallback({ status: 502, statusText: 'Bad Gateway', responseText: 'Simulated by test mode' });
        }
      }, delayMs);
      return; // Don't call the real XHR
    }

    // All other requests pass through normally
    origAjax.call(XmlHttpRequestHelper, method, url, customHeaders, data, successCallback, errorCallback);
  };
}

// ── Normal bootstrap flow ───────────────────────────────────────────
const appRootUrl = AppPreBootstrap.getDocumentOrigin() + AppPreBootstrap.getBaseHref();

console.log('[main.ts] Starting AppPreBootstrap with root URL:', appRootUrl);

AppPreBootstrap.run(appRootUrl)
  .then(() => {
    console.log('[main.ts] AppPreBootstrap complete, bootstrapping Angular...');
    return bootstrapApplication(App, appConfig);
  })
  .then(() => {
    console.log('[main.ts] Angular application bootstrapped successfully');
    // Mark final step as done and clean up the loading screen
    window.__prebootLoading?.setStep('angular', 'done');
    // Small delay so the user can see the final checkmark
    setTimeout(() => {
      window.__prebootLoading?.destroy();
    }, 400);
  })
  .catch((err) => {
    console.error('[main.ts] Bootstrap error:', err);

    if (err instanceof BootstrapError) {
      window.__prebootLoading?.showMaintenance(err.detail || err.message);
    } else {
      window.__prebootLoading?.showMaintenance(
        err?.message || 'An unexpected error occurred during startup'
      );
    }
  });
