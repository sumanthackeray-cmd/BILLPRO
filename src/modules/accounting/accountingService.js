/**
 * Accounting Service — Phase 1: Finance & Accounting Module
 * All data operations via base44.entities proxy (new collections only).
 * Read-only bridge to existing Invoice/Purchase/Expense data.
 */
import { base44 } from '@/api/base44Client';

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT CHART OF ACCOUNTS — Indian Business Standard
// ─────────────────────────────────────────────────────────────────────────────
export const DEFAULT_COA = [
  // ASSETS — Current
  { code: '1001', name: 'Cash in Hand',              type: 'Asset', subType: 'Current Asset',   normalBalance: 'Debit',  isSystem: true },
  { code: '1002', name: 'Petty Cash',                type: 'Asset', subType: 'Current Asset',   normalBalance: 'Debit',  isSystem: false },
  { code: '1011', name: 'Bank — HDFC',               type: 'Asset', subType: 'Current Asset',   normalBalance: 'Debit',  isSystem: false },
  { code: '1012', name: 'Bank — SBI',                type: 'Asset', subType: 'Current Asset',   normalBalance: 'Debit',  isSystem: false },
  { code: '1013', name: 'Bank — ICICI',              type: 'Asset', subType: 'Current Asset',   normalBalance: 'Debit',  isSystem: false },
  { code: '1100', name: 'Accounts Receivable',       type: 'Asset', subType: 'Current Asset',   normalBalance: 'Debit',  isSystem: true },
  { code: '1200', name: 'GST Input Credit (CGST)',   type: 'Asset', subType: 'Current Asset',   normalBalance: 'Debit',  isSystem: true },
  { code: '1201', name: 'GST Input Credit (SGST)',   type: 'Asset', subType: 'Current Asset',   normalBalance: 'Debit',  isSystem: true },
  { code: '1202', name: 'GST Input Credit (IGST)',   type: 'Asset', subType: 'Current Asset',   normalBalance: 'Debit',  isSystem: true },
  { code: '1300', name: 'TDS Receivable',            type: 'Asset', subType: 'Current Asset',   normalBalance: 'Debit',  isSystem: false },
  { code: '1400', name: 'Stock / Inventory',         type: 'Asset', subType: 'Current Asset',   normalBalance: 'Debit',  isSystem: true },
  { code: '1500', name: 'Prepaid Expenses',          type: 'Asset', subType: 'Current Asset',   normalBalance: 'Debit',  isSystem: false },
  { code: '1600', name: 'Advance to Suppliers',      type: 'Asset', subType: 'Current Asset',   normalBalance: 'Debit',  isSystem: false },
  // ASSETS — Fixed
  { code: '2001', name: 'Land & Building',           type: 'Asset', subType: 'Fixed Asset',     normalBalance: 'Debit',  isSystem: false },
  { code: '2002', name: 'Furniture & Fixtures',      type: 'Asset', subType: 'Fixed Asset',     normalBalance: 'Debit',  isSystem: false },
  { code: '2003', name: 'Computer & Equipment',      type: 'Asset', subType: 'Fixed Asset',     normalBalance: 'Debit',  isSystem: false },
  { code: '2004', name: 'Vehicle',                   type: 'Asset', subType: 'Fixed Asset',     normalBalance: 'Debit',  isSystem: false },
  { code: '2100', name: 'Accumulated Depreciation',  type: 'Asset', subType: 'Fixed Asset',     normalBalance: 'Credit', isSystem: false },
  // LIABILITIES — Current
  { code: '3001', name: 'Accounts Payable',          type: 'Liability', subType: 'Current Liability',   normalBalance: 'Credit', isSystem: true },
  { code: '3100', name: 'GST Payable (CGST)',        type: 'Liability', subType: 'Current Liability',   normalBalance: 'Credit', isSystem: true },
  { code: '3101', name: 'GST Payable (SGST)',        type: 'Liability', subType: 'Current Liability',   normalBalance: 'Credit', isSystem: true },
  { code: '3102', name: 'GST Payable (IGST)',        type: 'Liability', subType: 'Current Liability',   normalBalance: 'Credit', isSystem: true },
  { code: '3200', name: 'TDS Payable',               type: 'Liability', subType: 'Current Liability',   normalBalance: 'Credit', isSystem: false },
  { code: '3201', name: 'TCS Payable',               type: 'Liability', subType: 'Current Liability',   normalBalance: 'Credit', isSystem: false },
  { code: '3300', name: 'Salaries Payable',          type: 'Liability', subType: 'Current Liability',   normalBalance: 'Credit', isSystem: false },
  { code: '3400', name: 'Advance from Customers',    type: 'Liability', subType: 'Current Liability',   normalBalance: 'Credit', isSystem: false },
  { code: '3500', name: 'Short-term Loans',          type: 'Liability', subType: 'Current Liability',   normalBalance: 'Credit', isSystem: false },
  // LIABILITIES — Long-term
  { code: '4001', name: 'Long-term Bank Loan',       type: 'Liability', subType: 'Long-term Liability', normalBalance: 'Credit', isSystem: false },
  { code: '4002', name: 'NBFC Loan',                 type: 'Liability', subType: 'Long-term Liability', normalBalance: 'Credit', isSystem: false },
  // EQUITY
  { code: '5001', name: "Owner's Capital",           type: 'Equity', subType: 'Capital',   normalBalance: 'Credit', isSystem: true },
  { code: '5002', name: 'Retained Earnings',         type: 'Equity', subType: 'Capital',   normalBalance: 'Credit', isSystem: true },
  { code: '5003', name: 'Drawings',                  type: 'Equity', subType: 'Capital',   normalBalance: 'Debit',  isSystem: false },
  // INCOME
  { code: '6001', name: 'Sales Revenue',             type: 'Income', subType: 'Operating Income',     normalBalance: 'Credit', isSystem: true },
  { code: '6002', name: 'Service Revenue',           type: 'Income', subType: 'Operating Income',     normalBalance: 'Credit', isSystem: false },
  { code: '6100', name: 'Interest Income',           type: 'Income', subType: 'Non-Operating Income', normalBalance: 'Credit', isSystem: false },
  { code: '6101', name: 'Discount Received',         type: 'Income', subType: 'Non-Operating Income', normalBalance: 'Credit', isSystem: false },
  { code: '6102', name: 'Other Income',              type: 'Income', subType: 'Non-Operating Income', normalBalance: 'Credit', isSystem: false },
  // EXPENSES — Direct
  { code: '7001', name: 'Cost of Goods Sold',        type: 'Expense', subType: 'Direct Expense',   normalBalance: 'Debit', isSystem: true },
  { code: '7002', name: 'Purchases',                 type: 'Expense', subType: 'Direct Expense',   normalBalance: 'Debit', isSystem: true },
  { code: '7003', name: 'Freight & Transport',       type: 'Expense', subType: 'Direct Expense',   normalBalance: 'Debit', isSystem: false },
  { code: '7004', name: 'Purchase Returns',          type: 'Expense', subType: 'Direct Expense',   normalBalance: 'Credit',isSystem: false },
  // EXPENSES — Indirect
  { code: '8001', name: 'Salaries & Wages',          type: 'Expense', subType: 'Indirect Expense', normalBalance: 'Debit', isSystem: false },
  { code: '8002', name: 'Rent',                      type: 'Expense', subType: 'Indirect Expense', normalBalance: 'Debit', isSystem: false },
  { code: '8003', name: 'Electricity & Utilities',   type: 'Expense', subType: 'Indirect Expense', normalBalance: 'Debit', isSystem: false },
  { code: '8004', name: 'Office Expenses',           type: 'Expense', subType: 'Indirect Expense', normalBalance: 'Debit', isSystem: false },
  { code: '8005', name: 'Marketing & Advertising',   type: 'Expense', subType: 'Indirect Expense', normalBalance: 'Debit', isSystem: false },
  { code: '8006', name: 'Bank Charges & Interest',   type: 'Expense', subType: 'Indirect Expense', normalBalance: 'Debit', isSystem: false },
  { code: '8007', name: 'Depreciation',              type: 'Expense', subType: 'Indirect Expense', normalBalance: 'Debit', isSystem: false },
  { code: '8008', name: 'Insurance',                 type: 'Expense', subType: 'Indirect Expense', normalBalance: 'Debit', isSystem: false },
  { code: '8009', name: 'Professional Fees',         type: 'Expense', subType: 'Indirect Expense', normalBalance: 'Debit', isSystem: false },
  { code: '8010', name: 'Telephone & Internet',      type: 'Expense', subType: 'Indirect Expense', normalBalance: 'Debit', isSystem: false },
  { code: '8100', name: 'TDS / TCS Expense',         type: 'Expense', subType: 'Tax Expense',      normalBalance: 'Debit', isSystem: false },
  { code: '8101', name: 'Income Tax Expense',        type: 'Expense', subType: 'Tax Expense',      normalBalance: 'Debit', isSystem: false },
];

