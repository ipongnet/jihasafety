"use client";

import { useState } from "react";

interface LookupResult {
  submissionNumber: string;
  projectName: string;
  companyName: string;
  fullAddress: string;
  status: string;
  statusLabel: string;
  conflictStatus: string | null;
  responseMessage: string | null;
  respondedAt: string | null;
  createdAt: string;
  hasPdf: boolean;
}

const CONFLICT_STYLE: Record<string, string> = {
  저촉: "bg-[#ffebee] text-[#c62828]",
  비저촉: "bg-[#e8f5e9] text-[#2e7d32]",
};

const STATUS_STYLE: Record<string, string> = {
  replied: "bg-[#e8f5e9] text-[#2e7d32]",
  sent: "bg-blue-50 text-blue-700",
  failed: "bg-red-50 text-red-700",
  no_contact: "bg-amber-50 text-amber-700",
  cancelled: "bg-gray-100 text-gray-400",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

export default function LookupPage() {
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/lookup?code=${encodeURIComponent(code.trim())}&email=${encodeURIComponent(email.trim())}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "조회 중 오류가 발생했습니다.");
      } else {
        setResult(data as LookupResult);
      }
    } catch {
      setError("네트워크 오류입니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  const pdfUrl =
    result?.hasPdf
      ? `/api/lookup/pdf?code=${encodeURIComponent(code.trim())}&email=${encodeURIComponent(email.trim())}`
      : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-[#1a237e] sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-white font-semibold text-sm hover:opacity-80 transition-opacity">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            지하시설물 안전 플랫폼
          </a>
          <span className="text-blue-200 text-sm">접수 조회</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {/* 조회 카드 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
          <h1 className="text-xl font-bold text-gray-900 mb-1">접수 현황 조회</h1>
          <p className="text-sm text-gray-500 mb-5">
            접수 완료 후 발급받은 <strong>접수번호</strong>와 신청 시 입력한 <strong>이메일</strong>로 처리 현황을 확인하세요.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                접수번호 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="예: 경기분당-2026-0001"
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#1a237e] focus:border-[#1a237e] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                신청자 이메일 <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="접수 시 입력한 이메일"
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#1a237e] focus:border-[#1a237e] outline-none"
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1a237e] text-white font-semibold py-2.5 rounded-lg hover:bg-[#1565c0] transition-colors disabled:bg-gray-400"
            >
              {loading ? "조회 중..." : "조회"}
            </button>
          </form>
        </div>

        {/* 조회 결과 */}
        {result && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">조회 결과</h2>

            <dl className="space-y-3 text-sm">
              <div className="flex gap-3">
                <dt className="w-28 text-gray-500 shrink-0">접수번호</dt>
                <dd className="font-mono font-semibold text-[#1a237e]">{result.submissionNumber}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-28 text-gray-500 shrink-0">공사명</dt>
                <dd className="text-gray-800">{result.projectName}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-28 text-gray-500 shrink-0">업체명</dt>
                <dd className="text-gray-800">{result.companyName}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-28 text-gray-500 shrink-0">공사 위치</dt>
                <dd className="text-gray-800">{result.fullAddress}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-28 text-gray-500 shrink-0">접수 일시</dt>
                <dd className="text-gray-800">{fmt(result.createdAt)}</dd>
              </div>
              <div className="flex gap-3 items-center">
                <dt className="w-28 text-gray-500 shrink-0">처리 상태</dt>
                <dd>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[result.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {result.statusLabel}
                  </span>
                </dd>
              </div>

              {result.conflictStatus && (
                <div className="flex gap-3 items-center">
                  <dt className="w-28 text-gray-500 shrink-0">저촉 여부</dt>
                  <dd>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${CONFLICT_STYLE[result.conflictStatus] ?? "bg-gray-100 text-gray-600"}`}>
                      {result.conflictStatus}
                    </span>
                  </dd>
                </div>
              )}

              {result.responseMessage && (
                <div className="flex gap-3">
                  <dt className="w-28 text-gray-500 shrink-0">회신 내용</dt>
                  <dd className="text-gray-800 whitespace-pre-wrap">{result.responseMessage}</dd>
                </div>
              )}

              {result.respondedAt && (
                <div className="flex gap-3">
                  <dt className="w-28 text-gray-500 shrink-0">회신 일시</dt>
                  <dd className="text-gray-800">{fmt(result.respondedAt)}</dd>
                </div>
              )}
            </dl>

            {pdfUrl && (
              <div className="mt-5 pt-5 border-t border-gray-100">
                <a
                  href={pdfUrl}
                  className="inline-flex items-center gap-2 bg-[#1a237e] text-white font-semibold px-4 py-2.5 rounded-lg hover:bg-[#1565c0] transition-colors text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  결과 PDF 다운로드
                </a>
              </div>
            )}

            {result.status === "replied" && !pdfUrl && (
              <p className="mt-4 text-xs text-gray-500">
                PDF는 이메일로 발송되었습니다. 스팸함도 확인해 주세요.
              </p>
            )}

            {(result.status === "sent" || result.status === "no_contact") && (
              <div className="mt-5 pt-5 border-t border-gray-100 bg-blue-50 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  현재 담당 기관이 검토 중입니다. 처리 완료 시 등록하신 이메일로 결과가 발송됩니다.
                </p>
              </div>
            )}
          </div>
        )}

        {/* 안내 */}
        <p className="mt-6 text-xs text-center text-gray-400">
          조회 관련 문의는 관할 지자체 담당 부서로 연락해 주세요. 개인정보는 법령에 따라 처리됩니다.
        </p>
      </main>
    </div>
  );
}
