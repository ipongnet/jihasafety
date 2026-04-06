import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { findContact } from "@/lib/city-matcher";
import { generateSubmissionNumber } from "@/lib/submission-number";
import { generateAddressCSV, generateCSVFilename } from "@/lib/csv-generator";
import { buildEmailSubject, buildEmailHTML } from "@/lib/email-template";
import { sendMail } from "@/lib/mailer";
import { uploadFileWithRetry } from "@/lib/upload-with-retry";
import { computeSHA256 } from "@/lib/hash-utils";

export const maxDuration = 60;

export async function POST() {
  if (!(await getSession())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const pending = await prisma.submission.findMany({
    where: { status: "no_contact" },
    orderBy: { createdAt: "asc" },
  });

  if (pending.length === 0) {
    return NextResponse.json({ updated: 0, errors: 0 });
  }

  let updated = 0;
  let errors = 0;
  const replyEmail = process.env.GMAIL_USER ?? "";

  for (const submission of pending) {
    try {
      const contact = await findContact(submission.sido, submission.sigungu);
      if (!contact) continue;

      const newSubmissionNumber = await generateSubmissionNumber(contact.department, submission.sido);

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
      const csvFilename = generateCSVFilename(newSubmissionNumber, submission.fullAddress, submission.sido, submission.companyName);
      const csvBuffer = Buffer.from(csvContent, "utf-8");

      // Supabase outbox/ 업로드
      try {
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const safeNum = newSubmissionNumber.replace(/[^a-zA-Z0-9\-]/g, "_");
        const csvKey = `outbox/${today}_${safeNum}.csv`;
        await uploadFileWithRetry(csvKey, csvBuffer, "text/csv");
        const csvHash = computeSHA256(csvBuffer);
        await uploadFileWithRetry(`${csvKey}.sha256`, Buffer.from(csvHash, "utf-8"), "text/plain");
      } catch (e) {
        console.error("[auto-assign] outbox 업로드 실패:", e);
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
      } catch (e) {
        console.error(`[auto-assign] 이메일 발송 실패 submission ${submission.id}:`, e);
        status = "failed";
        emailSentTo = null;
      }

      await prisma.submission.update({
        where: { id: submission.id },
        data: {
          cityContactId: contact.id,
          submissionNumber: newSubmissionNumber,
          status,
          emailSentTo,
        },
      });
      updated++;
    } catch (e) {
      console.error(`[auto-assign] submission ${submission.id} 실패:`, e);
      errors++;
    }
  }

  return NextResponse.json({ updated, errors });
}
