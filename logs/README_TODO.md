# TODO

## 완료

- [x] 스크린샷 6장 촬영 (`image/culturemap/`)
- [x] 모바일 반응형 (Navbar 햄버거 메뉴 + 4페이지 하단 슬라이드 패널)
- [x] 백엔드 캐싱 (클러스터링 1시간 TTL 캐시)
- [x] 회고 섹션 추가 (어려웠던 점, 배운 점, 개선할 점)
- [x] README 구조 개선 (배지, 섹션 재배치, 스크린샷 축소, details 접기)
- [x] `.env.example` 추가
- [x] 코드 중복 제거 (haversine → `utils.py`, DISTRICT_COORDS/CATEGORY_COLORS → `constants.js`)
- [x] pytest 15개 테스트 추가 (API 12개 + 유틸 3개)

## 진행 필요

### 높은 우선순위
- [ ] 라이브 데모 URL 추가 (Render/Vercel 배포 후 README 주석 해제)
- [ ] API 키 로테이션 (git history에 노출된 키 교체 — OpenAI, 서울데이터, Tour API)
- [ ] 글로벌 에러 바운더리 (React ErrorBoundary 컴포넌트 추가, 흰 화면 방지)
- [ ] GitHub Actions CI (pytest + vite build 자동 실행)

### 중간 우선순위
- [ ] Docker 지원 (Dockerfile + docker-compose.yml → clone & run 경험)
- [ ] 접근성(a11y) 개선 (aria-label, 키보드 네비게이션, 글래스모피즘 대비 검토)
- [ ] Alembic 마이그레이션 도입 (현재 create_all()로 스키마 관리 중)
- [ ] Rate Limiting 미들웨어 (특히 `/api/places` 최대 1000건 응답 제한 없음)
- [ ] 배포 가이드 문서 (Render/Vercel 설정 방법)

### 낮은 우선순위
- [ ] TypeScript 마이그레이션
- [ ] 프론트엔드 테스트 (React Testing Library / Vitest)
- [ ] 다국어 지원 (i18n — 외국인 대상 프로젝트이므로)
- [ ] 번들 사이즈 최적화 (현재 1MB+ → code splitting, dynamic import)
- [ ] 개인 프로젝트 확장 기간 명시 (2026.03.26 ~)
