import { useState, useCallback } from 'react';

export interface CookiePreferences {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
}

export interface CookieConsentRecord {
  preferences: CookiePreferences;
  timestamp: number;
  version: string;
}

const STORAGE_KEY        = 'saafo_cookie_consent';
const CONSENT_VERSION    = '1.0';
const CONSENT_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000; // 12 meses

function readStorage(): CookieConsentRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsentRecord;
    if (parsed.version !== CONSENT_VERSION) return null;
    if (Date.now() - parsed.timestamp > CONSENT_MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function useCookieConsent() {
  const [record, setRecord] = useState<CookieConsentRecord | null>(readStorage);

  const save = useCallback((partial: Omit<CookiePreferences, 'necessary'>) => {
    const next: CookieConsentRecord = {
      preferences: { necessary: true, ...partial },
      timestamp: Date.now(),
      version: CONSENT_VERSION,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setRecord(next);
  }, []);

  const acceptAll  = useCallback(() => save({ analytics: true,  marketing: true  }), [save]);
  const rejectAll  = useCallback(() => save({ analytics: false, marketing: false }), [save]);
  const saveCustom = useCallback(
    (p: Omit<CookiePreferences, 'necessary'>) => save(p),
    [save],
  );

  return {
    hasConsented:  record !== null,
    preferences:   record?.preferences ?? null,
    consentedAt:   record?.timestamp   ?? null,
    acceptAll,
    rejectAll,
    saveCustom,
  };
}
