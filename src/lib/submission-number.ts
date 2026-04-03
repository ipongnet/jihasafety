import { prisma } from "./db";
import { shortenDeptDisplayName } from "@/lib/dept-name-shorten";

function extractDeptCode(name: string): string {
  return shortenDeptDisplayName(name);
}

/** sido(정식명칭) → L1 부서명에 포함된 키워드 */
const SIDO_TO_L1_KEYWORD: Record<string, string> = {
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

export async function generateSubmissionNumber(
  contactDepartment: string | null | undefined,
  sido?: string
): Promise<string> {
  const year = new Date().getFullYear();
  let prefix = "미지정";

  if (contactDepartment) {
    let dept: { id: number; name: string; parentId: number | null; parent: { id: number; name: string } | null } | null = null;

    // sido가 있으면 해당 지역의 L1 > L2 매칭 시도
    if (sido) {
      const keyword = SIDO_TO_L1_KEYWORD[sido];
      if (keyword) {
        dept = await prisma.department.findFirst({
          where: {
            name: contactDepartment,
            parent: { name: { contains: keyword } },
          },
          include: { parent: true },
        });
      }
    }

    // 폴백: 첫 번째 매칭
    if (!dept) {
      dept = await prisma.department.findFirst({
        where: { name: contactDepartment },
        include: { parent: true },
      });
    }

    if (dept) {
      const l2Code = extractDeptCode(dept.name);
      if (dept.parent) {
        const l1Code = extractDeptCode(dept.parent.name);
        prefix = `${l1Code}${l2Code}`;
      } else {
        prefix = l2Code;
      }
    }
  }

  const lastSubmission = await prisma.submission.findFirst({
    where: {
      submissionNumber: { startsWith: `${prefix}-${year}-` },
    },
    orderBy: { submissionNumber: "desc" },
    select: { submissionNumber: true },
  });

  let seq = 1;
  if (lastSubmission?.submissionNumber) {
    const lastSeq = parseInt(lastSubmission.submissionNumber.split("-").pop() ?? "0", 10);
    seq = lastSeq + 1;
  }

  return `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
}
