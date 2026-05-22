import { useShopSettings } from "./useShopSettings";

export function useSupermarketMode() {
  const { shopSettings } = useShopSettings();

  const businessType = String(shopSettings.business_type || "retail").toLowerCase().trim();
  const customBusinessType = String(shopSettings.custom_business_type || "").toLowerCase().trim();

  const isSupermarket = [
    "supermarket",
    "mall",
    "hypermarket",
    "grocery_store",
    "convenience_store",
    "departmental_store",
    "mini_mart"
  ].includes(businessType) || [
    "supermarket",
    "mall",
    "hypermarket",
    "grocery store",
    "grocery",
    "convenience store",
    "departmental store",
    "mini mart",
    "general store",
    "general store / mall"
  ].includes(customBusinessType);

  return {
    isSupermarket,
    businessType,
    shopSettings,
  };
}
