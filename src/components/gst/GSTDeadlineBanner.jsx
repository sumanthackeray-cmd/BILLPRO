import { useState, useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Link } from "react-router-dom";

function getUrgentDeadlines() {
  const today = new Date();
  const month = today.getMonth();
  const year = today.getFullYear();
  const results = [];

  const gstr1Due = new Date(year, month + 1, 11);
  const gstr3bDue = new Date(year, month + 1, 20);

  const d1 = Math.ceil((gstr1Due - today) / (1000 * 60 * 60 * 24));
  const d2 = Math.ceil((gstr3bDue - today) / (1000 * 60 * 60 * 24));

  if (d1 <= 7 && d1 >= 0) results.push({ name: "GSTR-1", days: d1 });
  if (d2 <= 7 && d2 >= 0) results.push({ name: "GSTR-3B", days: d2 });

  return results;
}

export default function GSTDeadlineBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [deadlines, setDeadlines] = useState([]);

  useEffect(() => {
    const key = `gst_banner_dismissed_${new Date().toISOString().slice(0, 10)}`;
    if (localStorage.getItem(key)) {
      setDismissed(true);
      return;
    }
    setDeadlines(getUrgentDeadlines());
  }, []);

  const handleDismiss = () => {
    const key = `gst_banner_dismissed_${new Date().toISOString().slice(0, 10)}`;
    localStorage.setItem(key, "1");
    setDismissed(true);
  };

  if (dismissed || deadlines.length === 0) return null;

  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2.5 flex items-center gap-3">
      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
      <div className="flex-1 text-[12px]">
        <span className="font-bold text-red-400">GST Deadline Alert: </span>
        <span className="text-foreground">
          {deadlines.map((d) => `${d.name} due in ${d.days} day${d.days !== 1 ? "s" : ""}`).join(" · ")}
        </span>
        <Link to="/gst-filing" className="ml-2 text-primary font-bold underline underline-offset-2 hover:no-underline">
          File Now →
        </Link>
      </div>
      <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground transition-colors p-1">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}