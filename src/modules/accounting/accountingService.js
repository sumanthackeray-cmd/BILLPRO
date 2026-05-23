 
/* @ts-nocheck */
import { base44 } from "@/api/base44Client";

// Standard Indian Chart of Accounts templates
export const DEFAULT_COA = [
  // Assets
  { code: "1010", name: "Cash in Hand", type: "Asset", category: "Cash & Bank", description: "Physical cash kept in office vault" },
  { code: "1020", name: "HDFC Bank A/c", type: "Asset", category: "Cash & Bank", description: "Primary current account at HDFC Bank" },
  { code: "1030", name: "SBI Bank A/c", type: "Asset", category: "Cash & Bank", description: "Secondary current account at State Bank of India" },
  { code: "1100", name: "Accounts Receivable (Sundry Debtors)", type: "Asset", category: "Receivables", description: "Amount owed by customers" },
  { code: "1200", name: "Stock in Hand (Inventory)", type: "Asset", category: "Inventory", description: "Valuation of unsold goods" },
  { code: "1310", name: "CGST Input Tax Credit", type: "Asset", category: "Tax Receivables", description: "Central GST paid on purchases" },
  { code: "1320", name: "SGST Input Tax Credit", type: "Asset", category: "Tax Receivables", description: "State GST paid on purchases" },
  { code: "1330", name: "IGST Input Tax Credit", type: "Asset", category: "Tax Receivables", description: "Integrated GST paid on purchases" },
  { code: "1400", name: "TDS Receivable A/c", type: "Asset", category: "Tax Receivables", description: "Tax Deducted at Source by customers" },
  { code: "1500", name: "Office Equipment", type: "Asset", category: "Fixed Assets", description: "Computers, printers, furniture" },
  { code: "1510", name: "Shop Premises", type: "Asset", category: "Fixed Assets", description: "Real estate property occupied for business" },

  // Liabilities
  { code: "2010", name: "Accounts Payable (Sundry Creditors)", type: "Liability", category: "Payables", description: "Amount owed to suppliers" },
  { code: "2110", name: "CGST Output Tax A/c", type: "Liability", category: "Duties & Taxes", description: "Central GST collected on sales" },
  { code: "2120", name: "SGST Output Tax A/c", type: "Liability", category: "Duties & Taxes", description: "State GST collected on sales" },
  { code: "2130", name: "IGST Output Tax A/c", type: "Liability", category: "Duties & Taxes", description: "Integrated GST collected on sales" },
  { code: "2200", name: "TDS Payable A/c (194C/J/H)", type: "Liability", category: "Duties & Taxes", description: "Tax Deducted at Source on expenses" },
  { code: "2210", name: "TCS Payable A/c", type: "Liability", category: "Duties & Taxes", description: "Tax Collected at Source" },
  { code: "2300", name: "HDFC Business Loan A/c", type: "Liability", category: "Loans & Borrowings", description: "Outstanding business loan balance" },
  { code: "2400", name: "Salary Payable", type: "Liability", category: "Provisions", description: "Salaries calculated but unpaid" },

  // Equity
  { code: "3010", name: "Shareholder Capital Account", type: "Equity", category: "Capital", description: "Initial capital introduced by owners" },
  { code: "3020", name: "Retained Earnings", type: "Equity", category: "Reserves & Surplus", description: "Accumulated profits transferred over time" },

  // Revenue
  { code: "4010", name: "Sales Revenue", type: "Revenue", category: "Operating Revenue", description: "Core income from selling goods and services" },
  { code: "4020", name: "Service Income", type: "Revenue", category: "Operating Revenue", description: "Income from professional services" },
  { code: "4100", name: "Other Non-Operating Income", type: "Revenue", category: "Other Income", description: "Bank interest, scrap sales, etc." },

  // Expenses
  { code: "5010", name: "Cost of Goods Sold (COGS)", type: "Expense", category: "Direct Expenses", description: "Purchase cost of items sold" },
  { code: "5100", name: "Salaries and Wages", type: "Expense", category: "Indirect Expenses", description: "Employee salaries and benefits" },
  { code: "5110", name: "Office Rent A/c", type: "Expense", category: "Indirect Expenses", description: "Monthly premises rent" },
  { code: "5120", name: "Electricity & Utilities", type: "Expense", category: "Indirect Expenses", description: "Power, water, high-speed internet bills" },
  { code: "5130", name: "Pantry & Staff Welfare", type: "Expense", category: "Indirect Expenses", description: "Tea, coffee, office refreshments" },
  { code: "5140", name: "Printing & Stationery", type: "Expense", category: "Indirect Expenses", description: "Paper, labels, receipt rolls" },
  { code: "5150", name: "Bank Charges & Interest", type: "Expense", category: "Indirect Expenses", description: "Bank fees, payment gateway cuts, loan interest" },
  { code: "5160", name: "Depreciation Expense", type: "Expense", category: "Indirect Expenses", description: "Wear and tear allocation of fixed assets" },
  { code: "5170", name: "Professional Fees", type: "Expense", category: "Indirect Expenses", description: "Accounting, GST filing, legal consultancy" }
];

