import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendResponseEmail } from "@/lib/send-response-email";

const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 인증
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token || token !== process.env.RESPOND_API_KEY) {
    return NextResponse.json({ error: "인증 실패" }, { status: 401 });
  }

  const { id } = await params;
  const submissionId = parseInt(id, 10);
  if (isNaN(submissionId)) {
    return NextResponse.json({ error: "유효하지 않은 ID" }, { status: 400 });
  }

  // 접수 건 조회
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
  });
  if (!submission) {
    return NextResponse.json({ error: "접수 건을 찾을 수 없습니다" }, { status: 404 });
  }
  if (submission.status === "replied") {
    return NextResponse.json({ error: "이미 회신된 건입니다" }, { status: 409 });
  }
  if (!submission.submitterEmail) {
    return NextResponse.json({ error: "신청자 이메일이 없습니다" }, { status: 400 });
  }

  // form-data 파싱
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "요청 파싱 실패" }, { status: 400 });
  }

  const conflictStatus = formData.get("conflictStatus");
  const responseMessage = formData.get("responseMessage");
  const pdfFile = formData.get("pdfFile");

  if (typeof conflictStatus !== "string" || !["저촉", "비저촉"].includes(conflictStatus)) {
    return NextResponse.json({ error: "conflictStatus는 '저촉' 또는 '비저촉'이어야 합니다" }, { status: 400 });
  }
  if (typeof responseMessage !== "string" || !responseMessage.trim()) {
    return NextResponse.json({ error: "responseMessage가 필요합니다" }, { status: 400 });
  }
  if (!(pdfFile instanceof File)) {
    return NextResponse.json({ error: "pdfFile이 필요합니다" }, { status: 400 });
  }
  if (!pdfFile.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "PDF 파일만 허용됩니다" }, { status: 400 });
  }
  if (pdfFile.size > MAX_PDF_SIZE) {
    return NextResponse.json({ error: "파일 크기는 10MB 이하여야 합니다" }, { status: 400 });
  }

  // 이메일 발송
  const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer());

  try {
    await sendResponseEmail({
      to: submission.submitterEmail,
      submissionNumber: submission.submissionNumber ?? `#${submission.id}`,
      projectName: submission.projectName,
      companyName: submission.companyName,
      fullAddress: submission.fullAddress,
      constructionStartDate: submission.constructionStartDate.toISOString().slice(0, 10),
      constructionEndDate: submission.constructionEndDate.toISOString().slice(0, 10),
      conflictStatus,
      responseMessage,
      pdfBuffer,
      pdfFilename: pdfFile.name,
    });

    // DB 업데이트
    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: "replied",
        conflictStatus,
        responseMessage,
        respondedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      submissionNumber: emailData.submissionNumber,
      emailSentTo: submission.submitterEmail,
    });
  } catch (err) {
    console.error("[respond] 회신 처리 실패:", err);
    return NextResponse.json(
      { error: "회신 처리 중 오류가 발생했습니다", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
