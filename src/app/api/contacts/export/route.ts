/**
 * GET /api/contacts/export
 * JihaSafety DB의 CityContact 전체를 EngineJiha CSV 포맷으로 내보내기.
 * 관리자 인증 필요. EngineJiha /api/contacts/import에 그대로 업로드 가능한 형식.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  if (!(await getSession())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const contacts = await prisma.cityContact.findMany({
    orderBy: [{ sido: "asc" }, { sigungu: "asc" }],
  });

  const BOM = "\uFEFF";
  const header = "sido,sigungu,personName,email,phone,department";
  const rows = contacts.map((c) =>
    [c.sido, c.sigungu, c.personName, c.email, c.phone, c.department ?? ""]
      .map((v) => (v.includes(",") || v.includes('"') || v.includes("\n") ? `"${v.replace(/"/g, '""')}"` : v))
      .join(",")
  );
  const csv = BOM + [header, ...rows].join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="jihasafety_contacts_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
