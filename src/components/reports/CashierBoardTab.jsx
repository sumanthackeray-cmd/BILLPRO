import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Award } from "lucide-react";
import { fmtINR } from "@/lib/gst-utils";

export default function CashierBoardTab() {
  const { data: shiftHistory = [] } = useQuery({
    queryKey: ["shifts"],
    queryFn: () => base44.entities.Shift.list("-openedAt", 100),
  });

  const cashierStats = {};
  shiftHistory.forEach(s => {
    if (!cashierStats[s.cashierName]) cashierStats[s.cashierName] = { shifts: 0, collected: 0, name: s.cashierName };
    cashierStats[s.cashierName].shifts++;
    cashierStats[s.cashierName].collected += (s.expectedCash || 0) - (s.openingCash || 0);
  });
  
  const leaderboard = Object.values(cashierStats).sort((a, b) => b.collected - a.collected);

  return (
    <div className="space-y-4 animate-fade-up">
      <h3 className="font-bold text-sm mb-2">🏆 Cashier Performance Board</h3>
      {leaderboard.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center shadow-sm">
          <Award className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="font-bold text-muted-foreground">No cashier data available yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {leaderboard.map((c, i) => (
            <div key={i} className="bg-gradient-to-br from-card to-card/50 border border-border/60 p-5 rounded-xl shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
                <Award className="w-24 h-24" />
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-black text-primary text-lg border border-primary/30">
                  {i + 1}
                </div>
                <div>
                  <h4 className="font-black text-base">{c.name || "Unknown"}</h4>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{c.shifts} Shifts Completed</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Total Net Collected</p>
                <p className="text-2xl font-black text-emerald-500">{fmtINR(c.collected)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
