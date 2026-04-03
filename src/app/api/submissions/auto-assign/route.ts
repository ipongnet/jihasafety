import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { findContact } from "@/lib/city-matcher";
import { generateSubmissionNumber } from "@/lib/submission-number";

// Vercel Hobby 10초 제한 내에서 동작하도록 DB 업데이트만 수행
// 이메일/CSV/업로드는 생략 (접수번호·담당자 자동 지정이 목적)
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

  for (const submission of pending) {
    try {
      const contact = await findContact(submission.sido, submission.sigungu);
      if (!contact) continue;

      const newSubmissionNumber = await generateSubmissionNumber(contact.department, submission.sido);

      await prisma.submission.update({
        where: { id: submission.id },
        data: {
          cityContactId: contact.id,
          submissionNumber: newSubmissionNumber,
          status: "sent",
          emailSentTo: contact.email,
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
