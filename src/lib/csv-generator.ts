function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes("\n") || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

interface CSVData {
  fullAddress: string;
  sido: string;
  sigungu: string;
  latitude?: number | null;
  longitude?: number | null;
  companyName: string;
  submitterEmail: string;
  replyEmail: string;
}

export function generateAddressCSV(data: CSVData): string {
  const BOM = "\uFEFF";
  const headers = ["제출일시", "업체명", "신청자 이메일", "전체주소", "시/도", "시/군/구", "위도", "경도", "GeoJSON", "회신주소"];
  const now = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });

  const geojson =
    data.latitude != null && data.longitude != null
      ? escapeCSV(JSON.stringify({ type: "Point", coordinates: [data.longitude, data.latitude] }))
      : "";

  const row = [
    escapeCSV(now),
    escapeCSV(data.companyName),
    escapeCSV(data.submitterEmail),
    escapeCSV(data.fullAddress),
    escapeCSV(data.sido),
    escapeCSV(data.sigungu),
    data.latitude?.toString() ?? "",
    data.longitude?.toString() ?? "",
    geojson,
    escapeCSV(data.replyEmail),
  ];

  return BOM + headers.join(",") + "\n" + row.join(",") + "\n";
}

export function generateCSVFilename(sigungu: string, companyName: string): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  // 파일명에 사용할 수 없는 문자 제거
  const safeSigungu = sigungu.replace(/[/\\:*?"<>|]/g, "").trim();
  const safeCompany = companyName.replace(/[/\\:*?"<>|]/g, "").trim().slice(0, 20);
  return `굴착확인요청_${safeSigungu}_${y}${m}${d}_${safeCompany}.csv`;
}
