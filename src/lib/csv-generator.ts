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
  submissionNumber: string;
  submissionId: number;
  constructionRoute?: string;
}

export function generateAddressCSV(data: CSVData): string {
  const BOM = "\uFEFF";
  const headers = ["접수번호", "submission_id", "제출일시", "업체명", "신청자 이메일", "전체주소", "시/도", "시/군/구", "위도", "경도", "GeoJSON", "회신주소", "공사구간"];
  const now = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });

  const geojson =
    data.latitude != null && data.longitude != null
      ? escapeCSV(JSON.stringify({ type: "Point", coordinates: [data.longitude, data.latitude] }))
      : "";

  const row = [
    escapeCSV(data.submissionNumber),
    data.submissionId.toString(),
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
    data.constructionRoute ? escapeCSV(data.constructionRoute) : "",
  ];

  return BOM + headers.join(",") + "\n" + row.join(",") + "\n";
}

export function generateCSVFilename(submissionNumber: string, fullAddress: string, sido: string, companyName: string): string {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const subAddr = extractSubAddress(fullAddress, sido);
  const safeSubNum = submissionNumber.replace(/[/\\:*?"<>|]/g, "").trim();
  const safeSubAddr = subAddr.replace(/[/\\:*?"<>|]/g, "").trim().slice(0, 50);
  const safeCompany = companyName.replace(/[/\\:*?"<>|]/g, "").trim().slice(0, 20);
  return `[${date}_${safeSubNum}] ${safeSubAddr}_${safeCompany}.csv`;
}

function extractSubAddress(fullAddress: string, sido: string): string {
  let addr = fullAddress.startsWith(sido + " ")
    ? fullAddress.slice(sido.length + 1).trim()
    : fullAddress;
  addr = addr.replace(/^[^\s]*[시군]\s+/, "");
  return addr.trim();
}
