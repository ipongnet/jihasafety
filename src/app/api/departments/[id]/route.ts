import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSession())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const numId = parseInt(id);
  const childCount = await prisma.department.count({ where: { parentId: numId } });
  if (childCount > 0) {
    return NextResponse.json({ message: "하위 부서가 있어 삭제할 수 없습니다." }, { status: 409 });
  }
  await prisma.department.delete({ where: { id: numId } });
  return NextResponse.json({ success: true });
}
