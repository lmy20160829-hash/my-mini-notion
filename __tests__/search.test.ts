import { expect, test } from "vitest";
import type { Post } from "@/lib/store";
import { filterPosts } from "@/lib/search";

// 사이드바 검색 필터 순수 함수 검증 (docs/superpowers/specs/2026-07-21-search-design.md).
// trim·소문자화 후 제목+본문 substring 매치, 빈 쿼리는 전체 반환, 원본 불변.

function post(id: string, title: string, content: string): Post {
  return { id, title, content, createdAt: 0 };
}

const POSTS: Post[] = [
  post("p1", "이번 주 할 일 정리", "회의 준비와 보고서 작성"),
  post("p2", "장보기 목록", "우유, 계란, Bread"),
  post("p3", "", "Supabase RLS 정책 메모"),
];

test("빈 쿼리는 전체를 반환한다", () => {
  expect(filterPosts(POSTS, "")).toEqual(POSTS);
});

test("공백만 있는 쿼리도 전체를 반환한다", () => {
  expect(filterPosts(POSTS, "   ")).toEqual(POSTS);
});

test("제목 부분 일치로 걸러낸다", () => {
  expect(filterPosts(POSTS, "장보기")).toEqual([POSTS[1]]);
});

test("본문 부분 일치로도 걸러낸다", () => {
  expect(filterPosts(POSTS, "회의")).toEqual([POSTS[0]]);
});

test("대소문자를 무시한다 (쿼리·본문 양쪽)", () => {
  expect(filterPosts(POSTS, "SUPABASE")).toEqual([POSTS[2]]);
  expect(filterPosts(POSTS, "bread")).toEqual([POSTS[1]]);
});

test("쿼리 양끝 공백은 무시한다", () => {
  expect(filterPosts(POSTS, "  장보기  ")).toEqual([POSTS[1]]);
});

test("매치가 없으면 빈 배열을 반환한다", () => {
  expect(filterPosts(POSTS, "없는 검색어")).toEqual([]);
});

test("여러 건이 매치되면 입력 순서를 유지한다", () => {
  // "리": p1 제목("정리")과 p2 제목("목록")은? "목록"엔 "리" 없음 → p1만.
  // 대신 공통 문자열로 검사: "메모"는 p3, "정리"는 p1 — 복수 매치는 "우"로.
  const many = [
    post("a", "우선순위", ""),
    post("b", "", "왼쪽 우측"),
    post("c", "다른 글", "다른 내용"),
  ];
  expect(filterPosts(many, "우")).toEqual([many[0], many[1]]);
});

test("원본 배열과 요소를 변형하지 않는다", () => {
  const input = [post("p1", "제목", "본문")];
  const snapshot = JSON.parse(JSON.stringify(input));
  filterPosts(input, "제목");
  filterPosts(input, "없는 검색어");
  expect(input).toEqual(snapshot);
});
