import { Link } from "react-router-dom";
import { FileText, ShoppingCart, Package, Users, ScanBarcode, BarChart3 } from "lucide-react";

const ACTIONS = [
  { label: "New Invoice", icon: FileText, to: "/invoices", color: "text-primary", bg: "bg-primary/10 border-primary/20" },
  { label: "New Purchase", icon: ShoppingCart, to: "/purchases", color: "text-info", bg: "bg-info/10 border-info/20" },
  { label: "Add Product", icon: Package, to: "/inventory", color: "text-success", bg: "bg-success/10 border-success/20" },
  { label: "Add Customer", icon: Users, to: "/customers", color: "text-warning", bg: "bg-warning/10 border-warning/20" },
  { label: "Print Barcode", icon: ScanBarcode, to: "/barcode", color: "text-purple", bg: "bg-purple/10 border-purple/20" },
  { label: "View Reports", icon: BarChart3, to: "/reports", color: "text-teal", bg: "bg-teal/10 border-teal/20" },
];

export default function QuickActions() {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="font-bold text-sm mb-3">⚡ Quick Actions</h3>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {ACTIONS.map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all hover:scale-105 active:scale-95 ${a.bg}`}
          >
            <a.icon className={`w-5 h-5 ${a.color}`} />
            <span className="text-[10px] font-bold text-center leading-tight">{a.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}