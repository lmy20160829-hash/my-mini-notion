import type { NextConfig } from "next";

// E2E 하니스 노출 여부. 이 게이트가 번들 유출을 막는 실질적인 유일한 장치다 —
// 이 값이 "1"이 아니면 page.e2e.tsx가 페이지로 인식되지 않아 라우트도, 클라이언트 청크도
// 만들어지지 않는다. 런타임 notFound()만으로는 클라이언트 청크가 빌드 그래프에 남아
// 마커가 .next/static으로 유출된다(실측 확인) — 이 부분은 여전히 유효하다.
//
// 주의(2026-07-30 최종 브랜치 리뷰): 이 값과 page.e2e.tsx의 런타임 검사는 원래 "독립된
// 2겹"으로 문서화됐지만 실제로는 같은 변수에 의존했다. NEXT_PUBLIC_*는 Next.js가 빌드
// 타임에 인라인하므로, 이 플래그를 켠 채 만든 빌드에서는 런타임 쪽 NEXT_PUBLIC_E2E 검사가
// 죽은 코드가 된다(자세한 사실관계는 page.e2e.tsx 주석). 그래서 page.e2e.tsx는 이 변수와
// 무관한 NODE_ENV==="production" 검사를 추가로 본다 — "플래그를 켠 채 만든 빌드가 실수로
// 배포되는 경우"를 실제로 막는 건 그 검사다.
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
