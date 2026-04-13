"use client";

import {
  AirplaneInFlight,
  ArrowRight,
  CalendarBlank,
  CheckCircle,
  ClockCountdown,
  ListChecks,
  MagnifyingGlass,
  Ticket,
  WarningCircle,
  XCircle,
} from "@phosphor-icons/react";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type SessionPayload = {
  authenticated: boolean;
  user: {
    id: string;
    fullName: string;
    role: "PASSENGER" | "ADMIN";
  } | null;
};

type Booking = {
  id: string;
  bookingReference: string;
  seatNumber: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  cancelReason: string | null;
  flight: {
    flightNumber: string;
    origin: string;
    destination: string;
    departureDateTime: string;
    arrivalDateTime: string;
  };
};

type StatusFilter = "ALL" | "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";

const filters: StatusFilter[] = ["ALL", "PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"];

function statusBadgeClass(status: Booking["status"]): string {
  if (status === "CONFIRMED") {
    return "bg-[var(--success-100)] text-[var(--success-700)]";
  }

  if (status === "PENDING") {
    return "bg-[var(--warning-100)] text-[var(--warning-700)]";
  }

  if (status === "CANCELLED") {
    return "bg-[var(--danger-100)] text-[var(--danger-700)]";
  }

  return "bg-[var(--primary-50)] text-[var(--primary-700)]";
}

