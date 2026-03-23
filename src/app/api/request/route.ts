import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { findContact, normalizeSido } from "@/lib/city-matcher";
import { generateAddressCSV, generateCSVFilename } from "@/lib/csv-generator";
import { buildEmailSubject, buildEmailHTML } from "@/lib/email-template";
import { sendMail } from "@/lib/mailer";

export const maxDuration = 60;

const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "pdf", "hwp", "doc", "docx", "xlsx"]);

function sanitizeFilename(name: string): string {
  return name.replace(/\.\./g, "_").replace(/[^\w가-힣.\- ]/g, "_").slice(0, 200);
}

function validateString(value: unknown, maxLen: number): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  if (value.length > maxLen) return null;
  return value.trim();
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const projectName = validateString(formData.get("projectName"), 200);
    const companyName = validateString(formData.get("companyName"), 100);
    const submitterEmail = validateString(formData.get("submitterEmail"), 200);
    const constructionStartDate = validateString(formData.get("constructionStartDate"), 20);
    const constructionEndDate = validateString(formData.get("constructionEndDate"), 20);
    const fullAddress = validateString(formData.get("fullAddress"), 500);
    const sido = validateString(formData.get("sido"), 50);
    const sigungu = validateString(formData.get("sigungu"), 50);
    const latStr = formData.get("latitude");
    const lngStr = formData.get("longitude");
    const consentGiven = formData.get("consentGiven") === "true";

    if (!projectName || !companyName || !submitterEmail || !constructionStartDate || !constructionEndDate || !fullAddress || !sido || !sigungu) {
      return NextResponse.json({ success: false, message: "필수 항목을 모두 입력해주세요." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submitterEmail)) {
      return NextResponse.json({ success: false, message: "올바른 이메일 형식을 입력해주세요." }, { status: 400 });
    }

    if (!consentGiven) {
      return NextResponse.json({ success: false, message: "개인정보 수집에 동의해주세요." }, { status: 400 });
    }

    const startDate = new Date(constructionStartDate);
    const endDate = new Date(constructionEndDate);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ success: false, message: "유효한 날짜를 입력해주세요." }, { status: 400 });
    }
    if (endDate < startDate) {
      return NextResponse.json({ success: false, message: "종료일은 시작일 이후여야 합니다." }, { status: 400 });
    }

    const latitude = latStr ? parseFloat(String(latStr)) : null;
    const longitude = lngStr ? parseFloat(String(lngStr)) : null;

    if (latitude !== null && longitude !== null) {
      if (latitude < 33 || latitude > 39 || longitude < 124 || longitude > 132) {
        return NextResponse.json({ success: false, message: "유효하지 않은 좌표입니다." }, { status: 400 });
      }
    }

    // 파일 처리
    const fileEntries = formData.getAll("files");
    const attachments: { filename: string; content: Buffer; contentType?: string }[] = [];

    for (const entry of fileEntries) {
      if (entry instanceof File && entry.size > 0) {
        const ext = entry.name.split(".").pop()?.toLowerCase() ?? "";
        if (!ALLOWED_EXTENSIONS.has(ext)) {
          return NextResponse.json({ success: false, message: `허용되지 않는 파일 형식입니다: ${entry.name}` }, { status: 400 });
        }
        if (entry.size > 5 * 1024 * 1024) {
          return NextResponse.json({ success: false, message: `파일 크기 초과: ${entry.name}` }, { status: 400 });
        }
        const buffer = Buffer.from(await entry.arrayBuffer());
        attachments.push({
          filename: sanitizeFilename(entry.name),
          content: buffer,
          contentType: entry.type || undefined,
        });
      }
    }

    const totalSize = attachments.reduce((sum, a) => sum + a.content.length, 0);
    if (totalSize > 10 * 1024 * 1024) {
      return NextResponse.json({ success: false, message: "총 파일 크기가 10MB를 초과합니다." }, { status: 400 });
    }

    // CSV 생성
    const normalizedSido = normalizeSido(sido);
    const replyEmail = process.env.GMAIL_USER ?? "";
    const csvContent = generateAddressCSV({
      fullAddress,
      sido: normalizedSido,
      sigungu,
      latitude,
      longitude,
      companyName,
      submitterEmail,
      replyEmail,
    });
    attachments.unshift({
      filename: generateCSVFilename(sigungu, companyName),
      content: Buffer.from(csvContent, "utf-8"),
      contentType: "text/csv",
    });

    // 담당자 매칭
    const contact = await findContact(sido, sigungu);

    let status = "no_contact";
    let emailSentTo: string | null = null;

    if (contact) {
      const emailData = {
        projectName,
        companyName,
        submitterEmail,
        constructionStartDate,
        constructionEndDate,
        fullAddress,
        sido: normalizedSido,
        sigungu,
        latitude,
        longitude,
      };

      try {
        await sendMail({
          to: contact.email,
          subject: buildEmailSubject(emailData),
          html: buildEmailHTML(emailData),
          attachments,
        });
        status = "sent";
        emailSentTo = contact.email;
      } catch {
        status = "failed";
      }
    }

    let submissionId: number | undefined;
    try {
      const submission = await prisma.submission.create({
        data: {
          projectName,
          companyName,
          submitterEmail,
          constructionStartDate: startDate,
          constructionEndDate: endDate,
          fullAddress,
          sido: normalizedSido,
          sigungu,
          latitude,
          longitude,
          emailSentTo,
          status,
          consentGiven,
          cityContactId: contact?.id ?? null,
        },
      });
      submissionId = submission.id;
    } catch {
      // DB 저장 실패 시 요청은 계속 처리 (이메일은 이미 발송됨)
    }

    return NextResponse.json({
      success: true,
      submissionId,
      emailSentTo,
      contact: contact ? {
        personName: contact.personName,
        department: contact.department ?? null,
        phone: contact.phone,
      } : null,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
