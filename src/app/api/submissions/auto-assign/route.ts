import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { findContact } from "@/lib/city-matcher";
import { generateSubmissionNumber } from "@/lib/submission-number";
import { generateAddressCSV, generateCSVFilename } from "@/lib/csv-generator";
import { buildEmailSubject, buildEmailHTML } from "@/lib/email-template";
import { sendMail } from "@/lib/mailer";
import { uploadFile } from "@/lib/storage-client";
import fs from "fs";
import path from "path";

export async function POST() {
  if (!(await getSession())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // no_contact 상태인 접수건 전체 조회 (접수 전 단계만)
  const pending = await prisma.submission.findMany({
    where: { status: "no_contact" },
    orderBy: { createdAt: "asc" },
  });

  if (pending.length === 0) {
    return NextResponse.json({ updated: [] });
  }

  const replyEmail = process.env.GMAIL_USER ?? "";
  const updated: object[] = [];

  for (const submission of pending) {
    // 담당자 매칭 시도
    const contact = await findContact(submission.sido, submission.sigungu);
    if (!contact) continue;

    // 접수번호 생성
    const newSubmissionNumber = await generateSubmissionNumber(contact.department);

    // CSV 생성
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
    const csvFilename = generateCSVFilename(
      newSubmissionNumber,
      submission.fullAddress,
      submission.sido,
      submission.companyName
    );
    const csvBuffer = Buffer.from(csvContent, "utf-8");

    // 로컬 저장 (Vercel 환경에서는 무시)
    try {
      const uploadsDir = path.join(process.env.HOME ?? "/Users/wan", "Desktop", "EngineJiha", "uploads");
      fs.mkdirSync(uploadsDir, { recursive: true });
      fs.writeFileSync(path.join(uploadsDir, csvFilename), csvBuffer);
    } catch { /* ignore */ }

    // Supabase 업로드
    try {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const safeNum = newSubmissionNumber.replace(/[^a-zA-Z0-9\-]/g, "_");
      await uploadFile(`outbox/${today}_${safeNum}.csv`, csvBuffer, "text/csv");
    } catch (e) {
      console.error("[auto-assign] storage 업로드 실패:", e);
    }

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
        attachments: [{ filename: csvFilename, content: csvBuffer, contentType: "text/csv" }],
      });
    } catch {
      status = "failed";
      emailSentTo = null;
    }

    // DB 업데이트
    const result = await prisma.submission.update({
      where: { id: submission.id },
      data: { cityContactId: contact.id, submissionNumber: newSubmissionNumber, status, emailSentTo },
      include: {
        cityContact: { select: { personName: true, department: true, email: true, phone: true } },
      },
    });

    updated.push({
      ...result,
      constructionStartDate: result.constructionStartDate.toISOString(),
      constructionEndDate: result.constructionEndDate.toISOString(),
      createdAt: result.createdAt.toISOString(),
      respondedAt: result.respondedAt?.toISOString() ?? null,
    });
  }

  return NextResponse.json({ updated });
}
