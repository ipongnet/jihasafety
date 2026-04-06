/**
 * 공사 시작일 임박 알림 — 시작 3일 이내 미회신 건 관리자 이메일 발송 (Step 10-3)
 * Vercel Cron: 매일 오전 9시 실행
 * 인증: CRON_SECRET 헤더 (Vercel이 자동 삽입)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const threeDaysLater = new Date(now);
  threeDaysLater.setDate(now.getDate() + 3);

  // 시작 3일 이내 && 미회신 && 미취소
  const urgent = await prisma.submission.findMany({
    where: {
      constructionStartDate: { lte: threeDaysLater },
      status: { notIn: ["replied", "cancelled"] },
      respondedAt: null,
    },
    orderBy: { constructionStartDate: "asc" },
  });

  if (urgent.length === 0) {
    return NextResponse.json({ alerted: 0 });
  }

  const adminEmail = process.env.ADMIN_ALERT_EMAIL ?? process.env.GMAIL_USER;
  if (!adminEmail) {
    return NextResponse.json({ alerted: 0, note: "ADMIN_ALERT_EMAIL 미설정" });
  }

  const rows = urgent.map((s) => {
    const daysLeft = Math.ceil(
      (s.constructionStartDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    return `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${s.submissionNumber ?? s.id}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${s.companyName}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${s.fullAddress}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#dc2626;font-weight:600;">${daysLeft <= 0 ? "오늘" : `${daysLeft}일 후`}</td>
    </tr>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8"></head>
<body style="font-family:'Noto Sans KR',sans-serif;margin:0;padding:20px;background:#f5f5f5;">
<div style="max-width:700px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
  <div style="background:#dc2626;color:#fff;padding:20px 28px;">
    <h1 style="margin:0;font-size:18px;">⚠️ 공사 시작일 임박 미회신 건 알림</h1>
  </div>
  <div style="padding:24px 28px;">
    <p style="margin:0 0 16px;color:#374151;">공사 시작일이 <strong>3일 이내</strong>인데 아직 회신되지 않은 건이 <strong>${urgent.length}건</strong> 있습니다.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead>
        <tr style="background:#f8fafc;">
          <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e2e8f0;">접수번호</th>
          <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e2e8f0;">업체명</th>
          <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e2e8f0;">공사위치</th>
          <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #e2e8f0;">시작까지</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  <div style="background:#f8fafc;padding:14px 28px;text-align:center;color:#94a3b8;font-size:12px;">
    지하안전 플랫폼 자동 알림
  </div>
</div>
</body></html>`;

  try {
    await sendMail({
      to: adminEmail,
      subject: `[지하안전] 공사 시작일 임박 미회신 ${urgent.length}건`,
      html,
    });
    return NextResponse.json({ alerted: urgent.length });
  } catch (e) {
    console.error("[construction-alert] 이메일 발송 실패:", e);
    return NextResponse.json({ alerted: 0, error: String(e) }, { status: 500 });
  }
}
