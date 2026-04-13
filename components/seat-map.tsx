'use client';

import React from 'react';

interface SeatMapProps {
  totalSeats: number;
  bookedSeats: string[];
  onSeatSelect: (seat: string) => void;
  selectedSeat?: string;
}

export default function SeatMap({ totalSeats, bookedSeats, onSeatSelect, selectedSeat }: SeatMapProps) {
  const COLS = 6;
  const ROWS = Math.ceil(totalSeats / COLS);
  const bookedSet = new Set(bookedSeats || []);

  const generateSeatNumber = (row: number, col: number): string | null => {
    const seatIndex = row * COLS + col;
    if (seatIndex >= totalSeats) return null;

    const rowNum = row + 1;
    const colLetter = String.fromCharCode(65 + col); // A-F
    return `${rowNum}${colLetter}`;
  };

  const isBooked = (seat: string): boolean => {
    return bookedSet.has(seat);
  };

  return (
    <div className="w-full">
      {/* Legend */}
      <div className="mb-6 flex gap-6 justify-center flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded border-2 border-neutral-300 bg-neutral-100"></div>
          <span className="text-sm text-text-muted">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-neutral-700 cursor-not-allowed"></div>
          <span className="text-sm text-text-muted">Booked</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded border-2 border-[var(--primary-500)] bg-[var(--primary-50)]"></div>
          <span className="text-sm text-text-muted font-semibold">Your Seat</span>
        </div>
      </div>

      {/* Seat Grid */}
      <div className="bg-surface-raised p-6 rounded-lg border border-border-default overflow-x-auto">
        <div className="grid grid-cols-6 place-items-center gap-2">
          {Array.from({ length: ROWS }).map((_, row) =>
            Array.from({ length: COLS }).map((_, col) => {
              const seat = generateSeatNumber(row, col);
              if (!seat) return <div key={`${row}-${col}-empty`}></div>;

              const booked = isBooked(seat);
              const isSelected = selectedSeat === seat;

              return (
                <button
                  key={seat}
                  onClick={() => !booked && onSeatSelect(seat)}
                  disabled={booked}
                  className={`
                    relative w-9 h-9 rounded text-xs font-semibold transition-all
                    ${
                      booked
                        ? 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
                        : isSelected
                          ? 'bg-[var(--primary-50)] border-2 border-[var(--primary-500)] text-[var(--primary-700)] shadow-lg'
                          : 'bg-neutral-100 border-2 border-neutral-300 text-text-default hover:bg-[var(--primary-50)] hover:border-[var(--primary-500)] '
                    }
                  `}
                  title={booked ? 'Seat unavailable' : 'Select seat'}
                >
                  {seat}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Selected Seat Display */}
      {selectedSeat && (
        <div className="mt-4 rounded-md border border-[var(--success-500)] bg-[var(--success-100)] p-3">
          <p className="text-sm font-semibold text-[var(--success-700)]">
            Seat <span className="font-mono text-lg">{selectedSeat}</span> selected
          </p>
        </div>
      )}
    </div>
  );
}
