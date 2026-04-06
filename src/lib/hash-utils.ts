import crypto from "crypto";

export function computeSHA256(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function verifySHA256(buffer: Buffer, expectedHex: string): boolean {
  return computeSHA256(buffer) === expectedHex.trim().toLowerCase();
}
