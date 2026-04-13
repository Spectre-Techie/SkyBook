"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import BoardingPass from "@/components/boarding-pass";

type TicketPayload = {
  bookingReference: string;
  passengerName: string;
  seatNumber: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  flight: {
    flightNumber: string;
    origin: string;
    destination: string;
    departureDateTime: string;
    arrivalDateTime: string;
  };
};

export default function TicketPage() {
  const params = useParams<{ bookingReference: string }>();
  const [ticket, setTicket] = useState<TicketPayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadTicket() {
      try {
        const response = await fetch(`/api/tickets/${params.bookingReference}`, {
          cache: "no-store",
        });

        const payload = (await response.json()) as { data?: TicketPayload; message?: string };
        if (!response.ok || !payload.data) {
          throw new Error(payload.message ?? "Ticket not found.");
        }

        if (mounted) {
          setTicket(payload.data);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load ticket.");
        }
      }
    }

    void loadTicket();

    return () => {
      mounted = false;
    };
  }, [params.bookingReference]);

  if (error) {
    return (
      <div className="card-shell rounded-2xl p-6 text-sm text-danger-600">
        {error}
      </div>
    );
  }

  if (!ticket) {
    return <div className="card-shell rounded-2xl p-6">Loading ticket...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <div className="ticket-page-header card-shell rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Ticket Portal</p>
            <h1 className="mt-1 text-2xl font-bold text-text-default">{ticket.bookingReference}</h1>
            {ticket.status === "PENDING" ? (
              <p className="mt-1 text-xs text-[var(--warning-700)]">
                Status is pending. Admin approval can finalize this booking if webhook confirmation is delayed.
              </p>
            ) : null}
          </div>

          <div className="flex gap-2">
            <Link href="/dashboard" className="btn-secondary">
              Dashboard
            </Link>
            <Link href="/search" className="btn-secondary">
              Search flights
            </Link>
          </div>
        </div>
      </div>

      <BoardingPass
        bookingReference={ticket.bookingReference}
        flightNumber={ticket.flight.flightNumber}
        origin={ticket.flight.origin}
        destination={ticket.flight.destination}
        departure={new Date(ticket.flight.departureDateTime)}
        arrival={new Date(ticket.flight.arrivalDateTime)}
        seatNumber={ticket.seatNumber}
        passengerName={ticket.passengerName}
        ticketNumber={`${ticket.flight.flightNumber}-${ticket.bookingReference}`}
        status={ticket.status}
      />
    </div>
  );
}
