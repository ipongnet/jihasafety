"use client";

import { useState, useEffect } from "react";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reason = new URLSearchParams(window.location.search).get("reason");
    if (reason === "nosession") {
      setError(
        "대시보드에 들어가려면 세션 쿠키가 필요합니다. 비밀번호를 다시 입력하거나, 브라우저가 쿠키를 막고 있지 않은지 확인하세요."
      );
      window.history.replaceState({}, "", "/sibum_bundang");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    let redirecting = false;
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });

      const raw = await res.text();
      let data: { success?: boolean; message?: string } = {};
      try {
        data = raw ? (JSON.parse(raw) as typeof data) : {};
      } catch {
        setError(`서버 응답을 해석할 수 없습니다. (HTTP ${res.status})`);
        return;
      }

      if (data.success) {
        redirecting = true;
        window.location.assign("/sibum_bundang/dashboard");
        return;
      }

      const msg =
        data.message ||
        (res.status === 401
          ? "비밀번호가 올바르지 않습니다."
          : `로그인에 실패했습니다. (HTTP ${res.status})`);
      setError(msg);
    } catch {
      setError("네트워크 오류이거나 서버에 연결할 수 없습니다.");
    } finally {
      if (!redirecting) setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">관리자 로그인</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="관리자 비밀번호 입력"
              autoFocus
            />
          </div>
          {error && (
            <p
              role="alert"
              className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-semibold py-2.5 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>
      </div>
    </div>
  );
}
