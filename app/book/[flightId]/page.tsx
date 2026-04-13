"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { normalizeSeatInput } from "@/lib/bookings/seat";

type Flight = {
  id: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureDateTime: string;
  arrivalDateTime: string;
  availableSeats: number;
  pricePerSeat: number;
  totalSeats: number;
  bookedSeats: number;
};

type SessionPayload = {
  authenticated: boolean;
  user: {
    role: "PASSENGER" | "ADMIN";
  } | null;
};

export default function BookFlightPage() {
  const params = useParams<{ flightId: string }>();
  const flightId = params.flightId;

  const [flight, setFlight] = useState<Flight | null>(null);
  const [seatNumber, setSeatNumber] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [canBook, setCanBook] = useState(false);

  const normalizedSeatNumber = normalizeSeatInput(seatNumber);

  useEffect(() => {
    let mounted = true;

    async function loadPage() {
      try {
        const [flightRes, sessionRes] = await Promise.all([
          fetch(`/api/flights/${flightId}`, { cache: "no-store" }),
          fetch("/api/auth/session", { cache: "no-store" }),
        ]);

        const sessionPayload = (await sessionRes.json()) as SessionPayload;
        if (mounted) {
          setCanBook(sessionPayload.authenticated && sessionPayload.user?.role === "PASSENGER");
        }

        const flightPayload = (await flightRes.json()) as { data?: Flight; message?: string };
        if (!flightRes.ok || !flightPayload.data) {
          throw new Error(flightPayload.message ?? "Flight not found.");
        }

        if (mounted) {
          setFlight(flightPayload.data);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load flight.");
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
  }, [flightId]);

  async function handleBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBooking(true);
    setError("");

    const normalized = normalizeSeatInput(seatNumber);
    if (!normalized) {
      setError("Seat must be like 12A or a seat number like 2.");
      setBooking(false);
      return;
    }

    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          flightId,
          seatNumber: normalized,
        }),
      });

      const payload = (await response.json()) as {
        sessionId?: string;
        sessionUrl?: string;
        bookingId?: string;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message ?? "Failed to initialize checkout");
      }

      if (payload.sessionUrl) {
        window.location.assign(payload.sessionUrl);
        return;
      }

      throw new Error("Unable to start payment session.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to complete booking";
      setError(message);
    } finally {
      setBooking(false);
    }
  }

  if (loading) {
    return <div className="card-shell rounded-lg p-6 text-center">Loading flight details...</div>;
  }

  if (!flight) {
    return (
      <div className="card-shell rounded-lg p-6 text-sm text-danger-600">
        {error || "Flight could not be loaded."}
      </div>
    );
  }

  const availableSeats = flight.totalSeats - flight.bookedSeats;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* Flight Info */}
      <section className="card-shell-luxury rounded-xl p-8 border-t-4">
        <h1 className="mb-2 text-3xl font-bold text-text-default">Select Your Seat</h1>
        <p className="text-text-muted">Flight {flight.flightNumber} • {flight.origin} → {flight.destination}</p>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-text-muted">Departure</p>
            <p className="font-semibold text-text-default">{new Date(flight.departureDateTime).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-text-muted">Arrival</p>
            <p className="font-semibold text-text-default">{new Date(flight.arrivalDateTime).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-text-muted">Available Seats</p>
            <p className="font-semibold text-[var(--success-700)]">{availableSeats} / {flight.totalSeats}</p>
          </div>
          <div>
            <p className="text-text-muted">Price per Seat</p>
            <p className="font-semibold text-[var(--primary-700)]">${flight.pricePerSeat.toFixed(2)}</p>
          </div>
        </div>
      </section>

      {!canBook ? (
        <section className="card-shell rounded-lg p-6 text-center">
          <p className="text-text-muted mb-4">You need a passenger account to book this flight.</p>
          <Link href="/auth/login" className="btn-primary inline-block">
            Sign In
          </Link>
        </section>
      ) : (
        <form onSubmit={handleBooking} className="space-y-6">
          {/* Seat Selection */}
          <section className="card-shell rounded-lg p-6">
            <h2 className="text-lg font-bold text-text-default mb-6">Choose Your Seat</h2>
            <input
              type="text"
              value={seatNumber}
              onChange={(e) => setSeatNumber(e.target.value.replace(/\s+/g, "").toUpperCase())}
              placeholder="e.g., 12A or 2"
              className="field w-full"
            />
            <p className="mt-2 text-xs text-text-muted">
              You can enter seat labels like 12A, or a numeric seat index like 2.
            </p>
            {seatNumber && !normalizedSeatNumber ? (
              <p className="mt-2 text-xs text-danger-600">Invalid seat format.</p>
            ) : null}
          </section>

          {/* Error Display */}
          {error && (
            <div className="alert-danger p-4 rounded-lg text-sm">{error}</div>
          )}

          {/* Booking Summary */}
          {normalizedSeatNumber && (
            <section className="card-shell rounded-lg border border-[var(--success-700)]/40 bg-[var(--success-100)] p-6">
              <h3 className="mb-2 font-semibold text-[var(--success-700)]">Booking Summary</h3>
              <div className="space-y-1 text-sm">
                <p>Seat: <span className="font-mono font-bold">{normalizedSeatNumber}</span></p>
                <p>Price: <span className="font-bold">${flight.pricePerSeat.toFixed(2)}</span></p>
              </div>
            </section>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={booking || !normalizedSeatNumber}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {booking ? "Processing..." : "Continue to Payment"}
          </button>
        </form>
      )}
    </div>
  );
}
