import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DoctorCard } from "../components/DoctorCard";
import { EmptyState, ErrorState } from "../components/ui";
import { api, errMsg } from "../lib/api";
import { Doctor, Page, Specialty } from "../lib/types";

const FIELDS = ["q", "specialty", "location", "min_fee", "max_fee", "min_experience", "min_rating", "date", "sort"] as const;

export default function FindDoctors() {
  const [params, setParams] = useSearchParams();
  const [specs, setSpecs] = useState<Specialty[]>([]);
  const [data, setData] = useState<Page<Doctor> | null>(null);
  const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  const page = Number(params.get("page") || 1);

  const load = useCallback(() => {
    setLoading(true); setError("");
    api.get<Page<Doctor>>("/doctors", { params: Object.fromEntries(params) })
      .then((r) => setData(r.data)).catch((e) => setError(errMsg(e))).finally(() => setLoading(false));
  }, [params]);
  useEffect(load, [load]);
  useEffect(() => { api.get("/specialties").then((r) => setSpecs(r.data.items)).catch(() => undefined); }, []);

  const apply = (form: HTMLFormElement) => {
    const fd = new FormData(form); const next = new URLSearchParams();
    FIELDS.forEach((f) => { const v = String(fd.get(f) ?? "").trim(); if (v) next.set(f, v); });
    setParams(next);  // filters live in the URL so results can be shared / bookmarked
  };
  const goPage = (p: number) => { const n = new URLSearchParams(params); n.set("page", String(p)); setParams(n); window.scrollTo({ top: 0 }); };
  const g = (k: string) => params.get(k) ?? "";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">Find doctors</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[17rem_1fr]">
        <form key={params.toString()} onSubmit={(e) => { e.preventDefault(); apply(e.currentTarget); }} className="card h-fit space-y-3 p-4">
          <div><label className="label" htmlFor="q">Name or clinic</label><input id="q" name="q" className="input" defaultValue={g("q")} /></div>
          <div><label className="label" htmlFor="specialty">Specialty</label>
            <select id="specialty" name="specialty" className="input" defaultValue={g("specialty")}><option value="">All</option>
              {specs.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}</select></div>
          <div><label className="label" htmlFor="location">Location</label><input id="location" name="location" className="input" defaultValue={g("location")} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="label" htmlFor="min_fee">Min fee ₹</label><input id="min_fee" name="min_fee" type="number" min="0" className="input" defaultValue={g("min_fee")} /></div>
            <div><label className="label" htmlFor="max_fee">Max fee ₹</label><input id="max_fee" name="max_fee" type="number" min="0" className="input" defaultValue={g("max_fee")} /></div>
            <div><label className="label" htmlFor="min_experience">Min years</label><input id="min_experience" name="min_experience" type="number" min="0" className="input" defaultValue={g("min_experience")} /></div>
            <div><label className="label" htmlFor="min_rating">Min rating</label>
              <select id="min_rating" name="min_rating" className="input" defaultValue={g("min_rating")}><option value="">Any</option><option value="4.5">4.5+</option><option value="4">4.0+</option><option value="3.5">3.5+</option></select></div>
          </div>
          <div><label className="label" htmlFor="date">Available on</label><input id="date" name="date" type="date" min={new Date().toISOString().slice(0, 10)} className="input" defaultValue={g("date")} /></div>
          <div><label className="label" htmlFor="sort">Sort by</label>
            <select id="sort" name="sort" className="input" defaultValue={g("sort") || "rating"}><option value="rating">Rating</option><option value="fee_asc">Fee: low to high</option>
              <option value="fee_desc">Fee: high to low</option><option value="experience">Experience</option></select></div>
          <button className="btn-primary w-full">Apply filters</button>
          <button type="button" className="btn-ghost w-full" onClick={() => setParams({})}>Clear all</button>
        </form>

        <section aria-live="polite">
          {error ? <ErrorState message={error} onRetry={load} /> :
           loading && !data ? <div className="grid gap-4 md:grid-cols-2">{[1, 2, 3, 4].map((i) => <div key={i} className="card h-64 animate-pulse bg-slate-100" />)}</div> :
           data && data.items.length === 0 ? <EmptyState title="No doctors found" hint="Try adjusting your search filters." /> :
           data && (<>
            <p className="mb-3 text-sm text-muted">{data.total} doctor{data.total === 1 ? "" : "s"} found</p>
            <div className={`grid gap-4 md:grid-cols-2 ${loading ? "opacity-60" : ""}`}>{data.items.map((d) => <DoctorCard key={d.id} d={d} />)}</div>
            {data.pages > 1 && (
              <nav className="mt-6 flex items-center justify-between" aria-label="Pagination">
                <button className="btn-ghost" disabled={page <= 1} onClick={() => goPage(page - 1)}>Previous</button>
                <span className="text-sm text-muted">Page {data.page} of {data.pages}</span>
                <button className="btn-ghost" disabled={page >= data.pages} onClick={() => goPage(page + 1)}>Next</button></nav>)}
           </>)}
        </section>
      </div>
    </div>
  );
}
