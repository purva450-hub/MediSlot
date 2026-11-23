import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";
import { ErrorState, FieldError, Spinner } from "../../components/ui";
import { api, errMsg } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { Doctor, Specialty } from "../../lib/types";

const schema = z.object({
  full_name: z.string().min(2, "Enter your name"), phone: z.string().regex(/^\+?[0-9]{10,15}$/, "Enter 10–15 digits"), specialty_id: z.number().int().positive("Choose a specialty"),
  qualification: z.string().min(2, "Required"), experience_years: z.number({ invalid_type_error: "Enter a number" }).int().min(0).max(70),
  consultation_fee: z.number({ invalid_type_error: "Enter a number" }).min(0).max(100000), clinic_name: z.string().min(2, "Required"), location: z.string().min(2, "Required"),
  address: z.string().max(255), about: z.string().max(3000),
});
type V = z.infer<typeof schema>;

export default function DoctorProfileEdit() {
  const { user, setUser } = useAuth(); const [doc, setDoc] = useState<Doctor | null>(null); const [specs, setSpecs] = useState<Specialty[]>([]); const [error, setError] = useState("");
  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm<V>({ resolver: zodResolver(schema) });
  useEffect(() => {
    Promise.all([api.get(`/doctors/${user?.doctor_id}`), api.get("/specialties")]).then(([d, s]) => {
      const x: Doctor = d.data.doctor; setDoc(x); setSpecs(s.data.items);
      reset({ full_name: x.full_name, phone: user?.phone ?? "", specialty_id: x.specialty.id, qualification: x.qualification, experience_years: x.experience_years,
        consultation_fee: x.consultation_fee, clinic_name: x.clinic_name, location: x.location, address: x.address ?? "", about: x.about ?? "" });
    }).catch((e) => setError(errMsg(e)));
  }, [user?.doctor_id, user?.phone, reset]);
  const save = handleSubmit(async (v) => {
    try { await api.put(`/doctors/${user?.doctor_id}`, v); if (user) setUser({ ...user, full_name: v.full_name, phone: v.phone }); reset(v); toast.success("Profile saved"); } catch (e) { toast.error(errMsg(e)); }
  });
  if (error) return <ErrorState message={error} />;
  if (!doc) return <Spinner />;
  const t = (id: keyof V, label: string, extra: object = {}, type = "text") => (<div><label className="label" htmlFor={id}>{label}</label><input id={id} type={type} className="input" {...register(id, extra)} /><FieldError msg={errors[id]?.message} /></div>);
  return (
    <div className="max-w-2xl"><h1 className="text-3xl font-bold">My profile</h1><p className="mt-1 text-muted">This is what patients see on your public page.</p>
      <form onSubmit={save} noValidate className="card mt-6 grid gap-4 p-6 sm:grid-cols-2">
        {t("full_name", "Full name")}{t("phone", "Phone number", {}, "tel")}
        <div><label className="label" htmlFor="specialty_id">Specialty</label><select id="specialty_id" className="input" {...register("specialty_id", { valueAsNumber: true })}>{specs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        {t("qualification", "Qualifications")}{t("experience_years", "Years of experience", { valueAsNumber: true }, "number")}{t("consultation_fee", "Consultation fee (₹)", { valueAsNumber: true }, "number")}
        {t("clinic_name", "Clinic name")}{t("location", "City / area")}
        <div className="sm:col-span-2">{t("address", "Clinic address")}</div>
        <div className="sm:col-span-2"><label className="label" htmlFor="about">About you</label><textarea id="about" rows={5} className="input" {...register("about")} /><FieldError msg={errors.about?.message} /></div>
        <div className="sm:col-span-2"><button className="btn-primary" disabled={isSubmitting || !isDirty}>{isSubmitting ? "Saving…" : "Save changes"}</button></div></form></div>
  );
}
