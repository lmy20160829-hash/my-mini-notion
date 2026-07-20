import type { Metadata } from "next";
import localFont from "next/font/local";
import { AuthProvider } from "@/lib/auth";
import { AppProvider } from "@/lib/store";
import { ThemeProvider } from "@/lib/theme";
import "./globals.css";

// 첫 페인트 전에 테마를 확정해 잘못된 테마가 깜빡이지 않게 한다(FR-007, SC-003).
// <head>의 인라인 스크립트는 HTML 파싱 중 동기 실행되므로 React 하이드레이션보다 먼저 DOM을 고친다.
// useEffect/useLayoutEffect는 하이드레이션 이후라 깜빡임을 막지 못한다.
// 패턴 출처: node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md §Themes
// ThemeProvider의 lazy 초기화가 아래와 동일한 소스를 읽으므로 초기 상태가 DOM과 항상 일치한다.
const THEME_INIT_SCRIPT = `(function(){try{var k="mini-notion-theme";var t=localStorage.getItem(k);if(t!=="light"&&t!=="dark"){t=(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches)?"dark":"light"}document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  display: "swap",
  weight: "45 920",
  variable: "--font-pretendard",
});

export const metadata: Metadata = {
  title: "미니 노션",
  description: "나만의 가벼운 업무 관리 공간",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={pretendard.variable}
      data-theme="light"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <AppProvider>{children}</AppProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
