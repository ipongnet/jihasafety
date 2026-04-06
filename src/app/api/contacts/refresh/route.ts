/**
 * GET /api/contacts/refresh
 * EngineJiha가 담당자 동기화 후 호출.
 * contacts.json → JihaSafety DB (CityContact + Department) 동기화.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchContactsJson, invalidateContactsCache } from "@/lib/contacts-client";

export async function GET(request: NextRequest) {
  const pingKey = process.env.PING_API_KEY;
  if (pingKey) {
    const auth = request.headers.get("Authorization");
    if (auth !== `Bearer ${pingKey}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // 캐시 무효화 후 최신 contacts.json 가져오기
  invalidateContactsCache();
  const json = await fetchContactsJson();
  if (!json) {
    return NextResponse.json({ ok: true, synced: false, reason: "contacts.json 없음" });
  }

  // Department 동기화: 기존 전부 삭제 → 새로 삽입
  await prisma.department.deleteMany();
  for (const d of json.departments) {
    await prisma.department.create({
      data: { id: d.id, name: d.name, parentId: d.parentId },
    });
  }

  // CityContact 동기화: upsert (sido+sigungu 기준)
  let upserted = 0;
  for (const c of json.contacts) {
    await prisma.cityContact.upsert({
      where: { sido_sigungu: { sido: c.sido, sigungu: c.sigungu } },
      create: {
        sido: c.sido,
        sigungu: c.sigungu,
        personName: c.personName,
        email: c.email,
        phone: c.phone,
        department: c.department,
      },
      update: {
        personName: c.personName,
        email: c.email,
        phone: c.phone,
        department: c.department,
      },
    });
    upserted++;
  }

  // EngineJiha에 없는 담당자 삭제 (sido+sigungu 기준)
  const syncKeys = new Set(json.contacts.map((c) => `${c.sido}\0${c.sigungu}`));
  const allContacts = await prisma.cityContact.findMany({ select: { id: true, sido: true, sigungu: true } });
  const toDelete = allContacts.filter((c) => !syncKeys.has(`${c.sido}\0${c.sigungu}`));
  if (toDelete.length > 0) {
    await prisma.cityContact.deleteMany({
      where: { id: { in: toDelete.map((c) => c.id) } },
    });
  }

  return NextResponse.json({
    ok: true,
    synced: true,
    contacts: upserted,
    departments: json.departments.length,
    deleted: toDelete.length,
  });
}
