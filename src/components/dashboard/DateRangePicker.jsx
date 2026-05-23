import { useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";

const PRESETS = [
  { label: "Today", days: 0 },
  { label: "Last 7d", days: 7 },
  { label: "Last 30d", days: 30 },
  { label: "Last 3M", days: 90 },
  { label: "Last 6M", days: 180 },
  { label: "This Year", days: 365 },
];

export default function DateRangePicker({ startDate, endDate, onChange }) {
  const [open, setOpen] = useState(false);
  const [activePreset, setActivePreset] = useState("Last 30d");

  const applyPreset = (preset) => {
    setActivePreset(preset.label);
    const end = new Date();
    const start = new Date();
    if (preset.days === 0) {
      onChange(end.toISOString().split("T")[0], end.toISOString().split("T")[0]);
    } else if (preset.label === "This Year") {
      start.setMonth(0); start.setDate(1);
      onChange(start.toISOString().split("T")[0], end.toISOString().split("T")[0]);
    } else {
      start.setDate(start.getDate() - preset.days);
      onChange(start.toISOString().split("T")[0], end.toISOString().split("T")[0]);
    }
    setOpen(false);
  };

  const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }) : "—";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card hover:bg-accent text-foreground text-[12px] font-semibold transition-all"
      >
        <Calendar className="w-3.5 h-3.5 text-primary" />
        <span>{fmt(startDate)} – {fmt(endDate)}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 z-50 bg-card border border-border rounded-xl p-3 shadow-2xl min-w-[200px]">
            <p className="text-[10px] text-muted-foreground font-bold uppercase mb-2 px-1">Quick Select</p>
            <div className="space-y-0.5">
              {PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${activePreset === p.label
                      ? "bg-primary/15 text-primary"
                      : "text-foreground hover:bg-accent"
                    }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="border-t border-border mt-2 pt-2 space-y-1.5">
              <p className="text-[10px] text-muted-foreground font-bold uppercase px-1">Custom Range</p>
              <input
                type="date"
                value={startDate}
                onChange={e => { setActivePreset("Custom"); onChange(e.target.value, endDate); }}
                className="w-full bg-secondary border border-border rounded-md px-2 py-1 text-[11px] text-foreground"
              />
              <input
                type="date"
                value={endDate}
                onChange={e => { setActivePreset("Custom"); onChange(startDate, e.target.value); }}
                className="w-full bg-secondary border border-border rounded-md px-2 py-1 text-[11px] text-foreground"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}