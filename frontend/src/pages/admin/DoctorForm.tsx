import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { ErrorState, FieldError, Spinner } from "../../components/ui";
import { api, errMsg } from "../../lib/api";
import { Specialty } from "../../lib/types";
import { AdminDoctor } from "./Doctors";

const makeSchema = (add: boolean) => z.object({
  full_name: z.string().min(2, "Enter the name"), phone: z.string().regex(/^\+?[0-9]{10,15}$/, "Enter 10–15 digits"), email: z.string(), password: z.string(),
  specialty_id: z.number({ invalid_type_error: "Choose a specialty" }).int().positive("Choose a specialty"), qualification: z.string().min(2, "Required"),
  experience_years: z.number({ invalid_type_error: "Enter a number" }).int().min(0).max(70), consultation_fee: z.number({ invalid_type_error: "Enter a number" }).min(0).max(100000),
  clinic_name: z.string().min(2, "Required"), location: z.string().min(2, "Required"), address: z.string().max(255), about: z.string().max(3000),
}).superRefine((v, ctx) => {
  if (!add) return;
  if (!z.string().email().safeParse(v.email).success) ctx.addIssue({ code: "custom", path: ["email"], message: "Enter a valid email" });
  if (v.password.length < 8 || !/[A-Za-z]/.test(v.password) || !/[0-9]/.test(v.password)) ctx.addIssue({ code: "custom", path: ["password"], message: "8+ characters with a letter and a number" });
});
type V = z.infer<ReturnType<typeof makeSchema>>;

export default function DoctorForm() {
  const { id } = useParams(); const add = !id; const nav = useNavigate();
  const schema = useMemo(() => makeSchema(add), [add]);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<V>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "", address: "", about: "" } });
  const [specs, setSpecs] = useState<Specialty[]>([]); const [ready, setReady] = useState(add); const [error, setError] = useState("");
  useEffect(() => {
    api.get("/specialties").then((r) => setSpecs(r.data.items)).catch((e) => setError(errMsg(e)));
    if (!add) api.get(`/admin/doctors/${id}`).then((r) => { const d: AdminDoctor = r.data.doctor;
      reset({ full_name: d.full_name, phone: d.phone ?? "", email: d.email, password: "", specialty_id: d.specialty.id, qualification: d.qualification, experience_years: d.experience_years,
        consultation_fee: d.consultation_fee, clinic_name: d.clinic_name, location: d.location, address: d.address ?? "", about: d.about ?? "" }); setReady(true); }).catch((e) => setError(errMsg(e)));
  }, [id, add, reset]);
  const save = handleSubmit(async (v) => {
    try {
      if (add) await api.post("/doctors", v); else { const { email, password, ...rest } = v; void email; void password; await api.put(`/doctors/${id}`, rest); }
      toast.success(add ? "Doctor added" : "Doctor updated"); nav("/admin/doctors");
    } catch (e) { toast.error(errMsg(e)); }
  });
  if (error) return <ErrorState message={error} />;
  if (!ready) return <Spinner />;
  const t = (k: keyof V, label: string, extra: object = {}, type = "text", ro = false) => (<div><label className="label" htmlFor={k}>{label}</label>
    <input id={k} type={type} readOnly={ro} className={`input ${ro ? "bg-canvas" : ""}`} {...register(k, extra)} /><FieldError msg={errors[k]?.message} /></div>);
  return (
    <div className="max-w-2xl"><Link to="/admin/doctors" className="text-sm text-primary">← Doctors</Link><h1 className="mt-2 text-3xl font-bold">{add ? "Add doctor" : "Edit doctor"}</h1>
      <form onSubmit={save} noValidate className="card mt-6 grid gap-4 p-6 sm:grid-cols-2">
        {t("full_name", "Full name")}{t("phone", "Phone", {}, "tel")}{t("email", "Email", {}, "email", !add)}{add && t("password", "Initial password", {}, "password")}
        <div><label className="label" htmlFor="specialty_id">Specialty</label><select id="specialty_id" className="input" {...register("specialty_id", { valueAsNumber: true })}><option value="">Choose…</option>{specs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select><FieldError msg={errors.specialty_id?.message} /></div>
        {t("qualification", "Qualifications")}{t("experience_years", "Years of experience", { valueAsNumber: true }, "number")}{t("consultation_fee", "Consultation fee (₹)", { valueAsNumber: true }, "number")}
        {t("clinic_name", "Clinic name")}{t("location", "City / area")}<div className="sm:col-span-2">{t("address", "Clinic address")}</div>
        <div className="sm:col-span-2"><label className="label" htmlFor="about">About</label><textarea id="about" rows={4} className="input" {...register("about")} /></div>
        <div className="flex gap-2 sm:col-span-2"><button className="btn-primary" disabled={isSubmitting}>{isSubmitting ? "Saving…" : add ? "Add doctor" : "Save changes"}</button><Link to="/admin/doctors" className="btn-ghost">Cancel</Link></div></form></div>
  );
}
