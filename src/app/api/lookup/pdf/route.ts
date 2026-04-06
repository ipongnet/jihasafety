/**
 * GET /api/lookup/pdf?code=접수번호&email=이메일
 * 접수번호 + 이메일 인증 후 Supabase archive에서 PDF 스트리밍 (인증 불필요, 공개 API).
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { downloadFile } from "@/lib/storage-client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code")?.trim();
  const email = searchParams.get("email")?.trim().toLowerCase();

  if (!code || !email) {
    return NextResponse.json({ error: "접수번호와 이메일을 입력하세요." }, { status: 400 });
  }

  const submission = await prisma.submission.findFirst({
    where: { submissionNumber: code },
    select: { submitterEmail: true, pdfStoragePath: true, submissionNumber: true },
  });

  if (!submission) {
    return NextResponse.json({ error: "접수번호를 찾을 수 없습니다." }, { status: 404 });
  }
  if (!submission.submitterEmail || submission.submitterEmail.toLowerCase() !== email) {
    return NextResponse.json({ error: "이메일이 일치하지 않습니다." }, { status: 403 });
  }
  if (!submission.pdfStoragePath) {
    return NextResponse.json({ error: "PDF가 아직 준비되지 않았습니다." }, { status: 404 });
  }

  let pdfBuf: Buffer;
  try {
    pdfBuf = await downloadFile(submission.pdfStoragePath);
  } catch (e) {
    console.error("[lookup/pdf] 스토리지 다운로드 실패:", e);
    return NextResponse.json({ error: "PDF를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요." }, { status: 503 });
  }

  return new NextResponse(pdfBuf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(submission.submissionNumber ?? code)}_결과.pdf"`,
    },
  });
}
