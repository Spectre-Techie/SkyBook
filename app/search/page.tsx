"use client";

import {
  AirplaneInFlight,
  AirplaneTakeoff,
  ArrowsLeftRight,
  ArrowRight,
  CalendarBlank,
  Clock,
  MagnifyingGlass,
  MapPinLine,
} from "@phosphor-icons/react";
import Link from "next/link";
import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Flight = {
  id: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureDateTime: string;
  arrivalDateTime: string;
  totalSeats: number;
  bookedSeats: number;
  pricePerSeat: number;
  availableSeats: number;
  status: "ACTIVE" | "CANCELLED" | "COMPLETED";
};

type FlightResponse = {
  data: Flight[];
  message?: string;
};

type RouteRecommendation = {
  airlineName: string | null;
  airlineIata: string | null;
  flightNumber: string | null;
  depIata: string;
  arrIata: string;
};

type RouteRecommendationResponse = {
  source?: string;
  data?: RouteRecommendation[];
  warning?: string;
  message?: string;
};

const iataExamples = ["LOS", "NBO", "DXB", "LHR", "JFK", "CDG"];

function normalizeIata(value: string): string {
  return value.trim().toUpperCase().slice(0, 3);
}

function seatUsageWidthClass(percent: number): string {
  if (percent >= 96) return "w-full";
  if (percent >= 88) return "w-11/12";
  if (percent >= 80) return "w-10/12";
  if (percent >= 72) return "w-9/12";
  if (percent >= 64) return "w-8/12";
  if (percent >= 56) return "w-7/12";
  if (percent >= 48) return "w-6/12";
  if (percent >= 40) return "w-5/12";
  if (percent >= 32) return "w-4/12";
  if (percent >= 24) return "w-3/12";
  if (percent >= 16) return "w-2/12";
  if (percent >= 8) return "w-1/12";

  return "w-[4%]";
}

function tomorrowIsoDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

