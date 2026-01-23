/**
 * App lifecycle for sync: pause when background, resume on foreground.
 * Uses both Capacitor App plugin (for native Android/iOS) and Page Visibility API (web/fallback).
 * Sync is debounced; when coming to foreground we schedule sync (runs only if online).
 * 
 * Android-specific: Handles pause/resume events to prevent data loss and optimize battery.
 */

import { scheduleSync, cancelScheduledSync } from './syncEngine';
import { App } from '@capacitor/app';
import { isNative } from './capacitor';

export function initAppLifecycle(): () => void {
  let appStateListener: any = null;
  let visibilityCleanup: (() => void) | null = null;

  // Native lifecycle (Android/iOS) - more reliable than visibility API
  if (isNative()) {
    appStateListener = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        // App came to foreground - schedule sync
        scheduleSync();
      } else {
        // App went to background - cancel pending syncs to save battery
        cancelScheduledSync();
      }
    });
  }

  // Web/fallback: Page Visibility API
  const handleVisibility = () => {
    if (document.visibilityState === 'hidden') {
      cancelScheduledSync();
    } else {
      scheduleSync();
    }
  };

  document.addEventListener('visibilitychange', handleVisibility);
  visibilityCleanup = () => {
    document.removeEventListener('visibilitychange', handleVisibility);
  };

  return () => {
    if (appStateListener) {
      appStateListener.remove();
      appStateListener = null;
    }
    if (visibilityCleanup) {
      visibilityCleanup();
      visibilityCleanup = null;
    }
    cancelScheduledSync();
  };
}
