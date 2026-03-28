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
        setError("无法读取本地 Cookie 清单，请先在插件里执行扫描。");
        return;
      }
      setGroups(inventory);
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    load();
  }, [load]);

  return { groups, isLoading, error, refresh: load };
}
