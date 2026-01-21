/**
 * Network status wrapper for Capacitor
 * Falls back to navigator.onLine on web
 */

import { Network } from '@capacitor/network';
import { isNative } from './capacitor';

export interface NetworkStatus {
  connected: boolean;
  connectionType: 'wifi' | 'cellular' | 'none' | 'unknown';
}

/**
 * Get current network status
 * Uses Capacitor Network on native, falls back to navigator.onLine on web
 */
export async function getNetworkStatus(): Promise<NetworkStatus> {
  if (isNative()) {
    const status = await Network.getStatus();
    return {
      connected: status.connected,
      connectionType: status.connectionType as 'wifi' | 'cellular' | 'none' | 'unknown',
    };
  } else {
    // Fallback to navigator.onLine on web
    return {
      connected: navigator.onLine,
      connectionType: navigator.onLine ? 'wifi' : 'none',
    };
  }
}

/**
 * Add network status change listener
 * Returns cleanup function
 */
export function addNetworkListener(
  callback: (status: NetworkStatus) => void
): () => void {
  if (isNative()) {
    const listener = Network.addListener('networkStatusChange', (status) => {
      callback({
        connected: status.connected,
        connectionType: status.connectionType as 'wifi' | 'cellular' | 'none' | 'unknown',
      });
    });

    // Return cleanup function
    return () => {
      listener.remove();
    };
  } else {
    // Fallback to window events on web
    const handleOnline = () => {
      callback({
        connected: true,
        connectionType: 'wifi',
      });
    };
    const handleOffline = () => {
      callback({
        connected: false,
        connectionType: 'none',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Return cleanup function
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }
}
