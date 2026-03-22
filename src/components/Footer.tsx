import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* 브랜드 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <span className="text-white font-semibold">지하안전</span>
            </div>
            <p className="text-sm leading-relaxed">
              지하매설물 통합 안전 플랫폼.<br />
              굴착 공사 전 담당자에게 신속하게 알립니다.
            </p>
          </div>

          {/* 바로가기 */}
          <div>
            <h3 className="text-white text-sm font-semibold mb-3">바로가기</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="hover:text-white transition-colors">홈</Link></li>
              <li><Link href="/" className="hover:text-white transition-colors">접수하기</Link></li>
              <li><Link href="/admin" className="hover:text-white transition-colors">관리자 로그인</Link></li>
            </ul>
          </div>

          {/* 안내 */}
          <div>
            <h3 className="text-white text-sm font-semibold mb-3">이용 안내</h3>
            <ul className="space-y-2 text-sm">
              <li>굴착 공사 최소 48시간 전 신청 권고</li>
              <li>담당자 미등록 지역은 별도 문의</li>
              <li>제출 후 이메일 발송 여부 확인 가능</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 text-sm text-center">
          © {new Date().getFullYear()} 지하안전 플랫폼. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
