import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { api, errMsg } from "../lib/api";
import { addDays, dayLabel, todayStr } from "../lib/format";
import { Slot } from "../lib/types";
import { ErrorState } from "./ui";

interface Props { doctorId: number; date: string; onDate: (d: string) => void; slot: string; onSlot: (s: string) => void; refreshKey?: number }

/** Shows only slots the server reports as free for the chosen date. */
export function SlotPicker({ doctorId, date, onDate, slot, onSlot, refreshKey = 0 }: Props) {
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true; setSlots(null); setError("");
    api.get(`/doctors/${doctorId}/availability`, { params: { date } })
      .then((r) => live && setSlots(r.data.slots)).catch((e) => live && setError(errMsg(e)));
    return () => { live = false; };
  }, [doctorId, date, refreshKey]);
  const max = addDays(todayStr(), 90);
  const move = (n: number) => { onSlot(""); onDate(addDays(date, n)); };
  return (
    <div>
      <div className="flex items-center gap-2">
        <button type="button" className="btn-ghost px-3" aria-label="Previous day" disabled={date <= todayStr()} onClick={() => move(-1)}><ChevronLeft size={18} /></button>
        <input type="date" aria-label="Appointment date" className="input" value={date} min={todayStr()} max={max}
          onChange={(e) => { if (e.target.value) { onSlot(""); onDate(e.target.value); } }} />
        <button type="button" className="btn-ghost px-3" aria-label="Next day" disabled={date >= max} onClick={() => move(1)}><ChevronRight size={18} /></button>
      </div>
      <p className="mt-3 text-sm font-medium">{dayLabel(date)}</p>
      <div className="mt-3" aria-live="polite">
        {error ? <ErrorState message={error} /> : slots === null ? <p className="py-6 text-sm text-muted">Checking availability…</p> :
          slots.length === 0 ? <p className="rounded-xl bg-canvas p-4 text-sm text-muted">No free slots on this day. Try another date.</p> :
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Available time slots">
            {slots.map((s) => (
              <button key={s.start} type="button" role="radio" aria-checked={slot === s.start} onClick={() => onSlot(s.start)}
                className={`rounded-xl border px-2 py-2.5 text-sm font-semibold transition-colors ${slot === s.start ? "border-primary bg-primary text-white" : "border-line bg-white hover:border-secondary hover:bg-secondary-soft"}`}>{s.time}</button>))}
          </div>}
      </div>
    </div>
  );
}
