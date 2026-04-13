const SEAT_LETTERS = ["A", "B", "C", "D", "E", "F"] as const;
const ALPHA_SEAT_REGEX = /^([1-9]\d{0,2})([A-F])$/;
const NUMERIC_SEAT_REGEX = /^[1-9]\d{0,3}$/;

export function normalizeSeatInput(input: string): string | null {
  const value = input.trim().toUpperCase();

  const alphaMatch = value.match(ALPHA_SEAT_REGEX);
  if (alphaMatch) {
    const row = Number(alphaMatch[1]);
    const letter = alphaMatch[2];
    return `${row}${letter}`;
  }

  if (!NUMERIC_SEAT_REGEX.test(value)) {
    return null;
  }

  const index = Number(value);
  if (!Number.isFinite(index) || index < 1) {
    return null;
  }

  const row = Math.ceil(index / SEAT_LETTERS.length);
  if (row > 999) {
    return null;
  }

  const columnIndex = (index - 1) % SEAT_LETTERS.length;
  const letter = SEAT_LETTERS[columnIndex];
  return `${row}${letter}`;
}

export function seatCodeToIndex(seatCode: string): number | null {
  const normalized = normalizeSeatInput(seatCode);
  if (!normalized) {
    return null;
  }

  const match = normalized.match(ALPHA_SEAT_REGEX);
  if (!match) {
    return null;
  }

  const row = Number(match[1]);
  const letter = match[2];
  const column = SEAT_LETTERS.indexOf(letter as (typeof SEAT_LETTERS)[number]);

  if (column < 0) {
    return null;
  }

  return (row - 1) * SEAT_LETTERS.length + column + 1;
}

export function isSeatWithinCapacity(seatCode: string, totalSeats: number): boolean {
  const index = seatCodeToIndex(seatCode);
  if (index === null) {
    return false;
  }

  return totalSeats >= 1 && index <= totalSeats;
}
