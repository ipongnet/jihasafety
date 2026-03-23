"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface SubmissionResult {
  emailSentTo: string | null;
  contact: {
    department: string | null;
    phone: string;
  } | null;
}

export default function CompletePage() {
  const [result, setResult] = useState<SubmissionResult | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("submissionResult");
    if (stored) {
      try { setResult(JSON.parse(stored)); } catch { /* ignore */ }
      sessionStorage.removeItem("submissionResult");
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-auto px-4 py-20 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">정상 접수가 되었습니다</h1>
          <p className="text-gray-500 mb-6 leading-relaxed">
            영업일 기준 1~3일 내에 회신 드리겠습니다.
          </p>

          {result && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-8 text-left space-y-3">
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
                      <span className="text-xs font-medium text-gray-400 w-20 shrink-0 pt-0.5">연락처</span>
                      <span className="text-sm text-gray-800">{result.contact.phone}</span>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-amber-600">해당 지역 담당자가 등록되어 있지 않습니다.</p>
              )}
            </div>
          )}

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
