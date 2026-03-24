import { prisma } from "./db";

const DEPT_SUFFIXES = /지역본부|본부|지부|센터|지사|관리처|사업소|지점/g;

function extractDeptCode(name: string): string {
  return name.replace(DEPT_SUFFIXES, "").trim();
}

export async function generateSubmissionNumber(
  contactDepartment: string | null | undefined
): Promise<string> {
  const year = new Date().getFullYear();
  let prefix = "미지정";

  if (contactDepartment) {
    const dept = await prisma.department.findFirst({
      where: { name: contactDepartment },
      include: { parent: true },
    });

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
