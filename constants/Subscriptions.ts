export const ENTITLEMENT_ID = 'Roast Pro';

/**
 * Consumable credit packs.
 * Keys = product IDs as configured in App Store Connect / RevenueCat.
 * Values = number of roast credits granted per purchase.
 */
export const CREDIT_PACKAGES: Record<string, number> = {
  'small': 15,
  'medium': 60,
  'large': 200,
  'promo': 30,
}
