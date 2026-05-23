import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { getUserSubscription, daysLeft, PLAN_NAMES } from "@/lib/subscription";
import { Check, Zap, Star, Building2, Gift, Crown, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";

const PLANS = [
  {
    id: "free", name: "Free Trial", price: 0, period: "14 days", icon: Gift,
    color: "text-muted-foreground", border: "border-border", badge: null,
    description: "Try all features free for 14 days",
    features: ["Up to 25 invoices", "Up to 50 products", "Basic GST reports", "Watermarked invoices", "Single user"],
    cta: "Current Plan", ctaClass: "bg-secondary text-foreground",
  },
  {
    id: "starter", name: "Starter", price: 499, period: "month", icon: Zap,
    color: "text-info", border: "border-info/30", badge: null,
    description: "Perfect for small shops & kirana stores",
    features: ["500 invoices/month", "Unlimited products", "GST billing & reports", "Barcode printing", "E-Waybill support", "WhatsApp sharing"],
    cta: "Get Starter", ctaClass: "bg-info text-white hover:bg-info/90",
    razorpay_monthly: 49900, razorpay_yearly: 479040,
  },
  {
    id: "professional", name: "Professional", price: 999, period: "month", icon: Star,
    color: "text-primary", border: "border-primary/40", badge: "Most Popular",
    description: "For growing businesses & distributors",
    features: ["Unlimited invoices", "Multi-user (5 users)", "AI Insights & Analytics", "Custom branding & logo", "Cloud backup", "Priority support", "GSTR-1/3B reports"],
    cta: "Go Professional", ctaClass: "gold-gradient text-black font-black",
    highlighted: true, razorpay_monthly: 99900, razorpay_yearly: 958080,
  },
  {
    id: "enterprise", name: "Enterprise", price: 2499, period: "month", icon: Building2,
    color: "text-purple", border: "border-purple/30", badge: "Best Value",
    description: "For large enterprises & multi-branch",
    features: ["Everything in Professional", "Multi-branch support", "Unlimited users", "AI automation", "API access", "Dedicated account manager"],
    cta: "Contact Sales", ctaClass: "bg-purple text-white hover:bg-purple/90",
    razorpay_monthly: 249900, razorpay_yearly: 2399040,
  },
];

const FAQS = [
  { q: "Can I upgrade or downgrade?", a: "Yes, anytime. Charges are prorated." },
  { q: "GST invoice for subscription?", a: "Yes, GST-compliant invoice for every payment." },
  { q: "Payment methods accepted?", a: "UPI, Credit/Debit cards, Net Banking via Razorpay." },
  { q: "Is my data safe?", a: "Yes, AES-256 encryption with isolated storage per business." },
];

function loadRazorpay() {
  return new Promise(resolve => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function Subscription() {
  const queryClient = useQueryClient();
  const [billing, setBilling] = useState("monthly");
  const [openFaq, setOpenFaq] = useState(null);
  const [paying, setPaying] = useState(null);

  const { data: sub } = useQuery({
    queryKey: ["userSubscription"],
    queryFn: getUserSubscription,
    staleTime: 5 * 60 * 1000,
  });

  const discount = billing === "yearly" ? 0.2 : 0;
  const days = daysLeft(sub);

  const handleUpgrade = async (plan) => {
    if (plan.id === "enterprise") {
      toast.info("Please contact sales@easybmt.com for Enterprise plan");
      return;
    }
    if (plan.id === "free") return;

    setPaying(plan.id);
    const loaded = await loadRazorpay();
    if (!loaded) {
      toast.error("Failed to load payment gateway. Please check your connection.");
      setPaying(null);
      return;
    }

    const user = await base44.auth.me();
    const amountPaise = billing === "yearly" ? plan.razorpay_yearly : plan.razorpay_monthly;
    const finalAmount = Math.round(amountPaise * (1 - discount));

    const options = {
      key: "rzp_test_placeholder", // Replace with actual Razorpay key
      amount: finalAmount,
      currency: "INR",
      name: "EasyBMT",
      description: `${plan.name} Plan — ${billing === "yearly" ? "Yearly" : "Monthly"}`,
      image: "/logo.png",
      prefill: { name: user?.full_name || "", email: user?.email || "" },
      theme: { color: "#E8870A" },
      handler: async (response) => {
        // Payment success
        const today = new Date().toISOString().slice(0, 10);
        const nextBilling = new Date();
        if (billing === "yearly") nextBilling.setFullYear(nextBilling.getFullYear() + 1);
        else nextBilling.setMonth(nextBilling.getMonth() + 1);

        const subData = {
          user_email: user.email, plan: plan.id, status: "active",
          billing_cycle: billing,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id || "",
          amount_paid: finalAmount / 100,
          next_billing_date: nextBilling.toISOString().slice(0, 10),
        };

        if (sub?.id) {
          await base44.entities.UserSubscription.update(sub.id, subData);
        } else {
          await base44.entities.UserSubscription.create(subData);
        }

        // Send confirmation email
        await base44.integrations.Core.SendEmail({
          to: user.email,
          subject: `✅ EasyBMT — ${plan.name} Plan Activated!`,
          body: `Hi ${user.full_name || "there"},\n\nYour ${plan.name} plan has been activated successfully!\n\nPayment ID: ${response.razorpay_payment_id}\nAmount: ₹${(finalAmount / 100).toLocaleString("en-IN")}\nBilling: ${billing === "yearly" ? "Yearly" : "Monthly"}\nNext billing: ${nextBilling.toDateString()}\n\nThank you for choosing EasyBMT!\n\n— Team EasyBMT`
        });

        queryClient.invalidateQueries({ queryKey: ["userSubscription"] });
        toast.success(`🎉 ${plan.name} plan activated! Welcome aboard.`);
        setPaying(null);
      },
      modal: { ondismiss: () => setPaying(null) },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  const handleCancelPlan = async () => {
    if (!sub?.id) return;
    if (!confirm("Are you sure you want to cancel your subscription?")) return;
    await base44.entities.UserSubscription.update(sub.id, { status: "cancelled" });
    queryClient.invalidateQueries({ queryKey: ["userSubscription"] });
    toast.success("Subscription cancelled.");
  };

  return (
    <div className="animate-fade-up space-y-8 pb-8">
      {/* Current Plan Banner */}
      {sub && (
        <div className={cn(
          "rounded-2xl p-4 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4",
          sub.status === "active" ? "bg-success/10 border-success/30" :
            sub.status === "expired" ? "bg-destructive/10 border-destructive/30" :
              "bg-primary/10 border-primary/20"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center",
              sub.status === "active" ? "bg-success/20" : sub.status === "expired" ? "bg-destructive/20" : "gold-gradient"
            )}>
              {sub.status === "active" ? <CheckCircle className="w-5 h-5 text-success" /> :
                sub.status === "expired" ? <AlertTriangle className="w-5 h-5 text-destructive" /> :
                  <Crown className="w-5 h-5 text-black" />}
            </div>
            <div>
              <p className="font-black text-[15px]">
                {sub.status === "trial" ? "Free Trial" : `${PLAN_NAMES[sub.plan]} Plan`}
                <Badge variant="outline" className={cn("ml-2 text-[10px]",
                  sub.status === "active" ? "border-success/30 text-success" :
                    sub.status === "expired" ? "border-destructive/30 text-destructive" :
                      "border-primary/30 text-primary"
                )}>{sub.status?.toUpperCase()}</Badge>
              </p>
              <p className="text-[12px] text-muted-foreground">
                {sub.status === "trial" && days !== null ? `${days} days remaining in trial` :
                  sub.status === "active" && sub.next_billing_date ? `Next billing: ${sub.next_billing_date}` :
                    sub.status === "expired" ? "Subscription expired — upgrade to continue" :
                      "Manage your subscription below"}
              </p>
            </div>
          </div>
          {sub.status === "active" && (
            <button onClick={handleCancelPlan} className="text-[12px] text-muted-foreground hover:text-destructive transition-colors">
              Cancel subscription
            </button>
          )}
        </div>
      )}

      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-4">
          <Crown className="w-4 h-4 text-primary" />
          <span className="text-primary font-bold text-sm">EasyBMT Plans</span>
        </div>
        <h1 className="text-3xl font-black mb-2">Choose Your <span className="gold-text">Plan</span></h1>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto">Transparent pricing, no hidden fees. Powered by Razorpay.</p>
        <div className="inline-flex items-center gap-1 bg-secondary rounded-full p-1 mt-5">
          <button onClick={() => setBilling("monthly")}
            className={cn("px-4 py-1.5 rounded-full text-sm font-bold transition-all", billing === "monthly" ? "bg-primary text-black" : "text-muted-foreground")}>
            Monthly
          </button>
          <button onClick={() => setBilling("yearly")}
            className={cn("px-4 py-1.5 rounded-full text-sm font-bold transition-all flex items-center gap-2", billing === "yearly" ? "bg-primary text-black" : "text-muted-foreground")}>
            Yearly <span className="text-[10px] bg-success/20 text-success px-1.5 py-0.5 rounded-full font-extrabold">-20%</span>
          </button>
        </div>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const finalPrice = plan.price > 0 ? Math.round(plan.price * (1 - discount)) : 0;
          const isCurrent = sub?.plan === plan.id && (sub?.status === "active" || sub?.status === "trial");
          return (
            <div key={plan.id} className={cn(
              "relative bg-card border rounded-2xl p-5 flex flex-col gap-4 transition-all duration-300",
              plan.border,
              plan.highlighted && "ring-2 ring-primary/40 shadow-[0_0_32px_hsla(36,90%,55%,0.12)] scale-[1.01]",
              isCurrent && "ring-2 ring-success/50"
            )}>
              {plan.badge && !isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className={cn("px-3 py-1 rounded-full text-[11px] font-extrabold whitespace-nowrap",
                    plan.highlighted ? "gold-gradient text-black" : "bg-purple/20 text-purple border border-purple/30"
                  )}>{plan.badge}</span>
                </div>
              )}
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-success/20 text-success border border-success/30">✓ Current Plan</span>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", plan.highlighted ? "gold-gradient" : "bg-secondary")}>
                  <Icon className={cn("w-5 h-5", plan.highlighted ? "text-black" : plan.color)} />
                </div>
                <div>
                  <h3 className="font-black text-base">{plan.name}</h3>
                  <p className="text-[11px] text-muted-foreground">{plan.description}</p>
                </div>
              </div>

              <div>
                {plan.price === 0 ? (
                  <div className="text-3xl font-black">FREE</div>
                ) : (
                  <div className="flex items-end gap-1">
                    <span className="text-3xl font-black">₹{finalPrice.toLocaleString("en-IN")}</span>
                    <span className="text-muted-foreground text-sm pb-1">/{plan.period}</span>
                  </div>
                )}
                {billing === "yearly" && plan.price > 0 && (
                  <p className="text-[11px] text-muted-foreground line-through mt-0.5">₹{plan.price.toLocaleString("en-IN")}/month</p>
                )}
              </div>

              <ul className="space-y-2 flex-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px]">
                    <Check className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                    <span className="text-foreground/80">{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                className={cn("w-full font-bold", isCurrent ? "bg-success/20 text-success border border-success/30" : plan.ctaClass)}
                disabled={isCurrent || paying === plan.id || plan.id === "free"}
                onClick={() => handleUpgrade(plan)}
              >
                {paying === plan.id ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing...</>
                ) : isCurrent ? "✓ Active" : plan.cta}
              </Button>
            </div>
          );
        })}
      </div>

      {/* All plans include */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-bold text-sm mb-4">🔒 All Plans Include</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {["GST Compliant Invoices", "Secure Data Storage", "Mobile App Access", "Email Support", "Auto Backup", "Data Export", "OTP Login", "Regular Updates"].map(f => (
            <div key={f} className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <Check className="w-3.5 h-3.5 text-success shrink-0" />{f}
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="space-y-3">
        <h3 className="font-bold text-sm">❓ Frequently Asked Questions</h3>
        {FAQS.map((faq, i) => (
          <div key={i} className="bg-card border border-border rounded-xl overflow-hidden">
            <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
              className="w-full flex items-center justify-between p-4 text-left text-sm font-semibold hover:bg-secondary/50 transition-colors">
              {faq.q}
              <span className="text-primary font-black text-lg ml-4">{openFaq === i ? "−" : "+"}</span>
            </button>
            {openFaq === i && <div className="px-4 pb-4 text-[13px] text-muted-foreground">{faq.a}</div>}
          </div>
        ))}
      </div>

      <div className="bg-primary/10 border border-primary/20 rounded-2xl p-6 text-center">
        <p className="font-black text-lg mb-1">Still not sure? <span className="gold-text">Try Free for 14 Days</span></p>
        <p className="text-muted-foreground text-sm mb-4">No credit card required. Full access to all Professional features.</p>
        <p className="text-[12px] text-muted-foreground">Payments powered by <span className="font-bold text-primary">Razorpay</span> — India's most trusted payment gateway</p>
      </div>
    </div>
  );
}