export const accountingService = {
  // --- CHART OF ACCOUNTS (COA) API ---
  getAccounts: async () => {
    try {
      let accounts = await base44.entities.ChartOfAccount.list();
      if (accounts.length === 0) {
        // Auto-seed if empty
        const seeded = [];
        for (const act of DEFAULT_COA) {
          const item = await base44.entities.ChartOfAccount.create(act);
          seeded.push(item);
        }
        return seeded;
      }
      return accounts;
    } catch (error) {
      console.error("Failed to fetch/seed COA:", error);
      return DEFAULT_COA.map((c, i) => ({ id: `offline-${i}`, ...c }));
    }
  },

  createAccount: async (accountData) => {
    return await base44.entities.ChartOfAccount.create(accountData);
  },

  updateAccount: async (id, accountData) => {
    return await base44.entities.ChartOfAccount.update(id, accountData);
  },

  deleteAccount: async (id) => {
    return await base44.entities.ChartOfAccount.delete(id);
  },

  // --- JOURNAL ENTRIES API ---
  getJournalEntries: async () => {
    return await base44.entities.JournalEntry.list("-date");
  },

  createJournalEntry: async (entryData) => {
    // Validate double-entry
    const lines = entryData.lines || [];
    const totalDebit = lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(`Double-entry balance mismatch. Total Debits: ₹${totalDebit.toFixed(2)}, Total Credits: ₹${totalCredit.toFixed(2)}.`);
    }

    return await base44.entities.JournalEntry.create({
      ...entryData,
      total_debit: totalDebit,
      total_credit: totalCredit
    });
  },

  updateJournalEntry: async (id, entryData) => {
    const lines = entryData.lines || [];
    const totalDebit = lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(`Double-entry balance mismatch. Total Debits: ₹${totalDebit.toFixed(2)}, Total Credits: ₹${totalCredit.toFixed(2)}.`);
    }

    return await base44.entities.JournalEntry.update(id, {
      ...entryData,
      total_debit: totalDebit,
      total_credit: totalCredit
    });
  },

  deleteJournalEntry: async (id) => {
    return await base44.entities.JournalEntry.delete(id);
  },

  // --- BANK RECONCILIATION API ---
  getBankStatements: async () => {
    return await base44.entities.BankStatement.list("-date");
  },

  importBankStatement: async (lines) => {
    const imported = [];
    for (const line of lines) {
      const item = await base44.entities.BankStatement.create({
        ...line,
        status: "unreconciled", // unreconciled, reconciled
        matched_journal_id: null
      });
      imported.push(item);
    }
    return imported;
  },

  matchStatementLine: async (statementId, journalId) => {
    await base44.entities.BankStatement.update(statementId, {
      status: "reconciled",
      matched_journal_id: journalId
    });
    // Mark journal entry as reconciled too
    if (journalId) {
      await base44.entities.JournalEntry.update(journalId, {
        reconciled: true,
        bank_statement_id: statementId
      });
    }
    return true;
  },

  unmatchStatementLine: async (statementId) => {
    const stmt = (await base44.entities.BankStatement.list()).find(s => s.id === statementId);
    if (stmt?.matched_journal_id) {
      await base44.entities.JournalEntry.update(stmt.matched_journal_id, {
        reconciled: false,
        bank_statement_id: null
      });
    }
    await base44.entities.BankStatement.update(statementId, {
      status: "unreconciled",
      matched_journal_id: null
    });
    return true;
  },

  // --- TDS / TCS MANAGEMENT ---
  getTdsTcsEntries: async () => {
    return await base44.entities.TdsTcsEntry.list("-date");
  },

  createTdsTcsEntry: async (data) => {
    return await base44.entities.TdsTcsEntry.create(data);
  },

  updateTdsTcsEntry: async (id, data) => {
    return await base44.entities.TdsTcsEntry.update(id, data);
  },

  deleteTdsTcsEntry: async (id) => {
    return await base44.entities.TdsTcsEntry.delete(id);
  }
};

