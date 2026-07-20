import { configDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'jsdom',
    // 프로필 이미지 URL 의 앞부분. 실제 앱에서는 next build 가 인라인하지만
    // vitest 에는 그 단계가 없어, 여기서 주지 않으면 URL 조립이 항상 null 이 된다.
    env: {
      NEXT_PUBLIC_SUPABASE_STORAGE_URL:
        'https://test.supabase.co/storage/v1/object/public/profile-image',
    },
    // 이 저장소는 .claude/worktrees/ 아래에 워크트리(체크아웃 사본)를 둔다.
    // 기본 include 글롭이 그 안의 __tests__ 까지 긁어 같은 테스트가 사본 수만큼
    // 중복 수집된다(메인 20 → 51파일). 사본이 초록이면 본체가 깨져도 총합이
    // 초록으로 보여 머지 검증 신호가 망가지므로 제외한다.
    // configDefaults.exclude 를 펼쳐 기본값(node_modules/.git)을 잃지 않게 한다.
    exclude: [...configDefaults.exclude, '**/.claude/worktrees/**'],
  },
})
