import { shortenDeptDisplayName } from "@/lib/dept-name-shorten";

/** 부서 트리 루트→리프를 ` > `로 연결, 각 단계명은 짧게 표기 (경기지역본부 > 분당지사 → 경기 > 분당) */
export function getDepartmentDisplayLabel(
  deptName: string | null | undefined,
  departments: { id: number; name: string; parentId: number | null }[]
): string {
  if (!deptName) return "-";
  const dept = departments.find((d) => d.name === deptName);
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
