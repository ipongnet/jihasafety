import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/** 개발 모드에서 Next(Fast Refresh 등)는 eval·ws가 필요해, 엄격 CSP만 두면 하이드레이션 실패로 흰 화면이 날 수 있음 */
function contentSecurityPolicy(): string {
  const daumSrc = "https://*.daumcdn.net https://*.daum.net https://*.kakao.com https://*.kakaocdn.net";
  const vworldSrc = "https://map.vworld.kr https://*.vworld.kr";

  const scriptSrc = isDev
    ? `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${daumSrc} ${vworldSrc}`
    : `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${daumSrc} ${vworldSrc}`;
  const connectSrc = isDev
    ? `connect-src 'self' ws: wss: ${daumSrc} ${vworldSrc}`
    : `connect-src 'self' ${daumSrc} ${vworldSrc}`;

  return [
    "default-src 'self'",
    scriptSrc,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com ${daumSrc} ${vworldSrc}`,
    `font-src 'self' https://fonts.gstatic.com https://*.daumcdn.net ${vworldSrc}`,
    `img-src 'self' data: blob: ${daumSrc} ${vworldSrc} https://unpkg.com`,
    connectSrc,
    `frame-src 'self' https://*.daum.net https://*.daumcdn.net https://*.kakao.com`,
    `worker-src blob:`,
  ].join("; ");
}

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
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