// ─────────────────────────────────────────────────────────────────────────────
// TDS SECTIONS — Standard Indian Rates
// ─────────────────────────────────────────────────────────────────────────────
export const TDS_SECTIONS = [
  { section: '194A', description: 'Interest (Banks)', rate: 10 },
  { section: '194C', description: 'Contractor Payments', rate: 1 },
  { section: '194D', description: 'Insurance Commission', rate: 5 },
  { section: '194H', description: 'Commission / Brokerage', rate: 5 },
  { section: '194I', description: 'Rent (Land/Building)', rate: 10 },
  { section: '194J', description: 'Professional/Technical Fees', rate: 10 },
  { section: '194Q', description: 'Purchase of Goods', rate: 0.1 },
  { section: '206C',  description: 'TCS on Sale of Goods', rate: 0.1 },
];

// ─────────────────────────────────────────────────────────────────────────────
// ACCOUNTING SERVICE
// ─────────────────────────────────────────────────────────────────────────────
export const accountingService = {
  // Chart of Accounts
  getAccounts:    ()        => base44.entities.ChartOfAccount.list(),
  createAccount:  (data)    => base44.entities.ChartOfAccount.create(data),
  updateAccount:  (id, d)   => base44.entities.ChartOfAccount.update(id, d),
  deleteAccount:  (id)      => base44.entities.ChartOfAccount.delete(id),

  // Journal Entries
  getJournalEntries: ()      => base44.entities.JournalEntry.list('-date', 500),
  createJournalEntry:(data)  => base44.entities.JournalEntry.create(data),
  updateJournalEntry:(id, d) => base44.entities.JournalEntry.update(id, d),
  deleteJournalEntry:(id)    => base44.entities.JournalEntry.delete(id),

  // Bank Statements
  getBankStatements:   ()     => base44.entities.BankStatement.list('-date', 500),
  createBankStatement: (data) => base44.entities.BankStatement.create(data),
  updateBankStatement: (id,d) => base44.entities.BankStatement.update(id, d),
  deleteBankStatement: (id)   => base44.entities.BankStatement.delete(id),

  // TDS/TCS Entries
  getTdsTcsEntries:   ()     => base44.entities.TdsTcsEntry.list('-date', 200),
  createTdsTcsEntry:  (data) => base44.entities.TdsTcsEntry.create(data),
  updateTdsTcsEntry:  (id,d) => base44.entities.TdsTcsEntry.update(id, d),
  deleteTdsTcsEntry:  (id)   => base44.entities.TdsTcsEntry.delete(id),

  // Financial Periods
  getFinancialPeriods:   ()     => base44.entities.FinancialPeriod.list(),
  createFinancialPeriod: (data) => base44.entities.FinancialPeriod.create(data),
  updateFinancialPeriod: (id,d) => base44.entities.FinancialPeriod.update(id, d),
};

