import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSession())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const numId = parseInt(id);
  if (isNaN(numId)) return NextResponse.json({ message: "Invalid id" }, { status: 400 });

  try {
    const body = await request.json();
    const { sido, sigungu, personName, email, phone, department } = body;

    if (!sido?.trim() || !sigungu?.trim() || !personName?.trim() || !email?.trim() || !phone?.trim()) {
      return NextResponse.json({ message: "필수 항목을 모두 입력해주세요." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ message: "올바른 이메일 형식이 아닙니다." }, { status: 400 });
    }

    const contact = await prisma.cityContact.update({
      where: { id: numId },
      data: {
        sido: sido.trim(),
        sigungu: sigungu.trim(),
        personName: personName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        department: department?.trim() || null,
      },
    });
    return NextResponse.json(contact);
  } catch {
    return NextResponse.json({ message: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSession())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const numId = parseInt(id);
  if (isNaN(numId)) return NextResponse.json({ message: "Invalid id" }, { status: 400 });

  try {
    await prisma.cityContact.delete({ where: { id: numId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
