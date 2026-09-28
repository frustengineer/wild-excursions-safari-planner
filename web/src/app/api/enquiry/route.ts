import { NextResponse } from "next/server";
import type { BookingState } from "@/lib/types";

/**
 * Stub for the real enquiry handoff. In production this:
 *  1. Writes plan/contact/trip details to the shared leads sheet via the
 *     existing Make.com webhook (same one Instagram leads use), tagged
 *     with source="safari-tool".
 *  2. Routes any ID/Aadhaar value to a restricted, access-controlled store
 *     — NEVER to the shared sheet — and keeps only a masked last-4 reference
 *     alongside the lead. See the spec's "What we collect" guardrail.
 * For now it just logs and returns a fake enquiry id so the front-end flow
 * is fully clickable end to end.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as BookingState & { total: number };

  const maskedId = body.idDeferred
    ? "deferred"
    : body.idValue
    ? `••••${body.idValue.slice(-4)}`
    : "not provided";

  const provisionalCount = body.plan.filter((s) => s.isProvisional).length;

  console.log("[enquiry stub] new lead", {
    contact: body.contactName,
    phone: body.contactPhone,
    range: body.range,
    requestedStartDate: body.startDate,
    recommendedStartDate: body.recommendedStartDate ?? body.startDate,
    numSafaris: body.plan.length,
    gypsiesPerSafari: body.plan[0]?.gypsiesRequired ?? 1,
    // Flagged separately for the team: these safaris fall on dates the
    // government portal hasn't opened for booking yet, so they can't
    // actually be confirmed/booked until the portal's rolling window
    // reaches them — don't let this silently blend into "confirmed" leads.
    provisionalSafaris: provisionalCount,
    total: body.total,
    idMasked: maskedId,
    source: "safari-tool",
  });

  const enquiryId = `EQ-${Date.now().toString(36).toUpperCase()}`;
  return NextResponse.json({ enquiryId });
}
