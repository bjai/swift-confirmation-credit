import { InjectionToken } from '@angular/core';

/** Provide the MT910 API base URL — defaults to '/api/mt910' */
export const MT910_API_BASE = new InjectionToken<string>('MT910_API_BASE', {
  providedIn: 'root',
  factory: () => '/api/mt910',
});
