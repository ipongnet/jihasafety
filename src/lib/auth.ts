import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const SESSION_DURATION_MS = 2 * 60 * 60 * 1000; // 2시간

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET이 설정되지 않았습니다.");
  return secret;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function createToken(expiresAt: number): string {
  const payload = String(expiresAt);
  return `${payload}.${sign(payload)}`;
}

function verifyToken(token: string): boolean {
  const dotIndex = token.lastIndexOf(".");
  if (dotIndex === -1) return false;
  const payload = token.slice(0, dotIndex);
  const signature = token.slice(dotIndex + 1);
  const expected = sign(payload);
  try {
    if (!crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"))) return false;
  } catch {
    return false;
  }
  return Date.now() < parseInt(payload, 10);
}

export async function verifyPassword(password: string): Promise<boolean> {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

export function createSession(): string {
  return createToken(Date.now() + SESSION_DURATION_MS);
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: SESSION_DURATION_MS / 1000,
    path: "/",
  });
}

export async function getSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return false;
  return verifyToken(token);
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}
