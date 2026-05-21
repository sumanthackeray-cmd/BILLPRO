import { AlertTriangle, Info, CheckCircle2, XCircle } from "lucide-react";

export default function AlertBanner({ type = "warning", title, children }) {
  const styles = {
    warning: "bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/30 text-yellow-700 dark:text-yellow-400",
    error: "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400",
    success: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400",
    info: "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-400"
  };

  const Icon = {
    warning: AlertTriangle,
    error: XCircle,
    success: CheckCircle2,
    info: Info
  }[type];

  return (
    <div className={`border rounded-xl px-4 py-3 flex flex-col gap-1 ${styles[type]}`}>
      {title && (
        <span className="font-bold text-[13px] flex items-center gap-2">
          <Icon className="w-4 h-4" />
          {title}
        </span>
      )}
      <div className="text-[12px] font-semibold">
        {children}
      </div>
    </div>
  );
}
