import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { fmtINR } from "@/lib/gst-utils";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-xl text-[11px]">
      <p className="text-muted-foreground font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-bold">
          {p.name}: {fmtINR(p.value)}
        </p>
      ))}
    </div>
  );
};

export default function SalesBarChart({ data, title, dataKeyX = "day", dataKeyY1 = "Sales", dataKeyY2 = "Expenses" }) {
  return (
    <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-xl p-5 shadow-sm">
      <h3 className="font-bold text-sm text-slate-800 dark:text-foreground mb-4">{title}</h3>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barSize={10}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,25%,18%)" />
            <XAxis dataKey={dataKeyX} tick={{ fill: "hsl(220,15%,55%)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "hsl(220,15%,55%)", fontSize: 10 }} axisLine={false} tickLine={false}
              tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, color: "hsl(220,30%,93%)" }} />
            {dataKeyY1 && <Bar dataKey={dataKeyY1} fill="hsl(36,90%,55%)" radius={[3, 3, 0, 0]} />}
            {dataKeyY2 && <Bar dataKey={dataKeyY2} fill="hsl(0,84%,60%)" radius={[3, 3, 0, 0]} />}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
