/**
 * GET /api/inbox-worker
 * Supabase Storage inbox/ 폴링 → 신청자 이메일 발송 → DB 업데이트 → archive/ 이동.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { listFiles, downloadFile, moveFile } from "@/lib/storage-client";
import { sendResponseEmail } from "@/lib/send-response-email";

export const maxDuration = 60;

export async function GET() {
  const files = await listFiles("inbox/");
  const jsonFiles = files.filter((f) => f.name.endsWith("_result.json"));

  const results: { filename: string; status: string; detail?: string }[] = [];

  for (const f of jsonFiles) {
    const jsonPath = `inbox/${f.name}`;
    const pdfPath = `inbox/${f.name.replace("_result.json", "_result.pdf")}`;

    try {
      // JSON 다운로드 및 파싱
      const jsonBuf = await downloadFile(jsonPath);
      const payload = JSON.parse(jsonBuf.toString("utf-8")) as {
        submission_code: string;
        external_id: number | null;
        conflictStatus: string;
        responseMessage: string;
      };

      const { external_id, conflictStatus, responseMessage, submission_code } = payload;
      if (!external_id) {
        results.push({ filename: f.name, status: "skipped", detail: "external_id 없음" });
        continue;
      }

      // DB 조회
      const submission = await prisma.submission.findUnique({ where: { id: external_id } });
      if (!submission) {
        results.push({ filename: f.name, status: "skipped", detail: "submission 없음" });
        continue;
      }
      if (submission.status === "replied") {
        results.push({ filename: f.name, status: "skipped", detail: "이미 replied" });
        await moveFile(jsonPath, `archive/${f.name}`);
        continue;
      }
      if (!submission.submitterEmail) {
        results.push({ filename: f.name, status: "error", detail: "신청자 이메일 없음" });
        continue;
      }

      // PDF 다운로드
      const pdfBuf = await downloadFile(pdfPath);

      // 이메일 발송
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
        pdfBuffer: pdfBuf,
        pdfFilename: `${submission_code}_결과.pdf`,
      });

      // DB 업데이트
      await prisma.submission.update({
        where: { id: external_id },
        data: {
          status: "replied",
          conflictStatus,
          responseMessage,
          respondedAt: new Date(),
        },
      });

      // archive/ 이동
      await moveFile(jsonPath, `archive/${f.name}`);
      await moveFile(pdfPath, `archive/${f.name.replace("_result.json", "_result.pdf")}`);

      results.push({ filename: f.name, status: "replied" });
    } catch (e) {
      console.error("[inbox-worker] 처리 실패:", f.name, e);
      results.push({ filename: f.name, status: "error", detail: String(e) });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
