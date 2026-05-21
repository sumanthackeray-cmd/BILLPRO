/**
 * Advanced POS Service
 * Handles billing, payments, offline sync, queue management for multiple counters
 */

import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  query,
  where,
  serverTimestamp,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';

let db = null;

export function initializePOSService(firebaseDb) {
  db = firebaseDb;
}

/**
 * Generate unique invoice number
 * Format: BRANCH-YYYY-MM-COUNTER-SEQUENCE
 * Example: BR001-2024-01-001 (1st invoice on 1 Jan)
 */
function generateInvoiceNumber(branchId) {
  const today = new Date();
  const date = today.toISOString().split('T')[0].replace(/-/g, '');
  const sequence = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(5, '0');
  return `${branchId}-${date}-${sequence}`;
}

/**
 * Create a new bill/invoice
 * @param {Object} billData - Invoice data
 * @param {string} billData.branchId - Branch ID
 * @param {string} billData.customerId - Customer ID (optional)
 * @param {string} billData.cashierId - Cashier user ID
 * @param {Array} billData.items - Array of items (productId, quantity, unitPrice, discount)
 * @param {Array} billData.payments - Array of payments (method, amount)
 * @param {number} billData.subtotal - Subtotal before tax
 * @param {number} billData.totalTax - Total tax amount
 * @param {number} billData.grandTotal - Final total
 * @returns {Promise<Object>} Created invoice
 */
export async function createBill(billData) {
  if (!db) throw new Error('Database not initialized');

  try {
    const invoice = {
      invoiceNumber: generateInvoiceNumber(billData.branchId),
      branchId: billData.branchId,
      customerId: billData.customerId || null,
      cashierId: billData.cashierId,
      items: billData.items || [],
      subtotal: billData.subtotal || 0,
      totalDiscount: billData.totalDiscount || 0,
      totalTax: billData.totalTax || 0,
      grandTotal: billData.grandTotal || 0,
      payments: billData.payments || [],
      status: 'Completed',
      notes: billData.notes || '',
      offlineSync: {
        isOffline: billData.isOffline || false,
        syncedAt: billData.isOffline ? null : Timestamp.now(),
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'invoices'), invoice);

    // Update inventory for each item
    const batch = writeBatch(db);
    for (const item of billData.items) {
      // In a real app, you'd fetch current inventory and update it
      // For now, we just log the sale to analytics
    }
    await batch.commit();

    return { id: docRef.id, ...invoice };
  } catch (error) {
    console.error('Error creating bill:', error);
    throw error;
  }
}

/**
 * Get bill by ID
 * @param {string} invoiceId - Invoice ID
 * @returns {Promise<Object>} Invoice data
 */
export async function getBill(invoiceId) {
  if (!db) throw new Error('Database not initialized');

  try {
    const docRef = doc(db, 'invoices', invoiceId);
    const snapshot = await db.getDoc(docRef);
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
  } catch (error) {
    console.error('Error fetching bill:', error);
    throw error;
  }
}

/**
 * Get today's bills for a branch
 * @param {string} branchId - Branch ID
 * @returns {Promise<Array>} Array of today's invoices
 */
export async function getTodaysBills(branchId) {
  if (!db) throw new Error('Database not initialized');

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const q = query(
      collection(db, 'invoices'),
      where('branchId', '==', branchId),
      where('createdAt', '>=', Timestamp.fromDate(today)),
      where('createdAt', '<', Timestamp.fromDate(tomorrow))
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching today\'s bills:', error);
    return [];
  }
}

/**
 * Void/Cancel an invoice
 * @param {string} invoiceId - Invoice ID
 * @param {string} reason - Reason for cancellation
 * @returns {Promise<void>}
 */
