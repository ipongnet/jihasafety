import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getSession())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const submissionId = parseInt(id, 10);
  if (isNaN(submissionId)) {
    return NextResponse.json({ message: "잘못된 ID" }, { status: 400 });
  }

  const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
  if (!submission) {
    return NextResponse.json({ message: "접수건을 찾을 수 없습니다." }, { status: 404 });
  }
  if (submission.status === "replied") {
    return NextResponse.json({ message: "이미 회신된 건은 취소할 수 없습니다." }, { status: 409 });
  }
  if (submission.status === "cancelled") {
    return NextResponse.json({ message: "이미 취소된 건입니다." }, { status: 409 });
  }

  const updated = await prisma.submission.update({
    where: { id: submissionId },
    data: { status: "cancelled" },
  });

  return NextResponse.json({ success: true, id: updated.id, status: updated.status });
}
