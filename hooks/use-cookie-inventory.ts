"use client";

import { useCallback, useEffect, useState } from "react";
import { getCookieInventory, type CookieDomainGroup } from "@/lib/extension-bridge";

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
        setError("Could not read local cookie inventory. Run an extension scan first.");
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

  return { groups, isLoading, error, refresh: load };
}
