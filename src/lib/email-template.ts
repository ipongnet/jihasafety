function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

interface EmailData {
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
  return `[지하시설물 유관기관 협의서 요청] ${data.projectName}_${data.sigungu}`;
}

export function buildEmailHTML(data: EmailData): string {
  const e = {
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
    <div style="background:#2563eb;color:#fff;padding:24px 32px;">
      <h1 style="margin:0;font-size:20px;">굴착공사 안전신고 접수</h1>
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
