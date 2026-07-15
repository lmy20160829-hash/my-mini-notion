import type { NextConfig } from "next";

// GitHub Pages 프로젝트 사이트는 https://<user>.github.io/<repo>/ 하위 경로로 제공된다.
// 그래서 프로덕션(정적 export) 빌드에서만 basePath를 리포지토리 이름에 맞춘다.
// 로컬 `next dev`(development)에서는 basePath 없이 http://localhost:3000 을 그대로 쓴다.
const repo = "mini-notion-next";
const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "export", // 정적 HTML/CSS/JS export → GitHub Pages 정적 호스팅
  trailingSlash: true, // /posts/x → /posts/x/index.html (정적 호스트에서 안전한 경로)
  images: { unoptimized: true }, // 정적 export에는 이미지 최적화 서버가 없음
  basePath: isProd ? `/${repo}` : undefined,
};

export default nextConfig;
