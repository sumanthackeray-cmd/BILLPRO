import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { isOverdue, getMonth } from "@/lib/gst-utils";
import { useShopSettings } from "./useShopSettings";

export function useDashboardData(startDate, endDate) {
  const { shopSettings } = useShopSettings();
  const businessType = shopSettings.business_type || "retail";

  const { data: invoices = [], refetch: refetchInvoices } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-created_date", 500),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
  const { data: customers = [], refetch: refetchCustomers } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
  const { data: products = [], refetch: refetchProducts } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
  const { data: purchases = [], refetch: refetchPurchases } = useQuery({
    queryKey: ["purchases"],
    queryFn: () => base44.entities.Purchase.list("-created_date", 200),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
  const { data: expenses = [], refetch: refetchExpenses } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list("-created_date", 200),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
  const { data: loans = [], refetch: refetchLoans } = useQuery({
    queryKey: ["loans"],
    queryFn: () => base44.entities.Loan.list(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const refetchAll = () => {
    refetchInvoices();
    refetchCustomers();
    refetchProducts();
    refetchPurchases();
    refetchExpenses();
    refetchLoans();
  };

  const inRange = (dateStr) => {
    if (!dateStr || !startDate || !endDate) return false;
    return dateStr >= startDate && dateStr <= endDate;
  };

  const filteredInvoices = useMemo(() => invoices.filter(i => i.type === "sale" && inRange(i.date)), [invoices, startDate, endDate]);
  const filteredPurchases = useMemo(() => purchases.filter(p => inRange(p.date)), [purchases, startDate, endDate]);
  const filteredExpenses = useMemo(() => expenses.filter(e => inRange(e.date)), [expenses, startDate, endDate]);

  const totalSales = filteredInvoices.reduce((s, i) => s + (i.grand_total || 0), 0);
  const totalTax = filteredInvoices.reduce((s, i) => s + (i.tax_amount || 0), 0);
  const totalPurchases = filteredPurchases.reduce((s, p) => s + (p.grand_total || 0), 0);
  const totalExpenses = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const grossProfit = totalSales - totalPurchases;
  const netProfit = grossProfit - totalExpenses;
  const outstanding = invoices.filter(i => i.status !== "paid" && i.type === "sale").reduce((s, i) => s + (i.grand_total || 0) - (i.paid_amount || 0), 0);
  const overdueInvoices = invoices.filter(isOverdue);
  const lowStock = products.filter(p => p.stock > 0 && p.stock <= (p.min_stock || 10));
  const outStock = products.filter(p => p.stock === 0);
  const totalLoanOutstanding = loans.filter(l => l.status === "Active").reduce((s, l) => s + (l.outstanding_balance || l.principal_amount || 0), 0);

  const prevStart = startDate ? (() => { const d = new Date(startDate); d.setDate(d.getDate() - Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)))); return d.toISOString().split("T")[0]; })() : null;
  const prevEnd = startDate ? (() => { const d = new Date(startDate); d.setDate(d.getDate() - 1); return d.toISOString().split("T")[0]; })() : null;
  const prevSales = invoices.filter(i => i.type === "sale" && i.date >= prevStart && i.date <= prevEnd).reduce((s, i) => s + (i.grand_total || 0), 0);
  const salesTrend = prevSales > 0 ? Math.round(((totalSales - prevSales) / prevSales) * 100) : 0;

  // Daily chart data (last 14 days within range or within period)
  const dailyData = useMemo(() => {
    const periodDays = Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)));
    const days = Math.min(periodDays, 30);
    return Array.from({ length: Math.min(days, 14) }, (_, i) => {
      const d = new Date(endDate);
      d.setDate(d.getDate() - (Math.min(days, 14) - 1 - i));
      const dayKey = d.toISOString().split("T")[0];
      const daySales = filteredInvoices.filter(inv => inv.date === dayKey).reduce((s, inv) => s + (inv.grand_total || 0), 0);
      const dayExp = filteredExpenses.filter(e => e.date === dayKey).reduce((s, e) => s + (e.amount || 0), 0);
      return {
        day: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
        Sales: daySales,
        Expenses: dayExp,
      };
    });
  }, [filteredInvoices, filteredExpenses, endDate, startDate]);

  const monthlyData = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (5 - i));
    const mk = d.toISOString().slice(0, 7);
    const sales = invoices.filter(inv => inv.type === "sale" && getMonth(inv.date) === mk).reduce((s, inv) => s + (inv.grand_total || 0), 0);
    const purch = purchases.filter(p => getMonth(p.date) === mk).reduce((s, p) => s + (p.grand_total || 0), 0);
    const exp = expenses.filter(e => getMonth(e.date) === mk).reduce((s, e) => s + (e.amount || 0), 0);
    return {
      month: d.toLocaleString("en-IN", { month: "short" }),
      Sales: sales,
      Purchases: purch,
      Expenses: exp,
      Profit: sales - purch - exp,
    };
  }), [invoices, purchases, expenses]);

  return {
    shopSettings,
    businessType,
    invoices,
    customers,
    products,
    purchases,
    expenses,
    loans,
    filteredInvoices,
    filteredPurchases,
    filteredExpenses,
    totalSales,
    totalTax,
    totalPurchases,
    totalExpenses,
    grossProfit,
    netProfit,
    outstanding,
    overdueInvoices,
    lowStock,
    outStock,
    totalLoanOutstanding,
    salesTrend,
    dailyData,
    monthlyData,
    refetchAll
  };
}
