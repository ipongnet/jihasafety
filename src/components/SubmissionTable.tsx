"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getDepartmentDisplayLabel } from "@/lib/department-display";
import { formatSubmissionDateTimeLong, formatSubmissionDateTimeShort } from "@/lib/date-format";

interface DepartmentRow {
  id: number;
  name: string;
  parentId: number | null;
}

interface ContactRow {
  id: number;
  sido: string;
  sigungu: string;
  personName: string;
  email: string;
  phone: string;
  department: string | null;
}

interface Submission {
  id: number;
  submissionNumber: string | null;
  projectName: string;
  companyName: string;
  submitterEmail: string | null;
  constructionStartDate: string;
  constructionEndDate: string;
  fullAddress: string;
  sido: string;
  sigungu: string;
  latitude: number | null;
  longitude: number | null;
  emailSentTo: string | null;
  status: string;
  conflictStatus: string | null;
  responseMessage: string | null;
  respondedAt: string | null;
  createdAt: string;
  cityContact: {
    personName: string;
    department: string | null;
    email: string;
    phone: string;
  } | null;
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  sent: { label: "접수 완료", cls: "bg-green-100 text-green-700" },
  failed: { label: "발송 실패", cls: "bg-red-100 text-red-700" },
  no_contact: { label: "담당자 없음", cls: "bg-gray-100 text-gray-600" },
  replied: { label: "회신완료", cls: "bg-blue-100 text-blue-700" },
};

