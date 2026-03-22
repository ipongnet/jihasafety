import type { NextConfig } from "next";

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
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://*.daumcdn.net https://dapi.kakao.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.daumcdn.net",
              "font-src 'self' https://fonts.gstatic.com https://*.daumcdn.net",
              "img-src 'self' data: blob: https://*.daumcdn.net https://*.kakao.com https://*.kakaocdn.net",
              "connect-src 'self' https://*.daumcdn.net https://dapi.kakao.com https://*.kakao.com",
              "frame-src https://*.daumcdn.net https://*.kakao.com",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
