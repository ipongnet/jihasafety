import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/** 개발 모드에서 Next(Fast Refresh 등)는 eval·ws가 필요해, 엄격 CSP만 두면 하이드레이션 실패로 흰 화면이 날 수 있음 */
function contentSecurityPolicy(): string {
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.daumcdn.net https://dapi.kakao.com"
    : "script-src 'self' 'unsafe-inline' https://*.daumcdn.net https://dapi.kakao.com";
  const connectSrc = isDev
    ? "connect-src 'self' ws: wss: https://*.daumcdn.net https://dapi.kakao.com https://*.kakao.com"
    : "connect-src 'self' https://*.daumcdn.net https://dapi.kakao.com https://*.kakao.com";

  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.daumcdn.net",
    "font-src 'self' https://fonts.gstatic.com https://*.daumcdn.net",
    "img-src 'self' data: blob: https://*.daumcdn.net https://*.kakao.com https://*.kakaocdn.net",
    connectSrc,
    "frame-src https://postcode.map.daum.net https://map.kakao.com",
  ].join("; ");
}

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy(),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
