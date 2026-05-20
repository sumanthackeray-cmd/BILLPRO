import { TrendingUp, TrendingDown, Minus } from "lucide-react";
// MetricCard: icon can be a Lucide component or an emoji string

const THEMES = {
  gold: { border: "border-yellow-500/25", icon: "bg-yellow-500/15 text-yellow-400", badge: "text-yellow-400" },
  green: { border: "border-emerald-500/25", icon: "bg-emerald-500/15 text-emerald-400", badge: "text-emerald-400" },
  red: { border: "border-red-500/25", icon: "bg-red-500/15 text-red-400", badge: "text-red-400" },
  blue: { border: "border-blue-500/25", icon: "bg-blue-500/15 text-blue-400", badge: "text-blue-400" },
  purple: { border: "border-purple-500/25", icon: "bg-purple-500/15 text-purple-400", badge: "text-purple-400" },
  teal: { border: "border-teal-500/25", icon: "bg-teal-500/15 text-teal-400", badge: "text-teal-400" },
  orange: { border: "border-orange-500/25", icon: "bg-orange-500/15 text-orange-400", badge: "text-orange-400" },
};

export default function MetricCard({ label, value, icon: Icon, color = "gold", sub, trend, trendLabel }) {
  const t = THEMES[color] || THEMES.gold;
  const isUp = trend > 0;
  const isDown = trend < 0;

  return (
    <div className={`bg-card border ${t.border} rounded-xl p-4 flex flex-col gap-2 hover:shadow-lg transition-all`}>
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-lg ${t.icon} flex items-center justify-center shrink-0`}>
          {typeof Icon === "string" ? (
            <span className="text-base leading-none">{Icon}</span>
          ) : (
            <Icon className="w-4 h-4" />
          )}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-[11px] font-bold ${isUp ? "text-emerald-400" : isDown ? "text-red-400" : "text-muted-foreground"}`}>
            {isUp ? <TrendingUp className="w-3 h-3" /> : isDown ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            {trend !== 0 ? `${Math.abs(trend)}%` : "—"}
          </div>
        )}
      </div>
      <div>
        <p className={`text-xl font-black ${t.badge} leading-tight`}>{value}</p>
        <p className="text-[12px] font-semibold text-foreground mt-0.5">{label}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
        {trendLabel && <p className="text-[10px] text-muted-foreground">{trendLabel}</p>}
      </div>
    </div>
  );
}