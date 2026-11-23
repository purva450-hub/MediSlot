import { CalendarCheck, ClipboardCheck, Stethoscope, UserSearch } from "lucide-react";
import { ReactNode, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { api, errMsg } from "../lib/api";

const Page = ({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) => (
  <div className="mx-auto max-w-3xl px-4 py-14"><h1 className="text-4xl font-extrabold">{title}</h1>{lead && <p className="mt-3 text-lg text-muted">{lead}</p>}<div className="mt-8 space-y-8">{children}</div></div>);
const Block = ({ h, children }: { h: string; children: ReactNode }) => (<section><h2 className="text-xl font-bold">{h}</h2><div className="mt-2 space-y-2 text-muted">{children}</div></section>);

export function About() {
  return (<Page title="About MediSlot" lead="A student-built appointment platform that makes seeing a doctor less of a waiting game.">
    <Block h="The problem"><p>Booking a doctor still means phone calls, long queues and the risk of two people being given the same time. That wastes hours for patients and creates scheduling chaos for clinics.</p></Block>
    <Block h="What MediSlot does"><ul className="list-disc space-y-1 pl-5"><li>Patients search doctors and book, reschedule or cancel online.</li><li>Doctors control their own hours, breaks and days off.</li>
      <li>Administrators manage doctors, patients, appointments and specialties.</li><li>The server checks every booking, so a slot can't be double booked.</li></ul></Block>
    <Block h="Why it matters"><p>MediSlot supports UN Sustainable Development Goal 3, Good Health and Well-being, by making care easier to reach and less stressful to arrange.</p></Block>
    <Block h="The team"><p>Group 48 · ADC (CCSDS0302), B.Tech Computer Science</p><p>Purva Arora · Paras Gupta · Pushkar Agrawal · Manvendra Rajpoot</p></Block>
    <p className="rounded-2xl bg-white p-4 text-sm shadow-card">MediSlot is an academic project. All doctors, clinics, reviews and statistics are fictional demo data, and it is not a real medical service.</p></Page>);
}

export function HowItWorks() {
  const steps = [[UserSearch, "Find your doctor", "Search by name, specialty or city, then narrow by fee, experience, rating or the date you need."],
    [CalendarCheck, "Choose a time slot", "Pick a date and see only the slots that are genuinely free, with breaks and days off already removed."],
    [ClipboardCheck, "Confirm your appointment", "Describe your symptoms, review the summary and confirm. You get a booking ID straight away."],
    [Stethoscope, "Visit your doctor", "The doctor confirms your request. You can reschedule or cancel from My Appointments if plans change."]] as const;
  return (<Page title="How it works" lead="From search to seat in four steps.">
    <ol className="space-y-4">{steps.map(([I, t, d], i) => (<li key={t} className="card flex gap-4 p-5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary font-bold text-white">{i + 1}</span>
      <div><h2 className="flex items-center gap-2 text-lg font-bold"><I size={18} className="text-secondary" />{t}</h2><p className="mt-1 text-muted">{d}</p></div></li>))}</ol>
    <Block h="For doctors"><p>An administrator creates your account. You set working days, hours, breaks and holidays; confirm or decline requests; and the system warns you before a schedule change would affect booked patients.</p></Block>
    <Link to="/doctors" className="btn-primary">Find a doctor</Link></Page>);
}

export function Contact() {
  const [f, setF] = useState({ name: "", email: "", subject: "", message: "" }); const [busy, setBusy] = useState(false); const [done, setDone] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try { await api.post("/contact", f); setDone(true); setF({ name: "", email: "", subject: "", message: "" }); } catch (x) { toast.error(errMsg(x)); } finally { setBusy(false); }
  };
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  return (<Page title="Contact us" lead="Questions, feedback or a problem with the demo? Send us a message.">
    {done && <p role="status" className="rounded-2xl bg-secondary-soft p-4 text-secondary-ink">Thanks, your message was received. This is a student project, so replies may take a while.</p>}
    <form onSubmit={submit} className="card space-y-4 p-6"><div className="grid gap-4 sm:grid-cols-2">
      <div><label className="label" htmlFor="cn">Your name</label><input id="cn" required minLength={2} maxLength={100} className="input" value={f.name} onChange={set("name")} /></div>
      <div><label className="label" htmlFor="ce">Email</label><input id="ce" type="email" required className="input" value={f.email} onChange={set("email")} /></div></div>
      <div><label className="label" htmlFor="cs">Subject</label><input id="cs" required minLength={3} maxLength={150} className="input" value={f.subject} onChange={set("subject")} /></div>
      <div><label className="label" htmlFor="cm">Message</label><textarea id="cm" required minLength={10} maxLength={2000} rows={5} className="input" value={f.message} onChange={set("message")} /></div>
      <button className="btn-primary" disabled={busy}>{busy ? "Sending…" : "Send message"}</button></form></Page>);
}

export function Privacy() {
  return (<Page title="Privacy policy" lead="Sample policy for a student project. Last updated October 2026.">
    <Block h="What we collect"><p>Your name, email, phone number, appointment details and the reason you give for a visit. Passwords are stored only as salted hashes, never as plain text.</p></Block>
    <Block h="Who can see it"><p>You can see your own data. A doctor sees only the patients who booked with them. Administrators can see account and appointment records to run the service.</p></Block>
    <Block h="How we use it"><p>To schedule, change and cancel appointments and to send in-app notifications. We don't sell data or show advertising.</p></Block>
    <Block h="Your choices"><p>You can update your profile at any time. To have an account removed, contact us through the Contact page.</p></Block>
    <Block h="Please note"><p>This is a demonstration system. Don't enter real medical information.</p></Block></Page>);
}

export function Terms() {
  return (<Page title="Terms and conditions" lead="Sample terms for a student project. Last updated October 2026.">
    <Block h="Using MediSlot"><p>You agree to give accurate details and to keep your password private. Accounts used to abuse the service may be deactivated.</p></Block>
    <Block h="Appointments"><p>Bookings are requests until the doctor confirms them. Patients may reschedule or cancel up to the cut-off time shown by the system (2 hours before the visit by default).</p></Block>
    <Block h="No medical advice"><p>MediSlot schedules visits only. It does not provide medical advice, diagnosis or emergency services. In an emergency, contact your local emergency number.</p></Block>
    <Block h="Fees"><p>Consultation fees shown are set by each demo clinic and would be paid at the clinic. No payments are processed on this site.</p></Block>
    <Block h="Demo data"><p>Doctors, clinics, ratings and statistics are fictional and for demonstration only.</p></Block></Page>);
}
