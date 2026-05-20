import { base44 } from "@/api/base44Client";

export const PLAN_LIMITS = {
  free: { invoices: 25, products: 50, ai: false, reports: false, branding: false, multi_user: false },
  starter: { invoices: 500, products: Infinity, ai: false, reports: true, branding: false, multi_user: false },
  professional: { invoices: Infinity, products: Infinity, ai: true, reports: true, branding: true, multi_user: true },
  enterprise: { invoices: Infinity, products: Infinity, ai: true, reports: true, branding: true, multi_user: true },
};

export const PLAN_NAMES = { free: "Free Trial", starter: "Starter", professional: "Professional", enterprise: "Enterprise" };

export async function getUserSubscription() {
  try {
    const user = await base44.auth.me();
    const subs = await base44.entities.UserSubscription.filter({ user_email: user.email });
    if (subs.length === 0) {
      // Auto-create free trial
      const today = new Date().toISOString().slice(0, 10);
      const trialEnd = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
      const sub = await base44.entities.UserSubscription.create({
        user_email: user.email, plan: "free", status: "trial",
        trial_start: today, trial_end: trialEnd,
      });
      return sub;
    }
    return subs[0];
  } catch {
    return { plan: "free", status: "trial" };
  }
}

export function isFeatureLocked(subscription, feature) {
  if (!subscription) return false;
  const plan = subscription.plan || "free";
  const status = subscription.status;
  if (status === "expired" || status === "cancelled") {
    // Expired → lock everything except basic
    return !["invoices_basic"].includes(feature);
  }
  return !PLAN_LIMITS[plan]?.[feature];
}

export function daysLeft(subscription) {
  if (!subscription?.trial_end) return null;
  const diff = new Date(subscription.trial_end) - new Date();
  return Math.max(0, Math.floor(diff / 86400000));
}