// --- READ-ONLY DATA BRIDGE & CALCULATORS ---

// 1. COMPUTE LEDGER
export function computeLedger(accountId, accountName, journals = [], invoices = [], purchases = [], expenses = [], loans = []) {
  const ledgerLines = [];
  let runningBalance = 0;

  // Let's seed with journal entries
  journals.forEach(je => {
    je.lines?.forEach(line => {
      if (line.accountId === accountId || line.accountName === accountName) {
        ledgerLines.push({
          date: je.date,
          reference: je.reference_no || `JE-${je.id.substring(0,5)}`,
          narration: je.description || line.narration || "",
          debit: Number(line.debit) || 0,
          credit: Number(line.credit) || 0,
          type: "Journal"
        });
      }
    });
  });

  // Fallback / Bridge imports for accounts when Journal Entries are empty
  const hasJournals = journals.length > 0;
  if (!hasJournals) {
    // If double-entry has not been fully implemented by the user yet, bridge existing document database automatically
    if (accountName.includes("Sales Revenue") || accountName.includes("Sales")) {
      invoices.forEach(inv => {
        if (inv.grand_total) {
          ledgerLines.push({
            date: inv.date || inv.created_date?.split("T")[0] || new Date().toISOString().split("T")[0],
            reference: inv.invoice_number || `INV-${inv.id.substring(0,5)}`,
            narration: `Customer Sale - ${inv.customer_name || "General"}`,
            debit: 0,
            credit: inv.grand_total - (inv.tax_amount || 0),
            type: "Invoice (Bridge)"
          });
        }
      });
    }

    if (accountName.includes("Accounts Receivable") || accountName.includes("Debtors")) {
      invoices.forEach(inv => {
        if (inv.grand_total) {
          const due = inv.grand_total - (inv.paid_amount || 0);
          if (due > 0) {
            ledgerLines.push({
              date: inv.date || inv.created_date?.split("T")[0],
              reference: inv.invoice_number,
              narration: `Receivable from ${inv.customer_name}`,
              debit: due,
              credit: 0,
              type: "Invoice (Bridge)"
            });
          }
        }
      });
    }

    if (accountName.includes("Cost of Goods Sold") || accountName.includes("Purchases") || accountName.includes("Sundry Creditors")) {
      purchases.forEach(p => {
        if (p.grand_total) {
          const isCreditor = accountName.includes("Creditors");
          ledgerLines.push({
            date: p.date || p.created_date?.split("T")[0],
            reference: p.purchase_number || `PUR-${p.id.substring(0,5)}`,
            narration: `Purchase from ${p.supplier_name || "Supplier"}`,
            debit: isCreditor ? 0 : p.grand_total,
            credit: isCreditor ? p.grand_total : 0,
            type: "Purchase (Bridge)"
          });
        }
      });
    }

    if (accountName.includes("Electricity") || accountName.includes("Rent") || accountName.includes("Pantry") || accountName.includes("Utilities") || accountName.includes("Office Expenses") || accountName.includes("Expense")) {
      expenses.forEach(e => {
        const cat = e.category?.toLowerCase() || "";
        const nameLower = accountName.toLowerCase();
        let match = false;
        if (nameLower.includes("electricity") && cat.includes("util")) match = true;
        else if (nameLower.includes("rent") && cat.includes("rent")) match = true;
        else if (nameLower.includes("pantry") && cat.includes("pant")) match = true;
        else if (nameLower.includes("office") && cat.includes("office")) match = true;
        else if (nameLower.includes("professional") && (cat.includes("prof") || cat.includes("tax") || cat.includes("gst"))) match = true;
        else if (nameLower.includes("expense") && !nameLower.includes("rent") && !nameLower.includes("electricity") && !match) match = true;

        if (match) {
          ledgerLines.push({
            date: e.date || e.created_date?.split("T")[0],
            reference: `EXP-${e.id.substring(0,5)}`,
            narration: e.description || `Business Expense: ${e.category}`,
            debit: e.amount || 0,
            credit: 0,
            type: "Expense (Bridge)"
          });
        }
      });
    }

    if (accountName.includes("CGST Output") || accountName.includes("SGST Output") || accountName.includes("IGST Output")) {
      invoices.forEach(inv => {
        if (inv.tax_amount) {
          const splitTax = inv.tax_amount / 2; // CGST + SGST standard split
          ledgerLines.push({
            date: inv.date || inv.created_date?.split("T")[0],
            reference: inv.invoice_number,
            narration: `GST Output on Sale`,
            debit: 0,
            credit: splitTax,
            type: "Invoice (Bridge)"
          });
        }
      });
    }

    if (accountName.includes("Loans")) {
      loans.forEach(l => {
        ledgerLines.push({
          date: l.created_date?.split("T")[0] || new Date().toISOString().split("T")[0],
          reference: `LOAN-${l.id.substring(0,5)}`,
          narration: `Business Loan from ${l.lender_name}`,
          debit: 0,
          credit: l.principal_amount || 0,
          type: "Loan (Bridge)"
        });
      });
    }
  }

  // Sort lines chronologically
  ledgerLines.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Compute running balance
  const account = DEFAULT_COA.find(c => c.name === accountName) || { type: "Asset" };
  const isDebitBalance = ["Asset", "Expense"].includes(account.type);

  const balancedLines = ledgerLines.map(line => {
    const net = line.debit - line.credit;
    if (isDebitBalance) {
      runningBalance += net;
    } else {
      runningBalance += -net;
    }
    return {
      ...line,
      runningBalance
    };
  });

  return {
    lines: balancedLines,
    closingBalance: runningBalance,
    isDebitBalance
  };
}

