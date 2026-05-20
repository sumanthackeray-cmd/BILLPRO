import { useQuery } from "@tanstack/react-query";
import { getUserSubscription, isFeatureLocked, PLAN_NAMES } from "@/lib/subscription";
import { Lock, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function FeatureGate({ feature, requiredPlan = "professional", children, fallback }) {
  const { data: sub, isLoading } = useQuery({
    queryKey: ["userSubscription"],
    queryFn: getUserSubscription,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <div className="animate-pulse bg-secondary/50 rounded-xl h-32" />;

  if (!isFeatureLocked(sub, feature)) return children;

  if (fallback) return fallback;

  return (
    <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-4">
      <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
        <Lock className="w-7 h-7 text-primary" />
      </div>
      <div>
        <p className="font-black text-lg">Premium Feature</p>
        <p className="text-muted-foreground text-sm mt-1">
          This feature requires the <span className="font-bold text-primary">{PLAN_NAMES[requiredPlan]}</span> plan or higher.
        </p>
      </div>
      <Link to="/subscription">
        <Button className="gold-gradient text-black font-black gap-2">
          <Crown className="w-4 h-4" /> Upgrade Plan
        </Button>
      </Link>
    </div>
  );
}