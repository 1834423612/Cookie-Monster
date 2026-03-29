"use client";

import { useCallback, useEffect, useState } from "react";
import {
  generateMockCookieManagementState,
  getCookieManagementState,
  getDomainCookies,
  getMockCookieDomainCookies,
  requestCookieFeed,
  restoreCleanupBatch,
  setDomainProtection,
  type CookieDomainCookie,
  type CookieManagementState,
  type PendingFeedRequestSummary,
} from "@/lib/extension-bridge";
import { subscribeToExtensionSync } from "@/lib/extension-sync";

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
  queueDomainFeed: (domain: string) => Promise<PendingFeedRequestSummary | null>;
  queueCookieFeed: (
    keys: string[],
    options?: { label?: string; description?: string }
  ) => Promise<PendingFeedRequestSummary | null>;
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
      setError(null);
      setIsLoading(false);
      setIsDomainLoading(false);
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
    async (
      domain: string,
      options?: { label?: string; description?: string }
    ): Promise<PendingFeedRequestSummary | null> => {
      setError(null);

      const cookies = isDevMode
        ? getMockCookieDomainCookies(domain)
        : await getDomainCookies(domain);
      const keys = cookies.map((cookie) => cookie.key);

      if (keys.length === 0) {
        setError("No local cookies are available to queue for that domain.");
        return null;
      }

      if (isDevMode) {
        return {
          requestId: `mock-domain-feed-${Date.now()}`,
          createdAt: new Date().toISOString(),
          presetId: null,
          label: options?.label || `Domain review: ${domain}`,
          description:
            options?.description ||
            `The extension will review ${keys.length} cookies from ${domain} locally before cleanup.`,
          cookieCount: keys.length,
          domainCount: 1,
          sampleDomains: [domain],
          source: "website",
        };
      }

      const pending = await requestCookieFeed({
        keys,
        label: options?.label || `Domain review: ${domain}`,
        description:
          options?.description ||
          `The extension will review ${keys.length} cookies from ${domain} locally before cleanup.`,
      });

      if (!pending) {
        setError("The extension could not create a pending domain review request.");
        return null;
      }

      await refresh();
      return pending;
    },
    [isDevMode, refresh]
  );

  const deleteCookiesAction = useCallback(
    async (
      keys: string[],
      options?: { label?: string; description?: string }
    ): Promise<PendingFeedRequestSummary | null> => {
      if (keys.length === 0) {
        return null;
      }

      setError(null);

      if (isDevMode) {
        return {
          requestId: `mock-cookie-feed-${Date.now()}`,
          createdAt: new Date().toISOString(),
          presetId: null,
          label: options?.label || "Cookie review request",
          description:
            options?.description ||
            `The extension will review ${keys.length} selected cookies locally before cleanup.`,
          cookieCount: keys.length,
          domainCount: selectedDomain ? 1 : 0,
          sampleDomains: selectedDomain ? [selectedDomain] : [],
          source: "website",
        };
      }

      const pending = await requestCookieFeed({
        keys,
        label: options?.label,
        description: options?.description,
      });

      if (!pending) {
        setError("The extension could not create a pending cookie review request.");
        return null;
      }

      await refresh();
      return pending;
    },
    [isDevMode, refresh, selectedDomain]
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

  useEffect(() => {
    if (!enabled || isDevMode) {
      return;
    }

    return subscribeToExtensionSync(() => {
      refresh().catch(() => undefined);
    });
  }, [enabled, isDevMode, refresh]);

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
    queueDomainFeed: deleteDomainAction,
    queueCookieFeed: deleteCookiesAction,
    restoreBatch: restoreBatchAction,
  };
}
