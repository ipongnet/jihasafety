import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const depts = await prisma.department.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json(depts);
}

export async function POST(request: NextRequest) {
  if (!(await getSession())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { name } = await request.json();
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ message: "부서명을 입력해주세요." }, { status: 400 });
  }
  try {
    const dept = await prisma.department.create({ data: { name: name.trim() } });
    return NextResponse.json(dept, { status: 201 });
  } catch {
    return NextResponse.json({ message: "이미 존재하는 부서명입니다." }, { status: 409 });
  }
}
