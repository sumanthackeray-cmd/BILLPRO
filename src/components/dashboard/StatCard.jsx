import { cn } from "@/lib/utils";

const colorMap = {
  gold: "border-l-primary text-primary",
  green: "border-l-success text-success",
  red: "border-l-destructive text-destructive",
  blue: "border-l-info text-info",
  purple: "border-l-purple text-purple",
  teal: "border-l-teal text-teal",
  amber: "border-l-warning text-warning",
};

export default function StatCard({ label, value, icon, color = "gold", sub, trend }) {
  const colors = colorMap[color] || colorMap.gold;
  const [borderClass, textClass] = colors.split(" ");

  return (
    <div className={cn(
      "bg-card border border-border rounded-xl p-5 border-l-[3px] hover:-translate-y-0.5 transition-all duration-200 hover:shadow-lg",
      borderClass
    )}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground tracking-wider uppercase mb-2">{label}</p>
          <p className={cn("text-2xl font-bold font-mono", textClass)}>{value}</p>
          {sub && <p className="text-[11px] text-muted-foreground/70 mt-1">{sub}</p>}
        </div>
        {icon && <span className="text-2xl opacity-60">{icon}</span>}
      </div>
      {trend !== undefined && (
        <p className={cn("mt-2 text-[11px] font-semibold", trend >= 0 ? "text-success" : "text-destructive")}>
          {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}% vs last month
        </p>
      )}
    </div>
  );
}