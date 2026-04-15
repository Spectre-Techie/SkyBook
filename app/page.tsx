'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AirplaneInFlight,
  AirplaneTakeoff,
  Armchair,
  ArrowRight,
  Compass,
  CreditCard,
  GlobeHemisphereWest,
  MagnifyingGlass,
  MapPinLine,
  ShieldCheck,
  Ticket,
  TrendUp,
} from '@phosphor-icons/react';

import {
  formatAirportLabel,
  getAirportDirectory,
  resolveAirportCode,
} from '@/lib/reference/airport-labels';
import { AirportCombobox } from '@/components/ui/airport-combobox';

const iataExamples = ['LOS', 'NBO', 'LHR', 'DXB', 'JFK', 'CDG'];

const highlights = [
  {
    icon: GlobeHemisphereWest,
    title: 'Route Network Coverage',
    desc: 'Multi-region availability with transparent schedules and seat inventory.',
  },
  {
    icon: TrendUp,
    title: 'Clear Fare Visibility',
    desc: 'See seat price, route details, and booking status in one flow.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure Checkout Pipeline',
    desc: 'Reliable payment confirmation and idempotent ticket fulfillment.',
  },
];

const bookingFlow = [
  {
    icon: MagnifyingGlass,
    title: 'Search by Route',
    desc: 'Use airport IATA codes and departure date to find active flights.',
  },
  {
    icon: Armchair,
    title: 'Choose Seat',
    desc: 'Pick a seat with real-time availability checks before checkout.',
  },
  {
    icon: CreditCard,
    title: 'Complete Payment',
    desc: 'Stripe checkout confirms payment and protects against duplicates.',
  },
  {
    icon: Ticket,
    title: 'Receive Ticket',
    desc: 'Track reference, booking status, and trip details on your dashboard.',
  },
];

const destinationCards = [
  { city: 'Lagos', code: 'LOS', route: 'Coastal hub and business corridor' },
  { city: 'Nairobi', code: 'NBO', route: 'East Africa gateway and safari routes' },
  { city: 'London', code: 'LHR', route: 'Intercontinental connections and finance' },
  { city: 'Dubai', code: 'DXB', route: 'Middle East transfer and premium transit' },
  { city: 'Paris', code: 'CDG', route: 'European rail-air integration and tourism' },
];

