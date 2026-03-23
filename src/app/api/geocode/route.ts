import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");
  if (!address) return NextResponse.json({ error: "address required" }, { status: 400 });

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
  for (const type of ["road", "parcel"] as const) {
    try {
      const res = await fetch(buildUrl(type), { next: { revalidate: 0 } });
      const data = await res.json();
      if (data.response?.status === "OK" && data.response.result?.point) {
        const { x, y } = data.response.result.point;
        return NextResponse.json({ lat: parseFloat(y), lng: parseFloat(x) });
      }
    } catch {
      // 다음 타입으로 시도
    }
  }

  return NextResponse.json({ error: "주소의 좌표를 찾을 수 없습니다." }, { status: 404 });
}
