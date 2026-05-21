import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { fmtINR } from "@/lib/gst-utils";

const COLORS = ["hsl(160,72%,39%)", "hsl(38,92%,50%)", "hsl(0,84%,60%)", "hsl(217,91%,60%)", "hsl(263,70%,65%)"];

export default function CategoryPieChart({ data, title }) {
  return (
    <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-xl p-5 shadow-sm">
      <h3 className="font-bold text-sm text-slate-800 dark:text-foreground mb-4">{title}</h3>
      {data.length > 0 ? (
        <>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={v => fmtINR(v)} contentStyle={{ background: "hsl(222,40%,7%)", border: "1px solid hsl(222,25%,18%)", borderRadius: 8, fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1 mt-2">
            {data.slice(0, 5).map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-slate-600 dark:text-muted-foreground truncate max-w-[100px]">{d.name}</span>
                </div>
                <span className="font-bold text-slate-800 dark:text-foreground">{fmtINR(d.value)}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-muted-foreground text-center py-16 text-sm">No data available</p>
      )}
    </div>
  );
}
