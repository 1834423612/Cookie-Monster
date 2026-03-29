"use client";

import { useCallback, useEffect, useState } from "react";
import { getCookieInventory, type CookieDomainGroup } from "@/lib/extension-bridge";
import { subscribeToExtensionSync } from "@/lib/extension-sync";

interface CookieInventoryState {
  groups: CookieDomainGroup[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCookieInventory(enabled: boolean): CookieInventoryState {
  const [groups, setGroups] = useState<CookieDomainGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) {
      setGroups([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const inventory = await getCookieInventory();
      if (!inventory) {
        setGroups([]);
        setError("Unable to load local cookie inventory. Run a scan in the extension first.");
        return;
      }
      setGroups(inventory);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    return subscribeToExtensionSync(() => {
      load().catch(() => undefined);
    });
  }, [enabled, load]);

  return { groups, isLoading, error, refresh: load };
}
