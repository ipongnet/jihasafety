import { NextRequest, NextResponse } from "next/server";
import { findContact } from "@/lib/city-matcher";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sido = searchParams.get("sido");
  const sigungu = searchParams.get("sigungu");
  if (!sido || !sigungu) return NextResponse.json({ matchedContact: null, contacts: [] });

  const contact = await findContact(sido, sigungu);

  const contacts = await prisma.cityContact.findMany({
    select: { id: true, sido: true, sigungu: true, personName: true, email: true, phone: true, department: true },
    orderBy: [{ sido: "asc" }, { sigungu: "asc" }],
  });

  return NextResponse.json({
    matchedContact: contact ? { id: contact.id, personName: contact.personName, email: contact.email, department: contact.department } : null,
    contacts,
  });
}
