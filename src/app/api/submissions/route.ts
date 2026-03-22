import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  if (!(await getSession())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const submissions = await prisma.submission.findMany({
    orderBy: { createdAt: "desc" },
    include: { cityContact: { select: { personName: true } } },
  });
  return NextResponse.json(submissions);
}
