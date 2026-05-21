import { Users } from "lucide-react";
import { fmtINR } from "@/lib/gst-utils";

export default function PartyLedgerWidget({ title, parties, type = "receivable" }) {
  // parties is an array of objects: { id, name, amount }
  return (
    <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Users className={`w-4 h-4 ${type === "receivable" ? "text-emerald-500" : "text-red-500"}`} />
        <h3 className="font-bold text-sm text-slate-800 dark:text-foreground">{title}</h3>
      </div>
      <div className="space-y-3">
        {parties.length > 0 ? parties.map((party) => (
          <div key={party.id} className="flex justify-between items-center text-[12px] border-b border-border/40 pb-2 last:border-0 last:pb-0">
            <span className="font-semibold text-slate-700 dark:text-slate-300">{party.name}</span>
            <span className={`font-mono font-bold ${type === "receivable" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
              {fmtINR(party.amount)}
            </span>
          </div>
        )) : (
          <p className="text-[11px] text-muted-foreground text-center py-4">No pending balances.</p>
        )}
      </div>
    </div>
  );
}
