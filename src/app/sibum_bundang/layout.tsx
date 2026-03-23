export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // /sibum_bundang 로그인 페이지 자체는 세션 체크 제외
  return <>{children}</>;
}

export async function generateMetadata() {
  return { title: "관리자 | 지하안전" };
}

// 대시보드 전용 가드는 dashboard/layout.tsx에서 처리
