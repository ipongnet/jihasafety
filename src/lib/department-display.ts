import { shortenDeptDisplayName } from "@/lib/dept-name-shorten";

/** sido(정식명칭) → L1 부서명에 포함된 키워드 */
export const SIDO_TO_L1_KEYWORD: Record<string, string> = {
  서울특별시: "서울",
  부산광역시: "부산",
  대구광역시: "대구",
  인천광역시: "인천",
  광주광역시: "광주",
  대전광역시: "대전",
  울산광역시: "부산",
  세종특별자치시: "대전",
  경기도: "경기",
  강원특별자치도: "강원",
  충청북도: "대전",
  충청남도: "대전",
  전북특별자치도: "전북",
  전라남도: "광주",
  경상북도: "대구",
  경상남도: "부산",
  제주특별자치도: "제주",
};

/** 부서 트리 루트→리프를 ` > `로 연결, 각 단계명은 짧게 표기 (경기지역본부 > 분당지사 → 경기 > 분당) */
export function getDepartmentDisplayLabel(
  deptName: string | null | undefined,
  departments: { id: number; name: string; parentId: number | null }[],
  sido?: string
): string {
  if (!deptName) return "-";

  // 같은 이름의 부서가 여러 개(관로보전부 등)일 때 sido 기반으로 올바른 L1 매칭
  let dept: (typeof departments)[number] | undefined;
  if (sido) {
    const keyword = SIDO_TO_L1_KEYWORD[sido];
    if (keyword) {
      dept = departments.find((d) => {
        if (d.name !== deptName) return false;
        if (!d.parentId) return false;
        const parent = departments.find((p) => p.id === d.parentId);
        return parent?.name.includes(keyword) ?? false;
      });
    }
  }

  // 폴백: 첫 번째 매칭
  if (!dept) {
    dept = departments.find((d) => d.name === deptName);
  }

  if (!dept) return shortenDeptDisplayName(deptName);

  const chain: string[] = [];
  let current: typeof dept | undefined = dept;
  const seen = new Set<number>();

  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    chain.unshift(current.name);
    const parentId: number | null = current.parentId;
    if (parentId === null) break;
    current = departments.find((d) => d.id === parentId);
  }

  return chain.map(shortenDeptDisplayName).join(" > ");
}
