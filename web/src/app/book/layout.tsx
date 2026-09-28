import { BookingProvider } from "@/lib/booking-context";

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return (
    <BookingProvider>
      <div className="mx-auto w-full max-w-5xl px-0 pb-10 sm:px-6 sm:py-3">{children}</div>
    </BookingProvider>
  );
}
