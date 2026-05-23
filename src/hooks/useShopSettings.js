import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import React, { useEffect } from "react";

const LOCAL_STORAGE_KEY = "base44_shop_settings";

const getCachedSettings = () => {
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch {
    return [];
  }
};

export function useShopSettings() {
  const queryClient = useQueryClient();

  const { data: settings = [], ...rest } = useQuery({
    queryKey: ["shopSettings"],
    queryFn: () => base44.entities.ShopSettings.list(),
    staleTime: 5 * 60 * 1000, // 5 minutes fresh time
    gcTime: 30 * 60 * 1000,
    initialData: getCachedSettings,
  });

  const emptyFallback = React.useMemo(() => ({}), []);
  const shopSettings = React.useMemo(() => {
    const activeSettings = settings.length > 0 ? settings : getCachedSettings();
    return activeSettings.find(s => s.business_entity_type && s.business_entity_type.trim() !== "") || activeSettings[0] || emptyFallback;
  }, [settings, emptyFallback]);

  // Sync back to localStorage when new settings lists are successfully fetched from the database
  useEffect(() => {
    if (settings && settings.length > 0) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings));
      } catch (err) {
        console.error("Failed to save settings to localStorage:", err);
      }
    }
  }, [settings]);

  const updateSettingsOptimistically = (newForm) => {
    // Merge existing and new form data
    const updatedSettings = [
      {
        ...shopSettings,
        ...newForm,
        id: shopSettings.id || "temp-shop-settings-id",
      }
    ];

    // Cancel active refetches to prevent overwriting our optimistic data
    queryClient.cancelQueries({ queryKey: ["shopSettings"] });

    // Directly set query data instantly (triggers immediate observers update)
    queryClient.setQueryData(["shopSettings"], updatedSettings);

    // Directly update local storage for instant state persistence across page loads
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedSettings));
    } catch (err) {
      console.error("Failed to save settings to localStorage:", err);
    }

    // Dispatch window event for custom listeners if any
    window.dispatchEvent(new CustomEvent("shopSettingsChanged", { detail: updatedSettings[0] }));
  };

  return {
    settings,
    shopSettings,
    updateSettingsOptimistically,
    ...rest,
  };
}
