import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { cn } from "@/lib/utils";
import { fmtINR } from "@/lib/gst-utils";
import { Download, FileText, Save, Trash2, FolderOpen } from "lucide-react";
import { toast } from "@/lib/toast";
import { usePermission } from "@/hooks/usePermission";

const DEFAULT_COLS = {
  date: true, invoice_number: true, customer_name: true,
  payment_mode: true, grand_total: true, tax_amount: true, status: true,
};

const PRESET_TEMPLATES = [
  { name: "📊 Sales Summary", type: "sales", cols: { date: true, invoice_number: true, customer_name: true, payment_mode: true, grand_total: true, tax_amount: true, status: true } },
  { name: "📦 Stock Valuation", type: "inventory", cols: { date: false, invoice_number: false, customer_name: true, payment_mode: false, grand_total: true, tax_amount: false, status: true } },
  { name: "👥 Customer Report", type: "customers", cols: { date: false, invoice_number: false, customer_name: true, payment_mode: false, grand_total: true, tax_amount: false, status: true } },
];

export default function ReportBuilderTab() {
  const queryClient = useQueryClient();
  const hasExport = usePermission("reports", "export");
  
  const [reportType, setReportType] = useState("sales");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [filterPaymentMode, setFilterPaymentMode] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [templateName, setTemplateName] = useState("");

  const [selectedCols, setSelectedCols] = useState(() => {
    try {
      const cached = localStorage.getItem("report_selected_cols");
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return { ...DEFAULT_COLS };
  });

  useEffect(() => {
    localStorage.setItem("report_selected_cols", JSON.stringify(selectedCols));
  }, [selectedCols]);

  const toggleCol = (col) => setSelectedCols(prev => ({ ...prev, [col]: !prev[col] }));

  // Saved Report Templates from backend
  const { data: savedTemplates = [] } = useQuery({
    queryKey: ["report-templates"],
    queryFn: async () => {
      try { return await base44.entities.ReportTemplate.list(); } catch { return []; }
    },
  });

  const saveTemplate = useMutation({
    mutationFn: (tmpl) => base44.entities.ReportTemplate.create(tmpl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-templates"] });
      toast.success("Report template saved!");
      setTemplateName("");
    },
    onError: () => toast.error("Failed to save template"),
  });

  const deleteTemplate = useMutation({
    mutationFn: (id) => base44.entities.ReportTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-templates"] });
      toast.success("Template deleted");
    },
  });

  const loadTemplate = (tmpl) => {
    setReportType(tmpl.type || "sales");
    setSelectedCols(tmpl.cols ? (typeof tmpl.cols === "string" ? JSON.parse(tmpl.cols) : tmpl.cols) : { ...DEFAULT_COLS });
    if (tmpl.filters) {
      const f = typeof tmpl.filters === "string" ? JSON.parse(tmpl.filters) : tmpl.filters;
      if (f.paymentMode) setFilterPaymentMode(f.paymentMode);
      if (f.status) setFilterStatus(f.status);
    }
    toast.success(`Loaded template: ${tmpl.name}`);
  };

  // Data
  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: () => base44.entities.Invoice.list("-created_date", 500) });
  const { data: purchases = [] } = useQuery({ queryKey: ["purchases"], queryFn: () => base44.entities.Purchase.list("-created_date", 500) });
  const { data: customers = [] } = useQuery({ queryKey: ["customers"], queryFn: () => base44.entities.Customer.list() });
  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: () => base44.entities.Product.list() });
  const { data: expenses = [] } = useQuery({ queryKey: ["expenses"], queryFn: () => base44.entities.Expense.list() });

  const financials = useMemo(() => {
    let sales = invoices.filter(i => i.type === "sale" && i.date >= startDate && i.date <= endDate);
    let invPurchases = purchases.filter(p => p.date >= startDate && p.date <= endDate);
    let exp = expenses.filter(e => e.date >= startDate && e.date <= endDate);

    if (filterPaymentMode !== "all") sales = sales.filter(i => i.payment_mode === filterPaymentMode);
    if (filterStatus !== "all") sales = sales.filter(i => i.status === filterStatus);

    let rows = [];
    if (reportType === "sales") rows = sales;
    else if (reportType === "inventory") rows = products;
    else if (reportType === "customers") rows = customers;

    const totalSales = sales.reduce((sum, i) => sum + (i.grand_total || 0), 0);
    const cogs = invPurchases.reduce((sum, p) => sum + (p.grand_total || 0), 0);
    const opEx = exp.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalTax = sales.reduce((sum, i) => sum + (i.tax_amount || 0), 0);
    const totalDiscount = sales.reduce((sum, i) => sum + (i.discount_amount || 0), 0);
    const netProfit = totalSales - cogs - opEx - totalTax - totalDiscount;

    return { sales, purchases: invPurchases, expenses: exp, rows, totalSales, cogs, opEx, totalTax, totalDiscount, netProfit };
  }, [invoices, purchases, expenses, customers, products, reportType, startDate, endDate, filterPaymentMode, filterStatus]);

  const generateBIReportPDF = () => {
    if (!hasExport) return toast.error("You need the reports:export permission to generate PDFs");
    
    const doc = new jsPDF("p", "pt", "a4");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(232, 114, 28);
    doc.text(`EasyBMT BI Report: ${reportType.toUpperCase()}`, 40, 40);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text(`Period: ${startDate} to ${endDate}`, 40, 55);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 70);

    // Summary KPIs
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(60);
    doc.text(`Total Sales: ${fmtINR(financials.totalSales)}  |  COGS: ${fmtINR(financials.cogs)}  |  Expenses: ${fmtINR(financials.opEx)}  |  Net Profit: ${fmtINR(financials.netProfit)}`, 40, 85);

    const cols = [];
    if (selectedCols.date) cols.push("Date");
    if (selectedCols.invoice_number) cols.push("Reference");
    if (selectedCols.customer_name) cols.push("Entity");
    if (selectedCols.payment_mode) cols.push("Mode");
    if (selectedCols.tax_amount) cols.push("Tax");
    if (selectedCols.grand_total) cols.push("Total");
    if (selectedCols.status) cols.push("Status");

    const body = financials.rows.map(item => {
      const row = [];
      if (selectedCols.date) row.push(item.date || "-");
      if (selectedCols.invoice_number) row.push(item.invoice_number || item.id?.slice(0, 8) || "-");
      if (selectedCols.customer_name) row.push(item.customer_name || item.name || "-");
      if (selectedCols.payment_mode) row.push(item.payment_mode || "-");
      if (selectedCols.tax_amount) row.push(item.tax_amount ? `Rs ${item.tax_amount}` : "-");
      if (selectedCols.grand_total) row.push(item.grand_total ? `Rs ${item.grand_total}` : "-");
      if (selectedCols.status) row.push(item.status || "completed");
      return row;
    });

    doc.autoTable({
      head: [cols],
      body: body,
      startY: 100,
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [232, 114, 28], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 100, left: 40, right: 40, bottom: 60 },
      didDrawPage: (data) => {
        // Footer on every page
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${data.pageNumber} of ${pageCount}`, data.settings.margin.left, doc.internal.pageSize.height - 30);
        doc.text("EasyBMT - Enterprise Reports Engine", doc.internal.pageSize.width - 200, doc.internal.pageSize.height - 30);
      },
    });

    doc.save(`bi_report_${reportType}_${Date.now()}.pdf`);
    toast.success("BI Report exported successfully!");
  };

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Saved Templates Bar */}
      <div className="bg-card/50 backdrop-blur border border-border/60 rounded-xl p-3 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-black uppercase text-muted-foreground flex items-center gap-1.5">
            <FolderOpen className="w-3.5 h-3.5" /> Report Templates
          </h4>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Template name..."
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="bg-secondary/50 border border-border/50 rounded-lg px-2.5 py-1 text-[11px] text-foreground w-36"
            />
            <button
              onClick={() => {
                if (!templateName.trim()) return toast.error("Enter a template name");
                saveTemplate.mutate({
                  name: templateName.trim(),
                  type: reportType,
                  cols: JSON.stringify(selectedCols),
                  filters: JSON.stringify({ paymentMode: filterPaymentMode, status: filterStatus }),
                });
              }}
              disabled={saveTemplate.isPending}
              className="flex items-center gap-1 bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] font-bold px-2.5 py-1 rounded-lg transition"
            >
              <Save className="w-3 h-3" /> Save Current
            </button>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {PRESET_TEMPLATES.map((t, i) => (
            <button key={`preset-${i}`} onClick={() => loadTemplate(t)} className="shrink-0 text-[10px] font-bold bg-secondary/60 hover:bg-primary/15 border border-border/40 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
              {t.name}
            </button>
          ))}
          {savedTemplates.map((t) => (
            <div key={t.id} className="shrink-0 flex items-center gap-1 bg-secondary/60 border border-border/40 rounded-lg overflow-hidden">
              <button onClick={() => loadTemplate(t)} className="text-[10px] font-bold hover:bg-primary/15 px-3 py-1.5 transition-colors whitespace-nowrap">
                💾 {t.name}
              </button>
              <button onClick={() => deleteTemplate.mutate(t.id)} className="text-red-400 hover:bg-red-500/10 px-1.5 py-1.5 transition-colors">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          {savedTemplates.length === 0 && PRESET_TEMPLATES.length > 0 && (
            <span className="text-[10px] text-muted-foreground/50 self-center ml-2 italic">Save your first custom template →</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Sidebar */}
        <div className="md:col-span-1 bg-card/50 backdrop-blur border border-border/60 rounded-xl p-4 shadow-sm space-y-4 h-fit">
          <h3 className="font-bold text-sm">🎛️ Report Parameters</h3>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground uppercase">Dataset</label>
            <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="w-full bg-secondary/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground">
              <option value="sales">Sales & Revenue</option>
              <option value="inventory">Inventory Stock</option>
              <option value="customers">Customer Directory</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground uppercase">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-secondary/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground" />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground uppercase">End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-secondary/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground" />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground uppercase">Payment Mode</label>
            <select value={filterPaymentMode} onChange={(e) => setFilterPaymentMode(e.target.value)} className="w-full bg-secondary/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground">
              <option value="all">All Modes</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="credit">Credit</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground uppercase">Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full bg-secondary/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground">
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="pt-2">
            <h4 className="text-[11px] font-bold text-muted-foreground uppercase mb-2">Include Columns</h4>
            <div className="space-y-2">
              {Object.keys(selectedCols).map(col => (
                <label key={col} className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={selectedCols[col]} onChange={() => toggleCol(col)} className="w-4 h-4 rounded text-primary focus:ring-primary border-border/50 bg-secondary/50" />
                  <span className="text-xs font-semibold capitalize group-hover:text-primary transition-colors">{col.replace("_", " ")}</span>
                </label>
              ))}
            </div>
          </div>

          {/* P&L Summary */}
          <div className="border-t border-border/40 pt-3 space-y-1.5">
            <h4 className="text-[11px] font-bold text-muted-foreground uppercase">P&L Summary</h4>
            <div className="text-[11px] space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Gross Sales</span><span className="font-mono font-bold text-emerald-500">{fmtINR(financials.totalSales)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">COGS</span><span className="font-mono font-bold text-purple-400">-{fmtINR(financials.cogs)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Expenses</span><span className="font-mono font-bold text-red-400">-{fmtINR(financials.opEx)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">GST</span><span className="font-mono font-bold text-orange-400">-{fmtINR(financials.totalTax)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Discounts</span><span className="font-mono font-bold text-orange-400">-{fmtINR(financials.totalDiscount)}</span></div>
              <div className="flex justify-between border-t border-border/40 pt-1.5">
                <span className="font-bold text-foreground">Net Profit</span>
                <span className={cn("font-mono font-black", financials.netProfit >= 0 ? "text-emerald-500" : "text-red-500")}>{fmtINR(financials.netProfit)}</span>
              </div>
            </div>
          </div>

          <button onClick={generateBIReportPDF} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2.5 rounded-xl shadow transition text-sm flex items-center justify-center gap-2">
            <Download className="w-4 h-4" /> Export Advanced PDF
          </button>
        </div>

        {/* Preview */}
        <div className="md:col-span-3 space-y-4">
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-border bg-muted/20 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm">📊 Live Data Preview</h3>
                <p className="text-xs text-muted-foreground">{financials.rows.length} records found</p>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-secondary/10 p-4">
              <div className="space-y-2">
                {financials.rows.map((row, i) => (
                  <div key={i} className="bg-card border border-border/60 p-3 rounded-lg shadow-sm flex items-center justify-between hover:border-primary/40 transition-colors">
                    <div className="flex items-center gap-4">
                      {selectedCols.date && <span className="text-xs font-mono text-muted-foreground w-20">{row.date?.slice(0, 10)}</span>}
                      {selectedCols.invoice_number && <span className="text-sm font-bold text-primary w-24 truncate">{row.invoice_number || row.id?.slice(0, 8)}</span>}
                      {selectedCols.customer_name && <span className="text-sm font-semibold truncate w-32">{row.customer_name || row.name || "-"}</span>}
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      {selectedCols.payment_mode && <span className="text-[10px] uppercase font-bold bg-secondary px-2 py-0.5 rounded">{row.payment_mode || "N/A"}</span>}
                      {selectedCols.grand_total && <span className="text-sm font-black text-emerald-500 w-24">{fmtINR(row.grand_total || 0)}</span>}
                      {selectedCols.status && (
                        <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded w-20 text-center", row.status === "completed" || row.status === "paid" ? "bg-emerald-500/10 text-emerald-500" : "bg-orange-500/10 text-orange-500")}>
                          {row.status || "active"}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {financials.rows.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 py-20">
                    <FileText className="w-12 h-12 mb-2" />
                    <p className="font-bold">No records match criteria</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
