/**
 * GET /api/contacts/refresh
 * EngineJiha가 담당자 동기화 후 캐시 무효화 핑을 보내는 엔드포인트.
 * Authorization: Bearer {PING_API_KEY} 필요.
 */
import { NextRequest, NextResponse } from "next/server";
import { invalidateContactsCache } from "@/lib/contacts-client";

export async function GET(request: NextRequest) {
  const pingKey = process.env.PING_API_KEY;
  if (pingKey) {
    const auth = request.headers.get("Authorization");
    if (auth !== `Bearer ${pingKey}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  invalidateContactsCache();
  return NextResponse.json({ ok: true });
}
