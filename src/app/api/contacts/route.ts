import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  if (!(await getSession())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const contacts = await prisma.cityContact.findMany({ orderBy: [{ sido: "asc" }, { sigungu: "asc" }] });
  return NextResponse.json(contacts);
}

export async function POST(request: NextRequest) {
  if (!(await getSession())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { sido, sigungu, personName, email, phone, department } = body;

    if (!sido?.trim() || !sigungu?.trim() || !personName?.trim() || !email?.trim() || !phone?.trim()) {
      return NextResponse.json({ message: "필수 항목을 모두 입력해주세요." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ message: "올바른 이메일 형식이 아닙니다." }, { status: 400 });
    }

    const contact = await prisma.cityContact.create({
      data: {
        sido: sido.trim(),
        sigungu: sigungu.trim(),
        personName: personName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        department: department?.trim() || null,
      },
    });
    return NextResponse.json(contact, { status: 201 });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002") {
      return NextResponse.json({ message: "해당 시/군/구 담당자가 이미 존재합니다." }, { status: 409 });
    }
    return NextResponse.json({ message: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
