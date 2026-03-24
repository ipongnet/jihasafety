import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import ContactTable from "@/components/ContactTable";
import SubmissionTable from "@/components/SubmissionTable";
import LogoutButton from "@/components/LogoutButton";
import { getCoveredSigunguCount, getTotalSigunguCount } from "@/data/korea-regions";

interface Props {
  searchParams: Promise<{ tab?: string }>;
}

interface DashboardStatItem {
  label: string;
  value: number;
  unit: string;
  color: string;
}

function DashboardStatGrid({ items }: { items: DashboardStatItem[] }) {
  const gridClass =
    items.length >= 5
      ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3 mb-5"
      : "grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-5";
  return (
    <div className={gridClass}>
      {items.map((s) => (
        <div
          key={s.label}
          className="bg-white rounded-lg border border-gray-100 px-3 py-2.5 sm:px-4 sm:py-3 shadow-sm"
        >
          <p className="text-xs sm:text-sm text-gray-600 mb-0.5 font-medium">{s.label}</p>
          <p className={`text-xl sm:text-2xl font-bold tracking-tight ${s.color}`}>
            {s.value}
            <span className="text-sm sm:text-base font-semibold text-gray-400 ml-1">{s.unit}</span>
          </p>
        </div>
      ))}
    </div>
  );
}

export default async function DashboardPage({ searchParams }: Props) {
  const ok = await getSession();
  if (!ok) redirect("/sibum_bundang?reason=nosession");

  const { tab } = await searchParams;
  const activeTab = tab === "contacts" ? "contacts" : "submissions";

  const [contacts, submissions, departments] = await Promise.all([
    prisma.cityContact.findMany({ orderBy: [{ sido: "asc" }, { sigungu: "asc" }] }),
    prisma.submission.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        cityContact: { select: { personName: true, department: true, email: true, phone: true } },
      },
    }),
    prisma.department.findMany({ orderBy: { id: "asc" } }),
  ]);

  const submissionStats: DashboardStatItem[] = [
    { label: "총 접수", value: submissions.length, unit: "건", color: "text-gray-900" },
    {
      label: "발송 완료",
      value: submissions.filter((s) => s.status === "sent").length,
      unit: "건",
      color: "text-green-600",
    },
    {
      label: "발송 실패",
      value: submissions.filter((s) => s.status === "failed").length,
      unit: "건",
      color: "text-red-500",
    },
    {
      label: "담당자 없음",
      value: submissions.filter((s) => s.status === "no_contact").length,
      unit: "건",
      color: "text-amber-600",
    },
  ];

  const withDeptCount = contacts.filter((c) => c.department?.trim()).length;
  const contactStats: DashboardStatItem[] = [
    {
      label: "전체 지자체수",
      value: getTotalSigunguCount(),
      unit: "개",
      color: "text-gray-900",
    },
    {
      label: "담당자 지정 지자체",
      value: getCoveredSigunguCount(contacts),
      unit: "개",
      color: "text-blue-600",
    },
    { label: "부서 지정", value: withDeptCount, unit: "명", color: "text-green-600" },
    {
      label: "부서 미지정",
      value: contacts.length - withDeptCount,
      unit: "명",
      color: "text-amber-600",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900">관리자 페이지</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">사이트 보기</Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "submissions" && <DashboardStatGrid items={submissionStats} />}
        {activeTab === "contacts" && <DashboardStatGrid items={contactStats} />}

        {/* 탭 */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          <Link
            href="/sibum_bundang/dashboard?tab=submissions"
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === "submissions"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            접수 이력
          </Link>
          <Link
            href="/sibum_bundang/dashboard?tab=contacts"
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === "contacts"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            지역 담당자 관리
          </Link>
        </div>

        {/* 탭 콘텐츠 */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          {activeTab === "contacts" ? (
            <ContactTable initial={contacts} initialDepartments={departments} />
          ) : (
            <SubmissionTable
              departments={departments.map((d) => ({ id: d.id, name: d.name, parentId: d.parentId }))}
              initial={submissions.map((s) => ({
                ...s,
                constructionStartDate: s.constructionStartDate.toISOString(),
                constructionEndDate: s.constructionEndDate.toISOString(),
                createdAt: s.createdAt.toISOString(),
              }))}
            />
          )}
        </div>
      </main>
    </div>
  );
}