export default function LandingPage() {
  const router = useRouter();
  const today = new Date().toISOString().split('T')[0];
  const [origin, setOrigin] = useState(formatAirportLabel('LOS'));
  const [destination, setDestination] = useState(formatAirportLabel('NBO'));
  const [date, setDate] = useState(today);
  const [searchError, setSearchError] = useState('');
  const airportDirectory = useMemo(() => getAirportDirectory(), []);

  function handleQuickSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchError('');

    const originCode = resolveAirportCode(origin);
    const destinationCode = resolveAirportCode(destination);

    if (!originCode || !destinationCode) {
      setSearchError('Enter valid airports. Example: Lagos (LOS), Nairobi (NBO), or LOS/NBO.');
      return;
    }

    if (originCode === destinationCode) {
      setSearchError('Origin and destination must be different.');
      return;
    }

    setOrigin(formatAirportLabel(originCode));
    setDestination(formatAirportLabel(destinationCode));

    const query = new URLSearchParams({
      origin: originCode,
      destination: destinationCode,
      date,
    });

    router.push(`/search?${query.toString()}`);
  }

  return (
    <div className="page-atmosphere space-y-14 pb-12 sm:space-y-16">
      <section className="hero-frame reveal-up rounded-[2rem]">
        <Image
          src="/aviation-horizon.svg"
          alt="Abstract aviation horizon"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(4,10,18,0.82)_0%,rgba(4,10,18,0.62)_44%,rgba(4,10,18,0.25)_100%)]" />

        <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.12fr_0.88fr] lg:gap-10 lg:p-10">
          <div className="space-y-6 text-white">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-slate-100">
              <AirplaneTakeoff size={15} weight="bold" />
              Flight Planning Workspace
            </p>

            <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Book Routes With a Clear, Reliable Flow
            </h1>

            <p className="max-w-xl text-sm text-slate-100 sm:text-base">
              SkyBook helps you search by airport code, review real seat availability, and complete payment
              with booking protection built into each step.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link href="/search" className="btn-primary inline-flex items-center gap-2 px-6 py-3">
                Start search
                <ArrowRight size={16} weight="bold" />
              </Link>
              <Link
                href="/dashboard"
                className="focus-ring inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Open dashboard
              </Link>
            </div>

            <div className="grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-200">Search</p>
                <p className="mt-1 text-sm font-semibold text-white">City, airport, or IATA</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-200">Payments</p>
                <p className="mt-1 text-sm font-semibold text-white">Stripe checkout</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-200">Bookings</p>
                <p className="mt-1 text-sm font-semibold text-white">Live status updates</p>
              </div>
            </div>
          </div>

          <div className="reveal-up-delay-1 card-shell rounded-3xl border-white/20 bg-white/95 p-6 sm:p-7">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-default">Quick route search</h2>
              <Compass size={18} weight="duotone" className="text-[var(--primary-600)]" />
            </div>

            <form onSubmit={handleQuickSearch} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <AirportCombobox
                  id="home-origin"
                  label="Origin city or airport"
                  value={origin}
                  onChange={setOrigin}
                  options={airportDirectory}
                  placeholder={formatAirportLabel('LOS')}
                  required
                />

                <AirportCombobox
                  id="home-destination"
                  label="Destination city or airport"
                  value={destination}
                  onChange={setDestination}
                  options={airportDirectory}
                  placeholder={formatAirportLabel('NBO')}
                  required
                />
              </div>

              <label className="space-y-1.5 text-sm text-text-muted" htmlFor="home-date">
                Departure date
                <input
                  id="home-date"
                  className="field"
                  type="date"
                  min={today}
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  required
                />
              </label>

              {searchError ? (
                <p className="alert-danger text-sm">{searchError}</p>
              ) : null}

              <div className="rounded-xl border border-border-default bg-surface-muted px-4 py-3 text-xs text-text-muted">
                Type city, airport, or IATA code. Try one of these examples:
                <div className="mt-2 flex flex-wrap gap-2">
                  {iataExamples.map((code) => (
                    <span
                      key={code}
                      className="rounded-full border border-border-default bg-surface-raised px-2.5 py-1 font-mono text-[11px] font-semibold text-text-default"
                    >
                      {formatAirportLabel(code)}
                    </span>
                  ))}
                </div>
              </div>

              <button type="submit" className="btn-primary inline-flex w-full items-center justify-center gap-2 py-3">
                Continue to search
                <ArrowRight size={16} weight="bold" />
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="reveal-up-delay-1 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {highlights.map((item) => {
          const Icon = item.icon;

          return (
            <article key={item.title} className="card-shell rounded-2xl p-5 sm:p-6">
              <div className="inline-flex rounded-xl bg-[var(--primary-50)] p-2.5 text-[var(--primary-700)]">
                <Icon size={22} weight="duotone" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-text-default">{item.title}</h3>
              <p className="mt-2 text-sm text-text-muted">{item.desc}</p>
            </article>
          );
        })}
      </section>

      <section className="reveal-up-delay-2 card-shell rounded-3xl p-6 sm:p-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-text-default sm:text-3xl">Booking flow at a glance</h2>
            <p className="mt-2 text-sm text-text-muted">
              Every stage is optimized for clarity on desktop and mobile screens.
            </p>
          </div>
          <Link href="/search" className="btn-secondary inline-flex items-center gap-2">
            Open flight search
            <ArrowRight size={14} weight="bold" />
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {bookingFlow.map((step, index) => {
            const Icon = step.icon;

            return (
              <article key={step.title} className="rounded-2xl border border-border-default bg-surface-muted p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary-500)] text-xs font-bold text-[var(--primary-contrast)]">
                    {index + 1}
                  </span>
                  <Icon size={20} weight="duotone" className="text-[var(--primary-700)]" />
                </div>
                <h3 className="text-base font-semibold text-text-default">{step.title}</h3>
                <p className="mt-2 text-sm text-text-muted">{step.desc}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="reveal-up-delay-2 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {destinationCards.map((destinationCard) => (
          <article
            key={destinationCard.code}
            className="card-shell rounded-2xl border-transparent bg-[linear-gradient(180deg,var(--surface-raised)_0%,var(--surface-muted)_100%)] p-5"
          >
            <div className="inline-flex rounded-lg bg-[var(--primary-50)] p-2 text-[var(--primary-700)]">
              <MapPinLine size={18} weight="duotone" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-text-default">{destinationCard.city}</h3>
            <p className="mt-1 font-mono text-xs font-bold tracking-[0.2em] text-[var(--primary-600)]">
              {destinationCard.code}
            </p>
            <p className="mt-3 text-sm text-text-muted">{destinationCard.route}</p>
          </article>
        ))}
      </section>

      <section className="hero-frame reveal-up rounded-3xl">
        <Image src="/aviation-grid.svg" alt="Abstract route map" fill className="object-cover" />
        <div className="absolute inset-0 bg-[var(--color-overlay-dark)]" />

        <div className="relative flex flex-col gap-6 p-6 text-white sm:p-8 lg:flex-row lg:items-end lg:justify-between lg:p-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-200">Ready for your next route</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">
              Search flights, compare seat availability, and lock your itinerary in minutes.
            </h2>
          </div>

          <Link href="/search" className="btn-primary inline-flex items-center gap-2 self-start px-7 py-3 lg:self-auto">
            <AirplaneInFlight size={18} weight="duotone" />
            Plan a trip
          </Link>
        </div>
      </section>
    </div>
  );
}
