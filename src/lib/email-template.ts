export interface ResponseEmailData {
  submissionNumber: string;
  projectName: string;
  companyName: string;
  fullAddress: string;
  constructionStartDate: string;
  constructionEndDate: string;
  conflictStatus: string;
  responseMessage: string;
}

export function buildResponseEmailSubject(data: ResponseEmailData): string {
  return `[지하시설물 저촉여부 회신] ${data.submissionNumber}_${data.projectName}`;
}

export function buildResponseEmailHTML(data: ResponseEmailData): string {
  const isConflict = data.conflictStatus === "저촉";
  const bannerColor = isConflict ? "#dc2626" : "#16a34a";
  const badgeBg = isConflict ? "#fef2f2" : "#f0fdf4";
  const badgeText = isConflict ? "#dc2626" : "#16a34a";

  const e = {
    submissionNumber: escapeHtml(data.submissionNumber),
    projectName: escapeHtml(data.projectName),
    companyName: escapeHtml(data.companyName),
    fullAddress: escapeHtml(data.fullAddress),
    conflictStatus: escapeHtml(data.conflictStatus),
    responseMessage: escapeHtml(data.responseMessage),
  };

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"></head>
<body style="font-family:'Noto Sans KR',sans-serif;margin:0;padding:0;background:#f5f5f5;">
  <div style="max-width:600px;margin:20px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="padding:20px 32px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
      <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#64748b;letter-spacing:-0.01em;">접수번호</p>
      <p style="margin:0;font-size:20px;font-weight:700;color:#0f172a;font-family:ui-monospace,monospace;letter-spacing:0.02em;">${e.submissionNumber}</p>
    </div>
    <div style="background:${bannerColor};color:#fff;padding:24px 32px;">
      <h1 style="margin:0;font-size:20px;">지하시설물 저촉여부 회신</h1>
    </div>
    <div style="padding:32px;">
      <div style="text-align:center;margin-bottom:24px;">
        <span style="display:inline-block;padding:10px 32px;background:${badgeBg};color:${badgeText};font-size:22px;font-weight:700;border-radius:8px;border:2px solid ${badgeText};">
          ${e.conflictStatus}
        </span>
      </div>
      <div style="background:#f8fafc;border-radius:8px;padding:16px 20px;margin-bottom:24px;border-left:4px solid ${bannerColor};">
        <p style="margin:0;font-size:14px;color:#334155;white-space:pre-line;">${e.responseMessage}</p>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:10px 12px;background:#f8fafc;font-weight:600;width:130px;border-bottom:1px solid #e2e8f0;">공사명</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">${e.projectName}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;background:#f8fafc;font-weight:600;border-bottom:1px solid #e2e8f0;">시공업체</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">${e.companyName}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;background:#f8fafc;font-weight:600;border-bottom:1px solid #e2e8f0;">공사예정기간</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">${escapeHtml(data.constructionStartDate)} ~ ${escapeHtml(data.constructionEndDate)}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;background:#f8fafc;font-weight:600;border-bottom:1px solid #e2e8f0;">공사위치</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">${e.fullAddress}</td>
        </tr>
      </table>
      <p style="margin-top:24px;color:#64748b;font-size:14px;">
        첨부 PDF에서 상세 내용을 확인해주세요.
      </p>
    </div>
    <div style="background:#f8fafc;padding:16px 32px;text-align:center;color:#94a3b8;font-size:12px;">
      지하안전 플랫폼에서 자동 발송된 메일입니다.
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

interface EmailData {
  submissionNumber: string;
  projectName: string;
  companyName: string;
  submitterEmail: string;
  constructionStartDate: string;
  constructionEndDate: string;
  fullAddress: string;
  sido: string;
  sigungu: string;
  latitude?: number | null;
  longitude?: number | null;
}

export function buildEmailSubject(data: EmailData): string {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const subAddr = extractSubAddressFromSido(data.fullAddress, data.sido);
  return `[${date}_${data.submissionNumber}] ${subAddr}`;
}

function extractSubAddressFromSido(fullAddress: string, sido: string): string {
  let addr = fullAddress.startsWith(sido + " ")
    ? fullAddress.slice(sido.length + 1).trim()
    : fullAddress;
  // 시/군 앞부분 제거 (구 이하만 남김), 예: "성남시 분당구 판교로 1" → "분당구 판교로 1"
  addr = addr.replace(/^[^\s]*[시군]\s+/, "");
  return addr.trim();
}

export function buildEmailHTML(data: EmailData): string {
  const e = {
    submissionNumber: escapeHtml(data.submissionNumber),
    projectName: escapeHtml(data.projectName),
    companyName: escapeHtml(data.companyName),
    submitterEmail: escapeHtml(data.submitterEmail),
    fullAddress: escapeHtml(data.fullAddress),
    sido: escapeHtml(data.sido),
    sigungu: escapeHtml(data.sigungu),
  };

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"></head>
<body style="font-family:'Noto Sans KR',sans-serif;margin:0;padding:0;background:#f5f5f5;">
  <div style="max-width:600px;margin:20px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="padding:20px 32px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
      <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#64748b;letter-spacing:-0.01em;">접수번호</p>
      <p style="margin:0;font-size:20px;font-weight:700;color:#0f172a;font-family:ui-monospace,monospace;letter-spacing:0.02em;">${e.submissionNumber}</p>
    </div>
    <div style="background:#2563eb;color:#fff;padding:24px 32px;">
      <h1 style="margin:0;font-size:20px;">굴착공사 유관기관 협의서 신청</h1>
    </div>
    <div style="padding:32px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:10px 12px;background:#f8fafc;font-weight:600;width:130px;border-bottom:1px solid #e2e8f0;">공사명</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">${e.projectName}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;background:#f8fafc;font-weight:600;border-bottom:1px solid #e2e8f0;">시공업체</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">${e.companyName}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;background:#f8fafc;font-weight:600;border-bottom:1px solid #e2e8f0;">신청자 이메일</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">${e.submitterEmail}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;background:#f8fafc;font-weight:600;border-bottom:1px solid #e2e8f0;">공사예정기간</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">${escapeHtml(data.constructionStartDate)} ~ ${escapeHtml(data.constructionEndDate)}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;background:#f8fafc;font-weight:600;border-bottom:1px solid #e2e8f0;">공사위치</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">${e.fullAddress}</td>
        </tr>
        ${data.latitude && data.longitude ? `
        <tr>
          <td style="padding:10px 12px;background:#f8fafc;font-weight:600;border-bottom:1px solid #e2e8f0;">좌표</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">${data.latitude}, ${data.longitude}</td>
        </tr>` : ""}
      </table>
      <p style="margin-top:24px;color:#64748b;font-size:14px;">
        첨부된 CSV 파일에서 상세 주소 정보를 확인할 수 있습니다.<br>
        추가 첨부파일이 있을 경우 함께 전달됩니다.
      </p>
    </div>
    <div style="background:#f8fafc;padding:16px 32px;text-align:center;color:#94a3b8;font-size:12px;">
      지하안전 플랫폼에서 자동 발송된 메일입니다.
    </div>
  </div>
</body>
</html>`;
}
