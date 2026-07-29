#!/usr/bin/env node
/**
 * E2E 하니스가 프로덕션 빌드에서 완전히 빠졌는지 검증한다.
 *
 * 두 가지를 본다:
 *   (1) 라우트 부재 — 빌드 출력의 라우트 목록에 /e2e-harness/editor 가 없다
 *   (2) 마커 부재 — .next/static 어디에도 __MN_E2E_HARNESS__ 가 없다
 *
 * (2)가 핵심이다. 런타임 notFound()만으로는 클라이언트 청크가 빌드 그래프에 남아
 * 마커가 유출된다. 빌드 타임 게이트(next.config.ts의 pageExtensions)가 실제로
 * 동작하는지를 이 검사가 증명한다.
 */
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";

const MARKER = "__MN_E2E_HARNESS__";
const ROUTE = "/e2e-harness/editor";
const STATIC_DIR = ".next/static";

// 플래그를 확실히 제거한 환경에서 빌드한다(호출자 셸에 남아 있을 수 있다).
const env = { ...process.env };
delete env.NEXT_PUBLIC_E2E;

rmSync(".next", { recursive: true, force: true });

let buildOut;
try {
  buildOut = execFileSync("npm", ["run", "build"], { encoding: "utf8", env });
} catch (err) {
  console.error("✗ 빌드 실패 — 검증 불가");
  console.error(err.stdout ?? err.message);
  process.exit(1);
}

const failures = [];

if (buildOut.includes(ROUTE)) {
  failures.push(`라우트 ${ROUTE} 가 빌드 산출물에 존재한다`);
}

/** .next/static 전체를 훑어 마커를 포함한 파일을 모은다. */
function findMarker(dir) {
  const hits = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      hits.push(...findMarker(full));
    } else {
      // 바이너리를 utf8로 읽어도 부분 문자열 탐색에는 문제가 없다.
      if (readFileSync(full, "utf8").includes(MARKER)) hits.push(full);
    }
  }
  return hits;
}

const leaked = findMarker(STATIC_DIR);
if (leaked.length > 0) {
  failures.push(`마커 ${MARKER} 유출 (${leaked.length}건):\n    ${leaked.join("\n    ")}`);
}

if (failures.length > 0) {
  console.error("✗ 하니스가 프로덕션 빌드에 유출됐다:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(`✓ 하니스 미유출 확인 — 라우트 부재 + ${STATIC_DIR} 마커 0건`);
