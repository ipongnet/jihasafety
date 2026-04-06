/**
 * GET /api/lookup?code=접수번호&email=이메일
 * 접수번호 + 신청자 이메일로 접수 현황 조회 (인증 불필요, 공개 API).
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const STATUS_LABEL: Record<string, string> = {
  sent: "접수 완료 (회신 대기)",
  failed: "발송 실패",
  no_contact: "담당자 미지정",
  replied: "회신 완료",
  cancelled: "취소됨",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code")?.trim();
  const email = searchParams.get("email")?.trim().toLowerCase();

  if (!code || !email) {
    return NextResponse.json({ error: "접수번호와 이메일을 입력하세요." }, { status: 400 });
  }

  const submission = await prisma.submission.findFirst({
    where: { submissionNumber: code },
    select: {
      id: true,
      submissionNumber: true,
      projectName: true,
      companyName: true,
      fullAddress: true,
      sido: true,
      sigungu: true,
      status: true,
      conflictStatus: true,
      responseMessage: true,
      respondedAt: true,
      createdAt: true,
      submitterEmail: true,
      pdfStoragePath: true,
    },
  });

  if (!submission) {
    return NextResponse.json({ error: "접수번호를 찾을 수 없습니다." }, { status: 404 });
  }

  // 이메일 인증
  if (!submission.submitterEmail || submission.submitterEmail.toLowerCase() !== email) {
    return NextResponse.json({ error: "이메일이 일치하지 않습니다." }, { status: 403 });
  }

  return NextResponse.json({
    id: submission.id,
    submissionNumber: submission.submissionNumber,
    projectName: submission.projectName,
    companyName: submission.companyName,
    fullAddress: submission.fullAddress,
    sido: submission.sido,
    sigungu: submission.sigungu,
    status: submission.status,
    statusLabel: STATUS_LABEL[submission.status] ?? submission.status,
    conflictStatus: submission.conflictStatus,
    responseMessage: submission.responseMessage,
    respondedAt: submission.respondedAt?.toISOString() ?? null,
    createdAt: submission.createdAt.toISOString(),
    hasPdf: !!submission.pdfStoragePath,
  });
}