// ─────────────────────────────────────────────────────────────────────────────
// AUTO JOURNAL ENTRY GENERATORS (read-only bridges to existing data)
// ─────────────────────────────────────────────────────────────────────────────
export const buildSaleJournalEntry = (invoice) => {
  const taxHalf = (invoice.tax_amount || 0) / 2;
  const subtotal = invoice.subtotal || (invoice.grand_total - (invoice.tax_amount || 0));
  return {
    entryNumber: `JE-SALE-${invoice.invoice_number || invoice.id}`,
    date: invoice.date || new Date().toISOString().split('T')[0],
    description: `Sale: ${invoice.invoice_number} — ${invoice.customer_name || 'Walk-in'}`,
    reference: invoice.invoice_number,
    referenceType: 'sale_invoice',
    referenceId: invoice.id,
    lines: [
      { accountCode: '1001', accountName: 'Cash in Hand',       debit: invoice.grand_total, credit: 0 },
      { accountCode: '6001', accountName: 'Sales Revenue',       debit: 0, credit: subtotal },
      { accountCode: '3100', accountName: 'GST Payable (CGST)', debit: 0, credit: taxHalf },
      { accountCode: '3101', accountName: 'GST Payable (SGST)', debit: 0, credit: taxHalf },
    ].filter(l => l.debit > 0 || l.credit > 0),
    totalDebit:  invoice.grand_total,
    totalCredit: invoice.grand_total,
    status: 'Posted',
    autoGenerated: true,
  };
};

