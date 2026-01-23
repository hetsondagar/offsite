/**
 * Robust network detection for offline-first.
 * Network is considered ONLINE only if ALL of the following pass:
 * 1. navigator.onLine
 * 2. Capacitor Network plugin (on native)
 * 3. Lightweight API ping with timeout ≤3s
 */

import { Network } from '@capacitor/network';
import { isNative } from './capacitor';
import { getApiBaseUrl } from './config';

const PING_TIMEOUT_MS = 3000;

async function navigatorOnline(): Promise<boolean> {
  if (typeof navigator === 'undefined') return false;
  return navigator.onLine;
}

async function capacitorNetworkOnline(): Promise<boolean> {
  if (!isNative()) return true; // not native, skip this check
  try {
    const s = await Network.getStatus();
    return s.connected;
  } catch {
    return false;
  }
}

async function apiPingOnline(): Promise<boolean> {
  try {
    const base = getApiBaseUrl().replace(/\/api\/?$/, '');
    const url = `${base}/health`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), PING_TIMEOUT_MS);
    const res = await fetch(url, {
      method: 'GET',
      signal: ctrl.signal,
      cache: 'no-cache',
    });
    clearTimeout(t);
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}

/**
 * Check if we are truly online. Must pass all three checks.
 */
export async function isOnline(): Promise<boolean> {
  const nav = await navigatorOnline();
  if (!nav) return false;

  const cap = await capacitorNetworkOnline();
  if (!cap) return false;

  const ping = await apiPingOnline();
  if (!ping) return false;

  return true;
}

export interface NetworkStatus {
  online: boolean;
  navigatorOk: boolean;
  capacitorOk: boolean;
  pingOk: boolean;
}

export async function getNetworkStatus(): Promise<NetworkStatus> {
  const navigatorOk = await navigatorOnline();
  const capacitorOk = await capacitorNetworkOnline();
  const pingOk = await apiPingOnline();
  const online = navigatorOk && capacitorOk && pingOk;
  return { online, navigatorOk, capacitorOk, pingOk };
}

export type NetworkListener = (online: boolean) => void;

let listenerCleanup: (() => void) | null = null;

/**
 * Subscribe to network changes. Uses Capacitor on native, window events on web.
 * Call returned function to unsubscribe.
 */
export function addNetworkListener(callback: NetworkListener): () => void {
  if (listenerCleanup) listenerCleanup();

  const notify = async () => {
    const on = await isOnline();
    callback(on);
  };

  if (isNative()) {
    const sub = Network.addListener('networkStatusChange', () => {
      notify();
    });
    listenerCleanup = () => {
      sub.remove();
      listenerCleanup = null;
    };
  } else {
    const handle = () => notify();
    window.addEventListener('online', handle);
    window.addEventListener('offline', handle);
    listenerCleanup = () => {
      window.removeEventListener('online', handle);
      window.removeEventListener('offline', handle);
      listenerCleanup = null;
    };
  }

  notify();

  return () => {
    if (listenerCleanup) {
      listenerCleanup();
      listenerCleanup = null;
    }
  };
}
