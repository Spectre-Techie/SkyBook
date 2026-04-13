"use client";

import {
  AirplaneTakeoff,
  Calendar,
  CheckCircle,
  ClockCountdown,
  EnvelopeSimple,
  Ticket,
  User,
  WarningCircle,
  XCircle,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type SessionPayload = {
  authenticated: boolean;
  user: {
    role: "PASSENGER" | "ADMIN";
  } | null;
};

type Booking = {
  id: string;
  bookingReference: string;
  seatNumber: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  cancelReason: string | null;
  bookingDate: string;
  passenger?: {
    id: string;
    fullName: string;
    email: string;
    role: "PASSENGER" | "ADMIN";
  };
  flight: {
    id: string;
    flightNumber: string;
    origin: string;
    destination: string;
    departureDateTime: string;
    arrivalDateTime: string;
  };
};

type StatusFilter = "ALL" | "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";

type ReviewDecision = "APPROVE" | "REJECT";

const statusFilters: StatusFilter[] = ["ALL", "PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"];

function statusChipClass(status: Booking["status"]) {
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

export default function AdminBookingsPage() {
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("PENDING");
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectReasonById, setRejectReasonById] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  async function loadBookings() {
    const response = await fetch("/api/bookings?includeAll=true", {
      cache: "no-store",
    });

    const payload = (await response.json()) as { data?: Booking[]; message?: string };

    if (!response.ok) {
      throw new Error(payload.message ?? "Unable to load bookings.");
    }

    setBookings(payload.data ?? []);
  }

  useEffect(() => {
    let mounted = true;

    async function loadPage() {
      try {
        const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
        const sessionPayload = (await sessionResponse.json()) as SessionPayload;

        if (!mounted) {
          return;
        }

        setSession(sessionPayload);

        if (!sessionPayload.authenticated || sessionPayload.user?.role !== "ADMIN") {
          return;
        }

        await loadBookings();
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load booking reviews.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadPage();

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

  const statusCounts = useMemo<Record<StatusFilter, number>>(() => {
    const counts: Record<StatusFilter, number> = {
      ALL: bookings.length,
      PENDING: 0,
      CONFIRMED: 0,
      CANCELLED: 0,
      COMPLETED: 0,
    };

    for (const booking of bookings) {
      counts[booking.status] += 1;
    }

    return counts;
  }, [bookings]);

  async function reviewBooking(bookingId: string, decision: ReviewDecision, reason?: string) {
    setProcessingId(bookingId);
    setError("");

    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ decision, reason }),
      });

      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to update booking.");
      }

      setRejectReasonById((prev) => {
        if (!prev[bookingId]) {
          return prev;
        }

        const next = { ...prev };
        delete next[bookingId];
        return next;
      });
      await loadBookings();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Unable to review booking.");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleApprove(bookingId: string) {
    await reviewBooking(bookingId, "APPROVE");
  }

  async function handleReject(bookingId: string) {
    const reason = rejectReasonById[bookingId]?.trim() ?? "";
    await reviewBooking(bookingId, "REJECT", reason.trim() || undefined);
  }

  if (loading) {
    return <div className="card-shell rounded-2xl p-6 text-text-default">Loading booking reviews...</div>;
  }

  if (!session?.authenticated || session.user?.role !== "ADMIN") {
    return (
      <div className="card-shell rounded-2xl p-6 text-sm text-danger-600">
        Admin access required.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="card-shell rounded-3xl p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-border-default bg-surface-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              <Ticket size={14} weight="bold" />
              Booking Control
            </p>
            <h1 className="mt-3 text-2xl font-bold text-text-default sm:text-3xl">Approve or Reject Pending Tickets</h1>
            <p className="mt-2 max-w-2xl text-sm text-text-muted">
              Use this panel to manually confirm or reject pending bookings when webhook confirmation is delayed or manual review is required.
            </p>
          </div>

          <div className="flex gap-2">
            <Link href="/admin/flights" className="btn-secondary">
              Manage flights
            </Link>
            <Link href="/dashboard" className="btn-secondary">
              Passenger dashboard
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="card-shell rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-text-muted">Pending</p>
          <p className="mt-2 inline-flex items-center gap-2 text-2xl font-bold text-text-default">
            <ClockCountdown size={22} weight="duotone" className="text-[var(--warning-700)]" />
            {statusCounts.PENDING}
          </p>
        </article>
        <article className="card-shell rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-text-muted">Confirmed</p>
          <p className="mt-2 inline-flex items-center gap-2 text-2xl font-bold text-text-default">
            <CheckCircle size={22} weight="duotone" className="text-[var(--success-700)]" />
            {statusCounts.CONFIRMED}
          </p>
        </article>
        <article className="card-shell rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-text-muted">Cancelled</p>
          <p className="mt-2 inline-flex items-center gap-2 text-2xl font-bold text-text-default">
            <XCircle size={22} weight="duotone" className="text-[var(--danger-700)]" />
            {statusCounts.CANCELLED}
          </p>
        </article>
        <article className="card-shell rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-text-muted">Total</p>
          <p className="mt-2 inline-flex items-center gap-2 text-2xl font-bold text-text-default">
            <AirplaneTakeoff size={22} weight="duotone" className="text-[var(--primary-700)]" />
            {statusCounts.ALL}
          </p>
        </article>
      </section>

      <section className="flex flex-wrap gap-2">
        {statusFilters.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilter(status)}
            className={filter === status ? "btn-primary" : "btn-secondary"}
          >
            {status} ({statusCounts[status]})
          </button>
        ))}
      </section>

      {error ? (
        <p className="alert-danger inline-flex items-start gap-2 text-sm">
          <WarningCircle size={16} weight="fill" className="mt-0.5" />
          {error}
        </p>
      ) : null}

      <section className="space-y-4">
        {filteredBookings.length === 0 ? (
          <div className="card-shell rounded-2xl p-6 text-sm text-text-muted">
            No bookings match this filter.
          </div>
        ) : null}

        {filteredBookings.map((booking) => {
          const busy = processingId === booking.id;

          return (
            <article key={booking.id} className="card-shell rounded-2xl p-5 sm:p-6">
              <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={`rounded-full px-2.5 py-1 font-semibold ${statusChipClass(booking.status)}`}>
                      {booking.status}
                    </span>
                    <span className="rounded-full border border-border-default bg-surface-muted px-2.5 py-1 font-semibold text-text-muted">
                      {booking.flight.flightNumber}
                    </span>
                    <span className="rounded-full border border-border-default bg-surface-muted px-2.5 py-1 font-semibold text-text-muted">
                      Ref {booking.bookingReference}
                    </span>
                  </div>

                  <h2 className="mt-3 text-xl font-semibold text-text-default">
                    {booking.flight.origin} to {booking.flight.destination}
                  </h2>

                  <div className="mt-3 grid gap-2 text-sm text-text-muted sm:grid-cols-2">
                    <p className="inline-flex items-center gap-2">
                      <Calendar size={15} weight="duotone" className="text-[var(--primary-700)]" />
                      Departure: {new Date(booking.flight.departureDateTime).toLocaleString()}
                    </p>
                    <p className="inline-flex items-center gap-2">
                      <Ticket size={15} weight="duotone" className="text-[var(--primary-700)]" />
                      Seat: <span className="font-semibold text-text-default">{booking.seatNumber}</span>
                    </p>
                    <p className="inline-flex items-center gap-2">
                      <User size={15} weight="duotone" className="text-[var(--primary-700)]" />
                      {booking.passenger?.fullName ?? "Unknown passenger"}
                    </p>
                    <p className="inline-flex items-center gap-2 break-all">
                      <EnvelopeSimple size={15} weight="duotone" className="text-[var(--primary-700)]" />
                      {booking.passenger?.email ?? "No email"}
                    </p>
                  </div>

                  {booking.cancelReason ? (
                    <p className="mt-3 text-xs text-text-muted">Cancel reason: {booking.cancelReason}</p>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-border-default bg-surface-muted p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-text-muted">Review actions</p>

                  <div className="mt-3 space-y-2">
                    <Link href={`/ticket/${booking.bookingReference}`} className="btn-secondary inline-flex w-full items-center justify-center gap-2">
                      <Ticket size={15} weight="duotone" />
                      Open ticket
                    </Link>

                    {booking.status === "PENDING" ? (
                      <>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-text-muted" htmlFor={`reject-reason-${booking.id}`}>
                            Rejection reason (optional)
                          </label>
                          <input
                            id={`reject-reason-${booking.id}`}
                            type="text"
                            maxLength={120}
                            value={rejectReasonById[booking.id] ?? ""}
                            onChange={(event) =>
                              setRejectReasonById((prev) => ({
                                ...prev,
                                [booking.id]: event.target.value,
                              }))
                            }
                            placeholder="Payment verification failed"
                            className="field"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => void handleApprove(booking.id)}
                          disabled={busy}
                          className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-full border border-[var(--success-700)] bg-[var(--success-100)] px-4 py-2 text-sm font-semibold text-[var(--success-700)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          <CheckCircle size={15} weight="bold" />
                          {busy ? "Processing..." : "Approve booking"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleReject(booking.id)}
                          disabled={busy}
                          className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-full border border-[var(--danger-500)] bg-[var(--danger-100)] px-4 py-2 text-sm font-semibold text-[var(--danger-700)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          <XCircle size={15} weight="bold" />
                          {busy ? "Processing..." : "Reject booking"}
                        </button>
                      </>
                    ) : (
                      <p className="rounded-xl border border-border-default bg-surface-raised px-3 py-2 text-xs text-text-muted">
                        This booking is already finalized.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
