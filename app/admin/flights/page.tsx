"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

type SessionPayload = {
  authenticated: boolean;
  user: {
    role: "PASSENGER" | "ADMIN";
  } | null;
};

type Flight = {
  id: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureDateTime: string;
  arrivalDateTime: string;
  totalSeats: number;
  bookedSeats: number;
  availableSeats: number;
  pricePerSeat: number;
  status: "ACTIVE" | "CANCELLED" | "COMPLETED";
};

type FlightForm = {
  flightNumber: string;
  origin: string;
  destination: string;
  departureDateTime: string;
  arrivalDateTime: string;
  totalSeats: number;
  pricePerSeat: number;
};

const INITIAL_FORM: FlightForm = {
  flightNumber: "",
  origin: "",
  destination: "",
  departureDateTime: "",
  arrivalDateTime: "",
  totalSeats: 120,
  pricePerSeat: 100,
};

export default function AdminFlightsPage() {
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [form, setForm] = useState<FlightForm>(INITIAL_FORM);
  const [cancelReasonById, setCancelReasonById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function loadFlights() {
    const response = await fetch("/api/flights?includeAll=true", { cache: "no-store" });
    const payload = (await response.json()) as { data?: Flight[]; message?: string };

    if (!response.ok) {
      throw new Error(payload.message ?? "Unable to load flights.");
    }

    setFlights(payload.data ?? []);
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

        await loadFlights();
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load admin view.");
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

  async function handleCreateFlight(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError("");

    try {
      const response = await fetch("/api/flights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          flightNumber: form.flightNumber.trim().toUpperCase(),
          origin: form.origin.trim().toUpperCase(),
          destination: form.destination.trim().toUpperCase(),
          departureDateTime: new Date(form.departureDateTime).toISOString(),
          arrivalDateTime: new Date(form.arrivalDateTime).toISOString(),
          totalSeats: form.totalSeats,
          pricePerSeat: form.pricePerSeat,
        }),
      });

      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(payload.message ?? "Unable to create flight.");
        return;
      }

      setForm(INITIAL_FORM);
      await loadFlights();
    } catch {
      setError("Network error while creating flight.");
    } finally {
      setCreating(false);
    }
  }

  async function handleCancelFlight(flightId: string, reason?: string) {
    const normalizedReason = reason?.trim() || "Operational disruption";

    const response = await fetch(`/api/flights/${flightId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason: normalizedReason }),
    });

    const payload = (await response.json()) as { message?: string };
    if (!response.ok) {
      setError(payload.message ?? "Unable to cancel flight.");
      return;
    }

    setCancelReasonById((prev) => {
      if (!prev[flightId]) {
        return prev;
      }

      const next = { ...prev };
      delete next[flightId];
      return next;
    });

    await loadFlights();
  }

  if (loading) {
    return <div className="card-shell rounded-2xl p-6">Loading admin console...</div>;
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
      <section className="card-shell rounded-3xl p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text-default">Admin Flight Console</h1>
            <p className="mt-2 text-sm text-text-muted">
              Create new flights, monitor occupancy, and cancel routes when needed.
            </p>
          </div>

          <Link href="/admin/bookings" className="btn-secondary">
            Review pending bookings
          </Link>
        </div>
      </section>

      <form onSubmit={handleCreateFlight} className="card-shell rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-text-default">Create flight</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            className="field"
            placeholder="Flight number (SB501)"
            value={form.flightNumber}
            onChange={(event) => setForm((prev) => ({ ...prev, flightNumber: event.target.value }))}
            required
          />
          <input
            className="field"
            placeholder="Origin (LOS)"
            value={form.origin}
            onChange={(event) => setForm((prev) => ({ ...prev, origin: event.target.value }))}
            required
            maxLength={3}
          />
          <input
            className="field"
            placeholder="Destination (NBO)"
            value={form.destination}
            onChange={(event) => setForm((prev) => ({ ...prev, destination: event.target.value }))}
            required
            maxLength={3}
          />
          <input
            type="number"
            className="field"
            placeholder="Total seats"
            value={form.totalSeats}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, totalSeats: Number(event.target.value) }))
            }
            required
            min={1}
          />
          <input
            type="datetime-local"
            className="field"
            value={form.departureDateTime}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, departureDateTime: event.target.value }))
            }
            title="Departure date and time"
            aria-label="Departure date and time"
            required
          />
          <input
            type="datetime-local"
            className="field"
            value={form.arrivalDateTime}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, arrivalDateTime: event.target.value }))
            }
            title="Arrival date and time"
            aria-label="Arrival date and time"
            required
          />
          <input
            type="number"
            step="0.01"
            className="field md:col-span-2"
            placeholder="Price per seat"
            value={form.pricePerSeat}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, pricePerSeat: Number(event.target.value) }))
            }
            required
            min={1}
          />
        </div>

        <div className="mt-4 flex justify-end">
          <button type="submit" className="btn-primary" disabled={creating}>
            {creating ? "Creating..." : "Create flight"}
          </button>
        </div>
      </form>

      {error ? (
        <p className="alert-danger text-sm">
          {error}
        </p>
      ) : null}

      <section className="space-y-3">
        {flights.length === 0 ? (
          <div className="card-shell rounded-2xl p-6 text-sm text-text-muted">
            No flights yet. Create your first route above.
          </div>
        ) : null}

        {flights.map((flight) => (
          <article
            key={flight.id}
            className="card-shell flex flex-col gap-4 rounded-2xl p-5 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <h3 className="text-lg font-semibold text-text-default">{flight.flightNumber}</h3>
              <p className="text-sm text-text-muted">
                {flight.origin} to {flight.destination} - {new Date(flight.departureDateTime).toLocaleString()}
              </p>
              <p className="mt-1 text-xs uppercase tracking-wide text-[var(--primary-700)]">
                {flight.status} - {flight.bookedSeats}/{flight.totalSeats} booked
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-[var(--primary-700)]">${flight.pricePerSeat.toFixed(2)}</span>
              {flight.status === "ACTIVE" ? (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    maxLength={120}
                    value={cancelReasonById[flight.id] ?? ""}
                    onChange={(event) =>
                      setCancelReasonById((prev) => ({
                        ...prev,
                        [flight.id]: event.target.value,
                      }))
                    }
                    placeholder="Cancellation reason (optional)"
                    className="field min-w-[220px]"
                  />
                  <button
                    type="button"
                    onClick={() => void handleCancelFlight(flight.id, cancelReasonById[flight.id])}
                    className="focus-ring inline-flex items-center justify-center rounded-full border border-[var(--danger-500)] bg-[var(--danger-100)] px-4 py-2 text-sm font-semibold text-[var(--danger-700)] transition hover:brightness-95"
                  >
                    Cancel flight
                  </button>
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