export const buildPurchaseJournalEntry = (purchase) => {
  const taxHalf   = (purchase.tax_amount || 0) / 2;
  const subtotal  = purchase.subtotal || (purchase.grand_total - (purchase.tax_amount || 0));
  return {
    entryNumber: `JE-PUR-${purchase.purchase_number || purchase.id}`,
    date: purchase.date || new Date().toISOString().split('T')[0],
    description: `Purchase: ${purchase.purchase_number} — ${purchase.supplier_name || 'Vendor'}`,
    reference: purchase.purchase_number,
    referenceType: 'purchase',
    referenceId: purchase.id,
    lines: [
      { accountCode: '7002', accountName: 'Purchases',                debit: subtotal, credit: 0 },
      { accountCode: '1200', accountName: 'GST Input Credit (CGST)',  debit: taxHalf,  credit: 0 },
      { accountCode: '1201', accountName: 'GST Input Credit (SGST)',  debit: taxHalf,  credit: 0 },
      { accountCode: '3001', accountName: 'Accounts Payable',         debit: 0, credit: purchase.grand_total },
    ].filter(l => l.debit > 0 || l.credit > 0),
    totalDebit:  purchase.grand_total,
    totalCredit: purchase.grand_total,
    status: 'Posted',
    autoGenerated: true,
  };
};

export const buildExpenseJournalEntry = (expense) => ({
  entryNumber: `JE-EXP-${expense.id}`,
  date: expense.date || new Date().toISOString().split('T')[0],
  description: `Expense: ${expense.description} (${expense.category || 'General'})`,
  reference: expense.id,
  referenceType: 'expense',
  referenceId: expense.id,
  lines: [
    { accountCode: '8004', accountName: 'Office Expenses', debit: expense.amount, credit: 0 },
    { accountCode: '1001', accountName: 'Cash in Hand',    debit: 0, credit: expense.amount },
  ],
  totalDebit:  expense.amount,
  totalCredit: expense.amount,
  status: 'Posted',
  autoGenerated: true,
});

