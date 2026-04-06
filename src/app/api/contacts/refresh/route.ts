/**
 * GET /api/contacts/refresh
 * EngineJiha가 담당자 동기화 후 캐시 무효화 핑을 보내는 엔드포인트.
 */
import { NextResponse } from "next/server";
import { invalidateContactsCache } from "@/lib/contacts-client";

export async function GET() {
  invalidateContactsCache();
  return NextResponse.json({ ok: true });
}
