import { NextRequest, NextResponse } from "next/server";

const SIDO_MAP: Record<string, string> = {
  "서울 ": "서울특별시 ", "부산 ": "부산광역시 ", "대구 ": "대구광역시 ",
  "인천 ": "인천광역시 ", "광주 ": "광주광역시 ", "대전 ": "대전광역시 ",
  "울산 ": "울산광역시 ", "세종 ": "세종특별자치시 ", "경기 ": "경기도 ",
  "강원 ": "강원특별자치도 ", "충북 ": "충청북도 ", "충남 ": "충청남도 ",
  "전북 ": "전북특별자치도 ", "전남 ": "전라남도 ", "경북 ": "경상북도 ",
  "경남 ": "경상남도 ", "제주 ": "제주특별자치도 ",
};

function normalizeAddress(addr: string): string {
  for (const [abbr, full] of Object.entries(SIDO_MAP)) {
    if (addr.startsWith(abbr)) return full + addr.slice(abbr.length);
  }
  return addr;
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("address");
  if (!raw) return NextResponse.json({ error: "address required" }, { status: 400 });

  const address = normalizeAddress(raw);

  const key = process.env.VWORLD_API_KEY;
  if (!key) return NextResponse.json({ error: "VWORLD_API_KEY not configured" }, { status: 500 });

  const buildUrl = (type: "road" | "parcel") => {
    const url = new URL("https://api.vworld.kr/req/address");
    url.searchParams.set("service", "address");
    url.searchParams.set("request", "getcoord");
    url.searchParams.set("version", "2.0");
    url.searchParams.set("crs", "epsg:4326");
    url.searchParams.set("address", address);
    url.searchParams.set("refine", "false");
    url.searchParams.set("simple", "false");
    url.searchParams.set("format", "json");
    url.searchParams.set("type", type);
    url.searchParams.set("key", key);
    return url.toString();
  };

  // 도로명 먼저 시도, 실패 시 지번으로 재시도
  const errors: string[] = [];
  for (const type of ["road", "parcel"] as const) {
    try {
      const url = buildUrl(type);
      const res = await fetch(url, { next: { revalidate: 0 } });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { errors.push(`${type}: invalid JSON`); continue; }
      if (data.response?.status === "OK" && data.response.result?.point) {
        const { x, y } = data.response.result.point;
        return NextResponse.json({ lat: parseFloat(y), lng: parseFloat(x) });
      }
      errors.push(`${type}: status=${data.response?.status}, msg=${data.response?.error?.text ?? "none"}`);
    } catch (e) {
      errors.push(`${type}: fetch error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.error("[geocode] failed", { address, errors });
  return NextResponse.json({ error: "주소의 좌표를 찾을 수 없습니다.", debug: { address, errors } }, { status: 404 });
}
