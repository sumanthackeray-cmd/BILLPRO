import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function SalesChart({ data }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="font-bold text-sm mb-4">📈 Sales Trend (6 Months)</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barSize={20}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,25%,18%)" />
            <XAxis dataKey="month" tick={{ fill: "hsl(220,15%,55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "hsl(220,15%,55%)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
            <Tooltip
              contentStyle={{ background: "hsl(222,40%,7%)", border: "1px solid hsl(222,25%,18%)", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "hsl(220,30%,93%)" }}
              formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, "Sales"]}
            />
            <Bar dataKey="sales" fill="hsl(36,90%,55%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}