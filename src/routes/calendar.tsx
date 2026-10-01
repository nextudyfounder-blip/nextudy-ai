import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus, Check, Trash2, AlarmClock,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { PenLoader } from "@/components/PenLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { eventsInMonth, upcomingEvents, getActiveEvent, type HolidayEvent } from "@/lib/holidays";

export const Route = createFileRoute("/calendar")({
  component: CalendarPage,
  head: () => ({
    meta: [
      { title: "Calendar & Deadlines — Nextudy" },
      { name: "description", content: "Track exam dates, assignment deadlines and study events on one real calendar, with countdowns to everything that matters." },
      { property: "og:title", content: "Calendar & Deadlines — Nextudy" },
      { property: "og:description", content: "Your exams, assignments and study events with live countdowns." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Deadline = {
  id: string;
  title: string;
  notes: string | null;
  due_at: string;
  kind: string;
  completed_at: string | null;
};

const DAY_MS = 86_400_000;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const iso = (d: Date) => d.toISOString().slice(0, 10);
const monthLabel = (y: number, m: number) =>
  new Date(Date.UTC(y, m, 1)).toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" });

function countdown(due: Date, now: Date): { text: string; tone: "past" | "today" | "soon" | "later" } {
  const days = Math.floor((Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate()) -
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) / DAY_MS);
  if (days < 0) return { text: days === -1 ? "Yesterday" : `${Math.abs(days)} days ago`, tone: "past" };
  if (days === 0) return { text: "Today", tone: "today" };
  if (days === 1) return { text: "Tomorrow", tone: "soon" };
  if (days <= 7) return { text: `In ${days} days`, tone: "soon" };
  return { text: `In ${days} days`, tone: "later" };
}

/** Monday-first 6x7 grid of UTC dates covering the month. */
function monthGrid(year: number, month: number): Date[] {
  const first = new Date(Date.UTC(year, month, 1));
  const lead = (first.getUTCDay() + 6) % 7;
  const start = new Date(first.getTime() - lead * DAY_MS);
  return Array.from({ length: 42 }, (_, i) => new Date(start.getTime() + i * DAY_MS));
}

function CalendarPage() {
  const { user } = useAuth();
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getUTCFullYear(), month: now.getUTCMonth() });
  const [rows, setRows] = useState<Deadline[] | null>(null);
  const [selected, setSelected] = useState<string>(iso(now));
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [time, setTime] = useState("09:00");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) { setRows([]); return; }
    const { data, error } = await supabase
      .from("deadlines")
      .select("id, title, notes, due_at, kind, completed_at")
      .eq("user_id", user.id)
      .order("due_at", { ascending: true });
    if (error) toast.error("Could not load your deadlines.");
    setRows((data ?? []) as Deadline[]);
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const byDay = useMemo(() => {
    const map = new Map<string, Deadline[]>();
    (rows ?? []).forEach((r) => {
      const key = r.due_at.slice(0, 10);
      map.set(key, [...(map.get(key) ?? []), r]);
    });
    return map;
  }, [rows]);

  const events = useMemo(() => eventsInMonth(cursor.year, cursor.month), [cursor]);
  const eventOn = useCallback((d: Date): HolidayEvent | undefined =>
    events.find((e) => d >= e.start && d < e.end), [events]);

  const activeEvent = getActiveEvent(now);
  const nextEvents = upcomingEvents(now, 4);

  const open = useMemo(
    () => (rows ?? []).filter((r) => !r.completed_at),
    [rows],
  );

  const addDeadline = async () => {
    if (!user) return;
    if (!title.trim()) { toast.error("Give your deadline a name first."); return; }
    setSaving(true);
    const due = new Date(`${selected}T${time || "09:00"}:00`);
    const { error } = await supabase.from("deadlines").insert({
      user_id: user.id,
      title: title.trim(),
      notes: notes.trim() || null,
      due_at: due.toISOString(),
    });
    setSaving(false);
    if (error) { toast.error("Could not save that deadline."); return; }
    setTitle(""); setNotes("");
    toast.success("Deadline added");
    void load();
  };

  const toggle = async (row: Deadline) => {
    const { error } = await supabase
      .from("deadlines")
      .update({ completed_at: row.completed_at ? null : new Date().toISOString() })
      .eq("id", row.id);
    if (error) { toast.error("Could not update that deadline."); return; }
    void load();
  };

  const remove = async (row: Deadline) => {
    const { error } = await supabase.from("deadlines").delete().eq("id", row.id);
    if (error) { toast.error("Could not delete that deadline."); return; }
    void load();
  };

  const move = (delta: number) => setCursor((c) => {
    const d = new Date(Date.UTC(c.year, c.month + delta, 1));
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
  });

  const grid = monthGrid(cursor.year, cursor.month);
  const selectedItems = byDay.get(selected) ?? [];
  const selectedEvent = eventOn(new Date(`${selected}T12:00:00Z`));

  return (
    <AppLayout title="Calendar & Deadlines">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-realm" /> Calendar &amp; Deadlines
          </h1>
          <p className="text-sm text-muted-foreground">
            Real dates, real countdowns — your exams and assignments next to the study seasons the app highlights.
          </p>
        </header>

        {!user ? (
          <div className="rounded-xl border border-border p-6 text-sm text-muted-foreground">
            Sign in to keep your deadlines.{" "}
            <Link to="/auth" className="text-realm underline">Sign in</Link>
          </div>
        ) : rows === null ? (
          <div className="py-16 grid place-items-center"><PenLoader /></div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            {/* Month grid */}
            <section className="rounded-xl border border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="font-display font-semibold">{monthLabel(cursor.year, cursor.month)}</span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => move(-1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => {
                    const t = new Date();
                    setCursor({ year: t.getUTCFullYear(), month: t.getUTCMonth() });
                    setSelected(iso(t));
                  }}>Today</Button>
                  <Button variant="ghost" size="icon" aria-label="Next month" onClick={() => move(1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-7 text-[11px] text-muted-foreground border-b border-border">
                {WEEKDAYS.map((d) => <div key={d} className="px-2 py-2 text-center">{d}</div>)}
              </div>

              <div className="grid grid-cols-7">
                {grid.map((d) => {
                  const key = iso(d);
                  const inMonth = d.getUTCMonth() === cursor.month;
                  const items = byDay.get(key) ?? [];
                  const ev = eventOn(d);
                  const isToday = key === iso(now);
                  return (
                    <button
                      key={key}
                      onClick={() => setSelected(key)}
                      className={[
                        "min-h-[76px] border-b border-r border-border p-2 text-left align-top transition-colors",
                        inMonth ? "" : "opacity-40",
                        selected === key ? "bg-realm/10 ring-1 ring-realm/40" : "hover:bg-muted/40",
                      ].join(" ")}
                    >
                      <span className={[
                        "inline-grid h-6 w-6 place-items-center rounded-full text-xs",
                        isToday ? "bg-realm text-white font-semibold" : "",
                      ].join(" ")}>{d.getUTCDate()}</span>
                      {ev && <span className="ml-1 text-xs" title={ev.label}>{ev.emoji}</span>}
                      <span className="mt-1 flex flex-wrap gap-1">
                        {items.slice(0, 3).map((i) => (
                          <span
                            key={i.id}
                            className={[
                              "h-1.5 w-1.5 rounded-full",
                              i.completed_at ? "bg-muted-foreground/50" : "bg-realm",
                            ].join(" ")}
                          />
                        ))}
                        {items.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">+{items.length - 3}</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <div className="space-y-6">
              {/* Add + day detail */}
              <section className="rounded-xl border border-border p-4 space-y-3">
                <h2 className="text-sm font-semibold">
                  {new Date(`${selected}T12:00:00Z`).toLocaleDateString(undefined, {
                    weekday: "long", day: "numeric", month: "long", timeZone: "UTC",
                  })}
                </h2>
                {selectedEvent && (
                  <p className="text-xs text-muted-foreground">
                    {selectedEvent.emoji} {selectedEvent.label} — {selectedEvent.badge}
                  </p>
                )}

                <div className="space-y-2">
                  <Input placeholder="Exam, assignment, pitch…" value={title} onChange={(e) => setTitle(e.target.value)} />
                  <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                  <Textarea placeholder="Notes (optional)" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                  <Button className="w-full" onClick={addDeadline} disabled={saving}>
                    <Plus className="h-4 w-4 mr-1" /> Add to {selected}
                  </Button>
                </div>

                <ul className="space-y-2 pt-1">
                  {selectedItems.length === 0 && (
                    <li className="text-xs text-muted-foreground">Nothing planned for this day yet.</li>
                  )}
                  {selectedItems.map((i) => (
                    <li key={i.id} className="flex items-start gap-2 rounded-lg border border-border px-2 py-2">
                      <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Toggle done" onClick={() => toggle(i)}>
                        <Check className={`h-4 w-4 ${i.completed_at ? "text-realm" : "text-muted-foreground"}`} />
                      </Button>
                      <span className="flex-1 min-w-0">
                        <span className={`block text-sm truncate ${i.completed_at ? "line-through text-muted-foreground" : ""}`}>
                          {i.title}
                        </span>
                        <span className="block text-[11px] text-muted-foreground">
                          {new Date(i.due_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                          {i.notes ? ` · ${i.notes}` : ""}
                        </span>
                      </span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Delete" onClick={() => remove(i)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Countdowns */}
              <section className="rounded-xl border border-border p-4 space-y-2">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <AlarmClock className="h-4 w-4 text-realm" /> Coming up
                </h2>
                {open.length === 0 && <p className="text-xs text-muted-foreground">No open deadlines. Enjoy it.</p>}
                <ul className="space-y-1.5">
                  {open.slice(0, 6).map((i) => {
                    const c = countdown(new Date(i.due_at), now);
                    return (
                      <li key={i.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate">{i.title}</span>
                        <span className={[
                          "shrink-0 text-xs rounded-full border px-2 py-0.5",
                          c.tone === "past" ? "border-destructive/40 text-destructive"
                            : c.tone === "today" || c.tone === "soon" ? "border-realm/50 text-realm"
                            : "border-border text-muted-foreground",
                        ].join(" ")}>{c.text}</span>
                      </li>
                    );
                  })}
                </ul>
              </section>

              {/* Real event windows behind the badges */}
              <section className="rounded-xl border border-border p-4 space-y-2">
                <h2 className="text-sm font-semibold">Study seasons</h2>
                <p className="text-xs text-muted-foreground">
                  {activeEvent
                    ? `${activeEvent.emoji} ${activeEvent.label} is running until ${activeEvent.end.toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" })}.`
                    : "No season running right now."}
                </p>
                <ul className="space-y-1.5">
                  {nextEvents.map((e) => (
                    <li key={e.id + e.start.toISOString()} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate">{e.emoji} {e.label}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {e.start.toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" })}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
