import MetricCard from "@/components/dashboard/MetricCard";
import SalesBarChart from "@/components/dashboard/widgets/SalesBarChart";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import { fmtINR } from "@/lib/gst-utils";
import { ReceiptText, TrendingUp, PiggyBank, BarChart2, Wallet, ShoppingCart, Users, Package, Activity } from "lucide-react";

export default function GeneralDashboard({ data }) {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const isRestrictedRole = user?.hierarchy_level >= 5;

  const profitColor = data.netProfit >= 0 ? "green" : "red";

  return (
    <div className="space-y-4">
      <div className={`grid grid-cols-2 ${isRestrictedRole ? 'md:grid-cols-1' : 'md:grid-cols-4'} gap-3`}>
        <MetricCard label={t("metric.total_sales")} value={fmtINR(data.totalSales)} icon={ReceiptText} color="gold"
          trend={data.salesTrend} trendLabel={language === "hi" ? "पिछले अवधि की तुलना में" : "vs previous period"} sub={`${data.filteredInvoices.length} ${language === "hi" ? "इनवॉइस" : "invoices"}`} />
        {!isRestrictedRole && (
          <>
            <MetricCard label={t("metric.gross_profit")} value={fmtINR(data.grossProfit)} icon={TrendingUp} color={data.grossProfit >= 0 ? "green" : "red"}
              sub={`${language === "hi" ? "मार्जिन" : "Margin"}: ${data.totalSales > 0 ? ((data.grossProfit / data.totalSales) * 100).toFixed(1) : 0}%`} />
            <MetricCard label={t("metric.net_profit")} value={fmtINR(data.netProfit)} icon={PiggyBank} color={profitColor}
              sub={language === "hi" ? `₹${(data.totalExpenses / 1000).toFixed(1)}k खर्चों के बाद` : `After ₹${(data.totalExpenses / 1000).toFixed(1)}k expenses`} />
            <MetricCard label={t("metric.gst_collected")} value={fmtINR(data.totalTax)} icon={BarChart2} color="blue"
              sub={language === "hi" ? "कुल जीएसटी राशि" : "Total tax amount"} />
          </>
        )}
      </div>

      <div className={`grid grid-cols-2 md:grid-cols-3 ${isRestrictedRole ? 'xl:grid-cols-3' : 'xl:grid-cols-6'} gap-3`}>
        <MetricCard label={t("metric.outstanding")} value={fmtINR(data.outstanding)} icon={Wallet} color="orange"
          sub={language === "hi" ? `${data.invoices.filter(i => i.status !== "paid" && i.type === "sale").length} बाकी` : `${data.invoices.filter(i => i.status !== "paid" && i.type === "sale").length} pending`} />
        {!isRestrictedRole && (
          <MetricCard label={t("metric.purchases")} value={fmtINR(data.totalPurchases)} icon={ShoppingCart} color="purple"
            sub={language === "hi" ? `${data.filteredPurchases.length} खरीद बिल` : `${data.filteredPurchases.length} bills`} />
        )}
        {!isRestrictedRole && (
          <MetricCard label={t("metric.expenses")} value={fmtINR(data.totalExpenses)} icon="💸" color="red"
            sub={language === "hi" ? `${data.filteredExpenses.length} प्रविष्टियां` : `${data.filteredExpenses.length} entries`} />
        )}
        <MetricCard label={t("metric.customers")} value={data.customers.length} icon={Users} color="teal"
          sub={language === "hi" ? "कुल ग्राहक संख्या" : "Total customers"} />
        <MetricCard label={t("metric.products")} value={data.products.length} icon={Package} color="blue"
          sub={language === "hi" ? `${data.outStock.length} आउट ऑफ स्टॉक` : `${data.outStock.length} out of stock`} />
        {!isRestrictedRole && (
          <MetricCard label={t("metric.loan_debt")} value={fmtINR(data.totalLoanOutstanding)} icon={Activity} color="orange"
            sub={language === "hi" ? `${data.loans.filter(l => l.status === "Active").length} सक्रिय लोन` : `${data.loans.filter(l => l.status === "Active").length} active loans`} />
        )}
      </div>

      {!isRestrictedRole && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SalesBarChart data={data.dailyData} title={t("metric.sales_vs_expenses")} />
        </div>
      )}
    </div>
  );
}
