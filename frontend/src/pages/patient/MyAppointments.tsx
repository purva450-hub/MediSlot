import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApptRow } from "../../components/ApptRow";
import { EmptyState, ErrorState, Spinner } from "../../components/ui";
import { api, errMsg } from "../../lib/api";
import { Appointment, Page } from "../../lib/types";

const TABS: [string, string, Record<string, string>][] = [["all", "All", {}], ["upcoming", "Upcoming", { scope: "upcoming" }], ["completed", "Completed", { status: "completed" }], ["cancelled", "Cancelled", { status: "cancelled" }]];

export default function MyAppointments() {
  const [tab, setTab] = useState("all"); const [page, setPage] = useState(1);
  const [data, setData] = useState<Page<Appointment> | null>(null); const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    setLoading(true); setError("");
    api.get("/appointments", { params: { ...TABS.find((t) => t[0] === tab)![2], page, per_page: 8 } }).then((r) => setData(r.data)).catch((e) => setError(errMsg(e))).finally(() => setLoading(false));
  }, [tab, page]);
  useEffect(load, [load]);
  return (
    <div>
      <h1 className="text-3xl font-bold">My appointments</h1>
      <div role="tablist" className="mt-5 flex gap-2 overflow-x-auto">{TABS.map(([k, label]) => (
        <button key={k} role="tab" aria-selected={tab === k} onClick={() => { setTab(k); setPage(1); }} className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === k ? "bg-primary text-white" : "border border-line bg-white text-muted"}`}>{label}</button>))}</div>
      <div className="mt-4" aria-live="polite">
        {error ? <ErrorState message={error} onRetry={load} /> : loading && !data ? <Spinner /> : data && data.items.length === 0 ?
          <EmptyState title="You don't have any appointments yet." hint={tab === "all" ? "Book your first visit in under a minute." : "Nothing matches this tab."} action={<Link to="/doctors" className="btn-primary">Find a doctor</Link>} /> :
          data && (<div className={`card p-2 ${loading ? "opacity-60" : ""}`}>{data.items.map((a) => <ApptRow key={a.id} a={a} />)}</div>)}
      </div>
      {data && data.pages > 1 && <nav className="mt-4 flex items-center justify-between" aria-label="Pagination"><button className="btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
        <span className="text-sm text-muted">Page {data.page} of {data.pages}</span><button className="btn-ghost" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button></nav>}
    </div>
  );
}
