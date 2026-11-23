import { BellOff } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { EmptyState, ErrorState, Spinner } from "../../components/ui";
import { api, errMsg } from "../../lib/api";
import { ago } from "../../lib/format";
import { Page } from "../../lib/types";

interface N { id: number; type: string; title: string; message: string; appointment_id: number | null; is_read: boolean; created_at: string }
const changed = () => window.dispatchEvent(new Event("notifications:changed"));

export default function Notifications() {
  const nav = useNavigate(); const [page, setPage] = useState(1);
  const [data, setData] = useState<(Page<N> & { unread_count: number }) | null>(null); const [error, setError] = useState("");
  const load = useCallback(() => { setError(""); api.get("/notifications", { params: { page, per_page: 15 } }).then((r) => setData(r.data)).catch((e) => setError(errMsg(e))); }, [page]);
  useEffect(load, [load]);
  const open = async (n: N) => {
    try { if (!n.is_read) { await api.post(`/notifications/${n.id}/read`); changed(); } } catch { /* navigation still works */ }
    if (n.appointment_id) nav(`/appointments/${n.appointment_id}`); else load();
  };
  const readAll = async () => { try { await api.post("/notifications/read-all"); toast.success("All notifications marked as read"); changed(); load(); } catch (e) { toast.error(errMsg(e)); } };
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <Spinner />;
  return (
    <div>
      <div className="flex items-center justify-between"><h1 className="text-3xl font-bold">Notifications</h1>
        <button className="btn-ghost" disabled={data.unread_count === 0} onClick={readAll}>Mark all as read</button></div>
      <p className="mt-1 text-sm text-muted">{data.unread_count} unread. In-app only; email notifications aren't enabled.</p>
      <div className="mt-4">{data.items.length === 0 ? <EmptyState title="No notifications yet" hint="Booking updates will show up here." /> :
        <ul className="card divide-y divide-line">{data.items.map((n) => (
          <li key={n.id}><button onClick={() => open(n)} className="flex w-full gap-3 px-5 py-4 text-left hover:bg-primary-soft/40">
            <span aria-hidden className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${n.is_read ? "bg-transparent" : "bg-primary"}`} />
            <span className="min-w-0 flex-1"><span className={`block ${n.is_read ? "font-medium" : "font-bold"}`}>{n.title}</span><span className="block text-sm text-muted">{n.message}</span></span>
            <span className="shrink-0 text-xs text-slate-400">{ago(n.created_at)}</span></button></li>))}</ul>}</div>
      {data.pages > 1 && <nav className="mt-4 flex items-center justify-between"><button className="btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
        <span className="text-sm text-muted">Page {data.page} of {data.pages}</span><button className="btn-ghost" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button></nav>}
      {data.items.length === 0 && <BellOff className="mx-auto mt-6 text-slate-300" />}
    </div>
  );
}
