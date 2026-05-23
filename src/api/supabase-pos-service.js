/**
 * Supabase POS (Point of Sale) Service
 * Handles invoicing, payments, and transaction management
 */

import { supabase } from '../lib/supabase';
import { getCurrentUser } from './supabase-auth';

/**
 * Create a new invoice
 */
export async function createInvoice(invoiceData) {
  const user = getCurrentUser();
  if (!user) throw new Error('User not authenticated');

  try {
    const invoice = {
      invoice_number: invoiceData.invoiceNumber,
      branch_id: invoiceData.branchId,
      customer_id: invoiceData.customerId || null,
      cashier_id: user.uid,
      subtotal: invoiceData.subtotal || 0,
      total_tax: invoiceData.totalTax || 0,
      grand_total: invoiceData.grandTotal || 0,
      status: invoiceData.status || 'Draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('invoices')
      .insert([invoice])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating invoice:', error);
    throw error;
  }
}

/**
 * Get invoice by ID
 */
export async function getInvoice(invoiceId) {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        invoice_items (
          id,
          product_id,
          quantity,
          unit_price,
          line_total,
          discount
        ),
        payments (
          id,
          amount,
          payment_method,
          reference_id,
          created_at
        )
      `)
      .eq('id', invoiceId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  } catch (error) {
    console.error('Error fetching invoice:', error);
    throw error;
  }
}

/**
 * Get invoice by invoice number
 */
export async function getInvoiceByNumber(invoiceNumber) {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        invoice_items (
          id,
          product_id,
          quantity,
          unit_price,
          line_total,
          discount
        ),
        payments (
          id,
          amount,
          payment_method,
          reference_id,
          created_at
        )
      `)
      .eq('invoice_number', invoiceNumber)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  } catch (error) {
    console.error('Error fetching invoice by number:', error);
    throw error;
  }
}

/**
 * Get invoices for a branch
 */
export async function getBranchInvoices(branchId, limit = 100, offset = 0) {
  try {
    const { data, error, count } = await supabase
      .from('invoices')
      .select(`
        *,
        invoice_items (count)
      `, { count: 'exact' })
      .eq('branch_id', branchId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { invoices: data || [], total: count };
  } catch (error) {
    console.error('Error fetching branch invoices:', error);
    return { invoices: [], total: 0 };
  }
}

/**
 * Add line item to invoice
 */
export async function addInvoiceItem(invoiceId, itemData) {
  try {
    const item = {
      invoice_id: invoiceId,
      product_id: itemData.productId,
      quantity: itemData.quantity,
      unit_price: itemData.unitPrice,
      line_total: itemData.lineTotal,
      discount: itemData.discount || 0,
    };

    const { data, error } = await supabase
      .from('invoice_items')
      .insert([item])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding invoice item:', error);
    throw error;
  }
}

/**
 * Record payment for invoice
 */
export async function recordPayment(invoiceId, paymentData) {
  try {
    const payment = {
      invoice_id: invoiceId,
      amount: paymentData.amount,
      payment_method: paymentData.paymentMethod,
      reference_id: paymentData.referenceId || null,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('payments')
      .insert([payment])
      .select()
      .single();

    if (error) throw error;

    // Update invoice status to Completed if full amount is paid
    await updateInvoiceStatus(invoiceId, 'Completed');

    return data;
  } catch (error) {
    console.error('Error recording payment:', error);
    throw error;
  }
}

/**
 * Update invoice status
 */
export async function updateInvoiceStatus(invoiceId, status) {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .update({
        status: status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating invoice status:', error);
    throw error;
  }
}

/**
 * Create a return for an invoice
 */
export async function createReturn(returnData) {
  try {
    const returnRecord = {
      original_invoice_id: returnData.originalInvoiceId,
      branch_id: returnData.branchId,
      total_return_amount: returnData.totalReturnAmount,
      status: returnData.status || 'Pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('returns')
      .insert([returnRecord])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating return:', error);
    throw error;
  }
}

/**
 * Get returns for a branch
 */
export async function getBranchReturns(branchId) {
  try {
    const { data, error } = await supabase
      .from('returns')
      .select('*')
      .eq('branch_id', branchId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching returns:', error);
    return [];
  }
}

/**
 * Update return status
 */
export async function updateReturnStatus(returnId, status) {
  try {
    const { data, error } = await supabase
      .from('returns')
      .update({
        status: status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', returnId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating return status:', error);
    throw error;
  }
}

/**
 * Get invoice count for a date range
 */
export async function getInvoiceCount(branchId, startDate, endDate) {
  try {
    const { count, error } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('branch_id', branchId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error getting invoice count:', error);
    return 0;
  }
}

/**
 * Get daily sales total
 */
export async function getDailySalesTotal(branchId, date) {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('invoices')
      .select('grand_total')
      .eq('branch_id', branchId)
      .eq('status', 'Completed')
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString());

    if (error) throw error;

    const total = (data || []).reduce((sum, inv) => sum + (inv.grand_total || 0), 0);
    return total;
  } catch (error) {
    console.error('Error getting daily sales total:', error);
    return 0;
  }
}

/**
 * Search invoices by customer or invoice number
 */
export async function searchInvoices(branchId, query) {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        customers (
          name,
          phone,
          email
        )
      `)
      .eq('branch_id', branchId)
      .or(`invoice_number.ilike.%${query}%,customers.name.ilike.%${query}%`);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error searching invoices:', error);
    return [];
  }
}

/**
 * Void an invoice
 */
export async function voidInvoice(invoiceId) {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .update({
        status: 'Voided',
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error voiding invoice:', error);
    throw error;
  }
}
