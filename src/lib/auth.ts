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

/** .env 복붙 시 따옴표·앞뒤 공백·줄바꿈 제거 */
export function normalizeAdminPasswordHash(raw: string | undefined): string | null {
  if (raw == null) return null;
  let h = raw.trim();
  if (h === "") return null;
  if ((h.startsWith('"') && h.endsWith('"')) || (h.startsWith("'") && h.endsWith("'"))) {
    h = h.slice(1, -1).trim();
  }
  return h || null;
}

/** bcrypt 해시인지(평문 비번을 잘못 넣었는지) 빠르게 판별 — 표준 bcrypt 문자열 길이 60 */
export function isBcryptHash(value: string): boolean {
  return value.length === 60 && /^\$2[aby]\$\d{2}\$.{53}$/.test(value);
}

export type AdminHashCheck = "missing" | "not_bcrypt" | "ok";

export function getAdminPasswordHashStatus(): AdminHashCheck {
  const hash = normalizeAdminPasswordHash(process.env.ADMIN_PASSWORD_HASH);
  if (!hash) return "missing";
  if (!isBcryptHash(hash)) return "not_bcrypt";
  return "ok";
}

export async function verifyPassword(password: string): Promise<boolean> {
  const hash = normalizeAdminPasswordHash(process.env.ADMIN_PASSWORD_HASH);
  if (!hash) return false;
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

export function createSession(): string {
  return createToken(Date.now() + SESSION_DURATION_MS);
}

export const SESSION_COOKIE_NAME = "session";

/** Route Handler의 NextResponse.cookies에 붙일 때와 동일한 옵션 */
export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: SESSION_DURATION_MS / 1000,
    path: "/",
  };
}

export async function getSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return false;
  return verifyToken(token);
}
