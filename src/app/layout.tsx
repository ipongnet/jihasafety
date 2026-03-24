import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "지하시설물 통합 안전 플랫폼",
  description: "도로 굴착 공사 전 해당 지역 지하매설물 담당자에게 자동으로 알림을 발송하는 안전 플랫폼입니다.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <Script
          src={`https://map.vworld.kr/js/vworldMapInit.js.do?version=2.0&apiKey=${process.env.NEXT_PUBLIC_VWORLD_API_KEY}`}
          strategy="beforeInteractive"
        />
      </head>
      <body className={notoSansKR.className}>{children}</body>
    </html>
  );
}
