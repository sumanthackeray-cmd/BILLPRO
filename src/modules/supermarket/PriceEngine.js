/**
 * Supermarket Price & Offers Calculation Engine
 */

export function calculateCartOffers(cartItems, activeOffers, isLoyaltyMember = false) {
  // Deep copy cart items to prevent state mutation
  const processedItems = cartItems.map(item => {
    const rate = item.rate || item.mrp || 0;
    return {
      ...item,
      rate,
      originalTotal: (item.qty || 0) * rate,
      discountAmount: 0,
      appliedOffer: null,
      finalPrice: rate
    };
  });

  const activePromoList = activeOffers.filter(o => o.is_active);

  // 1. Apply Product-Level Offers (TPR, Member Price, Happy Hour, Quantity Breaks, BXGY)
  processedItems.forEach(item => {
    const productName = item.name.toLowerCase();
    const barcode = (item.barcode || "").toLowerCase();
    const pluCode = (item.plu_code || "").toLowerCase();

    // Find all offers targeting this specific product
    const productOffers = activePromoList.filter(o => {
      if (o.applies_to !== "product" && o.applies_to !== "category" && o.applies_to !== "dept") return false;
      
      const targets = Array.isArray(o.product_ids) ? o.product_ids.map(id => String(id).toLowerCase()) : [];
      return targets.includes(productName) || targets.includes(barcode) || targets.includes(pluCode) || 
             (o.applies_to === "category" && String(o.category_ids).toLowerCase() === String(item.category).toLowerCase());
    });

    let bestDiscount = 0;
    let bestOffer = null;

    productOffers.forEach(offer => {
      let discount = 0;

      // Handle member only filter
      if (offer.loyalty_member_only && !isLoyaltyMember) return;

      // Happy Hour Check
      if (offer.offer_type === "happy_hour") {
        const now = new Date();
        const currentHour = now.getHours();
        const [fromHour] = (offer.time_from || "00:00").split(":").map(Number);
        const [toHour] = (offer.time_to || "24:00").split(":").map(Number);
        
        if (currentHour < fromHour || currentHour >= toHour) return;
      }

      if (offer.offer_type === "tpr") {
        // Flat discount on unit rate or percent off
        const unitDiscount = offer.discount_value || 0;
        const unitPctDiscount = offer.discount_pct ? (item.rate * offer.discount_pct) / 100 : 0;
        discount = Math.max(unitDiscount, unitPctDiscount) * item.qty;
      } 
      else if (offer.offer_type === "bxgy") {
        // Buy X Get Y Free (e.g. Buy 2 Get 1 free => min_qty = 2, free_qty = 1, total set = 3)
        const buyQty = offer.min_qty || 2;
        const getQty = offer.free_qty || 1;
        const groupSize = buyQty + getQty;
        
        if (item.qty >= groupSize) {
          const setsCount = Math.floor(item.qty / groupSize);
          discount = setsCount * getQty * item.rate;
        }
      } 
      else if (offer.offer_type === "quantity_break") {
        // e.g. 3 for 100, MRP = 40 (normal 3 = 120, savings = 20)
        const minQty = offer.min_qty || 3;
        const discountValue = offer.discount_value || 0; // Flat savings amount for buying minQty
        
        if (item.qty >= minQty) {
          const blocks = Math.floor(item.qty / minQty);
          discount = blocks * discountValue;
        }
      } 
      else if (offer.offer_type === "member_price" && isLoyaltyMember) {
        const unitDiscount = offer.discount_value || 0;
        const unitPctDiscount = offer.discount_pct ? (item.rate * offer.discount_pct) / 100 : 0;
        discount = Math.max(unitDiscount, unitPctDiscount) * item.qty;
      }

      if (discount > bestDiscount) {
        bestDiscount = discount;
        bestOffer = offer;
      }
    });

    if (bestDiscount > 0) {
      item.discountAmount = bestDiscount;
      item.appliedOffer = bestOffer;
      item.finalPrice = Math.max(0, item.rate - (bestDiscount / item.qty));
    }
  });

  // 2. Apply Combo Offers (Buy A + B for ₹X)
  const comboOffers = activePromoList.filter(o => o.offer_type === "combo");
  comboOffers.forEach(combo => {
    // E.g., products_ids = ["Item A", "Item B"], discount_value = 50 off
    const comboTargets = Array.isArray(combo.product_ids) ? combo.product_ids.map(id => String(id).toLowerCase()) : [];
    if (comboTargets.length < 2) return;

    // Check if both elements are in the cart
    const matchingItems = processedItems.filter(item => {
      const name = item.name.toLowerCase();
      const code = (item.barcode || "").toLowerCase();
      return comboTargets.includes(name) || comboTargets.includes(code);
    });

    if (matchingItems.length >= comboTargets.length) {
      // Find the minimum quantity across the combo items
      const minComboQty = Math.min(...matchingItems.map(item => item.qty));
      
      if (minComboQty > 0) {
        // Apportion the discount across the combo components
        const totalComboDiscount = minComboQty * (combo.discount_value || 20);
        const splitDiscount = totalComboDiscount / matchingItems.length;

        matchingItems.forEach(item => {
          // If we already have a better deal on this item, keep it. Otherwise apply combo split.
          if (splitDiscount > item.discountAmount) {
            item.discountAmount = splitDiscount;
            item.appliedOffer = combo;
            item.finalPrice = Math.max(0, item.rate - (splitDiscount / item.qty));
          }
        });
      }
    }
  });

  // Calculate Subtotal after product-level discounts
  let cartSubtotal = processedItems.reduce((acc, item) => acc + (item.finalPrice * item.qty), 0);
  let totalProductDiscounts = processedItems.reduce((acc, item) => acc + item.discountAmount, 0);

  // 3. Apply Cart-Level Offers (Spend ₹1000 get ₹50 off)
  const cartOffers = activePromoList.filter(o => o.applies_to === "cart_total");
  let bestCartDiscount = 0;
  let bestCartOffer = null;

  cartOffers.forEach(offer => {
    if (cartSubtotal >= (offer.min_amount || 1000)) {
      let discount = offer.discount_value || 0;
      if (offer.discount_pct) {
        discount = (cartSubtotal * offer.discount_pct) / 100;
      }
      if (offer.max_discount && discount > offer.max_discount) {
        discount = offer.max_discount;
      }

      if (discount > bestCartDiscount) {
        bestCartDiscount = discount;
        bestCartOffer = offer;
      }
    }
  });

  const finalTotal = Math.max(0, cartSubtotal - bestCartDiscount);
  const totalSavings = totalProductDiscounts + bestCartDiscount;

  // Compile a list of applied promotions
  const appliedOffersSummary = [];
  processedItems.forEach(item => {
    if (item.appliedOffer) {
      const existing = appliedOffersSummary.find(o => o.id === item.appliedOffer.id);
      if (!existing) {
        appliedOffersSummary.push({
          id: item.appliedOffer.id,
          offer_name: item.appliedOffer.offer_name,
          discount: item.discountAmount
        });
      } else {
        existing.discount += item.discountAmount;
      }
    }
  });

  if (bestCartOffer) {
    appliedOffersSummary.push({
      id: bestCartOffer.id,
      offer_name: bestCartOffer.offer_name,
      discount: bestCartDiscount
    });
  }

  // Calculate HSN-wise GST Breakdown
  const gstBreakup = {};
  processedItems.forEach(item => {
    const gstRate = item.gst_rate || 0;
    const finalItemTotal = item.finalPrice * item.qty;
    // Apportion cart discount to items to correctly split tax
    const apportionedCartDiscount = cartSubtotal > 0 ? (finalItemTotal / cartSubtotal) * bestCartDiscount : 0;
    const taxableAmount = Math.max(0, finalItemTotal - apportionedCartDiscount);
    
    // Formula for GST included in rate
    const gstAmt = taxableAmount * (gstRate / (100 + gstRate));
    const baseAmt = taxableAmount - gstAmt;

    if (!gstBreakup[gstRate]) {
      gstBreakup[gstRate] = { taxBase: 0, taxAmt: 0 };
    }
    gstBreakup[gstRate].taxBase += baseAmt;
    gstBreakup[gstRate].taxAmt += gstAmt;
  });

  return {
    items: processedItems,
    subtotal: cartItems.reduce((acc, item) => acc + ((item.rate || item.mrp || 0) * (item.qty || 0)), 0),
    discountedSubtotal: cartSubtotal,
    cartDiscount: bestCartDiscount,
    appliedCartOffer: bestCartOffer,
    totalSavings,
    grandTotal: finalTotal,
    gstBreakup,
    totalGst: Object.values(gstBreakup).reduce((acc, curr) => acc + curr.taxAmt, 0),
    appliedOffersSummary
  };
}
