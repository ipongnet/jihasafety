/**
 * GET /api/inbox-worker
 * Supabase Storage inbox/ 폴링 → 신청자 이메일 발송 → DB 업데이트 → archive/ 이동.
 * 인증: Vercel Cron (CRON_SECRET) 또는 EngineJiha 핑 (PING_API_KEY) 중 하나.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { listFiles, downloadFile, moveFile } from "@/lib/storage-client";
import { sendResponseEmail } from "@/lib/send-response-email";
import { verifySHA256 } from "@/lib/hash-utils";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const pingKey = process.env.PING_API_KEY;
  if (cronSecret || pingKey) {
    const auth = request.headers.get("Authorization");
    const validTokens = [cronSecret, pingKey].filter(Boolean).map((t) => `Bearer ${t}`);
    if (!auth || !validTokens.includes(auth)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
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
        isOverridden?: boolean;
        overrideReason?: string | null;
        pdfHash?: string;
      };

      const { external_id, conflictStatus, responseMessage, submission_code, isOverridden, overrideReason, pdfHash } = payload;
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

      // PDF 다운로드 + 해시 검증
      const pdfBuf = await downloadFile(pdfPath);
      if (pdfHash && !verifySHA256(pdfBuf, pdfHash)) {
        console.error(`[inbox-worker] PDF 해시 불일치: ${f.name}`);
        results.push({ filename: f.name, status: "error", detail: "PDF 해시 불일치" });
        continue;
      }

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

      const archivePdfPath = `archive/${f.name.replace("_result.json", "_result.pdf")}`;

      // DB 업데이트
      await prisma.submission.update({
        where: { id: external_id },
        data: {
          status: "replied",
          conflictStatus,
          responseMessage,
          respondedAt: new Date(),
          isOverridden: isOverridden ?? false,
          overrideReason: overrideReason ?? null,
          pdfStoragePath: archivePdfPath,
        },
      });

      // archive/ 이동
      await moveFile(jsonPath, `archive/${f.name}`);
      await moveFile(pdfPath, archivePdfPath);

      results.push({ filename: f.name, status: "replied" });
    } catch (e) {
      console.error("[inbox-worker] 처리 실패:", f.name, e);
      results.push({ filename: f.name, status: "error", detail: String(e) });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
