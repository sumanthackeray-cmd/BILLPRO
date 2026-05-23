import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Clock } from "lucide-react";
import { fmtINR } from "@/lib/gst-utils";
import { useLanguage } from "@/lib/LanguageContext";

export default function ShiftReportsTab() {
  const { t } = useLanguage();
  
  const { data: shiftHistory = [], isLoading } = useQuery({
    queryKey: ["shifts"],
    queryFn: () => base44.entities.Shift.list("-openedAt", 100),
  });

  return (
    <div className="space-y-4 animate-fade-up">
      <h3 className="font-bold text-sm mb-2">🕐 Shift History Log</h3>
      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Loading shifts...</div>
      ) : shiftHistory.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center shadow-sm">
          <Clock className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="font-bold text-muted-foreground">No shifts recorded yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shiftHistory.map((shift, idx) => (
            <div key={idx} className="bg-card border border-border/60 p-4 rounded-xl shadow-sm hover:border-primary/40 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-black text-sm">{shift.cashierName || "Unknown Cashier"}</h4>
                  <p className="text-[10px] text-muted-foreground font-mono">ID: {shift.id?.slice(0, 8)}</p>
                </div>
                <span className="text-[10px] uppercase font-bold bg-secondary px-2 py-0.5 rounded">Closed</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Opened</span>
                  <span className="font-semibold">{new Date(shift.openedAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Closed</span>
                  <span className="font-semibold">{new Date(shift.closedAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border/50">
                  <span className="text-muted-foreground">Opening Cash</span>
                  <span className="font-semibold text-emerald-500">{fmtINR(shift.openingCash || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Closing Cash</span>
                  <span className="font-black text-emerald-500">{fmtINR(shift.expectedCash || 0)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
