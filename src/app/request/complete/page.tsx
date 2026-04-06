"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface SubmissionResult {
  submissionNumber: string | null;
  emailSentTo: string | null;
  contact: {
    department: string | null;
    phone: string;
  } | null;
}

export default function CompletePage() {
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("submissionResult");
    if (stored) {
      try { setResult(JSON.parse(stored)); } catch { /* ignore */ }
      sessionStorage.removeItem("submissionResult");
    }
  }, []);

  const handleCopy = useCallback(async () => {
    if (!result?.submissionNumber) return;
    try {
      await navigator.clipboard.writeText(result.submissionNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }, [result]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-auto px-4 py-16 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">정상 접수가 되었습니다</h1>
          <p className="text-gray-500 mb-2 leading-relaxed">
            접수 확인 이메일이 발송되었습니다.
          </p>
          <p className="text-blue-600 font-medium mb-6">
            영업일 기준 1~3일 내 회신 드립니다.
          </p>

          {result && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5 text-left space-y-3">
              {result.submissionNumber && (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-gray-400 w-20 shrink-0">접수번호</span>
                  <span className="text-sm font-mono text-gray-800 flex-1">{result.submissionNumber}</span>
                  <button
                    onClick={handleCopy}
                    className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors shrink-0"
                    title="접수번호 복사"
                  >
                    {copied ? "✓ 복사됨" : "복사"}
                  </button>
                </div>
              )}
              {result.contact ? (
                <>
                  {result.contact.department && (
                    <div className="flex items-start gap-3">
                      <span className="text-xs font-medium text-gray-400 w-20 shrink-0 pt-0.5">담당부서</span>
                      <span className="text-sm text-gray-800">{result.contact.department}</span>
                    </div>
                  )}
                  {result.contact.phone && (
                    <div className="flex items-start gap-3">
                      <span className="text-xs font-medium text-gray-400 w-20 shrink-0 pt-0.5">문의 연락처</span>
                      <span className="text-sm text-gray-800">{result.contact.phone}</span>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-amber-600">해당 지역 담당자가 등록되어 있지 않습니다.</p>
              )}
            </div>
          )}

          {/* 스팸 안내 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 mb-6 text-left">
            <p className="text-xs text-yellow-800">
              ⚠️ 접수 확인 이메일 및 회신 이메일이 도착하지 않으면{" "}
              <strong>스팸 보관함</strong>을 확인해 주세요.
            </p>
          </div>

          <Link
            href="/"
            className="inline-block bg-blue-600 text-white font-medium px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors"
          >
            메인으로 돌아가기
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
