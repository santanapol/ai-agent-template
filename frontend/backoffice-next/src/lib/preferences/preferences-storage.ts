"use client";

import {
  getPreferencePersistence,
  type PreferenceKey,
  type PreferencePersistence,
  type PreferenceValueMap,
} from "./preferences-config";
import { getClientCookie, getLocalStorageValue, setClientCookie, setLocalStorageValue } from "./storage";

function readByMode(mode: PreferencePersistence, key: string): string | null {
  switch (mode) {
    case "localStorage":
      return getLocalStorageValue(key);
    case "client-cookie":
      return getClientCookie(key);
    default:
      return null;
  }
}

function persistByMode(mode: PreferencePersistence, key: string, value: string): void {
  switch (mode) {
    case "localStorage":
      setLocalStorageValue(key, value);
      return;
    case "client-cookie":
      setClientCookie(key, value);
      return;
    default:
      return;
  }
}

export function readPersistedPreference<K extends PreferenceKey>(key: K): string | null {
  return readByMode(getPreferencePersistence(key), key);
}

export function persistPreference<K extends PreferenceKey>(key: K, value: PreferenceValueMap[K]): void {
  persistByMode(getPreferencePersistence(key), key, value);
}
