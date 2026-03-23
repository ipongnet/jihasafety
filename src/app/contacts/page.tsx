import { prisma } from "@/lib/db";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const revalidate = 60;

export default async function ContactsPage() {
  const [contacts, departments] = await Promise.all([
    prisma.cityContact.findMany({ orderBy: [{ sido: "asc" }, { sigungu: "asc" }] }),
    prisma.department.findMany({ orderBy: { id: "asc" } }),
  ]);

  // 부서 표시 (L1 > L2)
  const deptDisplay = (name: string | null): string => {
    if (!name) return "-";
    const dept = departments.find((d) => d.name === name);
    if (!dept || !dept.parentId) return name;
    const parent = departments.find((d) => d.id === dept.parentId);
    return parent ? `${parent.name} > ${name}` : name;
  };

  // 시/도별 그룹
  const grouped = contacts.reduce<Record<string, typeof contacts>>((acc, c) => {
    (acc[c.sido] ??= []).push(c);
    return acc;
  }, {});

  const sidoList = Object.keys(grouped).sort();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* 페이지 타이틀 */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">담당자 현황</h1>
            <p className="text-sm text-gray-500">
              지역별 지하매설물 안전 담당자 등록 현황입니다.
            </p>
          </div>

          {/* 통계 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
            <div className="bg-white border border-gray-100 rounded-xl px-5 py-4">
              <p className="text-xs text-gray-400 mb-1">등록 지역</p>
              <p className="text-2xl font-bold text-blue-600">
                {contacts.length} <span className="text-sm font-normal text-gray-400">개</span>
              </p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl px-5 py-4">
              <p className="text-xs text-gray-400 mb-1">등록 시/도</p>
              <p className="text-2xl font-bold text-gray-900">
                {sidoList.length} <span className="text-sm font-normal text-gray-400">개</span>
              </p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl px-5 py-4 col-span-2 sm:col-span-1">
              <p className="text-xs text-gray-400 mb-1">등록 부서</p>
              <p className="text-2xl font-bold text-gray-900">
                {departments.filter((d) => d.parentId !== null).length || departments.length}{" "}
                <span className="text-sm font-normal text-gray-400">개</span>
              </p>
            </div>
          </div>

          {contacts.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 px-6 py-16 text-center text-gray-400">
              등록된 담당자가 없습니다.
            </div>
          ) : (
            <div className="space-y-6">
              {sidoList.map((sido) => (
                <section key={sido}>
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-sm font-semibold text-gray-700">{sido}</h2>
                    <span className="text-xs text-gray-400">{grouped[sido].length}개 지역</span>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                        <tr>
                          <th className="px-4 py-3 text-left">시/군/구</th>
                          <th className="px-4 py-3 text-left">담당부서</th>
                          <th className="px-4 py-3 text-left">연락처</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {grouped[sido].map((c) => (
                          <tr key={c.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">{c.sigungu}</td>
                            <td className="px-4 py-3 text-gray-600">{deptDisplay(c.department)}</td>
                            <td className="px-4 py-3 text-gray-600">{c.phone || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
