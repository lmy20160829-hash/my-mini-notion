import type { NextConfig } from "next";

// E2E 하니스 노출 여부. 빌드 타임 차단 겹이다 —
// 이 값이 "1"이 아니면 page.e2e.tsx가 페이지로 인식되지 않아 라우트도, 클라이언트 청크도
// 만들어지지 않는다. 런타임 notFound()만으로는 클라이언트 청크가 빌드 그래프에 남아
// 마커가 .next/static으로 유출된다(실측 확인).
const e2e = process.env.NEXT_PUBLIC_E2E === "1";

const nextConfig: NextConfig = {
  // Vercel 배포용 설정
  // GitHub Pages용 static export와 basePath를 제거했습니다.
  images: {
    unoptimized: true,
  },
  // 기본값(tsx/ts/jsx/js)에 하니스 전용 확장자를 조건부로 더한다.
  pageExtensions: ["tsx", "ts", "jsx", "js", ...(e2e ? ["e2e.tsx"] : [])],
};

export default nextConfig;
