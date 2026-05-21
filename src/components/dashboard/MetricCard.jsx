import { TrendingUp, TrendingDown, Minus } from "lucide-react";

// MetricCard: icon can be a Lucide component or an emoji string
// Fixed for light mode visibility — avoids light-on-light colored text

const THEMES = {
  gold:   { border: "border-yellow-500/20 dark:border-yellow-500/25", bg: "bg-yellow-50 dark:bg-yellow-500/10", icon: "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400", value: "text-yellow-700 dark:text-yellow-400" },
  green:  { border: "border-emerald-500/20 dark:border-emerald-500/25", bg: "bg-emerald-50 dark:bg-emerald-500/10", icon: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400", value: "text-emerald-700 dark:text-emerald-400" },
  red:    { border: "border-red-500/20 dark:border-red-500/25", bg: "bg-red-50 dark:bg-red-500/10", icon: "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400", value: "text-red-700 dark:text-red-400" },
  blue:   { border: "border-blue-500/20 dark:border-blue-500/25", bg: "bg-blue-50 dark:bg-blue-500/10", icon: "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400", value: "text-blue-700 dark:text-blue-400" },
  purple: { border: "border-purple-500/20 dark:border-purple-500/25", bg: "bg-purple-50 dark:bg-purple-500/10", icon: "bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400", value: "text-purple-700 dark:text-purple-400" },
  teal:   { border: "border-teal-500/20 dark:border-teal-500/25", bg: "bg-teal-50 dark:bg-teal-500/10", icon: "bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400", value: "text-teal-700 dark:text-teal-400" },
  orange: { border: "border-orange-500/20 dark:border-orange-500/25", bg: "bg-orange-50 dark:bg-orange-500/10", icon: "bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400", value: "text-orange-700 dark:text-orange-400" },
};

export default function MetricCard({ label, value, icon: Icon, color = "gold", sub, trend, trendLabel }) {
  const t = THEMES[color] || THEMES.gold;
  const isUp = trend > 0;
  const isDown = trend < 0;

  return (
    <div className={`bg-white dark:bg-card border ${t.border} rounded-xl p-4 flex flex-col gap-2 hover:shadow-md transition-all duration-200`}>
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-lg ${t.icon} flex items-center justify-center shrink-0`}>
          {typeof Icon === "string" ? (
            <span className="text-base leading-none">{Icon}</span>
          ) : (
            <Icon className="w-4 h-4" />
          )}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-[11px] font-bold ${isUp ? "text-emerald-600 dark:text-emerald-400" : isDown ? "text-red-600 dark:text-red-400" : "text-slate-400"}`}>
            {isUp ? <TrendingUp className="w-3 h-3" /> : isDown ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            {trend !== 0 ? `${Math.abs(trend)}%` : "—"}
          </div>
        )}
      </div>
      <div>
        <p className={`text-xl font-black ${t.value} leading-tight`}>{value}</p>
        <p className="text-[12px] font-semibold text-slate-700 dark:text-foreground mt-0.5">{label}</p>
        {sub && <p className="text-[11px] text-slate-500 dark:text-muted-foreground mt-0.5">{sub}</p>}
        {trendLabel && <p className="text-[10px] text-slate-400 dark:text-muted-foreground">{trendLabel}</p>}
      </div>
    </div>
  );
}