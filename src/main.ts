import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { AppPreBootstrap } from './app/AppPreBootstrap';

// Get the application root URL
const appRootUrl = AppPreBootstrap.getDocumentOrigin() + AppPreBootstrap.getBaseHref();

console.log('[main.ts] Starting AppPreBootstrap with root URL:', appRootUrl);

// Run AppPreBootstrap FIRST to load configuration, then bootstrap Angular
AppPreBootstrap.run(appRootUrl)
  .then(() => {
    console.log('[main.ts] AppPreBootstrap complete, bootstrapping Angular...');
    return bootstrapApplication(App, appConfig);
  })
  .then(() => {
    console.log('[main.ts] Angular application bootstrapped successfully');
  })
  .catch((err) => {
    console.error('[main.ts] Bootstrap error:', err);
  });
