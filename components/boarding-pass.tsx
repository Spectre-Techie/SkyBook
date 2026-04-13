'use client';

import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { AirplaneInFlight, Download, Printer } from '@phosphor-icons/react';

interface BoardingPassProps {
  bookingReference: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departure: Date;
  arrival: Date;
  seatNumber: string;
  passengerName: string;
  ticketNumber: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
}

export default function BoardingPass({
  bookingReference,
  flightNumber,
  origin,
  destination,
  departure,
  arrival,
  seatNumber,
  passengerName,
  ticketNumber,
  status,
}: BoardingPassProps) {
  const ticketRef = useRef<HTMLDivElement>(null);

  const statusTone =
    status === 'CONFIRMED'
      ? 'bg-[var(--success-100)] text-[var(--success-700)]'
      : status === 'PENDING'
      ? 'bg-[var(--warning-100)] text-[var(--warning-700)]'
      : status === 'CANCELLED'
      ? 'bg-[var(--danger-100)] text-[var(--danger-700)]'
      : 'bg-[var(--primary-50)] text-[var(--primary-700)]';

  const downloadPDF = async () => {
    if (!ticketRef.current) {
      return;
    }

    try {
      const canvas = await html2canvas(ticketRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const margin = 8;
      const renderWidth = pageWidth - margin * 2;
      const renderHeight = (canvas.height * renderWidth) / canvas.width;

      pdf.addImage(
        imgData,
        'PNG',
        margin,
        margin,
        renderWidth,
        Math.min(renderHeight, pageHeight - margin * 2),
      );
      pdf.save(`boarding-pass-${bookingReference}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const departTime = new Date(departure);
  const arriveTime = new Date(arrival);

  return (
    <div className="space-y-6">
      <div className="ticket-actions flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={downloadPDF}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Download size={18} weight="bold" />
          Download PDF
        </button>
        <button
          type="button"
          onClick={handlePrint}
          className="btn-secondary inline-flex items-center gap-2"
        >
          <Printer size={18} weight="bold" />
          Print
        </button>
      </div>

      <div
        ref={ticketRef}
        className="ticket-print-surface mx-auto max-w-3xl overflow-hidden rounded-3xl border border-border-default bg-surface-raised shadow-[var(--shadow-md)]"
      >
        <div className="bg-[linear-gradient(120deg,var(--color-primary-rich)_0%,var(--primary-600)_100%)] px-6 py-7 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#d7e6f6]">SkyBook E-Ticket</p>
              <h1 className="mt-2 text-2xl font-bold text-[#ffffff] sm:text-3xl">Boarding Pass</h1>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${statusTone}`}>
              {status}
            </span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[#d7e6f6]">Passenger</p>
              <p className="mt-1 text-lg font-semibold text-[#ffffff] sm:text-xl">{passengerName}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[#d7e6f6]">Booking reference</p>
              <p className="mt-1 font-mono text-xl font-bold text-[#ffffff]">{bookingReference}</p>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="grid gap-4 border-b border-border-default pb-6 sm:grid-cols-2 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-text-muted">From</p>
              <p className="mt-1 text-2xl font-bold text-text-default">{origin}</p>
              <p className="mt-1 text-sm text-text-muted">{departTime.toLocaleDateString()}</p>
              <p className="text-sm font-semibold text-text-default">
                {departTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            <div className="inline-flex h-11 w-11 items-center justify-center self-center rounded-full border border-border-default bg-surface-muted text-[var(--primary-700)]">
              <AirplaneInFlight size={20} weight="duotone" />
            </div>

            <div className="text-left lg:text-right">
              <p className="text-xs uppercase tracking-[0.16em] text-text-muted">To</p>
              <p className="mt-1 text-2xl font-bold text-text-default">{destination}</p>
              <p className="mt-1 text-sm text-text-muted">{arriveTime.toLocaleDateString()}</p>
              <p className="text-sm font-semibold text-text-default">
                {arriveTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-text-muted">Flight</p>
              <p className="mt-1 font-mono text-lg font-bold text-text-default">{flightNumber}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-text-muted">Seat</p>
              <p className="mt-1 text-lg font-bold text-[var(--primary-700)]">{seatNumber}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-text-muted">Ticket number</p>
              <p className="mt-1 font-mono text-sm font-semibold text-text-default">{ticketNumber}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-text-muted">Booking status</p>
              <p className="mt-1 text-sm font-semibold text-text-default">{status}</p>
            </div>
          </div>

          <div className="mt-7 border-t border-border-default pt-6">
            <div className="mx-auto w-fit rounded-2xl border border-border-default bg-surface-muted p-4">
              <QRCodeSVG
                value={`${process.env.NEXT_PUBLIC_APP_URL || 'https://skybook.app'}/ticket/${bookingReference}`}
                size={150}
                level="H"
                includeMargin={false}
              />
            </div>

            <p className="mt-4 text-center text-xs text-text-muted">
              Present booking reference {bookingReference} at check-in for identity verification.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl rounded-xl border border-border-default bg-surface-muted p-4 text-sm text-text-default">
        <p className="font-semibold">Before your flight</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-text-muted">
          <li>Arrive at the airport 2-3 hours before departure for international flights</li>
          <li>Bring valid identification (passport or ID card)</li>
          <li>Check baggage allowance before proceeding to check-in</li>
          <li>Gate information available 1 hour before departure</li>
        </ul>
      </div>
    </div>
  );
}
