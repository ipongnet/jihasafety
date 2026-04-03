import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const depts = await prisma.department.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json(depts);
}

export async function POST(request: NextRequest) {
  if (!(await getSession())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { name, parentId } = await request.json();
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ message: "부서명을 입력해주세요." }, { status: 400 });
  }
  const trimmedName = name.trim();
  const pid = parentId ?? null;

  // 동일 계층에서 중복 이름 체크
  const existing = await prisma.department.findFirst({
    where: { name: trimmedName, parentId: pid },
  });
  if (existing) {
    return NextResponse.json({ message: "이미 존재하는 부서명입니다." }, { status: 409 });
  }

  const dept = await prisma.department.create({
    data: { name: trimmedName, parentId: pid },
  });
  return NextResponse.json(dept, { status: 201 });
}
