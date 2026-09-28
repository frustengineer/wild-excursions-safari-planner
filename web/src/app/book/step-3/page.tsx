"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StepIndicator } from "@/components/StepIndicator";
import { useBooking, makeDefaultTravellers } from "@/lib/booking-context";
import { computeCart } from "@/lib/pricing";
import { RESORTS } from "@/lib/mockData";
import { calculatePartyOccupancy } from "@/lib/occupancy";

export default function Step3() {
  const router = useRouter();
  const { state, update } = useBooking();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!state.range || !state.startDate || state.plan.length === 0) {
      router.replace("/book/step-1");
      return;
    }
    const travellers = makeDefaultTravellers(state.numAdults, state.childAges, state.travellers);
    if (
      travellers.length !== state.travellers.length ||
      travellers.some(
        (traveller, index) =>
          traveller.name !== state.travellers[index]?.name ||
          traveller.age !== state.travellers[index]?.age
      )
    ) {
      update({ travellers });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { lines, total } = computeCart(state);
  const resort = RESORTS.find((r) => r.id === state.resortId);
  const occupancy = calculatePartyOccupancy(state.numAdults, state.childAges);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!state.contactName || !state.contactPhone) {
      setError("We need at least your name and phone number to reach you.");
      return;
    }
    if (state.travellers.some((t) => !t.name)) {
      setError("Add a name for each traveller.");
      return;
    }
    setError(null);
    setSubmitting(true);

    // In production this posts to /api/enquiry, which forwards to the
    // Make.com webhook feeding the shared leads sheet + Zoho. ID/Aadhaar
    // is intentionally never sent to that sheet — see route.ts.
    const res = await fetch("/api/enquiry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...state, total }),
    });
    const data = await res.json();
    sessionStorage.setItem(
      `enquiry:${data.enquiryId}`,
      JSON.stringify({ state, total, enquiryId: data.enquiryId })
    );
    router.push(`/confirmation?id=${data.enquiryId}`);
  }

  return (
    <div>
      <StepIndicator current={3} />
      <form onSubmit={handleSubmit} className="booking-card space-y-7 p-5 sm:p-8">
        <div>
          <p className="section-kicker">Step 3 of 3 · Final review</p>
          <h1 className="font-display mt-2 text-3xl font-bold text-brand-dark">Cart & Enquire</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
            Review your day-wise plan and traveller details. Our safari expert will reconfirm availability before anything is booked.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.08fr_.92fr]">
          <div className="space-y-6">
            <section>
              <h2 className="font-display mb-3 text-xl font-bold text-brand-dark">Your Day-wise Plan</h2>
              <div className="space-y-3">
                {state.plan.map((s) => (
                  <article key={`${s.date}-${s.session}`} className="soft-card p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Safari {s.safariNumber} · {formatDate(s.date)}</p>
                        <h3 className="font-display mt-1 text-lg font-bold text-brand-dark">{s.zone.name}</h3>
                        <p className="mt-1 text-xs text-muted">
                          {s.session === "morning" ? "Morning" : "Evening"} safari · {s.gypsiesRequired} {s.gypsiesRequired === 1 ? "gypsy" : "gypsies"}
                        </p>
                      </div>
                      <span className="rounded-full bg-[#f7ecd0] px-2.5 py-1 text-[10px] font-semibold capitalize text-brand">{s.zone.type}</span>
                    </div>
                  </article>
                ))}
                {resort && (
                  <article className="soft-card p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Your stay</p>
                    <h3 className="font-display mt-1 text-lg font-bold text-brand-dark">{resort.name}</h3>
                    <p className="mt-1 text-xs text-muted">{state.nights} night{state.nights === 1 ? "" : "s"} · Preferred resort</p>
                  </article>
                )}
              </div>
            </section>

            <section className="soft-card p-4 sm:p-5">
              <h2 className="font-display mb-1 text-lg font-bold text-brand-dark">Traveller Details</h2>
              <p className="mb-3 text-xs text-muted">
                {occupancy.totalTravellers} travellers · {occupancy.gypsiesRequired} {occupancy.gypsiesRequired === 1 ? "gypsy" : "gypsies"} per safari
              </p>
              <div className="space-y-2">
                {state.travellers.map((t, i) => (
                  <div key={i} className="grid grid-cols-3 gap-2">
                    <input
                      placeholder={`Traveller ${i + 1} name`}
                      value={t.name}
                      onChange={(e) => {
                        const travellers = [...state.travellers];
                        travellers[i] = { ...travellers[i], name: e.target.value };
                        update({ travellers });
                      }}
                      className="col-span-2 rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
                    />
                    <input
                      placeholder="Age"
                      inputMode="numeric"
                      value={t.age}
                      onChange={(e) => {
                        const travellers = [...state.travellers];
                        travellers[i] = { ...travellers[i], age: e.target.value };
                        update({ travellers });
                      }}
                      readOnly={i >= state.numAdults && state.childAges[i - state.numAdults] !== ""}
                      title={i >= state.numAdults && state.childAges[i - state.numAdults] !== "" ? "Child age was set in Trip basics because it affects gypsy capacity." : undefined}
                      className="rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand read-only:bg-border/30 read-only:text-muted"
                    />
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-4">
            <section className="soft-card p-4 sm:p-5">
              <h2 className="font-display mb-3 text-lg font-bold text-brand-dark">Contact Details</h2>
              <div className="space-y-2">
                <input placeholder="Your name" value={state.contactName} onChange={(e) => update({ contactName: e.target.value })} className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand" />
                <input placeholder="Phone" value={state.contactPhone} onChange={(e) => update({ contactPhone: e.target.value })} className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand" />
                <input placeholder="Email" type="email" value={state.contactEmail} onChange={(e) => update({ contactEmail: e.target.value })} className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand" />
              </div>
            </section>

            <section className="soft-card p-4 sm:p-5">
              <h2 className="font-display mb-2 text-lg font-bold text-brand-dark">Forest Permit ID</h2>
              <p className="mb-3 text-xs leading-5 text-muted">Aadhaar, PAN or passport of the lead traveller. This is stored separately from general enquiry details.</p>
              {state.idDeferred ? (
                <p className="rounded-lg bg-[#fff4e7] px-3 py-2 text-xs text-warning">You&apos;ll share this on the call with our expert.</p>
              ) : (
                <input placeholder="ID number" value={state.idValue} onChange={(e) => update({ idValue: e.target.value })} className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand" />
              )}
              <label className="mt-3 flex items-center gap-2 text-xs text-muted">
                <input type="checkbox" checked={state.idDeferred} onChange={(e) => update({ idDeferred: e.target.checked, idValue: "" })} className="h-4 w-4 accent-brand" />
                I&apos;ll share my ID on the call instead
              </label>
            </section>

            <section className="rounded-xl border border-brand bg-[#fffdf2] p-4 sm:p-5">
              <h2 className="font-display mb-3 text-lg font-bold text-brand-dark">Price Breakdown</h2>
              <ul className="space-y-2 text-xs">
                {lines.map((l) => (
                  <li key={l.label} className="flex justify-between gap-4">
                    <span className="text-muted">{l.label}{l.detail && <span className="ml-1 text-[10px]">({l.detail})</span>}</span>
                    <span className="font-semibold">₹{l.amount.toLocaleString("en-IN")}</span>
                  </li>
                ))}
              </ul>
              <div className="my-4 h-px bg-border" />
              <div className="flex items-end justify-between">
                <span className="text-sm font-semibold">Total quote</span>
                <span className="font-display text-2xl font-bold text-brand-dark">₹{total.toLocaleString("en-IN")}</span>
              </div>
              <p className="mt-2 text-[11px] leading-4 text-muted">Nothing is charged now. Our expert confirms and locks the booking with you.</p>
            </section>
          </div>
        </div>

        {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

        <div className="flex gap-3 border-t border-border pt-5">
          <button type="button" onClick={() => router.push("/book/step-2")} className="rounded-lg border border-border bg-white px-5 py-3 font-semibold text-foreground transition hover:border-brand">Back</button>
          <button type="submit" disabled={submitting} className="flex-1 rounded-lg bg-accent py-3 font-semibold text-black shadow-[0_8px_20px_rgba(253,203,8,0.24)] transition hover:bg-[#a97e00] disabled:opacity-60">
            {submitting ? "Sending..." : "Send enquiry"}
          </button>
        </div>
      </form>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
