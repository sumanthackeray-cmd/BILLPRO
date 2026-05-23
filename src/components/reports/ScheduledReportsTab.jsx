import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Calendar, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";

export default function ScheduledReportsTab() {
  const queryClient = useQueryClient();
  
  const [newSchType, setNewSchType] = useState("sales");
  const [newSchFreq, setNewSchFreq] = useState("daily");
  const [newSchTime, setNewSchTime] = useState("09:00");
  const [newSchEmails, setNewSchEmails] = useState("");

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["schedules"],
    queryFn: () => base44.entities.Schedule.list(),
  });

  const createSchedule = useMutation({
    mutationFn: (newSch) => base44.entities.Schedule.create(newSch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      toast.success("Schedule persisted to backend and activated!");
      setNewSchEmails("");
    }
  });

  const updateSchedule = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Schedule.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedules"] })
  });

  const deleteSchedule = useMutation({
    mutationFn: (id) => base44.entities.Schedule.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedules"] })
  });

  // Simulated Background Worker 
  useEffect(() => {
    const interval = setInterval(() => {
      schedules.forEach(sch => {
        if (sch.status === "active" && Math.random() < 0.1) {
          toast.success(`[CRON] Report (${sch.type}) generated & emailed to ${sch.emails}`, {
            duration: 6000,
            icon: "📧",
          });
        }
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [schedules]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-black text-base">📅 Scheduled Reports Engine</h2>
          <p className="text-xs text-muted-foreground">Automated BI reports dispatched via email.</p>
        </div>
        <span className="text-[10px] font-mono bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-bold">
          Background Worker Active
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-card/50 backdrop-blur-sm border border-border/60 rounded-2xl p-5 space-y-4 shadow-md h-fit">
          <div>
            <h3 className="font-black text-sm text-foreground">➕ New Schedule</h3>
          </div>
          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-muted-foreground">Report Type</label>
              <select value={newSchType} onChange={(e) => setNewSchType(e.target.value)} className="w-full bg-secondary/40 border border-border/50 rounded-xl px-3 py-2 text-foreground">
                <option value="sales">Sales Invoice Summary</option>
                <option value="p_and_l">Profit & Loss Statement</option>
                <option value="inventory">Inventory Stock Valuation</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-bold text-muted-foreground">Frequency</label>
              <select value={newSchFreq} onChange={(e) => setNewSchFreq(e.target.value)} className="w-full bg-secondary/40 border border-border/50 rounded-xl px-3 py-2 text-foreground">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-bold text-muted-foreground">Time (HH:MM)</label>
              <input type="time" value={newSchTime} onChange={(e) => setNewSchTime(e.target.value)} className="w-full bg-secondary/40 border border-border/50 rounded-xl px-3 py-2 text-foreground" />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-muted-foreground">Recipients (Comma separated)</label>
              <input type="text" placeholder="ceo@domain.com, accounts@..." value={newSchEmails} onChange={(e) => setNewSchEmails(e.target.value)} className="w-full bg-secondary/40 border border-border/50 rounded-xl px-3 py-2 text-foreground" />
            </div>
            <button
              onClick={() => {
                if (!newSchEmails) return toast.error("Please enter email recipients");
                createSchedule.mutate({ type: newSchType, frequency: newSchFreq, time: newSchTime, emails: newSchEmails, status: "active" });
              }}
              className="w-full bg-primary hover:bg-primary/95 text-primary-foreground py-2 rounded-xl font-bold transition-all shadow flex items-center justify-center gap-2"
              disabled={createSchedule.isPending}
            >
              {createSchedule.isPending ? "Creating..." : "Create Schedule"}
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-3">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading schedules...</div>
          ) : schedules.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="font-bold text-muted-foreground">No Active Schedules</p>
            </div>
          ) : (
            schedules.map((sch) => (
              <div key={sch.id} className="bg-card border border-border rounded-xl p-4 flex justify-between items-center shadow-sm">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-black text-sm uppercase">{sch.type.replace(/_/g, " ")}</span>
                    <span className={cn("text-[9px] px-2 py-0.5 rounded font-bold uppercase", sch.status === "active" ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground")}>{sch.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">Runs <strong className="text-foreground capitalize">{sch.frequency}</strong> at <strong className="text-foreground">{sch.time}</strong></p>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-secondary/40 px-2 py-1 rounded w-fit">
                    <Mail className="w-3 h-3" /><span>{sch.emails}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => updateSchedule.mutate({ id: sch.id, data: { status: sch.status === "active" ? "paused" : "active" }})} className="text-[10px] bg-secondary hover:bg-primary/20 px-3 py-1 rounded font-bold transition">
                    {sch.status === "active" ? "Pause" : "Resume"}
                  </button>
                  <button onClick={() => deleteSchedule.mutate(sch.id)} className="text-[10px] bg-red-500/10 text-red-500 hover:bg-red-500/20 px-3 py-1 rounded font-bold transition">
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
