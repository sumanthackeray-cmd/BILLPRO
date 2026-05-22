import { useShopSettings } from "./useShopSettings";

export function useFashionMode() {
  const { shopSettings } = useShopSettings();

  const businessType = String(shopSettings.business_type || "retail").toLowerCase().trim();
  const customBusinessType = String(shopSettings.custom_business_type || "").toLowerCase().trim();

  const isFashion = [
    "fashion",
    "clothing",
    "garments",
    "boutique",
    "textile"
  ].includes(businessType) || [
    "fashion",
    "clothing",
    "garments",
    "boutique",
    "textile"
  ].includes(customBusinessType);

  return {
    isFashion,
    businessType,
    shopSettings,
  };
}
