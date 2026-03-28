"use client";

import { useCallback, useEffect, useState } from "react";
import {
  deleteCookieKeys,
  deleteDomainCookies,
  generateMockCookieManagementState,
  getCookieManagementState,
  getDomainCookies,
  getMockCookieDomainCookies,
  restoreCleanupBatch,
  setDomainProtection,
  type CookieDomainCookie,
  type CookieManagementState,
} from "@/lib/extension-bridge";

interface UseCookieManagementOptions {
  enabled: boolean;
  isDevMode: boolean;
}

interface UseCookieManagementResult {
  management: CookieManagementState | null;
  domainCookies: CookieDomainCookie[];
  selectedDomain: string | null;
  isLoading: boolean;
  isDomainLoading: boolean;
  error: string | null;
  selectDomain: (domain: string | null) => Promise<void>;
  refresh: () => Promise<void>;
  toggleDomainProtection: (domain: string, nextValue: boolean) => Promise<void>;
  deleteDomain: (domain: string) => Promise<void>;
  deleteCookies: (keys: string[]) => Promise<void>;
  restoreBatch: (batchId: string) => Promise<void>;
}

export function useCookieManagement({
  enabled,
  isDevMode,
}: UseCookieManagementOptions): UseCookieManagementResult {
  const [management, setManagement] = useState<CookieManagementState | null>(null);
  const [domainCookies, setDomainCookies] = useState<CookieDomainCookie[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDomainLoading, setIsDomainLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDomainCookies = useCallback(
    async (domain: string | null) => {
      setSelectedDomain(domain);

      if (!domain) {
        setDomainCookies([]);
        return;
      }

      setIsDomainLoading(true);
      try {
        const cookies = isDevMode
          ? getMockCookieDomainCookies(domain)
          : await getDomainCookies(domain);
        setDomainCookies(cookies);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load cookies for domain.");
      } finally {
        setIsDomainLoading(false);
      }
    },
    [isDevMode]
  );

  const refresh = useCallback(async () => {
    if (!enabled) {
      setManagement(null);
      setDomainCookies([]);
      setSelectedDomain(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nextManagement = isDevMode
        ? generateMockCookieManagementState()
        : await getCookieManagementState();

      setManagement(nextManagement);

      const nextSelectedDomain =
        selectedDomain && nextManagement?.domains.some((domain) => domain.domain === selectedDomain)
          ? selectedDomain
          : nextManagement?.domains[0]?.domain || null;

      await loadDomainCookies(nextSelectedDomain);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cookie management state.");
    } finally {
      setIsLoading(false);
    }
  }, [enabled, isDevMode, loadDomainCookies, selectedDomain]);

  const updateFromAction = useCallback(
    async (nextManagement: CookieManagementState | null) => {
      if (!nextManagement) {
        setError("The extension did not return an updated management state.");
        return;
      }

      setManagement(nextManagement);
      const nextSelectedDomain =
        selectedDomain && nextManagement.domains.some((domain) => domain.domain === selectedDomain)
          ? selectedDomain
          : nextManagement.domains[0]?.domain || null;

      await loadDomainCookies(nextSelectedDomain);
    },
    [loadDomainCookies, selectedDomain]
  );

  const toggleDomainProtectionAction = useCallback(
    async (domain: string, nextValue: boolean) => {
      if (isDevMode) {
        const nextManagement = generateMockCookieManagementState();
        nextManagement.protectedDomains = nextValue
          ? [...new Set([...nextManagement.protectedDomains, domain])]
          : nextManagement.protectedDomains.filter((entry) => entry !== domain);
        nextManagement.domains = nextManagement.domains.map((entry) =>
          entry.domain === domain ? { ...entry, protected: nextValue } : entry
        );
        await updateFromAction(nextManagement);
        return;
      }

      await updateFromAction(await setDomainProtection({ domain, protected: nextValue }));
    },
    [isDevMode, updateFromAction]
  );

  const deleteDomainAction = useCallback(
    async (domain: string) => {
      if (isDevMode) {
        await refresh();
        return;
      }

      await updateFromAction(await deleteDomainCookies({ domain }));
    },
    [isDevMode, refresh, updateFromAction]
  );

  const deleteCookiesAction = useCallback(
    async (keys: string[]) => {
      if (keys.length === 0) {
        return;
      }

      if (isDevMode) {
        await refresh();
        return;
      }

      await updateFromAction(await deleteCookieKeys({ keys }));
    },
    [isDevMode, refresh, updateFromAction]
  );

  const restoreBatchAction = useCallback(
    async (batchId: string) => {
      if (isDevMode) {
        await refresh();
        return;
      }

      await updateFromAction(await restoreCleanupBatch({ batchId }));
    },
    [isDevMode, refresh, updateFromAction]
  );

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  return {
    management,
    domainCookies,
    selectedDomain,
    isLoading,
    isDomainLoading,
    error,
    selectDomain: loadDomainCookies,
    refresh,
    toggleDomainProtection: toggleDomainProtectionAction,
    deleteDomain: deleteDomainAction,
    deleteCookies: deleteCookiesAction,
    restoreBatch: restoreBatchAction,
  };
}
