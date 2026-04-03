import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// 모든 L1 부서 하위에 동일한 이름의 L2 부서를 일괄 추가
// 이미 존재하는 경우 건너뜀
export async function POST(request: NextRequest) {
  if (!(await getSession())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { name } = await request.json();
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ message: "부서명을 입력해주세요." }, { status: 400 });
  }
  const trimmedName = name.trim();

  const l1Depts = await prisma.department.findMany({ where: { parentId: null } });
  if (l1Depts.length === 0) {
    return NextResponse.json({ message: "L1 부서가 없습니다." }, { status: 400 });
  }

  let added = 0;
  let skipped = 0;

  for (const l1 of l1Depts) {
    const exists = await prisma.department.findFirst({
      where: { name: trimmedName, parentId: l1.id },
    });
    if (exists) { skipped++; continue; }
    await prisma.department.create({ data: { name: trimmedName, parentId: l1.id } });
    added++;
  }

  const all = await prisma.department.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json({ added, skipped, departments: all });
}