// 2. TRIAL BALANCE
export function computeTrialBalance(accounts = [], journals = [], invoices = [], purchases = [], expenses = [], loans = []) {
  const result = [];
  let totalDebits = 0;
  let totalCredits = 0;

  accounts.forEach(act => {
    const { closingBalance, isDebitBalance } = computeLedger(act.id, act.name, journals, invoices, purchases, expenses, loans);
    
    // Only include accounts with activity or non-zero balances to keep ledger concise
    if (closingBalance !== 0 || journals.length === 0) {
      const dr = isDebitBalance ? closingBalance : 0;
      const cr = !isDebitBalance ? closingBalance : 0;

      result.push({
        code: act.code,
        name: act.name,
        type: act.type,
        category: act.category,
        debit: dr,
        credit: cr
      });

      totalDebits += dr;
      totalCredits += cr;
    }
  });

  return {
    accounts: result,
    totalDebits,
    totalCredits,
    isBalanced: Math.abs(totalDebits - totalCredits) < 1.0 // Allow minor rounding diff
  };
}

// 3. PROFIT & LOSS STATEMENT
export function computeProfitLoss(accounts = [], journals = [], invoices = [], purchases = [], expenses = [], loans = []) {
  const tb = computeTrialBalance(accounts, journals, invoices, purchases, expenses, loans);
  
  const revenues = tb.accounts.filter(a => a.type === "Revenue");
  const directExpenses = tb.accounts.filter(a => a.type === "Expense" && a.category === "Direct Expenses");
  const indirectExpenses = tb.accounts.filter(a => a.type === "Expense" && a.category !== "Direct Expenses");

  const totalRevenue = revenues.reduce((s, a) => s + a.credit, 0);
  const totalDirectCost = directExpenses.reduce((s, a) => s + a.debit, 0);
  const grossProfit = totalRevenue - totalDirectCost;

  const totalIndirectCost = indirectExpenses.reduce((s, a) => s + a.debit, 0);
  const netProfit = grossProfit - totalIndirectCost;

  return {
    revenues,
    directExpenses,
    indirectExpenses,
    totalRevenue,
    totalDirectCost,
    grossProfit,
    totalIndirectCost,
    netProfit
  };
}

// 4. BALANCE SHEET
export function computeBalanceSheet(accounts = [], journals = [], invoices = [], purchases = [], expenses = [], loans = []) {
  const tb = computeTrialBalance(accounts, journals, invoices, purchases, expenses, loans);
  const pl = computeProfitLoss(accounts, journals, invoices, purchases, expenses, loans);

  const assets = tb.accounts.filter(a => a.type === "Asset");
  const liabilities = tb.accounts.filter(a => a.type === "Liability");
  const equity = tb.accounts.filter(a => a.type === "Equity");

  const totalAssets = assets.reduce((s, a) => s + a.debit, 0);
  const totalLiabilities = liabilities.reduce((s, a) => s + a.credit, 0);
  
  // Equity includes Retained Earnings + Capital + Net Profit from current period
  const baseEquity = equity.reduce((s, a) => s + a.credit, 0);
  const totalEquity = baseEquity + pl.netProfit;

  return {
    assets,
    liabilities,
    equity,
    totalAssets,
    totalLiabilities,
    retainedEarningsCurrent: pl.netProfit,
    totalEquity,
    totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
    isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 5.0 // allow minor rounding
  };
}

