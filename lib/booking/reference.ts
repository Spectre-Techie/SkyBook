import { customAlphabet } from "nanoid";

const refAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const refGenerator = customAlphabet(refAlphabet, 6);

export function generateBookingReference(): string {
  return refGenerator();
}
