import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { accountingService, computeProfitLoss } from "../accountingService";
import { base44 } from "@/api/base44Client";

/**
 * Custom hook that computes finance KPIs using real ledger-based P&L.
 * Separates business logic from rendering for testability.
 */
export default function useFinanceKPIs() {
  const queryClient = useQueryClient();

  const { data: accounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: accountingService.getAccounts,
  });

  const { data: journals = [], isLoading: loadingJournals } = useQuery({
    queryKey: ["journal-entries"],
    queryFn: accountingService.getJournalEntries,
  });

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ["invoices_kpi"],
    queryFn: () => base44.entities.Invoice.list("-created_date", 500),
    staleTime: 60000,
  });

  const { data: purchases = [], isLoading: loadingPurchases } = useQuery({
    queryKey: ["purchases_kpi"],
    queryFn: () => base44.entities.Purchase.list("-created_date", 300),
    staleTime: 60000,
  });

  const { data: expenses = [], isLoading: loadingExpenses } = useQuery({
    queryKey: ["expenses_kpi"],
    queryFn: () => base44.entities.Expense.list("-created_date", 300),
    staleTime: 60000,
  });

  const { data: loans = [] } = useQuery({
    queryKey: ["loans"],
    queryFn: () => base44.entities.Loan.list(),
    staleTime: 120000,
  });

  const isLoading = loadingAccounts || loadingJournals || loadingInvoices || loadingExpenses || loadingPurchases;

  const kpis = useMemo(() => {
    if (isLoading) return null;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Build explicit day ranges to avoid timezone bugs
    const thisMonthStart = new Date(currentYear, currentMonth, 1);
    const thisMonthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
    const prevMonthStart = new Date(currentYear, currentMonth - 1, 1);
    const prevMonthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59);

    const isInRange = (dateStr, start, end) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d >= start && d <= end;
    };

    // --- Revenue from invoices (this month) ---
    const monthInvoices = invoices.filter(i =>
      i.type === "sale" && isInRange(i.date || i.created_date, thisMonthStart, thisMonthEnd)
    );
    const monthRevenue = monthInvoices.reduce((s, i) => s + (i.grand_total || 0), 0);
    const monthTax = monthInvoices.reduce((s, i) => s + (i.tax_amount || 0), 0);
    const monthNetRevenue = monthRevenue - monthTax;

    // --- Previous month revenue for growth calculation ---
    const prevInvoices = invoices.filter(i =>
      i.type === "sale" && isInRange(i.date || i.created_date, prevMonthStart, prevMonthEnd)
    );
    const prevNetRevenue = prevInvoices.reduce((s, i) => s + ((i.grand_total || 0) - (i.tax_amount || 0)), 0);
    const revenueGrowth = prevNetRevenue > 0 ? ((monthNetRevenue - prevNetRevenue) / prevNetRevenue * 100).toFixed(1) : null;

    // --- Real ledger-based P&L using computeProfitLoss ---
    const pl = computeProfitLoss(accounts, journals, invoices, purchases, expenses, loans);

    // --- Equity / Capital from ledger ---
    let capitalBase = 0;
    const equityAccounts = accounts.filter(a => a.type === "Equity" || a.category === "Capital");
    const equityNames = equityAccounts.map(a => a.name);
    const equityIds = equityAccounts.map(a => a.id);

    journals.forEach(je => {
      je.lines?.forEach(line => {
        if (equityIds.includes(line.accountId) || equityNames.includes(line.accountName)) {
          capitalBase += (Number(line.credit) || 0) - (Number(line.debit) || 0);
        }
      });
    });

    // If no journals posted yet, use a bridge from P&L retained earnings
    if (capitalBase === 0 && pl.netProfit !== 0) {
      capitalBase = pl.netProfit; // Retained earnings is the starting equity
    }

    return {
      accounts: accounts.length,
      journals: journals.length,
      monthRevenue: monthNetRevenue,
      monthGrossRevenue: monthRevenue,
      monthTax,
      netPL: pl.netProfit,
      grossProfit: pl.grossProfit,
      totalRevenue: pl.totalRevenue,
      totalCOGS: pl.totalDirectCost,
      totalIndirect: pl.totalIndirectCost,
      revenueGrowth,
      capitalBase,
      loanLiability: loans.filter(l => l.status === "Active").reduce((s, l) => s + (l.outstanding_balance || l.principal_amount || 0), 0),
    };
  }, [accounts, journals, invoices, purchases, expenses, loans, isLoading]);

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["accounts"] });
    queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
    queryClient.invalidateQueries({ queryKey: ["invoices_kpi"] });
    queryClient.invalidateQueries({ queryKey: ["purchases_kpi"] });
    queryClient.invalidateQueries({ queryKey: ["expenses_kpi"] });
    queryClient.invalidateQueries({ queryKey: ["loans"] });
  };

  return { kpis, isLoading, refreshAll, accounts, journals, invoices, expenses };
}
