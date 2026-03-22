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
}

export function generateAddressCSV(data: CSVData): string {
  const BOM = "\uFEFF";
  const headers = ["제출일시", "전체주소", "시/도", "시/군/구", "위도", "경도"];
  const now = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });

  const row = [
    escapeCSV(now),
    escapeCSV(data.fullAddress),
    escapeCSV(data.sido),
    escapeCSV(data.sigungu),
    data.latitude?.toString() ?? "",
    data.longitude?.toString() ?? "",
  ];

  return BOM + headers.join(",") + "\n" + row.join(",") + "\n";
}

export function generateCSVFilename(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `굴착요청_주소정보_${y}${m}${d}.csv`;
}
