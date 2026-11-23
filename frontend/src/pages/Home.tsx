import { CalendarCheck, ChevronDown, ClipboardCheck, Search, Stethoscope, UserSearch } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { fmtDay, initials } from "../components/DoctorCard";
import { api } from "../lib/api";
import { Doctor, Specialty } from "../lib/types";

const SPEC_NOTES: Record<string, string> = { Cardiology: "Heart and blood pressure", Dermatology: "Skin, hair and nails", Neurology: "Headaches, nerves, sleep",
  Pediatrics: "Care for children", Orthopedics: "Bones, joints, sports injuries", Dentistry: "Teeth and gums", "General Medicine": "Everyday illness and check-ups", Gynecology: "Women's health" };
const FAQ = [["Is MediSlot free to use?", "Creating an account and browsing doctors costs nothing. You only pay the consultation fee shown on each doctor's card."],
  ["Can I change or cancel a booking?", "Yes. You can reschedule or cancel from My Appointments, up to the cut-off time the clinic sets (2 hours by default)."],
  ["Will I be double booked?", "No. Each doctor slot can hold only one active appointment, and the server checks this at the moment you confirm."],
  ["Is the data on this site real?", "No. This is a student project; every doctor, clinic and figure is fictional demo data."]];

export default function Home() {
  const nav = useNavigate(); const { hash } = useLocation();
  const [specs, setSpecs] = useState<Specialty[]>([]); const [board, setBoard] = useState<Doctor[] | null>(null);
  const [q, setQ] = useState(""); const [spec, setSpec] = useState(""); const [loc, setLoc] = useState("");
  useEffect(() => {
    api.get("/specialties").then((r) => setSpecs(r.data.items)).catch(() => setSpecs([]));
    api.get("/doctors", { params: { per_page: 4, sort: "rating" } }).then((r) => setBoard(r.data.items)).catch(() => setBoard([]));
  }, []);
  useEffect(() => { if (hash) document.getElementById(hash.slice(1))?.scrollIntoView(); }, [hash]);
  const search = (e: FormEvent) => { e.preventDefault(); nav(`/doctors?${new URLSearchParams(Object.entries({ q, specialty: spec, location: loc }).filter(([, v]) => v))}`); };

  return (<>
    <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-8 pt-12 lg:grid-cols-[1.1fr_.9fr] lg:pt-20">
      <div>
        <h1 className="text-4xl font-extrabold leading-[1.05] sm:text-6xl">Your health, your time. Book smarter.</h1>
        <p className="mt-5 max-w-lg text-lg text-muted">Find trusted doctors, explore available appointments, and get the care you need without the wait.</p>
        <form onSubmit={search} className="card mt-8 grid gap-3 p-3 sm:grid-cols-2" role="search">
          <input className="input" aria-label="Doctor name" placeholder="Doctor or clinic name" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="input" aria-label="Specialty" value={spec} onChange={(e) => setSpec(e.target.value)}>
            <option value="">All specialties</option>{specs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          <input className="input" aria-label="Location" placeholder="City or area" value={loc} onChange={(e) => setLoc(e.target.value)} />
          <button className="btn-primary"><Search size={16} />Search doctors</button>
        </form>
        <p className="mt-4 text-sm text-muted">Demo project figures: 500+ doctors, 20+ specialties, 10,000+ appointments, 50+ partner clinics (illustrative, not real).</p>
      </div>
      <aside aria-label="Open slots now" className="card self-start p-5">
        <h2 className="font-display text-lg font-bold">Open slots right now</h2>
        <p className="text-sm text-muted">Live from the booking system</p>
        <div className="mt-4 divide-y divide-line">
          {board === null && <p className="py-8 text-center text-sm text-muted">Loading…</p>}
          {board?.length === 0 && <p className="py-8 text-center text-sm text-muted">Doctors will appear here once the backend is running.</p>}
          {board?.map((d) => (
            <Link key={d.id} to={`/doctors/${d.id}`} className="flex items-center gap-3 py-3 hover:bg-primary-soft/50">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-sm font-bold text-primary">{initials(d.full_name)}</div>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">Dr. {d.full_name}</p><p className="truncate text-xs text-muted">{d.specialty.name} · {d.location}</p></div>
              <div className="text-right">
                {d.next_available ? (<><p className="text-xs text-muted">{fmtDay(d.next_available.date)}</p>
                  <p className="text-sm font-bold text-secondary-ink">{d.next_available.slots[0]}</p></>) : <p className="text-xs text-muted">Fully booked</p>}
              </div>
            </Link>))}
        </div>
      </aside>
    </section>

    <section className="mx-auto mt-16 max-w-6xl px-4">
      <h2 className="text-3xl font-bold">Browse by specialty</h2>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(specs.length ? specs : Object.keys(SPEC_NOTES).map((name, id) => ({ id: -id - 1, name }))).map((s) => (
          <Link key={s.id} to={`/doctors?specialty=${encodeURIComponent(s.name)}`} className="card p-4 transition-colors hover:border-primary">
            <Stethoscope className="text-primary" size={20} /><p className="mt-3 font-semibold">{s.name}</p><p className="text-sm text-muted">{SPEC_NOTES[s.name] ?? ""}</p></Link>))}
      </div>
    </section>

    <section id="how-it-works" className="mx-auto mt-20 max-w-6xl px-4">
      <h2 className="text-3xl font-bold">How it works</h2>
      <ol className="mt-6 grid gap-4 md:grid-cols-4">
        {[[UserSearch, "Find your doctor", "Search by name, specialty, location, fee or rating."], [CalendarCheck, "Choose a time slot", "Pick a date and see only the slots that are actually free."],
          [ClipboardCheck, "Confirm your appointment", "Add your symptoms, review the summary and confirm."], [Stethoscope, "Visit your doctor", "Get reminders and reschedule if plans change."]].map(([Icon, t, d], i) => {
          const I = Icon as typeof Search; return (
          <li key={i} className="card p-5"><div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-sm font-bold text-white">{i + 1}</span><I size={20} className="text-secondary" /></div>
            <h3 className="mt-3 font-bold">{t as string}</h3><p className="mt-1 text-sm text-muted">{d as string}</p></li>); })}
      </ol>
    </section>

    <section className="mx-auto mt-20 grid max-w-6xl gap-4 px-4 md:grid-cols-2">
      <div className="card p-6"><h2 className="text-2xl font-bold">For patients</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-muted"><li>No phone calls or waiting-room queues</li><li>Real availability, never a double booking</li><li>Reschedule or cancel in a few taps</li><li>All your appointments and reminders in one place</li></ul></div>
      <div className="card p-6"><h2 className="text-2xl font-bold">For doctors</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-muted"><li>Set working days, breaks and days off yourself</li><li>Confirm or decline requests from one list</li><li>Schedule changes are checked against booked patients</li><li>Fewer no-shows with automatic reminders</li></ul></div>
    </section>

    <section className="mx-auto mt-20 max-w-6xl px-4">
      <h2 className="text-3xl font-bold">What people say</h2><p className="text-sm text-muted">Demo testimonials: fictional people and quotes, shown only to illustrate the design.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">{[["Booked in under a minute and got the 9:30 slot I wanted.", "Sample patient A"], ["My schedule finally lives in one place, and clashes are caught for me.", "Sample doctor B"],
        ["Rescheduling took two taps instead of a phone call.", "Sample patient C"]].map(([q, n]) => (<figure key={n} className="card p-5"><blockquote className="text-ink">“{q}”</blockquote><figcaption className="mt-3 text-sm text-muted">{n} (demo)</figcaption></figure>))}</div>
    </section>

    <section className="mx-auto mt-20 max-w-3xl px-4">
      <h2 className="text-3xl font-bold">Questions</h2>
      <div className="mt-6 space-y-3">{FAQ.map(([q, a]) => (
        <details key={q} className="card group p-4"><summary className="flex cursor-pointer list-none items-center justify-between font-semibold">{q}<ChevronDown size={18} className="transition-transform group-open:rotate-180" /></summary><p className="mt-2 text-muted">{a}</p></details>))}</div>
    </section>

    <section className="mx-auto mt-20 max-w-6xl px-4">
      <div className="rounded-3xl bg-primary px-6 py-14 text-center text-white"><h2 className="text-3xl font-bold sm:text-4xl">Ready to see a doctor?</h2>
        <p className="mx-auto mt-3 max-w-md text-blue-100">Pick a doctor and a time. It takes about a minute.</p>
        <Link to="/doctors" className="btn mt-6 bg-white text-primary hover:bg-primary-soft">Book appointment</Link></div>
    </section>
  </>);
}