// ─────────────────────────────────────────────────────────────────────────────
// LEDGER COMPUTATION
// Builds per-account running balance from journal entry lines
// ─────────────────────────────────────────────────────────────────────────────
export const computeLedger = (journalEntries, accountCode) => {
  const lines = [];
  journalEntries
    .filter(je => je.status === 'Posted')
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .forEach(je => {
      (je.lines || [])
        .filter(l => l.accountCode === accountCode)
        .forEach(l => {
          lines.push({
            date: je.date,
            entryNumber: je.entryNumber,
            description: je.description,
            debit:   l.debit  || 0,
            credit:  l.credit || 0,
            reference: je.reference,
          });
        });
    });

  let runningBalance = 0;
  return lines.map(l => {
    runningBalance += (l.debit - l.credit);
    return { ...l, balance: runningBalance };
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// TRIAL BALANCE COMPUTATION
// ─────────────────────────────────────────────────────────────────────────────
export const computeTrialBalance = (accounts, journalEntries) => {
  const totals = {};
  journalEntries
    .filter(je => je.status === 'Posted')
    .forEach(je => {
      (je.lines || []).forEach(l => {
        if (!totals[l.accountCode]) totals[l.accountCode] = { debit: 0, credit: 0 };
        totals[l.accountCode].debit  += l.debit  || 0;
        totals[l.accountCode].credit += l.credit || 0;
      });
    });

  return accounts
    .map(acc => ({
      ...acc,
      totalDebit:  totals[acc.code]?.debit  || 0,
      totalCredit: totals[acc.code]?.credit || 0,
      closingBalance: (totals[acc.code]?.debit || 0) - (totals[acc.code]?.credit || 0),
    }))
    .filter(acc => acc.totalDebit > 0 || acc.totalCredit > 0);
};

// ─────────────────────────────────────────────────────────────────────────────
// P&L COMPUTATION (from journal entries + read-only bridge from existing data)
// ─────────────────────────────────────────────────────────────────────────────
export const computeProfitLoss = (journalEntries, invoices, purchases, expenses, from, to) => {
  const filterDate = (dateStr) => {
    if (!from && !to) return true;
    const d = new Date(dateStr);
    const f = from ? new Date(from) : new Date('1970-01-01');
    const t = to   ? new Date(to)   : new Date('2099-12-31');
    return d >= f && d <= t;
  };

  // From journal entries
  const incomeAccounts   = {};
  const expenseAccounts  = {};

  journalEntries
    .filter(je => je.status === 'Posted' && filterDate(je.date))
    .forEach(je => {
      (je.lines || []).forEach(l => {
        const code = l.accountCode;
        if (code?.startsWith('6')) {
          incomeAccounts[code]  = (incomeAccounts[code]  || 0) + (l.credit - l.debit);
        }
        if (code?.startsWith('7') || code?.startsWith('8')) {
          expenseAccounts[code] = (expenseAccounts[code] || 0) + (l.debit - l.credit);
        }
      });
    });

  // Bridge: existing invoices (read-only)
  const salesRevenue = invoices
    .filter(i => i.type === 'sale' && filterDate(i.date))
    .reduce((s, i) => s + (i.subtotal || (i.grand_total - (i.tax_amount || 0))), 0);

  // Bridge: existing purchases (read-only)
  const purchaseExpense = purchases
    .filter(p => filterDate(p.date))
    .reduce((s, p) => s + (p.subtotal || (p.grand_total - (p.tax_amount || 0))), 0);

  // Bridge: existing expenses (read-only)
  const otherExpenses = expenses
    .filter(e => filterDate(e.date))
    .reduce((s, e) => s + (e.amount || 0), 0);

  const totalIncome   = salesRevenue + Object.values(incomeAccounts).reduce((s, v) => s + v, 0);
  const totalExpenses = purchaseExpense + otherExpenses + Object.values(expenseAccounts).reduce((s, v) => s + v, 0);
  const grossProfit   = salesRevenue - purchaseExpense;
  const netProfit     = totalIncome - totalExpenses;

  return { salesRevenue, purchaseExpense, otherExpenses, totalIncome, totalExpenses, grossProfit, netProfit, incomeAccounts, expenseAccounts };
};

// ─────────────────────────────────────────────────────────────────────────────
// BALANCE SHEET COMPUTATION
// ─────────────────────────────────────────────────────────────────────────────
export const computeBalanceSheet = (journalEntries) => {
  const balances = {};
  journalEntries
    .filter(je => je.status === 'Posted')
    .forEach(je => {
      (je.lines || []).forEach(l => {
        if (!balances[l.accountCode]) balances[l.accountCode] = { debit: 0, credit: 0, code: l.accountCode, name: l.accountName };
        balances[l.accountCode].debit  += l.debit  || 0;
        balances[l.accountCode].credit += l.credit || 0;
      });
    });

  const getBalance = (code) => {
    const b = balances[code] || { debit: 0, credit: 0 };
    return b.debit - b.credit;
  };

  const assets = Object.values(balances)
    .filter(b => b.code?.startsWith('1') || b.code?.startsWith('2'))
    .map(b => ({ ...b, balance: b.debit - b.credit }));

  const liabilities = Object.values(balances)
    .filter(b => b.code?.startsWith('3') || b.code?.startsWith('4'))
    .map(b => ({ ...b, balance: b.credit - b.debit }));

  const equity = Object.values(balances)
    .filter(b => b.code?.startsWith('5'))
    .map(b => ({ ...b, balance: b.credit - b.debit }));

  const totalAssets      = assets.reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = liabilities.reduce((s, l) => s + l.balance, 0);
  const totalEquity      = equity.reduce((s, e) => s + e.balance, 0);

  return { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity, isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1 };
};

// ─────────────────────────────────────────────────────────────────────────────
// CSV PARSER for Bank Reconciliation
// ─────────────────────────────────────────────────────────────────────────────
export const parseBankStatementCSV = (csvText) => {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
  return lines.slice(1).map((line, idx) => {
    const vals = line.split(',').map(v => v.trim().replace(/['"]/g, ''));
    const obj  = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
    return {
      rowIndex:    idx,
      date:        obj.date        || obj.txn_date    || obj.transaction_date || '',
      description: obj.description || obj.narration   || obj.particulars      || '',
      debit:       parseFloat(obj.debit  || obj.withdrawal || obj.dr || '0') || 0,
      credit:      parseFloat(obj.credit || obj.deposit    || obj.cr || '0') || 0,
      balance:     parseFloat(obj.balance || obj.closing_balance || '0')     || 0,
      matched:     false,
      matchedJEId: null,
    };
  }).filter(r => r.date);
};
