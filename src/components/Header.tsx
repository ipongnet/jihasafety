"use client";

import Link from "next/link";
import { useState } from "react";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* 로고 */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-sm sm:text-base md:text-lg leading-tight">
              지하안전 민관공 통합 AI플랫폼
            </span>
          </Link>

          {/* 데스크톱 네비 */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
              홈
            </Link>
            <Link href="/" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
              접수하기
            </Link>
            <Link href="/lookup" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
              접수조회
            </Link>
            <Link href="/contacts" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
              담당자 현황
            </Link>
          </nav>

          {/* 모바일 햄버거 */}
          <button
            className="md:hidden p-2 rounded-md text-gray-600"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="메뉴 열기"
          >
            {menuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* 모바일 메뉴 */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 py-4 space-y-3">
            <Link href="/" className="block text-sm text-gray-600 hover:text-blue-600 py-1" onClick={() => setMenuOpen(false)}>홈</Link>
            <Link href="/" className="block text-sm text-gray-600 hover:text-blue-600 py-1" onClick={() => setMenuOpen(false)}>접수하기</Link>
            <Link href="/lookup" className="block text-sm text-gray-600 hover:text-blue-600 py-1" onClick={() => setMenuOpen(false)}>접수조회</Link>
            <Link href="/contacts" className="block text-sm text-gray-600 hover:text-blue-600 py-1" onClick={() => setMenuOpen(false)}>담당자 현황</Link>
          </div>
        )}
      </div>
    </header>
  );
}
