"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { BookingState, Traveller } from "./types";

const initialState: BookingState = {
  jungleSlug: null,
  range: null,
  startDate: null,
  recommendedStartDate: null,
  nights: 2,
  numAdults: 2,
  childAges: [],
  numTravellers: 2,
  numSafarisBuffer: 2,
  numSafarisCore: 0,
  plan: [],
  resortId: null,
  specialFares: [],
  transfers: false,
  travellers: [],
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  idDeferred: false,
  idValue: "",
};

type BookingContextValue = {
  state: BookingState;
  update: (patch: Partial<BookingState>) => void;
  reset: () => void;
};

const BookingContext = createContext<BookingContextValue | null>(null);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BookingState>(initialState);

  const update = (patch: Partial<BookingState>) =>
    setState((prev) => ({ ...prev, ...patch }));
  const reset = () => setState(initialState);

  return (
    <BookingContext.Provider value={{ state, update, reset }}>
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must be used within BookingProvider");
  return ctx;
}

export function makeDefaultTravellers(
  numAdults: number,
  childAges: string[],
  existing: Traveller[]
): Traveller[] {
  const count = numAdults + childAges.length;
  const list = Array.from({ length: count }, (_, index) => ({
    name: existing[index]?.name ?? "",
    age: existing[index]?.age ?? "",
  }));

  childAges.forEach((age, childIndex) => {
    if (age !== "") list[numAdults + childIndex].age = age;
  });

  return list;
}
