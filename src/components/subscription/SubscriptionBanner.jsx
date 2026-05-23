import { useQuery } from "@tanstack/react-query";
import { getUserSubscription, daysLeft } from "@/lib/subscription";
import { Crown, X, AlertTriangle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useState } from "react";

export default function SubscriptionBanner() {
  const [dismissed, setDismissed] = useState(false);

  const { data: sub } = useQuery({
    queryKey: ["userSubscription"],
    queryFn: getUserSubscription,
    staleTime: 5 * 60 * 1000,
  });

  if (!sub || dismissed) return null;
  if (sub.status === "active" && sub.plan !== "free") return null;

  const days = daysLeft(sub);
  const isExpired = sub.status === "expired" || (sub.status === "trial" && days === 0);
  const isUrgent = days !== null && days <= 3;

  if (!isExpired && sub.status === "active") return null;

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 text-sm font-semibold relative rounded-xl border ${isExpired
        ? "bg-destructive/15 border-destructive/30 text-destructive"
        : isUrgent
          ? "bg-warning/10 border-warning/30 text-warning"
          : "bg-primary/10 border-primary/20 text-primary"
      }`}>
      {isExpired ? <Lock className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
      <span className="flex-1">
        {isExpired
          ? "⚠️ Your trial has expired. Premium features are locked."
          : `🎉 Free Trial — ${days} day${days !== 1 ? "s" : ""} remaining. Upgrade to keep access.`}
      </span>
      <Link to="/subscription">
        <Button size="sm" className="gold-gradient text-black font-black text-xs h-7 px-3">
          <Crown className="w-3 h-3 mr-1" /> Upgrade Now
        </Button>
      </Link>
      <button onClick={() => setDismissed(true)} className="ml-1 opacity-60 hover:opacity-100">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}