import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { generateSubmissionNumber } from "@/lib/submission-number";
import { generateAddressCSV, generateCSVFilename } from "@/lib/csv-generator";
import { buildEmailSubject, buildEmailHTML } from "@/lib/email-template";
import { sendMail } from "@/lib/mailer";
import fs from "fs";
import path from "path";
import { uploadFile } from "@/lib/storage-client";

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

  const body = await request.json();
  const contactId = body.contactId;
  if (!contactId || typeof contactId !== "number") {
    return NextResponse.json({ message: "contactId가 필요합니다." }, { status: 400 });
  }

  // 접수건 조회
  const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
  if (!submission) {
    return NextResponse.json({ message: "접수건을 찾을 수 없습니다." }, { status: 404 });
  }
  if (submission.status !== "no_contact") {
    return NextResponse.json({ message: "담당자 없음 상태만 지정 가능합니다." }, { status: 409 });
  }

  // 담당자 조회
  const contact = await prisma.cityContact.findUnique({ where: { id: contactId } });
  if (!contact) {
    return NextResponse.json({ message: "담당자를 찾을 수 없습니다." }, { status: 404 });
  }

  // 접수번호 재생성 (해당 부서 기준 순차)
  const newSubmissionNumber = await generateSubmissionNumber(contact.department);

  // CSV 재생성
  const replyEmail = process.env.GMAIL_USER ?? "";
  const csvContent = generateAddressCSV({
    fullAddress: submission.fullAddress,
    sido: submission.sido,
    sigungu: submission.sigungu,
    latitude: submission.latitude,
    longitude: submission.longitude,
    companyName: submission.companyName,
    submitterEmail: submission.submitterEmail ?? "",
    replyEmail,
    submissionNumber: newSubmissionNumber,
    submissionId: submission.id,
    constructionRoute: submission.constructionRoute ?? undefined,
  });
  const csvFilename = generateCSVFilename(newSubmissionNumber, submission.fullAddress, submission.sido, submission.companyName);
  const csvBuffer = Buffer.from(csvContent, "utf-8");

  // 로컬 CSV 저장
  try {
    const uploadsDir = path.join(process.env.HOME ?? "/Users/wan", "Desktop", "EngineJiha", "uploads");
    fs.mkdirSync(uploadsDir, { recursive: true });
    fs.writeFileSync(path.join(uploadsDir, csvFilename), csvBuffer);
  } catch { /* Vercel 환경 무시 */ }

  // Supabase Storage outbox/ 업로드 (망연계 시뮬레이션) — ASCII 전용 키
  try {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const safeNum = newSubmissionNumber.replace(/[^a-zA-Z0-9\-]/g, "_");
    await uploadFile(`outbox/${today}_${safeNum}.csv`, csvBuffer, "text/csv");
  } catch (e) {
    console.error("[storage] outbox 업로드 실패:", e);
  }

  const attachments = [{
    filename: csvFilename,
    content: csvBuffer,
    contentType: "text/csv",
  }];

  // 이메일 발송
  const emailData = {
    submissionNumber: newSubmissionNumber,
    projectName: submission.projectName,
    companyName: submission.companyName,
    submitterEmail: submission.submitterEmail ?? "",
    constructionStartDate: submission.constructionStartDate.toISOString().split("T")[0],
    constructionEndDate: submission.constructionEndDate.toISOString().split("T")[0],
    fullAddress: submission.fullAddress,
    sido: submission.sido,
    sigungu: submission.sigungu,
    latitude: submission.latitude,
    longitude: submission.longitude,
  };

  let status = "sent";
  let emailSentTo: string | null = contact.email;

  try {
    await sendMail({
      to: contact.email,
      subject: buildEmailSubject(emailData),
      html: buildEmailHTML(emailData),
      attachments,
    });
  } catch {
    status = "failed";
    emailSentTo = null;
  }

  // DB 업데이트
  const updated = await prisma.submission.update({
    where: { id: submissionId },
    data: {
      cityContactId: contact.id,
      submissionNumber: newSubmissionNumber,
      status,
      emailSentTo,
    },
    include: {
      cityContact: { select: { personName: true, department: true, email: true, phone: true } },
    },
  });

  return NextResponse.json({
    success: true,
    submission: {
      ...updated,
      constructionStartDate: updated.constructionStartDate.toISOString(),
      constructionEndDate: updated.constructionEndDate.toISOString(),
      createdAt: updated.createdAt.toISOString(),
      respondedAt: updated.respondedAt?.toISOString() ?? null,
    },
  });
}
