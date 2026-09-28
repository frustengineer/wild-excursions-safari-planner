import { PRICING, RESORTS } from "./mockData";
import type { BookingState } from "./types";
import { calculatePartyOccupancy } from "./occupancy";

export type CartLine = { label: string; amount: number; detail?: string };

export function computeCart(state: BookingState): {
  lines: CartLine[];
  total: number;
} {
  const lines: CartLine[] = [];
  const numSafaris = state.plan.length;
  const { gypsiesRequired } = calculatePartyOccupancy(state.numAdults, state.childAges);
  const safariVehicles = numSafaris * gypsiesRequired;

  if (numSafaris > 0) {
    lines.push({
      label: "Safari permits",
      amount: PRICING.permitPerSafari * safariVehicles,
      detail: `₹${PRICING.permitPerSafari.toLocaleString("en-IN")} × ${numSafaris} safaris × ${gypsiesRequired} ${gypsiesRequired === 1 ? "gypsy" : "gypsies"}`,
    });
    lines.push({
      label: "Guide & vehicle",
      amount: PRICING.guideAndVehiclePerSafari * safariVehicles,
      detail: `₹${PRICING.guideAndVehiclePerSafari.toLocaleString("en-IN")} × ${numSafaris} safaris × ${gypsiesRequired} ${gypsiesRequired === 1 ? "gypsy" : "gypsies"}`,
    });
  }

  const resort = RESORTS.find((r) => r.id === state.resortId);
  if (resort) {
    lines.push({
      label: resort.name,
      amount: resort.pricePerNight * state.nights,
      detail: `₹${resort.pricePerNight.toLocaleString("en-IN")} × ${state.nights} night${state.nights === 1 ? "" : "s"}`,
    });
  }

  if (state.transfers) {
    lines.push({ label: "Transfers", amount: PRICING.transferFlat });
  }

  const total = lines.reduce((sum, l) => sum + l.amount, 0);
  return { lines, total };
}