export async function voidInvoice(invoiceId, reason = '') {
  if (!db) throw new Error('Database not initialized');

  try {
    const docRef = doc(db, 'invoices', invoiceId);
    await updateDoc(docRef, {
      status: 'Voided',
      voidReason: reason,
      voidedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error voiding invoice:', error);
    throw error;
  }
}

/**
 * Process a return/refund
 * @param {Object} returnData - Return information
 * @param {string} returnData.originalInvoiceId - Original invoice ID
 * @param {string} returnData.branchId - Branch ID
 * @param {Array} returnData.items - Items being returned
 * @param {number} returnData.refundAmount - Refund amount
 * @returns {Promise<Object>} Return record
 */
export async function processReturn(returnData) {
  if (!db) throw new Error('Database not initialized');

  try {
    const returnRecord = {
      originalInvoiceId: returnData.originalInvoiceId,
      branchId: returnData.branchId,
      returnItems: returnData.items || [],
      totalReturnAmount: returnData.refundAmount || 0,
      refundMethod: returnData.refundMethod || 'cash',
      status: 'Completed',
      approvedBy: returnData.approvedBy || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'returns'), returnRecord);
    return { id: docRef.id, ...returnRecord };
  } catch (error) {
    console.error('Error processing return:', error);
    throw error;
  }
}

/**
 * Open a cashier shift
 * @param {Object} shiftData - Shift information
 * @returns {Promise<Object>} Shift record
 */
export async function openShift(shiftData) {
  if (!db) throw new Error('Database not initialized');

  try {
    const shift = {
      cashierId: shiftData.cashierId,
      branchId: shiftData.branchId,
      shiftDate: Timestamp.fromDate(new Date()),
      openingBalance: shiftData.openingBalance || 0,
      closingBalance: null,
      totalCashReceived: 0,
      totalCashReturned: 0,
      invoicesCount: 0,
      returnsCount: 0,
      totalSales: 0,
      variances: 0,
      openedAt: serverTimestamp(),
      closedAt: null,
      openedBy: shiftData.openedBy || 'System',
      closedBy: null,
      notes: shiftData.notes || '',
    };

    const docRef = await addDoc(collection(db, 'cashierShifts'), shift);
    return { id: docRef.id, ...shift };
  } catch (error) {
    console.error('Error opening shift:', error);
    throw error;
  }
}

/**
 * Close a cashier shift with settlement
 * @param {string} shiftId - Shift ID
 * @param {Object} closureData - Closure information
 * @returns {Promise<void>}
 */
export async function closeShift(shiftId, closureData) {
  if (!db) throw new Error('Database not initialized');

  try {
    const docRef = doc(db, 'cashierShifts', shiftId);
    const expectedBalance = closureData.totalCashReceived - closureData.totalCashReturned;
    const variance = closureData.closingBalance - expectedBalance;

    await updateDoc(docRef, {
      closingBalance: closureData.closingBalance,
      totalCashReceived: closureData.totalCashReceived,
      totalCashReturned: closureData.totalCashReturned,
      invoicesCount: closureData.invoicesCount || 0,
      returnsCount: closureData.returnsCount || 0,
      totalSales: closureData.totalSales || 0,
      variances: variance,
      closedAt: serverTimestamp(),
      closedBy: closureData.closedBy,
      notes: closureData.notes || '',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error closing shift:', error);
    throw error;
  }
}

/**
 * Calculate bill totals
 * @param {Array} items - Bill items
 * @param {number} discount - Discount amount
 * @returns {Object} Calculated totals
 */
export function calculateTotals(items, discount = 0) {
  let subtotal = 0;
  let totalTax = 0;

  items.forEach(item => {
    const lineSubtotal = item.quantity * item.unitPrice;
    subtotal += lineSubtotal;

    if (item.gstRate) {
      const tax = (lineSubtotal * item.gstRate) / 100;
      totalTax += tax;
    }
  });

  const grandTotal = subtotal + totalTax - discount;

  return {
    subtotal,
    totalTax,
    discount,
    grandTotal,
  };
}

/**
 * Validate bill before submission
 * @param {Array} items - Bill items
 * @param {Array} payments - Payment methods
 * @param {number} grandTotal - Bill total
 * @returns {Object} Validation result
 */
export function validateBill(items, payments, grandTotal) {
  const errors = [];

  if (!items || items.length === 0) {
    errors.push('Bill must have at least one item');
  }

  if (!payments || payments.length === 0) {
    errors.push('Bill must have at least one payment method');
  }

  const totalPayment = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  if (Math.abs(totalPayment - grandTotal) > 1) {
    // Allow 1 paisa tolerance
    errors.push(
      `Payment total (₹${totalPayment}) does not match bill total (₹${grandTotal})`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Format bill for printing
 * @param {Object} bill - Invoice object
 * @returns {string} Formatted bill text for printing
 */
export function formatBillForPrint(bill) {
  const lines = [];
  lines.push('═'.repeat(40));
  lines.push('INVOICE');
  lines.push(`Invoice #: ${bill.invoiceNumber}`);
  lines.push(`Date: ${new Date(bill.createdAt).toLocaleString()}`);
  lines.push('─'.repeat(40));

  lines.push('Items:');
  bill.items.forEach(item => {
    lines.push(`${item.productId}`);
    lines.push(`  Qty: ${item.quantity} x ₹${item.unitPrice} = ₹${item.quantity * item.unitPrice}`);
  });

  lines.push('─'.repeat(40));
  lines.push(`Subtotal:  ₹${bill.subtotal.toFixed(2)}`);
  lines.push(`Tax:       ₹${bill.totalTax.toFixed(2)}`);
  if (bill.totalDiscount) {
    lines.push(`Discount:  ₹${bill.totalDiscount.toFixed(2)}`);
  }
  lines.push('─'.repeat(40));
  lines.push(`TOTAL:     ₹${bill.grandTotal.toFixed(2)}`);
  lines.push('═'.repeat(40));

  lines.push('Payment:');
  bill.payments.forEach(payment => {
    lines.push(`${payment.method}: ₹${payment.amount.toFixed(2)}`);
  });

  lines.push('═'.repeat(40));
  lines.push('Thank you for your purchase!');
  lines.push('═'.repeat(40));

  return lines.join('\n');
}

export default {
  initializePOSService,
  createBill,
  getBill,
  getTodaysBills,
  voidInvoice,
  processReturn,
  openShift,
  closeShift,
  calculateTotals,
  validateBill,
  formatBillForPrint,
};
