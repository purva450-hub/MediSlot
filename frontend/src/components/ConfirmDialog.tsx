import { useEffect } from "react";

interface Props { open: boolean; title: string; message: string; confirmLabel: string; danger?: boolean; busy?: boolean; onConfirm: () => void; onCancel: () => void }

export function ConfirmDialog({ open, title, message, confirmLabel, danger, busy, onConfirm, onCancel }: Props) {
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onCancel]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4" onClick={onCancel}>
      <div role="dialog" aria-modal="true" aria-labelledby="dlg-title" className="card w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h2 id="dlg-title" className="text-xl font-bold">{title}</h2>
        <p className="mt-2 text-sm text-muted">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn-ghost" onClick={onCancel} disabled={busy}>Keep it</button>
          <button className={`btn text-white ${danger ? "bg-red-600 hover:bg-red-700" : "bg-primary hover:bg-primary-dark"}`} onClick={onConfirm} disabled={busy}>{busy ? "Working…" : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