export default function SubmissionTable({
  initial,
  departments,
  contacts,
}: {
  initial: Submission[];
  departments: DepartmentRow[];
  contacts: ContactRow[];
}) {
  const router = useRouter();
  const [submissions, setSubmissions] = useState(initial);
  const [filter, setFilter] = useState<"all" | "sent" | "failed" | "no_contact" | "replied">("all");
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<Submission | null>(null);
  const [assignContactId, setAssignContactId] = useState<string>("");
  const [assigning, setAssigning] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState(false);

  // 페이지 진입 시 no_contact 건 자동 지정
  useEffect(() => {
    const hasNoContact = initial.some((s) => s.status === "no_contact");
    if (!hasNoContact) return;
    setAutoAssigning(true);
    fetch("/api/submissions/auto-assign", { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        if (data.updated?.length > 0) {
          // 서버에서 cityContact JOIN 포함 최신 데이터를 재조회
          router.refresh();
        }
      })
      .catch(() => {/* 무시 */})
      .finally(() => setAutoAssigning(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!detail) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDetail(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detail]);

  const deptLabel = (s: Submission) =>
    getDepartmentDisplayLabel(s.cityContact?.department ?? null, departments);

  const filtered = submissions.filter((s) => {
    if (filter !== "all" && s.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      const assignee = s.cityContact?.personName?.toLowerCase() ?? "";
      const dLabel = deptLabel(s).toLowerCase();
      return (
        s.projectName.toLowerCase().includes(q) ||
        s.fullAddress.toLowerCase().includes(q) ||
        assignee.includes(q) ||
        dLabel.includes(q) ||
        s.sido.toLowerCase().includes(q) ||
        s.sigungu.toLowerCase().includes(q) ||
        (s.submissionNumber?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  const counts = {
    all: submissions.length,
    sent: submissions.filter((s) => s.status === "sent").length,
    failed: submissions.filter((s) => s.status === "failed").length,
    no_contact: submissions.filter((s) => s.status === "no_contact").length,
    replied: submissions.filter((s) => s.status === "replied").length,
  };

  return (
    <div className="space-y-4">
      {autoAssigning && (
        <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
          <svg className="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          담당자 없음 건 자동 지정 중...
        </div>
      )}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1">
          {(["all", "sent", "failed", "no_contact", "replied"] as const).map((f) => (
            <button
              key={f}
              type="button"
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
          placeholder="접수번호, 공사명, 주소, 담당자·부서 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-4 py-2 text-sm w-full max-w-xs sm:max-w-md focus:ring-2 focus:ring-blue-400 outline-none"
        />
      </div>

      <div className="rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-xs sm:text-sm border-collapse">
          <thead className="bg-gray-50 text-gray-600 text-[10px] sm:text-xs uppercase tracking-wide">
            <tr>
              <th className="px-2 sm:px-3 py-2 text-center font-semibold whitespace-nowrap">접수번호</th>
              <th className="px-2 sm:px-3 py-2 text-center font-semibold whitespace-nowrap">접수일시</th>
              <th className="px-2 sm:px-3 py-2 text-center font-semibold whitespace-nowrap">담당부서</th>
              <th className="px-2 sm:px-3 py-2 text-center font-semibold whitespace-nowrap">담당자</th>
              <th className="px-2 sm:px-3 py-2 text-center font-semibold whitespace-nowrap">공사명</th>
              <th className="px-2 sm:px-3 py-2 text-center font-semibold whitespace-nowrap">공사위치</th>
              <th className="px-2 sm:px-3 py-2 text-center font-semibold whitespace-nowrap">상태</th>
              <th className="px-2 sm:px-3 py-2 text-center font-semibold whitespace-nowrap">저촉유무</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  접수 이력이 없습니다.
                </td>
              </tr>
            ) : (
              filtered.map((s) => {
                const st = STATUS_LABEL[s.status] ?? { label: s.status, cls: "bg-gray-100 text-gray-600" };
                const createdAt = formatSubmissionDateTimeShort(s.createdAt);
                const cell = "px-2 sm:px-3 py-2 align-middle text-center";
                const dpt = deptLabel(s);
                return (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className={cell}>
                      <button
                        type="button"
                        onClick={() => { setDetail(s); setAssignContactId(""); }}
                        className="font-mono text-[10px] sm:text-xs text-blue-600 hover:text-blue-800 hover:underline whitespace-nowrap"
                        title="상세 보기"
                      >
                        {s.submissionNumber ?? "-"}
                      </button>
                    </td>
                    <td className={`${cell} text-gray-500 whitespace-nowrap tabular-nums`}>{createdAt}</td>
                    <td className={`${cell} text-gray-700`}>{dpt}</td>
                    <td className={`${cell} ${s.cityContact?.personName ? "text-gray-800" : "text-gray-400"}`}>
                      {s.cityContact?.personName ?? "-"}
                    </td>
                    <td className={`${cell} font-medium text-gray-900`}>{s.projectName}</td>
                    <td className={`${cell} text-gray-600`}>{s.fullAddress}</td>
                    <td className={cell}>
                      <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap ${st.cls}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className={cell}>
                      {s.conflictStatus ? (
                        <span
                          className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${
                            s.conflictStatus === "저촉"
                              ? "bg-red-100 text-red-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {s.conflictStatus}
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">총 {submissions.length}건 접수</p>

      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="submission-detail-title"
          onClick={() => setDetail(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 bg-white">
              <h2 id="submission-detail-title" className="text-lg font-semibold text-gray-900">
                접수 상세
              </h2>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                aria-label="닫기"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-5 py-4 text-sm space-y-3">
              {(() => {
                const d = detail;
                const st = STATUS_LABEL[d.status] ?? { label: d.status, cls: "bg-gray-100 text-gray-600" };
                const createdFull = formatSubmissionDateTimeLong(d.createdAt);
                const startDate = new Date(d.constructionStartDate).toLocaleDateString("ko-KR");
                const endDate = new Date(d.constructionEndDate).toLocaleDateString("ko-KR");
                const rows: [string, ReactNode][] = [
                  ["접수번호", d.submissionNumber ?? "-"],
                  ["접수일시", createdFull],
                  [
                    "상태",
                    <span key="st" className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>
                      {st.label}
                    </span>,
                  ],
                  ["공사명", d.projectName],
                  ["시공업체", d.companyName],
                  ["신청자 이메일", d.submitterEmail ?? "-"],
                  ["공사 예정 기간", `${startDate} ~ ${endDate}`],
                  ["공사위치", d.fullAddress],
                  ["시·도", d.sido],
                  ["시·군·구", d.sigungu],
                  [
                    "좌표",
                    d.latitude != null && d.longitude != null ? `${d.latitude}, ${d.longitude}` : "-",
                  ],
                  ["담당부서", deptLabel(d)],
                  ["담당자 이름", d.cityContact?.personName ?? "-"],
                  ["담당자 이메일", d.cityContact?.email ?? "-"],
                  ["담당자 전화", d.cityContact?.phone ?? "-"],
                  ["발송 대상", d.emailSentTo ?? "-"],
                  ...(d.status === "replied" ? [
                    ["저촉유무", d.conflictStatus ? (
                      <span key="cs" className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        d.conflictStatus === "저촉" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                      }`}>{d.conflictStatus}</span>
                    ) : "-"] as [string, ReactNode],
                    ["회신 멘트", d.responseMessage ?? "-"] as [string, ReactNode],
                    ["회신일시", d.respondedAt ? new Date(d.respondedAt).toLocaleString("ko-KR") : "-"] as [string, ReactNode],
                  ] : []),
                ];
                return (
                  <>
                    <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2.5">
                      {rows.map(([label, value]) => (
                        <div key={label} className="contents">
                          <dt className="text-gray-500 text-xs sm:text-sm pt-0.5">{label}</dt>
                          <dd className="text-gray-900 text-xs sm:text-sm break-words">{value}</dd>
                        </div>
                      ))}
                    </dl>
                    {d.status === "no_contact" && contacts.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                        <h3 className="text-sm font-semibold text-gray-900">담당자 지정</h3>
                        <select
                          value={assignContactId}
                          onChange={(e) => setAssignContactId(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                          <option value="">-- 담당자를 선택하세요 --</option>
                          {contacts.map((c) => (
                            <option key={c.id} value={String(c.id)}>
                              {c.department ? `[${c.department}] ` : ""}{c.personName} ({c.sido} {c.sigungu}) - {c.email}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={!assignContactId || assigning}
                          onClick={async () => {
                            setAssigning(true);
                            try {
                              const res = await fetch(`/api/submissions/${d.id}/assign`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ contactId: parseInt(assignContactId, 10) }),
                              });
                              if (res.ok) {
                                const { submission: updated } = await res.json();
                                setSubmissions(prev => prev.map(s => s.id === updated.id ? updated : s));
                                setDetail(updated);
                                setAssignContactId("");
                              } else {
                                const err = await res.json().catch(() => ({}));
                                alert(err.message || "지정에 실패했습니다.");
                              }
                            } catch {
                              alert("서버 오류가 발생했습니다.");
                            } finally {
                              setAssigning(false);
                            }
                          }}
                          className="w-full bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                        >
                          {assigning ? "처리 중..." : "담당자 지정 및 이메일 발송"}
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