export default function SearchPage() {
  const [origin, setOrigin] = useState("LOS");
  const [destination, setDestination] = useState("NBO");
  const [date, setDate] = useState(tomorrowIsoDate);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [flights, setFlights] = useState<Flight[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeRouteLabel, setActiveRouteLabel] = useState("");
  const [recommendedFlights, setRecommendedFlights] = useState<Flight[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);
  const [recommendationsError, setRecommendationsError] = useState("");
  const [routeRecommendations, setRouteRecommendations] = useState<RouteRecommendation[]>([]);
  const [routeRecommendationsWarning, setRouteRecommendationsWarning] = useState("");

  const minDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const queryOrigin = normalizeIata(params.get("origin") ?? "");
    const queryDestination = normalizeIata(params.get("destination") ?? "");
    const queryDate = params.get("date");

    const nextOrigin = queryOrigin.length === 3 ? queryOrigin : null;
    const nextDestination = queryDestination.length === 3 ? queryDestination : null;
    const nextDate = queryDate && /^\d{4}-\d{2}-\d{2}$/.test(queryDate) ? queryDate : null;

    if (!nextOrigin || !nextDestination || !nextDate) {
      return;
    }

    setOrigin(nextOrigin);
    setDestination(nextDestination);
    setDate(nextDate);
    void runSearch(nextOrigin, nextDestination, nextDate);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadRecommendedFlights() {
      setRecommendationsLoading(true);
      setRecommendationsError("");

      try {
        const response = await fetch("/api/flights", { cache: "no-store" });
        const payload = (await response.json()) as FlightResponse;

        if (!active) {
          return;
        }

        if (!response.ok) {
          setRecommendedFlights([]);
          setRecommendationsError(payload.message ?? "Unable to load recommended flights.");
          return;
        }

        setRecommendedFlights((payload.data ?? []).slice(0, 6));
      } catch {
        if (active) {
          setRecommendedFlights([]);
          setRecommendationsError("Unable to load recommended flights right now.");
        }
      } finally {
        if (active) {
          setRecommendationsLoading(false);
        }
      }
    }

    void loadRecommendedFlights();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hasSearched || flights.length > 0) {
      setRouteRecommendations([]);
      setRouteRecommendationsWarning("");
      return;
    }

    const depIata = normalizeIata(origin);
    if (depIata.length !== 3) {
      setRouteRecommendations([]);
      setRouteRecommendationsWarning("");
      return;
    }

    let active = true;

    async function loadRouteRecommendations() {
      try {
        const query = new URLSearchParams({
          depIata,
          limit: "6",
        });

        const response = await fetch(`/api/reference/routes?${query.toString()}`, {
          cache: "no-store",
        });

        const payload = (await response.json()) as RouteRecommendationResponse;

        if (!active) {
          return;
        }

        if (!response.ok) {
          setRouteRecommendations([]);
          return;
        }

        setRouteRecommendations((payload.data ?? []).filter((route) => route.arrIata !== depIata));
        setRouteRecommendationsWarning(payload.warning ?? "");
      } catch {
        if (active) {
          setRouteRecommendations([]);
        }
      }
    }

    void loadRouteRecommendations();

    return () => {
      active = false;
    };
  }, [flights.length, hasSearched, origin]);

  async function runSearch(nextOrigin: string, nextDestination: string, nextDate: string) {
    setLoading(true);
    setError("");
    setHasSearched(true);

    const routeOrigin = normalizeIata(nextOrigin);
    const routeDestination = normalizeIata(nextDestination);

    if (routeOrigin.length !== 3 || routeDestination.length !== 3) {
      setError("Airport codes must be 3 letters. Example: LOS, NBO, DXB.");
      setFlights([]);
      setLoading(false);
      return;
    }

    try {
      const query = new URLSearchParams({
        origin: routeOrigin,
        destination: routeDestination,
        date: nextDate,
      });

      const response = await fetch(`/api/flights/search?${query.toString()}`, {
        cache: "no-store",
      });

      const payload = (await response.json()) as FlightResponse & { message?: string };

      if (!response.ok) {
        setError(payload.message ?? "Unable to search flights.");
        setFlights([]);
        setActiveRouteLabel(`${routeOrigin} to ${routeDestination}`);
        return;
      }

      setFlights(payload.data ?? []);
      setActiveRouteLabel(`${routeOrigin} to ${routeDestination}`);
    } catch {
      setError("Network error while searching flights.");
      setFlights([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runSearch(origin, destination, date);
  }

  function handleSwapAirports() {
    setOrigin(destination);
    setDestination(origin);
  }

  const departuresLabel = useMemo(() => {
    if (!activeRouteLabel) {
      return "Recommended routes";
    }

    return `Results for ${activeRouteLabel}`;
  }, [activeRouteLabel]);

  return (
    <div className="page-atmosphere space-y-7">
      <section className="hero-frame relative overflow-hidden rounded-3xl border border-border-default">
        <Image
          src="/aviation-grid.svg"
          alt="Abstract route planning grid"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(130deg,rgba(10,30,51,0.9)_0%,rgba(10,30,51,0.82)_55%,rgba(10,30,51,0.6)_100%)]" />

        <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-100">
              <AirplaneTakeoff size={15} weight="bold" />
              Flight Search
            </p>
            <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Find Flights by Airport Code</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-100 sm:text-base">
              Enter three-letter IATA airport codes and a departure date to view active routes and live
              seat availability.
            </p>
          </div>

          <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-slate-100">
            Example format: <span className="font-mono font-semibold">LOS</span> to <span className="font-mono font-semibold">NBO</span>
          </div>
        </div>
      </section>

      <section className="card-shell rounded-3xl p-6 sm:p-7">
        <form onSubmit={handleSearch} className="grid gap-4 lg:grid-cols-[1fr_auto_1fr_1fr_auto] lg:items-end">
          <label className="space-y-2 text-sm text-text-muted" htmlFor="search-origin">
            Origin code
            <input
              id="search-origin"
              className="field"
              maxLength={3}
              value={origin}
              onChange={(event) => setOrigin(normalizeIata(event.target.value))}
              placeholder="LOS"
              required
            />
          </label>

          <div className="flex items-end justify-center pb-1">
            <button
              type="button"
              onClick={handleSwapAirports}
              className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-default bg-surface-raised text-text-muted transition hover:bg-surface-muted hover:text-text-default"
              aria-label="Swap origin and destination"
              title="Swap route"
            >
              <ArrowsLeftRight size={18} weight="bold" />
            </button>
          </div>

          <label className="space-y-2 text-sm text-text-muted" htmlFor="search-destination">
            Destination code
            <input
              id="search-destination"
              className="field"
              maxLength={3}
              value={destination}
              onChange={(event) => setDestination(normalizeIata(event.target.value))}
              placeholder="NBO"
              required
            />
          </label>

          <label className="space-y-2 text-sm text-text-muted" htmlFor="search-date">
            Departure date
            <input
              id="search-date"
              className="field"
              type="date"
              min={minDate}
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </label>

          <button type="submit" className="btn-primary inline-flex w-full items-center justify-center gap-2 py-2.5" disabled={loading}>
            <MagnifyingGlass size={16} weight="bold" />
            {loading ? "Searching..." : "Search"}
          </button>
        </form>

        <div className="mt-4 rounded-xl border border-border-default bg-surface-muted px-4 py-3 text-xs text-text-muted">
          IATA quick list:
          <div className="mt-2 flex flex-wrap gap-2">
            {iataExamples.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setOrigin(code)}
                className="focus-ring rounded-full border border-border-default bg-surface-raised px-2.5 py-1 font-mono font-semibold text-text-default transition hover:bg-surface-base"
                title={`Set origin to ${code}`}
              >
                {code}
              </button>
            ))}
          </div>
        </div>
      </section>

      {error ? <p className="alert-danger text-sm">{error}</p> : null}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-default">{departuresLabel}</h2>
          {hasSearched ? (
            <p className="text-xs uppercase tracking-[0.16em] text-text-muted">{flights.length} option(s)</p>
          ) : null}
        </div>

        {!hasSearched && !loading ? (
          <div className="space-y-3">
            <div className="card-shell rounded-2xl p-6 text-sm text-text-muted">
              Start by entering a route above, or book from currently available flights below.
            </div>

            {recommendationsLoading ? (
              <div className="card-shell animate-pulse rounded-2xl p-6">
                <div className="h-5 w-56 rounded bg-surface-muted" />
                <div className="mt-3 h-4 w-40 rounded bg-surface-muted" />
              </div>
            ) : null}

            {!recommendationsLoading && recommendedFlights.length === 0 ? (
              <div className="card-shell rounded-2xl p-6 text-sm text-text-muted">
                No active flights are published yet.
                {recommendationsError ? <div className="mt-1">{recommendationsError}</div> : null}
              </div>
            ) : null}

            {!recommendationsLoading && recommendedFlights.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-text-default">Available flights you can book now</p>
                {recommendedFlights.map((flight) => (
                  <article key={flight.id} className="card-shell rounded-2xl p-5">
                    <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-text-muted">{flight.flightNumber}</p>
                        <h3 className="mt-1 text-lg font-semibold text-text-default">
                          {flight.origin} to {flight.destination}
                        </h3>
                        <p className="mt-1 text-sm text-text-muted">
                          Departure: {new Date(flight.departureDateTime).toLocaleString()}
                        </p>
                      </div>

                      <Link
                        href={`/book/${flight.id}`}
                        className="btn-secondary inline-flex items-center justify-center gap-2"
                      >
                        <AirplaneInFlight size={16} weight="duotone" />
                        Book flight
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {loading
          ? [1, 2].map((item) => (
              <div key={item} className="card-shell animate-pulse rounded-2xl p-6">
                <div className="h-5 w-40 rounded bg-surface-muted" />
                <div className="mt-3 h-4 w-56 rounded bg-surface-muted" />
                <div className="mt-5 h-3 w-full rounded bg-surface-muted" />
              </div>
            ))
          : null}

        {!loading && hasSearched && flights.length === 0 ? (
          <div className="space-y-3">
            <div className="card-shell rounded-2xl p-6 text-sm text-text-muted">
              No matching flights found for this route and date. Try another airport pair or choose a nearby day.
            </div>

            {routeRecommendations.length > 0 ? (
              <div className="card-shell rounded-2xl p-6">
                <p className="text-sm font-semibold text-text-default">
                  Suggested routes from {normalizeIata(origin)}
                </p>
                {routeRecommendationsWarning ? (
                  <p className="mt-1 text-xs text-text-muted">{routeRecommendationsWarning}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {routeRecommendations.map((route) => (
                    <Link
                      key={`${route.depIata}-${route.arrIata}-${route.flightNumber ?? "NA"}`}
                      href={`/search?origin=${route.depIata}&destination=${route.arrIata}&date=${date}`}
                      className="btn-secondary inline-flex items-center gap-2"
                    >
                      {route.depIata} to {route.arrIata}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            {!recommendationsLoading && recommendedFlights.length > 0 ? (
              <div className="card-shell rounded-2xl p-6">
                <p className="text-sm font-semibold text-text-default">Other available flights</p>
                <div className="mt-3 space-y-2">
                  {recommendedFlights.slice(0, 3).map((flight) => (
                    <div key={flight.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border-default bg-surface-muted p-3">
                      <div>
                        <p className="text-sm font-semibold text-text-default">
                          {flight.origin} to {flight.destination}
                        </p>
                        <p className="text-xs text-text-muted">{flight.flightNumber}</p>
                      </div>
                      <Link href={`/book/${flight.id}`} className="btn-secondary text-xs">
                        Book
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {!loading
          ? flights.map((flight) => {
              const occupancy = Math.round((flight.bookedSeats / flight.totalSeats) * 100);

              return (
                <article key={flight.id} className="card-shell rounded-2xl p-5 sm:p-6">
                  <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full border border-border-default bg-surface-muted px-2.5 py-1 font-semibold text-text-default">
                          {flight.flightNumber}
                        </span>
                        <span className="rounded-full border border-border-default bg-surface-muted px-2.5 py-1 font-semibold text-text-muted">
                          {flight.status}
                        </span>
                      </div>

                      <h3 className="mt-3 text-xl font-semibold text-text-default">
                        {flight.origin} to {flight.destination}
                      </h3>

                      <div className="mt-3 grid gap-2 text-sm text-text-muted sm:grid-cols-2">
                        <p className="inline-flex items-center gap-2">
                          <CalendarBlank size={15} weight="duotone" className="text-[var(--primary-700)]" />
                          Departure: {new Date(flight.departureDateTime).toLocaleString()}
                        </p>
                        <p className="inline-flex items-center gap-2">
                          <Clock size={15} weight="duotone" className="text-[var(--primary-700)]" />
                          Arrival: {new Date(flight.arrivalDateTime).toLocaleString()}
                        </p>
                      </div>

                      <div className="mt-4">
                        <div className="mb-1 flex items-center justify-between text-xs text-text-muted">
                          <span className="inline-flex items-center gap-1">
                            <MapPinLine size={13} weight="duotone" />
                            Seat usage
                          </span>
                          <span>{occupancy}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                          <div
                            className={`h-full rounded-full bg-[linear-gradient(90deg,var(--primary-500),var(--primary-700))] ${seatUsageWidthClass(
                              Math.min(100, Math.max(0, occupancy)),
                            )}`}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border-default bg-surface-muted p-4 text-right">
                      <p className="text-xs uppercase tracking-[0.16em] text-text-muted">Fare per seat</p>
                      <p className="mt-1 text-3xl font-bold text-text-default">${flight.pricePerSeat.toFixed(2)}</p>
                      <p className="mt-1 text-xs text-text-muted">{flight.availableSeats} seats available</p>

                      <Link
                        href={`/book/${flight.id}`}
                        className="btn-primary mt-4 inline-flex w-full items-center justify-center gap-2 py-2.5"
                      >
                        Continue booking
                        <ArrowRight size={15} weight="bold" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })
          : null}
      </section>
    </div>
  );
}
