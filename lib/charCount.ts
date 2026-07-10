// Contract: specs/001-char-counter/contracts/count-graphemes.md
// 내용 글자 수를 grapheme cluster(사용자가 하나로 인식하는 글자) 단위로 센다.
// 런타임 내장 Intl.Segmenter 사용 — 신규 의존성 없음(헌법 V, research.md R1).

// 모듈 스코프에서 1회 생성해 재사용(로케일은 결과에 영향 없어 'ko' 고정으로 충분).
const segmenter = new Intl.Segmenter("ko", { granularity: "grapheme" });

/**
 * 입력 문자열의 grapheme cluster 개수를 반환한다.
 * 공백·줄바꿈 포함, 결합 이모지·국기·피부톤 변형·한글 음절은 각각 1로 센다.
 * 순수·결정적: 동일 입력 → 동일 출력, 부수효과 없음.
 */
export function countGraphemes(text: string): number {
  let count = 0;
  for (const _segment of segmenter.segment(text)) count++;
  return count;
}
