import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "지하안전 민관공 통합 AI플랫폼",
  description: "도로 굴착 공사 전 해당 지역 지하매설물 담당자에게 자동으로 알림을 발송하는 안전 플랫폼입니다.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className={notoSansKR.className}>{children}</body>
    </html>
  );
}