export default function DashboardPage() {
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadBookings() {
    const response = await fetch("/api/bookings", { cache: "no-store" });
    const payload = (await response.json()) as { data?: Booking[]; message?: string };

    if (!response.ok) {
      throw new Error(payload.message ?? "Unable to load bookings.");
    }

    setBookings(payload.data ?? []);
  }

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
        const sessionPayload = (await sessionResponse.json()) as SessionPayload;

        if (!mounted) {
          return;
        }

        setSession(sessionPayload);

        if (!sessionPayload.authenticated) {
          return;
        }

        await loadBookings();
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredBookings = useMemo(() => {
    if (filter === "ALL") {
      return bookings;
    }

    return bookings.filter((booking) => booking.status === filter);
  }, [bookings, filter]);

  const bookingStats = useMemo(() => {
    const pending = bookings.filter((booking) => booking.status === "PENDING").length;
    const confirmed = bookings.filter((booking) => booking.status === "CONFIRMED").length;
    const completed = bookings.filter((booking) => booking.status === "COMPLETED").length;
    const cancelled = bookings.filter((booking) => booking.status === "CANCELLED").length;

    return {
      total: bookings.length,
      pending,
      confirmed,
      completed,
      cancelled,
    };
  }, [bookings]);

  const filterCountMap = useMemo<Record<StatusFilter, number>>(
    () => ({
      ALL: bookingStats.total,
      PENDING: bookingStats.pending,
      CONFIRMED: bookingStats.confirmed,
      CANCELLED: bookingStats.cancelled,
      COMPLETED: bookingStats.completed,
    }),
    [bookingStats],
  );

  async function handleCancelBooking(bookingId: string) {
    const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason: "PASSENGER_REQUEST" }),
    });

    const payload = (await response.json()) as { message?: string };
    if (!response.ok) {
      setError(payload.message ?? "Unable to cancel booking.");
      return;
    }

    await loadBookings();
  }

  if (loading) {
    return <div className="card-shell rounded-2xl p-6">Loading dashboard...</div>;
  }

  if (!session?.authenticated) {
    return (
      <div className="card-shell rounded-2xl p-6 text-sm text-text-muted">
        Please <Link href="/auth/login" className="font-semibold text-[var(--primary-700)] hover:underline">sign in</Link> to access your dashboard.
      </div>
    );
  }

  return (
    <div className="page-atmosphere space-y-6">
      <section className="hero-frame relative overflow-hidden rounded-3xl border border-border-default">
        <Image src="/aviation-horizon.svg" alt="Abstract booking dashboard background" fill className="object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(4,10,18,0.88)_0%,rgba(4,10,18,0.72)_55%,rgba(4,10,18,0.46)_100%)]" />

        <div className="relative flex flex-col gap-5 p-6 sm:p-8">
          <p className="inline-flex items-center gap-2 self-start rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-100">
            <ListChecks size={15} weight="bold" />
            Passenger Dashboard
          </p>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">My Bookings</h1>
          <p className="max-w-2xl text-sm text-slate-100 sm:text-base">
            Monitor ticket status, departure details, and booking references across all active and past trips.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link href="/search" className="btn-primary inline-flex items-center gap-2 px-5 py-2.5">
              <MagnifyingGlass size={16} weight="bold" />
              Book another flight
            </Link>
            <Link
              href="/search"
              className="focus-ring inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              <AirplaneInFlight size={16} weight="duotone" />
              Explore routes
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="card-shell rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-text-muted">Confirmed</p>
          <p className="mt-2 inline-flex items-center gap-2 text-2xl font-bold text-text-default">
            <CheckCircle size={22} weight="duotone" className="text-[var(--success-700)]" />
            {bookingStats.confirmed}
          </p>
        </article>
        <article className="card-shell rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-text-muted">Pending</p>
          <p className="mt-2 inline-flex items-center gap-2 text-2xl font-bold text-text-default">
            <ClockCountdown size={22} weight="duotone" className="text-[var(--warning-700)]" />
            {bookingStats.pending}
          </p>
        </article>
        <article className="card-shell rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-text-muted">Completed</p>
          <p className="mt-2 inline-flex items-center gap-2 text-2xl font-bold text-text-default">
            <Ticket size={22} weight="duotone" className="text-[var(--primary-700)]" />
            {bookingStats.completed}
          </p>
        </article>
        <article className="card-shell rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-text-muted">Cancelled</p>
          <p className="mt-2 inline-flex items-center gap-2 text-2xl font-bold text-text-default">
            <XCircle size={22} weight="duotone" className="text-[var(--danger-700)]" />
            {bookingStats.cancelled}
          </p>
        </article>
      </section>

      <section className="flex flex-wrap gap-2">
        {filters.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilter(status)}
            className={filter === status ? "btn-primary" : "btn-secondary"}
          >
            {status} ({filterCountMap[status]})
          </button>
        ))}
      </section>

      {error ? <p className="alert-danger inline-flex items-start gap-2 text-sm"><WarningCircle size={16} weight="fill" className="mt-0.5" />{error}</p> : null}

      <section className="space-y-4">
        {filteredBookings.length === 0 ? (
          <div className="card-shell rounded-2xl p-6 text-sm text-text-muted">
            No bookings found for this filter.
          </div>
        ) : null}

        {filteredBookings.map((booking) => (
          <article key={booking.id} className="card-shell rounded-2xl p-5 sm:p-6">
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={`rounded-full px-2.5 py-1 font-semibold ${statusBadgeClass(booking.status)}`}>
                    {booking.status}
                  </span>
                  <span className="rounded-full border border-border-default bg-surface-muted px-2.5 py-1 font-semibold text-text-muted">
                    {booking.flight.flightNumber}
                  </span>
                </div>

                <h2 className="mt-3 text-xl font-semibold text-text-default">
                  {booking.flight.origin} to {booking.flight.destination}
                </h2>

                <div className="mt-3 grid gap-2 text-sm text-text-muted sm:grid-cols-2">
                  <p className="inline-flex items-center gap-2">
                    <CalendarBlank size={15} weight="duotone" className="text-[var(--primary-700)]" />
                    Departure: {new Date(booking.flight.departureDateTime).toLocaleString()}
                  </p>
                  <p className="inline-flex items-center gap-2">
                    <ArrowRight size={15} weight="bold" className="text-[var(--primary-700)]" />
                    Arrival: {new Date(booking.flight.arrivalDateTime).toLocaleString()}
                  </p>
                </div>

                <p className="mt-3 text-sm text-text-muted">
                  Reference: <span className="font-mono font-semibold text-text-default">{booking.bookingReference}</span>
                </p>
                <p className="mt-1 text-sm text-text-muted">
                  Seat: <span className="font-semibold text-text-default">{booking.seatNumber}</span>
                </p>

                {booking.cancelReason ? (
                  <p className="mt-2 text-xs text-text-muted">Cancel reason: {booking.cancelReason}</p>
                ) : null}
              </div>

              <div className="rounded-2xl border border-border-default bg-surface-muted p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-text-muted">Actions</p>
                <div className="mt-3 flex flex-col gap-2">
                  <Link href={`/ticket/${booking.bookingReference}`} className="btn-secondary inline-flex items-center justify-center gap-2">
                    <Ticket size={15} weight="duotone" />
                    View ticket
                  </Link>
                  {booking.status === "CONFIRMED" ? (
                    <button
                      type="button"
                      onClick={() => void handleCancelBooking(booking.id)}
                      className="focus-ring inline-flex items-center justify-center gap-2 rounded-full border border-[var(--danger-500)] bg-[var(--danger-100)] px-4 py-2 text-sm font-semibold text-[var(--danger-700)] transition hover:brightness-95"
                    >
                      <XCircle size={15} weight="bold" />
                      Cancel booking
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
