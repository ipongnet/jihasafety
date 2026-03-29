import { NextRequest, NextResponse } from "next/server";
import { findContact } from "@/lib/city-matcher";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sido = searchParams.get("sido");
  const sigungu = searchParams.get("sigungu");
  if (!sido || !sigungu) return NextResponse.json({ exists: false, contacts: [] });

  const contact = await findContact(sido, sigungu);
  if (contact) {
    return NextResponse.json({ exists: true });
  }

  // 담당자 미등록 → 전체 담당자 목록 반환 (선택용)
  const contacts = await prisma.cityContact.findMany({
    select: { id: true, sido: true, sigungu: true, personName: true, email: true, phone: true, department: true },
    orderBy: [{ sido: "asc" }, { sigungu: "asc" }],
  });
  return NextResponse.json({ exists: false, contacts });
}
