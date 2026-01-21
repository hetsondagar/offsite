/**
 * Capacitor integration utilities
 * Provides platform detection and Capacitor plugin access
 */

import { Capacitor } from '@capacitor/core';

/**
 * Check if running in a native Capacitor app
 */
export const isNative = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Check if running on Android
 */
export const isAndroid = (): boolean => {
  return Capacitor.getPlatform() === 'android';
};

/**
 * Check if running on iOS
 */
export const isIOS = (): boolean => {
  return Capacitor.getPlatform() === 'ios';
};

/**
 * Check if running on web
 */
export const isWeb = (): boolean => {
  return Capacitor.getPlatform() === 'web';
};
