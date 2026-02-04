import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';
import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';
import { API_BASE_URL } from './core/api-client/api-config';
import { AppConsts } from './shared/AppConsts';
import { provideAppStore } from './core/store';
import { apprxConfig } from './config';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';

// Custom theme with purple primary color
const CustomTheme = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{violet.50}',
      100: '{violet.100}',
      200: '{violet.200}',
      300: '{violet.300}',
      400: '{violet.400}',
      500: '#5643c1',
      600: '#4a39a8',
      700: '#3e2f8f',
      800: '#322576',
      900: '#261b5d',
      950: '#1a1144'
    }
  }
});

/**
 * Factory function to provide dynamic API_BASE_URL
 * At this point, AppPreBootstrap.run() has already completed and AppConsts is populated
 */
function getApiBaseUrl(): string {
  return AppConsts.remoteServiceBaseUrl || 'https://demo-connectapi.plattform.nl';
}

export const appConfig: ApplicationConfig = {
  providers: [
    // App Store - centralized state and configuration
    provideAppStore(apprxConfig),

    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([authInterceptor])),
    // API_BASE_URL is now provided from AppConsts which was populated by AppPreBootstrap
    {
      provide: API_BASE_URL,
      useFactory: getApiBaseUrl
    },
    providePrimeNG({
      theme: {
        preset: CustomTheme
      }
    })
  ]
};
