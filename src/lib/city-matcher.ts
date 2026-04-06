import { prisma } from "./db";
import { fetchContactsJson, findContactInJson } from "./contacts-client";

const SIDO_MAP: Record<string, string> = {
  서울: "서울특별시",
  부산: "부산광역시",
  대구: "대구광역시",
  인천: "인천광역시",
  광주: "광주광역시",
  대전: "대전광역시",
  울산: "울산광역시",
  세종: "세종특별자치시",
  경기: "경기도",
  강원: "강원특별자치도",
  충북: "충청북도",
  충남: "충청남도",
  전북: "전북특별자치도",
  전남: "전라남도",
  경북: "경상북도",
  경남: "경상남도",
  제주: "제주특별자치도",
};

export function normalizeSido(sido: string): string {
  return SIDO_MAP[sido] || sido;
}

export async function findContact(sido: string, sigungu: string) {
  const normalizedSido = normalizeSido(sido);

  // contacts.json 우선 (EngineJiha에서 동기화된 최신 데이터)
  const json = await fetchContactsJson();
  if (json) {
    const found = findContactInJson(json, normalizedSido, sigungu);
    if (found) return found;
    // contacts.json이 있으나 매칭 없음 → null 반환 (DB fallback 하지 않음)
    return null;
  }

  // 1) sido + sigungu 정확 매칭
  const exact = await prisma.cityContact.findUnique({
    where: { sido_sigungu: { sido: normalizedSido, sigungu } },
  });
  if (exact) return exact;

  // 2) sigungu만으로 정확 매칭
  const bySigungu = await prisma.cityContact.findFirst({
    where: { sigungu },
  });
  if (bySigungu) return bySigungu;

  // 3) 시 단위 매칭: "수원시 영통구" → "수원시" 로 등록된 담당자 찾기
  const cityPart = sigungu.split(" ")[0];
  if (cityPart !== sigungu) {
    const byCity = await prisma.cityContact.findFirst({
      where: { sido: normalizedSido, sigungu: cityPart },
    });
    if (byCity) return byCity;
  }

  return null;
}
