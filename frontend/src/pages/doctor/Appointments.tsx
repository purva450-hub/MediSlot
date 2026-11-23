import { useCallback, useEffect, useState } from "react";
import { ApptRow } from "../../components/ApptRow";
import { EmptyState, ErrorState, Spinner } from "../../components/ui";
import { WeekBoard } from "../../components/WeekBoard";
import { api, errMsg } from "../../lib/api";
import { todayStr } from "../../lib/format";
import { Appointment, Page } from "../../lib/types";

const TABS: [string, string, Record<string, string>][] = [["week", "Week calendar", {}], ["today", "Today", { from: todayStr(), to: todayStr() }],
  ["upcoming", "Upcoming", { scope: "upcoming" }], ["pending", "Pending requests", { status: "pending" }], ["completed", "Completed", { status: "completed" }]];

export default function DoctorAppointments() {
  const [tab, setTab] = useState("week"); const [page, setPage] = useState(1);
  const [data, setData] = useState<Page<Appointment> | null>(null); const [error, setError] = useState("");
  const load = useCallback(() => {
    if (tab === "week") return;
    setError(""); setData(null);
    api.get("/appointments", { params: { ...TABS.find((t) => t[0] === tab)![2], page, per_page: 10 } }).then((r) => setData(r.data)).catch((e) => setError(errMsg(e)));
  }, [tab, page]);
  useEffect(load, [load]);
  return (
    <div>
      <h1 className="text-3xl font-bold">My appointments</h1>
      <div role="tablist" className="mt-5 flex gap-2 overflow-x-auto pb-1">{TABS.map(([k, l]) => (
        <button key={k} role="tab" aria-selected={tab === k} onClick={() => { setTab(k); setPage(1); }} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${tab === k ? "bg-primary text-white" : "border border-line bg-white text-muted"}`}>{l}</button>))}</div>
      <div className="mt-4">
        {tab === "week" ? <WeekBoard /> : error ? <ErrorState message={error} onRetry={load} /> : !data ? <Spinner /> :
          data.items.length === 0 ? <EmptyState title="Nothing here" hint="Appointments matching this view will appear here." /> :
          <><div className="card p-2">{data.items.map((a) => <ApptRow key={a.id} a={a} />)}</div>
            {data.pages > 1 && <nav className="mt-4 flex items-center justify-between"><button className="btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
              <span className="text-sm text-muted">Page {data.page} of {data.pages}</span><button className="btn-ghost" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button></nav>}</>}
      </div>
      <p className="mt-4 text-sm text-muted">Open an appointment to confirm, reject or complete it.</p>
    </div>
  );
}
