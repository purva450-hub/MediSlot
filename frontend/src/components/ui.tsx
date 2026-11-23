import { AlertCircle, Loader2, SearchX } from "lucide-react";
import { ReactNode } from "react";

export const Spinner = ({ label = "Loading" }: { label?: string }) => (
  <div role="status" className="flex items-center justify-center gap-2 py-16 text-muted"><Loader2 className="animate-spin" size={20} />{label}…</div>
);
export const EmptyState = ({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) => (
  <div className="card flex flex-col items-center px-6 py-14 text-center"><SearchX className="text-slate-400" size={32} />
    <p className="mt-3 font-display text-lg font-semibold">{title}</p>{hint && <p className="mt-1 text-sm text-muted">{hint}</p>}{action && <div className="mt-4">{action}</div>}</div>
);
export const ErrorState = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div role="alert" className="card flex flex-col items-center border-red-200 px-6 py-12 text-center"><AlertCircle className="text-red-500" size={32} />
    <p className="mt-3 font-semibold">{message}</p>{onRetry && <button className="btn-ghost mt-4" onClick={onRetry}>Try again</button>}</div>
);
export const FieldError = ({ msg }: { msg?: string }) => (msg ? <p role="alert" className="mt-1 text-xs text-red-600">{msg}</p> : null);
