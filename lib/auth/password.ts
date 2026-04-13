import { compare, hash } from "bcryptjs";

const BCRYPT_ROUNDS = 12;

export async function hashPassword(rawPassword: string): Promise<string> {
  return hash(rawPassword, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  rawPassword: string,
  passwordHash: string,
): Promise<boolean> {
  return compare(rawPassword, passwordHash);
}
