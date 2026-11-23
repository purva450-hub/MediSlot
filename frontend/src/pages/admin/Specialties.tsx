import { Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { ErrorState, Spinner } from "../../components/ui";
import { api, errMsg } from "../../lib/api";
import { Specialty } from "../../lib/types";

export default function AdminSpecialties() {
  const [items, setItems] = useState<Specialty[] | null>(null); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const [name, setName] = useState(""); const [desc, setDesc] = useState(""); const [edit, setEdit] = useState<Specialty | null>(null); const [del, setDel] = useState<Specialty | null>(null);
  const load = useCallback(() => { setError(""); api.get("/admin/specialties").then((r) => setItems(r.data.items)).catch((e) => setError(errMsg(e))); }, []);
  useEffect(load, [load]);
  const run = async (fn: () => Promise<unknown>, ok: string) => { setBusy(true); try { await fn(); toast.success(ok); setEdit(null); setName(""); setDesc(""); load(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); setDel(null); } };
  const submit = (e: React.FormEvent) => { e.preventDefault(); const body = { name: name.trim(), description: desc.trim() || null };
    edit ? run(() => api.put(`/admin/specialties/${edit.id}`, body), "Specialty updated") : run(() => api.post("/admin/specialties", body), "Specialty added"); };
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!items) return <Spinner />;
  return (
    <div className="max-w-3xl"><h1 className="text-3xl font-bold">Specialties</h1>
      <form onSubmit={submit} className="card mt-5 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-40 flex-1"><label className="label" htmlFor="sn">{edit ? `Editing ${edit.name}` : "New specialty"}</label><input id="sn" required minLength={2} maxLength={80} className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="min-w-40 flex-1"><label className="label" htmlFor="sd">Description</label><input id="sd" maxLength={255} className="input" value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
        <button className="btn-primary" disabled={busy}>{edit ? "Save" : "Add"}</button>{edit && <button type="button" className="btn-ghost" onClick={() => { setEdit(null); setName(""); setDesc(""); }}>Cancel</button>}</form>
      <ul className="card mt-4 divide-y divide-line">{items.map((s) => (
        <li key={s.id} className="flex items-center gap-3 p-4"><div className="min-w-0 flex-1"><p className="font-semibold">{s.name}</p><p className="truncate text-sm text-muted">{s.description || "No description"}</p></div>
          <Link to={`/admin/doctors?specialty_id=${s.id}`} className="text-sm text-primary">{s.doctor_count} doctor{s.doctor_count === 1 ? "" : "s"}</Link>
          <button aria-label={`Edit ${s.name}`} className="rounded-lg p-2 hover:bg-primary-soft" onClick={() => { setEdit(s); setName(s.name); setDesc(s.description ?? ""); }}><Pencil size={16} /></button>
          <button aria-label={`Delete ${s.name}`} className="rounded-lg p-2 text-red-600 hover:bg-red-50" onClick={() => setDel(s)}><Trash2 size={16} /></button></li>))}</ul>
      <ConfirmDialog open={!!del} danger busy={busy} title="Delete this specialty?" message={del?.doctor_count ? `${del.name} has ${del.doctor_count} doctor(s) assigned, so it can't be deleted.` : `"${del?.name}" will be removed.`} confirmLabel="Delete" onCancel={() => setDel(null)} onConfirm={() => del && run(() => api.delete(`/admin/specialties/${del.id}`), "Specialty deleted")} />
    </div>
  );
}
