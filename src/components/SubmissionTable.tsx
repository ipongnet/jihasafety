"use client";

import { useState } from "react";

interface Submission {
  id: number;
  projectName: string;
  companyName: string;
  constructionStartDate: string;
  constructionEndDate: string;
  fullAddress: string;
  sido: string;
  sigungu: string;
  emailSentTo: string | null;
  status: string;
  createdAt: string;
  cityContact: { personName: string } | null;
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  sent: { label: "발송 완료", cls: "bg-green-100 text-green-700" },
  failed: { label: "발송 실패", cls: "bg-red-100 text-red-700" },
  no_contact: { label: "담당자 없음", cls: "bg-gray-100 text-gray-600" },
};

export default function SubmissionTable({ initial }: { initial: Submission[] }) {
  const [filter, setFilter] = useState<"all" | "sent" | "failed" | "no_contact">("all");
  const [search, setSearch] = useState("");

  const filtered = initial.filter((s) => {
    if (filter !== "all" && s.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.projectName.toLowerCase().includes(q) ||
        s.companyName.toLowerCase().includes(q) ||
        s.fullAddress.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const counts = {
    all: initial.length,
    sent: initial.filter((s) => s.status === "sent").length,
    failed: initial.filter((s) => s.status === "failed").length,
    no_contact: initial.filter((s) => s.status === "no_contact").length,
  };

  return (
    <div className="space-y-4">
      {/* 필터 탭 */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1">
          {(["all", "sent", "failed", "no_contact"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f === "all" ? "전체" : STATUS_LABEL[f].label}{" "}
              <span className="opacity-70">({counts[f]})</span>
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="공사명, 업체명, 주소 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-4 py-2 text-sm w-64 focus:ring-2 focus:ring-blue-400 outline-none"
        />
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">접수일시</th>
              <th className="px-4 py-3 text-left">공사명</th>
              <th className="px-4 py-3 text-left">시공업체</th>
              <th className="px-4 py-3 text-left">공사위치</th>
              <th className="px-4 py-3 text-left">공사기간</th>
              <th className="px-4 py-3 text-left">발송 대상</th>
              <th className="px-4 py-3 text-center">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  접수 이력이 없습니다.
                </td>
              </tr>
            ) : (
              filtered.map((s) => {
                const st = STATUS_LABEL[s.status] ?? { label: s.status, cls: "bg-gray-100 text-gray-600" };
                const createdAt = new Date(s.createdAt).toLocaleString("ko-KR", {
                  month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
                });
                const startDate = new Date(s.constructionStartDate).toLocaleDateString("ko-KR", {
                  month: "2-digit", day: "2-digit",
                });
                const endDate = new Date(s.constructionEndDate).toLocaleDateString("ko-KR", {
                  month: "2-digit", day: "2-digit",
                });
                return (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{createdAt}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[160px] truncate">{s.projectName}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{s.companyName}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">{s.fullAddress}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{startDate} ~ {endDate}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {s.emailSentTo ? (
                        <span className="text-blue-600">{s.emailSentTo}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>
                        {st.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">총 {initial.length}건 접수</p>
    </div>
  );
}
