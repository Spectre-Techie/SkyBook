"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Booking = {
  id: string;
  bookingReference: string;
  seatNumber: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  flight: {
    origin: string;
    destination: string;
    flightNumber: string;
    departureDateTime: string;
    arrivalDateTime: string;
  };
};

export default function BookingConfirmationPage() {
  const params = useParams<{ id: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadBooking() {
      try {
        const response = await fetch(`/api/bookings/${params.id}`, { cache: "no-store" });
        const payload = (await response.json()) as { data?: Booking; message?: string };

        if (!response.ok || !payload.data) {
          throw new Error(payload.message ?? "Booking not found.");
        }

        if (mounted) {
          setBooking(payload.data);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load booking.");
        }
      }
    }

    void loadBooking();

    return () => {
      mounted = false;
    };
  }, [params.id]);

  if (error) {
    return (
      <div className="card-shell rounded-2xl p-6 text-sm text-danger-600">
        {error}
      </div>
    );
  }

  if (!booking) {
    return <div className="card-shell rounded-2xl p-6">Loading booking confirmation...</div>;
  }

  const statusTone =
    booking.status === "CONFIRMED"
      ? "bg-[var(--success-100)] text-[var(--success-700)]"
      : booking.status === "PENDING"
      ? "bg-[var(--warning-100)] text-[var(--warning-700)]"
      : booking.status === "CANCELLED"
      ? "bg-[var(--danger-100)] text-[var(--danger-700)]"
      : "bg-[var(--primary-50)] text-[var(--primary-700)]";

  const statusTitle =
    booking.status === "PENDING"
      ? "Payment Received, Awaiting Confirmation"
      : booking.status === "CONFIRMED"
      ? "Booking Confirmed"
      : booking.status === "CANCELLED"
      ? "Booking Cancelled"
      : "Trip Completed";

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <section className="card-shell rounded-3xl p-8 text-center">
        <p className={`mx-auto inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${statusTone}`}>
          {booking.status}
        </p>
        <h1 className="mt-3 text-3xl font-bold text-text-default sm:text-4xl">{statusTitle}</h1>
        <p className="mt-3 text-text-muted">
          Reference: <span className="font-mono font-semibold text-text-default">{booking.bookingReference}</span>
        </p>
        <p className="mt-2 text-text-muted">
          {booking.flight.origin} to {booking.flight.destination} on{" "}
          {new Date(booking.flight.departureDateTime).toLocaleString()}
        </p>
        <p className="mt-2 text-sm text-text-muted">Seat: <span className="font-semibold text-text-default">{booking.seatNumber}</span></p>
        {booking.status === "PENDING" ? (
          <p className="mt-3 rounded-xl border border-[var(--warning-500)]/40 bg-[var(--warning-100)] px-3 py-2 text-sm text-[var(--warning-700)]">
            If this remains pending after payment, an admin can approve it from the booking review panel.
          </p>
        ) : null}
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Link href="/dashboard" className="btn-secondary text-center">
          Booking history
        </Link>
        <Link href={`/ticket/${booking.bookingReference}`} className="btn-secondary text-center">
          View ticket
        </Link>
        <Link href="/search" className="btn-primary text-center">
          New search
        </Link>
      </section>
    </div>
  );
}
