import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel 배포용 설정
  // GitHub Pages용 static export와 basePath를 제거했습니다.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;