/**
 * STEP 19E-2: Price Resolution Helper (Pure Logic)
 * 
 * Purpose: Resolve final price based on base price, discount, and wholesale tiers
 * - Pure function (no DB, no engine)
 * - Quantity < minQty → ignore wholesale
 * - Take tier with highest minQty that ≤ quantity
 * - Discount > wholesale? → wholesale wins (lower price wins)
 */

export interface WholesalePrice {
  minQty: number;
  price: number;
}

export interface ResolvePriceParams {
  basePrice: number;
  discountPrice?: number | null;
  wholesalePrices?: WholesalePrice[];
  quantity: number;
}

export interface ResolvePriceResult {
  finalPrice: number;
  pricePerUnit: number;
  appliedTier: WholesalePrice | null;
  appliedDiscount: boolean;
  source: 'base' | 'discount' | 'wholesale';
}

/**
 * Resolve final price based on quantity and available pricing tiers
 * 
 * Rules:
 * 1. If quantity < all minQty → use basePrice or discountPrice
 * 2. If quantity >= any minQty → find tier with highest minQty ≤ quantity
 * 3. Compare discountPrice vs wholesalePrice → take lower (better for customer)
 * 
 * @param params - Price resolution parameters
 * @returns Resolved price information
 */
export function resolvePrice(params: ResolvePriceParams): ResolvePriceResult {
  const { basePrice, discountPrice, wholesalePrices = [], quantity } = params;

  // Validate inputs
  if (basePrice <= 0) {
    throw new Error('basePrice must be greater than 0');
  }

  if (quantity <= 0) {
    throw new Error('quantity must be greater than 0');
  }

  // Sort wholesale prices by minQty DESC (to find highest applicable tier)
  const sortedWholesale = [...wholesalePrices].sort((a, b) => b.minQty - a.minQty);

  // Find applicable wholesale tier (highest minQty that ≤ quantity)
  let applicableTier: WholesalePrice | null = null;
  for (const tier of sortedWholesale) {
    if (quantity >= tier.minQty) {
      applicableTier = tier;
      break;
    }
  }

  // If no applicable tier, use base price or discount
  if (!applicableTier) {
    const useDiscount = discountPrice !== null && discountPrice !== undefined && discountPrice < basePrice;
    const finalPrice = useDiscount ? discountPrice : basePrice;

    return {
      finalPrice,
      pricePerUnit: finalPrice,
      appliedTier: null,
      appliedDiscount: useDiscount,
      source: useDiscount ? 'discount' : 'base',
    };
  }

  // We have an applicable wholesale tier
  const wholesalePrice = applicableTier.price;

  // Compare discountPrice vs wholesalePrice
  // Take the lower price (better for customer)
  const useDiscount = discountPrice !== null && discountPrice !== undefined && discountPrice < basePrice;
  const discountPriceValue = useDiscount ? discountPrice : basePrice;

  // If discount price is lower than wholesale, use discount
  // Otherwise, use wholesale (wholesale wins if it's lower or equal)
  if (discountPriceValue < wholesalePrice) {
    return {
      finalPrice: discountPriceValue,
      pricePerUnit: discountPriceValue,
      appliedTier: null, // Discount overrides wholesale
      appliedDiscount: true,
      source: 'discount',
    };
  } else {
    // Wholesale wins (lower or equal price)
    return {
      finalPrice: wholesalePrice,
      pricePerUnit: wholesalePrice,
      appliedTier: applicableTier,
      appliedDiscount: false, // Wholesale overrides discount
      source: 'wholesale',
    };
  }
}

/**
 * Get applicable wholesale tier for given quantity (helper function)
 * 
 * @param wholesalePrices - Array of wholesale price tiers
 * @param quantity - Quantity to check
 * @returns Applicable tier or null
 */
export function getApplicableWholesaleTier(
  wholesalePrices: WholesalePrice[],
  quantity: number
): WholesalePrice | null {
  if (!wholesalePrices || wholesalePrices.length === 0) {
    return null;
  }

  // Sort by minQty DESC to find highest applicable tier
  const sorted = [...wholesalePrices].sort((a, b) => b.minQty - a.minQty);

  for (const tier of sorted) {
    if (quantity >= tier.minQty) {
      return tier;
    }
  }

  return null;
}

