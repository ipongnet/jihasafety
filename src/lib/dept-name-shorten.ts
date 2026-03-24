/** 화면·접수번호 접두에 쓰는 짧은 부서명 (예: 경기지역본부 → 경기, 분당지사 → 분당) */
const DEPT_SUFFIXES = /지역본부|본부|지부|센터|지사|관리처|사업소|지점/g;

export function shortenDeptDisplayName(name: string): string {
  const s = name.replace(DEPT_SUFFIXES, "").trim();
  return s.length > 0 ? s : name;
}