// Format currency helper
export const fmtINR = (val) => {
  if (val === undefined || val === null || isNaN(val)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(val);
};

// Automatic journal seed creators for seamless operations bridging
export function buildSaleJournalEntry(invoice) {
  const lines = [
    {
      accountName: "Accounts Receivable (Sundry Debtors)",
      debit: invoice.grand_total,
      credit: 0,
      narration: `Sale to ${invoice.customer_name || "Walk-in"}`
    },
    {
      accountName: "Sales Revenue",
      debit: 0,
      credit: invoice.grand_total - (invoice.tax_amount || 0),
      narration: "Revenue from goods"
    }
  ];

  if (invoice.tax_amount) {
    const splitTax = invoice.tax_amount / 2;
    lines.push(
      {
        accountName: "CGST Output Tax A/c",
        debit: 0,
        credit: splitTax,
        narration: "CGST Output tax"
      },
      {
        accountName: "SGST Output Tax A/c",
        debit: 0,
        credit: splitTax,
        narration: "SGST Output tax"
      }
    );
  }

  return {
    date: invoice.date || new Date().toISOString().split("T")[0],
    reference_no: invoice.invoice_number,
    description: `Automated Journal Entry for Invoice ${invoice.invoice_number}`,
    lines
  };
}

export function buildPurchaseJournalEntry(purchase) {
  return {
    date: purchase.date || new Date().toISOString().split("T")[0],
    reference_no: purchase.purchase_number,
    description: `Automated Journal Entry for Purchase ${purchase.purchase_number}`,
    lines: [
      {
        accountName: "Cost of Goods Sold (COGS)",
        debit: purchase.grand_total,
        credit: 0,
        narration: `Purchase from ${purchase.supplier_name}`
      },
      {
        accountName: "Accounts Payable (Sundry Creditors)",
        debit: 0,
        credit: purchase.grand_total,
        narration: `Owed to supplier ${purchase.supplier_name}`
      }
    ]
  };
}

export function buildReturnJournalEntry(invoice) {
  // Refund/return reverses the sale:
  // Accounts Receivable decreases (credit), Sales Revenue decreases (debit)
  const lines = [
    {
      accountName: "Accounts Receivable (Sundry Debtors)",
      debit: 0,
      credit: invoice.grand_total,
      narration: `Return sale/refund for ${invoice.customer_name || "Walk-in"}`
    },
    {
      accountName: "Sales Revenue",
      debit: invoice.grand_total - (invoice.tax_amount || 0),
      credit: 0,
      narration: "Reversal of revenue on return"
    }
  ];

  if (invoice.tax_amount) {
    const splitTax = invoice.tax_amount / 2;
    lines.push(
      {
        accountName: "CGST Output Tax A/c",
        debit: splitTax,
        credit: 0,
        narration: "Reversal of CGST output tax"
      },
      {
        accountName: "SGST Output Tax A/c",
        debit: splitTax,
        credit: 0,
        narration: "Reversal of SGST output tax"
      }
    );
  }

  return {
    date: invoice.date || new Date().toISOString().split("T")[0],
    reference_no: invoice.invoice_number ? `RET-${invoice.invoice_number}` : `RET-${invoice.id}`,
    description: `Automated Journal Entry for Return ${invoice.invoice_number || invoice.id}`,
    lines
  };
}

export function buildExpenseJournalEntry(expense) {
  let matchedAcct = "Office Expenses";
  const cat = expense.category?.toLowerCase() || "";
  if (cat.includes("rent")) matchedAcct = "Office Rent A/c";
  else if (cat.includes("util") || cat.includes("elect")) matchedAcct = "Electricity & Utilities";
  else if (cat.includes("pant") || cat.includes("tea")) matchedAcct = "Pantry & Staff Welfare";
  else if (cat.includes("prof")) matchedAcct = "Professional Fees";
  else if (cat.includes("print")) matchedAcct = "Printing & Stationery";

  return {
    date: expense.date || new Date().toISOString().split("T")[0],
    reference_no: `EXP-${expense.id.substring(0,5)}`,
    description: `Automated Journal Entry for Expense: ${expense.description}`,
    lines: [
      {
        accountName: matchedAcct,
        debit: expense.amount,
        credit: 0,
        narration: expense.description
      },
      {
        accountName: "Cash in Hand",
        debit: 0,
        credit: expense.amount,
        narration: `Payment for ${expense.description}`
      }
    ]
  };
}
