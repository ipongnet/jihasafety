import { prisma } from "./db";

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

  // 1) sido + sigungu 정확 매칭
  const exact = await prisma.cityContact.findUnique({
    where: { sido_sigungu: { sido: normalizedSido, sigungu } },
  });
  if (exact) return exact;

  // 2) sigungu만으로 매칭
  const bySigungu = await prisma.cityContact.findFirst({
    where: { sigungu },
  });
  return bySigungu;
}
